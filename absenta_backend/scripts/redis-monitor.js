const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

async function main() {
  try {
    await redis.connect();
    console.log('[PM2 Redis Service] Connected to Redis successfully.');
  } catch (err) {
    console.warn('[PM2 Redis Service] Redis connection notice:', err.message);
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

main();
