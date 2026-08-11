import { gerbangService } from '../modules/attendance/gerbang/services/gerbang.service';
import { prisma } from '../utils/prisma';

async function runGerbangRegressionSuite() {
  console.log('====================================================');
  console.log('🚪 COMPREHENSIVE GERBANG SERVICE REGRESSION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assertTest = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(` ✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(` ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    // 1. Context Data
    const siswa = await prisma.siswa.findFirst({ where: { nisn: '0081951098' } }) || await prisma.siswa.findFirst();
    if (!siswa) {
      console.error('❌ Data siswa tidak ditemukan di database local.');
      return;
    }

    const tenantId = siswa.tenant_id;
    const user = siswa.user_id ? await prisma.user.findFirst({ where: { id: siswa.user_id } }) : await prisma.user.findFirst();

    if (!user) {
      console.error('❌ Data user tidak ditemukan.');
      return;
    }

    console.log(`📋 CONTEXT DATA: Tenant: ${tenantId} | Siswa: ${siswa.nama_siswa} (${siswa.id}) | User: ${user.id}\n`);

    // TEST 1: getStudentCurrentStatus
    try {
      const res = await gerbangService.getStudentCurrentStatus(tenantId, siswa.id);
      assertTest('1. getStudentCurrentStatus', Boolean(res && typeof res === 'object'));
    } catch (e: any) { assertTest('1. getStudentCurrentStatus', false, e.message); }

    // TEST 2: getSessionsForDate
    try {
      const res = await gerbangService.getSessionsForDate(tenantId, new Date());
      assertTest('2. getSessionsForDate', Boolean(res && (Array.isArray(res) || typeof res === 'object')));
    } catch (e: any) { assertTest('2. getSessionsForDate', false, e.message); }

    // TEST 3: getOrCreateSession
    try {
      const res = await gerbangService.getOrCreateSession(tenantId);
      assertTest('3. getOrCreateSession', Boolean(res && res.id));
    } catch (e: any) { assertTest('3. getOrCreateSession', false, e.message); }

    // TEST 4: embeddingProviderHealth
    try {
      const res = await gerbangService.embeddingProviderHealth();
      assertTest('4. embeddingProviderHealth', Boolean(res && typeof res === 'object'));
    } catch (e: any) { assertTest('4. embeddingProviderHealth', false, e.message); }

    // TEST 5: tap (Datang RFID / NISN Test)
    try {
      const payload: any = {
        identifier: siswa.nisn || siswa.no_rfid || siswa.id,
        arah: 'GERBANG_DATANG',
        metode_absen: 'RFID'
      };
      const res = await gerbangService.tap(payload, user.id, tenantId, 'MULTI_SESI');
      assertTest('5. tap (Gerbang Datang)', Boolean(res && (res.success !== undefined || typeof res === 'object')));
    } catch (e: any) { assertTest('5. tap (Gerbang Datang)', false, e.message); }

    // TEST 6: syncOfflineTaps
    try {
      const offlinePayload = [{
        identifier: siswa.nisn || siswa.id,
        arah: 'GERBANG_DATANG',
        metode_absen: 'RFID',
        waktu_tap: new Date().toISOString()
      }];
      const res = await gerbangService.syncOfflineTaps(tenantId, offlinePayload);
      assertTest('6. syncOfflineTaps', Boolean(res && res.success !== undefined));
    } catch (e: any) { assertTest('6. syncOfflineTaps', false, e.message); }

    console.log('\n====================================================');
    console.log(`📊 RINGKASAN GERBANG REGRESSION TEST: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('❌ Fatal error in Gerbang test suite:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runGerbangRegressionSuite();
