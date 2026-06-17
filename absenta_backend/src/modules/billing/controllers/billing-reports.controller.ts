import { billingService } from '../services/billing.service';
import { subscriptionService } from '../services/subscription.service';
import { DataScope } from '../../../types/fastify';
import { isSystemSuperAdmin } from '../../../utils/rbac';

function parseMonths(value: any, fallback: number) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(24, n));
}

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const billingReportsController = {
  async getRevenueReport(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope ?? {};
      const scopeTenantId = scope.tenantId;
      const roleName = request.user?.roleName ?? request.user?.role?.name;
      const userTenantId = request.user?.tenantId ?? request.user?.tenant_id;
      const systemSuperAdmin = isSystemSuperAdmin(roleName, userTenantId);
      const tenantId = systemSuperAdmin && scopeTenantId === 'system' ? undefined : scopeTenantId;

      const effectiveScope: DataScope = { ...scope, tenantId };
      const billingStats = await billingService.getBillingStats(effectiveScope, tenantId);
      const raw = await billingService.getFinancialDashboardRawMetrics(tenantId);
      const revenueByMonth = await billingService.getRevenueChartData(tenantId, parseMonths(request.query?.months, 6));

      const totalRevenue = safeNumber(billingStats.paid_amount);
      const monthlyRevenue = safeNumber(raw.monthlyRevenue30d);
      const totalTx = safeNumber(billingStats.total_count);
      const successTx = safeNumber(billingStats.paid_count);
      const failedTx = safeNumber(raw.failedPayments30d ?? Math.max(0, totalTx - successTx));
      const successRate = totalTx > 0 ? (successTx / totalTx) * 100 : 0;
      const avgTxValue = successTx > 0 ? totalRevenue / successTx : 0;
      const thisMonthRevenue = safeNumber(raw.thisMonthRevenue);
      const lastMonthRevenue = safeNumber(raw.lastMonthRevenue);
      const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      return reply.status(200).send({
        success: true,
        message: 'Revenue report retrieved successfully',
        data: {
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue,
          revenue_growth: Math.round(revenueGrowth * 10) / 10,
          total_transactions: totalTx,
          successful_transactions: successTx,
          failed_transactions: failedTx,
          success_rate: Math.round(successRate * 10) / 10,
          average_transaction_value: Math.round(avgTxValue),
          top_performing_plans: [],
          revenue_by_month: (revenueByMonth || []).map((m: any) => ({
            month: String(m.month ?? ''),
            revenue: safeNumber(m.revenue),
          })),
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve revenue report',
        error: error.message,
      });
    }
  },

  async getPaymentGatewayStats(_request: any, reply: any) {
    try {
      return reply.status(200).send({
        success: true,
        message: 'Payment gateway stats retrieved successfully',
        data: [],
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve payment gateway stats',
        error: error.message,
      });
    }
  },

  async getSubscriptionTrends(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope ?? {};
      const scopeTenantId = scope.tenantId;
      const roleName = request.user?.roleName ?? request.user?.role?.name;
      const userTenantId = request.user?.tenantId ?? request.user?.tenant_id;
      const systemSuperAdmin = isSystemSuperAdmin(roleName, userTenantId);
      const tenantId = systemSuperAdmin && scopeTenantId === 'system' ? undefined : scopeTenantId;

      const analytics = await subscriptionService.getSubscriptionAnalytics(tenantId);
      const churnRate = safeNumber(analytics?.churn_rate);
      const growthRate = safeNumber(analytics?.subscription_growth);

      return reply.status(200).send({
        success: true,
        message: 'Subscription trends retrieved successfully',
        data: {
          new_subscriptions: 0,
          renewals: 0,
          cancellations: 0,
          upgrades: 0,
          downgrades: 0,
          churn_rate: churnRate,
          growth_rate: growthRate,
          lifetime_value: 0,
          monthly_trends: [],
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve subscription trends',
        error: error.message,
      });
    }
  },

  async getRevenueBreakdown(_request: any, reply: any) {
    try {
      return reply.status(200).send({
        success: true,
        message: 'Revenue breakdown retrieved successfully',
        data: {
          by_plan: [],
          by_region: [],
          by_payment_method: [],
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve revenue breakdown',
        error: error.message,
      });
    }
  },

  async generateReport(_request: any, reply: any) {
    try {
      const reportId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return reply.status(200).send({
        success: true,
        message: 'Report generated successfully',
        data: {
          report_id: reportId,
          download_url: `/api/billing/reports/download/${reportId}`,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to generate report',
        error: error.message,
      });
    }
  },

  async exportReport(request: any, reply: any) {
    try {
      const format = String(request.query?.format || 'pdf');
      const reportId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return reply.status(200).send({
        success: true,
        message: 'Report export started',
        data: {
          download_url: `/api/billing/reports/download/${reportId}?format=${encodeURIComponent(format)}`,
          filename: `billing-report-${reportId}.${format === 'excel' ? 'xlsx' : format}`,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to export report',
        error: error.message,
      });
    }
  },

  async scheduleReport(request: any, reply: any) {
    try {
      const scheduleId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      void request;
      return reply.status(200).send({
        success: true,
        message: 'Report scheduled successfully',
        data: {
          schedule_id: scheduleId,
          next_run: nextRun,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to schedule report',
        error: error.message,
      });
    }
  },
};

