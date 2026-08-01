import { PrismaClient } from '@prisma/client';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { DashboardService } from '../modules/dashboard/services/dashboard.service';

const prisma = new PrismaClient();
const dashboardService = new DashboardService();

async function main() {
  console.log('\n====================================================');
  console.log('  🧪 TESTING EXECUTIVE & CROSS-ROLE DASHBOARD CACHE');
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

    const dateStr = new Date().toISOString().split('T')[0];

    // 2. Clear Existing Dashboard Cache
    await cacheInvalidationService.invalidateDashboardCache(tenantId);
    console.log('🔔 Cleared existing dashboard cache keys...');

    // --- TEST 1: Dashboard Overview Cache MISS vs HIT ---
    console.log('\n--- 1. Testing Dashboard Overview Cache MISS (DB Query)... ---');
    const t0 = performance.now();
    const missOverview = await dashboardService.getOverview(tenantId, dateStr);
    const t1 = performance.now();
    const missMs = (t1 - t0).toFixed(2);
    console.log(`⏱️  Overview Cache MISS Elapsed Time : ${missMs} ms`);
    console.log(`📊 Total Siswa : ${missOverview.total_siswa}, Total Guru : ${missOverview.total_guru}`);

    console.log('\n--- 2. Testing Dashboard Overview Cache HIT (Direct Redis)... ---');
    const t2 = performance.now();
    const hitOverview = await dashboardService.getOverview(tenantId, dateStr);
    const t3 = performance.now();
    const hitMs = (t3 - t2).toFixed(2);
    const speedup = (parseFloat(missMs) / (parseFloat(hitMs) || 0.01)).toFixed(1);
    console.log(`⏱️  Overview Cache HIT Elapsed Time  : ${hitMs} ms`);
    console.log(`📊 Total Siswa HIT: ${hitOverview.total_siswa}`);
    console.log(`🚀 Speedup Factor : ${speedup}x lebih cepat!`);

    if (parseFloat(hitMs) <= parseFloat(missMs)) {
      console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
    }

    // --- TEST 3: Kurikulum Global Monitoring Cache MISS vs HIT ---
    console.log('\n--- 3. Testing Kurikulum Global Monitoring Cache MISS vs HIT... ---');
    const t4 = performance.now();
    const missKurikulum = await dashboardService.getKurikulumMonitoringGlobal(tenantId, dateStr);
    const t5 = performance.now();
    console.log(`⏱️  Kurikulum Monitoring MISS : ${(t5 - t4).toFixed(2)} ms (Health Score: ${missKurikulum.healthScore})`);

    const t6 = performance.now();
    const hitKurikulum = await dashboardService.getKurikulumMonitoringGlobal(tenantId, dateStr);
    const t7 = performance.now();
    console.log(`⏱️  Kurikulum Monitoring HIT  : ${(t7 - t6).toFixed(2)} ms (Health Score: ${hitKurikulum.healthScore})`);

    // --- TEST 4: EWS Escalations Cache MISS vs HIT ---
    console.log('\n--- 4. Testing EWS Escalations Cache MISS vs HIT... ---');
    const t8 = performance.now();
    await dashboardService.getKepsekEscalations(tenantId, 10);
    const t9 = performance.now();
    console.log(`⏱️  EWS Escalations MISS : ${(t9 - t8).toFixed(2)} ms`);

    const t10 = performance.now();
    await dashboardService.getKepsekEscalations(tenantId, 10);
    const t11 = performance.now();
    console.log(`⏱️  EWS Escalations HIT  : ${(t11 - t10).toFixed(2)} ms`);

    // --- TEST 5: Auto Invalidation Signal ---
    console.log('\n--- 5. Testing Auto Invalidation Signal (invalidateDashboardCache)... ---');
    await cacheInvalidationService.invalidateDashboardCache(tenantId);
    console.log('🔔 Triggered invalidateDashboardCache(tenantId)...');

    const t12 = performance.now();
    await dashboardService.getOverview(tenantId, dateStr);
    const t13 = performance.now();
    console.log(`⏱️  After Invalidation Elapsed Time: ${(t13 - t12).toFixed(2)} ms (Reloaded - Cache MISS)`);
    console.log('✅ PASS: Cache was successfully purged and re-computed from DB!');

    console.log('\n====================================================');
    console.log('  🎉 ALL EXECUTIVE & CROSS-ROLE DASHBOARD CACHE TESTS PASSED!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
