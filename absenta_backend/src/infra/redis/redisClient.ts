import IORedis, { Cluster, Redis } from 'ioredis';

export type RedisMode = 'single' | 'sentinel' | 'cluster';
export type RedisClient = Redis | Cluster;

function getRedisMode(): RedisMode {
  const raw = String(process.env.REDIS_MODE || 'single').trim().toLowerCase();
  if (raw === 'sentinel') return 'sentinel';
  if (raw === 'cluster') return 'cluster';
  return 'single';
}

function getRedisPassword(): string {
  return String(process.env.REDIS_PASSWORD || '').trim();
}

function getRedisUrl(): string {
  const envUrl = String(process.env.REDIS_URL || '').trim();
  const password = getRedisPassword();
  const base = envUrl.length > 0 ? envUrl : 'redis://localhost:6379';
  if (password.length === 0) return base;
  if (!base.startsWith('redis://')) return base;
  if (base.includes('@')) return base;
  return base.replace('redis://', `redis://:${password}@`);
}

function parseHostPortList(list: string): Array<{ host: string; port: number }> {
  return String(list || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((hp) => {
      const idx = hp.lastIndexOf(':');
      if (idx <= 0) return { host: hp, port: 6379 };
      const host = hp.slice(0, idx).trim();
      const port = parseInt(hp.slice(idx + 1).trim() || '0', 10);
      return { host, port: Number.isFinite(port) && port > 0 ? port : 6379 };
    })
    .filter((x) => Boolean(x.host));
}

function createClient(): RedisClient {
  const mode = getRedisMode();
  const password = getRedisPassword();
  
  if (mode === 'sentinel') {
    const sentinels = parseHostPortList(String(process.env.REDIS_SENTINEL_HOSTS || '').trim());
    const name = String(process.env.REDIS_SENTINEL_NAME || '').trim();
    if (!sentinels.length || !name) {
      throw new Error('Missing REDIS_SENTINEL_HOSTS or REDIS_SENTINEL_NAME');
    }
    return new IORedis({
      sentinels,
      name,
      password: password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 500, 10000),
      reconnectOnError: (err) => {
        const msg = String(err?.message || '').toLowerCase();
        return msg.includes('read only') || msg.includes('readonly') || (err as any)?.code === 'EPIPE';
      },
    });
  }

  if (mode === 'cluster') {
    const nodes = parseHostPortList(String(process.env.REDIS_CLUSTER_NODES || '').trim());
    if (!nodes.length) {
      throw new Error('Missing REDIS_CLUSTER_NODES');
    }
    return new (IORedis as any).Cluster(nodes, {
      redisOptions: {
        password: password || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 5000,
        reconnectOnError: (err: any) => {
          const msg = String(err?.message || '').toLowerCase();
          return msg.includes('read only') || msg.includes('readonly') || err?.code === 'EPIPE';
        },
      },
      clusterRetryStrategy: (times: number) => Math.min(times * 500, 10000),
    });
  }

  const url = getRedisUrl();
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 500, 10000),
    reconnectOnError: (err) => {
      const msg = String(err?.message || '').toLowerCase();
      return msg.includes('read only') || msg.includes('readonly') || (err as any)?.code === 'EPIPE';
    },
  });
}

let sharedClient: RedisClient | null = null;
let loggedMode = false;

export function getRedisConnection(): any {
  if (sharedClient) return sharedClient;
  if (!loggedMode) {
    loggedMode = true;
    const mode = getRedisMode();
    console.log(`redis_mode_${mode}`);
  }
  sharedClient = createClient();
  return sharedClient;
}

export function createRedisConnection(): any {
  if (!loggedMode) {
    loggedMode = true;
    const mode = getRedisMode();
    console.log(`redis_mode_${mode}`);
  }
  return createClient();
}

export async function verifyRedisConnection(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    await (redis as any).ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedisConnections(): Promise<void> {
  try {
    if (sharedClient) {
      await (sharedClient as any).quit();
    }
  } catch {
  } finally {
    sharedClient = null;
  }
}
