const { RedisMemoryServer } = require('redis-memory-server');

async function startServer() {
  console.log('[Embedded Redis] Starting server on port 6379...');
  try {
    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379,
        ip: '127.0.0.1'
      },
    });

    await redisServer.start();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    console.log(`[Embedded Redis] SUCCESS: Server is running at ${host}:${port}`);
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      await redisServer.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await redisServer.stop();
      process.exit(0);
    });

  } catch (err) {
    console.error('[Embedded Redis] FAILED to start:', err.message || err);
    // If already running, we just stay alive to satisfy PM2
    if (err.message && err.message.includes('EADDRINUSE')) {
      console.log('[Embedded Redis] Port 6379 already in use. Assuming another instance or Laragon is running.');
      // Keep alive anyway
      setInterval(() => {}, 1000);
    } else {
      process.exit(1);
    }
  }
}

startServer();
