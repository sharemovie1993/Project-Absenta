import { PrismaClient } from './node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data synchronization for Jurusan singkatan...');
  
  const jurusans = await prisma.jurusan.findMany({
    where: {
      OR: [
        { singkatan: null },
        { singkatan: '' }
      ]
    }
  });

  console.log(`Found ${jurusans.length} jurusans to update.`);

  for (const j of jurusans) {
    const newVal = j.kode || j.nama.substring(0, 5).toUpperCase();
    await prisma.jurusan.update({
      where: { id: j.id },
      data: { singkatan: newVal }
    });
    console.log(`Updated Jurusan: ${j.nama} -> Singkatan: ${newVal}`);
  }

  console.log('Synchronization complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
