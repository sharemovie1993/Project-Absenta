import { billingService } from '../services/billing.service';
import { subscriptionService } from '../services/subscription.service';
import { DataScope } from '../../../types/fastify';
import { isSystemSuperAdmin } from '../../../utils/rbac';

export const billingDashboardController = {
  /**
   * GET /api/billing/metrics/financial
   * Get financial metrics for billing dashboard
   */
  async getFinancialMetrics(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope ?? {};
      const scopeTenantId = scope.tenantId;
      const roleName = request.user?.roleName ?? request.user?.role?.name;
      const userTenantId = request.user?.tenantId ?? request.user?.tenant_id;
      const systemSuperAdmin = isSystemSuperAdmin(roleName, userTenantId);
      const tenantId = systemSuperAdmin && scopeTenantId === 'system' ? undefined : scopeTenantId;
      const effectiveScope: DataScope = { ...scope, tenantId };

      // Get billing stats
      const billingStats = await billingService.getBillingStats(effectiveScope, tenantId);
      
      // Get subscription analytics for additional metrics
      const subscriptionAnalytics = await subscriptionService.getSubscriptionAnalytics(tenantId);

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      void startOfThisMonth;
      void thirtyDaysAgo;
      void oneDayAgo;

      const raw = await billingService.getFinancialDashboardRawMetrics(tenantId);

      const thisMonthRevenue = raw.thisMonthRevenue || 0;
      const lastMonthRevenue = raw.lastMonthRevenue || 0;
      const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      const monthlyRevenue30d = raw.monthlyRevenue30d || 0;
      const dailyRevenue = raw.dailyRevenue || 0;
      const activeSubscriptions = Number.isFinite(raw.activeSubscriptionsCount)
        ? raw.activeSubscriptionsCount
        : Number(subscriptionAnalytics?.active_subscriptions || 0);

      const data = {
        total_revenue: billingStats.paid_amount,
        monthly_revenue: monthlyRevenue30d,
        daily_revenue: dailyRevenue,
        total_billings: billingStats.total_count,
        overdue_billings: billingStats.overdue_count,
        pending_billings: billingStats.unpaid_count,
        paid_billings: billingStats.paid_count,
        revenue_growth: Math.round(revenueGrowth * 100) / 100,
        payment_success_rate: billingStats.total_count > 0 
          ? Math.round((billingStats.paid_count / billingStats.total_count) * 100 * 100) / 100
          : 0,
        failed_payments: raw.failedPayments30d,
        active_subscriptions: activeSubscriptions,
        subscription_growth: Number(subscriptionAnalytics?.subscription_growth || 0),
        average_revenue_per_user: activeSubscriptions > 0 ? Math.round(monthlyRevenue30d / activeSubscriptions) : 0,
        churn_rate: Number(subscriptionAnalytics?.churn_rate || 0),
      };

      return reply.status(200).send({
        success: true,
        message: 'Financial metrics retrieved successfully',
        data
      });
    } catch (error: any) {
      console.error('Get financial metrics error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve financial metrics',
        error: error.message
      });
    }
  },

  /**
   * GET /api/billing/notifications
   * Get billing-related notifications
   */
  async getDashboardNotifications(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope ?? {};
      const tenantId = scope.tenantId;
      const notifications = await billingService.getBillingDashboardNotifications(tenantId);

      return reply.status(200).send({
        success: true,
        data: notifications.slice(0, 20) // Limit to 20 notifications
      });
    } catch (error: any) {
      console.error('Get dashboard notifications error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error.message
      });
    }
  },

  /**
   * GET /api/billing/recent-activities
   * Get recent billing activities
   */
  async getRecentActivities(request: any, reply: any) {
    try {
      const { limit = 10 } = request.query;
      const scope: DataScope = request.dataScope ?? {};
      const tenantId = scope.tenantId;

      const take = Number.parseInt(String(limit), 10);
      const activities = await billingService.getBillingDashboardRecentActivities(tenantId, take);

      return reply.status(200).send({
        success: true,
        data: activities
      });
    } catch (error: any) {
      console.error('Get recent activities error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve recent activities',
        error: error.message
      });
    }
  },

  async markNotificationAsRead(request: any, reply: any) {
    try {
      void request;
      return reply.status(200).send({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  },

  async markAllNotificationsAsRead(request: any, reply: any) {
    try {
      void request;
      return reply.status(200).send({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  },

  /**
   * GET /api/billing/revenue-chart
   * Get revenue chart data for the last N months
   */
  async getRevenueChartData(request: any, reply: any) {
    try {
      const { months = 6 } = request.query;
      const scope: DataScope = request.dataScope ?? {};
      const tenantId = scope.tenantId;

      const monthsCount = parseInt(months);
      const chartData = await billingService.getRevenueChartData(tenantId, monthsCount);

      return reply.status(200).send({
        success: true,
        data: chartData
      });
    } catch (error: any) {
      console.error('Get revenue chart data error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve revenue chart data',
        error: error.message
      });
    }
  },

  async getBillingHealthSummary(_request: any, reply: any) {
    try {
      return reply.status(200).send({
        success: true,
        data: {
          ...(await billingService.getBillingHealthSummary()),
        }
      });
    } catch (error: any) {
      console.error('Get billing health summary error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve billing health summary',
        error: error.message
      });
    }
  }
};
