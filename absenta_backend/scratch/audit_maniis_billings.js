const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditBillings() {
  try {
    const tenantId = '118230f8-3023-4101-85b6-76b5004b1810'; // SMKN MANIIS
    
    const billings = await prisma.billing.findMany({
      where: { tenant_id: tenantId },
      include: {
        Invoice: true,
        Subscription: true
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`Auditing ${billings.length} billings for SMKN MANIIS:`);
    billings.forEach(b => {
      console.log(`- ID: ${b.id}, Amount: ${b.amount}, Status: ${b.status}, Charge: ${b.charge_type}, Service: ${b.Subscription?.service_code}, Created: ${b.created_at}`);
      if (b.Invoice) {
        console.log(`  Invoice: ${b.Invoice.invoice_number}, Status: ${b.Invoice.status}`);
      } else {
        console.log(`  Invoice: MISSING`);
      }
    });

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

auditBillings();
