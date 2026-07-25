const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING USERS ===');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      tenant_id: true,
      Role: { select: { name: true } }
    }
  });
  console.log('Users found:', users.length);
  console.log(users);

  console.log('=== CHECKING SISWA ===');
  const siswa = await prisma.siswa.findMany({ take: 5 });
  console.log('Siswa count:', siswa.length);

  console.log('=== CHECKING SESI ABSENSI ===');
  const sesi = await prisma.sesiAbsensi.findMany({ take: 5 });
  console.log('Sesi count:', sesi.length);

  console.log('=== CHECKING REKAP ABSENSI HARIAN ===');
  const rekap = await prisma.absensiHarianSiswa.findMany({ take: 5 });
  console.log('Rekap harian count:', rekap.length);

  console.log('=== CHECKING PELANGGARAN ===');
  const pelanggaran = await prisma.pelanggaranSiswa.findMany({ take: 5 });
  console.log('Pelanggaran count:', pelanggaran.length);

  console.log('=== CHECKING JADWAL KBM ===');
  const jadwal = await prisma.jadwalKbm.findMany({ take: 5 });
  console.log('Jadwal KBM count:', jadwal.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
