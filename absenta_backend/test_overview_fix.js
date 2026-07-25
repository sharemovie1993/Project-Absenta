const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOverviewFix() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const totalSiswa = await prisma.siswa.count({
    where: { tenant_id: tenantId, status: 'AKTIF' }
  });

  const totalGuru = await prisma.guru.count({
    where: { tenant_id: tenantId }
  });

  const gerbangTapCount = await prisma.absenGerbangSiswa.count({
    where: {
      tenant_id: tenantId,
      created_at: { gte: startOfDay, lte: endOfDay }
    }
  });

  const sesiAbsenCount = await prisma.absenSiswa.count({
    where: {
      tenant_id: tenantId,
      created_at: { gte: startOfDay, lte: endOfDay }
    }
  });

  console.log('=== TODAY STATS ===');
  console.log('Total Siswa:', totalSiswa);
  console.log('Total Guru:', totalGuru);
  console.log('Gerbang Tap Count Today:', gerbangTapCount);
  console.log('Sesi Absen Count Today:', sesiAbsenCount);

  const effectiveHadirSiswa = Math.max(gerbangTapCount, sesiAbsenCount);
  const persentaseSiswa = totalSiswa > 0 ? Math.round((effectiveHadirSiswa / totalSiswa) * 100) : 0;

  console.log('Effective Hadir Siswa:', effectiveHadirSiswa);
  console.log('Persentase Kehadiran Siswa:', persentaseSiswa + '%');
}

testOverviewFix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
