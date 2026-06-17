import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Syncing Jurusan to Sarpras Locations ---');
  
  const jurusans = await prisma.jurusan.findMany({
    include: {
      sarprasLocations: true
    }
  });

  console.log(`Found ${jurusans.length} jurusans.`);

  let createdCount = 0;
  for (const j of jurusans) {
    if (j.sarprasLocations.length === 0) {
      const abbr = j.kode || j.nama.substring(0, 5).toUpperCase();
      const locName = `Lab Utama ${abbr}`;
      
      console.log(`Creating location ${locName} for Jurusan ${j.nama}...`);
      
      await prisma.sarprasLocation.create({
        data: {
          tenant_id: j.tenant_id,
          nama: locName,
          unit_id: j.id,
          deskripsi: `Lokasi otomatis untuk jurusan ${j.nama}`
        }
      });
      createdCount++;
    }
  }

  console.log(`Finished. Created ${createdCount} new locations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
