
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const roleId = '9461bbec-fcf3-427b-830d-282fa9d0c8bc';
    const permissionId = 'billing.my.subscription.create';
    
    const rp = await prisma.rolePermission.findUnique({
        where: {
            role_id_permission_id: {
                role_id: roleId,
                permission_id: permissionId
            }
        }
    });

    console.log(`Relation ADMIN Role <-> ${permissionId}: ${rp ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    const allPerms = await prisma.rolePermission.findMany({
        where: { role_id: roleId },
        select: { permission_id: true }
    });
    
    console.log('\nAll permissions for this role:');
    console.log(allPerms.map(p => p.permission_id).sort().join(', '));

  } catch (err) {
    console.error('Check Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
