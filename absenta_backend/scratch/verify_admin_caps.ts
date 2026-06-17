import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const adminRole = await prisma.role.findFirst({
    where: { name: 'ADMIN', tenant_id: null }
  });

  if (!adminRole) {
    console.log('Role ADMIN not found');
    return;
  }

  const permissions = await prisma.rolePermission.findMany({
    where: { role_id: adminRole.id },
    include: { Permission: true }
  });

  console.log(`Role ADMIN now has ${permissions.length} permissions.`);
  
  const news = [
    'sarpras.inventory.manage',
    'hubin.partners.manage',
    'dashboard.view_kepsek',
    'tu.finance.manage'
  ];

  news.forEach(cap => {
    const has = permissions.some(p => p.permission_id === cap);
    console.log(`Capability ${cap}: ${has ? '✅ YES' : '❌ NO'}`);
  });
}

verify().catch(console.error).finally(() => prisma.$disconnect());
