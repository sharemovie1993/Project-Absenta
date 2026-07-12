import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== DETAIL STRUKTUR KURIKULUM KELAS 11 ===");
  
  // 1. Dapatkan field model StrukturKurikulum
  const sample = await (prisma as any).strukturKurikulum.findFirst();
  console.log("Fields of StrukturKurikulum:", Object.keys(sample || {}));
  
  // 2. Ambil data mapel yang saat ini diplot di kelas 11 untuk tenant ini
  const records = await (prisma as any).strukturKurikulum.findMany({
    where: {
      tenant_id: TARGET_TENANT_ID,
      tingkat: 11
    },
    include: {
      mapel: true
    }
  });
  
  console.log(`\nJumlah record ter-ploting di tingkat 11: ${records.length}`);
  let totalJp = 0;
  records.forEach((r: any) => {
    totalJp += r.jp;
    console.log(`- Mapel: ${r.mapel?.nama_mapel} (${r.mapel?.kode_mapel}) | JP: ${r.jp} | Jurusan ID: ${r.jurusan_id || 'NULL'}`);
  });
  console.log(`Total JP Terhitung: ${totalJp} JP`);
}

run().catch(console.error);
