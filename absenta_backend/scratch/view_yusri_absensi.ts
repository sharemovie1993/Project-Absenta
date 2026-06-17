import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const siswa = await prisma.siswa.findFirst({
    where: { User: { email: 'yusri@siswa.com' } }
  });

  if (!siswa) {
    console.error('Siswa not found');
    return;
  }

  const pkl = await prisma.siswaPkl.findFirst({
    where: { siswa_id: siswa.id }
  });

  if (!pkl) {
    console.error('PKL placement not found');
    return;
  }

  const absensi = await prisma.absensiPkl.findMany({
    where: { siswa_pkl_id: pkl.id },
    orderBy: { tanggal: 'desc' }
  });

  console.log('--- Yusri Absensi Records ---');
  console.log(JSON.stringify(absensi, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
