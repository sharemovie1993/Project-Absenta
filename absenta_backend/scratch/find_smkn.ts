import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { 
      OR: [
        { name: { contains: 'SMKN', mode: 'insensitive' } },
        { domain: { contains: 'SMKN', mode: 'insensitive' } }
      ]
    }
  });

  console.log('--- Matching Tenants ---');
  console.log(JSON.stringify(tenants, null, 2));
}

main().finally(() => prisma.$disconnect());
