import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== LIST GURU MAPEL ===");
  const mapels = await prisma.mapel.findMany({
    orderBy: { nama_mapel: 'asc' }
  });
  console.log("Total Mapel:", mapels.length);
  mapels.forEach(m => {
    console.log(`- ID: ${m.id} | Nama: ${m.nama_mapel} | Kode: ${m.kode_mapel}`);
  });
}

run().catch(console.error);
