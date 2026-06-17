import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { BILLING_QUEUE_NAME } from '../queues/billing.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { initInvoicePdfDomainConsumer, initInvoicePdfWorker } from '../modules/pdf/invoice-pdf.queue';
import { initInvoiceEventConsumer } from '../modules/invoice/services/event-handlers/invoice-event-consumer';
import { initBillingPaymentEventConsumer } from '../modules/billing/services/event-handlers/payment-succeeded.consumer';
import { initBillingTenantCreatedConsumer } from '../modules/billing/services/event-handlers/tenant-created.consumer';
import { initAcademicTenantCreatedConsumer } from '../modules/academic/services/event-handlers/tenant-created.consumer';
import { initKesiswaanTenantCreatedConsumer } from '../modules/kesiswaan/services/event-handlers/tenant-created.consumer';
import { getBillingDlqQueue } from '../queues/billing.queue';
import { startRecurringWorker } from './recurring.worker';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';
import { resolveWorkerConcurrency } from '../infra/auto-tune';

let worker: Worker<any> | null = null;

async function processJob(job: Job) {
  await markJobStart(BILLING_QUEUE_NAME);
  const startTime = Date.now();
  const name = String(job.name);
  const tenantId = String((job.data as any)?.tenant_id || (job.data as any)?.tenantId || '');
  const correlationId = String((job.data as any)?.correlation_id || (job.data as any)?.correlationId || '');
  const startedAt = Date.now();
  console.log(`[billing-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=billing-worker job_id=${String(job.id || '')} retry_count=${job.attemptsMade || 0}`);

  try {
    if (name === 'payment-reconciliation') {
      const { runPaymentReconciliationCycle } = await import('../jobs/paymentReconciliation.job');
      await runPaymentReconciliationCycle();
    } else if (name === 'trial-expiration') {
      const { runTrialExpirationCycle } = await import('../jobs/trialExpiration.job');
      await runTrialExpirationCycle();
    } else if (name === 'recurring-billing') {
      const { runRecurringBillingCycle } = await import('../jobs/recurringBilling.job');
      await runRecurringBillingCycle();
    } else if (name === 'billing-health-scan') {
      const { runBillingHealthScanCycle } = await import('../jobs/billingHealthScan.job');
      await runBillingHealthScanCycle();
    } else if (name === 'invoice-pdf-generation') {
      await markJobEnd(BILLING_QUEUE_NAME, Date.now() - startTime);
      return;
    }
    const durationMs = Date.now() - startedAt;
    console.log(`[billing-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=billing-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')}`);
    await markJobEnd(BILLING_QUEUE_NAME, Date.now() - startTime);
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    console.error(`[billing-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=billing-worker job_id=${String(job.id || '')} error=${String(err?.message || err || '')}`);
    console.error(`[billing-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=billing-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')} status=FAILED`);
    await markJobEnd(BILLING_QUEUE_NAME, Date.now() - startTime);
    throw err;
  }
}

async function start() {
  if (worker) return;
  const conn = getRedisConnection();
  const concurrency = resolveWorkerConcurrency(3);
  startWorkerHeartbeat(conn as any, 'absenta-billing-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'billing', 5000, {
    concurrency,
    version: process.env.WORKER_VERSION || process.env.APP_VERSION,
  });

  void registerQueue(BILLING_QUEUE_NAME, concurrency);

  initInvoicePdfWorker();
  await initInvoicePdfDomainConsumer();
  await initInvoiceEventConsumer();
  await initBillingPaymentEventConsumer();
  await initBillingTenantCreatedConsumer();
  await initAcademicTenantCreatedConsumer();
  await initKesiswaanTenantCreatedConsumer();
  await startRecurringWorker();

  worker = new Worker(BILLING_QUEUE_NAME, processJob, {
    connection: conn,
    concurrency,
  });
  worker.on('failed', async (job: any, err: any) => {
    try {
      const maxAttempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : 1;
      const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : 0;
      if (attemptsMade < maxAttempts) return;
      const dlq = getBillingDlqQueue();
      await dlq.add(
        `dlq:${String(job?.name || 'unknown')}`,
        {
          queue_name: BILLING_QUEUE_NAME,
          worker_name: 'billing-worker',
          event_type: String(job?.name || ''),
          job_id: String(job?.id || ''),
          retry_count: attemptsMade,
          tenant_id: (job?.data as any)?.tenant_id || (job?.data as any)?.tenantId || null,
          correlation_id: (job?.data as any)?.correlation_id || (job?.data as any)?.correlationId || null,
          payload: job?.data || null,
          error_message: String(err?.message || err || ''),
          failed_at: new Date().toISOString(),
        },
        { jobId: `billing_dlq_${String(job?.id || '')}` },
      );
    } catch {}
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = {
        worker: 'billing-worker',
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
