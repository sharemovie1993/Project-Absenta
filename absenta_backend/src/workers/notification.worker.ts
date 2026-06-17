import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { NOTIFICATION_QUEUE_NAME_GENERAL } from '../queues/notification.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { initNotificationWorker } from '../modules/notification/notification.worker';
import { EMAIL_QUEUE_NAME } from '../queue/email.queue';
import { EmailService } from '../modules/notification/services/email.service';
import { getNotificationDlqQueue } from '../queues/notification.queue';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';
import { resolveWorkerConcurrency } from '../infra/auto-tune';

async function processNotification(job: Job) {
  await markJobStart(NOTIFICATION_QUEUE_NAME_GENERAL);
  const name = String(job.name);
  const tenantId = String((job.data as any)?.tenant_id || (job.data as any)?.tenantId || '');
  const correlationId = String((job.data as any)?.correlation_id || (job.data as any)?.correlationId || '');
  const startedAt = Date.now();
  console.log(`[notification-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker job_id=${String(job.id || '')} retry_count=${job.attemptsMade || 0}`);

  try {
    if (name === 'trial-notification') {
      const { runTrialNotificationCycle } = await import('../jobs/trialNotification.job');
      await runTrialNotificationCycle();
    } else if (name === 'attendance-digest') {
      const { runAttendanceDigestCycle } = await import('../jobs/attendanceDigest.job');
      await runAttendanceDigestCycle();
    }
    const durationMs = Date.now() - startedAt;
    console.log(`[notification-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')}`);
    await markJobEnd(NOTIFICATION_QUEUE_NAME_GENERAL, durationMs);
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    console.error(`[notification-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker job_id=${String(job.id || '')} error=${String(err?.message || err || '')}`);
    console.error(`[notification-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')} status=FAILED`);
    await markJobEnd(NOTIFICATION_QUEUE_NAME_GENERAL, durationMs);
    throw err;
  }
}

async function start() {
  const conn = getRedisConnection();
  const concurrency = resolveWorkerConcurrency(5);
  startWorkerHeartbeat(conn as any, 'absenta-notification-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'notification', 5000, { concurrency, version: process.env.APP_VERSION });

  initNotificationWorker(); // parent-notification queue
  void registerQueue(NOTIFICATION_QUEUE_NAME_GENERAL, concurrency);
  void registerQueue(EMAIL_QUEUE_NAME, 1);

  const wGeneral = new Worker(NOTIFICATION_QUEUE_NAME_GENERAL, processNotification, {
    connection: conn,
    concurrency,
  });
  wGeneral.on('failed', async (job: any, err: any) => {
    try {
      const maxAttempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : 1;
      const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : 0;
      if (attemptsMade < maxAttempts) return;
      const dlq = getNotificationDlqQueue();
      await dlq.add(
        `dlq:${String(job?.name || 'unknown')}`,
        {
          queue_name: NOTIFICATION_QUEUE_NAME_GENERAL,
          worker_name: 'notification-worker',
          event_type: String(job?.name || ''),
          job_id: String(job?.id || ''),
          retry_count: attemptsMade,
          tenant_id: (job?.data as any)?.tenant_id || (job?.data as any)?.tenantId || null,
          correlation_id: (job?.data as any)?.correlation_id || (job?.data as any)?.correlationId || null,
          payload: job?.data || null,
          error_message: String(err?.message || err || ''),
          failed_at: new Date().toISOString(),
        },
        { jobId: `notification_dlq_${String(job?.id || '')}` },
      );
    } catch {}
  });

  const wEmail = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== 'SEND_EMAIL') return;
      await markJobStart(EMAIL_QUEUE_NAME);
      const tenantId = String((job.data as any)?.tenantId || (job.data as any)?.tenant_id || '');
      const correlationId = String((job.data as any)?.correlationId || (job.data as any)?.correlation_id || '');
      const startedAt = Date.now();
      console.log(`[notification-worker] event_type=SEND_EMAIL tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker job_id=${String(job.id || '')} retry_count=${job.attemptsMade || 0}`);
      try {
        const svc = new EmailService();
        await svc.sendEmail(job.data);
        const durationMs = Date.now() - startedAt;
        console.log(`[notification-worker] event_type=SEND_EMAIL tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')}`);
        await markJobEnd(EMAIL_QUEUE_NAME, durationMs);
      } catch (err: any) {
        const durationMs = Date.now() - startedAt;
        console.error(`[notification-worker] event_type=SEND_EMAIL tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker job_id=${String(job.id || '')} error=${String(err?.message || err || '')}`);
        console.error(`[notification-worker] event_type=SEND_EMAIL tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')} status=FAILED`);
        await markJobEnd(EMAIL_QUEUE_NAME, durationMs);
        throw err;
      }
    },
    { connection: conn },
  );
  wEmail.on('failed', async (job: any, err: any) => {
    try {
      const maxAttempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : 1;
      const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : 0;
      if (attemptsMade < maxAttempts) return;
      const dlq = getNotificationDlqQueue();
      await dlq.add(
        `dlq:${String(job?.name || 'unknown')}`,
        {
          queue_name: EMAIL_QUEUE_NAME,
          worker_name: 'notification-worker',
          event_type: String(job?.name || ''),
          job_id: String(job?.id || ''),
          retry_count: attemptsMade,
          tenant_id: (job?.data as any)?.tenantId || (job?.data as any)?.tenant_id || null,
          correlation_id: (job?.data as any)?.correlationId || (job?.data as any)?.correlation_id || null,
          payload: job?.data || null,
          error_message: String(err?.message || err || ''),
          failed_at: new Date().toISOString(),
        },
        { jobId: `email_dlq_${String(job?.id || '')}` },
      );
    } catch {}
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = {
        worker: 'notification-worker',
        status: 'UP',
        queues: 3,
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    });
    server.listen(portRaw, '0.0.0.0');
  }
}

void start();
