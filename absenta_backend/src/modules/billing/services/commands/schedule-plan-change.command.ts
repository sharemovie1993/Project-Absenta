import { subscriptionDb as prisma } from '../repositories/subscription.db';
import { auditLogService } from '@/modules/audit/services/audit-log.service';

export async function schedulePlanChangeCommand(subscriptionId: string, toPlanId: string, reason?: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error('Subscription not found');
  const toPlan = await prisma.plan.findUnique({ where: { id: toPlanId } });
  if (!toPlan || !(toPlan as any).is_active) throw new Error('Target plan not found or inactive');
  const nextDate = (sub as any).next_billing_date ? new Date((sub as any).next_billing_date) : new Date((sub as any).end_date);
  const priceSnapshot = (toPlan as any).price_monthly ?? 0;
  const req = await prisma.planChangeRequest.create({
    data: {
      subscription_id: subscriptionId,
      from_plan_id: (sub as any).plan_id,
      to_plan_id: toPlanId,
      effective_date: nextDate,
      change_type: 'UPGRADE' as any,
      status: 'SCHEDULED' as any,
      price_snapshot: priceSnapshot,
      currency: 'IDR',
      reason: reason || null,
    },
  });
  auditLogService.logEvent({
    event_type: 'billing.subscription.plan_changed',
    severity: 'INFO',
    entity_type: 'PLAN_CHANGE_REQUEST',
    entity_id: req.id,
    tenant_id: (sub as any).tenant_id,
    user_id: null,
    correlation_id: null,
    metadata: {
      stage: 'SCHEDULED',
      subscription_id: subscriptionId,
      from_plan_id: (sub as any).plan_id,
      to_plan_id: toPlanId,
      reason: reason || null,
      effective_date: nextDate.toISOString(),
      price_snapshot: priceSnapshot,
    },
  });
  return req;
}
