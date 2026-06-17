import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    where: { plan_snapshot: { equals: Prisma.DbNull } }
  });

  for (const s of subs) {
    const p = await prisma.plan.findUnique({ where: { id: s.plan_id } });
    if (!p) continue;
    const bp = p.billing_period || 'MONTH';
    const price = bp === 'YEAR' ? p.price_yearly ?? null : p.price_monthly ?? null;
    const snap: any = {
      id: p.id,
      name: p.name,
      price,
      billing_period: bp,
      features_json: Array.isArray(p.features_json) ? p.features_json : []
    };
    await prisma.subscription.update({
      where: { id: s.id },
      data: { plan_snapshot: snap as any }
    });
    console.log(`[SNAPSHOT] ${s.id} -> ${p.name}`);
  }

  console.log('DONE');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
