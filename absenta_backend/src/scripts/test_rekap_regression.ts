import { rekapService } from '../modules/attendance/rekap/services/rekap.service';
import { prisma } from '../utils/prisma';

async function runRekapRegressionSuite() {
  console.log('====================================================');
  console.log('🧪 COMPREHENSIVE REKAP SERVICE REGRESSION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper tester
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
    // 1. Setup Context Data (Target active student's tenant)
    const siswa = await prisma.siswa.findFirst({ where: { nisn: '0081951098' } }) || await prisma.siswa.findFirst();
    if (!siswa) {
      console.error('❌ Data siswa tidak ditemukan di database local untuk pengujian.');
      return;
    }

    const tenantId = siswa.tenant_id;
    const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId } }) || await prisma.guru.findFirst();
    const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } }) || await prisma.kelas.findFirst();
    const user = (guru?.user_id ? await prisma.user.findFirst({ where: { id: guru.user_id } }) : null) || await prisma.user.findFirst();

    if (!siswa || !guru || !kelas || !user) {
      console.error('❌ Data seed tidak lengkap di database local untuk pengujian.');
      return;
    }

    const siswaId = siswa.id;
    const guruId = guru.id;
    const kelasId = kelas.id;
    const userId = user.id;
    const todayStr = '2026-08-11';
    const monthStr = '2026-08';

    console.log(`📋 CONTEXT DATA: Tenant: ${tenantId} | Siswa: ${siswaId} | Guru: ${guruId} | Kelas: ${kelasId}\n`);

    // TEST 1: getRekapHarianSiswa
    try {
      const res = await rekapService.getRekapHarianSiswa(siswaId, todayStr, tenantId);
      assertTest('1. getRekapHarianSiswa', Boolean(res && Array.isArray(res.rincian)));
    } catch (e: any) { assertTest('1. getRekapHarianSiswa', false, e.message); }

    // TEST 2: getRekapBulananSiswa
    try {
      const res = await rekapService.getRekapBulananSiswa(siswaId, monthStr, tenantId);
      assertTest('2. getRekapBulananSiswa', Boolean(res && Array.isArray(res.detail)));
    } catch (e: any) { assertTest('2. getRekapBulananSiswa', false, e.message); }

    // TEST 3: getTrackingHarianSiswa
    try {
      const res = await rekapService.getTrackingHarianSiswa(siswaId, todayStr, tenantId);
      assertTest('3. getTrackingHarianSiswa', Boolean(res && typeof res === 'object'));
    } catch (e: any) { assertTest('3. getTrackingHarianSiswa', false, e.message); }

    // TEST 4: getRekapPresensiGuruByGuruId
    try {
      const res = await rekapService.getRekapPresensiGuruByGuruId(guruId, guru.nama_guru || 'Guru Test');
      assertTest('4. getRekapPresensiGuruByGuruId', Boolean(res));
    } catch (e: any) { assertTest('4. getRekapPresensiGuruByGuruId', false, e.message); }

    // TEST 5: getRekapHarianGuru
    try {
      const res = await rekapService.getRekapHarianGuru(todayStr, tenantId, guruId);
      assertTest('5. getRekapHarianGuru', Boolean(res && Array.isArray(res)));
    } catch (e: any) { assertTest('5. getRekapHarianGuru', false, e.message); }

    // TEST 6: getTrackingHarianGuru
    try {
      const res = await rekapService.getTrackingHarianGuru(guruId, todayStr, tenantId);
      assertTest('6. getTrackingHarianGuru', Boolean(res));
    } catch (e: any) { assertTest('6. getTrackingHarianGuru', false, e.message); }

    // TEST 7: getRekapBulananGuruMe
    try {
      const res = await rekapService.getRekapBulananGuruMe(userId, tenantId, monthStr);
      assertTest('7. getRekapBulananGuruMe', Boolean(res));
    } catch (e: any) { assertTest('7. getRekapBulananGuruMe', false, e.message); }

    // TEST 8: getRekapHarianKelas
    try {
      const res = await rekapService.getRekapHarianKelas(kelasId, todayStr, tenantId);
      assertTest('8. getRekapHarianKelas', Boolean(res && Array.isArray(res)));
    } catch (e: any) { assertTest('8. getRekapHarianKelas', false, e.message); }

    // TEST 9: getRekapBulananKelas
    try {
      const res = await rekapService.getRekapBulananKelas(kelasId, monthStr, tenantId);
      assertTest('9. getRekapBulananKelas', Boolean(res && typeof res === 'object'));
    } catch (e: any) { assertTest('9. getRekapBulananKelas', false, e.message); }

    // TEST 10: getRekapBulananSekolah
    try {
      const res = await rekapService.getRekapBulananSekolah(tenantId, monthStr);
      assertTest('10. getRekapBulananSekolah', Boolean(res));
    } catch (e: any) { assertTest('10. getRekapBulananSekolah', false, e.message); }

    // TEST 11: getStatistikHarian
    try {
      const res = await rekapService.getStatistikHarian(todayStr, tenantId);
      assertTest('11. getStatistikHarian', Boolean(res && (Array.isArray(res) || typeof res === 'object')));
    } catch (e: any) { assertTest('11. getStatistikHarian', false, e.message); }

    // TEST 12: getLeaderboard
    try {
      const res = await rekapService.getLeaderboard(tenantId, 5);
      assertTest('12. getLeaderboard', Boolean(res && Array.isArray(res)));
    } catch (e: any) { assertTest('12. getLeaderboard', false, e.message); }

    // TEST 13: getLeaderboardGuru
    try {
      const res = await rekapService.getLeaderboardGuru(tenantId, 5);
      assertTest('13. getLeaderboardGuru', Boolean(res && Array.isArray(res)));
    } catch (e: any) { assertTest('13. getLeaderboardGuru', false, e.message); }

    // TEST 14: getSiswaIdFromUser
    try {
      const res = await rekapService.getSiswaIdFromUser(tenantId, userId);
      assertTest('14. getSiswaIdFromUser', Boolean(res === null || typeof res === 'string'));
    } catch (e: any) { assertTest('14. getSiswaIdFromUser', false, e.message); }

    // TEST 15: logActivity
    try {
      await rekapService.logActivity(userId, tenantId, 'TEST_REGRESSION', siswaId);
      assertTest('15. logActivity', true);
    } catch (e: any) { assertTest('15. logActivity', false, e.message); }

    console.log('\n====================================================');
    console.log(`📊 RINGKASAN REGRESSION TEST: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('❌ Fatal error in test suite:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runRekapRegressionSuite();
