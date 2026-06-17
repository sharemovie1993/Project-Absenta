import { requestWithFallback } from "./apiUtils";
import type {
  BillingsResponse,
  BillingResponse,
  BillingStatsResponse,
  CreateBillingRequest,
  UpdateBillingRequest,
  MarkPaidRequest,
  GenerateMonthlyBillingRequest,
  BillingQueryParams
} from "../types/billing";
import { BillingStatus } from "../types/billing";

// Get All Billings - GET /api/billing/billings
export async function getAllBillings(params?: BillingQueryParams): Promise<BillingsResponse> {
  const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
  return requestWithFallback<BillingsResponse>('get', '/billing/billings', { params: q });
}

// Get Billing by ID - GET /api/billing/billings/:id
export async function getBillingById(id: string): Promise<BillingResponse> {
  return requestWithFallback<BillingResponse>('get', `/billing/billings/${id}`);
}

// Get Billings by Subscription - GET /api/billing/billings/subscription/:subscription_id
export async function getBillingsBySubscription(subscriptionId: string): Promise<BillingsResponse> {
  return requestWithFallback<BillingsResponse>('get', `/billing/billings/subscription/${subscriptionId}`);
}

// Get Billing Statistics - GET /api/billing/billings/stats
export async function getBillingStats(): Promise<BillingStatsResponse> {
  return requestWithFallback<BillingStatsResponse>('get', '/billing/billings/stats');
}

// Create Billing - POST /api/billing/billings (SUPERADMIN only)
export async function createBilling(data: CreateBillingRequest): Promise<BillingResponse> {
  return requestWithFallback<BillingResponse>('post', '/billing/billings', { data });
}

// Update Billing - PUT /api/billing/billings/:id (SUPERADMIN only)
export async function updateBilling(id: string, data: UpdateBillingRequest): Promise<BillingResponse> {
  return requestWithFallback<BillingResponse>('put', `/billing/billings/${id}`, { data });
}

// Mark Billing as Paid - POST /api/billing/billings/:id/mark-paid
export async function markBillingAsPaid(id: string, data: MarkPaidRequest): Promise<BillingResponse> {
  return requestWithFallback<BillingResponse>('post', `/billing/billings/${id}/mark-paid`, { data });
}

// Mark Billing as Overdue - POST /api/billing/billings/:id/mark-overdue (SUPERADMIN only)
export async function markBillingAsOverdue(id: string): Promise<BillingResponse> {
  return requestWithFallback<BillingResponse>('post', `/billing/billings/${id}/mark-overdue`);
}

// Generate Invoice from Billing - POST /api/billing/billings/:id/generate-invoice
export async function generateInvoiceFromBilling(
  billingId: string, 
  data: { 
    due_date: string; 
    notes?: string; 
  }
): Promise<{
  success: boolean;
  message: string;
  data: any; // Invoice object
}> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('post', `/billing/billings/${billingId}/generate-invoice`, { data });
}

// Generate Monthly Billing - POST /api/billing/billings/generate-monthly (SUPERADMIN only)
export async function generateMonthlyBilling(data: GenerateMonthlyBillingRequest): Promise<{
  success: boolean;
  message: string;
  data: {
    generated_count: number;
    total_amount: number;
  };
}> {
  return requestWithFallback('post', '/billing/billings/generate-monthly', { data });
}

// Check Overdue Billings - POST /api/billing/billings/check-overdue (SUPERADMIN only)
export async function checkOverdueBillings(): Promise<{
  success: boolean;
  message: string;
  data: {
    updated_count: number;
  };
}> {
  return requestWithFallback('post', '/billing/billings/check-overdue');
}

// Trigger Recurring Billing Scheduler - POST /api/billing/billings/run-recurring (SUPERADMIN only)
export async function triggerRecurringBilling(): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('post', '/billing/billings/run-recurring');
}

// Delete Billing - DELETE /api/billing/billings/:id (SUPERADMIN only)
export async function deleteBilling(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('delete', `/billing/billings/${id}`);
}

// Send Invoice - POST /api/billing/billings/:id/send-invoice
export async function sendInvoice(id: string, data: {
  email: string;
  subject: string;
  message: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('post', `/billing/billings/${id}/send-invoice`, { data });
}

// Helper function to get billings with status filter
export async function getBillingsByStatus(status: BillingStatus): Promise<BillingsResponse> {
  return getAllBillings({ status });
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper function to get status badge color
export function getStatusBadgeColor(status: BillingStatus): string {
  switch (status) {
    case BillingStatus.PAID:
      return 'bg-green-100 text-green-800';
    case BillingStatus.UNPAID:
      return 'bg-yellow-100 text-yellow-800';
    case BillingStatus.OVERDUE:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Generate Billing & Invoice for a subscription - POST /api/billing/generate
export async function generateBillingForSubscription(data: { subscription_id: string }): Promise<{
  success: boolean;
  message: string;
  data: any;
}> {
  return requestWithFallback('post', '/billing/billings/generate', { data });
}
