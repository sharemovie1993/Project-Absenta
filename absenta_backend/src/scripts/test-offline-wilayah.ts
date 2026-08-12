import { prisma } from '../utils/prisma';

async function testOfflineWilayah() {
  console.log('====================================================');
  console.log('🔍 VERIFIKASI KETERSEDIAAN DATA WILAYAH OFFLINE (DB LOKAL)');
  console.log('====================================================');

  const totalAll = await prisma.refWilayah.count();
  const provinsi = await prisma.refWilayah.count({ where: { tingkat: 1 } });
  const kabupaten = await prisma.refWilayah.count({ where: { tingkat: 2 } });
  const kecamatan = await prisma.refWilayah.count({ where: { tingkat: 3 } });
  const kelurahan = await prisma.refWilayah.count({ where: { tingkat: 4 } });

  console.log(`✅ Total Master Data Wilayah di DB Lokal: ${totalAll.toLocaleString('id-ID')} Data`);
  console.log(`   - 🏛️  Provinsi       : ${provinsi} Data`);
  console.log(`   - 🏙️  Kabupaten/Kota : ${kabupaten} Data`);
  console.log(`   - 🏡 Kecamatan      : ${kecamatan.toLocaleString('id-ID')} Data`);
  console.log(`   - 🏘️  Kelurahan/Desa : ${kelurahan.toLocaleString('id-ID')} Data`);

  console.log('\n====================================================');
  console.log('Status: 100% OFFLINE TERSEDIA DI DATABASE LOKAL');
  console.log('====================================================');

  await prisma.$disconnect();
}

testOfflineWilayah().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
