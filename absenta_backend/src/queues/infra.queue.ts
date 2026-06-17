import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const INFRA_QUEUE_NAME = 'infra';

let queue: Queue<any> | null = null;

export const getInfraQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(INFRA_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(INFRA_QUEUE_NAME, 1);
  return queue;
};

export const closeInfraQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
