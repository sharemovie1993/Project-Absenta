const { RedisMemoryServer } = require('redis-memory-server');
const path = require('path');

async function startServer() {
  console.log('[Embedded Redis] Starting server on port 6379...');
  try {
    // Patch to prevent terminal popup on Windows for Memurai/Redis binary
    if (process.platform === 'win32') {
      const child_process = require('child_process');
      const originalSpawn = child_process.spawn;
      const originalSpawnSync = child_process.spawnSync;
      
      child_process.spawn = function(command, args, options) {
        return originalSpawn.call(this, command, args, { ...options, windowsHide: true });
      };
      
      child_process.spawnSync = function(command, args, options) {
        return originalSpawnSync.call(this, command, args, { ...options, windowsHide: true });
      };
    }

    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379,
      },
      binary: {
        version: '6.2.6',
        skipMD5: true,
        // Use a more stable directory outside node_modules to avoid permission issues on some Windows setups
        downloadDir: path.join(process.cwd(), '.redis-bin'),
      },
      autoStart: false,
    });

    console.log('[Embedded Redis] Starting (silent mode)...');
    await redisServer.start();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    console.log(`[Embedded Redis] SUCCESS: Server is running at ${host}:${port}`);
    
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
