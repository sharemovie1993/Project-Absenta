/**
 * Konstanta default untuk menghindari redundansi fallback di seluruh aplikasi.
 */
export const DEFAULT_API_PORT = 3001;
export const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
export const DEFAULT_SUPPORT_EMAIL = 'no-reply@localhost';

/**
 * Mendapatkan port API dari environment dengan satu titik fallback.
 */
export function getApiPort(): number {
  return parseInt(process.env.PORT || String(DEFAULT_API_PORT), 10);
}

/**
 * Mendapatkan Base URL API secara cerdas.
 */
export function getSmartApiBaseUrl(): string {
  // Prioritas semantic: API_URL > PUBLIC_API_URL > PUBLIC_APP_URL (legacy)
  const apiUrl = (process.env.API_URL || process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || '').trim();
  
  const port = getApiPort();
  const host = process.env.HOST || 'localhost';

  const result = apiUrl || `http://${host}:${port}`;
  if (result && !result.endsWith('/api') && !result.includes('/api/')) {
    return `${result.replace(/\/+$/, '')}/api`;
  }
  return result;
}


/**
 * Mendapatkan Base URL Frontend secara cerdas.
 */
export function getSmartFrontendBaseUrl(): string {
  const frontendUrl = (process.env.FRONTEND_URL || '').trim();
  return frontendUrl || DEFAULT_FRONTEND_URL;
}

/**
 * Helper universal untuk meresolusi Base URL dari request (digunakan di controller/routes).
 * Menghilangkan redundansi logika "resolve origin/referer/forwarded" yang tersebar.
 */
export function resolveBaseUrlFromRequest(request: any, options?: { fallbackVar?: string }): string {
  const normalize = (v: any) => String(v || '').trim().replace(/\/+$/, '');
  const isHttpUrl = (v: any) => /^https?:\/\//i.test(String(v || '').trim());

  // 1. Cek dari Environment Variable (Prioritas)
  if (options?.fallbackVar) {
    const envVal = normalize(process.env[options.fallbackVar]);
    if (envVal && isHttpUrl(envVal)) return envVal;
  }

  // 2. Cek FRONTEND_URL / PUBLIC_APP_URL default
  const envFront = normalize(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL);
  if (envFront && isHttpUrl(envFront)) return envFront;

  // 3. Cek Header Request (Origin / Referer)
  const origin = normalize(request?.headers?.origin);
  if (origin && isHttpUrl(origin)) return origin;


  const referer = normalize(request?.headers?.referer);
  if (referer && isHttpUrl(referer)) {
    try {
      return new URL(referer).origin;
    } catch {}
  }

  // 4. Derivasi dari Host/Forwarded-Host
  const protoRaw = String(request?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const proto = protoRaw === 'http' || protoRaw === 'https' ? protoRaw : 'https';
  const hostRaw = String(request?.headers?.['x-forwarded-host'] || request?.headers?.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (hostRaw) {
    const base = `${proto}://${hostRaw}`;
    // Defensive hardening: if we were explicitly looking for API_URL, ensure it has /api
    if (options?.fallbackVar === 'API_URL' || options?.fallbackVar === 'PUBLIC_API_URL') {
      if (!base.includes('/api')) return `${base}/api`;
    }
    return base;
  }

  // 5. Ultimate Fallback (Smart Helper)
  const finalBase = getSmartFrontendBaseUrl();
  
  // Defensive hardening: if we were explicitly looking for API_URL, ensure it has /api
  if (options?.fallbackVar === 'API_URL' || options?.fallbackVar === 'PUBLIC_API_URL') {
    if (finalBase && !finalBase.includes('/api') && !finalBase.includes('localhost:5173')) {
      return `${finalBase.replace(/\/+$/, '')}/api`;
    }
  }

  return finalBase;
}

/**
 * Mendapatkan daftar domain dasar (base domains) yang diizinkan sistem.
 * Digunakan untuk CORS, Tenant resolution, dan cookie domains.
 */
export function getDomainBases(): string[] {
  const splitCsv = (raw: any) =>
    String(raw || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const bases = new Set<string>();
  
  // Ambil dari variabel paling spesifik hingga umum
  const mainDomain = (process.env.MAIN_DOMAIN || '').trim().toLowerCase();
  if (mainDomain) bases.add(mainDomain);

  const publicDomainBase = (process.env.PUBLIC_DOMAIN_BASE || '').trim().toLowerCase();
  if (publicDomainBase) bases.add(publicDomainBase);

  const corsBases = splitCsv(process.env.CORS_WILDCARD_BASES);
  for (const v of corsBases) bases.add(v);

  // Jika masih kosong, coba ambil dari hostname API_URL atau FRONTEND_URL
  if (bases.size === 0) {
    const commonUrls = [process.env.API_URL, process.env.FRONTEND_URL, process.env.PUBLIC_APP_URL];
    for (const url of commonUrls) {
      if (!url) continue;
      try {
        const hostname = new URL(url).hostname;

        const parts = hostname.split('.');
        if (parts.length >= 2) {
          // Ambil domain utama (misal: myapp.com dari app.myapp.com)
          const base = parts.length >= 3 ? parts.slice(1).join('.') : parts.join('.');
          bases.add(base);
        }
      } catch {}
    }
  }

  // Fallback terakhir: localhost
  if (bases.size === 0) bases.add('localhost');

  return Array.from(bases);
}

/**
 * Mendapatkan URL Parent App secara cerdas berdasarkan tenant domain.
 */
export function getSmartParentAppUrl(tenantDomain?: string, tenantId?: string): string {
  const parentAppBase = (process.env.PARENT_APP_URL || process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  const scheme = (process.env.PUBLIC_APP_SCHEME || 'https').trim();
  const mainDomain = (process.env.MAIN_DOMAIN || '').trim().toLowerCase();
  
  // Get port from FRONTEND_URL if it's not standard
  let portStr = '';
  try {
    const feUrl = new URL(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL);
    if (feUrl.port && feUrl.port !== '80' && feUrl.port !== '443') {
      portStr = `:${feUrl.port}`;
    }
  } catch {}

  // IP Detection: If MAIN_DOMAIN is an IP, we don't use subdomains (invalid FQDN)
  const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(mainDomain);

  if (tenantDomain && !isIp) {
    // FIX: Jika tenantDomain sudah mengandung domain lengkap (misal: app.absenta.id), jangan tempelkan lagi mainDomain
    if (tenantDomain.includes('.') && (tenantDomain.endsWith(`.${mainDomain}`) || tenantDomain === mainDomain)) {
      return `${scheme}://${tenantDomain}${portStr}`;
    }
    const hostname = tenantDomain.includes('.') ? tenantDomain : `${tenantDomain}.${mainDomain}`;
    return `${scheme}://${hostname}${portStr}`;
  }

  // If IP, return base URL with port and optional tenantId param
  const baseUrl = `${scheme}://${mainDomain}${portStr}`;
  if (isIp && tenantId) {
    return `${baseUrl}/login?tenantId=${tenantId}`;
  }

  return parentAppBase || DEFAULT_FRONTEND_URL;
}


