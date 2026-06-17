const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.siswa.count({ where: { tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415' } });
  const active = await prisma.siswa.count({ where: { tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415', status: 'AKTIF' } });
  console.log('All:', all, 'Active:', active);
}
main().finally(() => prisma.$disconnect());
