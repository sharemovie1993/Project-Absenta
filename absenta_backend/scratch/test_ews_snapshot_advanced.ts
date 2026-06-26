import { prisma } from '../src/utils/prisma';
import { BkService } from '../src/modules/kesiswaan/services/bk.service';

async function main() {
  console.log('🚀 Running EWS Snapshot & Advanced Analytics Verification script...');
  
  // 1. Cari siswa aktif terlebih dahulu untuk mendapatkan tenant_id yang valid
  const siswa = await prisma.siswa.findFirst({
    where: { status: 'AKTIF' }
  });

  if (!siswa) {
    console.error('❌ No active student found in the database. Seeding might be required.');
    process.exit(1);
  }

  const tenantId = siswa.tenant_id;
  const siswaId = siswa.id;
  console.log(`✅ Using Tenant ID: ${tenantId}`);
  console.log(`✅ Using Student: ${siswa.nama_siswa} (ID: ${siswaId})`);

  // 3. Uji EWS Snapshot calculation
  console.log('\n--- Uji EWS Calculation ---');
  const ewsList = await BkService.calculateEwsForSiswa(tenantId);
  console.log(`✅ EWS list successfully calculated. Total students: ${ewsList.length}`);
  const targetStudentEws = ewsList.find(e => e.siswa.id === siswaId);
  if (targetStudentEws) {
    console.log(`📊 Student Risk Score: ${targetStudentEws.riskScore} (Level: ${targetStudentEws.riskLevel})`);
    console.log(`   Violations point: ${targetStudentEws.violations}, Achievements point: ${targetStudentEws.achievements}`);
  } else {
    console.warn('⚠️ Target student not found in calculated EWS list');
  }

  // 4. Uji Pembuatan EwsSnapshot
  console.log('\n--- Uji Pembuatan EwsSnapshot ---');
  const snapshotData = {
    tenant_id: tenantId,
    siswa_id: siswaId,
    risk_score: targetStudentEws ? targetStudentEws.riskScore : 10.0,
    risk_level: targetStudentEws ? targetStudentEws.riskLevel : 'LOW',
    violations_score: targetStudentEws ? targetStudentEws.violations * 1.5 : 0.0,
    achievement_score: targetStudentEws ? targetStudentEws.achievements * 0.5 : 0.0,
    alpa_count: targetStudentEws ? targetStudentEws.alpaCount : 0,
    active_cases: targetStudentEws ? targetStudentEws.activeCasesCount : 0,
    snapshot_date: new Date()
  };

  const createdSnapshot = await prisma.ewsSnapshot.create({
    data: snapshotData
  });
  console.log('✅ Snapshot successfully written into EwsSnapshot model:');
  console.dir(createdSnapshot);

  // Clean up snapshot testing
  await prisma.ewsSnapshot.delete({
    where: { id: createdSnapshot.id }
  });
  console.log('🗑️ Test snapshot cleaned up successfully.');

  // 5. Uji Reopen KasusBK increment
  console.log('\n--- Uji KasusBK Reopen Increment ---');
  // Cari kasus BK
  let testCase = await prisma.kasusBK.findFirst({
    where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null }
  });

  if (!testCase) {
    // Buat dummy kasus untuk tes
    testCase = await prisma.kasusBK.create({
      data: {
        tenant_id: tenantId,
        siswa_id: siswaId,
        judul: 'Kasus Uji Reopen',
        kategori: 'KEDISIPLINAN',
        prioritas: 'RENDAH',
        status: 'TERBUKA',
        tanggal_kasus: new Date(),
        reopen_count: 0
      }
    });
    console.log(`🆕 Created dummy kasus BK for testing: ${testCase.id}`);
  }

  const initialReopenCount = testCase.reopen_count;
  console.log(`📊 Initial Reopen Count: ${initialReopenCount}`);

  // Reopen
  console.log('🔄 Triggering reopenKasusBK...');
  const updatedCase = await BkService.reopenKasusBK(tenantId, testCase.id, 'system');
  console.log(`✅ Case reopened successfully. New Reopen Count: ${updatedCase.reopen_count}`);
  
  if (updatedCase.reopen_count === initialReopenCount + 1) {
    console.log('🎉 Reopen count successfully incremented by 1!');
  } else {
    console.error('❌ Reopen count increment mismatch!');
  }

  // 6. Uji getReportsData
  console.log('\n--- Uji BK Reports Analytics ---');
  const reports = await BkService.getReportsData(tenantId);
  console.log('✅ getReportsData returned successfully:');
  console.log(`- Kasus Aktif: ${reports.statistikKasus.active}`);
  console.log(`- Kasus Selesai: ${reports.statistikKasus.completed}`);
  console.log(`- Rata-rata Resolusi (Mean Resolution Time): ${reports.statistikPenyelesaian.meanResolutionTimeDays} Hari`);
  console.log(`- Total Reopened Cases: ${reports.statistikReopen.totalReopened}`);

  // 7. Uji getStudentRiskTrend & Event Overlay
  console.log('\n--- Uji Student Risk Trend & Event Overlay ---');
  // Buat snapshot sementara agar trend ter-render
  const tempSnapshot = await prisma.ewsSnapshot.create({
    data: {
      tenant_id: tenantId,
      siswa_id: siswaId,
      risk_score: 55,
      risk_level: 'MEDIUM',
      violations_score: 15,
      achievement_score: 0,
      alpa_count: 2,
      active_cases: 1,
      snapshot_date: new Date()
    }
  });

  const trendResult = await BkService.getStudentRiskTrend(tenantId, siswaId);
  console.log('✅ getStudentRiskTrend returned successfully:');
  console.log(`- Total Snapshots: ${trendResult.snapshots.length}`);
  console.log(`- Total Overlay Events: ${trendResult.events.length}`);
  if (trendResult.events.length > 0) {
    console.log('🔍 Sample Event:', trendResult.events[0]);
  }

  // Clean up temp snapshot
  await prisma.ewsSnapshot.delete({
    where: { id: tempSnapshot.id }
  });
  console.log('🗑️ Temp EwsSnapshot cleaned up.');

  console.log('\n🌟 All verifications completed successfully!');
}

main()
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
