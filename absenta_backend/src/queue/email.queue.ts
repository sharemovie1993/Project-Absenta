import { Queue } from 'bullmq';
import type { EmailData } from '../modules/notification/services/email.service';
import { getRedisConnection } from './redis';
import { registerQueue } from '../infra/jobRegistry';

export const EMAIL_QUEUE_NAME = 'emailQueue';

let queue: Queue<EmailData> | null = null;

export const getEmailQueue = (): Queue<EmailData> => {
  if (queue) return queue;
  queue = new Queue<EmailData>(EMAIL_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      delay: 5000,
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(EMAIL_QUEUE_NAME, 1);
  return queue;
};

export const closeEmailQueue = async (): Promise<void> => {
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
