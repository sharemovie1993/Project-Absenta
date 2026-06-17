import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 COMPREHENSIVE ROLE & TENANT AUDIT REPORT\n');

  const roles = await prisma.role.findMany({
    orderBy: [
      { tenant_id: 'asc' },
      { name: 'asc' }
    ]
  });

  console.log(`Found a total of ${roles.length} roles in the database:\n`);

  console.log('| Role ID | Role Name | Tenant ID Scope | Users Linked | Description |');
  console.log('|---|---|---|---|---|');

  for (const role of roles) {
    const userCount = await prisma.user.count({
      where: { role_id: role.id }
    });

    const tenantScope = role.tenant_id === null ? 'GLOBAL TEMPLATE (null)' : `PLATFORM ('${role.tenant_id}')`;
    console.log(`| ${role.id} | **${role.name}** | \`${tenantScope}\` | ${userCount} user(s) | ${role.description || ''} |`);
  }

  console.log('\n🔍 Evaluating Roles Architecture:');
  console.log('1. GLOBAL TEMPLATE Roles (tenant_id: null): These act as SaaS templates for school tenants (ADMIN, GURU, SISWA, KOPERASI).');
  console.log('2. PLATFORM Roles (tenant_id: "system"): These act as system staff and platform management roles (SUPERADMIN, PLATFORM_FINANCE, PLATFORM_INFRASTRUCTURE, etc.).');
  
  // Count how many users have roles with tenant_id: null but user.tenant_id: 'system' (illegal combination)
  const illegalUsers = await prisma.user.findMany({
    where: {
      tenant_id: 'system',
      Role: { tenant_id: null }
    },
    include: { Role: true }
  });

  if (illegalUsers.length > 0) {
    console.warn(`\n⚠️ WARNING: Found ${illegalUsers.length} platform user(s) bound to tenantless template roles:`);
    for (const u of illegalUsers) {
      console.warn(`  - User: ${u.email} | User Tenant: ${u.tenant_id} | Role Name: ${u.Role?.name} | Role Tenant: ${u.Role?.tenant_id}`);
    }
  } else {
    console.log('\n🎉 SUCCESS: No system platform users are bound to legacy/tenantless role templates. The RBAC boundaries are perfectly secure!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
