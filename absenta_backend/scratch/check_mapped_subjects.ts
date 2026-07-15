import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });
  console.log("=== TENANTS ===");
  tenants.forEach(t => console.log(`ID: ${t.id} | Name: ${t.name}`));

  const all = await prisma.strukturKurikulum.findMany({
    include: { Mapel: true, Tenant: true }
  });

  console.log("\n=== MAPPED SUBJECTS ===");
  all.forEach(item => {
    console.log(`Tenant: ${item.Tenant?.name} | Tingkat: ${item.tingkat} | Kelompok: ${item.kelompok} | Mapel: ${item.Mapel?.nama_mapel} (${item.Mapel?.kode_mapel}) | JP: ${item.jp_per_minggu}`);
  });
}

run().catch(console.error);
