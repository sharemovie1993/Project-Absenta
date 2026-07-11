import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- STARTING FIX TRANSITION STATUS ---');
  
  // 1. Get SMK 6 Jakarta Tenant
  const tenant = await prisma.tenant.findFirst({
    where: {
      subdomain: 'smk6jkt'
    }
  });

  if (!tenant) {
    console.error('Tenant smk6jkt not found!');
    return;
  }
  console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

  // 2. Find all students in this tenant who have status 'NAIK'
  const studentsToFix = await prisma.siswa.findMany({
    where: {
      tenant_id: tenant.id,
      status: 'NAIK'
    },
    select: {
      id: true,
      nama_siswa: true,
      kelas_id: true,
      tahun_pelajaran_id: true,
      semester_id: true
    }
  });

  console.log(`Found ${studentsToFix.length} students with status 'NAIK' to fix.`);

  if (studentsToFix.length === 0) {
    console.log('No students need status fix.');
    return;
  }

  // 3. We also need to find the Tahun Pelajaran Baru and Tahun Pelajaran Lama
  const tahunBaruId = studentsToFix[0].tahun_pelajaran_id;
  const semesterGanjilBaruId = studentsToFix[0].semester_id;

  if (!tahunBaruId || !semesterGanjilBaruId) {
    console.error('Students do not have active tahun_pelajaran_id or semester_id!');
    return;
  }

  const tahunBaru = await prisma.tahunPelajaran.findUnique({
    where: { id: tahunBaruId },
    select: { tahun: true }
  });

  console.log(`Tahun Pelajaran Baru: ${tahunBaru?.tahun} (${tahunBaruId})`);

  // Find previous academic record of the first student to get the tahunLamaId and semesterLamaId
  const samplePrevAcademic = await prisma.siswaAkademik.findFirst({
    where: {
      siswa_id: studentsToFix[0].id,
      tahun_pelajaran_id: { not: tahunBaruId }
    },
    orderBy: {
      tahunPelajaran: {
        tahun: 'desc'
      }
    },
    select: {
      tahun_pelajaran_id: true,
      semester_id: true
    }
  });

  if (!samplePrevAcademic) {
    console.error('Could not find previous academic record for students!');
    return;
  }

  const tahunLamaId = samplePrevAcademic.tahun_pelajaran_id;
  const semesterAktifLamaId = samplePrevAcademic.semester_id;

  const tahunLama = await prisma.tahunPelajaran.findUnique({
    where: { id: tahunLamaId },
    select: { tahun: true }
  });
  console.log(`Tahun Pelajaran Lama: ${tahunLama?.tahun} (${tahunLamaId})`);

  let fixCount = 0;
  // 4. Update each student
  for (const s of studentsToFix) {
    try {
      await prisma.$transaction(async (tx) => {
        // A. Update Siswa status to 'AKTIF'
        await tx.siswa.update({
          where: { id: s.id },
          data: {
            status: 'AKTIF'
          }
        });

        // B. Update SiswaAkademik record for Tahun Baru Ganjil to 'AKTIF'
        await tx.siswaAkademik.updateMany({
          where: {
            siswa_id: s.id,
            tahun_pelajaran_id: tahunBaruId,
            semester_id: semesterGanjilBaruId
          },
          data: {
            status: 'AKTIF'
          }
        });

        // C. Update SiswaAkademik record for Tahun Lama Genap to 'NAIK'
        await tx.siswaAkademik.updateMany({
          where: {
            siswa_id: s.id,
            tahun_pelajaran_id: tahunLamaId,
            semester_id: semesterAktifLamaId
          },
          data: {
            status: 'NAIK'
          }
        });
      });
      fixCount++;
    } catch (err: any) {
      console.error(`Failed to fix student ${s.nama_siswa} (${s.id}):`, err.message);
    }
  }

  console.log(`Successfully fixed ${fixCount}/${studentsToFix.length} students status.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
