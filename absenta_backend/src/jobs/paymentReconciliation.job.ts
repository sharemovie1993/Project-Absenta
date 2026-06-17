import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'paymentReconciliation',
  schedule: '*/5 * * * *', // setiap 5 menit
  lockTtlSeconds: 270, // 4.5 menit
  async run() {
    const { getBillingQueue } = await import('../queues/billing.queue');
    const q = getBillingQueue();
    const windowKey = Math.floor(Date.now() / (5 * 60 * 1000));
    await q.add(
      'payment-reconciliation',
      { ts: Date.now() },
      { jobId: `payment-reconciliation_${windowKey}` }
    );
    appLogger.info({ job: 'paymentReconciliation' }, 'paymentReconciliation: enqueued to billing queue');
  },
});

/**
 * Jalankan satu siklus rekonsiliasi pembayaran.
 * Diekspor untuk backward compatibility dengan billing.worker.ts
 */
export async function runPaymentReconciliationCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('paymentReconciliation');
}
