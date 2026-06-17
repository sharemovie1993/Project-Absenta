
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({
    where: { email: 'hidayat@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const siswa = await prisma.siswaAkademik.findFirst({
    where: { user_id: user.id }
  });

  console.log('--- Identitas ---');
  console.log('User Login:', user.full_name);
  console.log('Siswa ID:', siswa?.id || 'NOT_FOUND');

  if (siswa) {
    const { rekapService } = await import('../src/modules/attendance/rekap/services/rekap.service');
    const rekap = await rekapService.getRekapBulananSiswa(siswa.id, '2026-04');
    
    // Get violations
    const pelanggaran = await prisma.pelanggaranSiswa.findMany({
      where: { siswa_id: siswa.id }
    });

    console.log('\n--- Data Dashboard (Calculated) ---');
    console.log('Kehadiran Bulanan:', rekap.persentase_kehadiran, '%');
    console.log('Total Kehadiran:', rekap.total_hadir, 'Hari');
    console.log('Total Poin Pelanggaran:', pelanggaran.reduce((acc, p) => acc + (p.poin || 0), 0));
    console.log('Jumlah Catatan Pelanggaran:', pelanggaran.length);
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
