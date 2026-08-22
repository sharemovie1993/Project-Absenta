import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectAllTenants() {
  console.log('🔍 [INSPEKSI SEMUA TENANT DI DATABASE]...\n');

  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
    const posCount = await prisma.organizationalPosition.count({ where: { tenant_id: t.id } });
    const assignCount = await prisma.organizationalAssignment.count({ where: { tenant_id: t.id } });
    const guruCount = await prisma.guru.count({ where: { tenant_id: t.id } });
    const siswaCount = await prisma.siswa.count({ where: { tenant_id: t.id } });
    const jurusanCount = await prisma.jurusan.count({ where: { tenant_id: t.id } });
    const jadwalCount = await prisma.jadwalKBM.count({ where: { tenant_id: t.id } });

    console.log(`🏫 Tenant: ${t.name.padEnd(30)} | UUID: ${t.id}`);
    console.log(`   └─ Positions: ${posCount} | Assigns: ${assignCount} | Guru: ${guruCount} | Siswa: ${siswaCount} | Jurusan: ${jurusanCount} | Jadwal: ${jadwalCount}\n`);
  }
}

inspectAllTenants().catch(console.error).finally(() => prisma.$disconnect());
