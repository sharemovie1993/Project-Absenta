
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('--- AUDIT DATA HIDAYAT ---');

  // 1. User & Siswa
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
  console.log('Siswa ID:', siswa?.id);

  // 2. Active Period
  const activeTapel = await prisma.tahunPelajaran.findFirst({ where: { is_active: true } });
  const activeSemester = await prisma.semester.findFirst({ where: { is_active: true } });
  console.log('Active Tapel:', activeTapel?.id, activeTapel?.nama_tahun_pelajaran);
  console.log('Active Semester:', activeSemester?.id, activeSemester?.nama_semester);

  // 3. SiswaAkademik (Enrollment)
  const enrollments = await prisma.siswaAkademik.findMany({
    where: { siswa_id: siswa.id },
    include: { TahunPelajaran: true, Semester: true }
  });
  console.log('Enrollments found:', enrollments.length);
  enrollments.forEach(e => {
    console.log(`- Tapel: ${e.TahunPelajaran.nama_tahun_pelajaran}, Semester: ${e.Semester.nama_semester}, Active: ${e.TahunPelajaran.is_active && e.Semester.is_active}`);
  });

  // 4. Attendance Records (April 2026)
  const start = new Date('2026-04-01');
  const end = new Date('2026-04-30');
  
  const gateRecords = await prisma.absenGerbangSiswa.count({
    where: { 
      siswa_id: siswa.id,
      waktu_tap: { gte: start, lte: end }
    }
  });
  console.log('Gate Records (April 2026):', gateRecords);

  const sessionRecords = await prisma.absenSiswa.count({
    where: {
      siswa_id: siswa.id,
      waktu_tap: { gte: start, lte: end }
    }
  });
  console.log('Session Records (April 2026):', sessionRecords);

  // 5. Check Snapshots
  if (gateRecords > 0) {
    const sample = await prisma.absenGerbangSiswa.findFirst({
      where: { siswa_id: siswa.id, waktu_tap: { gte: start, lte: end } }
    });
    console.log('Sample Gate Tapel Snapshot:', sample.tahun_pelajaran_id_snapshot);
  }
}

audit().finally(() => prisma.$disconnect());
