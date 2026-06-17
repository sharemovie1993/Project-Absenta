import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const MAINTENANCE_QUEUE_NAME = 'maintenance';

let queue: Queue<any> | null = null;

export const getMaintenanceQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(MAINTENANCE_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(MAINTENANCE_QUEUE_NAME, 2);
  return queue;
};

export const closeMaintenanceQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
