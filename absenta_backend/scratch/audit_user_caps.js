const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      capabilities: true,
      Role: { select: { name: true } }
    }
  });

  console.log('--- User Capabilities Audit ---');
  users.forEach(u => {
    if (u.capabilities) {
        console.log(`User: ${u.email}, Role: ${u.Role?.name}, Direct Capabilities: ${u.capabilities}`);
    }
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
