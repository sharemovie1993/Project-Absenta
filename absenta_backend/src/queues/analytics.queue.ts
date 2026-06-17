import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const ANALYTICS_QUEUE_NAME = 'analytics';

let queue: Queue<any> | null = null;

export const getAnalyticsQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(ANALYTICS_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(ANALYTICS_QUEUE_NAME, 2);
  return queue;
};

export const closeAnalyticsQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
