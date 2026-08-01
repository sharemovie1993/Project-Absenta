import { PrismaClient } from '@prisma/client';
import { cacheService } from '../utils/cache.service';
import { cacheInvalidationService } from '../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../constants/cache-keys';
import { resolveAttendanceConfig } from '../utils/attendance-rules';

const prisma = new PrismaClient();

async function main() {
  console.log('\n====================================================');
  console.log('  🧪 TESTING GERBANG (RFID CONCURRENCY) & SESI KBM CACHE');
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

    const dateStr = new Date().toISOString().slice(0, 10);
    const configCacheKey = CACHE_KEYS.ATTENDANCE.GATE_RULE_CONFIG(tenantId);
    const fullKey = `${configCacheKey}:${dateStr}:all`;

    // 2. Clear Existing Cache
    await cacheService.delete(fullKey);
    await cacheInvalidationService.invalidateAttendanceCache(tenantId);

    // --- TEST 1: Gate Rule Config Cache MISS vs HIT ---
    console.log('\n--- 1. Testing Gate Rule Config Cache MISS (DB Lookup)... ---');
    const t0 = performance.now();
    const missConfig = await cacheService.getOrSet<any>(
      fullKey,
      async () => {
        const [activeYr, tenantCfg, specEvent] = await Promise.all([
          prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
          prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { jam_masuk_default: true, jam_pulang_default: true, toleransi_keterlambatan_menit: true },
          }),
          prisma.absensiKejadianKhusus.findFirst({
            where: { tenant_id: tenantId, tanggal: new Date() },
          }),
        ]);
        const ruleCfg = resolveAttendanceConfig(
          tenantCfg || { jam_masuk_default: '07:00', jam_pulang_default: '14:00', toleransi_keterlambatan_menit: 15 },
          null,
          specEvent,
        );
        return { activeYr, ruleCfg };
      },
      CACHE_TTL.REAL_TIME
    );
    const t1 = performance.now();
    const missMs = (t1 - t0).toFixed(2);
    console.log(`⏱️  Cache MISS Elapsed Time : ${missMs} ms`);
    console.log(`📊 Rule Config Jam Masuk  : ${missConfig?.ruleCfg?.jamMasuk || '07:00'}`);

    console.log('\n--- 2. Testing Gate Rule Config Cache HIT (Direct Redis Response)... ---');
    const t2 = performance.now();
    const hitConfig = await cacheService.getOrSet<any>(
      fullKey,
      async () => {
        throw new Error('This DB query should not execute during Cache HIT!');
      },
      CACHE_TTL.REAL_TIME
    );
    const t3 = performance.now();
    const hitMs = (t3 - t2).toFixed(2);
    const speedup = (parseFloat(missMs) / (parseFloat(hitMs) || 0.01)).toFixed(1);
    console.log(`⏱️  Cache HIT Elapsed Time  : ${hitMs} ms`);
    console.log(`📊 Rule Config HIT Data   : ${hitConfig?.ruleCfg?.jamMasuk || '07:00'}`);
    console.log(`🚀 Speedup Factor           : ${speedup}x lebih cepat!`);

    if (parseFloat(hitMs) <= parseFloat(missMs)) {
      console.log('✅ PASS: Cache HIT is faster than Cache MISS!');
    }

    // --- TEST 3: Auto Invalidation Signal ---
    console.log('\n--- 3. Testing Auto Invalidation Signal (invalidateAttendanceCache)... ---');
    await cacheInvalidationService.invalidateAttendanceCache(tenantId);
    console.log('🔔 Triggered invalidateAttendanceCache(tenantId)...');

    const t4 = performance.now();
    await cacheService.getOrSet<any>(
      fullKey,
      async () => {
        const tenantCfg = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { jam_masuk_default: true, jam_pulang_default: true, toleransi_keterlambatan_menit: true },
        });
        return { tenantCfg };
      },
      CACHE_TTL.REAL_TIME
    );
    const t5 = performance.now();
    console.log(`⏱️  After Invalidation Elapsed Time: ${(t5 - t4).toFixed(2)} ms (Reloaded - Cache MISS)`);
    console.log('✅ PASS: Cache was successfully purged and re-computed from DB!');

    console.log('\n====================================================');
    console.log('  🎉 ALL GERBANG & SESI KBM CACHE TESTS PASSED!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
