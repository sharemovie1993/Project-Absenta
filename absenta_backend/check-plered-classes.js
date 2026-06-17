const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.siswa.groupBy({
    by: ['kelas_id'],
    where: { tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415' },
    _count: {
      _all: true,
    },
  });
  
  for (const group of groups) {
    if (group.kelas_id) {
       const k = await prisma.kelas.findUnique({ where: { id: group.kelas_id } });
       console.log(k.nama_kelas, group._count._all);
    }
  }
}
main().finally(() => prisma.$disconnect());
