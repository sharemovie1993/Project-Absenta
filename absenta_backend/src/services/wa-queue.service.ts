/**
 * wa-queue.service.ts
 * WhatsApp Message Queue Dispatcher menggunakan BullMQ.
 *
 * TUJUAN:
 * - Menghindari pemblokiran nomor WA sekolah oleh WhatsApp karena pengiriman massal serentak.
 * - Mengatur jeda 2-5 detik antar pesan (throttle) per tenant secara otomatis.
 * - Menyediakan retry otomatis jika pengiriman gagal (misal WA Gateway sedang reconnect).
 *
 * ARSITEKTUR:
 * - Setiap tenant memiliki queue BullMQ terpisah dengan nama `wa-send:{tenantId}`.
 * - Worker dibuat per-queue dengan concurrency=1 (satu pesan dikirim per satu waktu).
 * - Jeda antar pesan diatur dengan `limiter` BullMQ (max 1 pesan / 3 detik per tenant).
 */

import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { waGatewayService } from './wa-gateway.service';

// ─── Redis Connection ─────────────────────────────────────────────────────────

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

/**
 * BullMQ requires its own internal ioredis connection.
 * We pass a config object instead of a Redis instance to avoid
 * version conflicts between top-level ioredis and bullmq's bundled ioredis.
 * BullMQ will create and manage the connection internally.
 */
const bullmqConnection: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
};

/**
 * Separate IORedis instance for non-BullMQ uses (event listeners, health checks, etc.)
 */
const redisConnection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  console.warn('[WA-Queue] Redis connection warning/error:', err.message);
});

// ─── Queue & Worker Pool ─────────────────────────────────────────────────────

const queuePool = new Map<string, Queue>();
const workerPool = new Map<string, Worker>();

export interface WaQueuePayload {
  tenantId: string;
  nomor: string;
  pesan: string;
  source?: string; // For logging: e.g. "attendance_notif", "bk_alert", "billing"
}

/**
 * Mendapatkan atau membuat queue + worker untuk satu tenant.
 */
function getOrCreateTenantQueue(tenantId: string): Queue {
  if (queuePool.has(tenantId)) {
    return queuePool.get(tenantId)!;
  }

  const queueName = `wa-send-${tenantId}`;

  // Create Queue with rate limiter: max 1 message per 3 seconds per tenant
  const queue = new Queue(queueName, {
    connection: bullmqConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s retry
      },
      removeOnComplete: { count: 100 },  // Keep last 100 completed jobs for debugging
      removeOnFail: { count: 50 },       // Keep last 50 failed jobs
    },
  });

  // Create Worker with concurrency=1 and rate limiter (throttle)
  const worker = new Worker<WaQueuePayload>(
    queueName,
    async (job) => {
      const { tenantId: tid, nomor, pesan, source } = job.data;
      console.log(`[WA-Queue:${tid}] Mengirim pesan ke ${nomor} (source: ${source ?? 'unknown'}, attempt: ${job.attemptsMade + 1})`);
      await waGatewayService.sendMessage(tid, nomor, pesan);
      console.log(`[WA-Queue:${tid}] ✅ Pesan berhasil dikirim ke ${nomor}`);
    },
    {
      connection: bullmqConnection,
      concurrency: 1, // Satu pesan per satu waktu per tenant
      limiter: {
        max: 1,
        duration: 3000, // Max 1 message per 3 seconds (333 msg/menit) — aman dari ban WA
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[WA-Queue:${tenantId}] ❌ Gagal kirim ke ${job?.data?.nomor} (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[WA-Queue:${tenantId}] ⚠️ Job stalled: ${jobId}`);
  });

  queuePool.set(tenantId, queue);
  workerPool.set(tenantId, worker);

  console.log(`[WA-Queue] Queue & Worker baru dibuat untuk tenant: ${tenantId}`);
  return queue;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const waQueueService = {
  /**
   * Tambahkan pesan WA ke antrian pengiriman.
   * Otomatis membuat queue & worker jika belum ada untuk tenant ini.
   *
   * @param payload - Data pesan (tenantId, nomor, pesan, source)
   * @param priority - Optional priority (1 = tertinggi, 10 = terendah). Default: 5
   */
  async enqueue(payload: WaQueuePayload, priority: number = 5): Promise<void> {
    const { tenantId, nomor, pesan } = payload;

    if (!nomor || !pesan) {
      console.warn(`[WA-Queue:${tenantId}] Skip: nomor atau pesan kosong.`);
      return;
    }

    const queue = getOrCreateTenantQueue(tenantId);
    const jobName = `send-${Date.now()}`;

    // Gunakan Promise.race dengan timeout 2 detik agar tidak hang jika Redis luring
    const addPromise = queue.add(jobName, payload, { priority });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('BULLMQ_REDIS_TIMEOUT')), 2000)
    );

    await Promise.race([addPromise, timeoutPromise]);
    console.log(`[WA-Queue:${tenantId}] 📬 Pesan ke ${nomor} ditambahkan ke antrian.`);
  },

  /**
   * Enqueue pesan secara soft (tidak throw jika error).
   * Gunakan ini untuk notifikasi opsional agar tidak menghentikan alur bisnis utama.
   */
  async enqueueSoft(payload: WaQueuePayload, priority: number = 5): Promise<void> {
    try {
      await waQueueService.enqueue(payload, priority);
    } catch (err: any) {
      console.warn(`[WA-Queue:${payload.tenantId}] Skip enqueue (${err.message})`);
    }
  },

  /**
   * Ambil statistik antrian untuk satu tenant.
   */
  async getStats(tenantId: string) {
    const queue = queuePool.get(tenantId);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  },

  /**
   * Hentikan worker tenant (graceful shutdown).
   */
  async stopTenantWorker(tenantId: string): Promise<void> {
    const worker = workerPool.get(tenantId);
    if (worker) {
      await worker.close();
      workerPool.delete(tenantId);
      queuePool.delete(tenantId);
      console.log(`[WA-Queue:${tenantId}] Worker dihentikan.`);
    }
  },

  /**
   * Graceful shutdown semua worker (dipanggil saat server shutdown).
   */
  async shutdown(): Promise<void> {
    console.log('[WA-Queue] Menghentikan semua worker...');
    await Promise.all(
      Array.from(workerPool.values()).map((w) => w.close())
    );
    await redisConnection.quit();
    console.log('[WA-Queue] Semua worker dihentikan.');
  },
};
