import { FastifyRequest, FastifyReply } from 'fastify';

interface TunnelStats {
  localHits: number;
  publicHits: number;
  localTotalMs: number;
  publicTotalMs: number;
  lastHandshake?: Date;
}

// In-Memory Stats Store per Slug
const statsStore: Record<string, TunnelStats> = {};

export function getStatsForSlug(slug: string): {
  localHits: number;
  publicHits: number;
  localAvgMs: number;
  publicAvgMs: number;
} {
  const s = statsStore[slug] || { localHits: 0, publicHits: 0, localTotalMs: 0, publicTotalMs: 0 };
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
  if (statsStore[slug]) {
    statsStore[slug].localHits = 0;
    statsStore[slug].publicHits = 0;
    statsStore[slug].localTotalMs = 0;
    statsStore[slug].publicTotalMs = 0;
  }
}

export async function accessSourceMiddleware(request: any, reply: any) {
  const startTime = Date.now();

  // Attach start time to request
  (request as any)._startTime = startTime;

  // Determine access source
  const rawSource = request.headers['x-absenta-access-source'];
  const hasWireguardForward = request.headers['x-forwarded-proto'] || request.headers['x-forwarded-host'];
  const isPublic = rawSource === 'public' || !!hasWireguardForward;

  (request as any).accessSource = isPublic ? 'PUBLIC_INTERNET' : 'LAN_SCHOOL';
}

export function registerTelemetryHook(fastify: any) {
  fastify.addHook('onRequest', accessSourceMiddleware);

  fastify.addHook('onResponse', async (request: any, reply: any) => {
    const startTime = (request as any)._startTime;
    if (!startTime) return;

    const duration = Date.now() - startTime;
    const isPublic = (request as any).accessSource === 'PUBLIC_INTERNET';

    // Extract slug from hostname (e.g. "smkn1pld.absenta.id" -> "smkn1pld")
    const host = request.headers.host || '';
    const hostClean = host.split(':')[0].toLowerCase();
    const parts = hostClean.split('.');
    let slug = '';
    if (parts.length >= 3 && hostClean.endsWith('.absenta.id')) {
      slug = parts[0];
    }

    if (!slug) return;

    if (!statsStore[slug]) {
      statsStore[slug] = { localHits: 0, publicHits: 0, localTotalMs: 0, publicTotalMs: 0 };
    }

    if (isPublic) {
      statsStore[slug].publicHits += 1;
      statsStore[slug].publicTotalMs += duration;
    } else {
      statsStore[slug].localHits += 1;
      statsStore[slug].localTotalMs += duration;
    }
  });
}
