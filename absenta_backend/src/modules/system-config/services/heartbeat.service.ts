import { prisma } from '@/utils/prisma';
import { presenceService } from '@/infra/realtime/presence.service';
import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as cron from 'node-cron';
import { acquireLock, releaseLock } from '@/infra/locks/distributedLock';
import { execSync } from 'child_process';
import { getDeployScenario, isSaasScenario } from '@/utils/deployScenario';

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

// ─── Continuous 5-Second System Resource Sampler (Rolling 2-Minute Window) ───
// Mengukur delta CPU, pemakaian RAM, serta throughput jaringan (Inbound Rx / Outbound Tx)
// setiap 5 detik secara kontinyu agar lonjakan (spike) ujian tetap terekam 100% akurat.
let lastCpuTimes: os.CpuInfo[] | null = null;
const cpuSamplesWindow: number[] = [];
const memSamplesWindow: number[] = [];

interface NetRawCounter {
  rxBytes: number;
  txBytes: number;
}
let lastNetCounters: Map<string, NetRawCounter> | null = null;
let lastNetSampleTime: number = Date.now();
let detectedPrimaryIface: string = 'eth0';
const netRxSamplesWindow: number[] = []; // KB/s
const netTxSamplesWindow: number[] = []; // KB/s
let totalRxBytesRecorded: number = 0;
let totalTxBytesRecorded: number = 0;

let samplerTimerStarted = false;

function readProcNetDevCounters(): Map<string, NetRawCounter> {
  const map = new Map<string, NetRawCounter>();
  if (process.platform === 'linux' && fs.existsSync('/proc/net/dev')) {
    try {
      const content = fs.readFileSync('/proc/net/dev', 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.includes(':')) continue;
        const [ifaceRaw, dataRaw] = line.split(':');
        const iface = ifaceRaw.trim();
        // Skip loopback dan virtual bridge docker
        if (iface === 'lo' || iface.startsWith('docker') || iface.startsWith('br-') || iface.startsWith('veth')) continue;
        const fields = dataRaw.trim().split(/\s+/);
        if (fields.length >= 10) {
          const rxBytes = parseInt(fields[0], 10) || 0;
          const txBytes = parseInt(fields[8], 10) || 0;
          map.set(iface, { rxBytes, txBytes });
        }
      }
    } catch {}
  }
  return map;
}

function sampleResourceTick(): void {
  try {
    // 1. Sample CPU
    const currentCpus = os.cpus();
    if (lastCpuTimes && lastCpuTimes.length === currentCpus.length) {
      let idleDelta = 0;
      let totalDelta = 0;
      for (let i = 0; i < currentCpus.length; i++) {
        const start = lastCpuTimes[i].times;
        const end = currentCpus[i].times;
        const startTotal = start.user + start.nice + start.sys + start.idle + start.irq;
        const endTotal = end.user + end.nice + end.sys + end.idle + end.irq;
        idleDelta += end.idle - start.idle;
        totalDelta += endTotal - startTotal;
      }
      if (totalDelta > 0) {
        const ratio = Math.max(0, Math.min(1, 1 - idleDelta / totalDelta));
        cpuSamplesWindow.push(parseFloat(ratio.toFixed(4)));
        if (cpuSamplesWindow.length > 36) cpuSamplesWindow.shift(); // Keep last 3 mins max
      }
    }
    lastCpuTimes = currentCpus;

    // 2. Sample Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    if (totalMem > 0) {
      const memRatio = Math.max(0, Math.min(1, (totalMem - freeMem) / totalMem));
      memSamplesWindow.push(parseFloat(memRatio.toFixed(4)));
      if (memSamplesWindow.length > 36) memSamplesWindow.shift();
    }

    // 3. Sample Network Throughput (/proc/net/dev)
    const now = Date.now();
    const dSec = Math.max(0.5, (now - lastNetSampleTime) / 1000);
    const curNet = readProcNetDevCounters();

    if (lastNetCounters && curNet.size > 0) {
      // Prioritaskan eth0 jika ada, atau interface ethernet/wifi fisik dengan akumulasi trafik tertinggi
      let bestIface = 'eth0';
      if (curNet.has('eth0')) {
        bestIface = 'eth0';
      } else {
        let maxTraffic = -1;
        for (const [iface, data] of curNet.entries()) {
          const total = data.rxBytes + data.txBytes;
          if (total > maxTraffic) {
            maxTraffic = total;
            bestIface = iface;
          }
        }
      }
      detectedPrimaryIface = bestIface;

      const prev = lastNetCounters.get(bestIface);
      const cur = curNet.get(bestIface);
      if (prev && cur) {
        const dRx = Math.max(0, cur.rxBytes - prev.rxBytes);
        const dTx = Math.max(0, cur.txBytes - prev.txBytes);
        const rxKbps = parseFloat(((dRx / dSec) / 1024).toFixed(2));
        const txKbps = parseFloat(((dTx / dSec) / 1024).toFixed(2));

        netRxSamplesWindow.push(rxKbps);
        netTxSamplesWindow.push(txKbps);
        if (netRxSamplesWindow.length > 36) netRxSamplesWindow.shift();
        if (netTxSamplesWindow.length > 36) netTxSamplesWindow.shift();

        totalRxBytesRecorded = cur.rxBytes;
        totalTxBytesRecorded = cur.txBytes;
      }
    }
    lastNetCounters = curNet;
    lastNetSampleTime = now;
  } catch {}
}

function startContinuousResourceSampler(): void {
  if (samplerTimerStarted) return;
  samplerTimerStarted = true;
  lastCpuTimes = os.cpus();
  lastNetCounters = readProcNetDevCounters();
  lastNetSampleTime = Date.now();
  setInterval(sampleResourceTick, 5000);
}

async function consumeResourceWindowStats(): Promise<{
  avgCpuRatio: number;
  peakCpuRatio: number;
  avgMemRatio: number;
  peakMemRatio: number;
  totalMemMb: number;
  usedMemMb: number;
  avgRxKbps: number;
  peakRxKbps: number;
  avgTxKbps: number;
  peakTxKbps: number;
  totalRxBytes: number;
  totalTxBytes: number;
  primaryIface: string;
}> {
  // Take one immediate tick if buffer is empty
  if (cpuSamplesWindow.length === 0) {
    await new Promise<void>((resolve) => {
      sampleResourceTick();
      setTimeout(() => {
        sampleResourceTick();
        resolve();
      }, 150);
    });
  }

  const cpuCopy = cpuSamplesWindow.splice(0, cpuSamplesWindow.length);
  const memCopy = memSamplesWindow.splice(0, memSamplesWindow.length);
  const netRxCopy = netRxSamplesWindow.splice(0, netRxSamplesWindow.length);
  const netTxCopy = netTxSamplesWindow.splice(0, netTxSamplesWindow.length);

  const avgCpuRatio = cpuCopy.length > 0
    ? parseFloat((cpuCopy.reduce((a, b) => a + b, 0) / cpuCopy.length).toFixed(4))
    : 0;
  const peakCpuRatio = cpuCopy.length > 0
    ? parseFloat(Math.max(...cpuCopy).toFixed(4))
    : avgCpuRatio;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const currentMemRatio = totalMem > 0 ? parseFloat(((totalMem - freeMem) / totalMem).toFixed(4)) : 0;

  const avgMemRatio = memCopy.length > 0
    ? parseFloat((memCopy.reduce((a, b) => a + b, 0) / memCopy.length).toFixed(4))
    : currentMemRatio;
  const peakMemRatio = memCopy.length > 0
    ? parseFloat(Math.max(...memCopy).toFixed(4))
    : currentMemRatio;

  const totalMemMb = Math.round(totalMem / (1024 * 1024));
  const usedMemMb = Math.round(totalMemMb * peakMemRatio);

  const avgRxKbps = netRxCopy.length > 0
    ? parseFloat((netRxCopy.reduce((a, b) => a + b, 0) / netRxCopy.length).toFixed(2))
    : 0;
  const peakRxKbps = netRxCopy.length > 0
    ? parseFloat(Math.max(...netRxCopy).toFixed(2))
    : avgRxKbps;

  const avgTxKbps = netTxCopy.length > 0
    ? parseFloat((netTxCopy.reduce((a, b) => a + b, 0) / netTxCopy.length).toFixed(2))
    : 0;
  const peakTxKbps = netTxCopy.length > 0
    ? parseFloat(Math.max(...netTxCopy).toFixed(2))
    : avgTxKbps;

  return {
    avgCpuRatio,
    peakCpuRatio,
    avgMemRatio,
    peakMemRatio,
    totalMemMb,
    usedMemMb,
    avgRxKbps,
    peakRxKbps,
    avgTxKbps,
    peakTxKbps,
    totalRxBytes: totalRxBytesRecorded,
    totalTxBytes: totalTxBytesRecorded,
    primaryIface: detectedPrimaryIface
  };
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
  // 1. Prioritaskan API standar native bawaan Node.js (cross-platform, zero child process)
  try {
    if (typeof (fs as any).statfsSync === 'function') {
      const targetDrive = process.platform === 'win32' ? (process.cwd().substring(0, 3) || 'C:\\') : '/';
      const stats = (fs as any).statfsSync(targetDrive);
      if (stats && stats.bsize && stats.blocks) {
        const totalBytes = Number(stats.bsize) * Number(stats.blocks);
        const sizeGB = Math.round(totalBytes / (1024 * 1024 * 1024));
        return `${sizeGB} GB`;
      }
    }
  } catch (e) {}

  // 2. Fallback aman tanpa mencetak error ke stderr jika command tidak ada
  try {
    if (process.platform === 'win32') {
      const out = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\").Size"', {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).toString();
      const match = out.match(/\d+/);
      if (match) {
        const sizeBytes = parseInt(match[0], 10);
        const sizeGB = Math.round(sizeBytes / (1024 * 1024 * 1024));
        return `${sizeGB} GB`;
      }
    } else {
      const out = execSync("df -B1 / | tail -1 | awk '{print $2}'", {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).toString();
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

    const licenseKey = process.env.LICENSE_KEY;
    const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';

    if (!licenseKey) {
      console.warn('[Heartbeat] LICENSE_KEY is not configured. Skipping heartbeat sync.');
      await releaseLock(lock);
      return;
    }

    try {
      console.log(`[Heartbeat] Leader instance (pid ${process.pid}) collecting metrics...`);

      const { consumeIntervalStats, getClusterActiveUsers } = require('@/middlewares/accessSourceMiddleware');

      // 1. Get cluster-wide realtime active users (WebSocket + HTTP active users across all 4 PM2 workers)
      let activeUsers = 0;
      let clusterTenantUsers: Record<string, number> = {};
      try {
        const clusterPresence = await getClusterActiveUsers();
        activeUsers = clusterPresence.globalActiveUsers;
        clusterTenantUsers = clusterPresence.byTenant || {};
      } catch (e: any) {
        console.warn('[Heartbeat] Failed to get cluster active users:', e.message);
        try {
          activeUsers = presenceService.getActiveUserCount();
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

      // 3. Get 2-minute continuous resource window stats (5s sampler: Peak & Average CPU/RAM)
      const resourceStats = await consumeResourceWindowStats();
      // Gunakan peak ratio dari jendela 2 menit agar spike 5-30 detik tidak hilang saat dikirim ke ServerMetricLog
      const memoryUsage = resourceStats.peakMemRatio;
      const cpuUsage = resourceStats.peakCpuRatio;

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
          // Get cluster-wide active user count for this specific tenant
          let tActiveUsers = clusterTenantUsers[t.id] ?? 0;
          if (!tActiveUsers) {
            try {
              tActiveUsers = presenceService.getActiveUserCount(t.id);
            } catch {
              tActiveUsers = 0;
            }
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

      // 5.5 Collect EasyTunnel telemetry for usage patterns and response time
      let easyTunnelTelemetry: any[] = [];
      try {
        const { getStatsForSlug } = require('@/middlewares/accessSourceMiddleware');
        const activeTunnels = await prisma.easyTunnel.findMany({
          where: { status: 'active' }
        });

        for (const tun of activeTunnels) {
          const stats = getStatsForSlug(tun.slug);
          easyTunnelTelemetry.push({
            slug: tun.slug,
            networkMode: tun.network_mode || 'HYBRID_SPLIT_DNS',
            localRequestsToday: stats.localHits,
            publicRequestsToday: stats.publicHits,
            localAvgResponseTimeMs: stats.localAvgMs,
            publicAvgResponseTimeMs: stats.publicAvgMs
          });

          // Sync to local Prisma EasyTunnel model as well
          await prisma.easyTunnel.update({
            where: { id: tun.id },
            data: {
              local_requests_today: stats.localHits,
              public_requests_today: stats.publicHits,
              local_avg_response_time_ms: stats.localAvgMs,
              public_avg_response_time_ms: stats.publicAvgMs,
              last_synced_at: new Date()
            }
          }).catch(() => {});
        }
      } catch (e: any) {
        console.warn('[Heartbeat] Gagal mengumpulkan telemetri EasyTunnel:', e.message);
      }

      // 6. Consume cluster-wide HTTP response time & request volume for this 2-minute interval
      const intervalStats = await consumeIntervalStats();

      // 7. Send metrics to License Server
      console.log(
        `[Heartbeat] Sending cluster metrics: activeUsers=${activeUsers}, dbSize=${dbSize}MB, ` +
        `memPeak=${(memoryUsage * 100).toFixed(2)}% (${resourceStats.usedMemMb}/${resourceStats.totalMemMb}MB), ` +
        `cpuPeak=${(cpuUsage * 100).toFixed(2)}% (avg=${(resourceStats.avgCpuRatio * 100).toFixed(2)}%), ` +
        `net=${resourceStats.primaryIface} (Rx: ${resourceStats.avgRxKbps} KB/s, Peak: ${resourceStats.peakRxKbps} KB/s | Tx: ${resourceStats.avgTxKbps} KB/s, Peak: ${resourceStats.peakTxKbps} KB/s), ` +
        `respAvg=${intervalStats.overallAvgMs}ms (max=${intervalStats.maxResponseTimeMs}ms, ${intervalStats.totalHits} hits in 2m across cluster), ` +
        `tenants=${tenantList.length}`
      );

      const currentScenario = getDeployScenario();
      const payload: any = {
        activeUsers,
        dbSize,
        memoryUsage,
        cpuUsage,
        avgCpuUsage: resourceStats.avgCpuRatio,
        peakCpuUsage: resourceStats.peakCpuRatio,
        memoryUsedMb: resourceStats.usedMemMb,
        totalMemoryMb: resourceStats.totalMemMb,
        // Network Throughput Telemetry
        rxKbps: resourceStats.avgRxKbps,
        txKbps: resourceStats.avgTxKbps,
        peakRxKbps: resourceStats.peakRxKbps,
        peakTxKbps: resourceStats.peakTxKbps,
        primaryIface: resourceStats.primaryIface,
        network: {
          interface: resourceStats.primaryIface,
          rxKbps: resourceStats.avgRxKbps,
          txKbps: resourceStats.avgTxKbps,
          peakRxKbps: resourceStats.peakRxKbps,
          peakTxKbps: resourceStats.peakTxKbps,
          totalRxBytes: resourceStats.totalRxBytes,
          totalTxBytes: resourceStats.totalTxBytes
        },
        localAvgResponseTimeMs: intervalStats.localAvgMs || undefined,
        publicAvgResponseTimeMs: intervalStats.publicAvgMs || undefined,
        avgResponseTimeMs: intervalStats.overallAvgMs || undefined,
        maxResponseTimeMs: intervalStats.maxResponseTimeMs || undefined,
        requestsCount: intervalStats.totalHits || 0,
        localRequestsToday: intervalStats.localHits || undefined,
        publicRequestsToday: intervalStats.publicHits || undefined,
        lastTapped: lastTapped.toISOString(),
        deployMode: currentScenario,
        schoolName: serverLabel,
        tenants: tenantList,
        easyTunnelTelemetry,
        appDomain: process.env.PUBLIC_DOMAIN_BASE || undefined,
        hostname: os.hostname(),
        osType: `${os.type()} ${os.release()} (${os.arch()}) | CPU: ${getCpuSpec()} | RAM: ${getRamSpecGB()} | Storage: ${getStorageSpecGB()}`
      };

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (licenseKey) {
        requestHeaders['X-License-Key'] = licenseKey;
      }
      if (isSaasScenario()) {
        requestHeaders['X-Platform-Key'] = process.env.PLATFORM_API_KEY || process.env.JWT_SECRET || 'absenta-platform-saas';
      }

      const response = await axios.post(`${licenseServerUrl}/api/platform/heartbeat`, payload, {
        headers: requestHeaders,
        timeout: 3000
      });

      if (response.status === 200 || response.status === 201) {
        console.log('[Heartbeat] Metrics successfully pushed to central license server.');
      } else {
        console.warn(`[Heartbeat] Central license server returned unexpected status: ${response.status}`);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        console.warn(`[Heartbeat] Sync failed: LICENSE_KEY tidak valid atau belum terdaftar di ${licenseServerUrl} (HTTP 401 Unauthorized).`);
      } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED' || String(error?.message).includes('timeout')) {
        console.warn(`[Heartbeat] Server lisensi pusat (${licenseServerUrl}) tidak dapat dijangkau / timeout (${error.code || 'TIMEOUT'}). Melewati siklus ini.`);
      } else {
        console.error('[Heartbeat] Sync failed:', error.message);
      }
    } finally {
      // Selalu lepas lock agar instance lain bisa mengambil alih di siklus berikutnya
      await releaseLock(lock);
    }
  },

  startCronJob(): void {
    // Mulai continuous 5-second CPU & RAM sampler
    startContinuousResourceSampler();
    // Jalankan setiap 2 menit. Distributed lock memastikan hanya 1 dari N
    // cluster instance yang benar-benar mengirim heartbeat per siklus.
    cron.schedule('*/2 * * * *', async () => {
      console.log(`[Heartbeat] Cron triggered (pid ${process.pid}), contending for leader lock...`);
      await this.collectAndSendMetrics();
    });
    console.log('[Heartbeat] Heartbeat sync job scheduled (every 2 min, 5s continuous resource sampler & Redis cluster aggregation active).');
  }
};
