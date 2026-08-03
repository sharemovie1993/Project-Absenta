/**
 * wa-worker.ts
 * Dedicated Singleton Worker Process untuk WhatsApp Gateway.
 *
 * Berjalan sebagai PM2 Daemon independen (SERVICE_ROLE=wa-worker).
 * Murni mengelola socket Baileys WhatsApp, mendengarkan RPC Redis dari API HTTP,
 * dan mengolah antrean notifikasi absensi.
 */

import '../infra/env'; // MUST BE FIRST
import { prisma } from '../utils/prisma';
import { initRedis, verifyRedisConnection } from '../infra/redis/redisClient';
import { trackService } from '../utils/startup-table';
import { waGatewayService } from '../services/wa-gateway.service';

process.title = 'absenta-wa-worker';
process.env.SERVICE_ROLE = 'wa-worker';

async function startWaWorker() {
  console.log('==================================================');
  console.log('    🚀 MEMULAI DEDICATED ABSENTA WA WORKER DAEMON   ');
  console.log('==================================================');

  try {
    // 1. Connect Database & Redis
    await trackService('PostgreSQL DB', 'infra', async () => {
      await prisma.$connect();
    });

    await trackService('Redis Connection', 'infra', async () => {
      await initRedis();
      await verifyRedisConnection();
    });

    // 2. Bootstrap WhatsApp Gateway Pool & Restore Active Sessions
    await trackService('WhatsApp Gateway Pool Master', 'wa-gateway', async () => {
      await waGatewayService.restoreConnections();
    });

    console.log('✅ Dedicated WA Worker Daemon aktif & mendengarkan RPC Redis.');
  } catch (error: any) {
    console.error('❌ Gagal menginisialisasi Dedicated WA Worker Daemon:', error.message);
    process.exit(1);
  }
}

// Handle Graceful Shutdown
const shutdown = async (signal: string) => {
  console.log(`\n⚠️  Menerima sinyal ${signal}. Menutup WA Worker Daemon...`);
  try {
    await prisma.$disconnect();
    console.log('✅ PostgreSQL disconnected.');
  } catch (_) {}
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startWaWorker();
