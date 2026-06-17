
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPlans() {
  const plans = await prisma.plan.findMany({
    select: { id: true, name: true, is_active: true }
  });
  console.log('Plans found:', JSON.stringify(plans, null, 2));
  await prisma.$disconnect();
}

checkPlans();
