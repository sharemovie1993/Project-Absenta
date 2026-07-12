import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== LIST STRUKTUR KURIKULUM PLOTING KELAS 10 PROD ===");
  const mappings = await prisma.strukturKurikulum.findMany({
    where: { tingkat: 10 },
    include: { Mapel: true }
  });
  console.log("Total Pemetaan Kelas 10:", mappings.length);
  mappings.forEach(map => {
    console.log(`- ID: ${map.id} | Mapel: ${map.Mapel?.nama_mapel} | Kode: ${map.Mapel?.kode_mapel} | JP: ${map.jp_per_minggu} | Kelompok: ${map.kelompok}`);
  });
}

run().catch(console.error);
