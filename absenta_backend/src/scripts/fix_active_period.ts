import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- STARTING FIX ACTIVE PERIOD ---');

  // 1. Get SMK 6 Jakarta Tenant
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: 'smk6jkt' }
  });

  if (!tenant) {
    console.error('Tenant smk6jkt not found!');
    return;
  }
  console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

  // 2. Find the transitioned Tahun Pelajaran (2026/2027)
  const tahunBaru = await prisma.tahunPelajaran.findFirst({
    where: {
      tenant_id: tenant.id,
      tahun: '2026/2027'
    }
  });

  if (!tahunBaru) {
    console.error('Tahun Pelajaran 2026/2027 not found!');
    return;
  }
  console.log(`Found Tahun Pelajaran Baru: ${tahunBaru.tahun} (${tahunBaru.id})`);

  // 3. Find the transitioned Semester Ganjil of the new year
  const semesterBaru = await prisma.semester.findFirst({
    where: {
      tenant_id: tenant.id,
      tahun_pelajaran_id: tahunBaru.id,
      nama_semester: {
        contains: 'Ganjil',
        mode: 'insensitive'
      }
    }
  });

  if (!semesterBaru) {
    console.error('Semester Ganjil 2026/2027 not found!');
    return;
  }
  console.log(`Found Semester Baru: ${semesterBaru.nama_semester} (${semesterBaru.id})`);

  // 4. Update the active status in database
  await prisma.$transaction(async (tx) => {
    // Deactivate all other years
    await tx.tahunPelajaran.updateMany({
      where: { tenant_id: tenant.id, id: { not: tahunBaru.id } },
      data: { is_active: false }
    });
    // Activate the new year
    await tx.tahunPelajaran.update({
      where: { id: tahunBaru.id },
      data: { is_active: true }
    });

    // Deactivate all other semesters
    await tx.semester.updateMany({
      where: { tenant_id: tenant.id, id: { not: semesterBaru.id } },
      data: { is_active: false }
    });
    // Activate the new semester
    await tx.semester.update({
      where: { id: semesterBaru.id },
      data: { is_active: true }
    });
  });

  console.log('Successfully activated Tahun Pelajaran 2026/2027 and Semester Ganjil!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
