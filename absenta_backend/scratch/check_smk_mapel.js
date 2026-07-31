const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  console.log('=== MAPEL DI SMKN 1 PLERED ===');
  const mapelList = await prisma.mapel.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, nama_mapel: true, kode_mapel: true, tingkat: true }
  });
  console.log('Total Mapel:', mapelList.length);
  mapelList.forEach(m => console.log(`- [${m.kode_mapel || 'NO_KODE'}] ${m.nama_mapel} (Tingkat: ${m.tingkat})`));

  console.log('\n=== STRUKTUR KURIKULUM DI SMKN 1 PLERED ===');
  const struktur = await prisma.strukturKurikulum.findMany({
    where: { tenant_id: tenantId },
    include: { Mapel: true }
  });
  console.log('Total StrukturKurikulum:', struktur.length);
  struktur.forEach(s => console.log(`- [Tingkat ${s.tingkat}] ${s.Mapel?.nama_mapel}: ${s.jp_per_minggu} JP`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
