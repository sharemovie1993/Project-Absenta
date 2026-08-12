import { prisma } from '../utils/prisma';

async function checkProvinsiNames() {
  console.log('====================================================');
  console.log('🔍 AUDIT ALL PROVINSI NAMES IN refWilayah');
  console.log('====================================================');

  const provs = await prisma.refWilayah.findMany({
    where: { tingkat: 1 },
    orderBy: { kode: 'asc' }
  });

  console.log('Total Provinsi in DB:', provs.length);
  provs.forEach(p => {
    console.log(`kode: "${p.kode}" -> nama: "${p.nama}"`);
  });

  await prisma.$disconnect();
}

checkProvinsiNames().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
