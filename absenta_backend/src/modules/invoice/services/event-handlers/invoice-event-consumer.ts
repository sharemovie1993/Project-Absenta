import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL, emitDomainEvent } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { appLogger } from '@/utils/app-logger';
import { RoleName } from '@/constants/enums';
import { invoiceService } from '../invoice.service';

let invoiceDomainConsumerStarted = false;

export async function initInvoiceEventConsumer(): Promise<void> {
  if (invoiceDomainConsumerStarted) return;
  invoiceDomainConsumerStarted = true;

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
    if (String(evt.event_type) !== 'billing.invoice.requested') return;

    const eventType = String(evt.event_type);
    const correlationIdFromMeta = String(
      (evt.metadata as any)?.correlation_id ||
        (evt.metadata as any)?.correlationId ||
        (evt.payload as any)?.correlation_id ||
        (evt.payload as any)?.correlationId ||
        '',
    );
    const idempotencyKey = String(
      (evt.metadata as any)?.idempotency_key ||
        (evt.metadata as any)?.idempotencyKey ||
        evt.event_id,
    );

    try {
      const key = `domain-event:processed:invoice:${idempotencyKey}`;
      const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
      if (!ok) return;
    } catch {
      return;
    }

    const p = (evt.payload || {}) as any;
    const tenantId = (evt.tenant_id ?? p.tenant_id) ? String(evt.tenant_id ?? p.tenant_id) : '';
    const billingId = p.billing_id ? String(p.billing_id) : '';
    const subscriptionId = p.subscription_id ? String(p.subscription_id) : '';
    const invoiceId = p.invoice_id ? String(p.invoice_id) : '';
    const shouldSend = p.send === true;
    const sendRole = (p.send_as_role as RoleName | string | null | undefined) || RoleName.SUPERADMIN;
    const sendTenantId = String(p.send_as_tenant_id || 'system');
    const sendOptions = p.send_options as any;
    const correlationId = correlationIdFromMeta || (p.correlation_id ? String(p.correlation_id) : '');

    if (tenantId) {
      console.log(`[invoice-consumer] event_type=${eventType} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=invoice-consumer`);
    }

    try {
      if (invoiceId) {
        if (shouldSend) {
          await invoiceService.sendInvoice(invoiceId, sendRole as any, sendTenantId, sendOptions);
        }
        return;
      }

      if (!tenantId || !billingId) return;

      const dueRaw = p?.invoice_data?.due_date;
      const due = (() => {
        if (dueRaw instanceof Date) return dueRaw;
        const d = new Date(dueRaw || '');
        return Number.isFinite(d.getTime()) ? d : new Date();
      })();
      const notes = typeof p?.invoice_data?.notes === 'string' ? String(p.invoice_data.notes) : undefined;

      const created = await invoiceService.generateInvoiceFromBilling(
        tenantId,
        billingId,
        { due_date: due, ...(notes ? { notes } : {}) } as any,
      );

      await emitDomainEvent({
        event_type: 'billing.invoice.generated',
        tenant_id: tenantId,
        source_service: 'invoice',
        metadata: correlationId ? { correlation_id: correlationId } : undefined,
        payload: {
          tenant_id: tenantId,
          subscription_id: subscriptionId || null,
          billing_id: billingId,
          invoice_id: (created as any).id,
          timestamp: new Date().toISOString(),
          correlation_id: correlationId,
        },
      });

      if (shouldSend) {
        await invoiceService.sendInvoice(String((created as any).id), sendRole as any, sendTenantId, sendOptions);
      }
    } catch (err) {
      appLogger.error(
        { err, event_id: evt.event_id, tenant_id: tenantId, billing_id: billingId, subscription_id: subscriptionId },
        'invoice.domain_event_consumer_failed',
      );
    }
  });
}

