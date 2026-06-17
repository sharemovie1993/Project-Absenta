import type { DomainEvent } from '@/infra/event-bus';
import { getNotificationQueue } from '../../notification.queue';

async function acquireLock(conn: any, idempotencyKey: string): Promise<boolean> {
  try {
    const key = `domain-event:processed:notification:payment:${idempotencyKey}`;
    const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function handlePaymentDomainEvent(input: {
  evt: DomainEvent<any>;
  conn: any;
  eventType: string;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const { evt, conn, eventType, tenantId, correlationId, idempotencyKey } = input;

  if (eventType !== 'payment.succeeded' && eventType !== 'payment.failed' && eventType !== 'payment.webhook.processed') {
    return false;
  }

  const locked = await acquireLock(conn, idempotencyKey);
  if (!locked) return true;

  if (eventType === 'payment.webhook.processed') return true;

  const p = (evt.payload || {}) as any;
  const paymentId = String(p.payment_id || p.paymentId || '').trim();
  if (!paymentId) return true;

  try {
    await getNotificationQueue().add(`payment:${eventType}`, {
      kind: 'payment',
      eventType,
      tenantId,
      paymentId,
      correlationId: correlationId || undefined,
    } as any);
  } catch {}

  return true;
}
