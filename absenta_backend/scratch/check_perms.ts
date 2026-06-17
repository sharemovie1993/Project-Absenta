
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN', tenant_id: null },
      include: {
        RolePermission: {
          select: { permission_id: true }
        }
      }
    });

    if (!adminRole) {
      console.log('Role ADMIN (tenant_id: null) not found!');
    } else {
      console.log(`Role ADMIN (id: ${adminRole.id}) found.`);
      const permissions = adminRole.RolePermission.map(rp => rp.permission_id);
      console.log(`Total permissions: ${permissions.length}`);
      
      const check = [
        'billing.my.subscription.view',
        'billing.my.subscription.create',
        'billing.my.subscription.upgrade'
      ];

      check.forEach(p => {
        console.log(`- ${p}: ${permissions.includes(p) ? '✅ YES' : '❌ NO'}`);
      });
    }

    // Check specifically for the user in the screenshot
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
      console.log(`\nUser admin@smkn1cimahi.com (id: ${user.id}) found.`);
      console.log(`User's Role: ${user.role?.name} (tenant_id: ${user.role?.tenant_id})`);
      const userPermissions = user.role?.RolePermission.map(rp => rp.permission_id) || [];
      console.log(`User total permissions: ${userPermissions.length}`);
      
      const check = [
        'billing.my.subscription.create',
      ];
      check.forEach(p => {
        console.log(`- ${p}: ${userPermissions.includes(p) ? '✅ YES' : '❌ NO'}`);
      });
    } else {
      console.log('\nUser admin@smkn1cimahi.com not found.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
