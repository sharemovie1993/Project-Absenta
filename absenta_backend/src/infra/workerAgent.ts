import { getRedisConnection } from '../queue/redis';
import { getNodeId } from './nodeId';

export function startWorkerAgent(): void {
  const redis = getRedisConnection();
  const nodeId = getNodeId();

  setInterval(() => {
    try {
      void (redis as any).set(`node:${nodeId}:heartbeat`, String(Date.now()), 'EX', 30);
    } catch {}
  }, 10000);
}
