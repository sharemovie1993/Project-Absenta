import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { RECURRING_QUEUE_NAME } from '../queues/recurring.queue';
import type { RecurringJobData } from '../queues/recurring.queue';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';
import { observabilityAggregationService } from '../modules/observability/services/observabilityAggregation.service';
import { ObservabilityMetricType } from '@prisma/client';
import {
  processDueSubscription,
  processInvoiceOverdue,
  processInvoiceSuspension,
  processTrialEnd,
} from '../jobs/recurringBilling.job';
import { startWorkerHeartbeat, startWorkerRegistryAndHeartbeat } from '../infra/workerHeartbeat';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';

let worker: Worker<RecurringJobData> | null = null;

export async function startRecurringWorker(): Promise<void> {
  if (worker) return;

  void registerQueue(RECURRING_QUEUE_NAME, 3);

  worker = new Worker<RecurringJobData>(
    RECURRING_QUEUE_NAME,
    async (job: Job<RecurringJobData>) => {
      await markJobStart(RECURRING_QUEUE_NAME);
      const startTime = Date.now();
      const id = (job.data as any)?.subscriptionId || (job.data as any)?.invoiceId || '';
      const correlationId = (job.data as any)?.correlationId ? String((job.data as any).correlationId) : undefined;
      appLogger.info({ job_id: String(job.id), job_type: String(job.name), ref_id: String(id) }, 'recurring.worker.processing');

      try {
        let result;
        switch (job.name) {
          case 'PROCESS_DUE_SUBSCRIPTION':
            result = await processDueSubscription((job.data as any).subscriptionId, correlationId);
            break;
          case 'PROCESS_TRIAL_END':
            result = await processTrialEnd((job.data as any).subscriptionId, correlationId);
            break;
          case 'PROCESS_INVOICE_OVERDUE':
            result = await processInvoiceOverdue((job.data as any).invoiceId, correlationId);
            break;
          case 'PROCESS_INVOICE_SUSPENSION':
            result = await processInvoiceSuspension((job.data as any).invoiceId, correlationId);
            break;
          default:
            throw new Error(`Unsupported job name: ${job.name}`);
        }
        await markJobEnd(RECURRING_QUEUE_NAME, Date.now() - startTime);
        return result;
      } catch (error) {
        await markJobEnd(RECURRING_QUEUE_NAME, Date.now() - startTime);
        throw error;
      }
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );

  worker.on('active', (job) => {
    const tenantId = (job.data as any)?.tenantId ? String((job.data as any).tenantId) : null;
    const correlationId = (job.data as any)?.correlationId ? String((job.data as any).correlationId) : null;
    observabilityService.logQueueStart({
      queue_name: RECURRING_QUEUE_NAME,
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
      queue_name: RECURRING_QUEUE_NAME,
      job_id: String(job.id),
      job_type: String(job.name),
      attempt: typeof job.attemptsMade === 'number' ? job.attemptsMade + 1 : null,
      duration_ms: durationMs,
      tenant_id: tenantId,
      correlation_id: correlationId,
    });
    void observabilityAggregationService.incrementMetric(ObservabilityMetricType.QUEUE_JOB_SUCCESS, tenantId);
    appLogger.info({ job_id: String(job.id), job_type: String(job.name), duration_ms: durationMs }, 'recurring.worker.completed');
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
        queue_name: RECURRING_QUEUE_NAME,
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
    appLogger.error(
      { err, job_id: job?.id ? String(job.id) : null, job_type: job?.name ? String(job.name) : null },
      'recurring.worker.failed'
    );
  });
  worker.on('error', (err) => {
    appLogger.error({ err }, 'recurring.worker.error');
  });
  startWorkerHeartbeat(getRedisConnection(), 'absenta-recurring-worker', 10000);
  startWorkerRegistryAndHeartbeat(getRedisConnection(), 'recurring', 10000, {
    concurrency: 3,
    version: process.env.WORKER_VERSION || process.env.APP_VERSION,
  });
}

export async function stopRecurringWorker(): Promise<void> {
  try {
    if (worker) {
      await worker.close();
      worker = null;
    }
  } catch {}
}
