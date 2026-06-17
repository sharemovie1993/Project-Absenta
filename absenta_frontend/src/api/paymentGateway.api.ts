import { requestWithFallback } from "./apiUtils";
import type { PaymentStatus, PaymentGateway, PaymentMethod } from "../types/paymentGateway.d";

// Payment Gateway API Client
// Based on Payment Module API Documentation

export interface CreatePaymentRequest {
  billingId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  channelCode?: string;
  return_url?: string;
  cancel_url?: string;
  customerInfo?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
    gatewayTransactionId?: string;
    paymentUrl?: string;
    qrString?: string;
    expiresAt?: string;
    message?: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
    gatewayTransactionId?: string;
    paymentUrl?: string;
    qrString?: string;
    expiresAt?: string;
    message?: string;
  };
}

export interface PaymentListResponse {
  success: boolean;
  message: string;
  data: {
    payments: Array<{
      id: string;
      tenant_id: string;
      billing_id: string;
      gateway: string;
      payment_method: string;
      amount: number;
      currency: string;
      status: string;
      gateway_transaction_id?: string;
      paid_at?: string;
      created_at: string;
      updated_at: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface SupportedGatewaysResponse {
  success: boolean;
  message: string;
  data: {
    gateways: string[];
    methods: string[];
  };
}

// Create Payment - POST /api/payments/create
export async function createPayment(payload: CreatePaymentRequest): Promise<PaymentResponse> {
  // Backend expects snake_case keys: billing_id and method
  const serverPayload: Record<string, unknown> = {
    billing_id: payload.billingId,
    gateway: payload.gateway,
    method: payload.paymentMethod,
    // Also include camelCase keys for compatibility with alternate validators
    billingId: payload.billingId,
    paymentMethod: payload.paymentMethod,
  };
  if (payload.channelCode) {
    serverPayload.channel_code = payload.channelCode;
    // Also include camelCase for compatibility
    (serverPayload as any).channelCode = payload.channelCode;
  }
  if (payload.return_url) serverPayload.return_url = payload.return_url;
  if (payload.cancel_url) serverPayload.cancel_url = payload.cancel_url;
  if (payload.customerInfo) {
    (serverPayload as any).customerInfo = payload.customerInfo;
    (serverPayload as any).customer_info = payload.customerInfo;
  }

  return requestWithFallback<PaymentResponse>('post', '/payments/create', { data: serverPayload });
}

// Get Payment Status - GET /api/payments/:payment_id/status
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  return requestWithFallback<PaymentStatusResponse>('get', `/payments/${paymentId}/status`);
}

// Get Payments List - GET /api/payment/list
export async function getPaymentsList(params?: {
  limit?: number;
  page?: number;
  tenant_id?: string;
  status?: string;
  gateway?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
  // Compatibility with older filter naming
  date_from?: string;
  date_to?: string;
  payment_method?: string;
  search?: string;
  allTenants?: boolean; // SUPERADMIN: fetch across all tenants
  skipTenantHeader?: boolean; // SUPERADMIN: always ignore X-Tenant-ID header
}): Promise<PaymentListResponse> {
  const { allTenants, skipTenantHeader, ...rest } = params || {};

  // Normalize query params to match backend expectations
  const query: Record<string, unknown> = { ...rest };
  if (query.date_from && !query.dateFrom) {
    query.dateFrom = query.date_from;
    delete query.date_from;
  }
  if (query.date_to && !query.dateTo) {
    query.dateTo = query.date_to;
    delete query.date_to;
  }
  if (query.payment_method && !query.method) {
    // Backend expects "method" for payment method filter
    query.method = query.payment_method;
    delete query.payment_method;
  }

  const headers: Record<string, string> = {};
  if (allTenants || skipTenantHeader) {
    headers['X-Skip-Tenant'] = 'true';
  }

  const raw: unknown = await requestWithFallback<unknown>('get', "/payments/list", { params: query, headers });
  const rawData = (typeof raw === 'object' && raw !== null) ? ((raw as Record<string, unknown>)['data'] ?? raw) : raw;

  // Support both data.payments and data.items
  let itemsUnknown: unknown = [];
  if (typeof rawData === 'object' && rawData !== null) {
    const rd = rawData as Record<string, unknown>;
    if (Array.isArray(rd['payments'])) itemsUnknown = rd['payments'] as unknown[];
    else if (Array.isArray(rd['items'])) itemsUnknown = rd['items'] as unknown[];
  }
  const items = Array.isArray(itemsUnknown) ? itemsUnknown : [];

  const payments = items.map((item) => {
    const it = (typeof item === 'object' && item !== null) ? (item as Record<string, unknown>) : {};
    return {
      id: String(it['id'] ?? ''),
      tenant_id: String(it['tenant_id'] ?? it['tenantId'] ?? ''),
      billing_id: String(it['billing_id'] ?? it['billingId'] ?? ''),
      gateway: String(it['gateway'] ?? it['provider'] ?? 'MANUAL'),
      payment_method: String(it['payment_method'] ?? it['method'] ?? 'BANK_TRANSFER'),
      amount: typeof it['amount'] === 'number' ? (it['amount'] as number) : Number(it['amount'] ?? 0),
      currency: typeof it['currency'] === 'string' ? (it['currency'] as string) : 'IDR',
      status: String(it['status'] ?? 'PENDING'),
      gateway_transaction_id: (it['gateway_transaction_id'] ?? it['gatewayTransactionId']) as string | undefined,
      payment_url: (it['payment_url'] ?? it['paymentUrl']) as string | undefined,
      qr_string: (it['qr_string'] ?? it['qrString']) as string | undefined,
      expires_at: (it['expires_at'] ?? it['expiresAt']) as string | undefined,
      paid_at: (it['paid_at'] ?? it['paidAt']) as string | undefined,
      created_at: String(it['created_at'] ?? it['createdAt'] ?? ''),
      updated_at: String(it['updated_at'] ?? it['updatedAt'] ?? ''),
      message: it['message'] as string | undefined,
    };
  });

  // Normalize pagination
  let paginationUnknown: unknown = undefined;
  if (typeof rawData === 'object' && rawData !== null) {
    const rd = rawData as Record<string, unknown>;
    paginationUnknown = rd['pagination'] ?? rd['meta'];
  }
  const rdObj = (typeof rawData === 'object' && rawData !== null) ? (rawData as Record<string, unknown>) : {};
  const p = (typeof paginationUnknown === 'object' && paginationUnknown !== null) ? (paginationUnknown as Record<string, unknown>) : {};
  const paginationFallback = {
    page: Number(rdObj['page'] ?? query.page ?? 1),
    limit: Number(rdObj['limit'] ?? query.limit ?? 10),
    total: Number(rdObj['total'] ?? (Array.isArray(items) ? items.length : 0)),
    totalPages: Number(rdObj['totalPages'] ?? rdObj['total_pages'] ?? 1)
  };

  const totalPages = typeof p['totalPages'] === 'number' ? (p['totalPages'] as number) : (
    typeof p['total'] === 'number' && typeof p['limit'] === 'number'
      ? Math.ceil((p['total'] as number) / (p['limit'] as number))
      : paginationFallback.totalPages
  );

  const normalized: PaymentListResponse = {
    success: typeof (raw as Record<string, unknown>)?.['success'] === 'boolean' ? ((raw as Record<string, unknown>)['success'] as boolean) : true,
    message: typeof (raw as Record<string, unknown>)?.['message'] === 'string' ? ((raw as Record<string, unknown>)['message'] as string) : '',
    data: {
      payments,
      pagination: {
        page: typeof p['page'] === 'number' ? (p['page'] as number) : paginationFallback.page,
        limit: typeof p['limit'] === 'number' ? (p['limit'] as number) : paginationFallback.limit,
        total: typeof p['total'] === 'number' ? (p['total'] as number) : payments.length,
        totalPages: Number(totalPages)
      }
    }
  };

  return normalized;
}

// Cancel Payment - POST /api/payments/:payment_id/cancel
export async function cancelPayment(paymentId: string): Promise<{ success: boolean; message: string; data: { cancelled: boolean } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { cancelled: boolean } }>('post', `/payments/${paymentId}/cancel`);
}

// Retry Failed Payment - POST /api/payments/:payment_id/retry
export async function retryPayment(
  paymentId: string, 
  payload: { gateway: string; method: string }
): Promise<PaymentResponse> {
  return requestWithFallback<PaymentResponse>('post', `/payments/${paymentId}/retry`, { data: payload });
}

// Delete Payment - DELETE /api/payments/:payment_id
export async function deletePayment(
  paymentId: string,
  options?: { skipTenantHeader?: boolean }
): Promise<{ success: boolean; message: string; data: { deleted: boolean; payment_id: string } }> {
  const headers: any = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<{ success: boolean; message: string; data: { deleted: boolean; payment_id: string } }>('delete', `/payments/${paymentId}`, { headers });
}

// Test Webhook Processing - POST /api/payments/test/webhook
export interface WebhookTestRequest {
  gateway: 'MIDTRANS' | 'STRIPE' | 'XENDIT' | 'TRIPAY';
  scenario: 'success' | 'failed' | 'expired' | 'cancelled';
}

export interface WebhookTestResultItem {
  gateway: string;
  scenario: string;
  processed: boolean;
  processingTime?: string;
  paymentStatus?: string;
  billingStatus?: string;
  expectedPaymentStatus?: string;
  expectedBillingStatus?: string;
  success: boolean;
}

export interface WebhookTestResponse {
  success: boolean;
  message: string;
  data: WebhookTestResultItem[];
}

export async function testWebhookProcessing(payload: WebhookTestRequest): Promise<WebhookTestResponse> {
  return requestWithFallback<WebhookTestResponse>('post', '/payments/test/webhook', { data: payload });
}

// Get Billing with Payment Summary - GET /api/payments/billing/:billingId/summary
export async function getBillingPaymentSummary(billingId: string) {
  return requestWithFallback<unknown>('get', `/payments/billing/${billingId}/summary`);
}

// Get Supported Gateways - GET /api/payments/gateways
export async function getSupportedGateways(): Promise<SupportedGatewaysResponse> {
  return requestWithFallback<SupportedGatewaysResponse>('get', '/payments/gateways');
}

// Get Tripay Merchant Channels - GET /api/payments/tripay/channels
export interface TripayChannel {
  code: string;
  name: string;
  group?: string;
  fee?: unknown;
  icon_url?: string;
  active?: boolean;
}
export async function getTripayChannels(): Promise<{ success: boolean; message: string; data: TripayChannel[] }> {
  return requestWithFallback<{ success: boolean; message: string; data: TripayChannel[] }>('get', '/payments/tripay/channels');
}

// Health Check - GET /api/payments/health
export async function getPaymentHealthCheck() {
  return requestWithFallback<unknown>('get', '/payments/health');
}

// Utility functions for formatting
export function formatPaymentStatus(status: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    PENDING: 'Menunggu',
    PROCESSING: 'Diproses',
    SUCCESS: 'Berhasil',
    FAILED: 'Gagal',
    CANCELLED: 'Dibatalkan',
    EXPIRED: 'Kadaluarsa'
  };
  return statusMap[status] || status;
}

export function formatGatewayName(gateway: PaymentGateway): string {
  const gatewayMap: Record<PaymentGateway, string> = {
    MIDTRANS: 'Midtrans',
    STRIPE: 'Stripe',
    XENDIT: 'Xendit',
    TRIPAY: 'Tripay',
    MANUAL: 'Manual'
  };
  return gatewayMap[gateway] || gateway;
}

export function formatPaymentMethod(method: PaymentMethod): string {
  const methodMap: Record<PaymentMethod, string> = {
    QRIS: 'QRIS',
    BANK_TRANSFER: 'Transfer Bank',
    CREDIT_CARD: 'Kartu Kredit',
    DEBIT_CARD: 'Kartu Debit',
    E_WALLET: 'E-Wallet',
    CASH: 'Tunai'
  };
  return methodMap[method] || method;
}

export function formatPaymentMethodName(method: string): string {
  const methodMap: Record<string, string> = {
    'QRIS': 'QRIS',
    'BANK_TRANSFER': 'Transfer Bank',
    'CREDIT_CARD': 'Kartu Kredit',
    'DEBIT_CARD': 'Kartu Debit',
    'E_WALLET': 'E-Wallet',
    'CASH': 'Tunai'
  };
  return methodMap[method] || method;
}
