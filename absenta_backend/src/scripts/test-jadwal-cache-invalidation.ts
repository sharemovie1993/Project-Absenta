import { prisma } from '../utils/prisma';
import { cacheService } from '../utils/cache.service';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { CACHE_KEYS } from '../constants/cache-keys';
import { jadwalKBMService } from '../modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
import { performance } from 'perf_hooks';

async function main() {
  console.log('🧪 Starting Jadwal KBM Cache Invalidation Scenario Test...\n');

  // Find system tenant or fallback
  const tenant = await prisma.tenant.findFirst({
    select: { id: true, name: true }
  });

  if (!tenant) {
    console.error('❌ No tenant found in DB to run test.');
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`🏢 Testing on Tenant: ${tenant.name} (${tenantId})`);

  // Find a guru to test
  const guru = await prisma.guru.findFirst({
    where: { tenant_id: tenantId },
    select: { id: true, nama_guru: true }
  });

  const testGuruId = guru?.id || 'test-guru-id-123';
  const testHari = 'SENIN';

  const cacheKey = CACHE_KEYS.ACADEMIC.JADWAL_GURU_TIMELINE(tenantId, testGuruId, testHari);

  // Step 1: Clear baseline cache
  await cacheService.delete(cacheKey);
  await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
  console.log('🧹 Baseline cache cleared.');

  // Step 2: First call (Expected: CACHE MISS, query DB)
  const start1 = performance.now();
  const res1 = await jadwalKBMService.getJadwalHariIniByGuru(testGuruId, tenantId, testHari);
  const duration1 = (performance.now() - start1).toFixed(2);
  console.log(`⏱️ Run 1 (Cache MISS): ${duration1} ms | Retrieved ${res1.items.length} items.`);

  // Verify key is in Redis
  const inCache1 = await cacheService.get(cacheKey);
  if (!inCache1) {
    console.error('❌ FAILED: Cache key was NOT stored in Redis after first fetch!');
    process.exit(1);
  }
  console.log('✅ PASS: Key successfully stored in Redis cache.');

  // Step 3: Second call (Expected: CACHE HIT, return from Redis)
  const start2 = performance.now();
  const res2 = await jadwalKBMService.getJadwalHariIniByGuru(testGuruId, tenantId, testHari);
  const duration2 = (performance.now() - start2).toFixed(2);
  const speedup = (parseFloat(duration1) / (parseFloat(duration2) || 0.01)).toFixed(1);
  console.log(`⚡ Run 2 (Cache HIT): ${duration2} ms | Speedup: ${speedup}x faster.`);

  if (JSON.stringify(res1) !== JSON.stringify(res2)) {
    console.error('❌ FAILED: Cached data does not match original query result!');
    process.exit(1);
  }
  console.log('✅ PASS: Data consistency verified between DB and Cache.');

  // Step 4: Trigger cache invalidation signal
  console.log('🔄 Triggering cache invalidation via cacheInvalidationService.invalidateJadwalKbmCache()...');
  await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

  const inCache2 = await cacheService.get(cacheKey);
  if (inCache2 !== null) {
    console.error('❌ FAILED: Cache key was NOT invalidated after invalidation call!');
    process.exit(1);
  }
  console.log('✅ PASS: Cache successfully purged upon invalidation signal.');

  // Step 5: Third call after invalidation (Expected: CACHE MISS again)
  const start3 = performance.now();
  const res3 = await jadwalKBMService.getJadwalHariIniByGuru(testGuruId, tenantId, testHari);
  const duration3 = (performance.now() - start3).toFixed(2);
  console.log(`🔄 Run 3 (Post-Invalidation Fresh Fetch): ${duration3} ms | Retrieved ${res3.items.length} items.`);

  console.log('\n🎉 ALL JADWAL KBM CACHE INVALIDATION SCENARIO TESTS PASSED SUCCESSFULLY! 🚀');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Test failed with unexpected error:', err);
  process.exit(1);
});
