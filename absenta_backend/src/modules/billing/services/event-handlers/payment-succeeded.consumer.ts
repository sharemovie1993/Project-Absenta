import { getRedisConnection } from '@/queue/redis';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';

let started = false;

export async function initBillingPaymentEventConsumer(): Promise<void> {
  if (started) return;
  started = true;

  const conn = getRedisConnection();
  const sub = conn.duplicate();
  await sub.subscribe(DOMAIN_EVENT_CHANNEL);

  sub.on('message', async (_channel: string, _message: string) => {
    // Payment succeeded confirmation is handled by the licensing server
  });
}

