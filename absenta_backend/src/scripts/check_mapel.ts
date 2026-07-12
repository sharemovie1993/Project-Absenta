import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== MENGELOLA KONSENTRASI KEAHLIAN SPESIFIK JURUSAN PROD ===");
  
  // 1. Hapus mapel Konsentrasi Keahlian global lama (jika ada)
  const deleteGlobal = await prisma.mapel.deleteMany({
    where: {
      tenant_id: TARGET_TENANT_ID,
      kode_mapel: 'KK-GLOBAL'
    }
  });
  console.log(`Menghapus mapel global lama: ${deleteGlobal.count} record terhapus.`);
  
  // 2. Ambil list semua jurusan milik tenant ini
  const jurusans = await prisma.jurusan.findMany({
    where: { tenant_id: TARGET_TENANT_ID }
  });
  
  console.log(`Ditemukan ${jurusans.length} Jurusan. Mulai seeding mapel terpisah...`);
  
  for (const j of jurusans) {
    const namaMapel = `Konsentrasi Keahlian - ${j.nama}`;
    const kodeMapel = `KK-${j.kode}`;
    
    // Cek apakah mapel dengan kode/nama ini sudah ada
    let mapel = await prisma.mapel.findFirst({
      where: {
        tenant_id: TARGET_TENANT_ID,
        kode_mapel: kodeMapel
      }
    });
    
    if (mapel) {
      console.log(`- Mapel [${namaMapel}] sudah ada. ID: ${mapel.id}`);
    } else {
      mapel = await prisma.mapel.create({
        data: {
          tenant_id: TARGET_TENANT_ID,
          nama_mapel: namaMapel,
          kode_mapel: kodeMapel
        }
      });
      console.log(`- SUKSES membuat mapel: [${namaMapel}] | Kode: ${kodeMapel} | ID: ${mapel.id}`);
    }
  }
  
  console.log("=== SEEDING SELESAI ===");
}

run().catch(console.error);
