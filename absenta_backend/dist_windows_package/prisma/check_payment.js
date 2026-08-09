
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const invoiceNumber = 'INV-2026-05-0004';
  const payment = await prisma.payment.findFirst({
    where: {
      Invoice: {
        invoice_number: invoiceNumber
      }
    }
  });
  console.log('PAYMENT DATA:', JSON.stringify(payment, null, 2));
  process.exit(0);
}

check();
