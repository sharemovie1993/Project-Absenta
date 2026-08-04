import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { getRedisUrl } from '../../config/redis.config';
import { getSmartFrontendBaseUrl, getSmartApiBaseUrl, getDomainBases } from '../../utils/url-helper';
import { appLogger } from '../../utils/app-logger';

function getCorsOriginOption() {
  const corsDebug = (process.env.CORS_DEBUG || 'false').toLowerCase() === 'true';
  const getHostFromEnvUrl = (raw: string | undefined): string => {
    const v = String(raw || '').trim();
    if (!v) return '';
    try {
      return new URL(v).hostname.toLowerCase();
    } catch {
      try {
        return new URL(`https://${v}`).hostname.toLowerCase();
      } catch {
        return '';
      }
    }
  };

  const allowedBaseDomains = new Set<string>([
    ...getDomainBases().map(d => `.${d}`),
    ...getDomainBases(),
    'localhost',
  ]);

  const allowedExactHosts = new Set<string>([
    getHostFromEnvUrl(getSmartFrontendBaseUrl()),
    getHostFromEnvUrl(getSmartApiBaseUrl()),
    getHostFromEnvUrl(process.env.API_URL),
  ].filter(Boolean));

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    let ok = false;
    let reason = 'unknown';
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (allowedExactHosts.has(host)) {
        ok = true;
        reason = 'env_exact_host';
      } else if ([...allowedBaseDomains].some((d) => host === d || host.endsWith(`.${d}`))) {
        ok = true;
        reason = 'env_base_domain';
      } else if (process.env.NODE_ENV !== 'production' && (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host === '127.0.0.1' ||
        host === '10.10.10.250' ||
        /^192\.168\.\d+\.\d+$/.test(host) ||
        /^10\.\d+\.\d+\.\d+$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)
      )) {
        ok = true;
        reason = 'dev_localhost_or_lan';
      }
    } catch (err) {
      reason = 'origin_parse_error';
    }
    if (corsDebug) {
      console.log(`[Socket CORS] Decision for ${origin}: ${ok ? 'ALLOWED' : 'BLOCKED'} (${reason})`);
    }
    return callback(null, ok);
  };
}

export function createSocketServers(server: Server) {
  const redisUrl = getRedisUrl();
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  // Handle Redis connection errors to prevent app crash
  pubClient.on('error', (err) => appLogger.error({ error: err.message }, 'redis_adapter.pub_error'));
  subClient.on('error', (err) => appLogger.error({ error: err.message }, 'redis_adapter.sub_error'));

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    appLogger.info({}, 'redis_adapter.connected');
  }).catch(err => {
    appLogger.error({ error: err.message }, 'redis_adapter.connection_failed');
  });

  const corsOption = {
    origin: getCorsOriginOption(),
    credentials: true
  };

  const io = new SocketIOServer(server, {
    cors: corsOption,
    path: '/socket.io',
    pingTimeout: 30000,
    pingInterval: 25000,
    adapter: createAdapter(pubClient, subClient)
  });

  const ioApi = new SocketIOServer(server, {
    cors: corsOption,
    path: '/api/socket.io',
    pingTimeout: 30000,
    pingInterval: 25000,
    adapter: createAdapter(pubClient, subClient)
  });

  return { io, ioApi };
}

