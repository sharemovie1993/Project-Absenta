import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log("=== DETAIL STRUKTUR KURIKULUM & MAPEL KODING PROD ===");
  const koding = await prisma.mapel.findFirst({
    where: { nama_mapel: { contains: "Koding", mode: "insensitive" } }
  });
  
  if (!koding) {
    console.log("Mapel Koding tidak ditemukan!");
    return;
  }
  
  console.log(`Mapel: ID: ${koding.id} | Nama: ${koding.nama_mapel} | Tenant: ${koding.tenant_id}`);
  
  const mappings = await prisma.strukturKurikulum.findMany({
    where: { mapel_id: koding.id }
  });
  
  console.log(`Jumlah Pemetaan Koding di database: ${mappings.length}`);
  for (const m of mappings) {
    const tp = await prisma.tahunPelajaran.findUnique({ where: { id: m.tahun_pelajaran_id } });
    console.log(`- Mapping ID: ${m.id} | Tingkat: ${m.tingkat} | JP: ${m.jp_per_minggu} | Kelompok: ${m.kelompok} | TP: ${tp?.tahun} | Tenant: ${m.tenant_id}`);
  }
}

run().catch(console.error);
