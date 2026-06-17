import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../queue/redis';
import { RESTORE_QUEUE_NAME, RestoreJobData } from './restore.queue';
import { RestoreService } from './services/restore.service';
import { prisma } from '../../utils/prisma';
import { RestoreStatus, BackupStatus } from '@prisma/client';

let worker: Worker<RestoreJobData> | null = null;

export const startRestoreWorker = () => {
  if (worker) return;

  worker = new Worker<RestoreJobData>(
    RESTORE_QUEUE_NAME,
    async (job: Job<RestoreJobData>) => {
      const { backupId, targetTenantId, initiatedBy } = job.data;
      console.log(`[RESTORE-WORKER] Starting restore job ${job.id} for backup ${backupId} to tenant ${targetTenantId}`);

      const restoreService = new RestoreService(prisma);
      const pub: any = getRedisConnection();
      
      try {
        await restoreService.restoreBackup(backupId, targetTenantId, initiatedBy);
        
        // SUCCESS: Update DB & Publish
        await prisma.tenantBackup.update({
            where: { id: backupId },
            data: {
                status: BackupStatus.RESTORED,
                restore_status: RestoreStatus.COMPLETED,
                restored_at: new Date()
            }
        });

        await pub.publish(`restore:progress:${backupId}`, JSON.stringify({ type: "completed" }));
        console.log(`[RESTORE-WORKER] Job ${job.id} completed successfully`);

      } catch (error: any) {
        console.error(`[RESTORE-WORKER] Job ${job.id} failed:`, error);
        
        // ERROR: Update DB & Publish BEFORE Rethrow
        try {
            await prisma.tenantBackup.update({
                where: { id: backupId },
                data: {
                    restore_status: RestoreStatus.FAILED,
                    status: BackupStatus.READY // Reset to READY so it can be retried if needed, or keep as failed? Instruction says READY.
                }
            });

            await pub.publish(`restore:progress:${backupId}`, JSON.stringify({ 
                type: "failed", 
                message: error.message || 'Unknown error' 
            }));
        } catch (dbError) {
            console.error('[RESTORE-WORKER] Failed to update DB status on error:', dbError);
        }

        throw error; // Let BullMQ handle retries
      }
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 1,
      lockDuration: 600000, // 10 minutes default lock
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[RESTORE-WORKER] Job ${job?.id} failed with error ${err.message}`);
    
    // Final Safety Net: Ensure DB is not stuck in IN_PROGRESS
    if (job?.data) {
        const { backupId } = job.data;
        try {
            const backup = await prisma.tenantBackup.findUnique({ where: { id: backupId } });
            if (backup && backup.restore_status === RestoreStatus.IN_PROGRESS) {
                console.warn(`[RESTORE-WORKER] Safety Net: Marking stuck backup ${backupId} as FAILED`);
                await prisma.tenantBackup.update({
                    where: { id: backupId },
                    data: { restore_status: RestoreStatus.FAILED, status: BackupStatus.READY }
                });
            }
        } catch (e) {
            console.error('[RESTORE-WORKER] Safety Net failed:', e);
        }
    }
  });
  
  console.log(`[RESTORE-WORKER] Started listening to ${RESTORE_QUEUE_NAME} queue`);
};
