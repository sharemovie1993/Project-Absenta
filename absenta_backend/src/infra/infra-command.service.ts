import { getRedisConnection } from '../queue/redis';

export type InfraControlAction = 'start' | 'stop' | 'restart';

export async function publishControlEvent(
  action: InfraControlAction,
  workerType: string,
  nodeId: string
): Promise<void> {
  const redis = getRedisConnection();
  const payload = JSON.stringify({ action, workerType, nodeId });
  await (redis as any).publish('infra-control', payload);
}

