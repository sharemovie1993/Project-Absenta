import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415';
  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });

  console.log('--- All Subscriptions for neple ---');
  console.log(JSON.stringify(subs.map(s => ({
      name: s.Plan.name,
      max_user: s.Plan.max_user,
      status: s.status,
      service: s.service_code
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
