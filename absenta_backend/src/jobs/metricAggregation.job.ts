import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'metricAggregation',
  schedule: '45 2 * * *', // jam 02:45 setiap hari
  envFlag: 'METRIC_AGGREGATION_ENABLED',
  async run() {
    const { getAnalyticsQueue } = await import('../queues/analytics.queue');
    const q = getAnalyticsQueue();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await q.add(
      'metric-aggregation',
      { ts: Date.now() },
      { jobId: `metric-aggregation_${today}` }
    );
    appLogger.info({ job: 'metricAggregation' }, 'metricAggregation: enqueued to analytics queue');
  },
});

/**
 * Jalankan satu siklus agregasi metrik.
 * Diekspor untuk backward compatibility dengan analytics.worker.ts
 */
export async function runMetricAggregationCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('metricAggregation');
}
