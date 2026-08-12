import { prisma } from '../utils/prisma';

async function checkRefWilayah() {
  console.log('====================================================');
  console.log('🔍 AUDIT TABEL refWilayah IN DATABASE');
  console.log('====================================================');

  const countProv = await prisma.refWilayah.count({ where: { tingkat: 1 } });
  const countKab = await prisma.refWilayah.count({ where: { tingkat: 2 } });
  const countKec = await prisma.refWilayah.count({ where: { tingkat: 3 } });
  const countKel = await prisma.refWilayah.count({ where: { tingkat: 4 } });

  console.log(`Tingkat 1 (Provinsi): ${countProv}`);
  console.log(`Tingkat 2 (Kabupaten/Kota): ${countKab}`);
  console.log(`Tingkat 3 (Kecamatan): ${countKec}`);
  console.log(`Tingkat 4 (Kelurahan/Desa): ${countKel}`);

  if (countKab > 0) {
    const sampleKab = await prisma.refWilayah.findMany({ where: { tingkat: 2 }, take: 5 });
    console.log('\nSample Kabupaten:', sampleKab);
  }

  await prisma.$disconnect();
}

checkRefWilayah().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
