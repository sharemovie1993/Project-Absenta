import type { DomainEvent } from '@/infra/event-bus';
import { getEmailQueue } from '@/queue/email.queue';
import { getNotificationQueue } from '../../notification.queue';

async function acquireLock(conn: any, idempotencyKey: string): Promise<boolean> {
  try {
    const key = `domain-event:processed:notification:request:${idempotencyKey}`;
    const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function handleNotificationRequestDomainEvent(input: {
  evt: DomainEvent<any>;
  conn: any;
  eventType: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const { evt, conn, eventType, idempotencyKey } = input;

  const isEmail = eventType === 'notification.email.send-requested' || eventType === 'notification.email.send_requested';
  const isWhatsapp = eventType === 'notification.whatsapp.send-requested' || eventType === 'notification.whatsapp.send_requested';
  if (!isEmail && !isWhatsapp) {
    return false;
  }

  const locked = await acquireLock(conn, idempotencyKey);
  if (!locked) return true;

  if (isEmail) {
    try {
      await getEmailQueue().add('SEND_EMAIL', evt.payload);
    } catch {}
    return true;
  }

  try {
    await getNotificationQueue().add('notification-whatsapp-send', {
      kind: 'whatsapp',
      eventType: 'notification.whatsapp.send-requested',
      payload: evt.payload,
    } as any);
  } catch {}

  return true;
}
