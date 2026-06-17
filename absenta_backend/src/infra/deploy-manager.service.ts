import { getRedisConnection } from '../queue/redis';
import { getNodeId } from './nodeId';
import { publishControlEvent } from './infra-command.service';

export async function rollingDeployWorker(workerType: string, timeoutMs = 60000): Promise<{ ok: boolean }> {
  const redis = getRedisConnection();
  const nodeId = getNodeId();
  await publishControlEvent('restart', workerType, nodeId);
  const hbKey = `worker:${nodeId}:${workerType}:heartbeat`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const v = await redis.get(hbKey);
      if (v) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { ok: true };
}

export async function rollingDeployBackend(timeoutMs = 90000): Promise<{ ok: boolean }> {
  const nodeId = getNodeId();
  await publishControlEvent('restart', 'backend-api', nodeId);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1000));
    break;
  }
  return { ok: true };
}
