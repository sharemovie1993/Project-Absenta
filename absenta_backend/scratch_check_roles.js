const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- ROLES IN DATABASE ---');
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, description: true }
  });
  console.log(JSON.stringify(roles, null, 2));

  console.log('\n--- POSITIONS IN DATABASE ---');
  const positions = await prisma.organizationalPosition.findMany({
    select: { id: true, name: true, code: true, tenant_id: true }
  });
  console.log(JSON.stringify(positions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
