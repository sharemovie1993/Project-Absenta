import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '@/queue/redis';
import { EMAIL_QUEUE_NAME } from '@/queue/email.queue';
import { EmailService } from './services/email.service';
import { startWorkerRegistryAndHeartbeat } from '@/infra/workerHeartbeat';
import { appLogger } from '@/utils/app-logger';

let worker: Worker | null = null;

/**
 * Inisialisasi Email Worker untuk memproses antrian pengiriman email.
 * Worker ini akan mengambil tugas dari 'email-queue' dan mengeksekusinya menggunakan EmailService.
 */
export const initEmailWorker = () => {
  if (worker) return;

  appLogger.info({}, 'email_worker.initializing');

  const connection: any = getRedisConnection();
  
  // Register heartbeat & registry for monitoring
  try {
    startWorkerRegistryAndHeartbeat(connection as any, 'email', 10000, {
      concurrency: 2,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });
  } catch (err) {
    appLogger.error({ error: (err as any)?.message }, 'email_worker.heartbeat_error');
  }

  const emailService = new EmailService();

  worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== 'SEND_EMAIL') return;

      const tenantId = String(job.data?.tenantId || job.data?.tenant_id || 'system');
      const startedAt = Date.now();

      appLogger.info({ jobId: job.id, tenant_id: tenantId }, 'email_worker.job_processing');

      try {
        await emailService.sendEmail(job.data);
        const duration = Date.now() - startedAt;
        appLogger.info({ jobId: job.id, duration_ms: duration }, 'email_worker.job_completed');
      } catch (error) {
        appLogger.error({ jobId: job.id, error: (error as any)?.message }, 'email_worker.job_failed');
        throw error; // Biarkan BullMQ menangani retry sesuai konfigurasi antrian
      }
    },
    {
      connection,
      concurrency: 2, // Memproses 2 email sekaligus secara paralel
      limiter: {
        max: 10,
        duration: 1000, // Batasi 10 email per detik untuk menghindari rate limit provider
      },
    }
  );

  worker.on('failed', (job, err) => {
    appLogger.error({ jobId: job?.id, error: err.message }, 'email_worker.job_failed');
  });

  appLogger.info({}, 'email_worker.started');
};

/**
 * Menutup koneksi Email Worker secara anggun.
 */
export const closeEmailWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
    appLogger.info({}, 'email_worker.stopped');
  }
};
