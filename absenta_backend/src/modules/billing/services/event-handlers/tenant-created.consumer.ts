import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL, emitDomainEvent } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';

let started = false;

export async function initBillingTenantCreatedConsumer(): Promise<void> {
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
    if (String(evt.event_type) !== 'tenant.created') return;

    const p = (evt.payload || {}) as any;
    const tenantId = String(evt.tenant_id || p.tenant_id || p.tenantId || '').trim();
    if (!tenantId) return;

    const idempotencyKey = String(
      (evt.metadata as any)?.idempotency_key ||
        (evt.metadata as any)?.idempotencyKey ||
        evt.event_id,
    );

    try {
      const key = `domain-event:processed:billing:tenant-created:${idempotencyKey}`;
      const ok = await (conn as any).set(key, '1', 'EX', 6 * 60 * 60, 'NX');
      if (!ok) return;
    } catch {
      return;
    }

    const correlationId = String(
      (evt.metadata as any)?.correlation_id ||
        (evt.metadata as any)?.correlationId ||
        '',
    );

    const aggregatedBillingId = String(p.aggregated_billing_id || p.aggregatedBillingId || '').trim();
    const subscriptionId = String(p.subscription_id || p.subscriptionId || '').trim();
    const adminEmail = String(p.admin_email || p.adminEmail || '').trim();
    if (!aggregatedBillingId) return;

    const due = new Date();
    due.setDate(due.getDate() + 3);

    try {
      await emitDomainEvent({
        event_type: 'billing.invoice.requested',
        tenant_id: tenantId,
        source_service: 'billing',
        metadata: correlationId ? { correlation_id: correlationId, idempotency_key: `tenant_invoice_${tenantId}` } : { idempotency_key: `tenant_invoice_${tenantId}` },
        payload: {
          tenant_id: tenantId,
          billing_id: aggregatedBillingId,
          subscription_id: subscriptionId || null,
          invoice_data: { due_date: due.toISOString(), notes: 'Initial invoice from tenant registration' },
          send: Boolean(adminEmail),
          send_as_role: 'ADMIN',
          send_as_tenant_id: tenantId,
          send_options: adminEmail ? { recipient_email: adminEmail } : undefined,
          correlation_id: correlationId || undefined,
        },
      });
    } catch {}
  });
}
