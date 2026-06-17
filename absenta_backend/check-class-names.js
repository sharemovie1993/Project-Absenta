const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kelasIds = [
    '6f9e4024-2c11-48ee-ac34-fdb7056a451f',
    'b576114c-8157-401f-9b89-ceab5bb56390',
    '1dfe7d84-a120-4df2-8b77-9d36b0ea5388'
  ];
  const classes = await prisma.kelas.findMany({
    where: { id: { in: kelasIds } },
    select: { id: true, nama_kelas: true }
  });
  console.log('Classes with students:', classes);
}
main().finally(() => prisma.$disconnect());
