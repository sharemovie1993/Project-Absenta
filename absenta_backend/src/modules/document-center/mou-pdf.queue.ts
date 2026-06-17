import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { DocumentsService } from './services/documents.service';
import { SystemDataScope } from '../../types/SystemDataScope';
import { getRedisConnection } from '../../queue/redis';

export const MOU_PDF_QUEUE_NAME = 'mou-pdf';

export type MouPdfJobData = {
  tenantId: string;
  actorUserId: string | null | undefined;
  title?: string | null | undefined;
  description?: string | null | undefined;
  tanggal?: string | null | undefined;
  nomor?: string | null | undefined;
  pihak_kedua_nama?: string | null | undefined;
  pihak_kedua_alamat?: string | null | undefined;
};

let queue: any = null;
let queueEvents: any = null;
let worker: any = null;

export const getMouPdfQueue = (): Queue<MouPdfJobData> => {
  if (queue) return queue as Queue<MouPdfJobData>;
  queue = new Queue<MouPdfJobData>(MOU_PDF_QUEUE_NAME, { connection: getRedisConnection() as any });
  return queue as Queue<MouPdfJobData>;
};

export const getMouPdfQueueEvents = (): QueueEvents => {
  if (queueEvents) return queueEvents as QueueEvents;
  queueEvents = new QueueEvents(MOU_PDF_QUEUE_NAME, { connection: getRedisConnection() as any });
  return queueEvents as QueueEvents;
};

export const initMouPdfWorker = (): void => {
  if (worker) return;
  const concurrency = (() => {
    const raw = parseInt(String(process.env.PDF_WORKER_CONCURRENCY || '').trim() || '');
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  })();
  worker = new Worker<MouPdfJobData>(
    MOU_PDF_QUEUE_NAME,
    async (job) => {
      const systemScope: SystemDataScope = {
        mode: 'SYSTEM',
        tenantId: job.data.tenantId,
        reason: 'mou pdf generation worker'
      };
      // Log scope usage
      void systemScope;
      
      const svc = new DocumentsService();
      return await svc.generateMouPdfDocument({
        tenantId: job.data.tenantId,
        isSuperAdmin: true,
        actorUserId: job.data.actorUserId,
        title: job.data.title,
        description: job.data.description,
        tanggal: job.data.tanggal,
        nomor: job.data.nomor,
        pihak_kedua_nama: job.data.pihak_kedua_nama,
        pihak_kedua_alamat: job.data.pihak_kedua_alamat,
      });
    },
    { connection: getRedisConnection() as any, concurrency }
  );

  worker.on('failed', (_job: any, err: any) => {
    console.error(`[MouPdfWorker] Job ${_job?.id} failed with ${err.message}`);
  });

  worker.on('error', (err: any) => {
    console.error('[MouPdfWorker] Connection error:', err);
  });
};

export const enqueueMouPdfGeneration = async (
  data: MouPdfJobData,
  options?: { priority?: number }
): Promise<Job<MouPdfJobData>> => {
  const q = getMouPdfQueue();
  const tenantSegment = String(data.tenantId || 'global').trim();
  return await q.add('generate', data, {
    jobId: `mou_${tenantSegment}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
    priority: options?.priority,
  });
};

export const waitForMouPdfJobResult = async <T = any>(job: Job<MouPdfJobData>, timeoutMs: number): Promise<T> => {
  const events = getMouPdfQueueEvents();
  return (await job.waitUntilFinished(events, timeoutMs)) as T;
};

export const closeMouPdfQueue = async (): Promise<void> => {
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
