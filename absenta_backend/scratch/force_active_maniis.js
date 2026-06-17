const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinalStatus() {
  try {
    const tenantId = '118230f8-3023-4101-85b6-76b5004b1810';
    const subs = await prisma.subscription.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, service_code: true, status: true }
    });
    console.log('Final Subscriptions Status:', JSON.stringify(subs, null, 2));
    
    const unactive = subs.filter(s => s.status !== 'ACTIVE' && s.status !== 'TRIAL');
    if (unactive.length > 0) {
      console.log('STILL UNACTIVE:', JSON.stringify(unactive, null, 2));
      for (const s of unactive) {
        console.log(`Forcing ${s.service_code} to ACTIVE...`);
        await prisma.subscription.update({
          where: { id: s.id },
          data: { status: 'ACTIVE' }
        });
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinalStatus();
