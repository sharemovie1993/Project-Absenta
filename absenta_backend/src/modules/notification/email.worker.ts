import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '@/queue/redis';
import { EMAIL_QUEUE_NAME } from '@/queue/email.queue';
import { EmailService } from './services/email.service';
import { startWorkerRegistryAndHeartbeat } from '@/infra/workerHeartbeat';

let worker: Worker | null = null;

/**
 * Inisialisasi Email Worker untuk memproses antrian pengiriman email.
 * Worker ini akan mengambil tugas dari 'email-queue' dan mengeksekusinya menggunakan EmailService.
 */
export const initEmailWorker = () => {
  if (worker) return;

  console.log('📧 Email Worker Initializing...');

  const connection: any = getRedisConnection();
  
  // Register heartbeat & registry for monitoring
  try {
    startWorkerRegistryAndHeartbeat(connection as any, 'email', 10000, {
      concurrency: 2,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });
  } catch (err) {
    console.error('Failed to start email worker registry heartbeat:', err);
  }

  const emailService = new EmailService();

  worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== 'SEND_EMAIL') return;

      const tenantId = String(job.data?.tenantId || job.data?.tenant_id || 'system');
      const startedAt = Date.now();

      console.log(`[EmailWorker] Processing job ${job.id} for tenant ${tenantId}`);

      try {
        await emailService.sendEmail(job.data);
        const duration = Date.now() - startedAt;
        console.log(`[EmailWorker] Job ${job.id} completed in ${duration}ms`);
      } catch (error) {
        console.error(`[EmailWorker] Job ${job.id} failed:`, error);
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
    console.error(`[EmailWorker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log('✅ Email Worker Started');
};

/**
 * Menutup koneksi Email Worker secara anggun.
 */
export const closeEmailWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('🛑 Email Worker stopped');
  }
};
