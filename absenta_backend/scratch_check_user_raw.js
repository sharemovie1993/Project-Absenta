const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    where: { name: 'ADMIN' },
    include: {
      rolePermissions: {
        include: { Permission: true }
      }
    }
  });

  console.log(`Found ${roles.length} ADMIN roles`);
  for (const role of roles) {
    const perms = role.rolePermissions.map(p => p.Permission.id);
    console.log(`Role ID: ${role.id}, Tenant: ${role.tenant_id}`);
    console.log(`  Permissions count: ${perms.length}`);
    console.log(`  Has support.tickets.view: ${perms.includes('support.tickets.view')}`);
    console.log(`  Has cooperative.dashboard.view.overview: ${perms.includes('cooperative.dashboard.view.overview')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());