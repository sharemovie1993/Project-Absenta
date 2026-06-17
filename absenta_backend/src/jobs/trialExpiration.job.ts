import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'trialExpiration',
  schedule: '5 * * * *', // menit ke-5 setiap jam
  async run() {
    const { getBillingQueue } = await import('../queues/billing.queue');
    const q = getBillingQueue();
    await q.add(
      'trial-expiration',
      { ts: Date.now() },
      {
        jobId: `trial-expiration_${new Date().toISOString().slice(0, 13).replace(/[:.]/g, '')}`,
      }
    );
  },
});

/**
 * Jalankan satu siklus trial expiration.
 * Diekspor untuk backward compatibility dengan billing.worker.ts
 */
export async function runTrialExpirationCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('trialExpiration');
}
