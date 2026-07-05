import { prisma } from '@/utils/prisma';
import axios from 'axios';
import * as os from 'os';
import * as cron from 'node-cron';

export const heartbeatService = {
  async collectAndSendMetrics(): Promise<void> {
    try {
      const licenseKey = process.env.LICENSE_KEY;
      const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
      
      if (!licenseKey) {
        console.warn('[Heartbeat] LICENSE_KEY is not configured. Skipping heartbeat sync.');
        return;
      }

      console.log('[Heartbeat] Collecting system and tenant metrics...');

      // 1. Get active user count
      let activeUsers = 0;
      try {
        activeUsers = await prisma.user.count({
          where: { is_active: true } as any
        });
      } catch {
        try {
          activeUsers = await prisma.user.count();
        } catch {}
      }

      // 2. Get database size in MB
      let dbSize = 0;
      try {
        const sizeResult = await prisma.$queryRawUnsafe<any[]>(
          'SELECT pg_database_size(current_database()) AS size;'
        );
        if (sizeResult && sizeResult[0]) {
          const bytes = Number(sizeResult[0].size);
          dbSize = parseFloat((bytes / (1024 * 1024)).toFixed(2));
        }
      } catch (err: any) {
        console.error('[Heartbeat] Failed to calculate database size:', err.message);
      }

      // 3. Get system memory usage ratio
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = parseFloat((totalMem > 0 ? (totalMem - freeMem) / totalMem : 0).toFixed(4));

      // 4. Get last tapped activity timestamp
      let lastTapped = new Date();
      try {
        const latestAbsen = await prisma.absenSiswa.findFirst({
          orderBy: { created_at: 'desc' } as any,
          select: { created_at: true } as any
        });
        if (latestAbsen && (latestAbsen as any).created_at) {
          lastTapped = new Date((latestAbsen as any).created_at);
        }
      } catch {
        try {
          const latestLog = await prisma.activityLog.findFirst({
            orderBy: { created_at: 'desc' } as any,
            select: { created_at: true } as any
          });
          if (latestLog && (latestLog as any).created_at) {
            lastTapped = new Date((latestLog as any).created_at);
          }
        } catch {}
      }

      // Get school name from DB
      let schoolName = undefined;
      try {
        const sekolah = await prisma.sekolah.findFirst({ select: { nama: true } });
        if (sekolah && sekolah.nama) {
          schoolName = sekolah.nama;
        }
      } catch (err: any) {
        console.warn('[Heartbeat] Gagal mendapatkan nama sekolah:', err.message);
      }

      // 5. Send metrics to License Server
      console.log(`[Heartbeat] Sending metrics: activeUsers=${activeUsers}, dbSize=${dbSize}MB, memoryUsage=${(memoryUsage * 100).toFixed(2)}%, lastTapped=${lastTapped.toISOString()}`);
      
      const payload = {
        activeUsers,
        dbSize,
        memoryUsage,
        lastTapped: lastTapped.toISOString(),
        deployMode: process.env.DEPLOY_SCENARIO || 'local',
        schoolName,
        appDomain: process.env.PUBLIC_DOMAIN_BASE || undefined,
        hostname: os.hostname(),
        osType: `${os.type()} ${os.release()} (${os.arch()})`
      };

      const response = await axios.post(`${licenseServerUrl}/api/platform/heartbeat`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': licenseKey
        },
        timeout: 10000 // 10s timeout
      });

      if (response.status === 200 || response.status === 201) {
        console.log('[Heartbeat] Metrics successfully pushed to central license server.');
      } else {
        console.warn(`[Heartbeat] Central license server returned unexpected status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('[Heartbeat] Sync failed:', error.message);
    }
  },

  startCronJob(): void {
    // Jalankan setiap 2 menit agar panel owner mendeteksi status ONLINE secara akurat
    cron.schedule('*/2 * * * *', async () => {
      console.log('[Heartbeat] Cron job triggered.');
      await this.collectAndSendMetrics();
    });
    console.log('[Heartbeat] Heartbeat sync job has been scheduled (every 2 minutes).');
  }
};
