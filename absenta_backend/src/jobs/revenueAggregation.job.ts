import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'revenueAggregation',
  schedule: '0 2 1 * *', // jam 02:00 tanggal 1 setiap bulan
  envFlag: 'REVENUE_AGGREGATION_ENABLED',
  async run() {
    const { getAnalyticsQueue } = await import('../queues/analytics.queue');
    const q = getAnalyticsQueue();
    const month = new Date().toISOString().slice(0, 7).replace(/-/g, '');
    await q.add(
      'revenue-aggregation',
      { ts: Date.now() },
      { jobId: `revenue-aggregation_${month}` }
    );
    appLogger.info({ job: 'revenueAggregation' }, 'revenueAggregation: enqueued to analytics queue');
  },
});

/**
 * Jalankan satu siklus agregasi pendapatan.
 * Diekspor untuk backward compatibility dengan analytics.worker.ts
 */
export async function runRevenueAggregationCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('revenueAggregation');
}
