const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true }
    });
    console.log(JSON.stringify(plans, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

getPlans();
