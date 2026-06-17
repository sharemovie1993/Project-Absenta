import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { INFRA_QUEUE_NAME } from '../queues/infra.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { startAutoHealScheduler } from '../infra/autoHealScheduler';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';

let worker: Worker<any> | null = null;

async function processJob(job: Job) {
  await markJobStart(INFRA_QUEUE_NAME);
  const startTime = Date.now();
  const name = String(job.name);
  
  try {
    if (name === 'autoheal-watchdog') {
      startAutoHealScheduler();
    } else if (name === 'worker-health-scan') {
      // no-op placeholder for future richer scan
    } else if (name === 'node-monitor') {
      // heartbeat handled by registry already
    }
    await markJobEnd(INFRA_QUEUE_NAME, Date.now() - startTime);
  } catch (error) {
    console.error(`[infra-worker] job_type=${name} error=${String(error)}`);
    await markJobEnd(INFRA_QUEUE_NAME, Date.now() - startTime);
    throw error;
  }
}

async function start() {
  if (worker) return;
  const conn = getRedisConnection();
  startWorkerHeartbeat(conn as any, 'absenta-infra-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'infra', 5000, { concurrency: 1, version: process.env.APP_VERSION });

  void registerQueue(INFRA_QUEUE_NAME, 1);

  worker = new Worker(INFRA_QUEUE_NAME, processJob, {
    connection: conn,
    concurrency: 1,
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = { worker: 'infra-worker', status: 'UP', queues: 1 };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    });
    server.listen(portRaw, '0.0.0.0');
  }
}

void start();
