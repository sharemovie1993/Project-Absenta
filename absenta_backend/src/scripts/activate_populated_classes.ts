import { prisma } from '../utils/prisma';

async function main() {
  console.log('🏁 Starting Migration: Activating populated classes...');
  
  // 1. Get all active academic semesters
  const activeSemesters = await prisma.semester.findMany({
    where: { is_active: true },
    select: {
      id: true,
      tenant_id: true,
      tahun_pelajaran_id: true,
      nama_semester: true,
      TahunPelajaran: { select: { tahun: true } }
    }
  });

  console.log(`🔍 Found ${activeSemesters.length} active academic period context(s)`);

  for (const sem of activeSemesters) {
    console.log(`\n🏢 Processing Tenant ID: ${sem.tenant_id} (${sem.TahunPelajaran?.tahun} - ${sem.nama_semester})`);

    // 2. Find unique populated class IDs in the active period
    const populatedClasses = await prisma.siswaAkademik.findMany({
      where: {
        tahun_pelajaran_id: sem.tahun_pelajaran_id,
        semester_id: sem.id,
        status: 'AKTIF'
      },
      distinct: ['kelas_id'],
      select: { kelas_id: true }
    });

    const classIds = populatedClasses
      .map(c => c.kelas_id)
      .filter((id): id is string => typeof id === 'string' && id !== '');
      
    console.log(`👉 Found ${classIds.length} class(es) currently containing active students`);

    if (classIds.length === 0) continue;

    // 3. Find which of these classes are currently INACTIVE
    const inactivePopulatedClasses = await prisma.kelas.findMany({
      where: {
        id: { in: classIds },
        is_active: false
      },
      select: { id: true, nama_kelas: true, tingkat: true }
    });

    console.log(`⚠️ Found ${inactivePopulatedClasses.length} populated class(es) currently set as INACTIVE`);

    if (inactivePopulatedClasses.length === 0) {
      console.log('✅ No action needed: All populated classes are already active.');
      continue;
    }

    // 4. Activate these classes
    const targetIds = inactivePopulatedClasses.map(k => k.id);
    const updateResult = await prisma.kelas.updateMany({
      where: { id: { in: targetIds } },
      data: { is_active: true }
    });

    console.log(`🎉 Successfully activated ${updateResult.count} class(es):`);
    inactivePopulatedClasses.forEach(k => {
      console.log(`  - [tingkat ${k.tingkat}] ${k.nama_kelas} (ID: ${k.id})`);
    });
  }

  console.log('\n🏁 Migration completed successfully!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
