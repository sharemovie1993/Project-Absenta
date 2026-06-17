
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'smkn1cimahi' } });
  if (!tenant) {
    console.log('Tenant smkn1cimahi not found');
    return;
  }
  console.log('--- TENANT ---');
  console.log('ID:', tenant.id);
  console.log('Domain:', tenant.domain);
  console.log('Absensi Mode:', tenant.absensi_mode);

  const tapel = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenant.id, is_active: true }
  });
  const semester = await prisma.semester.findFirst({
    where: { tenant_id: tenant.id, is_active: true }
  });

  console.log('\n--- ACTIVE ACADEMIC ---');
  console.log('Tapel ID:', tapel?.id);
  console.log('Semester ID:', semester?.id);

  const user = await prisma.user.findFirst({
    where: { email: 'hidayat@gmail.com' }
  });
  if (!user) {
    console.log('User hidayat@gmail.com not found');
    return;
  }

  const siswa = await prisma.siswa.findFirst({
    where: { user_id: user.id }
  });
  if (!siswa) {
    console.log('Siswa record not found');
    return;
  }

  const enrollment = await prisma.siswaAkademik.findFirst({
    where: { 
      siswa_id: siswa.id,
      tahun_pelajaran_id: tapel?.id,
      semester_id: semester?.id
    }
  });

  console.log('\n--- ENROLLMENT ---');
  console.log('Siswa ID:', siswa.id);
  console.log('Siswa Akademik (SA) ID:', enrollment?.id);
  console.log('Kelas ID:', enrollment?.kelas_id);
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
