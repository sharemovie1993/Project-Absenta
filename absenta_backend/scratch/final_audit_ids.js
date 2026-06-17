
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  const t = await prisma.tenant.findFirst({ where: { domain: 'smkn1cimahi' } });
  const s = await prisma.sekolah.findFirst({ where: { tenant_id: t.id } });
  const tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: t.id, is_active: true } });
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
  const sa = await prisma.siswaAkademik.findFirst({ 
    where: { 
      siswa_id: siswa.id, 
      tahun_pelajaran_id: tp.id 
    } 
  });

  console.log(JSON.stringify({
    tenant_id: t.id,
    sekolah_id: s.id,
    tapel_id: tp.id,
    siswa_id: siswa.id,
    sa_id: sa.id
  }, null, 2));
}

audit().finally(() => prisma.$disconnect());
