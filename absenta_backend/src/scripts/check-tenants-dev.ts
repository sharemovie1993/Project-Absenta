import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenants() {
  console.log('🔍 [MEMERIKSA TENANT DI DATABASE 10.10.10.250]...\n');
  const tenants = await prisma.tenant.findMany();

  console.log(`Ditemukan ${tenants.length} Tenant:`);
  for (const t of tenants) {
    const userCount = await prisma.user.count({ where: { tenant_id: t.id } });
    console.log(`- [${t.id}] ${t.name} (users: ${userCount})`);
  }

  // Cek apakah ada tenant demo
  const demoUsers = await prisma.user.findMany({
    where: { email: { contains: 'absenta.id' } },
    select: { email: true, full_name: true, tenant_id: true }
  });
  console.log(`\nUser Demo yang Ditemukan di 10.10.10.250 (${demoUsers.length} user):`);
  demoUsers.slice(0, 10).forEach(u => console.log(`  * ${u.email} (${u.full_name}) -> Tenant: ${u.tenant_id}`));
}

checkTenants()
  .catch(e => console.error('Error saat koneksi ke 10.10.10.250:', e))
  .finally(() => prisma.$disconnect());
