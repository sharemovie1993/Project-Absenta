import { EventEmitter } from 'events';

export interface PaymentEventData {
  paymentId: string;
  tenantId: string;
  status: string;
  gateway: string;
  amount: number;
  currency: string;
  orderId?: string;
  invoiceNumber?: string;
  timestamp: Date;
  metadata?: any;
}

export interface WebhookEventData {
  webhookId: string;
  gateway: string;
  event: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  tenantId?: string;
  paymentId?: string;
  timestamp: Date;
  error?: string;
}

export class PaymentEvents extends EventEmitter {
  private static instance: PaymentEvents;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multiple tenants
  }

  static getInstance(): PaymentEvents {
    if (!PaymentEvents.instance) {
      PaymentEvents.instance = new PaymentEvents();
    }
    return PaymentEvents.instance;
  }

  /**
   * Emit payment status update event
   */
  emitPaymentUpdate(data: PaymentEventData): void {
    try {
      // Emit general payment update event
      this.emit('payment.status.updated', data);
      
      // Emit tenant-specific event
      this.emit(`payment.status.updated.${data.tenantId}`, data);
      
      // Emit payment-specific event
      this.emit(`payment.${data.paymentId}.updated`, data);
      
      console.log(`Payment event emitted: ${data.paymentId} - ${data.status}`);
    } catch (error) {
      console.error('Error emitting payment update:', error);
    }
  }

  /**
   * Emit webhook processing event
   */
  emitWebhookEvent(data: WebhookEventData): void {
    try {
      // Emit general webhook event
      this.emit('webhook.processed', data);
      
      // Emit gateway-specific event
      this.emit(`webhook.${data.gateway}.processed`, data);
      
      // Emit tenant-specific event if available
      if (data.tenantId) {
        this.emit(`webhook.${data.tenantId}.processed`, data);
      }
      
      console.log(`Webhook event emitted: ${data.webhookId} - ${data.status}`);
    } catch (error) {
      console.error('Error emitting webhook event:', error);
    }
  }

  /**
   * Subscribe to payment updates for a specific tenant
   */
  onPaymentUpdate(tenantId: string, callback: (data: PaymentEventData) => void): void {
    this.on(`payment.status.updated.${tenantId}`, callback);
  }

  /**
   * Subscribe to webhook events for a specific gateway
   */
  onWebhookEvent(gateway: string, callback: (data: WebhookEventData) => void): void {
    this.on(`webhook.${gateway}.processed`, callback);
  }

  /**
   * Subscribe to all payment updates
   */
  onAllPaymentUpdates(callback: (data: PaymentEventData) => void): void {
    this.on('payment.status.updated', callback);
  }

  /**
   * Subscribe to all webhook events
   */
  onAllWebhookEvents(callback: (data: WebhookEventData) => void): void {
    this.on('webhook.processed', callback);
  }

  /**
   * Unsubscribe from tenant-specific payment updates
   */
  offPaymentUpdate(tenantId: string, callback?: (data: PaymentEventData) => void): void {
    if (callback) {
      this.off(`payment.status.updated.${tenantId}`, callback);
    } else {
      this.removeAllListeners(`payment.status.updated.${tenantId}`);
    }
  }

  /**
   * Unsubscribe from gateway-specific webhook events
   */
  offWebhookEvent(gateway: string, callback?: (data: WebhookEventData) => void): void {
    if (callback) {
      this.off(`webhook.${gateway}.processed`, callback);
    } else {
      this.removeAllListeners(`webhook.${gateway}.processed`);
    }
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalListeners: number;
    eventNames: string[];
    listenerCounts: { [event: string]: number };
  } {
    const eventNames = this.eventNames() as string[];
    const listenerCounts: { [event: string]: number } = {};
    
    eventNames.forEach(eventName => {
      listenerCounts[eventName] = this.listenerCount(eventName);
    });

    return {
      totalListeners: eventNames.reduce((total, eventName) => 
        total + this.listenerCount(eventName), 0),
      eventNames,
      listenerCounts
    };
  }
}

// Export singleton instance
export const paymentEvents = PaymentEvents.getInstance();

// Event type definitions for TypeScript
export type PaymentEventType = 
  | 'payment.status.updated'
  | 'webhook.processed'
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded';

export type WebhookEventType =
  | 'webhook.received'
  | 'webhook.processing'
  | 'webhook.completed'
  | 'webhook.failed'
  | 'webhook.duplicate'
  | 'webhook.invalid_signature';