import { PaymentGateway, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreatePaymentRequest {
  billingId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  amount: number;
  currency?: string;
  channelCode?: string;
  customerInfo?: CustomerInfo;
  itemDetails?: ItemDetail[];
}

export interface CustomerInfo {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  address?: Address;
}

export interface Address {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface ItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
  brand?: string;
  category?: string;
  merchantName?: string;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  qrString?: string;
  expiresAt?: Date;
  message?: string;
  payCode?: string;
  instructions?: {
    title: string;
    steps: string[];
  }[];
  qrUrl?: string;
  expiredAt?: string;
  // Audit fields
  amount?: number; // Total amount to be paid by customer (inc fees)
  totalFee?: number; // Total fees
  amountReceived?: number; // Net amount received by merchant
  orderItems?: ItemDetail[]; // Item details from gateway
  superseded?: boolean; // Flag to indicate if this payment replaced an existing one
}

export interface WebhookPayload {
  gateway: PaymentGateway;
  signature: string;
  body: any;
  headers: Record<string, string>;
  rawBody?: Buffer | string; // For Stripe signature verification
  ipAddress?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  paidAt?: Date;
  failureReason?: string;
}

// Gateway specific interfaces
export interface MidtransPaymentRequest {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  credit_card?: {
    secure: boolean;
  };
  customer_details?: {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
    billing_address?: Address;
    shipping_address?: Address;
  };
  item_details?: ItemDetail[];
  callbacks?: {
    finish: string;
  };
  expiry?: {
    start_time: string;
    unit: string;
    duration: number;
  };
}

export interface MidtransPaymentResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  redirect_url?: string;
  qr_string?: string;
}

export interface StripePaymentRequest {
  amount: number;
  currency: string;
  payment_method_types: string[];
  customer_email?: string;
  metadata?: Record<string, string>;
  success_url: string;
  cancel_url: string;
}

export interface XenditPaymentRequest {
  external_id: string;
  amount: number;
  payer_email?: string;
  description: string;
  invoice_duration?: number;
  callback_virtual_account_id?: string;
  should_send_email?: boolean;
  customer?: {
    given_names: string;
    surname?: string;
    email: string;
    mobile_number: string;
    addresses?: Address[];
  };
  customer_notification_preference?: {
    invoice_created: string[];
    invoice_reminder: string[];
    invoice_paid: string[];
    invoice_expired: string[];
  };
  success_redirect_url?: string;
  failure_redirect_url?: string;
  currency?: string;
  items?: ItemDetail[];
}

export interface XenditPaymentResponse {
  id: string;
  external_id: string;
  user_id: string;
  status: string;
  merchant_name: string;
  merchant_profile_picture_url: string;
  amount: number;
  payer_email?: string;
  description: string;
  expiry_date: string;
  invoice_url: string;
  available_banks: any[];
  available_retail_outlets: any[];
  available_ewallets: any[];
  available_qr_codes: any[];
  available_direct_debits: any[];
  available_paylaters: any[];
  should_exclude_credit_card: boolean;
  should_send_email: boolean;
  created: string;
  updated: string;
  currency: string;
}

// Payment service interface
export interface PaymentService {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>;
  verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult>;
  getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse>;
  cancelPayment(gatewayTransactionId: string): Promise<boolean>;
}
