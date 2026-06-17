const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const i = await prisma.invoice.findUnique({
    where: { id: 'f6fa2244-2be4-41e8-8d0e-2ac026734caa' }
  });
  console.log(JSON.stringify(i, null, 2));
  await prisma.$disconnect();
}
check();
