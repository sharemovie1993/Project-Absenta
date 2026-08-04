import { getRedisConnection } from '../queue/redis';
import { getNodeId } from './nodeId';
import { observabilityService } from '../modules/observability/services/observability.service';

function parseRegKey(
  key: string,
): { nodeId: string; workerType: 'email' | 'recurring' | 'billing' | 'notification' | 'attendance' | 'analytics' | 'maintenance' | 'infra' } | null {
  const m = key.match(/^worker:([^:]+):(email|recurring|billing|notification|attendance|analytics|maintenance|infra)$/);
  if (!m) return null;
  return { nodeId: m[1], workerType: m[2] as any };
}

async function scanPattern(redis: any, pattern: string): Promise<string[]> {
  const out: string[] = [];
  let cursor = '0';
  do {
    const res = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    const next = Array.isArray(res) ? res[0] : res.cursor;
    const batch: string[] = Array.isArray(res) ? res[1] : res.keys;
    for (const k of batch) out.push(k);
    cursor = String(next);
  } while (cursor !== '0');
  return out;
}

async function scanWorkerRegistryKeys(redis: any): Promise<string[]> {
  const patterns = [
    'worker:*:email',
    'worker:*:recurring',
    'worker:*:billing',
    'worker:*:notification',
    'worker:*:attendance',
    'worker:*:analytics',
    'worker:*:maintenance',
    'worker:*:infra',
  ];
  const out: string[] = [];
  for (const p of patterns) {
    const keys = await scanPattern(redis, p);
    for (const k of keys) out.push(k);
  }
  return out;
}

export function startAutoHealScheduler(): void {
  const redis = getRedisConnection();
  const nodeId = getNodeId();
  const verbose = String(process.env.AUTOHEAL_VERBOSE || '').toLowerCase() === 'true';

  const run = async () => {
    try {
      const lockKey = 'infra:autoheal:lock';
      const got = await (redis as any).set(lockKey, nodeId, 'NX', 'EX', 5);
      if (got !== 'OK') return;

      if (verbose) console.log(`[AutoHeal][scan] lock_acquired_by=${nodeId}`);

      const keys: string[] = await scanPattern(redis, 'worker:*:*');
      const validKeys = keys.filter(k => parseRegKey(k) !== null);

      if (verbose) console.log(`[AutoHeal][scan] registry_keys=${validKeys.length}`);

      const now = Date.now();
      for (const k of validKeys) {
        const meta = parseRegKey(k);
        if (!meta) continue;
        const hbKey = `worker:${meta.nodeId}:${meta.workerType}:heartbeat`;
        const v = await redis.get(hbKey);
        const ts = v ? Number(v) : 0;
        const age = ts ? now - ts : Number.MAX_SAFE_INTEGER;

        if (verbose) {
          console.log(`[AutoHeal][scan] key=${k} ts=${ts || 'null'} age_ms=${Number.isFinite(age) ? age : 'INF'}`);
        }

        if (age > 30000) {
          const cdKey = `infra:autoheal:${meta.nodeId}:${meta.workerType}:cooldown`;
          const setCd = await (redis as any).set(cdKey, '1', 'NX', 'EX', 30);
          if (setCd !== 'OK') continue;

          const countKey = `worker:${meta.nodeId}:${meta.workerType}:restart_count`;
          const cnt = await (redis as any).incr(countKey);
          if (cnt === 1) {
            await (redis as any).expire(countKey, 300); // 5 menit
          }

          if (cnt > 5) {
            await (redis as any).set(`worker:${meta.nodeId}:${meta.workerType}:critical`, '1', 'EX', 600);
            console.error(`[AutoHeal] 🚨 CRITICAL restart limit exceeded for ${meta.nodeId}:${meta.workerType}`);
            observabilityService.logEvent({
              event_type: 'INFRA_WORKER_RESTART_CRITICAL',
              domain: 'INFRA',
              severity: 'CRITICAL',
              entity_type: 'WORKER',
              entity_id: `${meta.nodeId}:${meta.workerType}`,
              metadata: { node_id: meta.nodeId, worker_type: meta.workerType, restart_count: cnt },
            });
            continue;
          }

          console.warn(`[AutoHeal] ⚠️ Worker stalled (${meta.nodeId}:${meta.workerType}), age=${Math.round(age / 1000)}s. Triggering restart...`);
          observabilityService.logEvent({
            event_type: 'INFRA_WORKER_STALLED',
            domain: 'INFRA',
            severity: 'WARNING',
            entity_type: 'WORKER',
            entity_id: `${meta.nodeId}:${meta.workerType}`,
            metadata: { node_id: meta.nodeId, worker_type: meta.workerType, age_ms: age },
          });

          const msg = JSON.stringify({ action: 'restart', workerType: meta.workerType, nodeId: meta.nodeId });
          await (redis as any).publish('worker-control', msg);
          await (redis as any).set(`worker:${meta.nodeId}:${meta.workerType}:lastRestartAt`, String(Date.now()), 'EX', 86400);

          observabilityService.logEvent({
            event_type: 'INFRA_WORKER_RESTART_TRIGGERED',
            domain: 'INFRA',
            severity: 'ERROR',
            entity_type: 'WORKER',
            entity_id: `${meta.nodeId}:${meta.workerType}`,
            metadata: { node_id: meta.nodeId, worker_type: meta.workerType },
          });
        }
      }
    } catch (err: any) {
      if (verbose) console.error('[AutoHeal] Error in scan cycle:', err);
    }
  };

  const intervalMs = process.env.NODE_ENV === 'development' ? 30000 : 15000;
  setInterval(() => void run(), intervalMs);
}
