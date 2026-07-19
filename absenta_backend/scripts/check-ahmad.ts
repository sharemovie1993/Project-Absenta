import { prisma } from '../src/utils/prisma';

async function main() {
  const ahmad = await prisma.siswa.findFirst({
    where: { nama_siswa: { contains: 'AHMAD FAUZI' } },
    include: {
      SiswaAkademik: true
    }
  });

  console.log('Ahmad Fauzi Sofyan:', ahmad);

  if (ahmad) {
    const classTaps = await prisma.absenSiswa.findMany({
      where: { siswa_akademik_id: ahmad.SiswaAkademik[0]?.id }
    });
    console.log('Class Taps:', classTaps);

    const gateTaps = await prisma.absenGerbangSiswa.findMany({
      where: { siswa_id: ahmad.id }
    });
    console.log('Gate Taps:', gateTaps);
  }
}

main().catch(console.error);
