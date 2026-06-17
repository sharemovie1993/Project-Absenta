const { cacheService } = require('./src/utils/cache.service');

async function flush() {
  console.log('🧹 Flushing sidebar cache patterns...');
  await cacheService.deletePattern('sidebar:user:*');
  console.log('✅ Sidebar cache cleared.');
}

// Since cacheService might be an instance, I'll try to find it
// Or I'll just use the underlying redis/memory if I can, but I'll try the service first.
// However, the service uses process.env.REDIS_URL to decide.

flush().catch(console.error).finally(() => process.exit(0));
