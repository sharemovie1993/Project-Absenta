import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'failedJobCleanup',
  schedule: '30 2 * * *', // jam 02:30 setiap hari
  async run() {
    const { getMaintenanceQueue } = await import('../queues/maintenance.queue');
    const q = getMaintenanceQueue();
    await q.add(
      'failed-job-cleanup',
      { ts: Date.now() },
      {
        jobId: `failed-job-cleanup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      }
    );
    appLogger.info({ job: 'failedJobCleanup' }, 'failedJobCleanup: enqueued to maintenance queue');
  },
});

/**
 * Jalankan satu siklus pembersihan job gagal.
 * Diekspor untuk backward compatibility dengan maintenance.worker.ts
 */
export async function scheduleFailedJobCleanup() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('failedJobCleanup');
}
