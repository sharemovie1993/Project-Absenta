
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- SMKN 1 Cimahi Check ---');
    
    // Find tenant SMKN 1 Cimahi
    const tenant = await prisma.tenant.findFirst({
      where: { name: { contains: 'SMKN 1 Cimahi', mode: 'insensitive' } }
    });

    if (!tenant) {
      console.log('Tenant SMKN 1 Cimahi NOT FOUND!');
      return;
    }

    console.log(`Tenant found: ${tenant.name} (id: ${tenant.id})`);

    // Find admin user for this tenant
    const user = await prisma.user.findFirst({
      where: { 
        tenant_id: tenant.id,
        email: 'admin@smkn1cimahi.com'
      },
      include: {
        Role: {
          include: {
            rolePermissions: {
              include: {
                Permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('User admin@smkn1cimahi.com NOT FOUND for this tenant!');
    } else {
      console.log(`User found: ${user.full_name} (${user.email})`);
      console.log(`User's Role: ${user.Role.name} (id: ${user.Role.id}, tenant_id: ${user.Role.tenant_id})`);
      
      const permissions = user.Role.rolePermissions.map(rp => rp.permission_id);
      console.log(`Total permissions: ${permissions.length}`);
      
      const criticalPerms = [
          'billing.my.subscription.view',
          'billing.my.subscription.create',
          'billing.my.subscription.upgrade'
      ];

      console.log('Critical Permissions Check:');
      criticalPerms.forEach(p => {
          console.log(`- ${p}: ${permissions.includes(p) ? '✅ YES' : '❌ NO'}`);
      });

      if (permissions.length < 50) {
          console.log('\nSample permissions found:');
          console.log(permissions.slice(0, 5).join(', '));
      }
    }

    // Check if there are other roles named ADMIN
    const allAdminRoles = await prisma.role.findMany({
        where: { name: 'ADMIN' }
    });
    console.log(`\nFound ${allAdminRoles.length} roles named 'ADMIN' across all tenants.`);
    allAdminRoles.forEach(r => {
        console.log(`- Role ${r.id}: tenant_id=${r.tenant_id}`);
    });

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
