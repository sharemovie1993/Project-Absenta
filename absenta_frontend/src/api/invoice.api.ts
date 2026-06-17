// Invoice API Functions based on INVOICE_MODULE_API.md

import { requestWithFallback, formatErrorMessage } from './apiUtils';
import type {
  Invoice,
  InvoiceResponse,
  InvoicesResponse,
  InvoiceStatsResponse,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  SendInvoiceRequest,
  MarkPaidRequest,
  InvoiceQueryParams,
  BillingsForInvoiceResponse,
  BulkInvoiceOperation,
  InvoiceStatus,
  PublicInvoiceResponse
} from '../types/invoice';

// ==================== INVOICE CRUD OPERATIONS ====================

/**
 * Mendapatkan semua invoice dengan filtering dan pagination
 */
export const getAllInvoices = async (
  params?: InvoiceQueryParams,
  options?: { skipTenantHeader?: boolean }
): Promise<InvoicesResponse> => {
  // Ambil response mentah dari backend lalu normalisasi ke bentuk InvoicesResponse
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
  let raw: unknown;
  try {
    raw = await requestWithFallback<unknown>('get', '/invoice', { params: q, headers });
  } catch (e: any) {
    const status = Number(e?.response?.status || e?.status || 0);
    const msg = String(e?.response?.data?.message || e?.message || '').toLowerCase();
    // Fallback untuk environment yang belum memiliki /api/invoice (route not found)
    if (status === 404 || msg.includes('route not found')) {
      const billingsResp: any = await requestWithFallback<unknown>('get', '/billing/billings', { params: { limit: params?.limit ?? 50, page: params?.page ?? 1 }, headers });
      const billingsContainer: any = (billingsResp as any)?.data ?? billingsResp;
      const billingsArr: any[] =
        Array.isArray(billingsContainer?.data) ? billingsContainer.data :
        Array.isArray(billingsContainer) ? billingsContainer :
        Array.isArray((billingsContainer?.data as any)?.data) ? (billingsContainer?.data as any).data : [];
      const invoicesFromBillings: any[] = (billingsArr || [])
        .map((b: any) => b?.Invoice)
        .filter((inv: any) => !!inv)
        .map((inv: any) => ({
          ...inv,
          amount: inv?.amount ?? (inv?.total_amount ?? 0),
        }));
      const filtered = params?.status ? invoicesFromBillings.filter((inv: any) => String(inv?.status) === String(params?.status)) : invoicesFromBillings;
      return {
        success: true,
        message: 'OK (fallback via billings)',
        data: {
          invoices: filtered as any,
          pagination: {
            total_pages: 1,
            total_count: filtered.length,
            current_page: params?.page ?? 1,
            per_page: params?.limit ?? filtered.length
          }
        }
      };
    }
    throw e;
  }

  let success = true;
  let message = 'OK';
  let dataObj: unknown = undefined;
  let topPagination: unknown = undefined;

  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['success'] === 'boolean') success = obj['success'] as boolean;
    if (typeof obj['message'] === 'string') message = obj['message'] as string;
    dataObj = obj['data'];
    topPagination = obj['pagination'];
  }

  let listUnknown: unknown = [];
  let innerPagination: unknown = undefined;

  if (dataObj && typeof dataObj === 'object') {
    const d = dataObj as Record<string, unknown>;
    if (Array.isArray(d['data'])) listUnknown = d['data'];
    else if (Array.isArray(d['invoices'])) listUnknown = d['invoices'];
    innerPagination = d['pagination'];
    const dd = d['data'];
    if (dd && typeof dd === 'object') {
      const inner = dd as Record<string, unknown>;
      if (Array.isArray(inner['data'])) listUnknown = inner['data'];
      else if (Array.isArray(inner['invoices'])) listUnknown = inner['invoices'];
      if (inner['pagination']) innerPagination = inner['pagination'];
    }
  }

  if (Array.isArray(raw)) {
    listUnknown = raw;
  }

  const invoices = Array.isArray(listUnknown) ? (listUnknown as Invoice[]) : [];

  const pagSrc = innerPagination ?? topPagination ?? {};
  const p = typeof pagSrc === 'object' && pagSrc !== null ? (pagSrc as Record<string, unknown>) : {};

  const normalized: InvoicesResponse = {
    success,
    message,
    data: {
      invoices,
      pagination: {
        total_pages:
          typeof p['totalPages'] === 'number' ? (p['totalPages'] as number) :
          typeof p['total_pages'] === 'number' ? (p['total_pages'] as number) : 1,
        total_count:
          typeof p['total'] === 'number' ? (p['total'] as number) :
          typeof p['total_count'] === 'number' ? (p['total_count'] as number) : (Array.isArray(invoices) ? invoices.length : 0),
        current_page:
          typeof p['page'] === 'number' ? (p['page'] as number) :
          typeof p['current_page'] === 'number' ? (p['current_page'] as number) : 1,
        per_page:
          typeof p['limit'] === 'number' ? (p['limit'] as number) :
          typeof p['per_page'] === 'number' ? (p['per_page'] as number) : (params?.limit ?? 10),
      },
    },
  };

  return normalized;
};

/**
 * Mendapatkan invoice berdasarkan ID
 */
// getInvoiceById dihapus (tidak dipakai UI pasca-freeze)

/**
 * Mendapatkan preview invoice format publik (internal/admin)
 */
export const getInvoicePreview = async (
  id: string,
  options?: { skipTenantHeader?: boolean; tenantId?: string }
): Promise<{ success: boolean; message: string; data: PublicInvoiceResponse }> => {
  let headers: Record<string, string> | undefined;
  if (options?.skipTenantHeader) {
    headers = { 'X-Skip-Tenant': 'true' };
  } else if (options?.tenantId) {
    headers = { 'X-Tenant-ID': options.tenantId };
  }
  return requestWithFallback<{ success: boolean; message: string; data: PublicInvoiceResponse }>('get', `/invoice/${id}/preview`, { headers });
};

/**
 * Membuat invoice baru dari billing
 */
// createInvoice dihapus (tidak dipakai UI pasca-freeze)

/**
 * Memperbarui invoice (hanya untuk status DRAFT)
 */
// updateInvoice dihapus (tidak dipakai UI pasca-freeze)

/**
 * Menghapus invoice (hanya untuk status DRAFT)
 */
// deleteInvoice dihapus (tidak dipakai UI pasca-freeze)

// ==================== INVOICE STATUS OPERATIONS ====================

/**
 * Send invoice - Menggunakan endpoint send yang tersedia di backend
 */
export const sendInvoice = async (id: string, payload?: SendInvoiceRequest): Promise<InvoiceResponse> => {
  return requestWithFallback<InvoiceResponse>('put', `/invoice/${id}/send`, { data: payload ?? {} });
};

/**
 * Menandai invoice sebagai lunas (mengubah status ke PAID)
 * MOVED to Payment Routes for SA-IS Compliance
 */
// markInvoiceAsPaid dihapus (tidak dipakai UI pasca-freeze)

/**
 * Membatalkan invoice (mengubah status ke CANCELLED)
 */
// cancelInvoice dihapus (tidak dipakai UI pasca-freeze)

// ==================== INVOICE STATISTICS & ANALYTICS ====================

/**
 * Mendapatkan statistik invoice
 */
export const getInvoiceStats = async (params?: {
  tenant_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<InvoiceStatsResponse> => {
  return requestWithFallback<InvoiceStatsResponse>('get', '/invoice/stats', { params });
};

/**
 * Mendapatkan data dashboard invoice - Menggunakan stats yang tersedia di backend
 */
export const getInvoiceDashboard = async (params?: {
  tenant_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<InvoiceStatsResponse> => {
  return requestWithFallback<InvoiceStatsResponse>('get', '/invoice/stats', { params });
};

/**
 * Dashboard metrics - Menggunakan stats yang tersedia di backend
 */
export const getDashboardMetrics = async (): Promise<InvoiceStatsResponse> => {
  return requestWithFallback<InvoiceStatsResponse>('get', '/invoice/stats');
};

/**
 * Mendapatkan invoice berdasarkan status
 */
export const getInvoicesByStatus = async (status: InvoiceStatus, params?: {
  tenant_id?: string;
  limit?: number;
  offset?: number;
}): Promise<InvoicesResponse> => {
  return requestWithFallback<InvoicesResponse>('get', '/invoice', { params: { status, ...params } });
};

/**
 * Mendapatkan invoice yang jatuh tempo
 */
export const getOverdueInvoices = async (params?: {
  tenant_id?: string;
  days_overdue?: number;
}): Promise<InvoicesResponse> => {
  return requestWithFallback<InvoicesResponse>('get', '/invoice', { params: { status: 'OVERDUE', ...params } });
};

// ==================== BILLING INTEGRATION ====================

/**
 * Mendapatkan billing yang belum memiliki invoice
 */
export const getBillingsForInvoice = async (params?: {
  tenant_id?: string;
  status?: string;
}): Promise<BillingsForInvoiceResponse> => {
  return requestWithFallback<BillingsForInvoiceResponse>('get', '/billing', { params: { has_invoice: false, ...params } });
};

/**
 * Mendapatkan invoice berdasarkan billing ID
 */
export const getInvoiceByBillingId = async (billingId: string): Promise<InvoiceResponse> => {
  try {
    const raw: unknown = await requestWithFallback<unknown>('get', '/invoice', { params: { billing_id: billingId, limit: 1 } });
    let success = true;
    let message = 'OK';
    let dataObj: unknown = undefined;
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj['success'] === 'boolean') success = obj['success'] as boolean;
      if (typeof obj['message'] === 'string') message = obj['message'] as string;
      dataObj = obj['data'];
    }

    const arrays: unknown[][] = [];
    if (dataObj && typeof dataObj === 'object') {
      const d = dataObj as Record<string, unknown>;
      if (Array.isArray(d['data'])) arrays.push(d['data'] as unknown[]);
      if (Array.isArray(d['invoices'])) arrays.push(d['invoices'] as unknown[]);
      const dd = d['data'];
      if (dd && typeof dd === 'object') {
        const inner = dd as Record<string, unknown>;
        if (Array.isArray(inner['data'])) arrays.push(inner['data'] as unknown[]);
        if (Array.isArray(inner['invoices'])) arrays.push(inner['invoices'] as unknown[]);
      }
    }
    if (Array.isArray(dataObj)) arrays.push(dataObj as unknown[]);
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj['data'])) arrays.push(obj['data'] as unknown[]);
    }

    const list = arrays.find(arr => Array.isArray(arr)) ?? [];
    const getBilling = (inv: unknown): string | undefined => {
      if (typeof inv === 'object' && inv !== null) {
        const o = inv as Record<string, unknown>;
        const v = o['billing_id'];
        const v2 = o['billingId'];
        if (typeof v === 'string') return v;
        if (typeof v2 === 'string') return v2;
      }
      return undefined;
    };
    const found = Array.isArray(list) ? list.find(inv => getBilling(inv) === billingId) : undefined;
    const invoice = (found ?? (Array.isArray(list) ? list[0] : undefined)) as Invoice | undefined;
    if (invoice) {
      return { success, message, data: invoice };
    }
    throw new Error('Invoice tidak ditemukan untuk billing ini');
  } catch (error: unknown) {
    throw new Error(formatErrorMessage(error));
  }
};

// ==================== BULK OPERATIONS ====================

/**
 * Operasi bulk untuk multiple invoice
 */
// bulkInvoiceOperation dihapus (tidak dipakai UI pasca-freeze)

/**
 * Mengirim multiple invoice sekaligus
 */
// sendMultipleInvoices dihapus (tidak dipakai UI pasca-freeze)

/**
 * Menandai multiple invoice sebagai lunas
 */
// markMultipleInvoicesAsPaid dihapus (tidak dipakai UI pasca-freeze)

// ==================== EXPORT & DOWNLOAD ====================

// Note: Endpoint download, export, bulk operations, dan search tidak tersedia di backend
// Fitur ini akan diimplementasikan di frontend menggunakan library client-side

// ==================== SEARCH & FILTERING ====================

/**
 * Pencarian invoice dengan query string
 */
export const searchInvoices = async (query: string, filters?: {
  status?: InvoiceStatus;
  tenant_id?: string;
  date_range?: { start: string; end: string };
}): Promise<InvoicesResponse> => {
  const params = {
    search: query,
    ...filters
  };
  
  return getAllInvoices(params);
};

/**
 * Mendapatkan invoice berdasarkan tenant
 */
export const getInvoicesByTenant = async (tenantId: string, params?: {
  status?: InvoiceStatus;
  limit?: number;
  offset?: number;
}): Promise<InvoicesResponse> => {
  return getAllInvoices({
    tenant_id: tenantId,
    ...params
  });
};

// ==================== VALIDATION & UTILITIES ====================

/**
 * Validasi apakah invoice dapat diperbarui
 */
export const canUpdateInvoice = (invoice: Invoice): boolean => {
  return invoice.status === 'DRAFT';
};

/**
 * Validasi apakah invoice dapat dikirim
 */
export const canSendInvoice = (invoice: Invoice): boolean => {
  return invoice.status === 'DRAFT';
};

/**
 * Validasi apakah invoice dapat ditandai sebagai lunas
 */
export const canMarkAsPaid = (invoice: Invoice): boolean => {
  return invoice.status === 'SENT' || invoice.status === 'OVERDUE';
};

/**
 * Validasi apakah invoice dapat dibatalkan
 */
export const canCancelInvoice = (invoice: Invoice): boolean => {
  return invoice.status === 'DRAFT' || invoice.status === 'SENT';
};

/**
 * Validasi apakah invoice dapat dihapus
 */
export const canDeleteInvoice = (invoice: Invoice): boolean => {
  return invoice.status === 'DRAFT';
};

/**
 * Mendapatkan warna status invoice
 */
export const getInvoiceStatusColor = (status: InvoiceStatus): string => {
  const colors = {
    DRAFT: 'gray',
    SENT: 'blue',
    VIEWED: 'blue',
    PAID: 'green',
    OVERDUE: 'red',
    CANCELLED: 'orange'
  };
  return colors[status] || 'gray';
};

/**
 * Format currency untuk invoice
 */
export const formatInvoiceAmount = (amount: number, currency: string = 'IDR'): string => {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Hitung total amount dengan tax
 */
export const calculateTotalAmount = (amount: number, taxRate: number = 0): number => {
  const taxAmount = amount * (taxRate / 100);
  return amount + taxAmount;
};

/**
 * Check apakah invoice sudah jatuh tempo
 */
export const isInvoiceOverdue = (invoice: Invoice): boolean => {
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
    return false;
  }
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

/**
 * Hitung hari terlambat
 */
export const getDaysOverdue = (invoice: Invoice): number => {
  if (!isInvoiceOverdue(invoice)) {
    return 0;
  }
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Alias untuk backward compatibility
export const getInvoicesFromAPI = getAllInvoices;

// Export sebagai object untuk kemudahan penggunaan
export const invoiceApi = {
  getAllInvoices,
  getInvoicePreview,
  sendInvoice,
  getInvoiceStats,
  getInvoiceDashboard,
  getDashboardMetrics,
  getInvoicesByStatus,
  getOverdueInvoices,
  getBillingsForInvoice,
  getInvoiceByBillingId,
  searchInvoices,
  getInvoicesByTenant,
  canUpdateInvoice,
  canSendInvoice,
  getInvoiceStatusColor,
  formatInvoiceAmount,
  calculateTotalAmount,
  isInvoiceOverdue,
  getDaysOverdue
};
