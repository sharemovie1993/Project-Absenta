const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kelas = await prisma.kelas.findFirst({
    where: { nama_kelas: 'X TJKT 1' }
  });
  if (!kelas) {
    console.log('Class X TJKT 1 not found!');
    return;
  }
  console.log('Class X TJKT 1 ID:', kelas.id);

  const students = await prisma.siswa.findMany({
    where: { kelas_id: kelas.id },
    select: { id: true, nama_siswa: true }
  });
  console.log(`Found ${students.length} students in X TJKT 1:`);
  students.forEach((s, i) => {
    console.log(`${i+1}. ${s.nama_siswa} (${s.id})`);
  });
}
main().finally(() => prisma.$disconnect());
