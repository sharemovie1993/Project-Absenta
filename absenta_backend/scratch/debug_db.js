
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- DB Check ---');
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN', tenant_id: null },
      include: {
        RolePermission: {
          select: { permission_id: true }
        }
      }
    });

    if (!adminRole) {
      console.log('Role ADMIN (global) NOT FOUND!');
    } else {
      console.log('Role ADMIN found:', adminRole.id);
      const perms = adminRole.RolePermission.map(rp => rp.permission_id);
      console.log('Required perms check:');
      console.log('- billing.my.subscription.create:', perms.includes('billing.my.subscription.create') ? 'YES' : 'NO');
      console.log('- billing.my.subscription.view:', perms.includes('billing.my.subscription.view') ? 'YES' : 'NO');
    }

    const user = await prisma.user.findFirst({
      where: { email: 'admin@smkn1cimahi.com' },
      include: {
        role: {
          include: {
            RolePermission: {
              select: { permission_id: true }
            }
          }
        }
      }
    });

    if (user) {
      console.log('\n--- User Check ---');
      console.log('User found:', user.email);
      console.log('User Role:', user.role.name, '(tenant_id:', user.role.tenant_id, ')');
      const userPerms = user.role.RolePermission.map(rp => rp.permission_id);
      console.log('- billing.my.subscription.create:', userPerms.includes('billing.my.subscription.create') ? 'YES' : 'NO');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
