import { emitDomainEvent } from '@/infra/event-bus';
import { auditLogService } from '@/modules/audit/services/audit-log.service';
import { subscriptionDb as prisma } from '../repositories/subscription.db';

export async function applyDuePlanChangesCommand(): Promise<number> {
  const now = new Date();
  const due = await prisma.planChangeRequest.findMany({
    where: {
      status: 'SCHEDULED' as any,
      change_type: 'UPGRADE' as any,
      effective_date: { lte: now },
    },
    include: {
      Subscription: true,
      toPlan: true,
    },
  });
  let count = 0;
  for (const req of due as any[]) {
    const sub = req.Subscription as any;
    const billingDate = new Date(req.effective_date);
    const dueDate = new Date(billingDate);
    const DUE_DAYS = parseInt(process.env.DUE_DAYS || '3');
    dueDate.setDate(dueDate.getDate() + DUE_DAYS);
    const { billingService } = await import('../billing.service');
    const billing = await billingService.createBilling({
      subscription_id: sub.id,
      amount: req.price_snapshot,
      billing_date: billingDate,
      due_date: dueDate,
      charge_type: 'RECURRING' as any,
    } as any);
    await emitDomainEvent({
      event_type: 'billing.invoice.requested',
      tenant_id: String(sub.tenant_id || '') || null,
      source_service: 'billing',
      payload: {
        tenant_id: String(sub.tenant_id || '') || null,
        subscription_id: String(sub.id),
        billing_id: String((billing as any).id),
        timestamp: new Date().toISOString(),
        invoice_data: { due_date: dueDate.toISOString() },
        send: false,
      },
    });
    auditLogService.logEvent({
      event_type: 'billing.subscription.plan_changed',
      severity: 'INFO',
      entity_type: 'PLAN_CHANGE_REQUEST',
      entity_id: req.id,
      tenant_id: sub.tenant_id,
      user_id: null,
      correlation_id: null,
      metadata: {
        stage: 'APPLIED',
        subscription_id: sub.id,
        from_plan_id: req.from_plan_id,
        to_plan_id: req.to_plan_id,
        billing_id: (billing as any).id,
      },
    });
    count++;
  }
  return count;
}
