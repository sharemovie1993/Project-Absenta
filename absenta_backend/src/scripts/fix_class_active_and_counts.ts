import { prisma } from '../utils/prisma';

async function main() {
  console.log('🏁 Starting Data Fix: Syncing class active states based on occupancy...');
  
  // 1. Get active semesters
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

  for (const sem of activeSemesters) {
    console.log(`\n🏢 Processing Tenant ID: ${sem.tenant_id} (${sem.TahunPelajaran?.tahun} - ${sem.nama_semester})`);

    // 2. Find all populated classes for this active period
    const activeStudentSnapshots = await prisma.siswaAkademik.findMany({
      where: {
        tahun_pelajaran_id: sem.tahun_pelajaran_id,
        semester_id: sem.id,
        status: 'AKTIF'
      },
      select: { kelas_id: true }
    });

    const populatedClassIds = new Set(
      activeStudentSnapshots.map(sa => sa.kelas_id).filter((id): id is string => typeof id === 'string' && id !== '')
    );

    console.log(`👉 Active student snapshots count: ${activeStudentSnapshots.length}`);
    console.log(`👉 Populated classes count: ${populatedClassIds.size}`);

    // 3. Get all classes of this tenant
    const classes = await prisma.kelas.findMany({
      where: { tenant_id: sem.tenant_id }
    });

    let activatedCount = 0;
    let deactivatedCount = 0;

    for (const k of classes) {
      const isPopulated = populatedClassIds.has(k.id);
      // Logic: must be active if populated OR if it's Grade X (Tingkat 10, to preserve them for PPDB).
      // Otherwise, Grade XI & XII classes that are empty should be deactivated.
      const shouldBeActive = isPopulated || k.tingkat === 10;

      if (k.is_active !== shouldBeActive) {
        await prisma.kelas.update({
          where: { id: k.id },
          data: { is_active: shouldBeActive }
        });

        if (shouldBeActive) {
          console.log(`✅ Activated class: [Tingkat ${k.tingkat}] ${k.nama_kelas}`);
          activatedCount++;
        } else {
          console.log(`❌ Deactivated empty class: [Tingkat ${k.tingkat}] ${k.nama_kelas}`);
          deactivatedCount++;
        }
      }
    }

    console.log(`🎉 Done for Tenant: Activated ${activatedCount} class(es), Deactivated ${deactivatedCount} class(es).`);
  }

  console.log('\n🏁 Data fix completed successfully!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
