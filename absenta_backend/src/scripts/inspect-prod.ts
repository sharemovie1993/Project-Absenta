import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  const tenants = await prisma.tenant.findMany();
  console.log('=== TENANTS ===');
  console.log(JSON.stringify(tenants, null, 2));

  for (const t of tenants) {
    const guruCount = await prisma.guru.count({ where: { tenant_id: t.id } });
    const siswaCount = await prisma.siswa.count({ where: { tenant_id: t.id } });
    const kelasCount = await prisma.kelas.count({ where: { tenant_id: t.id } });
    const posisiCount = await prisma.organizationalPosition.count({ where: { tenant_id: t.id } });
    const assignCount = await prisma.organizationalAssignment.count({ where: { tenant_id: t.id } });
    console.log(`Tenant [${t.name}] (${t.subdomain}): ${guruCount} Guru, ${siswaCount} Siswa, ${kelasCount} Kelas, ${posisiCount} Posisi, ${assignCount} Penugasan`);
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
