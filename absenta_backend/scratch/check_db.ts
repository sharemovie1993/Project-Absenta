import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { 
      OR: [
        { domain: 'neple' },
        { name: { contains: 'neple', mode: 'insensitive' } }
      ]
    }
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  console.log('--- Tenant Info ---');
  console.log(JSON.stringify(tenant, null, 2));

  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenant.id },
    include: { Plan: true },
    orderBy: { created_at: 'desc' }
  });

  console.log('\n--- Subscriptions ---');
  console.log(JSON.stringify(subs, null, 2));
}

main().finally(() => prisma.$disconnect());
