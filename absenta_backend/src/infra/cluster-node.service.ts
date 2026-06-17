import { getRedisConnection } from '../queue/redis';
import { getNodeId } from './nodeId';

export async function registerNode(intervalMs = 10000): Promise<void> {
  const redis = getRedisConnection();
  const nodeId = getNodeId();
  const key = `node:${nodeId}:heartbeat`;
  const write = async () => {
    try {
      await redis.set(key, String(Date.now()), 'EX', 30);
    } catch {}
  };
  await write();
  setInterval(() => {
    void write();
  }, intervalMs);
}

export async function getActiveNodes(): Promise<string[]> {
  const redis = getRedisConnection();
  const out: string[] = [];
  let cursor = '0';
  const now = Date.now();
  do {
    const res = await (redis as any).scan(cursor, 'MATCH', 'node:*:heartbeat', 'COUNT', 200);
    const next = Array.isArray(res) ? res[0] : res.cursor;
    const keys: string[] = Array.isArray(res) ? res[1] : res.keys;
    for (const k of keys) {
      try {
        const v = await redis.get(k);
        if (v) {
          const ts = Number(v);
          if (!Number.isNaN(ts) && now - ts < 30000) {
            const m = k.match(/^node:([^:]+):heartbeat$/);
            if (m) out.push(m[1]);
          }
        }
      } catch {}
    }
    cursor = String(next || '0');
  } while (cursor !== '0');
  return Array.from(new Set(out));
}

export async function assignWorkerNode(workerType: string): Promise<string | null> {
  const redis = getRedisConnection();
  const nodes = await getActiveNodes();
  if (nodes.length === 0) return null;
  const key = `assign:${workerType}:rr`;
  let idx = 0;
  try {
    const n = await redis.incr(key);
    idx = Math.abs(Number(n)) % nodes.length;
    await redis.expire(key, 60);
  } catch {
    idx = 0;
  }
  return nodes[idx];
}

