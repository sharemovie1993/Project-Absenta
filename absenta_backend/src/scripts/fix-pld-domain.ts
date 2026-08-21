import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.tenant.update({
    where: { id: '8535b49c-d3fc-4598-922a-7774b49ee7c5' },
    data: {
      custom_domain: 'smkn1pld.absenta.id',
    }
  });
  console.log('✅ Updated SMKN 1 Plered custom_domain to smkn1pld.absenta.id');
}

run().catch(console.error).finally(() => prisma.$disconnect());
