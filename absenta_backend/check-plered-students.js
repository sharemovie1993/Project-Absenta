const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.siswa.count({
    where: { tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415' } // SMKN 1 PLERED
  });
  console.log('Students in SMKN 1 PLERED:', count);
}
main().finally(() => prisma.$disconnect());
