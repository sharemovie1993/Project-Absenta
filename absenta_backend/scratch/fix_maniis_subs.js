const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubscriptions() {
  try {
    const tenantId = '118230f8-3023-4101-85b6-76b5004b1810'; // SMKN MANIIS
    
    // Find subscriptions that are UPGRADE_PENDING
    const pendingSubs = await prisma.subscription.findMany({
      where: {
        tenant_id: tenantId,
        status: 'UPGRADE_PENDING'
      },
      include: {
        Billing: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    console.log(`Found ${pendingSubs.length} pending subscriptions for SMKN MANIIS`);

    for (const sub of pendingSubs) {
      const lastBilling = sub.Billing[0];
      if (lastBilling && lastBilling.status === 'PAID') {
        console.log(`Fixing subscription ${sub.id} (${sub.service_code}) to ACTIVE as billing is PAID`);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { 
            status: 'ACTIVE',
            updated_at: new Date()
          }
        });
      } else {
        console.log(`Subscription ${sub.id} remains PENDING because last billing is ${lastBilling?.status || 'MISSING'}`);
      }
    }

    console.log('Database fix completed.');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSubscriptions();
