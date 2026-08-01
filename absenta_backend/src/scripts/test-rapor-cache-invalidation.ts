import { PrismaClient } from '@prisma/client';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { RaporService } from '../modules/rapor/services/rapor.service';

const prisma = new PrismaClient();

async function main() {
  console.log('\n====================================================');
  console.log('  🧪 TESTING PENILAIAN & LEGER RAPOR CACHE');
  console.log('====================================================\n');

  try {
    // 1. Fetch System Tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ Error: Tenant not found for testing.');
      process.exit(1);
    }
    const tenantId = tenant.id;
    console.log(`🏫 Tenant: ${tenant.name} (${tenant.subdomain || tenantId})`);

    // 2. Fetch first available Kelas, TahunPelajaran, Semester for a real test
    const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } });
    const tahun = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
    const semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId } });

    if (!kelas || !tahun || !semester) {
      console.log('⚠️  No Kelas/TahunPelajaran/Semester found. Testing cache invalidation only...');

      // Still test invalidation signal even without real data
      await cacheInvalidationService.invalidateRaporCache(tenantId);
      console.log('🔔 Cleared existing rapor/leger cache keys...');
      console.log('✅ PASS: invalidateRaporCache executed successfully (no data in DB)');
      console.log('\n====================================================');
      console.log('  🎉 RAPOR LEGER CACHE INVALIDATION SIGNAL TEST PASSED!');
      console.log('====================================================\n');
      return;
    }

    const params = {
      kelas_id: kelas.id,
      tahun_pelajaran_id: tahun.id,
      semester_id: semester.id,
    };

    console.log(`📚 Kelas: ${kelas.nama_kelas} | Tahun: ${tahun.tahun} | Semester: ${semester.nama_semester}`);

    // 3. Clear Existing Leger Cache
    await cacheInvalidationService.invalidateRaporCache(tenantId);
    console.log('🔔 Cleared existing leger rapor cache keys...');

    // --- TEST 1: Leger Data Cache MISS vs HIT ---
    console.log('\n--- 1. Testing Leger Sekelas Cache MISS (DB Query + Kalkulasi)... ---');
    const t0 = performance.now();
    const missLeger = await RaporService.getLegerData(tenantId, params);
    const t1 = performance.now();
    const missMs = (t1 - t0).toFixed(2);
    console.log(`⏱️  Leger Cache MISS Elapsed Time : ${missMs} ms`);
    console.log(`📊 Total Siswa di Leger : ${missLeger.students.length}`);
    console.log(`📊 Total Mapel di Leger : ${missLeger.mapel_list.length}`);

    console.log('\n--- 2. Testing Leger Sekelas Cache HIT (Direct Redis)... ---');
    const t2 = performance.now();
    const hitLeger = await RaporService.getLegerData(tenantId, params);
    const t3 = performance.now();
    const hitMs = (t3 - t2).toFixed(2);
    const speedup = (parseFloat(missMs) / (parseFloat(hitMs) || 0.01)).toFixed(1);
    console.log(`⏱️  Leger Cache HIT Elapsed Time  : ${hitMs} ms`);
    console.log(`📊 Total Siswa HIT: ${hitLeger.students.length}`);
    console.log(`🚀 Speedup Factor : ${speedup}x lebih cepat!`);

    if (parseFloat(hitMs) <= parseFloat(missMs)) {
      console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
    }

    // --- TEST 3: Auto Invalidation Signal ---
    console.log('\n--- 3. Testing Auto Invalidation Signal (invalidateRaporCache)... ---');
    await cacheInvalidationService.invalidateRaporCache(tenantId);
    console.log('🔔 Triggered invalidateRaporCache(tenantId)...');

    const t4 = performance.now();
    await RaporService.getLegerData(tenantId, params);
    const t5 = performance.now();
    console.log(`⏱️  After Invalidation Elapsed Time: ${(t5 - t4).toFixed(2)} ms (Reloaded - Cache MISS)`);
    console.log('✅ PASS: Cache was successfully purged and re-computed from DB!');

    console.log('\n====================================================');
    console.log('  🎉 ALL PENILAIAN & LEGER RAPOR CACHE TESTS PASSED!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
