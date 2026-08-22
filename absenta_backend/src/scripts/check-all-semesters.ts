import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.semester.findMany({
    include: { TahunPelajaran: true },
    orderBy: { created_at: 'asc' }
  });
  
  console.log(`Total semester di semua tenant: ${all.length}`);
  for (const s of all) {
    console.log(`[${s.tenant_id}] ${s.is_active ? '🟢 AKTIF' : '⚪     '} | "${s.nama_semester}" | TP: "${s.TahunPelajaran?.tahun}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
