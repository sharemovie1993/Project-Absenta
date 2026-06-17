import { PaymentGateway } from '@prisma/client';
import crypto from 'crypto';
import { paymentConfig } from '../config/payment.config';

export interface MockWebhookData {
  gateway: PaymentGateway;
  payment_id: string;
  amount: number;
  status: string;
  timestamp: string;
  invoice_number?: string;
  tenant_id?: string;
  signature?: string;
  [key: string]: any;
}

export function generateMockWebhook(
  gateway: PaymentGateway, 
  override: Partial<MockWebhookData> = {},
  scenario: 'success' | 'failed' | 'expired' | 'cancelled' = 'success'
): MockWebhookData {
  const baseTimestamp = new Date().toISOString();
  const basePaymentId = `test_${gateway.toLowerCase()}_${Date.now()}`;
  const baseInvoiceNumber = `TEST-INV-${Date.now()}`;
  
  // Base webhook data
  const base: MockWebhookData = {
    gateway,
    payment_id: basePaymentId,
    amount: 100000,
    status: getStatusByScenario(scenario),
    timestamp: baseTimestamp,
    invoice_number: baseInvoiceNumber,
    tenant_id: 'test-tenant-id',
  };

  // Gateway-specific webhook structure
  switch (gateway) {
    case PaymentGateway.MIDTRANS:
      return {
        ...base,
        order_id: baseInvoiceNumber,
        transaction_status: getMidtransStatus(scenario),
        payment_type: 'bank_transfer',
        transaction_id: basePaymentId,
        transaction_time: baseTimestamp,
        gross_amount: '100000.00',
        currency: 'IDR',
        signature_key: 'mock_midtrans_signature',
        ...override
      };

    case PaymentGateway.STRIPE:
      return {
        ...base,
        id: `evt_${basePaymentId}`,
        object: 'event',
        type: getStripeEventType(scenario),
        data: {
          object: {
            id: basePaymentId,
            object: 'payment_intent',
            amount: 100000,
            currency: 'idr',
            status: getStripeStatus(scenario),
            metadata: {
              invoice_number: baseInvoiceNumber,
              tenant_id: 'test-tenant-id'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: `req_${basePaymentId}`,
          idempotency_key: null
        },
        ...override
      };

    case PaymentGateway.XENDIT:
      return {
        ...base,
        id: basePaymentId,
        external_id: baseInvoiceNumber,
        user_id: 'test-user-id',
        status: getXenditStatus(scenario),
        merchant_name: 'Test Merchant',
        amount: 100000,
        currency: 'IDR',
        payment_method: 'BANK_TRANSFER',
        payment_channel: 'BCA',
        payment_destination: '1234567890',
        created: baseTimestamp,
        updated: baseTimestamp,
        ...override
      };

    case PaymentGateway.TRIPAY:
      return {
        ...base,
        merchant_ref: basePaymentId,
        reference: basePaymentId,
        status: getTripayStatus(scenario),
        event: getTripayStatus(scenario),
        amount: 100000,
        currency: 'IDR',
        payment_method: 'QRIS',
        payment_channel: 'TRIPAY',
        paid_at: scenario === 'success' ? baseTimestamp : undefined,
        ...override
      };

    default:
      return { ...base, ...override };
  }
}

function getStatusByScenario(scenario: string): string {
  switch (scenario) {
    case 'success': return 'SUCCESS';
    case 'failed': return 'FAILED';
    case 'expired': return 'EXPIRED';
    case 'cancelled': return 'CANCELLED';
    default: return 'SUCCESS';
  }
}

function getMidtransStatus(scenario: string): string {
  switch (scenario) {
    case 'success': return 'settlement';
    case 'failed': return 'failure';
    case 'expired': return 'expire';
    case 'cancelled': return 'cancel';
    default: return 'settlement';
  }
}

function getStripeStatus(scenario: string): string {
  switch (scenario) {
    case 'success': return 'succeeded';
    case 'failed': return 'payment_failed';
    case 'expired': return 'canceled';
    case 'cancelled': return 'canceled';
    default: return 'succeeded';
  }
}

function getStripeEventType(scenario: string): string {
  switch (scenario) {
    case 'success': return 'payment_intent.succeeded';
    case 'failed': return 'payment_intent.payment_failed';
    case 'expired': return 'payment_intent.canceled';
    case 'cancelled': return 'payment_intent.canceled';
    default: return 'payment_intent.succeeded';
  }
}

function getXenditStatus(scenario: string): string {
  switch (scenario) {
    case 'success': return 'PAID';
    case 'failed': return 'FAILED';
    case 'expired': return 'EXPIRED';
    case 'cancelled': return 'CANCELLED';
    default: return 'PAID';
  }
}

export function generateMockSignature(gateway: PaymentGateway, _payload?: any): string {
  // Generate mock signatures for testing
  switch (gateway) {
    case PaymentGateway.MIDTRANS:
      return `mock_midtrans_signature_${Date.now()}`;
    case PaymentGateway.STRIPE:
      return `mock_stripe_signature_${Date.now()}`;
    case PaymentGateway.XENDIT:
      return `mock_xendit_token_${Date.now()}`;
    case PaymentGateway.TRIPAY:
      try {
        const secret = paymentConfig.tripay.privateKey || '';
        const raw = typeof _payload === 'string' ? _payload : JSON.stringify(_payload || {});
        return crypto.createHmac('sha256', secret).update(raw).digest('hex');
      } catch {
        return `mock_tripay_signature_${Date.now()}`;
      }
    default:
      return `mock_signature_${Date.now()}`;
  }
}

function getTripayStatus(scenario: string): string {
  switch (scenario) {
    case 'success': return 'paid';
    case 'failed': return 'failed';
    case 'expired': return 'expired';
    case 'cancelled': return 'cancel';
    default: return 'paid';
  }
}
