import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const BILLING_QUEUE_NAME = 'billing';
export const BILLING_DLQ_QUEUE_NAME = 'billing_dlq';

let queue: Queue<any> | null = null;
let dlq: Queue<any> | null = null;

export const getBillingQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(BILLING_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(BILLING_QUEUE_NAME, 3);
  return queue;
};

export const closeBillingQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};

export const getBillingDlqQueue = (): Queue<any> => {
  if (dlq) return dlq;
  dlq = new Queue(BILLING_DLQ_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      backoff: { type: 'fixed', delay: 0 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(BILLING_DLQ_QUEUE_NAME, 1);
  return dlq;
};
