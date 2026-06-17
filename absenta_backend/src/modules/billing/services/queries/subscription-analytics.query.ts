import { SubscriptionStatus } from '@prisma/client';
import { subscriptionDb as prisma } from '../repositories/subscription.db';

export async function getSubscriptionAnalyticsQuery(tenantId?: string): Promise<any> {
  try {
    const subscriptions = await prisma.subscription.findMany({
      ...(tenantId ? { where: { tenant_id: tenantId } } : {}),
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'ACTIVE').length;
    const expiredSubscriptions = subscriptions.filter((sub) => sub.status === 'EXPIRED').length;
    const canceledSubscriptions = subscriptions.filter((sub) => sub.status === 'CANCELLED').length;
    const trialSubscriptions = subscriptions.filter((sub) => sub.status === 'TRIAL').length;

    const monthlyRecurringRevenue = subscriptions
      .filter((sub) => sub.status === 'ACTIVE')
      .reduce((sum, sub) => sum + (sub as any).Plan.price_monthly, 0);

    const averageSubscriptionValue =
      totalSubscriptions > 0 ? subscriptions.reduce((sum, sub) => sum + (sub as any).Plan.price_monthly, 0) / totalSubscriptions : 0;

    const currentDate = new Date();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const expiringThisMonth = subscriptions.filter((sub) => {
      if (!(sub as any).end_date) return false;
      const endDate = new Date((sub as any).end_date);
      return endDate >= currentDate && endDate <= endOfMonth && sub.status === SubscriptionStatus.ACTIVE;
    }).length;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const canceledThisMonth = subscriptions.filter((sub) => {
      if (!(sub as any).updated_at || sub.status !== SubscriptionStatus.CANCELLED) return false;
      const updatedDate = new Date((sub as any).updated_at);
      return updatedDate >= startOfMonth;
    }).length;

    const churnRate = activeSubscriptions > 0 ? (canceledThisMonth / (activeSubscriptions + canceledThisMonth)) * 100 : 0;

    const trialsThisMonth = subscriptions.filter((sub) => sub.status === SubscriptionStatus.TRIAL && (sub as any).created_at >= startOfMonth).length;
    const transitionsThisMonth = await prisma.activityLog.count({
      where: {
        action: 'SUBSCRIPTION_STATUS_CHANGE',
        created_at: { gte: startOfMonth },
        metadata: {
          contains: '"from":"TRIAL"',
        },
      },
    });
    const transitionsToActiveThisMonth = await prisma.activityLog.count({
      where: {
        action: 'SUBSCRIPTION_STATUS_CHANGE',
        created_at: { gte: startOfMonth },
        metadata: {
          contains: '"to":"ACTIVE"',
        },
      },
    });
    const effectiveTransitions = Math.min(transitionsThisMonth, transitionsToActiveThisMonth);
    const conversionRate = trialsThisMonth > 0 ? (effectiveTransitions / trialsThisMonth) * 100 : 0;

    const autoRenewalRate = activeSubscriptions > 0 ? ((activeSubscriptions - canceledSubscriptions) / activeSubscriptions) * 100 : 0;

    const planDistribution = subscriptions.reduce((acc, sub) => {
      const planName = String((sub as any).Plan.name);
      if (!acc[planName]) {
        acc[planName] = {
          plan_id: (sub as any).Plan.id,
          plan_name: planName,
          count: 0,
          revenue: 0,
          active_count: 0,
        };
      }
      acc[planName].count++;
      acc[planName].revenue += (sub as any).Plan.price_monthly;
      if (sub.status === SubscriptionStatus.ACTIVE) {
        acc[planName].active_count++;
      }
      return acc;
    }, {} as Record<string, any>);

    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const subscriptionsLastMonth = subscriptions.filter((sub) => {
      const createdDate = new Date((sub as any).created_at);
      return createdDate >= previousMonth && createdDate <= previousMonthEnd;
    }).length;

    const subscriptionsThisMonth = subscriptions.filter((sub) => {
      const createdDate = new Date((sub as any).created_at);
      return createdDate >= startOfMonth;
    }).length;

    const subscriptionGrowth = subscriptionsLastMonth > 0 ? ((subscriptionsThisMonth - subscriptionsLastMonth) / subscriptionsLastMonth) * 100 : 0;

    return {
      total_subscriptions: totalSubscriptions,
      active_subscriptions: activeSubscriptions,
      expired_subscriptions: expiredSubscriptions,
      canceled_subscriptions: canceledSubscriptions,
      trial_subscriptions: trialSubscriptions,
      monthly_recurring_revenue: monthlyRecurringRevenue,
      average_subscription_value: Math.round(averageSubscriptionValue),
      churn_rate: Math.round(churnRate * 100) / 100,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      auto_renewal_rate: Math.round(autoRenewalRate * 100) / 100,
      expiring_this_month: expiringThisMonth,
      subscription_growth: Math.round(subscriptionGrowth * 100) / 100,
      overview: {
        total_subscriptions: totalSubscriptions,
        active_subscriptions: activeSubscriptions,
        expired_subscriptions: expiredSubscriptions,
        canceled_subscriptions: canceledSubscriptions,
        trial_subscriptions: trialSubscriptions,
      },
      financial: {
        monthly_recurring_revenue: monthlyRecurringRevenue,
        average_subscription_value: Math.round(averageSubscriptionValue),
        total_annual_revenue: monthlyRecurringRevenue * 12,
      },
      metrics: {
        churn_rate: Math.round(churnRate * 100) / 100,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        auto_renewal_rate: Math.round(autoRenewalRate * 100) / 100,
        expiring_this_month: expiringThisMonth,
      },
      growth: {
        subscription_growth: Math.round(subscriptionGrowth * 100) / 100,
        new_subscriptions_this_month: subscriptionsThisMonth,
        new_subscriptions_last_month: subscriptionsLastMonth,
      },
      plan_distribution: Object.values(planDistribution),
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    throw new Error('Failed to retrieve subscription analytics');
  }
}

