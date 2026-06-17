import { cacheService } from './src/utils/cache.service';

async function clearCache() {
  console.log('🧹 Clearing feature state and sidebar caches...');
  await cacheService.deletePattern('feature_state:*');
  await cacheService.deletePattern('sidebar:user:*');
  console.log('✅ Cache cleared.');
  process.exit(0);
}

clearCache().catch(err => {
  console.error('❌ Failed to clear cache:', err);
  process.exit(1);
});
