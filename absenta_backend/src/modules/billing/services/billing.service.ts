import { CreateBillingInput, UpdateBillingInput, BillingResponse, BillingStats } from './billing.types';
import { DataScope } from '@/types/fastify';

export const billingService = {
  async schedulePlanChange(_subscriptionId: string, _toPlanId: string, _reason?: string) {
    return null;
  },

  async applyDuePlanChanges(): Promise<number> {
    return 0;
  },

  async getAllBillings(_scope: DataScope, _statusFilter?: string, _search?: string, _tenantId?: string): Promise<BillingResponse[]> {
    return [];
  },

  async getBillingById(_scope: DataScope, _id: string): Promise<BillingResponse> {
    throw new Error('Billing record not found');
  },

  async getBillingsBySubscription(_scope: DataScope, _subscriptionId: string): Promise<BillingResponse[]> {
    return [];
  },

  async createBilling(input: CreateBillingInput): Promise<BillingResponse> {
    const now = new Date();
    return {
      id: `bill_${Date.now()}`,
      subscription_id: input.subscription_id,
      amount: input.amount,
      billing_date: input.billing_date,
      payment_method: input.payment_method || null,
      payment_reference: input.payment_reference || null,
      created_at: now,
      updated_at: now,
    };
  },

  async updateBilling(id: string, input: UpdateBillingInput): Promise<BillingResponse> {
    const now = new Date();
    return {
      id,
      subscription_id: 'sub_placeholder',
      amount: input.amount ?? 0,
      billing_date: input.billing_date ?? now,
      payment_method: input.payment_method || null,
      payment_reference: input.payment_reference || null,
      created_at: now,
      updated_at: now,
    };
  },

  async markAsPaid(id: string, paymentMethod?: string, paymentReference?: string, _confirmedBy?: string): Promise<BillingResponse> {
    const now = new Date();
    return {
      id,
      subscription_id: 'sub_placeholder',
      amount: 0,
      billing_date: now,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      created_at: now,
      updated_at: now,
    };
  },

  async markAsOverdue(id: string): Promise<BillingResponse> {
    const now = new Date();
    return {
      id,
      subscription_id: 'sub_placeholder',
      amount: 0,
      billing_date: now,
      payment_method: null,
      payment_reference: null,
      created_at: now,
      updated_at: now,
    };
  },

  async checkOverdueBillings(): Promise<BillingResponse[]> {
    return [];
  },

  async getBillingStats(_scope: DataScope, _tenantIdFilter?: string): Promise<BillingStats> {
    return {
      total_amount: 0,
      paid_amount: 0,
      unpaid_amount: 0,
      overdue_amount: 0,
      total_count: 0,
      paid_count: 0,
      unpaid_count: 0,
      overdue_count: 0,
    };
  },

  async generateMonthlyBilling(subscriptionId: string, _month: number, _year: number): Promise<BillingResponse> {
    const now = new Date();
    return {
      id: `bill_${Date.now()}`,
      subscription_id: subscriptionId,
      amount: 0,
      billing_date: now,
      payment_method: null,
      payment_reference: null,
      created_at: now,
      updated_at: now,
    };
  },

  async deleteBilling(_id: string): Promise<void> {
    // Stub
  },

  async getFinancialDashboardRawMetrics(_tenantId?: string) {
    return {
      monthlyRevenue30d: 0,
      dailyRevenue: 0,
      thisMonthRevenue: 0,
      lastMonthRevenue: 0,
      failedPayments30d: 0,
      activeSubscriptionsCount: 0,
    };
  },

  async getBillingDashboardNotifications(_tenantId?: string) {
    return [];
  },

  async getBillingDashboardRecentActivities(_tenantId: string | undefined, _limit: number) {
    return [];
  },

  async getRevenueChartData(_tenantId: string | undefined, _monthsCount: number) {
    return [];
  },

  async getBillingHealthSummary() {
    return {
      active_without_paid_invoice_count: 0,
      paid_not_applied_count: 0,
      invalid_invoice_period_count: 0,
      webhook_failures_last_1h: 0,
      reconciliation_fix_count_last_1h: 0,
    };
  }
};
