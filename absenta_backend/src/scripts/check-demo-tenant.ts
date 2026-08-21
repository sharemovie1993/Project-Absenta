import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDemoTenant() {
  // Cek tenant demo
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { subdomain: 'demo' },
        { id: 'demo-tenant-absenta' }
      ]
    }
  });

  console.log('=== TENANT DEMO ===');
  console.log(JSON.stringify(tenant, null, 2));

  if (!tenant) {
    console.log('❌ Tenant demo tidak ditemukan!');
    return;
  }

  // Cek apakah id-nya UUID atau slug
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = uuidRegex.test(tenant.id);
  console.log(`\nTenant ID format: "${tenant.id}" -> ${isUUID ? '✅ UUID Valid' : '❌ BUKAN UUID - INI PENYEBAB ERROR!'}`);

  // Cek berapa user yang terhubung ke tenant ini
  const userCount = await prisma.user.count({ where: { tenant_id: tenant.id } });
  const guruCount = await prisma.guru.count({ where: { tenant_id: tenant.id } });
  const siswaCount = await prisma.siswa.count({ where: { tenant_id: tenant.id } });
  
  console.log(`\n=== HITUNGAN RELASI ===`);
  console.log(`Users: ${userCount}`);
  console.log(`Guru profiles: ${guruCount}`);
  console.log(`Siswa profiles: ${siswaCount}`);

  // Cek middleware tenant resolution - bagaimana backend menentukan tenant dari domain
  // Cek apakah ada tenant lain dengan UUID yang punya subdomain demo
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, subdomain: true, custom_domain: true }
  });
  console.log(`\n=== SEMUA TENANT DI DATABASE ===`);
  console.log(JSON.stringify(allTenants, null, 2));
}

checkDemoTenant().catch(console.error).finally(() => prisma.$disconnect());
