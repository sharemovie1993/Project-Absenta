import { CreateBillingInput, UpdateBillingInput, BillingResponse, BillingStats } from './billing.types';
import { DataScope } from '@/types/fastify';
import { getInvoicesByTenantQuery } from './queries/subscription-overview.query';
import { billingDb as prisma } from './repositories/billing.db';

async function resolveTenantId(scope?: DataScope, tenantIdFilter?: string): Promise<string> {
  if (tenantIdFilter) return tenantIdFilter;
  if (scope?.tenantId) return scope.tenantId;
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  return tenant?.id || '';
}

function mapToBillingResponse(inv: any, tenantId: string): BillingResponse {
  const createdDate = inv.created_at ? new Date(inv.created_at) : new Date();
  const dueDate = inv.expired_time ? new Date(inv.expired_time * 1000) : new Date(createdDate.getTime() + 7 * 24 * 3600 * 1000);
  const paidDate = inv.paid_at ? new Date(inv.paid_at) : null;

  return {
    id: String(inv.id || inv.invoice_number),
    subscription_id: 'remote_sub',
    amount: inv.amount,
    billing_date: createdDate,
    payment_method: inv.payment_method,
    payment_reference: inv.invoice_number,
    created_at: createdDate,
    updated_at: createdDate,
    Subscription: {
      id: 'remote_sub',
      tenant_id: tenantId,
      plan_id: inv.plan_id || 'remote_plan',
      start_date: createdDate,
      end_date: dueDate,
      status: inv.status === 'PAID' ? 'ACTIVE' : 'INACTIVE',
      Tenant: {
        id: tenantId,
        name: 'Sekolah Tenant',
        domain: null,
      },
      Plan: {
        id: inv.plan_id || 'remote_plan',
        name: inv.Subscription?.Plan?.name || 'Layanan Modular',
        price_monthly: inv.amount,
        currency: inv.currency || 'IDR',
      }
    },
    Invoice: {
      id: String(inv.id || inv.invoice_number),
      invoice_number: String(inv.invoice_number),
      status: inv.status as any,
      due_date: dueDate,
      paid_at: paidDate,
    }
  };
}

export const billingService = {
  async schedulePlanChange(_subscriptionId: string, _toPlanId: string, _reason?: string) {
    return null;
  },

  async applyDuePlanChanges(): Promise<number> {
    return 0;
  },

  async getAllBillings(scope: DataScope, statusFilter?: string, search?: string, tenantId?: string): Promise<BillingResponse[]> {
    const tId = await resolveTenantId(scope, tenantId);
    if (!tId) return [];

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    let mapped = remoteInvoices.map((inv: any) => mapToBillingResponse(inv, tId));

    if (statusFilter) {
      if (statusFilter === 'UNPAID') {
        mapped = mapped.filter((item: any) => item.Invoice?.status !== 'PAID' && item.Invoice?.status !== 'CANCELLED');
      } else {
        mapped = mapped.filter((item: any) => item.Invoice?.status === statusFilter);
      }
    }

    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter((item: any) => 
        String(item.Invoice?.invoice_number).toLowerCase().includes(q) ||
        String(item.Subscription?.Plan?.name).toLowerCase().includes(q)
      );
    }

    return mapped;
  },

  async getBillingById(scope: DataScope, id: string): Promise<BillingResponse> {
    const tId = await resolveTenantId(scope);
    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    const inv = remoteInvoices.find((item: any) => String(item.id || item.invoice_number) === id || String(item.invoice_number) === id);
    if (!inv) {
      throw new Error('Billing record not found');
    }
    return mapToBillingResponse(inv, tId);
  },

  async getBillingsBySubscription(scope: DataScope, _subscriptionId: string): Promise<BillingResponse[]> {
    const tId = await resolveTenantId(scope);
    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    return remoteInvoices.map((inv: any) => mapToBillingResponse(inv, tId));
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

  async getBillingStats(scope: DataScope, tenantIdFilter?: string): Promise<BillingStats> {
    const tId = await resolveTenantId(scope, tenantIdFilter);
    if (!tId) {
      return {
        total_amount: 0, paid_amount: 0, unpaid_amount: 0, overdue_amount: 0,
        total_count: 0, paid_count: 0, unpaid_count: 0, overdue_count: 0
      };
    }

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    let total_amount = 0, paid_amount = 0, unpaid_amount = 0, overdue_amount = 0;
    let total_count = 0, paid_count = 0, unpaid_count = 0, overdue_count = 0;

    for (const inv of remoteInvoices) {
      const amt = inv.amount || 0;
      total_amount += amt;
      total_count++;

      if (inv.status === 'PAID') {
        paid_amount += amt;
        paid_count++;
      } else if (inv.status === 'OVERDUE') {
        overdue_amount += amt;
        overdue_count++;
        unpaid_amount += amt;
        unpaid_count++;
      } else {
        unpaid_amount += amt;
        unpaid_count++;
      }
    }

    return {
      total_amount, paid_amount, unpaid_amount, overdue_amount,
      total_count, paid_count, unpaid_count, overdue_count
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

  async getFinancialDashboardRawMetrics(tenantId?: string) {
    const tId = await resolveTenantId(undefined, tenantId);
    if (!tId) {
      return { monthlyRevenue30d: 0, dailyRevenue: 0, thisMonthRevenue: 0, lastMonthRevenue: 0, failedPayments30d: 0, activeSubscriptionsCount: 0 };
    }

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    let monthlyRevenue30d = 0;
    let dailyRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let failedPayments30d = 0;

    for (const inv of remoteInvoices) {
      const amt = inv.amount || 0;
      const createdDate = inv.created_at ? new Date(inv.created_at) : new Date();
      const paidDate = inv.paid_at ? new Date(inv.paid_at) : null;

      if (inv.status === 'PAID' && paidDate) {
        if (paidDate >= thirtyDaysAgo) {
          monthlyRevenue30d += amt;
        }
        if (paidDate >= oneDayAgo) {
          dailyRevenue += amt;
        }
        if (paidDate >= startOfThisMonth) {
          thisMonthRevenue += amt;
        }
        if (paidDate >= startOfLastMonth && paidDate <= endOfLastMonth) {
          lastMonthRevenue += amt;
        }
      } else if (inv.status === 'OVERDUE' || (inv.status !== 'PAID' && inv.status !== 'CANCELLED')) {
        if (createdDate >= thirtyDaysAgo) {
          failedPayments30d += amt;
        }
      }
    }

    const activeSubscriptionsCount = await prisma.subscription.count({
      where: {
        tenant_id: tId,
        status: { in: ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'] as any }
      }
    });

    return {
      monthlyRevenue30d,
      dailyRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      failedPayments30d,
      activeSubscriptionsCount
    };
  },

  async getBillingDashboardNotifications(tenantId?: string) {
    const tId = await resolveTenantId(undefined, tenantId);
    if (!tId) return [];

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    const notifications = [];

    for (const inv of remoteInvoices) {
      if (inv.status === 'OVERDUE') {
        notifications.push({
          id: `notif_${inv.invoice_number}`,
          type: 'OVERDUE_INVOICE',
          title: 'Tagihan Jatuh Tempo',
          message: `Tagihan ${inv.invoice_number} sebesar Rp ${inv.amount.toLocaleString()} telah melewati jatuh tempo.`,
          severity: 'HIGH',
          created_at: inv.created_at ? new Date(inv.created_at) : new Date()
        });
      }
    }

    return notifications;
  },

  async getBillingDashboardRecentActivities(tenantId: string | undefined, limit: number) {
    const tId = await resolveTenantId(undefined, tenantId);
    if (!tId) return [];

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    const activities = [];

    for (const inv of remoteInvoices) {
      if (inv.status === 'PAID') {
        activities.push({
          id: `act_paid_${inv.invoice_number}`,
          type: 'PAYMENT_RECEIVED',
          message: `Pembayaran tagihan ${inv.invoice_number} berhasil diterima`,
          created_at: inv.paid_at ? new Date(inv.paid_at) : new Date()
        });
      } else {
        activities.push({
          id: `act_sent_${inv.invoice_number}`,
          type: 'INVOICE_SENT',
          message: `Tagihan baru ${inv.invoice_number} telah diterbitkan`,
          created_at: inv.created_at ? new Date(inv.created_at) : new Date()
        });
      }
    }

    activities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return activities.slice(0, limit);
  },

  async getRevenueChartData(tenantId: string | undefined, monthsCount: number) {
    const tId = await resolveTenantId(undefined, tenantId);
    if (!tId) return [];

    const remoteInvoices = await getInvoicesByTenantQuery(tId);
    const chartMap = new Map<string, { label: string; revenue: number; invoice_count: number; orderKey: number }>();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const orderKey = d.getFullYear() * 12 + d.getMonth();
      chartMap.set(label, { label, revenue: 0, invoice_count: 0, orderKey });
    }

    for (const inv of remoteInvoices) {
      if (inv.status === 'PAID' && inv.paid_at) {
        const paidDate = new Date(inv.paid_at);
        const label = `${monthNames[paidDate.getMonth()]} ${paidDate.getFullYear()}`;
        const existing = chartMap.get(label);
        if (existing) {
          existing.revenue += (inv.amount || 0);
          existing.invoice_count++;
        }
      }
    }

    const chartData = Array.from(chartMap.values());
    chartData.sort((a, b) => a.orderKey - b.orderKey);
    return chartData.map(({ label, revenue, invoice_count }) => ({ label, revenue, invoice_count }));
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
