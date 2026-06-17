import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: { 
      OR: [
        { name: { contains: 'Inventory', mode: 'insensitive' } },
        { name: { contains: 'Standard', mode: 'insensitive' } }
      ]
    }
  });

  console.log('--- Matching Plans ---');
  console.log(JSON.stringify(plans, null, 2));
}

main().finally(() => prisma.$disconnect());
