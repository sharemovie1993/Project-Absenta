import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: { max_user: 0 }
  });

  console.log('--- Plans with limit 0 ---');
  console.log(JSON.stringify(plans, null, 2));
}

main().finally(() => prisma.$disconnect());
