import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: '44497b2b-a4f2-42c5-805b-105db58a6415' }
  });
  console.log('Tenant Name:', tenant?.name);
}

main().finally(() => prisma.$disconnect());
