const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSiswa() {
  console.log('=== SEARCHING SISWA BY NIS 2526100001 ===');
  const siswa = await prisma.siswa.findFirst({
    where: { nis: '2526100001' },
    include: {
      User: { select: { id: true, email: true, full_name: true, role_id: true, Role: { select: { name: true } } } },
      Kelas: { select: { id: true, nama_kelas: true, tingkat: true } }
    }
  });

  if (!siswa) {
    console.log('Siswa with NIS 2526100001 NOT FOUND! Searching by query...');
    const allSiswa = await prisma.siswa.findMany({
      take: 5,
      include: { User: true, Kelas: true }
    });
    console.log('Sample Siswa in DB:', JSON.stringify(allSiswa, null, 2));
    return;
  }

  console.log('SISWA FOUND:');
  console.log('ID:', siswa.id);
  console.log('Nama:', siswa.nama_siswa || siswa.User?.full_name);
  console.log('NIS:', siswa.nis);
  console.log('NISN:', siswa.nisn);
  console.log('Kelas:', siswa.Kelas?.nama_kelas);
  console.log('User Email:', siswa.User?.email);
  console.log('User Role:', siswa.User?.Role?.name);

  // Check Attendance
  const absensi = await prisma.absensiHarianSiswa.findMany({
    where: { siswa_id: siswa.id }
  });
  console.log('Attendance Records Count:', absensi.length);
  console.log('Attendance Sample:', absensi.slice(0, 3));

  // Check Pelanggaran
  const pelanggaran = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: siswa.id }
  });
  console.log('Pelanggaran Records Count:', pelanggaran.length);
  console.log('Pelanggaran Sample:', pelanggaran.slice(0, 3));

  // Check Jadwal KBM
  if (siswa.kelas_id) {
    const jadwal = await prisma.jadwalKbm.findMany({
      where: { kelas_id: siswa.kelas_id }
    });
    console.log('Jadwal KBM Count for class:', jadwal.length);
    console.log('Jadwal Sample:', jadwal.slice(0, 3));
  }
}

checkSiswa()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
