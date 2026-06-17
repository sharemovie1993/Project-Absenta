import { requestWithFallback } from "./apiUtils";
import type {
  ManualPaymentRequest,
  ManualPaymentResponse,
  PaymentHistoryResponse,
  PaymentStats,
  PaymentMethod
} from "../types/payments";

// Mark Billing as Paid (Manual Payment) - POST /api/billing/billings/:id/mark-paid
export async function markBillingAsPaid(
  billingId: string,
  data: {
    payment_method: string;
    note?: string;
  }
): Promise<ManualPaymentResponse> {
  return requestWithFallback<ManualPaymentResponse>('post', `/billing/billings/${billingId}/mark-paid`, { data });
}

// Get Payment History for Billing - GET /api/payments/list?billing_id=:id
export async function getPaymentHistory(
  billingId?: string,
  page: number = 1,
  perPage: number = 10,
  gateway?: string,
  options?: { skipTenantHeader?: boolean; tenant_id?: string; include_billing?: boolean }
): Promise<PaymentHistoryResponse> {
  // Match backend route schema: page + limit (controller will compute offset)
  const params: Record<string, unknown> = {
    page,
    limit: perPage
  };

  if (billingId) {
    params.billing_id = billingId;
  }

  if (gateway) {
    params.gateway = gateway;
  }

  if (options?.tenant_id) {
    params.tenant_id = options.tenant_id;
  }

  if (options?.include_billing) {
    params.include_billing = true;
  }

  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  const raw: unknown = await requestWithFallback<unknown>('get', "/payments/list", { params, headers });

  // Normalize response shape to PaymentHistoryResponse
  let paymentsArray: unknown = [];
  let paginationRaw: unknown = undefined;
  let successFlag = true;
  if (typeof raw === 'object' && raw !== null) {
    const ro = raw as Record<string, unknown>;
    successFlag = Boolean(ro['success']);
    const data = ro['data'];
    if (Array.isArray(data)) {
      paymentsArray = data as unknown[];
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const pa = d['payments'];
      if (Array.isArray(pa)) paymentsArray = pa as unknown[];
      paginationRaw = d['pagination'] ?? ro['pagination'];
    } else {
      paymentsArray = [];
      paginationRaw = ro['pagination'];
    }
  }

  const p = typeof paginationRaw === 'object' && paginationRaw !== null ? (paginationRaw as Record<string, unknown>) : {};
  const pagination = {
    page: typeof p['page'] === 'number' ? p['page'] as number : Number(page ?? 1),
    per_page: typeof p['limit'] === 'number' ? p['limit'] as number : Number(perPage ?? 10),
    total: typeof p['total'] === 'number' ? p['total'] as number : 0,
    total_pages: typeof p['total_pages'] === 'number'
      ? p['total_pages'] as number
      : (typeof p['total'] === 'number' && typeof p['limit'] === 'number' ? Math.ceil((p['total'] as number) / (p['limit'] as number)) : 1)
  };

  // Map backend fields to UI PaymentRecord shape
  const toMethod = (val: unknown): PaymentMethod => {
    const s = typeof val === 'string' ? val : '';
    const m = s.toUpperCase();
    const allowed: PaymentMethod[] = ['MANUAL_TRANSFER','CASH','VOUCHER','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','QRIS','E_WALLET'];
    return (allowed.includes(m as PaymentMethod) ? (m as PaymentMethod) : 'BANK_TRANSFER');
  };
  const arr = Array.isArray(paymentsArray) ? paymentsArray : [];
  const normalized = arr.map((r: unknown) => {
    const o = (typeof r === 'object' && r !== null) ? (r as Record<string, unknown>) : {};
    const pmSrc = o['payment_method'] ?? o['method'];
    const billingObj = ((o['billing'] ?? o['Billing']) as Record<string, unknown> | undefined);
    const invoiceFromRel = (() => {
      if (!billingObj) return '';
      const direct = billingObj['invoice_number'];
      const nested = (billingObj['Invoice'] && typeof billingObj['Invoice'] === 'object') ? ((billingObj['Invoice'] as Record<string, unknown>)['invoice_number']) : undefined;
      return String((direct ?? nested ?? ''));
    })();
    const amountFromRel = (() => {
      if (!billingObj) return NaN;
      const direct = billingObj['amount'];
      const nestedInv = (billingObj['Invoice'] && typeof billingObj['Invoice'] === 'object') ? ((billingObj['Invoice'] as Record<string, unknown>)['amount']) : undefined;
      return Number((direct ?? nestedInv ?? NaN));
    })();
    const tenantNameFromRel = (() => {
      if (!billingObj) return '';
      const sub = billingObj['Subscription'];
      if (sub && typeof sub === 'object') {
        const tenant = (sub as Record<string, unknown>)['Tenant'];
        if (tenant && typeof tenant === 'object') {
          const name = (tenant as Record<string, unknown>)['name'];
          if (typeof name === 'string') return name;
        }
      }
      const t = billingObj['tenant'];
      if (t && typeof t === 'object') {
        const name = (t as Record<string, unknown>)['name'];
        if (typeof name === 'string') return name;
      }
      return '';
    })();
    const txid =
      (o['gateway_transaction_id'] as unknown) ??
      (o['gatewayTransactionId'] as unknown) ??
      (o['reference'] as unknown) ??
      (o['merchant_ref'] as unknown) ??
      (o['payment_reference'] as unknown);
    return {
      id: String(o['id'] ?? ''),
      billing_id: String(o['billing_id'] ?? ''),
      invoice_number: String(o['invoice_number'] ?? (invoiceFromRel || '')),
      amount: Number(o['amount'] ?? (Number.isFinite(amountFromRel) ? amountFromRel : 0)),
      payment_method: toMethod(pmSrc),
      paid_at: String(o['paid_at'] ?? o['created_at'] ?? ''),
      paid_by_id: String(o['paid_by_id'] ?? o['paid_by_user_id'] ?? ''),
      paid_by_name: String(o['paid_by_name'] ?? (tenantNameFromRel || '')),
      note: String(o['note'] ?? ''),
      created_at: String(o['created_at'] ?? ''),
      updated_at: String(o['updated_at'] ?? ''),
      gateway: (typeof o['gateway'] === 'string' ? o['gateway'] : undefined) as string | undefined,
      status: (typeof o['status'] === 'string' ? o['status'] : undefined) as string | undefined,
      currency: (typeof o['currency'] === 'string' ? o['currency'] : undefined) as string | undefined,
      gateway_transaction_id: typeof txid === 'string' ? txid as string : undefined,
    };
  });

  return {
    success: Boolean(successFlag),
    data: normalized,
    pagination
  };
}

// Get All Payment History - GET /api/payments/list
export async function getAllPaymentHistory(
  page: number = 1,
  perPage: number = 10,
  gateway?: string,
  options?: { skipTenantHeader?: boolean; tenant_id?: string; include_billing?: boolean }
): Promise<PaymentHistoryResponse> {
  // Prefer schema-consistent params
  const params: Record<string, unknown> = {
    page,
    limit: perPage
  };

  if (gateway) {
    params.gateway = gateway;
  }

  if (options?.tenant_id) {
    params.tenant_id = options.tenant_id;
  }

  if (options?.include_billing) {
    params.include_billing = true;
  }

  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  const raw: unknown = await requestWithFallback<unknown>('get', "/payments/list", { params, headers });

  let paymentsArray: unknown = [];
  let paginationRaw: unknown = undefined;
  let successFlag = true;
  if (typeof raw === 'object' && raw !== null) {
    const ro = raw as Record<string, unknown>;
    successFlag = Boolean(ro['success']);
    const data = ro['data'];
    if (Array.isArray(data)) {
      paymentsArray = data as unknown[];
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const pa = d['payments'];
      if (Array.isArray(pa)) paymentsArray = pa as unknown[];
      paginationRaw = d['pagination'] ?? ro['pagination'];
    } else {
      paymentsArray = [];
      paginationRaw = ro['pagination'];
    }
  }

  const p = typeof paginationRaw === 'object' && paginationRaw !== null ? (paginationRaw as Record<string, unknown>) : {};
  const pagination = {
    page: typeof p['page'] === 'number' ? p['page'] as number : Number(page ?? 1),
    per_page: typeof p['limit'] === 'number' ? p['limit'] as number : Number(perPage ?? 10),
    total: typeof p['total'] === 'number' ? p['total'] as number : 0,
    total_pages: typeof p['total_pages'] === 'number'
      ? p['total_pages'] as number
      : (typeof p['total'] === 'number' && typeof p['limit'] === 'number' ? Math.ceil((p['total'] as number) / (p['limit'] as number)) : 1)
  };

  const toMethod = (val: unknown): PaymentMethod => {
    const s = typeof val === 'string' ? val : '';
    const m = s.toUpperCase();
    const allowed: PaymentMethod[] = ['MANUAL_TRANSFER','CASH','VOUCHER','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','QRIS','E_WALLET'];
    return (allowed.includes(m as PaymentMethod) ? (m as PaymentMethod) : 'BANK_TRANSFER');
  };
  const arr = Array.isArray(paymentsArray) ? paymentsArray : [];
  const normalized = arr.map((r: unknown) => {
    const o = (typeof r === 'object' && r !== null) ? (r as Record<string, unknown>) : {};
    const pmSrc = o['payment_method'] ?? o['method'];
    const billingObj = ((o['billing'] ?? o['Billing']) as Record<string, unknown> | undefined);
    const invoiceFromRel = (() => {
      if (!billingObj) return '';
      const direct = billingObj['invoice_number'];
      const nested = (billingObj['Invoice'] && typeof billingObj['Invoice'] === 'object') ? ((billingObj['Invoice'] as Record<string, unknown>)['invoice_number']) : undefined;
      return String((direct ?? nested ?? ''));
    })();
    const amountFromRel = (() => {
      if (!billingObj) return NaN;
      const direct = billingObj['amount'];
      const nestedInv = (billingObj['Invoice'] && typeof billingObj['Invoice'] === 'object') ? ((billingObj['Invoice'] as Record<string, unknown>)['amount']) : undefined;
      return Number((direct ?? nestedInv ?? NaN));
    })();
    const tenantNameFromRel = (() => {
      if (!billingObj) return '';
      const sub = billingObj['Subscription'];
      if (sub && typeof sub === 'object') {
        const tenant = (sub as Record<string, unknown>)['Tenant'];
        if (tenant && typeof tenant === 'object') {
          const name = (tenant as Record<string, unknown>)['name'];
          if (typeof name === 'string') return name;
        }
      }
      const t = billingObj['tenant'];
      if (t && typeof t === 'object') {
        const name = (t as Record<string, unknown>)['name'];
        if (typeof name === 'string') return name;
      }
      return '';
    })();
    const txid =
      (o['gateway_transaction_id'] as unknown) ??
      (o['gatewayTransactionId'] as unknown) ??
      (o['reference'] as unknown) ??
      (o['merchant_ref'] as unknown) ??
      (o['payment_reference'] as unknown);
    return {
      id: String(o['id'] ?? ''),
      billing_id: String(o['billing_id'] ?? ''),
      invoice_number: String(o['invoice_number'] ?? (invoiceFromRel || '')),
      amount: Number(o['amount'] ?? (Number.isFinite(amountFromRel) ? amountFromRel : 0)),
      payment_method: toMethod(pmSrc),
      paid_at: String(o['paid_at'] ?? o['created_at'] ?? ''),
      paid_by_id: String(o['paid_by_id'] ?? o['paid_by_user_id'] ?? ''),
      paid_by_name: String(o['paid_by_name'] ?? (tenantNameFromRel || '')),
      note: String(o['note'] ?? ''),
      created_at: String(o['created_at'] ?? ''),
      updated_at: String(o['updated_at'] ?? ''),
      gateway: (typeof o['gateway'] === 'string' ? o['gateway'] : undefined) as string | undefined,
      status: (typeof o['status'] === 'string' ? o['status'] : undefined) as string | undefined,
      currency: (typeof o['currency'] === 'string' ? o['currency'] : undefined) as string | undefined,
      gateway_transaction_id: typeof txid === 'string' ? txid as string : undefined,
      proof_url: String(o['proof_url'] ?? ''),
    };
  });

  return {
    success: Boolean(successFlag),
    data: normalized,
    pagination
  };
}

// Create Manual Payment Record - POST /api/payments/create
export async function createManualPayment(data: ManualPaymentRequest): Promise<ManualPaymentResponse> {
  // Backend expects: { billing_id, gateway, method }
  const payload = {
    // snake_case
    billing_id: data.billing_id,
    gateway: 'MANUAL',
    method: data.payment_method,
    // camelCase compatibility
    billingId: data.billing_id,
    paymentMethod: data.payment_method,
  };
  return requestWithFallback<ManualPaymentResponse>('post', "/payments/create", { data: payload });
}

// Confirm Manual Payment - POST /api/payments/:payment_id/confirm
export async function confirmManualPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
  return requestWithFallback<{ success: boolean; message: string }>('post', `/payments/${paymentId}/confirm`);
}

// Format payment method for display
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'MANUAL_TRANSFER': 'Transfer Manual',
    'CASH': 'Tunai',
    'VOUCHER': 'Voucher',
    'BANK_TRANSFER': 'Transfer Bank',
    'CREDIT_CARD': 'Kartu Kredit',
    'DEBIT_CARD': 'Kartu Debit',
    'QRIS': 'QRIS',
    'E_WALLET': 'E-Wallet'
  };
  
  return methodMap[method] || method;
}

// Get Payment Gateway Health Status - GET /api/payment/test/health-new
export async function getPaymentGatewayHealth(): Promise<unknown> {
  return requestWithFallback<unknown>('get', "/payment/test/health-new");
}

// Get Payment Gateway Performance (derived from payment stats)
export async function getPaymentGatewayPerformance(options?: { skipTenantHeader?: boolean }): Promise<unknown> {
  // Since there's no specific gateway performance endpoint, 
  // we'll use payment stats and format it for gateway performance
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<unknown>('get', "/payment/stats", { headers });
}

// Format currency for payment display
export function formatPaymentAmount(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get Payment Statistics - GET /api/payment/stats
export async function getPaymentStats(
  tenant_id?: string,
  options?: { skipTenantHeader?: boolean }
): Promise<PaymentStats> {
  const params: Record<string, unknown> = tenant_id ? { tenant_id } : {};
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  const raw: unknown = await requestWithFallback<unknown>('get', "/payments/stats", { params, headers });
  let overview: unknown = {};
  let methodsRaw: unknown = {};
  if (typeof raw === 'object' && raw !== null) {
    const ro = raw as Record<string, unknown>;
    const data = ro['data'];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      overview = d['overview'] ?? {};
      methodsRaw = d['methods'] ?? {};
    } else {
      overview = ro['overview'] ?? {};
      methodsRaw = ro['methods'] ?? {};
    }
  }

  const mt = (methodsRaw as Record<string, unknown>)['MANUAL_TRANSFER'];
  const mtTotal = (mt && typeof mt === 'object') ? ((mt as { total?: unknown }).total) : undefined;
  const paymentMethods: Record<PaymentMethod, number> = {
    MANUAL_TRANSFER: Number(mtTotal ?? 0),
    CASH: Number((methodsRaw as Record<string, { total?: unknown }>)['CASH']?.total ?? 0),
    VOUCHER: Number((methodsRaw as Record<string, { total?: unknown }>)['VOUCHER']?.total ?? 0),
    BANK_TRANSFER: Number((methodsRaw as Record<string, { total?: unknown }>)['BANK_TRANSFER']?.total ?? 0),
    CREDIT_CARD: Number((methodsRaw as Record<string, { total?: unknown }>)['CREDIT_CARD']?.total ?? 0),
    DEBIT_CARD: Number((methodsRaw as Record<string, { total?: unknown }>)['DEBIT_CARD']?.total ?? 0),
    QRIS: Number((methodsRaw as Record<string, { total?: unknown }>)['QRIS']?.total ?? 0),
    E_WALLET: Number((methodsRaw as Record<string, { total?: unknown }>)['E_WALLET']?.total ?? 0),
  };

  const mapped: PaymentStats = {
    total_payments: Number((overview as Record<string, unknown>)?.['totalPayments'] ?? (overview as Record<string, unknown>)?.['total_payments'] ?? 0),
    total_amount: Number((overview as Record<string, unknown>)?.['totalAmount'] ?? (overview as Record<string, unknown>)?.['total_amount'] ?? 0),
    payments_today: 0,
    payments_this_month: Number((typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>)['data'] && (raw as Record<string, { recent?: { totalPayments?: unknown } }> )['data']?.recent?.totalPayments) ?? 0),
    payment_methods: paymentMethods
  };
  return mapped;
}
