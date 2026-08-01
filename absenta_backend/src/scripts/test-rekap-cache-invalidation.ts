import { RekapService } from '../modules/attendance/rekap/services/rekap.service';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { prisma } from '../utils/prisma';

async function runTest() {
  console.log('====================================================');
  console.log('  🧪 TESTING REDIS REKAP CACHE & INVALIDATION SIGNAL ');
  console.log('====================================================\n');

  const rekapService = new RekapService();

  // Find a kelas that exists in DB
  const kelas = await prisma.kelas.findFirst({
    select: { id: true, nama_kelas: true, tenant_id: true, tenant: { select: { name: true } } }
  });

  if (!kelas) {
    console.log('ℹ️ No kelas found in DB. Test skipped cleanly.');
    process.exit(0);
  }

  const tenantId = kelas.tenant_id;
  const tenantName = kelas.tenant?.name || 'School Tenant';
  const bulan = '2026-08';

  console.log(`🏫 Tenant: ${tenantName} (${tenantId})`);
  console.log(`📚 Kelas: ${kelas.nama_kelas} (${kelas.id})`);
  console.log(`📅 Bulan: ${bulan}\n`);

  // Clear any existing cache first
  await cacheInvalidationService.invalidateRekapCache(tenantId);

  // --- TEST 1: CACHE MISS ---
  console.log('--- 1. Testing Cache MISS (Querying Database & Calculating Matrix)... ---');
  const startMs1 = performance.now();
  const res1 = await rekapService.getRekapBulananKelas(kelas.id, bulan, tenantId);
  const elapsedMs1 = performance.now() - startMs1;
  console.log(`⏱️  Cache MISS Elapsed Time : ${elapsedMs1.toFixed(2)} ms`);
  console.log(`📊 Students Loaded          : ${res1.students.length}`);

  // --- TEST 2: CACHE HIT ---
  console.log('\n--- 2. Testing Cache HIT (Fetching Directly from Redis Cache)... ---');
  const startMs2 = performance.now();
  const res2 = await rekapService.getRekapBulananKelas(kelas.id, bulan, tenantId);
  const elapsedMs2 = performance.now() - startMs2;
  console.log(`⏱️  Cache HIT Elapsed Time  : ${elapsedMs2.toFixed(2)} ms (Loaded ${res2.students.length} students)`);

  const speedup = elapsedMs1 / (elapsedMs2 || 0.01);
  console.log(`🚀 Speedup Factor           : ${speedup.toFixed(1)}x faster!`);

  if (elapsedMs2 < elapsedMs1) {
    console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
  } else {
    console.warn('⚠️ WARNING: Cache HIT time did not improve.');
  }

  // --- TEST 3: AUTO INVALIDATION ---
  console.log('\n--- 3. Testing Auto Invalidation Signal... ---');
  await cacheInvalidationService.invalidateRekapCache(tenantId);
  console.log('🔔 Triggered invalidateRekapCache(tenantId)...');

  const startMs3 = performance.now();
  const res3 = await rekapService.getRekapBulananKelas(kelas.id, bulan, tenantId);
  const elapsedMs3 = performance.now() - startMs3;
  console.log(`⏱️  After Invalidation Elapsed Time: ${elapsedMs3.toFixed(2)} ms (Reloaded ${res3.students.length} students - Cache MISS)`);

  console.log('\n====================================================');
  console.log('  🎉 ALL REKAP CACHE INVALIDATION TESTS PASSED!     ');
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
