const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const b = await prisma.billing.findMany({
    where: { subscription_id: '9c8d32fc-0816-4f22-a127-a0e57de423bf' },
    include: { Invoice: true }
  });
  console.log(JSON.stringify(b, null, 2));
  await prisma.$disconnect();
}
check();
