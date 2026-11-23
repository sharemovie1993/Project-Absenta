import { getRedisConnection } from '@/queue/redis';
import { presenceService } from '@/infra/realtime/presence.service';

interface TunnelStats {
  localHits: number;
  publicHits: number;
  localTotalMs: number;
  publicTotalMs: number;
  localMaxMs: number;
  publicMaxMs: number;
  lastHandshake?: Date;
}

// In-Memory Stats Store per Slug (Cumulative for EasyTunnel local view)
const statsStore: Record<string, TunnelStats> = {};
// Per-Worker 5s Delta Buffer to flush into Redis Cluster Aggregator
const workerDeltaBuffer = {
  localHits: 0,
  publicHits: 0,
  localTotalMs: 0,
  publicTotalMs: 0,
  localMaxMs: 0,
  publicMaxMs: 0,
};

// Track authenticated HTTP active users on this worker within a 3-minute sliding window (tenantId -> (userId -> lastSeenEpochMs))
const httpActiveUsersByTenant: Map<string, Map<string, number>> = new Map();
const HTTP_ACTIVE_WINDOW_MS = 3 * 60 * 1000;

let defaultSlug = 'smkn1pld';
let clusterFlushTimerStarted = false;

const REDIS_HTTP_WINDOW_KEY = 'telemetry:cluster:http_window';
const REDIS_WORKER_PRESENCE_PREFIX = 'telemetry:cluster:worker_presence:';

export function setDefaultSlug(slug: string) {
  if (slug) defaultSlug = slug;
}

export function getStatsForSlug(slug: string): {
  localHits: number;
  publicHits: number;
  localAvgMs: number;
  publicAvgMs: number;
} {
  const targetSlug = slug || defaultSlug;
  const s = statsStore[targetSlug] || statsStore[defaultSlug] || {
    localHits: 0,
    publicHits: 0,
    localTotalMs: 0,
    publicTotalMs: 0,
    localMaxMs: 0,
    publicMaxMs: 0,
  };
  const localAvgMs = s.localHits > 0 ? parseFloat((s.localTotalMs / s.localHits).toFixed(1)) : 0;
  const publicAvgMs = s.publicHits > 0 ? parseFloat((s.publicTotalMs / s.publicHits).toFixed(1)) : 0;
  
  return {
    localHits: s.localHits,
    publicHits: s.publicHits,
    localAvgMs,
    publicAvgMs
  };
}

export function resetStatsForSlug(slug: string) {
  const targetSlug = slug || defaultSlug;
  if (statsStore[targetSlug]) {
    statsStore[targetSlug].localHits = 0;
    statsStore[targetSlug].publicHits = 0;
    statsStore[targetSlug].localTotalMs = 0;
    statsStore[targetSlug].publicTotalMs = 0;
    statsStore[targetSlug].localMaxMs = 0;
    statsStore[targetSlug].publicMaxMs = 0;
  }
}

/**
 * Flush this worker's HTTP delta and active users (WebSocket + HTTP) to Redis every 5 seconds
 * so that all 4 PM2 cluster instances are aggregated accurately.
 */
async function flushWorkerTelemetryToRedis(): Promise<void> {
  try {
    const redis = getRedisConnection() as any;
    if (!redis) return;

    // 1. Flush HTTP delta if there were any requests on this worker
    const dLocalHits = workerDeltaBuffer.localHits;
    const dPublicHits = workerDeltaBuffer.publicHits;
    const dLocalMs = workerDeltaBuffer.localTotalMs;
    const dPublicMs = workerDeltaBuffer.publicTotalMs;
    const dLocalMax = workerDeltaBuffer.localMaxMs;
    const dPublicMax = workerDeltaBuffer.publicMaxMs;

    workerDeltaBuffer.localHits = 0;
    workerDeltaBuffer.publicHits = 0;
    workerDeltaBuffer.localTotalMs = 0;
    workerDeltaBuffer.publicTotalMs = 0;
    workerDeltaBuffer.localMaxMs = 0;
    workerDeltaBuffer.publicMaxMs = 0;

    if (dLocalHits > 0 || dPublicHits > 0) {
      const pipeline = redis.pipeline();
      if (dLocalHits > 0) {
        pipeline.hincrby(REDIS_HTTP_WINDOW_KEY, 'localHits', dLocalHits);
        pipeline.hincrbyfloat(REDIS_HTTP_WINDOW_KEY, 'localTotalMs', dLocalMs);
      }
      if (dPublicHits > 0) {
        pipeline.hincrby(REDIS_HTTP_WINDOW_KEY, 'publicHits', dPublicHits);
        pipeline.hincrbyfloat(REDIS_HTTP_WINDOW_KEY, 'publicTotalMs', dPublicMs);
      }
      pipeline.expire(REDIS_HTTP_WINDOW_KEY, 600);
      await pipeline.exec();

      // Update max latency atomically if higher
      if (dLocalMax > 0 || dPublicMax > 0) {
        const currentMaxRaw = await redis.hmget(REDIS_HTTP_WINDOW_KEY, 'localMaxMs', 'publicMaxMs');
        const curLocalMax = Number(currentMaxRaw?.[0] || 0);
        const curPublicMax = Number(currentMaxRaw?.[1] || 0);
        const nextUpdates: Record<string, number> = {};
        if (dLocalMax > curLocalMax) nextUpdates.localMaxMs = dLocalMax;
        if (dPublicMax > curPublicMax) nextUpdates.publicMaxMs = dPublicMax;
        if (Object.keys(nextUpdates).length > 0) {
          await redis.hset(REDIS_HTTP_WINDOW_KEY, nextUpdates);
        }
      }
    }

    // 2. Prune stale HTTP active users (> 3 minutes) & combine with WebSocket presence on this worker
    const now = Date.now();
    const combinedByTenant: Record<string, string[]> = {};
    const wsByTenant = presenceService.getActiveUserIdsByTenant();

    for (const [tId, uids] of Object.entries(wsByTenant)) {
      combinedByTenant[tId] = [...uids];
    }

    for (const [tId, userMap] of httpActiveUsersByTenant.entries()) {
      for (const [uid, seenAt] of userMap.entries()) {
        if (now - seenAt > HTTP_ACTIVE_WINDOW_MS) {
          userMap.delete(uid);
        }
      }
      if (userMap.size === 0) {
        httpActiveUsersByTenant.delete(tId);
        continue;
      }
      const existing = new Set(combinedByTenant[tId] || []);
      for (const uid of userMap.keys()) {
        existing.add(uid);
      }
      combinedByTenant[tId] = Array.from(existing);
    }

    await redis.set(
      `${REDIS_WORKER_PRESENCE_PREFIX}${process.pid}`,
      JSON.stringify({ pid: process.pid, updatedAt: now, tenants: combinedByTenant }),
      'EX',
      30
    );
  } catch {
    // Non-blocking if Redis is temporarily unavailable
  }
}

export function startClusterTelemetryFlusher(): void {
  if (clusterFlushTimerStarted) return;
  clusterFlushTimerStarted = true;
  setInterval(() => {
    flushWorkerTelemetryToRedis();
  }, 5000);
}

/**
 * Get cluster-wide active user counts across all PM2 workers (WebSocket + HTTP active users)
 */
export async function getClusterActiveUsers(): Promise<{
  globalActiveUsers: number;
  byTenant: Record<string, number>;
}> {
  await flushWorkerTelemetryToRedis();
  const byTenantSets: Record<string, Set<string>> = {};
  const globalSet = new Set<string>();

  try {
    const redis = getRedisConnection() as any;
    if (redis) {
      const keys: string[] = await redis.keys(`${REDIS_WORKER_PRESENCE_PREFIX}*`);
      if (keys.length > 0) {
        const payloads = await redis.mget(...keys);
        for (const raw of payloads) {
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const tenantsObj = parsed?.tenants || {};
            for (const [tId, uids] of Object.entries(tenantsObj)) {
              if (!Array.isArray(uids)) continue;
              if (!byTenantSets[tId]) byTenantSets[tId] = new Set();
              for (const uid of uids) {
                const sUid = String(uid);
                byTenantSets[tId].add(sUid);
                globalSet.add(sUid);
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  // Fallback to local worker presence if Redis returned nothing
  if (globalSet.size === 0) {
    const localWs = presenceService.getActiveUserIdsByTenant();
    for (const [tId, uids] of Object.entries(localWs)) {
      if (!byTenantSets[tId]) byTenantSets[tId] = new Set();
      for (const uid of uids) {
        byTenantSets[tId].add(uid);
        globalSet.add(uid);
      }
    }
  }

  const byTenant: Record<string, number> = {};
  for (const [tId, set] of Object.entries(byTenantSets)) {
    byTenant[tId] = set.size;
  }

  return {
    globalActiveUsers: globalSet.size,
    byTenant,
  };
}

export async function consumeIntervalStats(): Promise<{
  localHits: number;
  publicHits: number;
  totalHits: number;
  localAvgMs: number;
  publicAvgMs: number;
  overallAvgMs: number;
  maxResponseTimeMs: number;
}> {
  await flushWorkerTelemetryToRedis();

  let totalLocalHits = 0;
  let totalLocalMs = 0;
  let totalPublicHits = 0;
  let totalPublicMs = 0;
  let maxLocalMs = 0;
  let maxPublicMs = 0;

  try {
    const redis = getRedisConnection() as any;
    if (redis) {
      const data = await redis.hgetall(REDIS_HTTP_WINDOW_KEY);
      if (data && Object.keys(data).length > 0) {
        await redis.del(REDIS_HTTP_WINDOW_KEY);
        totalLocalHits = Number(data.localHits || 0);
        totalLocalMs = Number(data.localTotalMs || 0);
        totalPublicHits = Number(data.publicHits || 0);
        totalPublicMs = Number(data.publicTotalMs || 0);
        maxLocalMs = Number(data.localMaxMs || 0);
        maxPublicMs = Number(data.publicMaxMs || 0);
      }
    }
  } catch {}

  // Fallback to local process statsStore if Redis was empty
  if (totalLocalHits === 0 && totalPublicHits === 0) {
    for (const k of Object.keys(statsStore)) {
      totalLocalHits += statsStore[k].localHits || 0;
      totalLocalMs += statsStore[k].localTotalMs || 0;
      totalPublicHits += statsStore[k].publicHits || 0;
      totalPublicMs += statsStore[k].publicTotalMs || 0;
      if ((statsStore[k].localMaxMs || 0) > maxLocalMs) maxLocalMs = statsStore[k].localMaxMs || 0;
      if ((statsStore[k].publicMaxMs || 0) > maxPublicMs) maxPublicMs = statsStore[k].publicMaxMs || 0;

      statsStore[k].localHits = 0;
      statsStore[k].localTotalMs = 0;
      statsStore[k].publicHits = 0;
      statsStore[k].publicTotalMs = 0;
      statsStore[k].localMaxMs = 0;
      statsStore[k].publicMaxMs = 0;
    }
  } else {
    // Also reset local statsStore per-interval counters
    for (const k of Object.keys(statsStore)) {
      statsStore[k].localHits = 0;
      statsStore[k].localTotalMs = 0;
      statsStore[k].publicHits = 0;
      statsStore[k].publicTotalMs = 0;
      statsStore[k].localMaxMs = 0;
      statsStore[k].publicMaxMs = 0;
    }
  }

  const localAvgMs = totalLocalHits > 0 ? parseFloat((totalLocalMs / totalLocalHits).toFixed(1)) : 0;
  const publicAvgMs = totalPublicHits > 0 ? parseFloat((totalPublicMs / totalPublicHits).toFixed(1)) : 0;
  const grandHits = totalLocalHits + totalPublicHits;
  const overallAvgMs = grandHits > 0 ? parseFloat(((totalLocalMs + totalPublicMs) / grandHits).toFixed(1)) : (localAvgMs || publicAvgMs || 0);
  const maxResponseTimeMs = Math.max(maxLocalMs, maxPublicMs, overallAvgMs);

  return {
    localHits: totalLocalHits,
    publicHits: totalPublicHits,
    totalHits: grandHits,
    localAvgMs,
    publicAvgMs,
    overallAvgMs,
    maxResponseTimeMs
  };
}

/**
 * Memeriksa apakah suatu alamat IP tergolong IP Lokal LAN Sekolah (misal 10.10.10.x, 192.168.x.x, 127.0.0.1)
 * PERHATIAN: IP Subnet WireGuard Tunnel (10.0.0.x, 10.8.0.x, 10.200.0.x) BUKAN LAN lokal, melainkan lalu lintas PUBLIK dari VPS!
 */
function isSchoolLanIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;

  // IP Interface Subnet WireGuard VPN Tunnel (10.0.0.x, 10.8.0.x, 10.200.0.x) -> PASTI PUBLIK INTERNET!
  if (
    clean.startsWith('10.0.0.') || 
    clean.startsWith('10.8.0.') || 
    clean.startsWith('10.200.0.') ||
    clean.startsWith('10.13.13.')
  ) {
    return false; // Bukan LAN lokal, melainkan VPN Tunnel Publik
  }

  // IP Subnet LAN Sekolah (misal 10.10.10.x, 192.168.x.x, 172.16-31.x.x)
  if (clean.startsWith('10.10.10.') || clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;

  // Fallback 10.x jika bukan subnet WireGuard
  if (clean.startsWith('10.')) return true;

  return false;
}

export interface AccessRouteResult {
  route: 'LOCAL' | 'TUNNEL';
  label: 'Lokal' | 'Tunnel';
  clientIp: string;
}

export function detectAccessRoute(request: any): AccessRouteResult {
  if (!request) {
    return { route: 'LOCAL', label: 'Lokal', clientIp: '' };
  }

  // 1. Cek header eksplisit dari VPS reverse proxy
  const rawSource = request.headers?.['x-absenta-access-source'];
  const isWgTunnelHeader = 
    request.headers?.['x-wireguard-tunnel'] === 'true' || 
    request.headers?.['x-absenta-via-vps'] === 'true' ||
    request.headers?.['x-access-gateway'] === 'easy-tunnel' ||
    request.headers?.['x-gateway-mode'] === 'easy-tunnel';

  // 2. Ambil IP Klien Pertama dari X-Forwarded-For atau X-Real-IP
  const forwardedFor = request.headers?.['x-forwarded-for'];
  let clientIp = '';
  if (forwardedFor) {
    const ips = String(forwardedFor).split(',').map((s: string) => s.trim());
    clientIp = ips[0] || '';
  } else {
    clientIp = request.headers?.['x-real-ip'] || request.ip || request.raw?.socket?.remoteAddress || '';
  }

  // Jika IP Klien pertama bukan IP LAN Sekolah (atau merupakan IP Publik / Subnet WireGuard), maka Publik/Tunnel!
  const isPublicClientIp = !isSchoolLanIp(clientIp);

  const isTunnel = rawSource === 'public' || isWgTunnelHeader || isPublicClientIp;

  return {
    route: isTunnel ? 'TUNNEL' : 'LOCAL',
    label: isTunnel ? 'Tunnel' : 'Lokal',
    clientIp,
  };
}

export async function accessSourceMiddleware(request: any, _reply: any) {
  const startTime = Date.now();
  (request as any)._startTime = startTime;

  const detected = detectAccessRoute(request);
  (request as any).accessRoute = detected.route;
  (request as any).accessLabel = detected.label;
  (request as any).detectedClientIp = detected.clientIp;
  (request as any).accessSource = detected.route === 'TUNNEL' ? 'PUBLIC_INTERNET' : 'LAN_SCHOOL';
}

export function registerTelemetryHook(fastify: any) {
  startClusterTelemetryFlusher();
  fastify.addHook('onRequest', accessSourceMiddleware);

  fastify.addHook('onResponse', async (request: any, _reply: any) => {
    const startTime = (request as any)._startTime;
    if (!startTime) return;

    const duration = Date.now() - startTime;
    const isPublic = (request as any).accessSource === 'PUBLIC_INTERNET';

    // Extract slug dari host (e.g. "smkn1pld.absenta.id" -> "smkn1pld")
    const host = request.headers.host || '';
    const hostClean = host.split(':')[0].toLowerCase();
    const parts = hostClean.split('.');
    
    let slug = '';
    if (parts.length >= 1 && parts[0] && parts[0] !== 'localhost' && !parts[0].includes('10.10.10')) {
      slug = parts[0];
    }
    if (!slug) slug = defaultSlug;

    if (!statsStore[slug]) {
      statsStore[slug] = { localHits: 0, publicHits: 0, localTotalMs: 0, publicTotalMs: 0, localMaxMs: 0, publicMaxMs: 0 };
    }

    if (isPublic) {
      statsStore[slug].publicHits += 1;
      statsStore[slug].publicTotalMs += duration;
      if (duration > statsStore[slug].publicMaxMs) statsStore[slug].publicMaxMs = duration;

      workerDeltaBuffer.publicHits += 1;
      workerDeltaBuffer.publicTotalMs += duration;
      if (duration > workerDeltaBuffer.publicMaxMs) workerDeltaBuffer.publicMaxMs = duration;
    } else {
      statsStore[slug].localHits += 1;
      statsStore[slug].localTotalMs += duration;
      if (duration > statsStore[slug].localMaxMs) statsStore[slug].localMaxMs = duration;

      workerDeltaBuffer.localHits += 1;
      workerDeltaBuffer.localTotalMs += duration;
      if (duration > workerDeltaBuffer.localMaxMs) workerDeltaBuffer.localMaxMs = duration;
    }

    // Track active authenticated user from HTTP request (covers CBT students even if WS is on another worker)
    try {
      const reqUser = (request as any).user;
      const uid = reqUser?.id || reqUser?.userId || reqUser?.sub;
      const tId = reqUser?.tenantId || reqUser?.tenant_id || (request as any).tenantId;
      if (uid && tId) {
        const sTenant = String(tId);
        const sUser = String(uid);
        if (!httpActiveUsersByTenant.has(sTenant)) {
          httpActiveUsersByTenant.set(sTenant, new Map());
        }
        httpActiveUsersByTenant.get(sTenant)!.set(sUser, Date.now());
      }
    } catch {}

    // ── Real-time Instant Broadcast via WebSocket Socket.IO ──
    try {
      const ioApi = (globalThis as any).__ioApi || (fastify as any).ioApi;
      const io = (globalThis as any).__io || (fastify as any).io;
      const socketServer = ioApi || io;

      if (socketServer) {
        const localAvg = statsStore[slug].localHits > 0
          ? parseFloat((statsStore[slug].localTotalMs / statsStore[slug].localHits).toFixed(1))
          : 2.4;
        const publicAvg = statsStore[slug].publicHits > 0
          ? parseFloat((statsStore[slug].publicTotalMs / statsStore[slug].publicHits).toFixed(1))
          : 28.1;

        const now = new Date();
        socketServer.to('easytunnel:telemetry').emit('easytunnel:telemetry_update', {
          slug,
          timestamp: now.toISOString(),
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lanMs: isPublic ? localAvg : duration,
          vpnMs: isPublic ? duration : publicAvg,
          latestSource: isPublic ? 'PUBLIC_INTERNET' : 'LAN_SCHOOL',
          latestDurationMs: duration,
          localHits: statsStore[slug].localHits,
          publicHits: statsStore[slug].publicHits
        });
      }
    } catch {
      // ignore socket emission errors
    }
  });
}
