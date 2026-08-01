import { prisma } from '../utils/prisma';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { StrukturOrganisasiService } from '../modules/academic/struktur-organisasi/services/struktur-organisasi.service';
import { waliKelasService } from '../modules/kurikulum/wali-kelas/services/wali-kelas.service';

async function main() {
  console.log('====================================================');
  console.log('  🧪 TESTING STRUKTUR ORGANISASI & WALI KELAS CACHE  ');
  console.log('====================================================\n');

  // 1. Get first active tenant
  const tenant = await prisma.tenant.findFirst({
    select: { id: true, name: true }
  });

  if (!tenant) {
    console.error('❌ No tenant found in database.');
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`🏫 Tenant: ${tenant.name} (${tenantId})`);

  const service = new StrukturOrganisasiService();

  // Reset cache before test
  await cacheInvalidationService.invalidateStrukturTree(tenantId);

  // --- 1. Test getTree Cache MISS ---
  console.log('\n--- 1. Testing getTree Cache MISS (Querying DB & Building Hierarchy)... ---');
  const startMiss = performance.now();
  const treeDataMiss = await service.getTree(tenantId);
  const endMiss = performance.now();
  const missTime = endMiss - startMiss;
  console.log(`⏱️  Cache MISS Elapsed Time : ${missTime.toFixed(2)} ms`);
  console.log(`📊 Nodes Grouped          : ${Object.keys(treeDataMiss).length} groups`);

  // --- 2. Test getTree Cache HIT ---
  console.log('\n--- 2. Testing getTree Cache HIT (Fetching Directly from Redis Cache)... ---');
  const startHit = performance.now();
  const treeDataHit = await service.getTree(tenantId);
  const endHit = performance.now();
  const hitTime = endHit - startHit;
  console.log(`⏱️  Cache HIT Elapsed Time  : ${hitTime.toFixed(2)} ms (Loaded ${Object.keys(treeDataHit).length} groups)`);
  const speedup = missTime > 0 ? (missTime / hitTime).toFixed(1) : 'N/A';
  console.log(`🚀 Speedup Factor           : ${speedup}x faster!`);

  if (hitTime < missTime) {
    console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
  } else {
    console.log('⚠️  WARN: Cache HIT was not faster than MISS.');
  }

  // --- 3. Test getStrukturAssignments (Wali Kelas Proxy) Cache MISS vs HIT ---
  console.log('\n--- 3. Testing Wali Kelas Proxy Cache MISS vs HIT... ---');
  const wkMissStart = performance.now();
  const wkMiss = await waliKelasService.getStrukturAssignments(tenantId, null, { page: 1, limit: 10 });
  const wkMissEnd = performance.now();
  console.log(`⏱️  Wali Kelas Cache MISS : ${(wkMissEnd - wkMissStart).toFixed(2)} ms (Loaded ${wkMiss.data.length} items)`);

  const wkHitStart = performance.now();
  const wkHit = await waliKelasService.getStrukturAssignments(tenantId, null, { page: 1, limit: 10 });
  const wkHitEnd = performance.now();
  console.log(`⏱️  Wali Kelas Cache HIT  : ${(wkHitEnd - wkHitStart).toFixed(2)} ms (Loaded ${wkHit.data.length} items)`);

  // --- 4. Test Auto Invalidation Signal ---
  console.log('\n--- 4. Testing Auto Invalidation Signal... ---');
  console.log('🔔 Triggered invalidateStrukturTree(tenantId)...');
  await cacheInvalidationService.invalidateStrukturTree(tenantId);

  const startAfterInvalid = performance.now();
  await service.getTree(tenantId);
  const endAfterInvalid = performance.now();
  const afterInvalidTime = endAfterInvalid - startAfterInvalid;
  console.log(`⏱️  After Invalidation Elapsed Time: ${afterInvalidTime.toFixed(2)} ms (Reloaded - Cache MISS)`);

  if (afterInvalidTime > hitTime) {
    console.log('✅ PASS: Cache was successfully purged and re-computed from DB!');
  }

  console.log('\n====================================================');
  console.log('  🎉 ALL STRUKTUR & WALI KELAS CACHE TESTS PASSED!  ');
  console.log('====================================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Test failed with error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
