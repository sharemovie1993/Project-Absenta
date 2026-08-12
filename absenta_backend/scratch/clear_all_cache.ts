import { cacheService } from '../src/utils/cache.service';

async function clearCache() {
  console.log('🧹 Clearing ALL Redis & In-Memory Caches...');
  await cacheService.deletePattern('*');
  console.log('✅ ALL Cache cleared.');
  process.exit(0);
}

clearCache().catch(err => {
  console.error('❌ Failed to clear cache:', err);
  process.exit(1);
});
