const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('Checking recent ActivityLogs related to invoices...');
    const logs = await prisma.activityLog.findMany({
      where: {
        action: { contains: 'INVOICE' }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    logs.forEach(log => {
      console.log(`[${log.created_at.toISOString()}] ${log.action} | Entity: ${log.entity_id} | Metadata: ${log.metadata}`);
    });

    console.log('\nChecking recent Invoices...');
    const invoices = await prisma.invoice.findMany({
      orderBy: { updated_at: 'desc' },
      take: 5,
      select: {
        id: true,
        invoice_number: true,
        status: true,
        pdf_storage_key: true,
        updated_at: true
      }
    });
    invoices.forEach(inv => {
      console.log(`[${inv.updated_at.toISOString()}] ${inv.invoice_number} | Status: ${inv.status} | PDF: ${inv.pdf_storage_key || 'MISSING'}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
