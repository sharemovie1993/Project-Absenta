const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CHECKING SISWA DOCUMENTS (JS ROOT) ---');
  const count = await prisma.siswaDocument.count();
  console.log(`Total Siswa Documents: ${count}`);

  const docs = await prisma.siswaDocument.findMany({
    take: 10,
    include: {
      Siswa: {
        select: {
          nama_siswa: true,
          nis: true
        }
      }
    }
  });

  console.log('Siswa Documents list:');
  console.log(JSON.stringify(docs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
