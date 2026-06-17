const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.siswaAkademik.count({
    where: { kelas_id: 'd9282389-2fd6-479f-b968-64ca0c03d81f' }
  });
  console.log('Students in SiswaAkademik for X TKJ 1:', count);
}
main().finally(() => prisma.$disconnect());
