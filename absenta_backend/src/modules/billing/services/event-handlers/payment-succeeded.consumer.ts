import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { billingDb as prisma } from '../repositories/billing.db';
import { billingService } from '../billing.service';

let started = false;

export async function initBillingPaymentEventConsumer(): Promise<void> {
  if (started) return;
  started = true;

  const conn = getRedisConnection();
  const sub = conn.duplicate();
  await sub.subscribe(DOMAIN_EVENT_CHANNEL);

  sub.on('message', async (_channel: string, message: string) => {
    let evt: DomainEvent<any> | null = null;
    try {
      evt = JSON.parse(message);
    } catch {
      evt = null;
    }
    if (!evt || !evt.event_id || !evt.event_type) return;

    if (String(evt.event_type) !== 'payment.succeeded') return;

    const tenantId = evt.tenant_id ? String(evt.tenant_id) : String((evt.payload as any)?.tenant_id || '');
    const correlationId = String(
      (evt.metadata as any)?.correlation_id ||
        (evt.metadata as any)?.correlationId ||
        (evt.payload as any)?.correlation_id ||
        (evt.payload as any)?.correlationId ||
        '',
    );
    const idempotencyKey = String((evt.metadata as any)?.idempotency_key || (evt.metadata as any)?.idempotencyKey || evt.event_id);

    try {
      const key = `domain-event:processed:billing-payment:${idempotencyKey}`;
      const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
      if (!ok) return;
    } catch {
      return;
    }

    if (tenantId) {
      console.log(`[billing-worker] event_type=payment.succeeded tenant_id=${tenantId} correlation_id=${correlationId} worker_name=billing-worker`);
    }

    const payload = evt.payload || {};
    const confirmedBy = String((payload as any).confirmed_by || (payload as any).confirmedBy || 'SYSTEM');

    const billingIdFromPayload = (payload as any).billing_id || (payload as any).billingId || null;
    const paymentIdFromPayload = (payload as any).payment_id || (payload as any).paymentId || null;
    const invoiceIdFromPayload = (payload as any).invoice_id || (payload as any).invoiceId || null;

    let billingId: string | null = billingIdFromPayload ? String(billingIdFromPayload) : null;
    let paymentMethod: string | undefined = (payload as any).payment_method ? String((payload as any).payment_method) : undefined;
    let paymentReference: string | undefined = (payload as any).transaction_id ? String((payload as any).transaction_id) : undefined;

    try {
      if (!billingId && invoiceIdFromPayload) {
        const inv = await prisma.invoice.findUnique({
          where: { id: String(invoiceIdFromPayload) },
          select: { billing_id: true },
        });
        billingId = inv?.billing_id ? String(inv.billing_id) : null;
      }
    } catch {}

    try {
      if (!billingId && paymentIdFromPayload) {
        const pay = await prisma.payment.findUnique({
          where: { id: String(paymentIdFromPayload) },
          select: { billing_id: true, payment_method: true, gateway_transaction_id: true, id: true },
        });
        billingId = pay?.billing_id ? String(pay.billing_id) : null;
        if (!paymentMethod && pay?.payment_method) paymentMethod = String(pay.payment_method);
        if (!paymentReference) paymentReference = String(pay?.gateway_transaction_id || pay?.id || '');
      }
    } catch {}

    if (!billingId) return;

    try {
      await billingService.markAsPaid(String(billingId), paymentMethod, paymentReference, confirmedBy);
    } catch {}
  });
}

