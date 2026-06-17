import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tenantRoles = await prisma.role.findMany({
    where: { name: 'ADMIN', tenant_id: { not: null } },
    include: { _count: { select: { permissions: true } } }
  });
  
  console.log('--- ADMIN TENANT ROLES ---');
  for (const role of tenantRoles) {
    console.log(`Role ID: ${role.id}, Tenant ID: ${role.tenant_id}, Permissions: ${role._count.permissions}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
