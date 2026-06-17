import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { seedDefaultJenisKegiatanForTenant } from '../../jenis-kegiatan-master/services/jenis-kegiatan-master.service';

let started = false;

export async function initAcademicTenantCreatedConsumer(): Promise<void> {
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
      const key = `domain-event:processed:academic:tenant-created:${idempotencyKey}`;
      const ok = await (conn as any).set(key, '1', 'EX', 6 * 60 * 60, 'NX');
      if (!ok) return;
    } catch {
      return;
    }

    try {
      await seedDefaultJenisKegiatanForTenant(tenantId);
    } catch {}
  });
}
