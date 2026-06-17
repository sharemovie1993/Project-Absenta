import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'logRetention',
  schedule: '30 2 * * *', // jam 02:30 setiap hari
  envFlag: 'LOG_RETENTION_ENABLED',
  async run() {
    const { getMaintenanceQueue } = await import('../queues/maintenance.queue');
    const q = getMaintenanceQueue();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await q.add(
      'log-retention',
      { ts: Date.now() },
      { jobId: `log-retention_${today}` }
    );
    appLogger.info({ job: 'logRetention' }, 'logRetention: enqueued to maintenance queue');
  },
});

/**
 * Jalankan satu siklus log retention.
 * Diekspor untuk backward compatibility dengan maintenance.worker.ts
 */
export async function runLogRetentionCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('logRetention');
}
