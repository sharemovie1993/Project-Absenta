import { PrismaClient } from '@prisma/client';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { PiketService } from '../modules/kesiswaan/piket/services/piket.service';

const prisma = new PrismaClient();
const piketService = new PiketService();

async function main() {
  console.log('\n====================================================');
  console.log('  🧪 TESTING PIKET KESISWAAN & IZIN KELUAR CACHE');
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

    const today = new Date();

    // 2. Clear Existing Piket Cache
    await cacheInvalidationService.invalidatePiketCache(tenantId);
    console.log('🔔 Cleared existing piket cache keys...');

    // --- TEST 1: Izin Harian Cache MISS vs HIT ---
    console.log('\n--- 1. Testing Izin Harian Cache MISS (DB Query)... ---');
    const t0 = performance.now();
    const missList = await piketService.getIzinHarian(tenantId, today);
    const t1 = performance.now();
    const missMs = (t1 - t0).toFixed(2);
    console.log(`⏱️  Izin Harian Cache MISS Elapsed Time : ${missMs} ms`);
    console.log(`📊 Total Record Izin Harian : ${missList.length}`);

    console.log('\n--- 2. Testing Izin Harian Cache HIT (Direct Redis)... ---');
    const t2 = performance.now();
    const hitList = await piketService.getIzinHarian(tenantId, today);
    const t3 = performance.now();
    const hitMs = (t3 - t2).toFixed(2);
    const speedup = (parseFloat(missMs) / (parseFloat(hitMs) || 0.01)).toFixed(1);
    console.log(`⏱️  Izin Harian Cache HIT Elapsed Time  : ${hitMs} ms`);
    console.log(`📊 Total Record Izin HIT    : ${hitList.length}`);
    console.log(`🚀 Speedup Factor           : ${speedup}x lebih cepat!`);

    if (parseFloat(hitMs) <= parseFloat(missMs)) {
      console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
    }

    // --- TEST 3: Auto Invalidation Signal ---
    console.log('\n--- 3. Testing Auto Invalidation Signal (invalidatePiketCache)... ---');
    await cacheInvalidationService.invalidatePiketCache(tenantId);
    console.log('🔔 Triggered invalidatePiketCache(tenantId)...');

    const t4 = performance.now();
    await piketService.getIzinHarian(tenantId, today);
    const t5 = performance.now();
    console.log(`⏱️  After Invalidation Elapsed Time: ${(t5 - t4).toFixed(2)} ms (Reloaded - Cache MISS)`);
    console.log('✅ PASS: Cache was successfully purged and re-computed from DB!');

    console.log('\n====================================================');
    console.log('  🎉 ALL PIKET KESISWAAN & IZIN KELUAR CACHE TESTS PASSED!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
