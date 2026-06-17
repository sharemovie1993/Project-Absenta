import { subscriptionDb as prisma } from '../repositories/subscription.db';

function normalizedMonthlyPrice(plan: any): number {
  const period = String(plan?.billing_period || 'MONTH').toUpperCase();
  if (period === 'YEAR') {
    const yearly = typeof plan?.price_yearly === 'number' ? plan.price_yearly : null;
    if (typeof yearly === 'number' && yearly > 0) return yearly / 12;
    const monthly = typeof plan?.price_monthly === 'number' ? plan.price_monthly : 0;
    return monthly;
  }
  return typeof plan?.price_monthly === 'number' ? plan.price_monthly : 0;
}

export async function scheduleDowngradeCommand(subscriptionId: string, targetPlanId: string, reason?: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { Plan: true },
  });
  if (!sub) throw new Error('Subscription not found');

  const status = String((sub as any).status || '').toUpperCase();
  if (status === 'UPGRADE_PENDING' || status === 'PENDING_PAYMENT') {
    throw new Error('Cannot downgrade while subscription has pending payment/upgrade');
  }

  if (String((sub as any).service_code || '').toUpperCase() === 'CORE') {
    throw new Error('CORE subscription cannot be downgraded');
  }

  const toPlan = await prisma.plan.findUnique({ where: { id: targetPlanId } });
  if (!toPlan || !(toPlan as any).is_active) throw new Error('Target plan not found or inactive');

  const subService = String((sub as any).service_code || '');
  const toService = String((toPlan as any).service_code || '');
  if (!subService || !toService || subService.toUpperCase() !== toService.toUpperCase()) {
    throw new Error('Target plan must have the same service_code as the subscription');
  }

  const currentPrice = normalizedMonthlyPrice((sub as any).Plan);
  const targetPrice = normalizedMonthlyPrice(toPlan);
  if (!(targetPrice < currentPrice)) {
    throw new Error('Target plan must be a downgrade (lower price)');
  }

  const scheduled = await prisma.planChangeRequest.findFirst({
    where: { subscription_id: subscriptionId, status: 'SCHEDULED' as any },
    select: { id: true, change_type: true },
  });
  if (scheduled) throw new Error('A scheduled plan change already exists for this subscription');

  const effectiveAt = (sub as any).next_billing_date ? new Date((sub as any).next_billing_date) : new Date((sub as any).end_date);
  const priceSnapshot = typeof (toPlan as any).price_monthly === 'number' ? (toPlan as any).price_monthly : Math.round(targetPrice);

  return prisma.planChangeRequest.create({
    data: {
      subscription_id: subscriptionId,
      from_plan_id: String((sub as any).plan_id),
      to_plan_id: String(targetPlanId),
      effective_date: effectiveAt,
      change_type: 'DOWNGRADE' as any,
      status: 'SCHEDULED' as any,
      price_snapshot: priceSnapshot,
      currency: String((toPlan as any).currency || 'IDR'),
      reason: reason || null,
    } as any,
  });
}

export async function cancelDowngradeCommand(subscriptionId: string) {
  const existing = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscriptionId,
      status: 'SCHEDULED' as any,
      change_type: 'DOWNGRADE' as any,
    },
    orderBy: { created_at: 'desc' },
  });
  if (!existing) throw new Error('No scheduled downgrade found');

  return prisma.planChangeRequest.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' as any },
  });
}

