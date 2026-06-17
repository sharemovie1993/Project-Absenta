import { Queue } from 'bullmq';
import { getRedisConnection } from '../../queue/redis';

export const RESTORE_QUEUE_NAME = 'restore';

export type RestoreJobData = {
  backupId: string;
  targetTenantId: string;
  initiatedBy: string;
};

let queue: any = null;

export const getRestoreQueue = (): Queue<RestoreJobData> => {
  if (queue) return queue as Queue<RestoreJobData>;
  queue = new Queue<RestoreJobData>(RESTORE_QUEUE_NAME, {
    connection: getRedisConnection() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  return queue as Queue<RestoreJobData>;
};
