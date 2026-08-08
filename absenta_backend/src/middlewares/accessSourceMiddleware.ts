interface TunnelStats {
  localHits: number;
  publicHits: number;
  localTotalMs: number;
  publicTotalMs: number;
  lastHandshake?: Date;
}

// In-Memory Stats Store per Slug
const statsStore: Record<string, TunnelStats> = {};
let defaultSlug = 'smkn1pld';

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
  const s = statsStore[targetSlug] || statsStore[defaultSlug] || { localHits: 0, publicHits: 0, localTotalMs: 0, publicTotalMs: 0 };
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
  }
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

export async function accessSourceMiddleware(request: any, _reply: any) {
  const startTime = Date.now();
  (request as any)._startTime = startTime;

  // 1. Cek header eksplisit dari VPS reverse proxy
  const rawSource = request.headers['x-absenta-access-source'];
  const isWgTunnelHeader = request.headers['x-wireguard-tunnel'] === 'true' || request.headers['x-absenta-via-vps'] === 'true';

  // 2. Ambil IP Klien Pertama dari X-Forwarded-For atau X-Real-IP
  const forwardedFor = request.headers['x-forwarded-for'];
  let clientIp = '';
  if (forwardedFor) {
    // Ambil IP pertama di rantai proxy X-Forwarded-For
    const ips = String(forwardedFor).split(',').map(s => s.trim());
    clientIp = ips[0] || '';
  } else {
    clientIp = request.headers['x-real-ip'] || request.ip || '';
  }

  // Jika IP Klien pertama bukan IP LAN Sekolah (atau merupakan IP Publik / Subnet WireGuard), maka Publik!
  const isPublicClientIp = !isSchoolLanIp(clientIp);

  const isPublic = rawSource === 'public' || isWgTunnelHeader || isPublicClientIp;
  (request as any).accessSource = isPublic ? 'PUBLIC_INTERNET' : 'LAN_SCHOOL';
}

export function registerTelemetryHook(fastify: any) {
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
