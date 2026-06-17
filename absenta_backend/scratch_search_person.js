const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415'; // SMKN 1 PLERED

  const assigns = await prisma.organizationalAssignment.findMany({
    where: { 
      tenant_id: tenantId,
      User: {
        full_name: { contains: 'Agus Waluyo', mode: 'insensitive' }
      }
    },
    include: {
      Position: true,
      User: true
    }
  });

  console.log('--- HASIL PENCARIAN AGUS WALUYO ---');
  console.log(JSON.stringify(assigns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
