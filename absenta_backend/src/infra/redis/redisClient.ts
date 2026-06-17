import IORedis, { Cluster, Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

export type RedisMode = 'single' | 'sentinel' | 'cluster' | 'embedded';
export type RedisClient = Redis | Cluster;

let redisMemoryServer: RedisMemoryServer | null = null;
let sharedClient: RedisClient | null = null;
let loggedMode = false;

function getRedisMode(): RedisMode {
  const raw = String(process.env.REDIS_MODE || 'single').trim().toLowerCase();
  if (raw === 'sentinel') return 'sentinel';
  if (raw === 'cluster') return 'cluster';
  if (raw === 'embedded') return 'embedded';
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

async function createClient(): Promise<RedisClient> {
  const mode = getRedisMode();
  const password = getRedisPassword();
  
  if (mode === 'embedded') {
    // In cluster mode, only the first instance should start the server
    // Others should just connect to it. We use a simple port lock or check.
    const isPrimaryInstance = process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE;
    const redisPort = 6379;

    if (isPrimaryInstance && !redisMemoryServer) {
      console.log('[Redis] Primary Instance starting Embedded Redis Server...');
      try {
        // Ensure no previous server is hanging
        redisMemoryServer = new RedisMemoryServer({
          instance: {
            port: redisPort,
            ip: '127.0.0.1'
          },
        });
        await redisMemoryServer.start();
        console.log(`[Redis] Embedded Redis started on 127.0.0.1:${redisPort}`);
      } catch (err: any) {
        if (err.message?.includes('EADDRINUSE') || err.message?.includes('already in use')) {
          console.log('[Redis] Port 6379 already in use, assuming another instance started it.');
        } else {
          console.error('[Redis] Failed to start embedded server:', err);
        }
      }
    } else {
      // Non-primary instances wait longer to ensure primary has finished starting the server
      // and we add a retry logic for the connection
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return new IORedis(`redis://127.0.0.1:${redisPort}`, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 20000, // Increase timeout for slower startup
      retryStrategy: (times) => {
        const delay = Math.min(times * 1000, 15000);
        console.log(`[Redis] Retrying connection in ${delay}ms... (attempt ${times})`);
        return delay;
      },
    });
  }

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

/**
 * Initializes the shared Redis connection.
 * MUST be called and awaited before any other redis calls.
 */
export async function initRedis(): Promise<RedisClient> {
  if (sharedClient) return sharedClient;
  if (!loggedMode) {
    loggedMode = true;
    const mode = getRedisMode();
    console.log(`[Redis] Initializing in mode: ${mode}`);
  }
  sharedClient = await createClient();
  return sharedClient;
}

/**
 * Synchronously returns the shared Redis connection.
 * Note: initRedis() must have been called before this.
 */
export function getRedisConnection(): any {
  return sharedClient;
}

export function createRedisConnection(): any {
  // This is problematic as it's synchronous but needs async for embedded
  // For now, we return the shared client as a fallback if not initialized
  return sharedClient;
}

export async function stopRedisConnection(): Promise<void> {
  if (sharedClient) {
    await sharedClient.quit();
    sharedClient = null;
  }
  if (redisMemoryServer) {
    await redisMemoryServer.stop();
    redisMemoryServer = null;
  }
}

export async function closeRedisConnections(): Promise<void> {
  await stopRedisConnection();
}

export async function verifyRedisConnection(): Promise<void> {
  if (!sharedClient) await initRedis();
  await sharedClient!.ping();
}
