import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const NOTIFICATION_QUEUE_NAME_GENERAL = 'notification';
export const NOTIFICATION_DLQ_QUEUE_NAME = 'notification_dlq';

let queue: Queue<any> | null = null;
let dlq: Queue<any> | null = null;

export const getNotificationQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(NOTIFICATION_QUEUE_NAME_GENERAL, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(NOTIFICATION_QUEUE_NAME_GENERAL, 5);
  return queue;
};

export const closeNotificationQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};

export const getNotificationDlqQueue = (): Queue<any> => {
  if (dlq) return dlq;
  dlq = new Queue(NOTIFICATION_DLQ_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      backoff: { type: 'fixed', delay: 0 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(NOTIFICATION_DLQ_QUEUE_NAME, 1);
  return dlq;
};
