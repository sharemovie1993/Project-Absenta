import { prisma } from '../utils/prisma';

async function main() {
  try {
    const totalKelas = await prisma.kelas.count();
    const activeKelasCount = await prisma.kelas.count({
      where: { is_active: true }
    });
    const grouped = await prisma.kelas.groupBy({
      by: ['tingkat'],
      where: {
        is_active: true
      },
      _count: {
        id: true
      }
    });

    console.log('--- DATABASE CHECK ---');
    console.log('Total Kelas (All):', totalKelas);
    console.log('Total Kelas Aktif:', activeKelasCount);
    console.log('Grouped Active Kelas by tingkat:', JSON.stringify(grouped, null, 2));

    const sampleKelas = await prisma.kelas.findMany({
      take: 5,
      select: {
        id: true,
        nama_kelas: true,
        tingkat: true,
        is_active: true,
        tenant_id: true
      }
    });
    console.log('Sample Kelas Data:', JSON.stringify(sampleKelas, null, 2));
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
