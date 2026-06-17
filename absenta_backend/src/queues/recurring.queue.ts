import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const RECURRING_QUEUE_NAME = 'recurring';

export type RecurringJobName =
  | 'PROCESS_DUE_SUBSCRIPTION'
  | 'PROCESS_TRIAL_END'
  | 'PROCESS_INVOICE_OVERDUE'
  | 'PROCESS_INVOICE_SUSPENSION';

export type RecurringJobData =
  | { subscriptionId: string; tenantId?: string; correlationId?: string }
  | { invoiceId: string; tenantId?: string; correlationId?: string };

let queue: Queue<RecurringJobData> | null = null;

export const getRecurringQueue = (): Queue<RecurringJobData> => {
  if (queue) return queue;
  queue = new Queue<RecurringJobData>(RECURRING_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(RECURRING_QUEUE_NAME, 1);
  return queue;
};

export const closeRecurringQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
