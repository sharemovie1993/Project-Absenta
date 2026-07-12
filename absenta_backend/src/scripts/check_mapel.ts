import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== CHECKING JURUSAN DI DATABASE PROD ===");
  
  // Ambil semua model Jurusan untuk tenant ini
  try {
    const jurusans = await (prisma as any).jurusan.findMany({
      where: { tenant_id: TARGET_TENANT_ID }
    });
    console.log(`Total Jurusan: ${jurusans.length}`);
    jurusans.forEach((j: any) => {
      console.log(`- ID: ${j.id} | Nama: ${j.nama_jurusan} | Kode: ${j.kode_jurusan}`);
    });
  } catch (e: any) {
    console.error("Error querying Jurusan:", e.message);
  }
}

run().catch(console.error);
