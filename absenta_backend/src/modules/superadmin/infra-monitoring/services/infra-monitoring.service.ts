import type { InfraHealthSummary, InfraJobSummary, InfraQueueSummary } from '../types/infra-monitoring.types';
import { getJobs, isJobRunning, type JobRegistryEntry } from '../../../../infra/jobRegistry';
import { prisma } from '../../../../utils/prisma';
import { getEmailQueue } from '../../../../queue/email.queue';
import { getRecurringQueue } from '../../../../queues/recurring.queue';
import { getRedisConnection } from '../../../../queue/redis';
import { publishControlEvent } from '../../../../infra/infra-command.service';

export class InfraMonitoringService {
  private workerTypes = ['email','recurring','billing','notification','attendance','analytics','maintenance','infra'] as const;
  private legacyToType(name: string): typeof this.workerTypes[number] | null {
    const map: Record<string, typeof this.workerTypes[number]> = {
      'absenta-email-worker': 'email',
      'absenta-recurring-worker': 'recurring',
      'absenta-billing-worker': 'billing',
      'absenta-notification-worker': 'notification',
      'absenta-attendance-worker': 'attendance',
      'absenta-analytics-worker': 'analytics',
      'absenta-maintenance-worker': 'maintenance',
      'absenta-infra-worker': 'infra'
    };
    return map[name] || null;
  }
  private toContainerName(workerType: typeof this.workerTypes[number]): string {
    return `absenta-worker-${workerType}`;
  }
  private canonicalizeNodeId(id: string): string {
    const canonicalEnv = String(
      (process.env.NODE_NAME || process.env.HOSTNAME || process.env.NODE_ID || process.env.COMPUTERNAME || '')
    )
      .trim()
      .toLowerCase();
    const osHost = String(((require('os') as any).hostname?.() as string) || process.env.COMPUTERNAME || '')
      .trim()
      .toLowerCase();
    const v = String(id || '').toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
    if (canonicalEnv && (v === osHost || v === process.env.COMPUTERNAME?.toLowerCase())) return canonicalEnv;
    return v;
  }

  private normalizeNameToType(name: string): typeof this.workerTypes[number] | null {
    const t = this.legacyToType(name);
    if (t) return t;
    const m = name.match(/^absenta-worker-(email|recurring|billing|notification|attendance|analytics|maintenance|infra)$/);
    if (m) return m[1] as any;
    return null;
  }

  /** Parse cron schedule string menjadi perkiraan interval dalam ms */
  private static parseCronIntervalMs(schedule: string | null): number | null {
    if (!schedule) return null;
    try {
      const parts = schedule.trim().split(/\s+/);
      if (parts.length < 5) return null;
      const [minute, hour] = parts;

      // Setiap menit: * * * * *
      if (minute === '*' && hour === '*') return 60_000;
      // Setiap N menit: */N * * * *
      const minuteMatch = minute.match(/^\*\/(\d+)$/);
      if (minuteMatch && hour === '*') return parseInt(minuteMatch[1], 10) * 60_000;
      // Setiap jam: 0 * * * *
      if (hour === '*' && !minute.startsWith('*')) return 3_600_000;
      // Setiap N jam: 0 */N * * *
      const hourMatch = hour.match(/^\*\/(\d+)$/);
      if (hourMatch) return parseInt(hourMatch[1], 10) * 3_600_000;
      // Harian: 0 H * * *
      return 86_400_000;
    } catch {
      return null;
    }
  }

  private static async toJobSummary(job: JobRegistryEntry): Promise<InfraJobSummary> {
    const expectedIntervalMs = InfraMonitoringService.parseCronIntervalMs(job.schedule);

    // Stuck guard: isRunning yang sudah > 10 menit dianggap macet
    const STUCK_THRESHOLD_MS = 10 * 60_000;
    let isRunning = await isJobRunning(job.name);
    if (isRunning && job.lastRun) {
      const runningForMs = Date.now() - new Date(job.lastRun as any).getTime();
      if (runningForMs > STUCK_THRESHOLD_MS) {
        // Auto-reset: tandai selesai agar tidak stuck selamanya
        await import('../../../../infra/jobRegistry').then(({ markJobEnd }) =>
          markJobEnd(job.name, null)
        );
        isRunning = false;
      }
    }

    // Staleness: job dianggap stale jika belum pernah jalan
    // atau waktu sejak lastRun > 3x interval yang diharapkan
    let isStale = false;
    if (!job.lastRun) {
      isStale = true; // belum pernah jalan sama sekali
    } else if (expectedIntervalMs) {
      const ageMs = Date.now() - new Date(job.lastRun as any).getTime();
      isStale = ageMs > expectedIntervalMs * 3;
    }

    const lastDurationMs =
      job.lastDurationMs !== undefined && job.lastDurationMs !== null
        ? Number(job.lastDurationMs)
        : null;

    return {
      name: job.name,
      type: job.type,
      concurrency: job.concurrency,
      schedule: job.schedule,
      lastRun: job.lastRun
        ? typeof job.lastRun === 'string'
          ? job.lastRun
          : (job.lastRun as Date).toISOString()
        : null,
      lastDurationMs,
      isRunning,
      isStale,
      expectedIntervalMs,
      lastStatus: job.lastStatus || null,
      lastError: job.lastError || null,
    };
  }

  async diagnosticLoad(params: { count?: number; ms?: number }): Promise<{ enqueued: number; ms: number }> {
    const { getMaintenanceQueue } = await import('../../../../queues/maintenance.queue').catch(() => ({
      getMaintenanceQueue: null as any,
    }));
    if (!getMaintenanceQueue) return { enqueued: 0, ms: 0 };
    const q = getMaintenanceQueue();
    const count = Math.max(1, Math.min(500, Number(params?.count || 15)));
    const ms = Math.max(100, Math.min(60000, Number(params?.ms || 5000)));
    const jobs: Array<Promise<any>> = [];
    const ts = Date.now();
    for (let i = 0; i < count; i++) {
      jobs.push(q.add('diag-cpu-burn', { ms }, { jobId: `diag_cpu_ui_${ts}_${i}` }));
    }
    await Promise.allSettled(jobs);
    return { enqueued: count, ms };
  }

  async listJobs(): Promise<InfraJobSummary[]> {
    const jobs = (await getJobs()).filter((job) => job.type === 'CRON');
    const summaries: InfraJobSummary[] = [];
    for (const job of jobs) {
      summaries.push(await InfraMonitoringService.toJobSummary(job));
    }
    return summaries;
  }

  async getJob(name: string): Promise<InfraJobSummary | null> {
    const jobs = (await getJobs()).filter((job) => job.type === 'CRON');
    const found = jobs.find((j: JobRegistryEntry) => j.name === name);
    return found ? InfraMonitoringService.toJobSummary(found) : null;
  }

  async listQueues(): Promise<InfraQueueSummary[]> {
    const emailQueue = getEmailQueue();
    const recurringQueue = getRecurringQueue();
    const { getBillingQueue } = await import('../../../../queues/billing.queue').catch(() => ({ getBillingQueue: null as any }));
    const { getNotificationQueue: getNotifQ } = await import('../../../../queues/notification.queue').catch(() => ({ getNotificationQueue: null as any }));
    const { getAttendanceQueue } = await import('../../../../queues/attendance.queue').catch(() => ({ getAttendanceQueue: null as any }));
    const { getAnalyticsQueue } = await import('../../../../queues/analytics.queue').catch(() => ({ getAnalyticsQueue: null as any }));
    const { getMaintenanceQueue } = await import('../../../../queues/maintenance.queue').catch(() => ({ getMaintenanceQueue: null as any }));
    const { getInfraQueue } = await import('../../../../queues/infra.queue').catch(() => ({ getInfraQueue: null as any }));

    const qList = [
      { name: 'emailQueue', q: emailQueue },
      { name: 'recurring', q: recurringQueue },
      ...(getBillingQueue ? [{ name: 'billing', q: getBillingQueue() }] : []),
      ...(getNotifQ ? [{ name: 'notification', q: getNotifQ() }] : []),
      ...(getAttendanceQueue ? [{ name: 'attendance', q: getAttendanceQueue() }] : []),
      ...(getAnalyticsQueue ? [{ name: 'analytics', q: getAnalyticsQueue() }] : []),
      ...(getMaintenanceQueue ? [{ name: 'maintenance', q: getMaintenanceQueue() }] : []),
      ...(getInfraQueue ? [{ name: 'infra', q: getInfraQueue() }] : []),
    ];

    const summaries: InfraQueueSummary[] = [];
    for (const item of qList) {
      try {
        const [counts, paused] = await Promise.all([
          item.q.getJobCounts('waiting', 'active', 'failed', 'delayed', 'waiting-children'),
          item.q.isPaused(),
        ]);
        const waiting = counts.waiting || 0;
        const active = counts.active || 0;
        const failed = counts.failed || 0;
        const delayed = (counts as any).delayed || 0;
        const waitingChildren = (counts as any)['waiting-children'] || 0;
        const agg = waiting + delayed + waitingChildren;
        const status: 'OK' | 'WARNING' | 'CRITICAL' =
          agg > 5000 ? 'CRITICAL' : agg > 1000 ? 'WARNING' : 'OK';
        summaries.push({
          name: item.name,
          waiting,
          active,
          failed,
          delayed,
          waitingChildren,
          paused,
          status,
        });
      } catch {
        summaries.push({
          name: item.name,
          waiting: 0,
          active: 0,
          failed: 0,
          delayed: 0,
          waitingChildren: 0,
          paused: false,
          status: 'CRITICAL',
        });
      }
    }
    return summaries;
  }

  async pauseQueue(name: string): Promise<InfraQueueSummary> {
    const queue = this.resolveQueue(name);
    await queue.pause();
    const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'waiting-children');
    const status = ((counts.waiting || 0) + (counts.delayed || 0) + (counts['waiting-children'] || 0)) > 5000
      ? 'CRITICAL'
      : ((counts.waiting || 0) + (counts.delayed || 0) + (counts['waiting-children'] || 0)) > 1000
      ? 'WARNING'
      : 'OK';
    return {
      name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      waitingChildren: (counts['waiting-children'] as number) || 0,
      paused: true,
      status,
    };
  }

  async resumeQueue(name: string): Promise<InfraQueueSummary> {
    const queue = this.resolveQueue(name);
    await queue.resume();
    const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'waiting-children');
    const paused = await queue.isPaused();
    const status = ((counts.waiting || 0) + (counts.delayed || 0) + (counts['waiting-children'] || 0)) > 5000
      ? 'CRITICAL'
      : ((counts.waiting || 0) + (counts.delayed || 0) + (counts['waiting-children'] || 0)) > 1000
      ? 'WARNING'
      : 'OK';
    return {
      name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      waitingChildren: (counts['waiting-children'] as number) || 0,
      paused,
      status,
    };
  }

  async getHealth(): Promise<InfraHealthSummary> {
    const redis = getRedisConnection();
    const startedRedis = Date.now();
    let redisStatus: 'UP' | 'DOWN' = 'DOWN';
    let redisLatency: number | null = null;
    try {
      await redis.ping();
      redisLatency = Date.now() - startedRedis;
      redisStatus = 'UP';
    } catch {
      redisStatus = 'DOWN';
      redisLatency = null;
    }

    const startedDb = Date.now();
    let dbStatus: 'UP' | 'DOWN' = 'DOWN';
    let dbLatency: number | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startedDb;
      dbStatus = 'UP';
    } catch {
      dbStatus = 'DOWN';
      dbLatency = null;
    }

    const emailQueue = getEmailQueue();
    const recurringQueue = getRecurringQueue();
    const [emailCounts, recurringCounts, workers] = await Promise.all([
      emailQueue.getJobCounts('waiting', 'active', 'failed'),
      recurringQueue.getJobCounts('waiting', 'active', 'failed'),
      this.listWorkers(),
    ]);
    const emailWorker = workers.find(w => w.name === 'absenta-email-worker');
    const recurringWorker = workers.find(w => w.name === 'absenta-recurring-worker');

    return {
      redis: {
        status: redisStatus,
        latency: redisLatency,
      },
      db: {
        status: dbStatus,
        latency: dbLatency,
      },
      workers: {
        email: {
          status: emailWorker && emailWorker.status === 'UP' ? 'UP' : 'DOWN',
          active: emailCounts.active || 0,
          waiting: emailCounts.waiting || 0,
          failed: emailCounts.failed || 0,
        },
        recurring: {
          status: recurringWorker && recurringWorker.status === 'UP' ? 'UP' : 'DOWN',
          active: recurringCounts.active || 0,
          waiting: recurringCounts.waiting || 0,
          failed: recurringCounts.failed || 0,
        },
      },
    };
  }

  async runCohortJob(): Promise<void> {
    const { cohortService } = await import('../../../../modules/analytics/services/cohort.service');
    await prisma.$transaction(async (tx) => {
      await cohortService.calculateAndUpsertCohorts(tx);
    });
  }

  private resolveQueue(name: string) {
    if (name === 'emailQueue') return getEmailQueue();
    if (name === 'recurringQueue' || name === 'recurring') return getRecurringQueue();
    if (name === 'billing') return require('../../../../queues/billing.queue').getBillingQueue();
    if (name === 'notification') return require('../../../../queues/notification.queue').getNotificationQueue();
    if (name === 'attendance') return require('../../../../queues/attendance.queue').getAttendanceQueue();
    if (name === 'analytics') return require('../../../../queues/analytics.queue').getAnalyticsQueue();
    if (name === 'maintenance') return require('../../../../queues/maintenance.queue').getMaintenanceQueue();
    if (name === 'infra') return require('../../../../queues/infra.queue').getInfraQueue();
    throw new Error(`Unknown queue: ${name}`);
  }

  async listWorkerNodes(): Promise<
    Array<{
      nodeId: string;
      workers: Array<{
        workerType: string;
        lastHeartbeat: number | null;
        startedAt: number | null;
        version?: string | null;
        concurrency?: number | null;
        critical?: boolean;
        lastRestartAt?: number | null;
      }>;
    }>
  > {
    const redis = getRedisConnection();
    const registryPatterns = [
      'worker:*:email',
      'worker:*:recurring',
      'worker:*:billing',
      'worker:*:notification',
      'worker:*:attendance',
      'worker:*:analytics',
      'worker:*:maintenance',
      'worker:*:infra',
    ];
    const scanPattern = async (pattern: string): Promise<string[]> => {
      const out: string[] = [];
      let cursor = '0';
      do {
        const res = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        const next = Array.isArray(res) ? res[0] : res.cursor;
        const batch: string[] = Array.isArray(res) ? res[1] : res.keys;
        for (const k of batch) out.push(k);
        cursor = String(next);
      } while (cursor !== '0');
      return out;
    };
    const keysBatches = await Promise.all(registryPatterns.map((p) => scanPattern(p)));
    const keys: string[] = ([] as string[]).concat(...keysBatches);
    const nodes: Record<string, Record<string, {
      lastHeartbeat: number | null;
      startedAt: number | null;
      version?: string | null;
      concurrency?: number | null;
      critical?: boolean;
      lastRestartAt?: number | null;
    }>> = {};
    for (const k of keys) {
      const m = k.match(/^worker:([^:]+):(email|recurring|billing|notification|attendance|analytics|maintenance|infra)$/);
      if (!m) continue;
      const rawNodeId = m[1];
      const nodeId = this.canonicalizeNodeId(rawNodeId);
      const workerType = m[2];
      try {
        const v = await redis.get(k);
        const json = v ? JSON.parse(v) : null;
        const [hbRaw, hbCanon] = await Promise.all([
          redis.get(`worker:${rawNodeId}:${workerType}:heartbeat`),
          nodeId !== rawNodeId ? redis.get(`worker:${nodeId}:${workerType}:heartbeat`) : Promise.resolve(null as any),
        ]);
        const hb = hbCanon ? Number(hbCanon) : hbRaw ? Number(hbRaw) : null;
        const age = hb ? Date.now() - hb : Number.POSITIVE_INFINITY;
        if (!(age < 30000)) {
          continue;
        }
        const critical = !!(await redis.get(`worker:${nodeId}:${workerType}:critical`));
        const lastRestartAtStr = await redis.get(`worker:${nodeId}:${workerType}:lastRestartAt`);
        if (!nodes[nodeId]) nodes[nodeId] = {};
        nodes[nodeId][workerType] = {
          lastHeartbeat: hb,
          startedAt: json?.startedAt ?? null,
          version: json?.version ?? null,
          concurrency: typeof json?.concurrency === 'number' ? json.concurrency : null,
          critical,
          lastRestartAt: lastRestartAtStr ? Number(lastRestartAtStr) : null,
        };
      } catch {}
    }
    return Object.keys(nodes)
      .map((nodeId) => {
        const workers = Object.keys(nodes[nodeId]).map((w) => ({
          workerType: w,
          lastHeartbeat: nodes[nodeId][w]?.lastHeartbeat ?? null,
          startedAt: nodes[nodeId][w]?.startedAt ?? null,
          version: nodes[nodeId][w]?.version ?? null,
          concurrency: nodes[nodeId][w]?.concurrency ?? null,
          critical: nodes[nodeId][w]?.critical ?? false,
          lastRestartAt: nodes[nodeId][w]?.lastRestartAt ?? null,
        }));
        return { nodeId, workers };
      })
      .filter((entry) => (entry.workers || []).length > 0);
  }

  async listWorkers(): Promise<
    Array<{
      name: string;
      heartbeatAt: number | null;
      status: 'UP' | 'STARTING' | 'STOPPING' | 'STALLED' | 'DOWN';
    }>
  > {
    const redis = getRedisConnection();
    const now = Date.now();
    const results: Array<{
      name: string;
      heartbeatAt: number | null;
      status: 'UP' | 'STARTING' | 'STOPPING' | 'STALLED' | 'DOWN';
    }> = [];
    for (const wt of this.workerTypes) {
      const legacyName =
        wt === 'infra'
          ? 'absenta-infra-worker'
          : wt === 'email'
          ? 'absenta-email-worker'
          : wt === 'recurring'
          ? 'absenta-recurring-worker'
          : wt === 'billing'
          ? 'absenta-billing-worker'
          : wt === 'notification'
          ? 'absenta-notification-worker'
          : wt === 'attendance'
          ? 'absenta-attendance-worker'
          : wt === 'analytics'
          ? 'absenta-analytics-worker'
          : 'absenta-maintenance-worker';
      const name = legacyName;
      let heartbeatAt: number | null = null;
      let lastAction: { action: 'start' | 'stop' | 'restart'; ts: number } | null = null;
      try {
        // Try legacy pm2-name heartbeat
        const vLegacy = await redis.get(`worker:${legacyName}:heartbeat`);
        if (vLegacy) heartbeatAt = Number(vLegacy);
        // Try canonical per-node heartbeat by scanning a few keys
        if (heartbeatAt == null) {
          let cursor = '0';
          const pattern = `worker:*:${wt}:heartbeat`;
          let best: number | null = null;
          for (let i = 0; i < 5; i++) {
            const res = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 200);
            const next = Array.isArray(res) ? res[0] : res.cursor;
            const keys: string[] = Array.isArray(res) ? res[1] : res.keys;
            for (const k of keys) {
              const val = await redis.get(k);
              if (val) {
                const n = Number(val);
                if (!Number.isNaN(n) && (best == null || n > best)) best = n;
              }
            }
            cursor = String(next || '0');
            if (cursor === '0') break;
          }
          heartbeatAt = best;
        }
        const la = await redis.get(`worker:${wt}:lastAction`);
        if (la) {
          try {
            lastAction = JSON.parse(la);
          } catch {}
        }
      } catch {}
      const hbFresh = typeof heartbeatAt === 'number' && now - heartbeatAt < 30000;
      let status: 'UP' | 'STARTING' | 'STOPPING' | 'STALLED' | 'DOWN' = 'DOWN';
      if (hbFresh) status = 'UP';
      else status = heartbeatAt ? 'STALLED' : 'DOWN';
      if (lastAction && lastAction.action === 'stop' && now - lastAction.ts < 30000) status = 'STOPPING';
      if (lastAction && lastAction.action === 'start' && now - lastAction.ts < 30000 && !hbFresh) status = 'STARTING';
      results.push({ name, heartbeatAt, status });
    }
    return results;
  }

  async listClusterNodes(): Promise<Array<{ nodeId: string; lastHeartbeat: number | null; status: 'online' | 'offline' }>> {
    const redis = getRedisConnection();
    const nodes: Array<{ nodeId: string; lastHeartbeat: number | null; status: 'online' | 'offline' }> = [];
    const now = Date.now();
    let cursor = '0';
    do {
      const res = await (redis as any).scan(cursor, 'MATCH', 'node:*:heartbeat', 'COUNT', 200);
      const next = Array.isArray(res) ? res[0] : res.cursor;
      const keys: string[] = Array.isArray(res) ? res[1] : res.keys;
      for (const k of keys) {
        const m = String(k).match(/^node:([^:]+):heartbeat$/);
        if (!m) continue;
        const nodeId = this.canonicalizeNodeId(m[1]);
        try {
          const v = await redis.get(k);
          const ts = v ? Number(v) : null;
          const age = typeof ts === 'number' && !Number.isNaN(ts) ? now - ts : Number.POSITIVE_INFINITY;
          nodes.push({
            nodeId,
            lastHeartbeat: typeof ts === 'number' && !Number.isNaN(ts) ? ts : null,
            status: age < 20000 ? 'online' : 'offline',
          });
        } catch {
          nodes.push({ nodeId, lastHeartbeat: null, status: 'offline' });
        }
      }
      cursor = String(next || '0');
    } while (cursor !== '0');
    const uniq = new Map<string, { nodeId: string; lastHeartbeat: number | null; status: 'online' | 'offline' }>();
    for (const n of nodes) {
      const prev = uniq.get(n.nodeId);
      if (!prev) uniq.set(n.nodeId, n);
      else {
        const a = prev.lastHeartbeat || 0;
        const b = n.lastHeartbeat || 0;
        if (b > a) uniq.set(n.nodeId, n);
      }
    }
    return Array.from(uniq.values()).sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  async listClusterQueues(): Promise<Array<{ name: string; length: number }>> {
    const redis = getRedisConnection();
    const { getAttendanceQueue } = await import('../../../../queues/attendance.queue').catch(() => ({
      getAttendanceQueue: null as any,
    }));
    const { getBillingQueue } = await import('../../../../queues/billing.queue').catch(() => ({
      getBillingQueue: null as any,
    }));
    const { getNotificationQueue } = await import('../../../../queues/notification.queue').catch(() => ({
      getNotificationQueue: null as any,
    }));
    const { getAnalyticsQueue } = await import('../../../../queues/analytics.queue').catch(() => ({
      getAnalyticsQueue: null as any,
    }));

    const queues: Array<{
      name: string;
      legacyRedisKey: string;
      bullWaitKey: string;
      getQueue?: (() => any) | null;
    }> = [
      { name: 'attendance_queue', legacyRedisKey: 'attendance_queue', bullWaitKey: 'bull:attendance:wait', getQueue: getAttendanceQueue ? () => getAttendanceQueue() : null },
      { name: 'notification_queue', legacyRedisKey: 'notification_queue', bullWaitKey: 'bull:notification:wait', getQueue: getNotificationQueue ? () => getNotificationQueue() : null },
      { name: 'billing_queue', legacyRedisKey: 'billing_queue', bullWaitKey: 'bull:billing:wait', getQueue: getBillingQueue ? () => getBillingQueue() : null },
      { name: 'analytics_queue', legacyRedisKey: 'analytics_queue', bullWaitKey: 'bull:analytics:wait', getQueue: getAnalyticsQueue ? () => getAnalyticsQueue() : null },
    ];
    const results: Array<{ name: string; length: number }> = [];
    for (const q of queues) {
      let bullmqQueued = 0;
      let legacyLen = 0;
      let bullWaitLen = 0;
      try {
        if (q.getQueue) {
          const queue = q.getQueue();
          const c = await queue.getJobCounts('waiting', 'delayed', 'waiting-children');
          bullmqQueued =
            (c.waiting || 0) + ((c as any).delayed || 0) + ((c as any)['waiting-children'] || 0);
        }
      } catch {}
      try {
        const n = await (redis as any).llen(q.legacyRedisKey);
        legacyLen = typeof n === 'number' ? n : Number(n || 0);
      } catch {}
      try {
        const n = await (redis as any).llen(q.bullWaitKey);
        bullWaitLen = typeof n === 'number' ? n : Number(n || 0);
      } catch {}
      try {
        const length = Math.max(0, bullmqQueued, legacyLen, bullWaitLen);
        results.push({ name: q.name, length });
      } catch {
        results.push({ name: q.name, length: 0 });
      }
    }
    return results;
  }

  async listQueuePressure(): Promise<
    Array<{ queue: string; waiting: number; workers: number; pressure: number; status: 'NORMAL' | 'BUSY' | 'HIGH' | 'CRITICAL' }>
  > {
    const [queues, workers] = await Promise.all([this.listClusterQueues(), this.listClusterWorkers()]);
    const queueToWorkerType: Record<string, string> = {
      attendance_queue: 'attendance',
      notification_queue: 'notification',
      billing_queue: 'billing',
      analytics_queue: 'analytics',
    };
    const runningByType: Record<string, number> = {};
    for (const w of workers) {
      if (w.status !== 'running') continue;
      const inst = typeof (w as any).instances === 'number' && Number.isFinite((w as any).instances) ? Math.max(0, Math.floor((w as any).instances)) : 1;
      runningByType[w.workerType] = (runningByType[w.workerType] || 0) + Math.max(1, inst);
    }
    return queues.map((q) => {
      const workerType = queueToWorkerType[q.name] || '';
      const activeWorkers = workerType ? runningByType[workerType] || 0 : 0;
      const waiting = typeof q.length === 'number' ? q.length : 0;
      const pressure = activeWorkers > 0 ? waiting / activeWorkers : waiting;
      let status: 'NORMAL' | 'BUSY' | 'HIGH' | 'CRITICAL' = 'NORMAL';
      if (activeWorkers === 0 && waiting > 0) status = 'CRITICAL';
      else if (pressure >= 500) status = 'CRITICAL';
      else if (pressure >= 200) status = 'HIGH';
      else if (pressure >= 50) status = 'BUSY';
      return {
        queue: workerType || q.name,
        waiting,
        workers: activeWorkers,
        pressure: Number.isFinite(pressure) ? pressure : waiting,
        status,
      };
    });
  }

  async listQueueForecast(): Promise<
    Array<{ queue: string; current: number; predicted1m: number; growthRatePerSec: number; throughputPerMin: number }>
  > {
    const redis = getRedisConnection();
    const queues = await this.listClusterQueues();
    const clampInt = (n: number, min: number, max: number) => {
      if (!Number.isFinite(n)) return min;
      return Math.max(min, Math.min(max, Math.floor(n)));
    };
    const throughputPerMin = (workerType: string) => {
      if (workerType === 'attendance') return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_ATTENDANCE_PER_MIN || '50'), 10), 1, 100000);
      if (workerType === 'billing') return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_BILLING_PER_MIN || '30'), 10), 1, 100000);
      if (workerType === 'notification') return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_NOTIFICATION_PER_MIN || '50'), 10), 1, 100000);
      if (workerType === 'analytics') return clampInt(parseInt(String(process.env.PREDICTIVE_THROUGHPUT_ANALYTICS_PER_MIN || '30'), 10), 1, 100000);
      return 50;
    };
    const growthPerSecFor = async (workerType: string): Promise<number> => {
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
    };

    const toWorkerType: Record<string, string> = {
      attendance_queue: 'attendance',
      billing_queue: 'billing',
      notification_queue: 'notification',
      analytics_queue: 'analytics',
    };

    const out: Array<{ queue: string; current: number; predicted1m: number; growthRatePerSec: number; throughputPerMin: number }> = [];
    for (const q of queues) {
      const workerType = toWorkerType[q.name] || q.name.replace(/_queue$/, '');
      const current = typeof q.length === 'number' ? q.length : 0;
      const growthRatePerSec = await growthPerSecFor(workerType);
      const predicted1m = Math.max(0, Math.round(current + growthRatePerSec * 60));
      out.push({
        queue: `${workerType}_queue`,
        current,
        predicted1m,
        growthRatePerSec: Number.isFinite(growthRatePerSec) ? growthRatePerSec : 0,
        throughputPerMin: throughputPerMin(workerType),
      });
    }
    return out;
  }

  async listClusterWorkers(): Promise<
    Array<{ workerType: string; nodeId: string; status: 'running' | 'offline'; lastHeartbeat: number | null; instances: number }>
  > {
    const redis = getRedisConnection();
    const out: Array<{ workerType: string; nodeId: string; status: 'running' | 'offline'; lastHeartbeat: number | null; instances: number }> = [];
    const now = Date.now();
    let cursor = '0';
    do {
      const res = await (redis as any).scan(cursor, 'MATCH', 'worker:*:*', 'COUNT', 200);
      const next = Array.isArray(res) ? res[0] : res.cursor;
      const keys: string[] = Array.isArray(res) ? res[1] : res.keys;
      for (const k of keys) {
        const m = String(k).match(/^worker:([^:]+):(email|recurring|billing|notification|attendance|analytics|maintenance|infra)$/);
        if (!m) continue;
        const nodeId = this.canonicalizeNodeId(m[1]);
        const workerType = m[2];
        try {
          const hbStr = await redis.get(`worker:${nodeId}:${workerType}:heartbeat`);
          const hb = hbStr ? Number(hbStr) : null;
          const age = typeof hb === 'number' && !Number.isNaN(hb) ? now - hb : Number.POSITIVE_INFINITY;
          let instances = 0;
          try {
            const v = await redis.get(`worker:${nodeId}:${workerType}:instances`);
            if (v) {
              const n = Number(v);
              if (!Number.isNaN(n)) instances = Math.max(0, Math.floor(n));
            }
          } catch {}
          if (instances <= 0) {
            try {
              const v = await redis.get(`agent:${nodeId}:${workerType}:instances`);
              if (v) {
                const n = Number(v);
                if (!Number.isNaN(n)) instances = Math.max(0, Math.floor(n));
              }
            } catch {}
          }
          if (instances <= 0 && age < 20000) instances = 1;
          out.push({
            workerType,
            nodeId,
            lastHeartbeat: typeof hb === 'number' && !Number.isNaN(hb) ? hb : null,
            status: age < 20000 ? 'running' : 'offline',
            instances,
          });
        } catch {
          out.push({ workerType, nodeId, lastHeartbeat: null, status: 'offline', instances: 0 });
        }
      }
      cursor = String(next || '0');
    } while (cursor !== '0');
    const uniqKey = (x: { workerType: string; nodeId: string }) => `${x.nodeId}:${x.workerType}`;
    const uniq = new Map<
      string,
      { workerType: string; nodeId: string; status: 'running' | 'offline'; lastHeartbeat: number | null; instances: number }
    >();
    for (const e of out) {
      const key = uniqKey(e);
      const prev = uniq.get(key);
      if (!prev) uniq.set(key, e);
      else {
        const a = prev.lastHeartbeat || 0;
        const b = e.lastHeartbeat || 0;
        if (b > a) uniq.set(key, e);
      }
    }
    return Array.from(uniq.values()).sort((a, b) => (a.nodeId + a.workerType).localeCompare(b.nodeId + b.workerType));
  }

  async listAutoscalerEvents(): Promise<Array<any>> {
    const redis = getRedisConnection();
    try {
      const raw = await (redis as any).lrange('autoscaler:events', 0, 19);
      const arr: string[] = Array.isArray(raw) ? raw : [];
      return arr.map((s) => {
        try {
          return JSON.parse(String(s));
        } catch {
          return { raw: String(s) };
        }
      });
    } catch {
      return [];
    }
  }

  async workerAction(params: { action: 'start' | 'stop' | 'restart'; workerType: string; nodeId: string }): Promise<{ ok: boolean }> {
    const action = params.action;
    const workerType = String(params.workerType || '').trim();
    const nodeId = this.canonicalizeNodeId(params.nodeId);
    if (!workerType) throw new Error('INVALID_WORKER_TYPE');
    if (!nodeId) throw new Error('INVALID_NODE_ID');
    const redis = getRedisConnection();
    try {
      await redis.set(`worker:${workerType}:lastAction`, JSON.stringify({ action, ts: Date.now() }), 'EX', 60);
    } catch {}
    await publishControlEvent(action, workerType, nodeId);
    return { ok: true };
  }


  private async resolveNodeForWorkerType(workerType: typeof this.workerTypes[number]): Promise<string | null> {
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
            const nodeId = this.canonicalizeNodeId(m[1]);
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

  async controlWorker(
    action: 'start' | 'stop' | 'restart',
    workerName: string,
    nodeId?: string | null
  ): Promise<{ ok: boolean }> {
    const wt = this.normalizeNameToType(workerName) || (this.normalizeNameToType(this.toContainerName(workerName as any)) as any);
    if (!wt) throw new Error('WORKER_NOT_ALLOWED');
    const redis = getRedisConnection();
    try {
      await redis.set(`worker:${wt}:lastAction`, JSON.stringify({ action, ts: Date.now() }), 'EX', 60);
    } catch {}
    const targetNode =
      (nodeId && this.canonicalizeNodeId(nodeId)) ||
      (await this.resolveNodeForWorkerType(wt)) ||
      this.canonicalizeNodeId(process.env.NODE_NAME || '');
    if (!targetNode) throw new Error('NODE_NOT_RESOLVED');
    await publishControlEvent(action, wt, targetNode);
    return { ok: true };
  }
}
