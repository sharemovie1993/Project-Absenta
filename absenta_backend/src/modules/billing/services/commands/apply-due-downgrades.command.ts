import { subscriptionDb as prisma } from '../repositories/subscription.db';

function snapshotPrice(plan: any): number | null {
  const period = String(plan?.billing_period || 'MONTH').toUpperCase();
  if (period === 'YEAR') {
    if (typeof plan?.price_yearly === 'number') return plan.price_yearly;
    if (typeof plan?.price_monthly === 'number') return plan.price_monthly * 12;
    return null;
  }
  return typeof plan?.price_monthly === 'number' ? plan.price_monthly : null;
}

export async function applyDueDowngradeForSubscriptionCommand(subscriptionId: string, now: Date) {
  const req = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscriptionId,
      status: 'SCHEDULED' as any,
      change_type: 'DOWNGRADE' as any,
      effective_date: { lte: now },
    },
    orderBy: { effective_date: 'asc' },
    include: { toPlan: true },
  });

  if (!req) return null;

  const toPlan: any = (req as any).toPlan;
  if (!toPlan) return null;

  const features: string[] = Array.isArray(toPlan.features_json)
    ? (toPlan.features_json as string[]).map((s: any) => String(s).toUpperCase())
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        plan_id: String((req as any).to_plan_id),
        service_code: String((toPlan as any).service_code || ''),
        plan_snapshot: {
          id: toPlan.id,
          code: (toPlan as any).code,
          service_code: (toPlan as any).service_code,
          name: toPlan.name,
          price: snapshotPrice(toPlan),
          billing_period: toPlan.billing_period,
          features_json: features,
        } as any,
      },
    });
    await tx.planChangeRequest.update({
      where: { id: (req as any).id },
      data: { status: 'APPLIED' as any },
    });
  });

  return req;
}

