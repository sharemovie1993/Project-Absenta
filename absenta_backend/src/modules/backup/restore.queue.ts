import { Queue } from 'bullmq';
import { getRedisConnection } from '../../queue/redis';

export const RESTORE_QUEUE_NAME = 'restore';

export type RestoreJobData = {
  backupId: string;
  targetTenantId: string;
  initiatedBy: string;
};

let queue: Queue<RestoreJobData> | null = null;

export const getRestoreQueue = (): Queue<RestoreJobData> => {
  if (queue) return queue;
  queue = new Queue<RestoreJobData>(RESTORE_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  return queue;
};
