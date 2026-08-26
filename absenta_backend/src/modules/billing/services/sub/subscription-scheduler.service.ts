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

export const subscriptionSchedulerService = {
  async schedulePlanChange(subscriptionId: string, toPlanId: string, reason?: string) {
    return schedulePlanChangeCommand(subscriptionId, toPlanId, reason);
  },

  async applyDuePlanChanges(): Promise<number> {
    return await applyDuePlanChangesCommand();
  }
};
