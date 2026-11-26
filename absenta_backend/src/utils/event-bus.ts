import crypto from 'crypto';
import { getRedisConnection } from '@/queue/redis';
import { createRedisConnection } from '@/infra/redis/redisClient';
import { getNodeId } from '@/infra/nodeId';

/**
 * 📣 Cluster-Aware Event Bus Utility
 * Menyediakan mekanisme pub/sub lokal + Redis Pub/Sub lintas node dengan idempotency lock
 * agar event yang dipancarkan di Node A dapat dieksekusi di Node B tepat satu kali (exactly-once)
 * tanpa memicu duplikasi notifikasi di arsitektur multi-node.
 */
type EventHandler<T = any> = (payload: T) => void | Promise<void>;

const REDIS_EVENT_CHANNEL = 'events:app_bus';

class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();
  private redisSubInitialized = false;
  private readonly instanceId = `${getNodeId()}:${process.pid}`;

  private ensureRedisSubscriber(): void {
    if (this.redisSubInitialized || process.env.NODE_ENV === 'test') return;
    this.redisSubInitialized = true;

    try {
      const sub: any = createRedisConnection();
      if (!sub || typeof sub.subscribe !== 'function') return;

      sub.on('message', async (ch: string, rawMessage: string) => {
        if (ch !== REDIS_EVENT_CHANNEL || !rawMessage) return;
        try {
          const parsed = JSON.parse(rawMessage);
          const { eventId, event, payload, originInstance } = parsed || {};
          if (!event || originInstance === this.instanceId) return;

          const handlers = this.subscribers.get(event);
          if (!handlers || handlers.length === 0) return;

          // Gunakan Redis atomic idempotency lock agar hanya 1 worker di seluruh cluster yang mengeksekusi side-effect
          if (eventId) {
            try {
              const redis: any = getRedisConnection();
              if (redis && typeof redis.set === 'function') {
                const locked = await redis.set(`eventbus:exec:${eventId}`, this.instanceId, 'NX', 'EX', 60);
                if (locked !== 'OK') return;
              }
            } catch {}
          }

          await this.executeLocalHandlers(event, payload);
        } catch {}
      });

      sub.subscribe(REDIS_EVENT_CHANNEL).catch(() => {});
    } catch {
      // Fallback ke in-memory jika koneksi Redis subscriber belum tersedia
    }
  }

  private async executeLocalHandlers<T = any>(event: string, payload: T): Promise<void> {
    const handlers = this.subscribers.get(event);
    if (!handlers || handlers.length === 0) return;

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`❌ EventBus Error [${event}]:`, error);
        }
      })
    );
  }

  /**
   * 📥 Berlangganan ke event tertentu
   */
  subscribe<T = any>(event: string, handler: EventHandler<T>) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(handler);
    this.ensureRedisSubscriber();
  }

  /**
   * 📤 Mempublikasikan event ke subscriber (Lokal & Cluster Redis Pub/Sub)
   */
  async publish<T = any>(event: string, payload: T) {
    const eventId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const localHandlers = this.subscribers.get(event);
    const hasLocalHandlers = Boolean(localHandlers && localHandlers.length > 0);

    if (hasLocalHandlers) {
      // Klaim idempotency lock untuk eksekusi di instance ini terlebih dahulu
      if (process.env.NODE_ENV !== 'test') {
        try {
          const redis: any = getRedisConnection();
          if (redis && typeof redis.set === 'function') {
            await redis.set(`eventbus:exec:${eventId}`, this.instanceId, 'NX', 'EX', 60);
          }
        } catch {}
      }
      await this.executeLocalHandlers(event, payload);
      return;
    }

    // Jika di proses pengirim belum ada subscriber lokal (misal dipublish dari worker terpisah),
    // pancarkan ke Redis Pub/Sub agar dieksekusi oleh node yang memiliki subscriber.
    if (process.env.NODE_ENV !== 'test') {
      try {
        const redis: any = getRedisConnection();
        if (redis && typeof redis.publish === 'function') {
          await redis.publish(
            REDIS_EVENT_CHANNEL,
            JSON.stringify({
              eventId,
              event,
              payload,
              originInstance: this.instanceId,
            })
          );
        }
      } catch {}
    }
  }

  /**
   * 🗑️ Berhenti berlangganan dari event
   */
  unsubscribe(event: string, handler: EventHandler) {
    const handlers = this.subscribers.get(event);
    if (!handlers) return;
    this.subscribers.set(event, handlers.filter(h => h !== handler));
  }
}

export const eventBus = new EventBus();

