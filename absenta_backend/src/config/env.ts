import { DEFAULT_API_PORT } from '@/utils/url-helper';
type Level = 'error' | 'warn' | 'info';

function log(level: Level, msg: string) {
  const t = new Date().toISOString();
  const line = `[ENV][${level.toUpperCase()}] ${t} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function exists(name: string): boolean {
  return String(process.env[name] || '').trim().length > 0;
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeBool(name: string): void {
  if (!exists(name)) return;
  const raw = String(process.env[name] || '').trim().toLowerCase();
  const truthy = ['true', '1', 'yes', 'y', 'on'];
  const falsy = ['false', '0', 'no', 'n', 'off'];
  if (truthy.includes(raw)) process.env[name] = 'true';
  else if (falsy.includes(raw)) process.env[name] = 'false';
  else log('warn', `Boolean-like env has non-boolean value: ${name}="${raw}" (expected true/false)`);
}

export function validateEnv(): void {
  const critical = ['DATABASE_URL', 'JWT_SECRET'];
  const missingCritical = critical.filter((k) => !exists(k));
  if (missingCritical.length > 0) {
    throw new Error(`Missing critical environment variables: ${missingCritical.join(', ')}`);
  }
  if (!exists('API_URL') && !exists('PUBLIC_API_URL') && !exists('PUBLIC_APP_URL')) {
    log('warn', 'Critical environment variables missing: API_URL or PUBLIC_API_URL. Using helper defaults.');
  }


  const warnIfMissing = [
    'API_URL',
    'FRONTEND_URL',
    'MAIN_DOMAIN',
    'PUBLIC_API_URL',
    'REDIS_MODE',
    'WORKER_ROLE',
    'WORKER_VERSION',
    'APP_VERSION',
    'NODE_ID',

  ];
  for (const k of warnIfMissing) {
    if (!exists(k)) log('warn', `Optional env missing: ${k}`);
  }

  const redisMode = String(process.env.REDIS_MODE || 'single').trim().toLowerCase();
  if (redisMode === 'sentinel') {
    if (!exists('REDIS_SENTINEL_HOSTS')) log('warn', 'Optional env missing: REDIS_SENTINEL_HOSTS');
    if (!exists('REDIS_SENTINEL_NAME')) log('warn', 'Optional env missing: REDIS_SENTINEL_NAME');
  } else if (redisMode === 'cluster') {
    if (!exists('REDIS_CLUSTER_NODES')) log('warn', 'Optional env missing: REDIS_CLUSTER_NODES');
  } else {
    if (!exists('REDIS_URL')) log('warn', 'Optional env missing: REDIS_URL');
  }

  // URL validation (if set)
  const urlVars = ['API_URL', 'FRONTEND_URL', 'PUBLIC_API_URL', 'FACE_EMBEDDING_URL', 'WHATSAPP_API_URL'];

  for (const v of urlVars) {
    const val = String(process.env[v] || '').trim();
    if (!val) continue;
    if (!isHttpUrl(val)) {
      throw new Error(`Invalid URL format for ${v}. Use full URL like "https://domain.tld"`);
    }
  }

  // NODE_ENV validation
  const env = String(process.env.NODE_ENV || '').trim().toLowerCase();
  if (env && !['development', 'production', 'test'].includes(env)) {
    throw new Error(`Invalid NODE_ENV "${process.env.NODE_ENV}". Allowed: development | production | test`);
  }

  // PORT validation (if set) or default
  const portStr = String(process.env.PORT || String(DEFAULT_API_PORT)).trim();
  const portNum = Number.parseInt(portStr, 10);
  if (Number.isNaN(portNum) || portNum <= 0 || portNum >= 65535) {
    throw new Error(`Invalid PORT "${portStr}". Must be integer between 1 and 65534`);
  }
  process.env.PORT = String(portNum);

  // Normalize boolean flags
  ['NOTIFICATIONS_ENABLED', 'MAINTENANCE_MODE', 'ENABLE_PDF_QUEUE', 'DEV_ALLOW_LOCALHOST_LOGIN', 'HIGHEST_LEVEL_DEBUG', 'CORS_ALLOW_ALL', 'EMBEDDED_WORKERS'].forEach(
    normalizeBool
  );

  if (!exists('DEPLOYMENT_MODE')) {
    process.env.DEPLOYMENT_MODE = 'ON_PREMISE';
  }

  const paymentRequired: string[] = [];
  const missingPayment = paymentRequired.filter((k) => !exists(k));
  if (missingPayment.length > 0) {
    log('warn', `Payment env missing (skip in dev ok): ${missingPayment.join(', ')}`);
  }

  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    if ((process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true') {
      log('warn', 'CORS_ALLOW_ALL is true in production');
    }
  }
}
