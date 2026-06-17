const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    // 1. Check Active Year
    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    console.log('Active Year:', activeYear ? `Found (${activeYear.id})` : 'NOT FOUND');

    if (!activeYear) return;

    // 2. Check Active Semester
    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear.id }
    });
    console.log('Active Semester:', activeSemester ? `Found (${activeSemester.id})` : 'NOT FOUND');

    if (!activeSemester) return;

    // 3. Check JadwalTemplate for KAMIS
    const templates = await prisma.jadwalTemplate.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        hari: 'KAMIS'
      }
    });
    console.log('JadwalTemplate for KAMIS count:', templates.length);

    // 4. Check if any sessions exist for today (Apr 16) again to be absolutely sure
    const dateStr = '2026-04-16';
    const sesiGerbangToday = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });
    console.log(`SesiGerbang Today: ${sesiGerbangToday.length}`);

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
