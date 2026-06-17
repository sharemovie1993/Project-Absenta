import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  for (const t of tenants) {
    const subs = await prisma.subscription.findMany({
      where: { tenant_id: t.id },
      include: { Plan: true },
      orderBy: { end_date: 'desc' }
    });
    if (subs.length === 0) continue;

    const featureSet = new Set<string>(['CORE']);
    for (const s of subs) {
      const planFeatures = Array.isArray(s.Plan?.features_json) ? (s.Plan!.features_json as string[]) : [];
      for (const f of planFeatures) {
        featureSet.add(String(f).toUpperCase());
      }
    }
    const merged = Array.from(featureSet);

    const latest = subs[0];
    const p = latest.Plan!;
    const bp = p.billing_period || 'MONTH';
    const price = bp === 'YEAR' ? p.price_yearly ?? null : p.price_monthly ?? null;

    const existingSnap = (latest as any).plan_snapshot || null;
    const baseSnap = existingSnap && typeof existingSnap === 'object'
      ? { ...existingSnap }
      : { id: p.id, name: p.name, price, billing_period: bp };

    const newSnap: any = { ...baseSnap, features_json: merged };

    await prisma.subscription.update({
      where: { id: latest.id },
      data: { plan_snapshot: newSnap as any }
    });

    console.log(`[FIX] Tenant=${t.id} merged features -> ${JSON.stringify(merged)}`);
  }

  console.log('DONE');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
