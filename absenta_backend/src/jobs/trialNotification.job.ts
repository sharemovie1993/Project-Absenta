import { appLogger } from '../utils/app-logger';
import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'trialNotification',
  schedule: '0 0 * * *', // tengah malam setiap hari
  async run() {
    const { getNotificationQueue } = await import('../queues/notification.queue');
    const q = getNotificationQueue();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await q.add(
      'trial-notification',
      { ts: Date.now() },
      { jobId: `trial-notification_${today}` }
    );
    appLogger.info({ job: 'trialNotification' }, 'trialNotification: enqueued');
  },
});

/**
 * Jalankan satu siklus notifikasi trial.
 * Diekspor untuk backward compatibility dengan notification.worker.ts
 */
export async function runTrialNotificationCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('trialNotification');
}
