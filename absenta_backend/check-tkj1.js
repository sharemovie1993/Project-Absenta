const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.kelas.findMany({
    where: { nama_kelas: { contains: 'TKJ 1' } }
  });
  console.log('Classes containing TKJ 1:', classes.map(c => ({ id: c.id, nama: c.nama_kelas })));
}
main().finally(() => prisma.$disconnect());
