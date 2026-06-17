const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      role_id: true,
      Role: {
        select: {
          name: true,
          tenant_id: true
        }
      }
    }
  });

  console.log('--- User Roles Audit ---');
  for (const u of users) {
    const permCount = await prisma.rolePermission.count({ where: { role_id: u.role_id } });
    console.log(`User: ${u.email}, Role: ${u.Role?.name}, Tenant: ${u.Role?.tenant_id}, Perms: ${permCount}`);
  }

  const allRoles = await prisma.role.findMany({ select: { id: true, name: true, tenant_id: true } });
  console.log('--- All Roles Audit ---');
  for (const r of allRoles) {
      const perms = await prisma.rolePermission.count({ where: { role_id: r.id } });
      if (perms > 0) {
          console.log(`Role: ${r.name}, Tenant: ${r.tenant_id}, Perms: ${perms}`);
      }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
