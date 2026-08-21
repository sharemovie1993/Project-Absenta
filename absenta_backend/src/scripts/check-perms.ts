import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const tenantId = 'demo-tenant-absenta';
  const roleAdmin = await prisma.role.findFirst({
    where: { tenant_id: tenantId, name: 'ADMIN' }
  });

  console.log('Role ADMIN ID:', roleAdmin?.id);
  if (roleAdmin) {
    const caps = await prisma.rolePermission.findMany({
      where: { role_id: roleAdmin.id },
      include: { Permission: true }
    });
    const capNames = caps.map(c => c.Permission.id);
    console.log('Has academic.structures.view.tree?', capNames.includes('academic.structures.view.tree'));
    console.log('Has academic.structures.view.list?', capNames.includes('academic.structures.view.list'));
    console.log('Total ADMIN permissions:', capNames.length);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
