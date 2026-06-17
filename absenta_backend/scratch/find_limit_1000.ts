import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: { max_user: 1000 }
  });

  console.log('--- Plans with limit 1000 ---');
  console.log(JSON.stringify(plans, null, 2));

  const allInventoryPlans = await prisma.plan.findMany({
      where: { name: { contains: 'Inventory' } }
  });
  console.log('\n--- All Inventory Plans ---');
  console.log(JSON.stringify(allInventoryPlans, null, 2));
}

main().finally(() => prisma.$disconnect());
