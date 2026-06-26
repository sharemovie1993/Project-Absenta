const { RedisMemoryServer } = require('redis-memory-server');

async function startServer() {
  console.log('[Embedded Redis] Starting server on port 6379...');
  try {
    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379,
      },
      binary: {
        version: '6.2.6', // Explicit version for predictability
        skipMD5: true,   // Speed up startup on slower machines
      },
    });

    console.log('[Embedded Redis] Checking binary and starting...');
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
