/**
 * 📣 Event Bus Utility
 * Menyediakan mekanisme pub/sub yang ringan untuk komunikasi antar modul.
 * Sangat berguna untuk decoupling logic pada aplikasi SaaS yang kompleks.
 */
type EventHandler<T = any> = (payload: T) => void | Promise<void>;

class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  /**
   * 📥 Berlangganan ke event tertentu
   */
  subscribe<T = any>(event: string, handler: EventHandler<T>) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(handler);
  }

  /**
   * 📤 Mempublikasikan event ke seluruh subscriber
   */
  async publish<T = any>(event: string, payload: T) {
    const handlers = this.subscribers.get(event);
    if (!handlers) return;

    // Menjalankan semua handler secara paralel namun tetap menunggu penyelesaian (jika async)
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
   * 🗑️ Berhenti berlangganan dari event
   */
  unsubscribe(event: string, handler: EventHandler) {
    const handlers = this.subscribers.get(event);
    if (!handlers) return;
    this.subscribers.set(event, handlers.filter(h => h !== handler));
  }
}

export const eventBus = new EventBus();

