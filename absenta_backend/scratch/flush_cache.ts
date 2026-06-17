import { cacheService } from './src/utils/cache.service';

async function flush() {
  console.log('🧹 Flushing sidebar cache patterns...');
  await cacheService.deletePattern('sidebar:user:*');
  console.log('✅ Sidebar cache cleared.');
}

flush().catch(console.error).finally(() => process.exit(0));
