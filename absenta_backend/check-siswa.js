const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.siswa.count();
  console.log('Total Siswa in DB:', count);
  
  const groups = await prisma.siswa.groupBy({
    by: ['kelas_id'],
    _count: {
      _all: true,
    },
  });
  console.log('Distribution by kelas_id:', groups);

  const sample = await prisma.siswa.findFirst();
  console.log('Sample Siswa kelas_id:', sample ? sample.kelas_id : null);
  
  if (sample) {
    const kelas = await prisma.kelas.findUnique({ where: { id: sample.kelas_id } });
    console.log('Sample Siswa Kelas:', kelas);
  }
}
main().finally(() => prisma.$disconnect());
