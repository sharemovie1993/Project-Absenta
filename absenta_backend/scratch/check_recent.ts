import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const invoices = await prisma.invoice.findMany({
    where: { created_at: { gte: oneHourAgo } },
    orderBy: { created_at: 'desc' }
  });

  console.log('--- Invoices created in the last 1 hour ---');
  console.log(JSON.stringify(invoices, null, 2));

  const subs = await prisma.subscription.findMany({
      where: { created_at: { gte: oneHourAgo } },
      include: { Plan: true }
  });
  console.log('\n--- Subscriptions created in the last 1 hour ---');
  console.log(JSON.stringify(subs, null, 2));
}

main().finally(() => prisma.$disconnect());
