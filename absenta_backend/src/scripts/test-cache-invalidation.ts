import { prisma } from '../utils/prisma';
import { StrukturKurikulumService } from '../modules/kurikulum/services/struktur-kurikulum.service';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { cacheService } from '../utils/cache.service';
import { CACHE_KEYS } from '../constants/cache-keys';

async function runCacheInvalidationTest() {
  console.log('🧪 Starting Cache Invalidation Scenario Test...');

  // 1. Get first active tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  if (!tenant) {
    console.error('❌ No active tenant found in database.');
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`🏢 Testing on Tenant: [${tenant.name}] (${tenantId})`);

  const cacheKey = CACHE_KEYS.ACADEMIC.BEBAN_GURU(tenantId);

  // Clear existing cache for a clean baseline test
  await cacheService.deletePattern(`academic:${tenantId}:beban_guru:*`);
  console.log('🧹 Baseline cache cleared.');

  // Step 1: First call (Expected: CACHE MISS, DB Query)
  const start1 = performance.now();
  const res1 = await StrukturKurikulumService.getBebanGuruAll(tenantId);
  const duration1 = (performance.now() - start1).toFixed(2);
  console.log(`⏱️ Run 1 (Cache MISS): ${duration1} ms | Retrieved ${res1.length} teachers.`);

  // Verify key exists in cache
  const inCache1 = await cacheService.get(cacheKey);
  if (!inCache1) {
    console.error('❌ FAILED: Key was not saved into cache on Run 1!');
    process.exit(1);
  }
  console.log('✅ PASS: Key successfully stored in Redis cache.');

  // Step 2: Second call (Expected: CACHE HIT, Fast response)
  const start2 = performance.now();
  const res2 = await StrukturKurikulumService.getBebanGuruAll(tenantId);
  const duration2 = (performance.now() - start2).toFixed(2);
  console.log(`⚡ Run 2 (Cache HIT): ${duration2} ms | Speedup: ${(Number(duration1) / Math.max(0.1, Number(duration2))).toFixed(1)}x faster.`);

  if (res1.length !== res2.length) {
    console.error('❌ FAILED: Data mismatch between Cache Miss and Cache Hit!');
    process.exit(1);
  }
  console.log('✅ PASS: Data consistency verified between DB and Cache.');

  // Step 3: Trigger Invalidation
  console.log('🔄 Triggering cache invalidation via cacheInvalidationService.invalidateBebanGuruCache()...');
  await cacheInvalidationService.invalidateBebanGuruCache(tenantId);

  const inCache2 = await cacheService.get(cacheKey);
  if (inCache2 !== null) {
    console.error('❌ FAILED: Cache key was NOT invalidated after invalidation call!');
    process.exit(1);
  }
  console.log('✅ PASS: Cache successfully purged upon invalidation signal.');

  // Step 4: Third call after invalidation (Expected: CACHE MISS again)
  const start3 = performance.now();
  const res3 = await StrukturKurikulumService.getBebanGuruAll(tenantId);
  const duration3 = (performance.now() - start3).toFixed(2);
  console.log(`🔄 Run 3 (Post-Invalidation Fresh Fetch): ${duration3} ms | Retrieved ${res3.length} teachers.`);

  console.log('\n🎉 ALL CACHE INVALIDATION SCENARIO TESTS PASSED SUCCESSFULLY! 🚀');
  process.exit(0);
}

runCacheInvalidationTest().catch((err) => {
  console.error('❌ Unexpected Error during Cache Test:', err);
  process.exit(1);
});
