const path = require('path');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

async function runMonitorMode(reason) {
  console.log(`[PM2 Redis Service] ${reason}. Running in monitor mode...`);
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    await redis.connect();
    console.log('[PM2 Redis Service] Connected to native Redis successfully.');
  } catch (err) {
    console.warn('[PM2 Redis Service] Redis connection notice:', err.message);
  }

  if (process.send) {
    process.send('ready');
  }

  setInterval(async () => {
    try {
      if (redis.status === 'ready') {
        await redis.ping();
      } else {
        await redis.connect();
      }
    } catch (_) {}
  }, 30000);
}

async function startServer() {
  process.title = 'absenta-redis';

  // 1. Check if Redis is already running on port 6379 (e.g. native Linux Redis service)
  try {
    const probe = new Redis(redisUrl, {
      connectTimeout: 1500,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
    });
    await probe.connect();
    await probe.ping();
    await probe.quit();
    return await runMonitorMode('Native Redis detected on port 6379');
  } catch (_) {
    // Native redis not reachable on port 6379, proceed to embedded redis
  }

  // 2. Try embedded redis-memory-server (primarily for Windows / local dev)
  let RedisMemoryServer;
  try {
    RedisMemoryServer = require('redis-memory-server').RedisMemoryServer;
  } catch (e) {
    return await runMonitorMode('redis-memory-server not installed; waiting for Redis');
  }

  console.log('[Embedded Redis] Starting server on port 6379...');
  try {
    // Patch to prevent terminal popup on Windows for Memurai/Redis binary
    if (process.platform === 'win32') {
      const child_process = require('child_process');
      const originalSpawn = child_process.spawn;
      const originalSpawnSync = child_process.spawnSync;
      
      child_process.spawn = function(command, args, options) {
        const opts = typeof args === 'object' && !Array.isArray(args) ? args : options;
        const actualArgs = Array.isArray(args) ? args : [];
        return originalSpawn.call(this, command, actualArgs, { ...opts, windowsHide: true });
      };
      
      child_process.spawnSync = function(command, args, options) {
        const opts = typeof args === 'object' && !Array.isArray(args) ? args : options;
        const actualArgs = Array.isArray(args) ? args : [];
        return originalSpawnSync.call(this, command, actualArgs, { ...opts, windowsHide: true });
      };
    }

    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379,
      },
      binary: {
        version: '6.2.6',
        skipMD5: true,
        downloadDir: path.join(__dirname, '../.redis-bin'),
      },
      autoStart: false,
    });

    console.log('[Embedded Redis] Starting (silent mode)...');
    await redisServer.start();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    console.log(`[Embedded Redis] SUCCESS: Server is running at ${host}:${port}`);
    
    if (process.send) {
      process.send('ready');
    }
    
    setInterval(() => {}, 60000);

    process.on('SIGINT', async () => {
      console.log('[Embedded Redis] Stopping server...');
      await redisServer.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('[Embedded Redis] Stopping server...');
      await redisServer.stop();
      process.exit(0);
    });

  } catch (err) {
    const errorMsg = err.message || String(err);
    console.error('[Embedded Redis] Notice during start:', errorMsg);
    
    if (errorMsg.includes('EADDRINUSE') || errorMsg.includes('code "1"')) {
      return await runMonitorMode('Port 6379 in use');
    } else {
      process.exit(1);
    }
  }
}

startServer();
