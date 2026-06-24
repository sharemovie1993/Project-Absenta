import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../modules/dashboard/services/dashboard.service';
import { HubinService } from '../modules/hubin/services/hubin.service';

const prisma = new PrismaClient();
const dashboardService = new DashboardService();
const hubinService = new HubinService();

async function main() {
  console.log('=== STARTING HUBIN FLOW DATA INTEGRITY VERIFICATION ===');

  // 1. Find a student first to determine tenant
  const student = await prisma.siswa.findFirst({
    include: { Kelas: { include: { Jurusan: true } } }
  });
  if (!student) {
    throw new Error('No student found in the database. Please run seed first.');
  }
  const studentId = student.id;
  const tenantId = student.tenant_id;

  // 2. Get tenant detail
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  console.log(`Using Tenant: ${tenant?.name || tenantId}`);
  console.log(`Using Student: ${student.nama_siswa || student.id} (Jurusan: ${student.Kelas?.Jurusan?.nama || 'N/A'})`);

  // Find a user of this tenant to act as the logger user
  const user = await prisma.user.findFirst({
    where: { tenant_id: tenantId }
  });
  const actorUserId = user ? user.id : undefined;
  console.log(`Using Actor User: ${user?.email || 'System'} (ID: ${actorUserId})`);

  // Ensure student has status LULUS or AKTIF (for testing)
  // Let's temporarily mark student as LULUS for tracer coverage test, then revert
  const originalStatus = student.status;
  await prisma.siswa.update({
    where: { id: studentId },
    data: { status: 'LULUS' }
  });

  // 3. Get or create a MitraIndustri
  let mitra = await prisma.mitraIndustri.findFirst({
    where: { tenant_id: tenantId }
  });
  const dummyName = 'PT Solusi Teknologi Nusantara (Dummy)';
  if (!mitra) {
    console.log('Creating dummy MitraIndustri...');
    mitra = await prisma.mitraIndustri.create({
      data: {
        tenant_id: tenantId,
        nama: dummyName,
        bidang: 'Teknologi Informasi',
        alamat: 'Jakarta',
        kontak: '021-123456',
        pic_nama: 'Budi PIC',
        pic_jabatan: 'HR Manager',
        pic_telepon: '08123456789',
        pic_email: 'budi@solusitek.co.id',
        mou_nomor: 'MOU-TEST-2026-001',
        mou_tanggal_mulai: new Date(),
        mou_tanggal_berakhir: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        mou_status: 'AKTIF',
        kuota_pkl: 5,
        kompetensi_keahlian: 'RPL,TKJ'
      }
    });
  }
  const mitraId = mitra.id;
  console.log(`Using MitraIndustri: ${mitra.nama} (ID: ${mitraId})`);

  // 4. Create HubinLowongan (BKK Vacancy) via Service to trigger logging
  console.log('Creating HubinLowongan...');
  const lowongan = await hubinService.createLowongan(tenantId, {
    mitra_id: mitraId,
    perusahaan_nama: mitra.nama,
    judul_posisi: 'Junior Web Developer (Test)',
    deskripsi: 'Deskripsi pekerjaan uji coba.',
    persyaratan: 'Menguasai HTML, CSS, JavaScript.',
    kuota: 2,
    tanggal_tutup: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'BUKA'
  }, actorUserId);
  const lowonganId = lowongan.id;
  console.log(`HubinLowongan created successfully: ${lowongan.judul_posisi}`);

  // 5. Create HubinLamaran (Alumni Apply Job) via Service
  console.log('Creating HubinLamaran...');
  const lamaran = await hubinService.createLamaran(tenantId, {
    lowongan_id: lowonganId,
    siswa_id: studentId,
    status_seleksi: 'DITERIMA', // using DITERIMA to test Recruitment Success KPI
    cv_url: 'https://storage.absenta.co.id/cv/dummy-cv.pdf',
    catatan: 'Saya sangat tertarik dengan posisi ini.'
  }, actorUserId);
  console.log(`HubinLamaran created successfully: ${lamaran.id}`);

  // 6. Create or update HubinTracerStudy via Service
  console.log('Upserting HubinTracerStudy...');
  const tracer = await hubinService.submitTracerStudy(tenantId, studentId, {
    status_alumni: 'BEKERJA',
    perusahaan_nama: mitra.nama,
    posisi: 'Software Engineer',
    gaji_estimasi: '5000000',
    tahun_lulus: 2025
  }, actorUserId);
  console.log(`HubinTracerStudy upserted successfully: ${tracer.id}`);

  // 7. Create SiswaPkl active placement to test Top Mitra KPI
  console.log('Creating active SiswaPkl placement...');
  const pklPlacement = await prisma.siswaPkl.create({
    data: {
      tenant_id: tenantId,
      siswa_id: studentId,
      mitra_id: mitraId,
      tanggal_mulai: new Date(),
      status: 'AKTIF'
    }
  });

  // 8. Fetch and verify Hubin Stats from Dashboard Service
  console.log('Fetching Hubin stats from DashboardService...');
  const stats = await dashboardService.getHubinStats(tenantId, actorUserId);
  console.log('--- Stats Result ---');
  console.log(JSON.stringify(stats, null, 2));

  // Assertions / Verifications
  if (stats.totalLowonganAktif < 1) {
    throw new Error('Verification failed: totalLowonganAktif should be at least 1');
  }
  if (stats.totalAlumniTraced < 1) {
    throw new Error('Verification failed: totalAlumniTraced should be at least 1');
  }
  if (stats.tracerCoverage <= 0) {
    throw new Error('Verification failed: tracerCoverage should be > 0');
  }
  if (stats.employmentRate !== 100) {
    throw new Error(`Verification failed: employmentRate should be 100, got ${stats.employmentRate}`);
  }
  if (stats.totalRecruitmentSuccess < 1) {
    throw new Error('Verification failed: totalRecruitmentSuccess should be at least 1');
  }
  if (stats.topMitra.length === 0 || !stats.topMitra.some((m: any) => m.id === mitraId)) {
    throw new Error('Verification failed: topMitra should include our test mitra');
  }

  console.log('STATS VERIFIED SUCCESSFULLY!');

  // 9. Fetch and verify Recent Activity Feed
  console.log('Waiting for background microtasks to persist logs...');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Fetching Recent Activity Feed...');
  const activities = await hubinService.getRecentActivity(tenantId);
  console.log(`Found ${activities.length} recent HUBIN activities.`);
  const hasLowonganCreateLog = activities.some(a => a.action === 'HUBIN_LOWONGAN_CREATE');
  const hasLamaranCreateLog = activities.some(a => a.action === 'HUBIN_LAMARAN_CREATE');
  const hasTracerSubmitLog = activities.some(a => a.action === 'HUBIN_TRACER_SUBMIT');

  if (!hasLowonganCreateLog || !hasLamaranCreateLog || !hasTracerSubmitLog) {
    throw new Error('Verification failed: Missing expected audit logs in activity feed');
  }
  console.log('AUDIT LOG FEED VERIFIED SUCCESSFULLY!');

  // 10. Test Soft Delete
  console.log('Testing soft delete on Lowongan...');
  await hubinService.deleteLowongan(tenantId, lowonganId, actorUserId);
  
  // Verify it is still in database but has deleted_at populated
  const dbLowongan = await prisma.hubinLowongan.findUnique({
    where: { id: lowonganId }
  });
  if (!dbLowongan || !dbLowongan.deleted_at) {
    throw new Error('Verification failed: Lowongan was not soft-deleted');
  }

  // Verify that it is filtered out of getHubinStats now
  const statsAfterDelete = await dashboardService.getHubinStats(tenantId, actorUserId);
  if (statsAfterDelete.totalLowonganAktif !== stats.totalLowonganAktif - 1) {
    throw new Error(`Verification failed: stats totalLowonganAktif did not decrement. Expected ${stats.totalLowonganAktif - 1}, got ${statsAfterDelete.totalLowonganAktif}`);
  }
  console.log('SOFT DELETE VERIFIED SUCCESSFULLY!');

  // 11. Cleanup test records hard-delete
  console.log('Cleaning up test records (hard deleting)...');
  await prisma.siswaPkl.delete({ where: { id: pklPlacement.id } });
  await prisma.hubinTracerStudy.delete({ where: { id: tracer.id } });
  await prisma.hubinLamaran.delete({ where: { id: lamaran.id } });
  await prisma.hubinLowongan.delete({ where: { id: lowongan.id } });
  
  // Cleanup Activity Logs generated during test to keep audit trail clean
  await prisma.activityLog.deleteMany({
    where: {
      tenant_id: tenantId,
      action: { in: ['HUBIN_LOWONGAN_CREATE', 'HUBIN_LAMARAN_CREATE', 'HUBIN_TRACER_SUBMIT', 'HUBIN_LOWONGAN_DELETE'] }
    }
  });

  // Revert student status
  await prisma.siswa.update({
    where: { id: studentId },
    data: { status: originalStatus }
  });

  if (mitra.nama === dummyName) {
    await prisma.mitraIndustri.delete({ where: { id: mitraId } });
  }
  console.log('=== CLEANUP COMPLETE: Database returned to initial state. ===');
  console.log('=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
}

main()
  .catch(err => {
    console.error('ERROR during verification:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
