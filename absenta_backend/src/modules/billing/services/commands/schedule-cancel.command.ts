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

export async function scheduleCancelCommand(subscriptionId: string, reason?: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { Plan: true },
  });
  if (!sub) throw new Error('Subscription not found');

  const status = String((sub as any).status || '').toUpperCase();
  if (status === 'UPGRADE_PENDING' || status === 'PENDING_PAYMENT') {
    throw new Error('Cannot cancel while subscription has pending payment/upgrade');
  }

  if (String((sub as any).service_code || '').toUpperCase() === 'CORE') {
    throw new Error('CORE subscription cannot be cancelled');
  }

  const scheduled = await prisma.planChangeRequest.findFirst({
    where: { subscription_id: subscriptionId, status: 'SCHEDULED' as any },
    select: { id: true },
  });
  if (scheduled) throw new Error('A scheduled plan change already exists for this subscription');

  const effectiveAt = (sub as any).next_billing_date ? new Date((sub as any).next_billing_date) : new Date((sub as any).end_date);
  const plan = (sub as any).Plan;
  const priceSnapshot = Math.round(normalizedMonthlyPrice(plan));

  return prisma.planChangeRequest.create({
    data: {
      subscription_id: subscriptionId,
      from_plan_id: String((sub as any).plan_id),
      to_plan_id: null,
      effective_date: effectiveAt,
      change_type: 'CANCEL' as any,
      status: 'SCHEDULED' as any,
      price_snapshot: priceSnapshot,
      currency: String((plan as any)?.currency || 'IDR'),
      reason: reason || null,
    } as any,
  });
}

export async function undoCancelCommand(subscriptionId: string) {
  const existing = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscriptionId,
      status: 'SCHEDULED' as any,
      change_type: 'CANCEL' as any,
    },
    orderBy: { created_at: 'desc' },
  });
  if (!existing) throw new Error('No scheduled cancel found');

  return prisma.planChangeRequest.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' as any },
  });
}

