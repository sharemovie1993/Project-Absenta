import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany();
  const matches = plans.filter(p => p.max_user === 1000);
  console.log('--- Plans with max_user: 1000 ---');
  console.log(JSON.stringify(matches, null, 2));

  const subs = await prisma.subscription.findMany({
      include: { Plan: true }
  });
  
  console.log('\n--- All Subscriptions with their limits ---');
  const summaries = subs.map(s => ({
      id: s.id,
      tenant_id: s.tenant_id,
      plan_name: s.Plan.name,
      max_user: s.Plan.max_user,
      status: s.status
  }));
  console.log(JSON.stringify(summaries, null, 2));
}

main().finally(() => prisma.$disconnect());
