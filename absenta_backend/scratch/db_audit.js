
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Database Audit ---');
    
    const tenantCount = await prisma.tenant.count();
    console.log('Total Tenants:', tenantCount);
    
    const userCount = await prisma.user.count();
    console.log('Total Users:', userCount);
    
    const users = await prisma.user.findMany({
      take: 10,
      select: { email: true, full_name: true, role_id: true, tenant_id: true }
    });
    console.log('\nSample Users:');
    users.forEach(u => console.log(`- ${u.email} (${u.full_name}) | RoleID: ${u.role_id} | TenantID: ${u.tenant_id}`));

    const adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN', tenant_id: null },
        include: {
            _count: {
                select: { rolePermissions: true }
            }
        }
    });
    
    if (adminRole) {
        console.log(`\nGlobal ADMIN Role: ${adminRole.id}`);
        console.log(`Permission count in DB: ${adminRole._count.rolePermissions}`);
    } else {
        console.log('\nGlobal ADMIN Role NOT FOUND!');
    }

    // Check specific permission presence in Permission table
    const perm = await prisma.permission.findUnique({
        where: { id: 'billing.my.subscription.create' }
    });
    console.log(`\nPermission 'billing.my.subscription.create' in master list: ${perm ? '✅ EXISTS' : '❌ NOT FOUND'}`);

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
