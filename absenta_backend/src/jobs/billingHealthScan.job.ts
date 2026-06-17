import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

const INTERVAL_MINUTES = parseInt(
  process.env.BILLING_HEALTH_SCAN_INTERVAL_MINUTES || '15',
  10
);

export default defineCronJob({
  name: 'billingHealthScan',
  schedule: `*/${INTERVAL_MINUTES} * * * *`, // setiap N menit (default 15)
  envFlag: 'BILLING_HEALTH_SCAN_ENABLED',
  lockTtlSeconds: INTERVAL_MINUTES * 60 - 10, // sedikit di bawah interval
  async run() {
    const { getBillingQueue } = await import('../queues/billing.queue');
    const q = getBillingQueue();
    const windowKey = Math.floor(Date.now() / (INTERVAL_MINUTES * 60 * 1000));
    await q.add(
      'billing-health-scan',
      { ts: Date.now() },
      { jobId: `billing-health-scan_${windowKey}` }
    );
    appLogger.info(
      { job: 'billingHealthScan', intervalMinutes: INTERVAL_MINUTES },
      'billingHealthScan: enqueued to billing queue'
    );
  },
});

/**
 * Jalankan satu siklus pemindaian kesehatan billing.
 * Diekspor untuk backward compatibility dengan billing.worker.ts
 */
export async function runBillingHealthScanCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('billingHealthScan');
}
