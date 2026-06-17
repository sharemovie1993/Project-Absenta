const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const b = await prisma.billing.findMany({
    where: { subscription_id: 'd07eafda-8fbc-40fb-acef-cf8aa047a49d' },
    include: { Invoice: true }
  });
  console.log(JSON.stringify(b, null, 2));
  await prisma.$disconnect();
}
check();
