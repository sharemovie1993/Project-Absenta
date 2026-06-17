import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '0232fb87-d761-4685-8f40-de10781cea71';
  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });

  console.log('--- All Subscriptions for smkn1cimahi ---');
  console.log(JSON.stringify(subs, null, 2));
}

main().finally(() => prisma.$disconnect());
