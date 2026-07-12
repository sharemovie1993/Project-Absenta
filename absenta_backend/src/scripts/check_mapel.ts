import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== SEEDING KONSENTRASI KEAHLIAN TO PRODUCTION DATA ===");
  
  // 1. Cek apakah mapel "Konsentrasi Keahlian" sudah terdaftar di master mapel tenant ini
  let mapel = await prisma.mapel.findFirst({
    where: {
      tenant_id: TARGET_TENANT_ID,
      nama_mapel: 'Konsentrasi Keahlian'
    }
  });
  
  if (mapel) {
    console.log(`Mapel Konsentrasi Keahlian sudah ada di catalog master! ID: ${mapel.id}`);
  } else {
    // Buat mapel baru
    mapel = await prisma.mapel.create({
      data: {
        tenant_id: TARGET_TENANT_ID,
        nama_mapel: 'Konsentrasi Keahlian',
        kode_mapel: 'KK-GLOBAL',
      }
    });
    console.log(`SUKSES membuat mapel Konsentrasi Keahlian baru! ID: ${mapel.id}`);
  }
}

run().catch(console.error);
