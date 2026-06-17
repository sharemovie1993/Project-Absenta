const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.siswa.findMany({
    where: { kelas_id: 'b576114c-8157-401f-9b89-ceab5bb56390' },
    select: { id: true, tenant_id: true, nama_siswa: true },
    take: 3
  });
  
  console.log('Sample students from X-TKJ-1:', students);
}
main().finally(() => prisma.$disconnect());
