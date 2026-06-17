import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '0232fb87-d761-4685-8f40-de10781cea71';
  const invoices = await prisma.invoice.findMany({
    where: { tenant_id: tenantId, status: { not: 'PAID' } },
    orderBy: { created_at: 'desc' }
  });

  console.log('--- Unpaid Invoices for Cimahi ---');
  console.log(JSON.stringify(invoices, null, 2));
}

main().finally(() => prisma.$disconnect());
