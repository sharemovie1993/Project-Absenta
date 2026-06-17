const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.siswa.findMany({
    where: { kelas_id: 'b576114c-8157-401f-9b89-ceab5bb56390' },
    select: { status: true }
  });
  
  const statusCounts = students.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Status counts in X-TKJ-1:', statusCounts);
}
main().finally(() => prisma.$disconnect());
