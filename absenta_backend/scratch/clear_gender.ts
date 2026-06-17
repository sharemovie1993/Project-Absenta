import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to clear jenis_kelamin for all students...');
  
  const result = await prisma.siswa.updateMany({
    data: {
      jenis_kelamin: ''
    }
  });
  
  console.log(`Success! Updated ${result.count} students.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
