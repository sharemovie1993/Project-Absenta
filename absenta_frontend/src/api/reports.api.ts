import { requestWithFallback } from "./apiUtils";
import type {
  ReportData,
  ReportFilters,
  PaymentGatewayStats,
  SubscriptionTrends,
  RevenueBreakdown
} from "../types/billing";

// Get Revenue Report - GET /api/billing/reports/revenue
export async function getRevenueReport(filters?: ReportFilters): Promise<{
  success: boolean;
  message: string;
  data: ReportData;
}> {
  const q: Record<string, unknown> | undefined = filters ? { ...filters } : undefined;
  return requestWithFallback('get', '/billing/reports/revenue', { params: q });
}

// Get Payment Gateway Statistics - GET /api/billing/reports/payment-gateways
export async function getPaymentGatewayStats(): Promise<{
  success: boolean;
  message: string;
  data: PaymentGatewayStats[];
}> {
  return requestWithFallback('get', '/billing/reports/payment-gateways');
}

// Get Subscription Trends - GET /api/billing/reports/subscription-trends
export async function getSubscriptionTrends(filters?: ReportFilters): Promise<{
  success: boolean;
  message: string;
  data: SubscriptionTrends;
}> {
  const q: Record<string, unknown> | undefined = filters ? { ...filters } : undefined;
  return requestWithFallback('get', '/billing/reports/subscription-trends', { params: q });
}

// Get Revenue Breakdown - GET /api/billing/reports/revenue-breakdown
export async function getRevenueBreakdown(filters?: ReportFilters): Promise<{
  success: boolean;
  message: string;
  data: RevenueBreakdown;
}> {
  const q: Record<string, unknown> | undefined = filters ? { ...filters } : undefined;
  return requestWithFallback('get', '/billing/reports/revenue-breakdown', { params: q });
}

// Generate Report - POST /api/billing/reports/generate
export async function generateReport(filters: ReportFilters): Promise<{
  success: boolean;
  message: string;
  data: {
    report_id: string;
    download_url: string;
  };
}> {
  return requestWithFallback('post', '/billing/reports/generate', { data: filters });
}

// Export Report - GET /api/billing/reports/export
export async function exportReport(filters: ReportFilters, format: 'pdf' | 'excel' | 'csv' = 'pdf'): Promise<{
  success: boolean;
  message: string;
  data: {
    download_url: string;
    filename?: string;
  };
}> {
  return requestWithFallback('get', '/billing/reports/export', { params: { ...filters, format } });
}

// Schedule Report - POST /api/billing/reports/schedule
export async function scheduleReport(scheduleData: {
  frequency: 'daily' | 'weekly' | 'monthly';
  email: string;
  report_types: string[];
  filters?: ReportFilters;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    schedule_id: string;
    next_run: string;
  };
}> {
  return requestWithFallback('post', '/billing/reports/schedule', { data: scheduleData });
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

// Helper function to format percentage
export function formatPercentage(value: number): string {
  // Handle undefined, null, or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return `${value.toFixed(1)}%`;
}
