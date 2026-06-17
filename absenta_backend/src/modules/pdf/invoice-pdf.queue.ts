import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { PdfInvoiceService } from './services/pdf-invoice.service';
import { SystemDataScope } from '../../types/SystemDataScope';
import { getRedisConnection } from '../../queue/redis';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { getSmartApiBaseUrl } from '@/utils/url-helper';
import { appendLog } from '@/utils/logger';

export const INVOICE_PDF_QUEUE_NAME = 'invoice-pdf';

export type InvoicePdfJobData = {
  invoiceId: string;
  tenantId: string;
  publicBaseUrl: string;
};

let queue: Queue<InvoicePdfJobData> | null = null;
let queueEvents: QueueEvents | null = null;
let worker: Worker<InvoicePdfJobData> | null = null;
let domainConsumerStarted = false;

export const getInvoicePdfQueue = (): Queue<InvoicePdfJobData> => {
  if (queue) return queue;
  queue = new Queue<InvoicePdfJobData>(INVOICE_PDF_QUEUE_NAME, { connection: getRedisConnection() });
  return queue;
};

export const getInvoicePdfQueueEvents = (): QueueEvents => {
  if (queueEvents) return queueEvents;
  queueEvents = new QueueEvents(INVOICE_PDF_QUEUE_NAME, { connection: getRedisConnection() });
  return queueEvents;
};

export const initInvoicePdfWorker = (): void => {
  if (worker) return;
  const concurrency = (() => {
    const raw = parseInt(String(process.env.PDF_WORKER_CONCURRENCY || '').trim() || '');
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  })();
  
  appendLog({ type: 'pdf_worker', action: 'init', concurrency });
  
  worker = new Worker<InvoicePdfJobData>(
    INVOICE_PDF_QUEUE_NAME,
    async (job) => {
      const systemScope: SystemDataScope = {
        mode: 'SYSTEM',
        tenantId: job.data.tenantId,
        reason: 'invoice pdf generation worker'
      };
      // Log scope usage
      void systemScope; 
      
      const svc = new PdfInvoiceService();
      console.log(`[invoice-pdf.worker] Starting generation for invoice: ${job.data.invoiceId}`);
      const result = await svc.generateAndStoreInvoicePdf({
        invoiceId: job.data.invoiceId,
        tenantId: job.data.tenantId,
        publicBaseUrl: job.data.publicBaseUrl,
      });
      console.log(`[invoice-pdf.worker] Completed generation for invoice: ${job.data.invoiceId}`);
      return result;
    },
    { connection: getRedisConnection(), concurrency }
  );
  worker.on('failed', (job, err) => {
    appendLog({ type: 'pdf_worker', action: 'failed', jobId: job?.id, invoiceId: job?.data?.invoiceId, error: err?.message || String(err) });
  });
  worker.on('error', (err) => {
    appendLog({ type: 'pdf_worker', action: 'error', error: err?.message || String(err) });
  });
};

export const initInvoicePdfDomainConsumer = async (): Promise<void> => {
  if (domainConsumerStarted) return;
  domainConsumerStarted = true;

  const conn = getRedisConnection();
  const sub = conn.duplicate();
  await sub.subscribe(DOMAIN_EVENT_CHANNEL);

  sub.on('message', async (_channel: string, message: string) => {
    let evt: DomainEvent<any> | null = null;
    try {
      evt = JSON.parse(message);
    } catch {
      evt = null;
    }
    if (!evt || !evt.event_id || !evt.event_type) return;
    if (String(evt.event_type) !== 'invoice.pdf.requested') {
      // Optional: log other events if needed for debugging
      return;
    }
    
    appendLog({ type: 'pdf_consumer', action: 'receive_event', eventId: evt.event_id, invoiceId: evt.payload?.invoice_id });
    
    const idempotencyKey = String(
      (evt.metadata as any)?.idempotency_key ||
        (evt.metadata as any)?.idempotencyKey ||
        evt.event_id,
    );

    try {
      const key = `domain-event:processed:invoice-pdf:${idempotencyKey}`;
      const ok = await (conn as any).set(key, '1', 'EX', 60, 'NX'); 
      if (!ok) {
        appendLog({ type: 'pdf_consumer', action: 'skip_idempotent', idempotencyKey });
        return;
      }
    } catch (err: any) {
      appendLog({ type: 'pdf_consumer', action: 'idempotency_error', error: err?.message });
      return;
    }

    const p = (evt.payload || {}) as any;
    const invoiceId = String(p.invoice_id || p.invoiceId || '').trim();
    const tenantId = String(evt.tenant_id || p.tenant_id || p.tenantId || '').trim();
    const publicBaseUrl = String(p.public_base_url || p.publicBaseUrl || getSmartApiBaseUrl()).trim();
    
    appendLog({ type: 'pdf_consumer', action: 'validate_payload', invoiceId, tenantId });
    
    if (!invoiceId || !tenantId) {
      appendLog({ type: 'pdf_consumer', action: 'invalid_payload', invoiceId, tenantId });
      return;
    }

    try {
      appendLog({ type: 'pdf_consumer', action: 'enqueue_job', invoiceId });
      await enqueueInvoicePdfGeneration({ invoiceId, tenantId, publicBaseUrl }, { priority: 2 });
      appendLog({ type: 'pdf_consumer', action: 'enqueue_success', invoiceId });
    } catch (err: any) {
      appendLog({ type: 'pdf_consumer', action: 'enqueue_failed', invoiceId, error: err?.message });
    }
  });
};

export const enqueueInvoicePdfGeneration = async (
  data: InvoicePdfJobData,
  options?: { priority?: number }
): Promise<Job<InvoicePdfJobData>> => {
  const q = getInvoicePdfQueue();
  return await q.add('generate', data, {
    jobId: `invoice_${data.invoiceId}_${Date.now()}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
    priority: options?.priority,
  });
};

export const waitForInvoicePdfJobResult = async <T = any>(
  job: Job<InvoicePdfJobData>,
  timeoutMs: number
): Promise<T> => {
  const events = getInvoicePdfQueueEvents();
  return (await job.waitUntilFinished(events, timeoutMs)) as T;
};

export const closeInvoicePdfQueue = async (): Promise<void> => {
  try {
    if (worker) {
      await worker.close();
      worker = null;
    }
  } catch {}
  try {
    if (queueEvents) {
      await queueEvents.close();
      queueEvents = null;
    }
  } catch {}
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};
