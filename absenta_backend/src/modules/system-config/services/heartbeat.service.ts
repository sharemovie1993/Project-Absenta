import { prisma } from '@/utils/prisma';
import axios from 'axios';
import * as os from 'os';
import * as cron from 'node-cron';
import { acquireLock, releaseLock } from '@/infra/locks/distributedLock';
import { execSync } from 'child_process';

function getCpuSpec(): string {
  try {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) {
      const model = cpus[0].model.replace(/\s+/g, ' ').trim();
      return `${model} (${cpus.length} Cores)`;
    }
  } catch (e) {}
  return 'Unknown CPU';
}

function getRamSpecGB(): string {
  try {
    const totalBytes = os.totalmem();
    const totalGB = Math.round(totalBytes / (1024 * 1024 * 1024));
    return `${totalGB} GB`;
  } catch (e) {}
  return 'Unknown RAM';
}

function getStorageSpecGB(): string {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get size', { windowsHide: true }).toString();
      const match = out.match(/\d+/);
      if (match) {
        const sizeBytes = parseInt(match[0], 10);
        const sizeGB = Math.round(sizeBytes / (1024 * 1024 * 1024));
        return `${sizeGB} GB`;
      }
    } else {
      const out = execSync("df -B1 / | tail -1 | awk '{print $2}'", { windowsHide: true }).toString();
      const match = out.match(/\d+/);
      if (match) {
        const sizeBytes = parseInt(match[0], 10);
        const sizeGB = Math.round(sizeBytes / (1024 * 1024 * 1024));
        return `${sizeGB} GB`;
      }
    }
  } catch (e) {}
  return 'Unknown Storage';
}

export const heartbeatService = {
  async collectAndSendMetrics(): Promise<void> {
    // ─── Distributed Lock ────────────────────────────────────────────────────
    // Hanya 1 dari N cluster instance yang boleh mengirim heartbeat per siklus.
    // Lock TTL = 90 detik — cukup panjang agar siklus selesai tanpa tumpang
    // tindih, tapi pendek dari interval 2 menit berikutnya sehingga lock pasti
    // sudah dilepas sebelum cron berikutnya berjalan.
    let lock = null;
    try {
      lock = await acquireLock('heartbeat:license-sync', 90);
    } catch {
      // Redis mungkin belum siap — lanjutkan tanpa lock (fallback graceful)
    }

    if (lock === null) {
      // Instance lain sudah memegang lock, skip siklus ini
      console.log(`[Heartbeat] Skipped — instance lain sedang mengirim (pid ${process.pid} tidak terpilih sebagai leader).`);
      return;
    }

    try {
      const licenseKey = process.env.LICENSE_KEY;
      const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';

      if (!licenseKey) {
        console.warn('[Heartbeat] LICENSE_KEY is not configured. Skipping heartbeat sync.');
        return;
      }

      console.log(`[Heartbeat] Leader instance (pid ${process.pid}) collecting metrics...`);

      // 1. Get active user count
      let activeUsers = 0;
      try {
        activeUsers = await prisma.user.count({
          where: { status: 'ACTIVE' }
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

      // 5. Collect all active tenants on this server (multi-tenant support)
      let tenantList: Array<{ name: string; subdomain: string | null; activeUsers: number; lastTapped: string }> = [];
      let serverLabel: string | undefined = undefined;
      try {
        const tenants = await prisma.tenant.findMany({
          where: { status: 'ACTIVE', NOT: { id: 'system' } },
          select: { id: true, name: true, subdomain: true }
        });

        for (const t of tenants) {
          // Get active user count for this specific tenant
          let tActiveUsers = 0;
          try {
            tActiveUsers = await prisma.user.count({
              where: { tenant_id: t.id, status: 'ACTIVE' }
            });
          } catch {
            try {
              tActiveUsers = await prisma.user.count({
                where: { tenant_id: t.id }
              });
            } catch {}
          }

          // Get last tapped activity timestamp for this specific tenant
          let tLastTapped = new Date();
          try {
            const latestAbsen = await prisma.absenSiswa.findFirst({
              where: { tenant_id: t.id },
              orderBy: { created_at: 'desc' } as any,
              select: { created_at: true } as any
            });
            if (latestAbsen && (latestAbsen as any).created_at) {
              tLastTapped = new Date((latestAbsen as any).created_at);
            } else {
              const latestLog = await prisma.activityLog.findFirst({
                where: { tenant_id: t.id },
                orderBy: { created_at: 'desc' } as any,
                select: { created_at: true } as any
              });
              if (latestLog && (latestLog as any).created_at) {
                tLastTapped = new Date((latestLog as any).created_at);
              }
            }
          } catch {
            try {
              const latestLog = await prisma.activityLog.findFirst({
                where: { tenant_id: t.id },
                orderBy: { created_at: 'desc' } as any,
                select: { created_at: true } as any
              });
              if (latestLog && (latestLog as any).created_at) {
                tLastTapped = new Date((latestLog as any).created_at);
              }
            } catch {}
          }

          tenantList.push({
            name: t.name,
            subdomain: t.subdomain || null,
            activeUsers: tActiveUsers,
            lastTapped: tLastTapped.toISOString()
          });
        }

        if (tenantList.length === 1) {
          serverLabel = tenantList[0].name;
        } else if (tenantList.length > 1) {
          serverLabel = `SaaS Node (${tenantList.length} Tenant)`;
        }
      } catch (err: any) {
        console.warn('[Heartbeat] Gagal mendapatkan daftar tenant:', err.message);
        try {
          const sekolah = await prisma.sekolah.findFirst({ select: { nama: true } });
          if (sekolah && sekolah.nama) serverLabel = sekolah.nama;
        } catch {}
      }

      // 6. Send metrics to License Server
      console.log(`[Heartbeat] Sending metrics: activeUsers=${activeUsers}, dbSize=${dbSize}MB, mem=${(memoryUsage * 100).toFixed(2)}%, tenants=${tenantList.length}`);

      const payload: any = {
        activeUsers,
        dbSize,
        memoryUsage,
        lastTapped: lastTapped.toISOString(),
        deployMode: process.env.DEPLOY_SCENARIO || 'local',
        schoolName: serverLabel,
        tenants: tenantList,
        appDomain: process.env.PUBLIC_DOMAIN_BASE || undefined,
        hostname: os.hostname(),
        osType: `${os.type()} ${os.release()} (${os.arch()}) | CPU: ${getCpuSpec()} | RAM: ${getRamSpecGB()} | Storage: ${getStorageSpecGB()}`
      };

      const response = await axios.post(`${licenseServerUrl}/api/platform/heartbeat`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': licenseKey
        },
        timeout: 10000
      });

      if (response.status === 200 || response.status === 201) {
        console.log('[Heartbeat] Metrics successfully pushed to central license server.');
      } else {
        console.warn(`[Heartbeat] Central license server returned unexpected status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('[Heartbeat] Sync failed:', error.message);
    } finally {
      // Selalu lepas lock agar instance lain bisa mengambil alih di siklus berikutnya
      await releaseLock(lock);
    }
  },

  startCronJob(): void {
    // Jalankan setiap 2 menit. Distributed lock memastikan hanya 1 dari N
    // cluster instance yang benar-benar mengirim heartbeat per siklus.
    cron.schedule('*/2 * * * *', async () => {
      console.log(`[Heartbeat] Cron triggered (pid ${process.pid}), contending for leader lock...`);
      await this.collectAndSendMetrics();
    });
    console.log('[Heartbeat] Heartbeat sync job scheduled (every 2 min, distributed-lock guarded).');
  }
};
