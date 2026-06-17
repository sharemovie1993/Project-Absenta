import { Worker, type Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

import { getEmailQueue, closeEmailQueue, EMAIL_QUEUE_NAME } from '../../src/queue/email.queue';
import { getRecurringQueue, closeRecurringQueue, RECURRING_QUEUE_NAME } from '../../src/queues/recurring.queue';
import { getRedisConnection, closeRedisConnection } from '../../src/queue/redis';
import { EmailService } from '../../src/modules/notification/services/email.service';
import { startRecurringWorker, stopRecurringWorker } from '../../src/workers/recurring.worker';

type QueueRunResult = {
  queue_name: string;
  jobs_enqueued: number;
  jobs_completed: number;
  jobs_failed: number;
  retry_jobs: number;
  avg_job_time_ms: number | null;
  p95_job_time_ms: number | null;
  throughput_jobs_per_sec: number | null;
  duration_ms: number;
  worker_rss_mb: number;
  redis_connected_clients: number | null;
};

function toMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

async function getRedisConnectedClients(): Promise<number | null> {
  try {
    const redis = getRedisConnection();
    const raw = await redis.info('clients');
    const match = String(raw)
      .split('\n')
      .map((s) => s.trim())
      .find((s) => s.startsWith('connected_clients:'));
    if (!match) return null;
    const n = Number.parseInt(match.split(':')[1] || '', 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function waitUntilSettled(queueName: string, expected: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  for (;;) {
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) throw new Error(`${queueName}: timeout waiting for jobs settle`);
    await new Promise((r) => setTimeout(r, 200));
    const counts =
      queueName === EMAIL_QUEUE_NAME ? await getEmailQueue().getJobCounts('completed', 'failed', 'active', 'waiting') : await getRecurringQueue().getJobCounts('completed', 'failed', 'active', 'waiting');
    const done = (counts.completed || 0) + (counts.failed || 0);
    if (done >= expected) return;
  }
}

async function runRecurringBenchmark(prisma: PrismaClient, jobCount: number): Promise<QueueRunResult> {
  const queue = getRecurringQueue();

  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', auto_renew: true },
    select: { id: true, tenant_id: true },
    take: jobCount,
    orderBy: { created_at: 'asc' as any },
  });

  const jobsToEnqueue = subs.slice(0, jobCount);
  const startedAt = Date.now();
  const redisClientsBefore = await getRedisConnectedClients();

  for (const s of jobsToEnqueue) {
    await queue.add(
      'PROCESS_DUE_SUBSCRIPTION',
      { subscriptionId: s.id, tenantId: s.tenant_id, correlationId: `phase5a-queue-${startedAt}` },
      { jobId: `phase5a-queue-due-${s.id}-${startedAt}` }
    );
  }

  await startRecurringWorker();
  await waitUntilSettled(RECURRING_QUEUE_NAME, jobsToEnqueue.length, 10 * 60 * 1000);

  const durationMs = Date.now() - startedAt;
  const completedJobs: Job[] = [];
  const failedJobs: Job[] = [];

  const completed = await queue.getJobs(['completed'], 0, jobsToEnqueue.length - 1, true);
  const failed = await queue.getJobs(['failed'], 0, jobsToEnqueue.length - 1, true);
  completedJobs.push(...completed.filter((j) => String(j.id).startsWith('phase5a-queue-due-')));
  failedJobs.push(...failed.filter((j) => String(j.id).startsWith('phase5a-queue-due-')));

  const durations: number[] = [];
  let retryJobs = 0;
  for (const j of [...completedJobs, ...failedJobs]) {
    const processedOn = typeof (j as any).processedOn === 'number' ? Number((j as any).processedOn) : null;
    const finishedOn = typeof (j as any).finishedOn === 'number' ? Number((j as any).finishedOn) : null;
    if (processedOn && finishedOn && finishedOn >= processedOn) durations.push(finishedOn - processedOn);
    if (typeof j.attemptsMade === 'number' && j.attemptsMade > 0) retryJobs += 1;
  }

  const workerMem = process.memoryUsage();
  const redisClientsAfter = await getRedisConnectedClients();

  return {
    queue_name: RECURRING_QUEUE_NAME,
    jobs_enqueued: jobsToEnqueue.length,
    jobs_completed: completedJobs.length,
    jobs_failed: failedJobs.length,
    retry_jobs: retryJobs,
    avg_job_time_ms: avg(durations),
    p95_job_time_ms: percentile(durations, 95),
    throughput_jobs_per_sec: durationMs > 0 ? Math.round((jobsToEnqueue.length / (durationMs / 1000)) * 100) / 100 : null,
    duration_ms: durationMs,
    worker_rss_mb: toMb(workerMem.rss),
    redis_connected_clients: redisClientsAfter ?? redisClientsBefore,
  };
}

async function runEmailBenchmark(jobCount: number): Promise<QueueRunResult> {
  const queue = getEmailQueue();

  const startedAt = Date.now();
  const redisClientsBefore = await getRedisConnectedClients();

  for (let i = 0; i < jobCount; i += 1) {
    await queue.add(
      'SEND_EMAIL',
      {
        to: `phase5a.sim.${i}@example.local`,
        subject: `Phase5A Email Throughput ${i}`,
        html: `<p>PHASE5A_SIM ${i}</p>`,
        event: 'PHASE5A_SIM',
        relatedId: `phase5a-sim-email-${startedAt}-${i}`,
        tenantId: null,
        correlationId: `phase5a-email-${startedAt}`,
      } as any,
      { jobId: `phase5a-email-${startedAt}-${i}` }
    );
  }

  const worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== 'SEND_EMAIL') throw new Error(`Unsupported job name: ${job.name}`);
      const svc = new EmailService();
      await svc.sendEmail(job.data as any);
    },
    { connection: getRedisConnection() }
  );

  try {
    await waitUntilSettled(EMAIL_QUEUE_NAME, jobCount, 5 * 60 * 1000);
  } finally {
    await worker.close();
  }

  const durationMs = Date.now() - startedAt;
  const completed = await queue.getJobs(['completed'], 0, jobCount - 1, true);
  const failed = await queue.getJobs(['failed'], 0, jobCount - 1, true);

  const completedJobs = completed.filter((j) => String(j.id).startsWith(`phase5a-email-${startedAt}-`));
  const failedJobs = failed.filter((j) => String(j.id).startsWith(`phase5a-email-${startedAt}-`));

  const durations: number[] = [];
  let retryJobs = 0;
  for (const j of [...completedJobs, ...failedJobs]) {
    const processedOn = typeof (j as any).processedOn === 'number' ? Number((j as any).processedOn) : null;
    const finishedOn = typeof (j as any).finishedOn === 'number' ? Number((j as any).finishedOn) : null;
    if (processedOn && finishedOn && finishedOn >= processedOn) durations.push(finishedOn - processedOn);
    if (typeof j.attemptsMade === 'number' && j.attemptsMade > 0) retryJobs += 1;
  }

  const workerMem = process.memoryUsage();
  const redisClientsAfter = await getRedisConnectedClients();

  return {
    queue_name: EMAIL_QUEUE_NAME,
    jobs_enqueued: jobCount,
    jobs_completed: completedJobs.length,
    jobs_failed: failedJobs.length,
    retry_jobs: retryJobs,
    avg_job_time_ms: avg(durations),
    p95_job_time_ms: percentile(durations, 95),
    throughput_jobs_per_sec: durationMs > 0 ? Math.round((jobCount / (durationMs / 1000)) * 100) / 100 : null,
    duration_ms: durationMs,
    worker_rss_mb: toMb(workerMem.rss),
    redis_connected_clients: redisClientsAfter ?? redisClientsBefore,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const recurringJobs = Number.parseInt(String(process.env.RECURRING_JOBS ?? '200'), 10) || 200;
  const emailJobs = Number.parseInt(String(process.env.EMAIL_JOBS ?? '10'), 10) || 10;

  try {
    await prisma.$connect();
    const recurring = await runRecurringBenchmark(prisma, recurringJobs);
    const email = await runEmailBenchmark(emailJobs);
    process.stdout.write(JSON.stringify({ recurring, email }, null, 2) + '\n');
  } finally {
    await stopRecurringWorker();
    await closeEmailQueue();
    await closeRecurringQueue();
    await closeRedisConnection();
    await prisma.$disconnect();
  }
}

void main();
