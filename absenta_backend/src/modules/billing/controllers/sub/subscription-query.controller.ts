// @ts-nocheck
import { subscriptionService, CreateSubscriptionInput, UpdateSubscriptionInput } from '../../services/subscription.service';
import { RoleName } from '@/constants/enums';
import { billingService } from '../../services/billing.service';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { z } from 'zod';
import { licenseWebhookSchema } from '../../services/subscription.schema';
import { billingDb as prisma } from '../../services/repositories/billing.db';
import { tenantEntitlementService } from '../../services/tenant-entitlement.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { cancelDowngradeCommand, scheduleDowngradeCommand } from '../../services/commands/schedule-downgrade.command';
import { scheduleCancelCommand, undoCancelCommand } from '../../services/commands/schedule-cancel.command';
import { cancelPendingUpgradeCommand } from '../../services/commands/cancel-pending-upgrade.command';

async function listPublicPlans() {
  return prisma.plan.findMany({
    where: { is_active: true, is_public: true },
    orderBy: { price_monthly: 'asc' },
  });
}

function toHttpError(statusCode: number, message: string) {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const TIER_ORDER = ['micro', 'small', 'medium', 'large', 'enterprise'];

function getPlanSizeLabel(plan: any): string {
  if (plan.size_label) return plan.size_label;
  
  const name = String(plan.name || '').toLowerCase();
  if (name.includes('micro')) return 'Micro';
  if (name.includes('small')) return 'Small';
  if (name.includes('medium')) return 'Medium';
  if (name.includes('large')) return 'Large';
  if (name.includes('enterprise')) return 'Enterprise';

  const limit = plan.max_user ?? 0;
  if (limit === 100 || limit === 30) return 'Micro';
  if (limit === 300) return 'Small';
  if (limit === 600) return 'Medium';
  if (limit === 1200) return 'Large';
  return 'Enterprise';
}



export async function syncLocalSubscriptionsWithLicensingServer(tenantId: string): Promise<void> {
  try {
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) return;

    const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const axios = require('axios');
    const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/my-subscriptions/${licenseKey.trim()}`, { timeout: 8000 });
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const remoteSubs = response.data.data;

      // Get all pricing plans from server to resolve module_id and specifications
      const plansResponse = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=absenta`, { timeout: 8000 });
      const remotePlans = (plansResponse.data && plansResponse.data.success && Array.isArray(plansResponse.data.data)) ? plansResponse.data.data : [];

      for (const rSub of remoteSubs) {
        console.log('[DEBUG SYNC] Processing rSub:', JSON.stringify(rSub));
        // Find matching plan from remote plans
        const planData = remotePlans.find((p: any) => p.id === rSub.plan_id);
        console.log('[DEBUG SYNC] planData:', JSON.stringify(planData));
        if (!planData) continue;

        // Ensure Plan exists locally
        let plan = await prisma.plan.findFirst({
          where: {
            OR: [
              { id: planData.id },
              { code: planData.id }
            ]
          }
        });
        const modId = planData.module_id || 'ABSENSI';
        if (!plan) {
          let features = planData.features_json;
          if (typeof features === 'string') {
            try { features = JSON.parse(features); } catch (e) { features = []; }
          }
          // Ensure Module exists locally
          let localMod = await prisma.module.findUnique({ where: { id: modId } });
          if (!localMod) {
            localMod = await prisma.module.create({
              data: { id: modId, name: modId, is_active: true }
            });
          }
          plan = await prisma.plan.create({
            data: {
              id: planData.id,
              code: planData.id,
              service_code: planData.service_code || 'ABSENSI',
              module_id: modId,
              name: planData.name || planData.title,
              price_monthly: planData.price_monthly || 0,
              price_yearly: planData.price_yearly || 0,
              max_user: planData.device_limit || null,
              features_json: features || [],
              description: planData.description || '',
              billing_period: planData.billing_period || 'MONTH',
              absensi_mode: planData.module_id === 'ABSENSI' ? ((planData.name || planData.title || '').includes('Multi Sesi') ? 'MULTI_SESI' : 'SIMPLE') : undefined,
              is_active: true,
              is_public: true,
              currency: 'IDR'
            }
          });
        }

        const localStatus = rSub.status === 'active' ? 'ACTIVE' : (rSub.status === 'expired' ? 'EXPIRED' : 'TRIAL');
        const serviceCode = planData.service_code || 'ABSENSI';
        
        let localSub = await prisma.subscription.findFirst({
          where: {
            tenant_id: tenantId,
            service_code: serviceCode,
          }
        });

        const startDate = rSub.start_date ? new Date(rSub.start_date) : new Date();
        const endDate = rSub.end_date ? new Date(rSub.end_date) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

        if (localSub) {
          await prisma.subscription.update({
            where: { id: localSub.id },
            data: {
              plan_id: plan.id,
              status: localStatus as any,
              start_date: startDate,
              end_date: endDate,
              next_billing_date: endDate,
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              tenant_id: tenantId,
              plan_id: plan.id,
              service_code: serviceCode,
              status: localStatus as any,
              start_date: startDate,
              end_date: endDate,
              next_billing_date: endDate,
              auto_renew: rSub.auto_renew === 1,
            }
          });
        }
      }

      // Save last successful sync time
      const lastSyncKey = 'license_last_sync_time';
      const existingConfig = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: lastSyncKey }
      });
      if (existingConfig) {
        await prisma.config.update({
          where: { id: existingConfig.id },
          data: { value: new Date().toISOString() }
        });
      } else {
        await prisma.config.create({
          data: {
            tenant_id: tenantId,
            key: lastSyncKey,
            value: new Date().toISOString(),
            description: 'Last successful online licensing sync time'
          }
        });
      }
      
      // Invalidate features cache to apply new entitlements instantly
      await tenantEntitlementService.invalidateTenantFeaturesCache(tenantId);
    }
  } catch (e: any) {
    console.error('[SYNC SUBSCRIPTION] Failed to sync local subscriptions with licensing server:', e.stack);
  }
}

export const subscriptionQueryController = {
  async getAllSubscriptions(request: any, reply: any) {
    try {
      const user = request.user!;
      
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can view all subscriptions',
        };
      }

      const { include_inactive, page, limit } = request.query;
      const includeInactive = include_inactive === 'true' || include_inactive === true;
      const pageNum = typeof page === 'string' ? parseInt(page, 10) : typeof page === 'number' ? page : undefined;
      const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : typeof limit === 'number' ? limit : undefined;

      if (pageNum && limitNum) {
        const result = await subscriptionService.getAllSubscriptionsPaginated({
          includeInactive,
          page: pageNum,
          limit: limitNum,
        });

        reply.status(200);
        return {
          success: true,
          message: 'Subscriptions retrieved successfully',
          data: {
            subscriptions: result.subscriptions,
            pagination: {
              currentPage: result.currentPage,
              totalPages: result.totalPages,
              totalItems: result.totalCount,
              itemsPerPage: result.perPage,
            },
          },
        };
      } else {
        const subscriptions = await subscriptionService.getAllSubscriptions(includeInactive);

        reply.status(200);
        return {
          success: true,
          message: 'Subscriptions retrieved successfully',
          data: {
            subscriptions: subscriptions,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve subscriptions';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getSubscriptionsByTenant(request: any, reply: any) {
    try {
      const user = request.user!;
      const { tenant_id } = request.params;
      
      // Only system SUPERADMIN can view any tenant's subscriptions; others must match tenant
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id) && user.tenant_id !== tenant_id) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions to view this tenant\'s subscriptions',
        };
      }

      const { include_inactive } = request.query;
      const includeInactive = include_inactive === 'true';

      const subscriptions = await subscriptionService.getSubscriptionsByTenant(tenant_id, includeInactive);

      reply.status(200);
      return {
        success: true,
        message: 'Tenant subscriptions retrieved successfully',
        data: {
          subscriptions: subscriptions,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve tenant subscriptions';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getSubscriptionById(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Subscription ID is required',
        };
      }

      const subscription = await subscriptionService.getSubscriptionById(id);

      if (!subscription) {
        reply.status(404);
        return {
          success: false,
          message: 'Subscription not found',
        };
      }

      // Only system SUPERADMIN can view any subscription; others must match tenant
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id) && user.tenant_id !== subscription.tenant_id) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions to view this subscription',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Subscription retrieved successfully',
        data: subscription,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve subscription';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getActiveSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenant_id!;

      // Automatically sync subscriptions with licensing server
      try {
        await syncLocalSubscriptionsWithLicensingServer(tenantId);
      } catch (err: any) {
        console.error('[SYNC] getActiveSubscription sync error:', err.message);
      }

      const subscription = await subscriptionService.getActiveSubscriptionByTenant(tenantId);

      if (!subscription) {
        reply.status(404);
        return {
          success: false,
          message: 'No active subscription found for this tenant',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Active subscription retrieved successfully',
        data: subscription,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve active subscription';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getCurrentSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenant_id!;

      // Automatically sync subscriptions with licensing server
      try {
        await syncLocalSubscriptionsWithLicensingServer(tenantId);
      } catch (err: any) {
        console.error('[SYNC] getCurrentSubscription sync error:', err.message);
      }

      const subscription = await subscriptionService.getCurrentSubscriptionByTenant(tenantId);

      if (!subscription) {
        reply.status(404);
        return {
          success: false,
          message: 'No current subscription (ACTIVE/TRIAL) found for this tenant',
        };
      }

      reply.status(200);
      return {
        success: true,
        message: 'Current subscription retrieved successfully',
        data: subscription,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve current subscription';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
async checkTenantSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const { tenant_id } = request.query as { tenant_id?: string };

      // For system SUPERADMIN, tenant_id can be supplied via query. For others, enforce own tenant.
      let targetTenantId: string | undefined = tenant_id;
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        targetTenantId = user.tenant_id;
      }

      if (!targetTenantId) {
        reply.status(400);
        return {
          success: false,
          message: 'tenant_id is required',
        };
      }

      const existing = await subscriptionService.getActiveSubscriptionByTenant(targetTenantId);

      reply.status(200);
      return {
        success: true,
        message: 'Active subscription check completed',
        data: existing || null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check tenant subscription';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
async getSubscriptionHistory(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      // Only system SUPERADMIN can view subscription history
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can view subscription history',
        };
      }

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Subscription ID is required',
        };
      }

      const history = await subscriptionService.getSubscriptionHistory(id);
      return {
        success: true,
        data: history,
      };
    } catch (error: any) {
      reply.status(500);
      return {
        success: false,
        message: error?.message || 'Failed to fetch subscription history',
      };
    }
  },

  async getTenantSubscriptionHistory(request: any, reply: any) {
    try {
      const user = request.user!;
      const { tenant_id } = request.params as { tenant_id: string };

      if (!tenant_id) {
        reply.status(400);
        return { success: false, message: 'tenant_id is required' };
      }

      // System SUPERADMIN can view any tenant; others only their own tenant
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id) && user.tenant_id !== tenant_id) {
        reply.status(403);
        return { success: false, message: 'Insufficient permissions to view this tenant history' };
      }

      const history = await subscriptionService.getTenantSubscriptionHistory(tenant_id);
      reply.status(200);
      return {
        success: true,
        message: 'Tenant subscription history retrieved successfully',
        data: history,
      };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error?.message || 'Failed to fetch tenant subscription history' };
    }
  },
async getSubscriptionAnalytics(request: any, reply: any) {
    try {
      const user = request.user!;
      
      // Only system SUPERADMIN can view subscription analytics
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can view subscription analytics',
        };
      }

      const analytics = await subscriptionService.getSubscriptionAnalytics();

      reply.status(200);
      return {
        success: true,
        message: 'Subscription analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve subscription analytics';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }
};
