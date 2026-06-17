import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Auditing and cleaning up legacy SUPERADMIN role (tenant_id: null)...');
  
  const legacyRole = await prisma.role.findFirst({
    where: { name: 'SUPERADMIN', tenant_id: null }
  });

  if (!legacyRole) {
    console.log('✅ No legacy SUPERADMIN role found. Database is clean!');
    return;
  }

  // Count users using this legacy role
  const userCount = await prisma.user.count({
    where: { role_id: legacyRole.id }
  });

  console.log(`- Legacy Role ID: ${legacyRole.id}`);
  console.log(`- Number of users currently using this legacy role: ${userCount}`);

  if (userCount === 0) {
    console.log('🗑️ No users are using this role. Deleting legacy role permissions and the role itself...');
    
    // Delete role permissions first
    await prisma.rolePermission.deleteMany({
      where: { role_id: legacyRole.id }
    });

    // Delete the role
    await prisma.role.delete({
      where: { id: legacyRole.id }
    });

    console.log('🎉 Successfully cleaned up duplicate legacy SUPERADMIN role!');
  } else {
    console.warn('⚠️ Warning: There are users still linked to the legacy role. Cleanup aborted.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
