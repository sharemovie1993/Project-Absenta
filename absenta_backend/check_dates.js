const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttendanceDates() {
  console.log('=== CHECKING ATTENDANCE DATES IN DATABASE ===');
  
  const gerbangTaps = await prisma.absenGerbangSiswa.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    select: { id: true, created_at: true, status: true }
  });
  console.log('AbsenGerbangSiswa latest dates:', gerbangTaps);

  const sesiAbsensi = await prisma.sesiAbsensi.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    select: { id: true, tanggal: true, status: true, nama_sesi: true }
  });
  console.log('SesiAbsensi latest dates:', sesiAbsensi);

  const totalSiswa = await prisma.siswa.count();
  const totalGuru = await prisma.guru.count();
  console.log('Total Siswa in DB:', totalSiswa);
  console.log('Total Guru in DB:', totalGuru);
}

checkAttendanceDates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
