import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== CHECKING KODING DAN KECERDASAN ARTIFISIAL ===");
  const koding = await prisma.mapel.findFirst({
    where: { nama_mapel: { contains: "Koding", mode: "insensitive" } }
  });
  
  if (!koding) {
    console.log("Mapel Koding tidak ditemukan!");
    return;
  }
  
  console.log(`Katalog Mapel Koding ditemukan: ID: ${koding.id} | Nama: ${koding.nama_mapel} | Kode: ${koding.kode_mapel}`);
  
  const mapping = await prisma.strukturKurikulum.findFirst({
    where: { mapel_id: koding.id }
  });
  
  if (mapping) {
    console.log(`SUDAH DIPETAKAN sebelumnya: ID: ${mapping.id} | Tingkat: ${mapping.tingkat} | JP: ${mapping.jp_per_minggu} | Kelompok: ${mapping.kelompok}`);
  } else {
    console.log("BELUM DIPETAKAN sama sekali!");
  }
}

run().catch(console.error);
