const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  
  const subscriptions = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });
  console.log('SMK Negeri 1 Plered Subscriptions:', JSON.stringify(subscriptions, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
