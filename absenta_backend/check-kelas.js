const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kelas = await prisma.kelas.findFirst({
    where: { nama_kelas: { contains: 'X TKJ 1' } }
  });
  if (!kelas) {
    console.log('Class not found');
    return;
  }
  console.log('Kelas:', kelas);
  const count = await prisma.siswa.count({
    where: { kelas_id: kelas.id }
  });
  console.log('Total Siswa in class:', count);
}
main().finally(() => prisma.$disconnect());
