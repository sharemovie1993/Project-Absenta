import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Auditing SUPERADMIN role records in the database...\n');
  
  const superadminRoles = await prisma.role.findMany({
    where: { name: 'SUPERADMIN' }
  });

  console.log(`Found ${superadminRoles.length} SUPERADMIN roles:`);
  for (const role of superadminRoles) {
    console.log(`- ID: ${role.id} | Name: ${role.name} | Tenant ID: ${role.tenant_id} | Description: ${role.description}`);
  }

  const superadminUser = await prisma.user.findFirst({
    where: { email: 'superadmin@system.com' },
    include: { Role: true }
  });

  if (superadminUser) {
    console.log(`\n👤 User superadmin@system.com:`);
    console.log(`- ID: ${superadminUser.id}`);
    console.log(`- Email: ${superadminUser.email}`);
    console.log(`- Role ID: ${superadminUser.role_id}`);
    console.log(`- Role Name: ${superadminUser.Role?.name}`);
    console.log(`- Role Tenant ID: ${superadminUser.Role?.tenant_id}`);
  } else {
    console.log('\n❌ User superadmin@system.com not found in the database!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
