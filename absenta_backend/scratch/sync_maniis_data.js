const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncData() {
  try {
    const tenantId = '118230f8-3023-4101-85b6-76b5004b1810'; // SMKN MANIIS
    
    // 1. Get all invoices for this tenant that are PAID
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: tenantId,
        status: 'PAID'
      }
    });

    console.log(`Found ${paidInvoices.length} PAID invoices. Syncing associated billings...`);

    for (const inv of paidInvoices) {
      if (inv.billing_id) {
        const billing = await prisma.billing.findUnique({
          where: { id: inv.billing_id }
        });

        if (billing && billing.status !== 'PAID') {
          console.log(`- Updating Billing ${billing.id} (Invoice ${inv.invoice_number}) to PAID`);
          await prisma.billing.update({
            where: { id: billing.id },
            data: { status: 'PAID' }
          });
        }
      }
    }

    // 2. Now fix subscriptions. Any subscription with a PAID billing should be ACTIVE
    const subs = await prisma.subscription.findMany({
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

    console.log(`Checking ${subs.length} UPGRADE_PENDING subscriptions for activation...`);

    for (const sub of subs) {
      const lastBilling = sub.Billing[0];
      if (lastBilling && lastBilling.status === 'PAID') {
        console.log(`- Activating Subscription ${sub.id} (${sub.service_code})`);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE' }
        });
      }
    }

    console.log('Sync completed successfully.');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

syncData();
