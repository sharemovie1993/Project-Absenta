const { RedisMemoryServer } = require('redis-memory-server');
const path = require('path');

async function startServer() {
  console.log('[Embedded Redis] Starting server on port 6379...');
  process.title = 'absenta-redis';
  try {
    // Patch to prevent terminal popup on Windows for Memurai/Redis binary
    if (process.platform === 'win32') {
      const child_process = require('child_process');
      const originalSpawn = child_process.spawn;
      const originalSpawnSync = child_process.spawnSync;
      
      // We must preserve the context and ensure options object exists
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

    const os = require('os');
    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379,
      },
      binary: {
        version: '6.2.6',
        skipMD5: true,
        // Use the OS temp directory which usually has better execution permissions on Windows
        downloadDir: path.join(os.tmpdir(), 'absenta-redis-bin'),
      },
      autoStart: false,
    });

    console.log('[Embedded Redis] Starting (silent mode)...');
    await redisServer.start();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    console.log(`[Embedded Redis] SUCCESS: Server is running at ${host}:${port}`);
    
    // Signal PM2 that Redis is ready
    if (process.send) {
      process.send('ready');
    }
    
    // Explicitly keep the process alive
    setInterval(() => {}, 60000);

    // Keep the process alive
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
    console.error('[Embedded Redis] FAILED to start:', errorMsg);
    
    // If already running, we just stay alive to satisfy PM2
    if (errorMsg.includes('EADDRINUSE') || errorMsg.includes('code "1"')) {
      console.log('[Embedded Redis] Port 6379 may be in use or server already running. Staying alive for PM2...');
      // Keep alive anyway
      setInterval(() => {}, 60000);
    } else {
      process.exit(1);
    }
  }
}

startServer();
