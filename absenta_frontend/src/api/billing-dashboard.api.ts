import { requestWithFallback } from "./apiUtils";
import type {
  DashboardResponse,
  DashboardFinancialMetrics,
  DashboardNotification,
  Billing,
  BillingHealthSummaryResponse
} from "../types/billing";

// Get billing dashboard overview data
export async function getBillingDashboardOverview(): Promise<DashboardResponse> {
  return requestWithFallback<DashboardResponse>('get', '/billing/dashboard');
}

// Get financial metrics
export async function getFinancialMetrics(): Promise<{
  success: boolean;
  message: string;
  data: DashboardFinancialMetrics;
}> {
  return requestWithFallback('get', '/billing/metrics/financial');
}

// Get dashboard notifications
export async function getDashboardNotifications(): Promise<{
  success: boolean;
  data: DashboardNotification[];
}> {
  return requestWithFallback('get', '/billing/notifications');
}

// Get recent billing activities
export async function getRecentActivities(limit: number = 10): Promise<{
  success: boolean;
  data: Billing[];
}> {
  return requestWithFallback('get', `/billing/recent-activities`, { params: { limit } });
}

// Get revenue chart data
export async function getRevenueChartData(months: number = 6): Promise<{
  success: boolean;
  data: Array<{
    month: string;
    revenue: number;
    billings: number;
    year: number;
  }>;
}> {
  return requestWithFallback('get', `/billing/revenue-chart`, { params: { months } });
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('patch', `/billing/notifications/${notificationId}/read`);
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('patch', '/billing/notifications/mark-all-read');
}

// Get subscription trends
export async function getSubscriptionTrends(months: number = 12): Promise<{
  success: boolean;
  data: Array<{
    month: string;
    new_subscriptions: number;
    canceled_subscriptions: number;
    active_subscriptions: number;
    revenue: number;
  }>;
}> {
  return requestWithFallback('get', `/billing/subscription-trends`, { params: { months } });
}

// Get payment gateway performance
export async function getPaymentGatewayPerformance(): Promise<{
  success: boolean;
  data: Array<{
    gateway: string;
    success_rate: number;
    total_transactions: number;
    total_amount: number;
    failed_transactions: number;
  }>;
}> {
  return requestWithFallback('get', '/billing/payment-gateway-performance');
}

export async function getBillingHealthSummary(): Promise<BillingHealthSummaryResponse> {
  return requestWithFallback<BillingHealthSummaryResponse>('get', '/billing/health/summary');
}

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatPercentage(value: number): string {
  // Handle undefined, null, or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return `${value.toFixed(1)}%`;
}

export function getGrowthColor(growth: number): string {
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-600';
}

export function getGrowthIcon(growth: number): 'up' | 'down' | 'neutral' {
  if (growth > 0) return 'up';
  if (growth < 0) return 'down';
  return 'neutral';
}
