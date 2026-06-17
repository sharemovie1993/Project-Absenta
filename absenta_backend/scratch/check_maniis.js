const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenant() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { name: { contains: 'MANIIS', mode: 'insensitive' } },
      select: { id: true, name: true }
    });

    console.log('Tenants found:', JSON.stringify(tenants, null, 2));

    if (tenants.length > 0) {
      const tenantId = tenants[0].id;
      const subscriptions = await prisma.subscription.findMany({
        where: { tenant_id: tenantId },
        include: {
          Plan: true
        }
      });
      console.log('Subscriptions for', tenants[0].name, ':', JSON.stringify(subscriptions, null, 2));

      const billings = await prisma.billing.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 5
      });
      console.log('Recent Billings:', JSON.stringify(billings, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenant();
