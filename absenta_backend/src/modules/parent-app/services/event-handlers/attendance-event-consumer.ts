import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';

let started = false;

export const initParentAppAttendanceEventConsumer = async (): Promise<void> => {
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

    const eventType = String(evt.event_type);
    if (eventType !== 'attendance.tap' && eventType !== 'attendance.session.tap' && eventType !== 'attendance.manual.submit') return;

    const p = (evt.payload || {}) as any;
    const tenantId = String(evt.tenant_id || p.tenant_id || p.tenantId || '').trim();
    const studentId = String(p.student_id || p.studentId || '').trim();
    if (!tenantId || !studentId) return;

    const idempotencyKey = String(
      (evt.metadata as any)?.idempotency_key ||
        (evt.metadata as any)?.idempotencyKey ||
        evt.event_id,
    );

    try {
      const lockKey = `domain-event:processed:parent-app:attendance:${idempotencyKey}`;
      const ok = await (conn as any).set(lockKey, '1', 'EX', 60 * 60, 'NX');
      if (!ok) return;
    } catch {
      return;
    }

    const tapTime = String(p.tap_time || p.timestamp || evt.timestamp || new Date().toISOString());
    const snapshot = {
      event_type: eventType,
      tenant_id: tenantId,
      student_id: studentId,
      status: p.status || null,
      arah: p.arah || null,
      related_id: p.related_id || p.relatedId || null,
      source: p.source || null,
      tap_time: tapTime,
      updated_at: new Date().toISOString(),
    };

    try {
      const key = `parent-app:attendance:last:${tenantId}:${studentId}`;
      await (conn as any).set(key, JSON.stringify(snapshot), 'EX', 60 * 60 * 24 * 30);
    } catch {}
  });
};
