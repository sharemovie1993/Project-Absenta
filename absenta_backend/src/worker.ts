import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { EmailService } from './modules/notification/services/email.service';
import type { EmailData } from './modules/notification/services/email.service';
import { EMAIL_QUEUE_NAME } from './queue/email.queue';
import { closeEmailQueue } from './queue/email.queue';
import { closeRedisConnection, getRedisConnection } from './queue/redis';
import { startRecurringWorker, stopRecurringWorker } from './workers/recurring.worker';
import { startRestoreWorker } from './modules/backup/restore.worker';
import { startTrialExpirationWorker, stopTrialExpirationWorker } from './workers/trial-expiration.worker';
import { appLogger } from './utils/app-logger';
import { observabilityService } from './modules/observability/services/observability.service';
import { observabilityAggregationService } from './modules/observability/services/observabilityAggregation.service';
import { ObservabilityMetricType } from '@prisma/client';
import { startWorkerHeartbeat, startWorkerRegistryAndHeartbeat } from './infra/workerHeartbeat';
import { startAttendanceWorker } from './workers/attendance.worker';
import { initInvoicePdfWorker, initInvoicePdfDomainConsumer } from './modules/pdf/invoice-pdf.queue';

let worker: Worker<EmailData> | null = null;
const workerRole = String(process.env.WORKER_ROLE || '').trim().toLowerCase();

async function startWorker(): Promise<void> {
  if (worker) return;

  if (workerRole !== 'recurring') {
    worker = new Worker<EmailData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailData>) => {
        if (job.name !== 'SEND_EMAIL') {
          throw new Error(`Unsupported job name: ${job.name}`);
        }
        const svc = new EmailService();
        await svc.sendEmail(job.data);
      },
      { connection: getRedisConnection() }
    );

    worker.on('active', (job) => {
      const tenantId = (job.data as any)?.tenantId ? String((job.data as any).tenantId) : null;
      const correlationId = (job.data as any)?.correlationId ? String((job.data as any).correlationId) : null;
      observabilityService.logQueueStart({
        queue_name: EMAIL_QUEUE_NAME,
        job_id: String(job.id),
        job_type: String(job.name),
        attempt: typeof job.attemptsMade === 'number' ? job.attemptsMade + 1 : null,
        tenant_id: tenantId,
        correlation_id: correlationId,
      });
    });

    worker.on('completed', (job) => {
      const tenantId = (job.data as any)?.tenantId ? String((job.data as any).tenantId) : null;
      const correlationId = (job.data as any)?.correlationId ? String((job.data as any).correlationId) : null;
      const durationMs =
        typeof (job as any).processedOn === 'number' && typeof (job as any).finishedOn === 'number'
          ? Number((job as any).finishedOn) - Number((job as any).processedOn)
          : null;
      observabilityService.logQueueComplete({
        queue_name: EMAIL_QUEUE_NAME,
        job_id: String(job.id),
        job_type: String(job.name),
        attempt: typeof job.attemptsMade === 'number' ? job.attemptsMade + 1 : null,
        duration_ms: durationMs,
        tenant_id: tenantId,
        correlation_id: correlationId,
      });
      void observabilityAggregationService.incrementMetric(ObservabilityMetricType.QUEUE_JOB_SUCCESS, tenantId);
      void observabilityAggregationService.incrementMetric(ObservabilityMetricType.EMAIL_SENT, tenantId);
      appLogger.info({ job_id: String(job.id), job_type: String(job.name), duration_ms: durationMs }, 'email.worker.completed');
    });
    worker.on('failed', (job, err) => {
      const tenantId = (job?.data as any)?.tenantId ? String((job?.data as any).tenantId) : null;
      const correlationId = (job?.data as any)?.correlationId ? String((job?.data as any).correlationId) : null;
      const durationMs =
        typeof (job as any)?.processedOn === 'number' && typeof (job as any)?.finishedOn === 'number'
          ? Number((job as any).finishedOn) - Number((job as any).processedOn)
          : null;
      if (job) {
        observabilityService.logQueueFail({
          queue_name: EMAIL_QUEUE_NAME,
          job_id: String(job.id),
          job_type: String(job.name),
          attempt: typeof job.attemptsMade === 'number' ? job.attemptsMade + 1 : null,
          duration_ms: durationMs,
          error_message: String(err?.message || err),
          tenant_id: tenantId,
          correlation_id: correlationId,
        });
      }
      void observabilityAggregationService.incrementMetric(ObservabilityMetricType.QUEUE_JOB_FAILED, tenantId);
      void observabilityAggregationService.incrementMetric(ObservabilityMetricType.EMAIL_FAILED, tenantId);
      appLogger.error(
        { err, job_id: job?.id ? String(job.id) : null, job_type: job?.name ? String(job.name) : null },
        'email.worker.failed'
      );
    });
    worker.on('error', (err) => {
      appLogger.error({ err }, 'email.worker.error');
    });
  }

  if (workerRole !== 'recurring') {
    startWorkerHeartbeat(getRedisConnection(), 'absenta-email-worker', 10000);
    startWorkerRegistryAndHeartbeat(getRedisConnection(), 'email', 10000, {
      concurrency: 1,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });
  }
  if (workerRole !== 'email') {
    await startRecurringWorker();
  }
  if (workerRole !== 'recurring') {
    startRestoreWorker();
    
    // Start Trial Expiration Worker
    startTrialExpirationWorker(getRedisConnection());
    startWorkerRegistryAndHeartbeat(getRedisConnection(), 'billing', 10000, {
      concurrency: 5,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });

    await startAttendanceWorker();

    // Start PDF Workers
    initInvoicePdfWorker();
    await initInvoicePdfDomainConsumer();
    startWorkerRegistryAndHeartbeat(getRedisConnection(), 'pdf', 10000, {
      concurrency: 1,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });

    // Hulu ke Hilir: Luruskan kabel untuk background workers utama di process dedicated worker
    await import('./workers/billing.worker');
    await import('./workers/analytics.worker');
    await import('./workers/infra.worker');
    await import('./workers/maintenance.worker');
  }
}

async function shutdown(signal: string): Promise<void> {
  appLogger.info({ signal }, 'email.worker.shutting_down');
  try {
    if (worker) {
      await worker.close();
      worker = null;
    }
  } catch {}
  await stopRecurringWorker();
  await stopTrialExpirationWorker();
  await closeEmailQueue();
  await closeRedisConnection();
  process.exit(0);
}

void startWorker().then(() => {
  appLogger.info('email.worker.started');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
