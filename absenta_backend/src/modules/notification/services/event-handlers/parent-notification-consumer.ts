import type { DomainEvent } from '@/infra/event-bus';
import { getNotificationQueue } from '../../notification.queue';

async function acquireLock(conn: any, idempotencyKey: string): Promise<boolean> {
  try {
    const key = `domain-event:processed:notification:parent:${idempotencyKey}`;
    const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function handleParentDomainEvent(input: {
  evt: DomainEvent<any>;
  conn: any;
  eventType: string;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const { evt, conn, eventType, tenantId, correlationId, idempotencyKey } = input;

  if (eventType !== 'parent.notification.created') return false;

  const locked = await acquireLock(conn, idempotencyKey);
  if (!locked) return true;

  const p = (evt.payload || {}) as any;
  const parentId = String(p.parent_id || p.parentId || '').trim();
  if (!tenantId || !parentId) return true;

  const messageType = String(p.message_type || p.messageType || '').toUpperCase();
  const title = String(p.title || '');
  const message = String(p.message || '');
  const event = String(p.event || p.event_type || 'GENERAL');
  const relatedId = p.related_id || p.relatedId || null;

  try {
    await getNotificationQueue().add('parent-notification-created', {
      kind: 'parent',
      eventType: 'parent.notification.created',
      tenantId,
      parentId,
      messageType,
      title,
      message,
      event,
      relatedId,
      correlationId: correlationId || undefined,
    } as any);
  } catch {}

  return true;
}
