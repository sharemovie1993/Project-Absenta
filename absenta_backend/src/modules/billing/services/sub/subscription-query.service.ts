// @ts-nocheck
import { subscriptionDb as prisma } from '../repositories/subscription.db';
import { getSmartFrontendBaseUrl } from '@/utils/url-helper';
import { SubscriptionStatus, ObservabilityMetricType } from '@prisma/client';
import { observabilityAggregationService } from '@/modules/observability/services/observabilityAggregation.service';
import type { CreateSubscriptionInput, SubscriptionResponse, UpdateSubscriptionInput } from '../subscription.types';
import { applyDuePlanChangesCommand } from '../commands/apply-due-plan-changes.command';
import { schedulePlanChangeCommand } from '../commands/schedule-plan-change.command';
import { getSubscriptionAnalyticsQuery } from '../queries/subscription-analytics.query';
import { getInvoicesByTenantQuery, getMySubscriptionOverviewQuery, getPaymentsByTenantQuery } from '../queries/subscription-overview.query';
import { checkTenantLimitQuery } from '../queries/tenant-limit.query';
import { cacheService } from '@/utils/cache.service';
import { sidebarRenderingService } from '@/modules/menu/services/sidebar-rendering.service';

const mapTenant = (tenant: any) => {
  if (!tenant) return undefined;
  return {
    id: tenant.id,
    name: tenant.name,
    domain: tenant.subdomain,
    subdomain: tenant.subdomain,
    custom_domain: tenant.custom_domain
  };
};

export const subscriptionQueryService = {
  async getAllSubscriptions(includeInactive: boolean = false): Promise<SubscriptionResponse[]> {
    const whereClause: any = {};
    if (!includeInactive) {
      whereClause.status = {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
      };
    }
    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            custom_domain: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    return subscriptions.map(subscription => {
      const { Plan, Tenant, ...subscriptionData } = subscription;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    });
  },

  async getAllSubscriptionsPaginated(options: {
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    subscriptions: SubscriptionResponse[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  }> {
    const includeInactive = options.includeInactive ?? false;
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 25;

    const whereClause: any = {};
    if (!includeInactive) {
      whereClause.status = {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
      };
    }

    const totalCount = await prisma.subscription.count({
      where: whereClause
    });

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            custom_domain: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limit
    });

    const mapped = subscriptions.map(subscription => {
      const { Plan, Tenant, ...subscriptionData } = subscription;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    });

    return {
      subscriptions: mapped,
      totalCount,
      totalPages,
      currentPage,
      perPage: limit
    };
  },

  async getSubscriptionsByTenant(tenantId: string, includeInactive: boolean = false): Promise<SubscriptionResponse[]> {
    const whereClause: any = {
      tenant_id: tenantId
    };
    
    if (!includeInactive) {
      // Default: treat TRIAL, ACTIVE, and PENDING statuses as visible for tenant pages
      whereClause.status = { 
        in: [
          SubscriptionStatus.ACTIVE, 
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.UPGRADE_PENDING,
          SubscriptionStatus.PENDING_PAYMENT
        ] 
      };
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
         Plan: true,
         Tenant: {
           select: {
             id: true,
             name: true,
             subdomain: true,
             custom_domain: true,
           }
         }
       },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform data untuk konsistensi dengan frontend
    return subscriptions.map(subscription => {
      const { Plan, Tenant, ...subscriptionData } = subscription;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    });
  },

  async getCurrentSubscriptionByTenant(tenantId: string): Promise<SubscriptionResponse | null> {
    // Prefer ACTIVE subscription; fall back to TRIAL if no ACTIVE
    const active = await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        status: { in: [SubscriptionStatus.ACTIVE, 'UPGRADE_PENDING'] as any }
      },
      include: {
        Plan: true,
        Tenant: {
          select: { id: true, name: true, subdomain: true, custom_domain: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const chosen = active ? active : await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        status: SubscriptionStatus.TRIAL
      },
      include: {
        Plan: true,
        Tenant: {
          select: { id: true, name: true, subdomain: true, custom_domain: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!chosen) return null;

    const { Plan, Tenant, ...subscriptionData } = chosen;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async getSubscriptionById(id: string): Promise<SubscriptionResponse | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            custom_domain: true,
          }
        }
      }
    });

    if (!subscription) return null;

    // Transform data untuk konsistensi dengan frontend
    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async getActiveSubscriptionByTenant(tenantId: string): Promise<SubscriptionResponse | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        status: { in: [SubscriptionStatus.ACTIVE, 'UPGRADE_PENDING'] as any }
      },
      include: {
        Plan: true,
        Tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            custom_domain: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!subscription) return null;

    // Transform data untuk konsistensi dengan frontend
    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },
async getSubscriptionHistory(id: string) {
    const history = await prisma.subscriptionHistory.findMany({
      where: { subscription_id: id },
      include: {
        Subscription: {
          include: {
            Plan: true,
            Tenant: {
              select: { id: true, name: true, subdomain: true, custom_domain: true }
            }
          }
        }
      },
      orderBy: { changed_at: 'desc' }
    });

    // Enrich: lookup old/new plan names
    const planIds = Array.from(new Set(
      history.flatMap(h => [h.old_plan_id, h.new_plan_id]).filter((pid): pid is string => !!pid)
    ));
    const plans = planIds.length > 0 ? await prisma.plan.findMany({ where: { id: { in: planIds } } }) : [];
    const planMap = new Map(plans.map(p => [p.id, p.name]));

    return history.map(h => ({
      id: h.id,
      subscription_id: h.subscription_id,
      plan_name: h.Subscription?.Plan?.name || null,
      plan: h.Subscription?.Plan
        ? { price_monthly: h.Subscription.Plan.price_monthly }
        : { price_monthly: null },
      status: h.Subscription?.status || null,
      start_date: h.Subscription?.start_date || null,
      end_date: h.Subscription?.end_date || null,
      changed_at: h.changed_at,
      changed_by: h.changed_by || null,
      reason: h.reason || null,
      old_plan_id: h.old_plan_id || null,
      new_plan_id: h.new_plan_id || null,
      old_plan_name: h.old_plan_id ? (planMap.get(h.old_plan_id) || null) : null,
      new_plan_name: h.new_plan_id ? (planMap.get(h.new_plan_id) || null) : null,
      tenant: mapTenant(h.Subscription?.Tenant),
    }));
  },

  async getTenantSubscriptionHistory(tenantId: string) {
    const history = await prisma.subscriptionHistory.findMany({
      where: {
        Subscription: {
          tenant_id: tenantId
        }
      },
      include: {
        Subscription: {
          include: {
            Plan: true,
            Tenant: { select: { id: true, name: true, subdomain: true, custom_domain: true } }
          }
        }
      },
      orderBy: { changed_at: 'desc' }
    });

    const planIds = Array.from(new Set(
      history.flatMap(h => [h.old_plan_id, h.new_plan_id]).filter((pid): pid is string => !!pid)
    ));
    const plans = planIds.length > 0 ? await prisma.plan.findMany({ where: { id: { in: planIds } } }) : [];
    const planMap = new Map(plans.map(p => [p.id, p.name]));

    return history.map(h => ({
      id: h.id,
      subscription_id: h.subscription_id,
      plan_name: h.Subscription?.Plan?.name || null,
      plan: h.Subscription?.Plan
        ? { price_monthly: h.Subscription.Plan.price_monthly }
        : { price_monthly: null },
      status: h.Subscription?.status || null,
      start_date: h.Subscription?.start_date || null,
      end_date: h.Subscription?.end_date || null,
      changed_at: h.changed_at,
      changed_by: h.changed_by || null,
      reason: h.reason || null,
      old_plan_id: h.old_plan_id || null,
      new_plan_id: h.new_plan_id || null,
      old_plan_name: h.old_plan_id ? (planMap.get(h.old_plan_id) || null) : null,
      new_plan_name: h.new_plan_id ? (planMap.get(h.new_plan_id) || null) : null,
      tenant: mapTenant(h.Subscription?.Tenant),
    }));
  },

  async getSubscriptionAnalytics(tenantId?: string): Promise<any> {
    return getSubscriptionAnalyticsQuery(tenantId);
  },

  async checkTenantLimit(tenantId: string, resource: 'students' | 'users' = 'students', increment: number = 1): Promise<void> {
    return checkTenantLimitQuery(tenantId, resource, increment);
  },

  async getMySubscriptionOverview(tenantId: string) {
    return getMySubscriptionOverviewQuery(tenantId);
  },

  async getInvoicesByTenant(tenantId: string) {
    return getInvoicesByTenantQuery(tenantId);
  },

  async getPaymentsByTenant(tenantId: string) {
    return getPaymentsByTenantQuery(tenantId);
  }
};
