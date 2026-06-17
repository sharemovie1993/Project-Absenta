import { getAttendanceQueue } from '../queues/attendance.queue';
import { getBillingQueue } from '../queues/billing.queue';
import { getNotificationQueue } from '../queues/notification.queue';
import { getRedisConnection } from '../queue/redis';
import { publishControlEvent } from './infra-command.service';
import { acquireLock, releaseLock } from './locks/distributedLock';
import { computeHardCap10 } from './auto-tune';

type WorkerType = 'attendance' | 'billing' | 'notification';

function canonicalizeNodeId(id: string): string {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function throughputPerMinute(workerType: WorkerType): number {
  if (workerType === 'attendance') {
    return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_ATTENDANCE_PER_MIN || '50'), 10), 1, 100000);
  }
  if (workerType === 'billing') {
    return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_BILLING_PER_MIN || '30'), 10), 1, 100000);
  }
  if (workerType === 'notification') {
    return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_NOTIFICATION_PER_MIN || '50'), 10), 1, 100000);
  }
  return 50;
}

function autoscalerMinWorkers(): number {
  const max = autoscalerMaxWorkers();
  return clampInt(parseInt(String(process.env.AUTOSCALER_MIN_WORKERS || '1'), 10), 1, max);
}

function autoscalerMaxWorkers(): number {
  const configured = clampInt(parseInt(String(process.env.AUTOSCALER_MAX_WORKERS || '10'), 10), 1, 10);
  const hardCap = computeHardCap10();
  return Math.max(1, Math.min(configured, hardCap));
}

async function resolveTargetNode(workerType: WorkerType): Promise<string | null> {
  const redis = getRedisConnection();
  let cursor = '0';
  const pattern = `worker:*:${workerType}:heartbeat`;
  let best: { nodeId: string; ts: number } | null = null;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      const next = Array.isArray(res) ? res[0] : res.cursor;
      const keys: string[] = Array.isArray(res) ? res[1] : res.keys;
      for (const k of keys) {
        try {
          const v = await redis.get(k);
          if (!v) continue;
          const ts = Number(v);
          if (Number.isNaN(ts)) continue;
          const m = String(k).match(/^worker:([^:]+):[^:]+:heartbeat$/);
          if (!m) continue;
          const nodeId = canonicalizeNodeId(m[1]);
          if (!best || ts > best.ts) best = { nodeId, ts };
        } catch {}
      }
      cursor = String(next || '0');
      if (cursor === '0') break;
    } catch {
      break;
    }
  }
  return best?.nodeId || null;
}

async function recordQueueHistory(workerType: WorkerType, queued: number): Promise<void> {
  const redis = getRedisConnection();
  const key = `queue_history:${workerType}`;
  const ts = Date.now();
  const q = Math.max(0, Math.floor(queued));
  const payload = JSON.stringify({ timestamp: ts, queueLength: q, t: ts, q });
  try {
    await (redis as any).lpush(key, payload);
    await (redis as any).ltrim(key, 0, 40);
    await (redis as any).expire(key, 300);
  } catch {}
}

async function readQueueGrowthRatePerSec(workerType: WorkerType): Promise<number> {
  const redis = getRedisConnection();
  const key = `queue_history:${workerType}`;
  try {
    const [latestRaw, oldestRaw] = await Promise.all([(redis as any).lindex(key, 0), (redis as any).lindex(key, -1)]);
    if (!latestRaw || !oldestRaw) return 0;
    const latest = JSON.parse(String(latestRaw));
    const oldest = JSON.parse(String(oldestRaw));
    const t0 =
      typeof oldest?.timestamp === 'number'
        ? oldest.timestamp
        : typeof oldest?.t === 'number'
        ? oldest.t
        : 0;
    const q0 =
      typeof oldest?.queueLength === 'number'
        ? oldest.queueLength
        : typeof oldest?.q === 'number'
        ? oldest.q
        : 0;
    const t1 =
      typeof latest?.timestamp === 'number'
        ? latest.timestamp
        : typeof latest?.t === 'number'
        ? latest.t
        : 0;
    const q1 =
      typeof latest?.queueLength === 'number'
        ? latest.queueLength
        : typeof latest?.q === 'number'
        ? latest.q
        : 0;
    const dt = t1 - t0;
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    const dq = q1 - q0;
    if (!Number.isFinite(dq)) return 0;
    return dq / (dt / 1000);
  } catch {
    return 0;
  }
}

async function decidePredictiveTarget(workerType: WorkerType, queued: number): Promise<number> {
  const minW = autoscalerMinWorkers();
  const maxW = autoscalerMaxWorkers();
  const growthPerSec = await readQueueGrowthRatePerSec(workerType);
  const predicted = Math.max(0, Math.round(queued + growthPerSec * 60));
  const perMin = throughputPerMinute(workerType);
  const needed = perMin > 0 ? Math.ceil(predicted / perMin) : maxW;
  return clampInt(needed, minW, maxW);
}

export async function getCurrentWorkerCount(workerType: WorkerType, nodeId: string): Promise<number> {
  const redis = getRedisConnection();
  const node = canonicalizeNodeId(nodeId);
  try {
    const v = await redis.get(`worker:${node}:${workerType}:instances`);
    if (v) {
      const n = Number(v);
      if (!Number.isNaN(n)) return Math.max(0, Math.floor(n));
    }
  } catch {}
  try {
    const v = await redis.get(`agent:${node}:${workerType}:instances`);
    if (v) {
      const n = Number(v);
      if (!Number.isNaN(n)) return Math.max(0, Math.floor(n));
    }
  } catch {}
  try {
    const v = await redis.get(`autoscaler:${node}:${workerType}:target`);
    if (v) {
      const n = Number(v);
      if (!Number.isNaN(n)) return Math.max(0, Math.floor(n));
    }
  } catch {}
  return 0;
}

export async function scaleWorker(workerType: WorkerType, targetCount: number, nodeId: string): Promise<void> {
  const redis = getRedisConnection();
  const node = canonicalizeNodeId(nodeId);
  const t = Math.max(0, Math.min(10, Math.floor(targetCount)));
  const current = await getCurrentWorkerCount(workerType, node);
  if (t === current) return;
  const delta = t - current;

  const active = await readActive(workerType);
  if (delta < 0 && active > 0) return;

  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      await publishControlEvent('start', workerType, node);
    }
  } else {
    for (let i = 0; i < Math.abs(delta); i++) {
      await publishControlEvent('stop', workerType, node);
    }
  }
  try {
    const evt = JSON.stringify({
      ts: Date.now(),
      action: 'scale',
      workerType,
      nodeId: node,
      from: current,
      to: t,
      queued: await readQueued(workerType),
    });
    await (redis as any).lpush('autoscaler:events', evt);
    await (redis as any).ltrim('autoscaler:events', 0, 19);
    await (redis as any).expire('autoscaler:events', 86400);
  } catch {}
  try {
    await redis.set(`autoscaler:${node}:${workerType}:target`, String(t), 'EX', 3600);
  } catch {}
}

async function decideTarget(workerType: WorkerType, queued: number): Promise<number> {
  const minW = autoscalerMinWorkers();
  const maxW = autoscalerMaxWorkers();
  if (workerType === 'attendance') {
    const base = 1 + Math.floor(Math.max(0, queued) / 200);
    return clampInt(base, minW, maxW);
  }
  if (workerType === 'billing') {
    const cap = Math.max(1, Math.min(maxW, 3));
    const base = 1 + Math.floor(Math.max(0, queued) / 300);
    return clampInt(base, 1, cap);
  }
  if (workerType === 'notification') {
    const cap = Math.max(1, Math.min(maxW, 5));
    const base = 1 + Math.floor(Math.max(0, queued) / 300);
    return clampInt(base, 1, cap);
  }
  return 1;
}

async function readQueued(workerType: WorkerType): Promise<number> {
  if (workerType === 'attendance') {
    const q = getAttendanceQueue();
    const c = await q.getJobCounts('waiting', 'delayed', 'waiting-children');
    return (c.waiting || 0) + (c.delayed || 0) + ((c as any)['waiting-children'] || 0);
  }
  if (workerType === 'billing') {
    const q = getBillingQueue();
    const c = await q.getJobCounts('waiting', 'delayed', 'waiting-children');
    return (c.waiting || 0) + (c.delayed || 0) + ((c as any)['waiting-children'] || 0);
  }
  if (workerType === 'notification') {
    const q = getNotificationQueue();
    const c = await q.getJobCounts('waiting', 'delayed', 'waiting-children');
    return (c.waiting || 0) + (c.delayed || 0) + ((c as any)['waiting-children'] || 0);
  }
  return 0;
}

async function readActive(workerType: WorkerType): Promise<number> {
  if (workerType === 'attendance') {
    const q = getAttendanceQueue();
    const c = await q.getJobCounts('active');
    return c.active || 0;
  }
  if (workerType === 'billing') {
    const q = getBillingQueue();
    const c = await q.getJobCounts('active');
    return c.active || 0;
  }
  if (workerType === 'notification') {
    const q = getNotificationQueue();
    const c = await q.getJobCounts('active');
    return c.active || 0;
  }
  return 0;
}

export async function monitorQueues(): Promise<void> {
  const redis = getRedisConnection();
  try {
    await redis.ping();
  } catch {
    return;
  }
  const types: WorkerType[] = ['attendance', 'billing', 'notification'];
  for (const t of types) {
    try {
      const queued = await readQueued(t);
      await recordQueueHistory(t, queued);
      const reactiveTarget = await decideTarget(t, queued);
      const predictiveTarget = await decidePredictiveTarget(t, queued);
      const target = Math.max(reactiveTarget, predictiveTarget);
      const node = (await resolveTargetNode(t)) || canonicalizeNodeId(process.env.NODE_NAME || '');
      if (!node) continue;
      await scaleWorker(t, target, node);
    } catch {}
  }
}

export function initWorkerAutoscaler(): void {
  const redis = getRedisConnection();
  const run = async () => {
    try {
      await redis.ping();
    } catch {
      return;
    }
    const lock = await acquireLock('scheduler:worker-autoscaler', 30);
    if (!lock) {
      return;
    }
    try {
      await monitorQueues();
    } finally {
      await releaseLock(lock);
    }
  };
  setInterval(() => {
    void run();
  }, 10000);
}
