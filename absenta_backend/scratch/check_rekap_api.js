
const { RekapService } = require('./src/modules/attendance/rekap/services/rekap.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const rekapService = new RekapService();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'smkn1cimahi' } });

  const bulan = '2026-04';
  const result = await rekapService.getRekapBulananSiswa(siswa.id, bulan, tenant.id);
  console.log(JSON.stringify(result, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
