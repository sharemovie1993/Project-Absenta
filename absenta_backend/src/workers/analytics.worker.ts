import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { ANALYTICS_QUEUE_NAME } from '../queues/analytics.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';

let worker: Worker<any> | null = null;

async function processJob(job: Job) {
  await markJobStart(ANALYTICS_QUEUE_NAME);
  const startTime = Date.now();
  const name = String(job.name);
  
  try {
    if (name === 'tenant-risk') {
      const { runTenantRiskCycle } = await import('../jobs/tenantRisk.job');
      await runTenantRiskCycle();
    } else if (name === 'metric-aggregation') {
      const { runMetricAggregationCycle } = await import('../jobs/metricAggregation.job');
      await runMetricAggregationCycle();
    } else if (name === 'revenue-aggregation') {
      const { runRevenueAggregationCycle } = await import('../jobs/revenueAggregation.job');
      await runRevenueAggregationCycle();
    } else if (name === 'revenue-forecast') {
      const { runRevenueForecastCycle } = await import('../jobs/revenueForecast.job');
      await runRevenueForecastCycle();
    } else if (name === 'upgrade-intelligence') {
      const { runUpgradeIntelligenceCycle } = await import('../jobs/upgradeIntelligence.job');
      await runUpgradeIntelligenceCycle();
    }
    await markJobEnd(ANALYTICS_QUEUE_NAME, Date.now() - startTime);
  } catch (error) {
    console.error(`[analytics-worker] job_type=${name} error=${String(error)}`);
    await markJobEnd(ANALYTICS_QUEUE_NAME, Date.now() - startTime);
    throw error;
  }
}

async function start() {
  if (worker) return;
  const conn = getRedisConnection();
  startWorkerHeartbeat(conn as any, 'absenta-analytics-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'analytics', 5000, { concurrency: 2, version: process.env.APP_VERSION });

  void registerQueue(ANALYTICS_QUEUE_NAME, 2);

  worker = new Worker(ANALYTICS_QUEUE_NAME, processJob, {
    connection: conn,
    concurrency: 2,
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = { worker: 'analytics-worker', status: 'UP', queues: 1 };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    });
    server.listen(portRaw, '0.0.0.0');
  }
}

void start();
