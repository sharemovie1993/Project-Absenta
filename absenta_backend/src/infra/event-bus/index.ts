import { subscribeRedisEvents } from './redis.subscriber';
import { randomUUID } from 'crypto';
import { getRedisConnection } from '@/queue/redis';

export const DOMAIN_EVENT_CHANNEL = 'events:domain';

export type DomainEvent<TPayload = any> = {
  event_id: string;
  event_type: string;
  tenant_id: string | null;
  timestamp: string;
  source_service: string;
  payload: TPayload;
  metadata?: Record<string, any>;
};

export async function initEventBus(opts: { redis: any; io: any; ioApi: any }) {
  const { redis, io, ioApi } = opts;
  try {
    await subscribeRedisEvents({ redis, io, ioApi });
  } catch (e) {
    // Keep behavior identical: swallow errors and let app continue
  }
}

export async function emitDomainEvent<TPayload = any>(input: {
  event_type: string;
  tenant_id: string | null;
  source_service: string;
  payload: TPayload;
  metadata?: Record<string, any>;
}): Promise<DomainEvent<TPayload>> {
  const eventId = randomUUID();
  const eventType = String(input.event_type);
  const tenantId = input.tenant_id ? String(input.tenant_id) : null;
  const timestamp = new Date().toISOString();
  const baseMeta = input.metadata || {};
  const correlationId = String(
    (baseMeta as any).correlation_id ||
      (baseMeta as any).correlationId ||
      randomUUID(),
  );
  const idempotencyKey = String(
    (baseMeta as any).idempotency_key ||
      (baseMeta as any).idempotencyKey ||
      eventId,
  );

  const evt: DomainEvent<TPayload> = {
    event_id: eventId,
    event_type: eventType,
    tenant_id: tenantId,
    timestamp,
    source_service: String(input.source_service),
    payload: input.payload,
    metadata: {
      ...baseMeta,
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
    },
  };

  try {
    const redis = getRedisConnection();
    await redis.publish(DOMAIN_EVENT_CHANNEL, JSON.stringify(evt));
  } catch (err) {
    console.warn('[EventBus] Failed to publish event', err);
  }

  return evt;
}
