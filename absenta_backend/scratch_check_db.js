const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CHECKING SYSTEM ACADEMIC STATE ---');
  
  // 1. Get active TahunPelajaran
  const activeTP = await prisma.tahunPelajaran.findFirst({
    where: { is_active: true }
  });
  console.log('Active TahunPelajaran:', activeTP);

  // 2. Get active Semester
  const activeSem = await prisma.semester.findFirst({
    where: { is_active: true },
    include: { TahunPelajaran: true }
  });
  console.log('Active Semester:', activeSem);

  // 3. Count total StrukturKurikulum
  const totalStruktur = await prisma.strukturKurikulum.count();
  console.log('Total StrukturKurikulum rows in DB:', totalStruktur);

  const sampleStruktur = await prisma.strukturKurikulum.findMany({
    take: 5,
    include: { TahunPelajaran: true, Tenant: true }
  });
  console.log('StrukturKurikulum sample rows:', sampleStruktur.map(s => ({
    id: s.id,
    tingkat: s.tingkat,
    jp: s.jp_per_minggu,
    tahun_pelajaran_id: s.tahun_pelajaran_id,
    tahun: s.TahunPelajaran?.tahun,
    tenant_id: s.tenant_id,
    tenant_name: s.Tenant?.name
  })));

  // List all distinct tahun_pelajaran_id and tenant_id in struktur_kurikulum
  const groups = await prisma.strukturKurikulum.groupBy({
    by: ['tahun_pelajaran_id', 'tenant_id'],
    _count: true
  });
  console.log('Groups in StrukturKurikulum:', groups);

  // 4. Check all active years/semesters across all tenants
  const allTPs = await prisma.tahunPelajaran.findMany({
    include: { Tenant: true }
  });
  console.log('All TahunPelajaran in DB:', allTPs.map(t => ({
    id: t.id,
    tahun: t.tahun,
    is_active: t.is_active,
    tenant_id: t.tenant_id,
    tenant_name: t.Tenant?.name
  })));

  const allSemesters = await prisma.semester.findMany({
    include: { Tenant: true }
  });
  console.log('All Semesters in DB:', allSemesters.map(s => ({
    id: s.id,
    nama_semester: s.nama_semester,
    is_active: s.is_active,
    tahun_pelajaran_id: s.tahun_pelajaran_id,
    tenant_id: s.tenant_id,
    tenant_name: s.Tenant?.name
  })));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
