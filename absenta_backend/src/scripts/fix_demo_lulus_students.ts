import { prisma } from '../utils/prisma';

async function main() {
  const tenantId = '2acb7e12-d264-4784-8262-8f7369061542';

  console.log('=== FIXING DEMO STUDENTS STATUS (MARKING ALUMNI/LULUS) ===');

  // Find all Tingkat 12 classes in SMKN 1 Plered
  const ting12Classes = await prisma.kelas.findMany({
    where: { tenant_id: tenantId, tingkat: 12 },
    select: { id: true, nama_kelas: true }
  });
  const ting12ClassIds = ting12Classes.map(c => c.id);

  // Group 1: Students in Tingkat 12 with NIS < 20251000 (graduated cohort)
  const result = await prisma.siswa.updateMany({
    where: {
      tenant_id: tenantId,
      kelas_id: { in: ting12ClassIds },
      nis: { lt: '20251000' }
    },
    data: {
      status: 'LULUS'
    }
  });

  console.log(`✅ Successfully updated ${result.count} students in Tingkat 12 to status 'LULUS'!`);

  // Verify status counts now
  const statusCounts = await prisma.siswa.groupBy({
    by: ['status'],
    where: { tenant_id: tenantId },
    _count: { id: true }
  });
  console.log('New Status Breakdown in SMKN 1 Plered:', statusCounts);

  // Check each Tingkat 12 class active students count
  for (const k of ting12Classes) {
    const activeCount = await prisma.siswa.count({
      where: { kelas_id: k.id, status: 'AKTIF' }
    });
    const lulusCount = await prisma.siswa.count({
      where: { kelas_id: k.id, status: 'LULUS' }
    });
    console.log(`${k.nama_kelas}: ${activeCount} Siswa Aktif, ${lulusCount} Siswa Lulus`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
