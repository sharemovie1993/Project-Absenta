import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';

async function run() {
  console.log("=== DETAIL STRUKTUR KURIKULUM KELAS 11 ===");
  
  const records = await (prisma as any).strukturKurikulum.findMany({
    where: {
      tenant_id: TARGET_TENANT_ID,
      tingkat: 11
    },
    include: {
      Mapel: true,
      Jurusan: true
    }
  });
  
  console.log(`\nJumlah record ter-ploting di tingkat 11: ${records.length}`);
  let totalJp = 0;
  records.forEach((r: any) => {
    totalJp += r.jp_per_minggu;
    console.log(`- Mapel: ${r.Mapel?.nama_mapel} (${r.Mapel?.kode_mapel}) | JP: ${r.jp_per_minggu} | Kelompok: ${r.kelompok} | Jurusan: ${r.Jurusan?.nama || 'GLOBAL (NULL)'}`);
  });
  console.log(`Total JP Terhitung: ${totalJp} JP`);
}

run().catch(console.error);
