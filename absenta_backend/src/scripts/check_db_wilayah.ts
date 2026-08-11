import { prisma } from '../utils/prisma';

async function checkWilayahCount() {
  console.log('🔍 MEMERIKSA JUMLAH DATA WILAYAH DI DATABASE POSTGRESQL...');
  
  const total = await prisma.refWilayah.count();
  const provCount = await prisma.refWilayah.count({ where: { tingkat: 1 } });
  const kabCount = await prisma.refWilayah.count({ where: { tingkat: 2 } });
  const kecCount = await prisma.refWilayah.count({ where: { tingkat: 3 } });
  const kelCount = await prisma.refWilayah.count({ where: { tingkat: 4 } });

  console.log('===================================================');
  console.log(`📊 TOTAL DATA RECORD TERSEDIA DI DATABASE SAAT INI: ${total}`);
  console.log(`   - Tingkat 1 (Provinsi)       : ${provCount} Record`);
  console.log(`   - Tingkat 2 (Kabupaten/Kota) : ${kabCount} Record`);
  console.log(`   - Tingkat 3 (Kecamatan)      : ${kecCount} Record`);
  console.log(`   - Tingkat 4 (Kelurahan/Desa) : ${kelCount} Record`);
  console.log('===================================================');
}

checkWilayahCount()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error querying DB:', err);
    process.exit(1);
  });
