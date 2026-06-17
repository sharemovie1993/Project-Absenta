import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { MAINTENANCE_QUEUE_NAME } from '../queues/maintenance.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { initMouPdfWorker } from '../modules/document-center/mou-pdf.queue';
import { startRestoreWorker } from '../modules/backup/restore.worker';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';

let worker: Worker<any> | null = null;

async function processJob(job: Job) {
  await markJobStart(MAINTENANCE_QUEUE_NAME);
  const startTime = Date.now();
  const name = String(job.name);
  
  try {
    if (name === 'log-retention') {
      const { runLogRetentionCycle } = await import('../jobs/logRetention.job');
      await runLogRetentionCycle();
    } else if (name === 'failed-job-cleanup') {
      const { scheduleFailedJobCleanup } = await import('../jobs/failedJobCleanup.job');
      await scheduleFailedJobCleanup();
    } else if (name === 'diag-cpu-burn') {
      const ms = typeof (job.data as any)?.ms === 'number' ? (job.data as any).ms : 3000;
      const end = Date.now() + Math.max(100, Math.min(ms, 60000));
      let x = 0;
      while (Date.now() < end) {
        x ^= Math.floor(Math.random() * 1000000);
        if (x > 1000000000) x = 0;
      }
    } else if (name === 'mou-pdf-generation') {
      // handled by mou-pdf queue worker
    } else if (name === 'restore-job') {
      // handled by restore worker
    }
    await markJobEnd(MAINTENANCE_QUEUE_NAME, Date.now() - startTime);
  } catch (error) {
    console.error(`[maintenance-worker] job_type=${name} error=${String(error)}`);
    await markJobEnd(MAINTENANCE_QUEUE_NAME, Date.now() - startTime);
    throw error;
  }
}

async function start() {
  if (worker) return;
  const conn = getRedisConnection();
  startWorkerHeartbeat(conn as any, 'absenta-maintenance-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'maintenance', 5000, { concurrency: 2, version: process.env.APP_VERSION });

  void registerQueue(MAINTENANCE_QUEUE_NAME, 2);

  initMouPdfWorker();
  startRestoreWorker();

  worker = new Worker(MAINTENANCE_QUEUE_NAME, processJob, {
    connection: conn,
    concurrency: 2,
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = { worker: 'maintenance-worker', status: 'UP', queues: 4 };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    });
    server.listen(portRaw, '0.0.0.0');
  }
}

void start();
