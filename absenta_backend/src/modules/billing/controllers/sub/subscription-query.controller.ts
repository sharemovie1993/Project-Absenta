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

    // 1. Resolve tenant identity (Tier 2)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, name: true }
    });
    const slug = tenant?.subdomain?.toLowerCase();

    // 2. Fetch remote subscriptions using 2-Tier protocol (Host Key + Tenant Slug)
    let remoteSubs: any[] = [];
    let isLicenseRevokedOrNotFound = false;

    try {
      const response = await axios.get(
        `${LICENSE_SERVER_URL}/api/license/my-subscriptions/${licenseKey.trim()}${slug ? `?tenant_slug=${slug}` : ''}`,
        { timeout: 8000 }
      );
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        remoteSubs = response.data.data;
      }
    } catch (fetchErr: any) {
      if (fetchErr.response && fetchErr.response.status === 404) {
        // License key atau tenant telah DIHAPUS / DICABUT dari Server Lisensi
        console.warn(`[SYNC SUBSCRIPTION] License key or tenant returned 404 Not Found from license server. Flagging as revoked/pruned.`);
        isLicenseRevokedOrNotFound = true;
        remoteSubs = [];
      } else {
        // Gangguan koneksi internet atau server lisensi temporary error -> offline tolerance
        console.error(`[SYNC SUBSCRIPTION] Temporary error reaching license server: ${fetchErr.message}`);
        return;
      }
    }

    // 3. Get all pricing plans from server without product_id filter to include all packages
    let remotePlans: any[] = [];
    if (!isLicenseRevokedOrNotFound) {
      try {
        const plansResponse = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages`, { timeout: 8000 });
        if (plansResponse.data && plansResponse.data.success && Array.isArray(plansResponse.data.data)) {
          remotePlans = plansResponse.data.data;
        }
      } catch (err: any) {
        console.warn('[SYNC SUBSCRIPTION] Failed to fetch remote packages:', err.message);
      }
    }

    let applicableSubs = remoteSubs;
    if (slug) {
      const matched = remoteSubs.filter((s: any) => {
        const sn = String(s.school_name || '').toLowerCase();
        return sn.includes(`|${slug}`) || sn.endsWith(`|${slug}`) || sn === slug;
      });
      if (matched.length > 0) {
        applicableSubs = matched;
      }
    }

    // Kelompokkan subscriptions per service_code untuk memisahkan siklus aktif utama dan riwayat siklus
    const serviceGroupMap = new Map<string, any[]>();
    for (const rSub of applicableSubs) {
      const rSubPlanId = String(rSub.plan_id || '').toLowerCase();
      let planData = remotePlans.find((p: any) => 
        String(p.id).toLowerCase() === rSubPlanId || 
        String(p.code).toLowerCase() === rSubPlanId
      );
      const modId = (planData?.module_id || rSub.plan_id?.split('_')[0] || 'ABSENSI').toUpperCase();
      const serviceCode = (planData?.service_code || (modId === 'PAKET_LENGKAP' ? 'PAKET_LENGKAP' : modId)).toUpperCase();

      const existing = serviceGroupMap.get(serviceCode) || [];
      existing.push({ ...rSub, serviceCode, planData });
      serviceGroupMap.set(serviceCode, existing);
    }

    for (const [serviceCode, cycles] of serviceGroupMap.entries()) {
      // Urutkan siklus: Prioritaskan active, kemudian urutkan end_date paling baru di urutan teratas
      cycles.sort((a, b) => {
        const aActive = String(a.status || '').toLowerCase() === 'active' ? 1 : 0;
        const bActive = String(b.status || '').toLowerCase() === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aEnd = new Date(a.end_date || 0).getTime();
        const bEnd = new Date(b.end_date || 0).getTime();
        return bEnd - aEnd;
      });

      const primaryCycle = cycles[0];
      const planData = primaryCycle.planData;
      const modId = (planData?.module_id || primaryCycle.plan_id?.split('_')[0] || 'ABSENSI').toUpperCase();

      let plan = await prisma.plan.findFirst({
        where: {
          OR: [
            { id: { equals: primaryCycle.plan_id, mode: 'insensitive' } },
            { code: { equals: primaryCycle.plan_id, mode: 'insensitive' } }
          ]
        }
      });

      if (!plan && planData) {
        let features = planData.features_json;
        if (typeof features === 'string') {
          try { features = JSON.parse(features); } catch (e) { features = []; }
        }
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
            service_code: serviceCode,
            module_id: modId,
            name: planData.name || planData.title,
            price_monthly: planData.price_monthly || 0,
            price_yearly: planData.price_yearly || 0,
            max_user: planData.device_limit || null,
            features_json: features || [],
            description: planData.description || '',
            billing_period: planData.billing_period || 'MONTH',
            absensi_mode: modId === 'ABSENSI' ? ((planData.name || planData.title || '').includes('Multi Sesi') ? 'MULTI_SESI' : 'SIMPLE') : undefined,
            is_active: true,
            is_public: true,
            currency: 'IDR'
          }
        });
      }

      if (!plan) {
        let localMod = await prisma.module.findUnique({ where: { id: modId } });
        if (!localMod) {
          localMod = await prisma.module.create({
            data: { id: modId, name: modId, is_active: true }
          });
        }
        plan = await prisma.plan.create({
          data: {
            id: primaryCycle.plan_id,
            code: primaryCycle.plan_id,
            service_code: serviceCode,
            module_id: modId,
            name: primaryCycle.plan_id.replace(/_/g, ' '),
            price_monthly: 0,
            price_yearly: 0,
            features_json: [],
            description: '',
            billing_period: 'MONTH',
            is_active: true,
            is_public: true,
            currency: 'IDR'
          }
        });
      }

      const rawStatus = String(primaryCycle.status || '').toLowerCase();
      const localStatus = rawStatus === 'active' ? 'ACTIVE' : (rawStatus === 'expired' ? 'EXPIRED' : 'TRIAL');

      let localSub = await prisma.subscription.findFirst({
        where: {
          tenant_id: tenantId,
          service_code: serviceCode,
        }
      });

      const startDate = primaryCycle.start_date ? new Date(primaryCycle.start_date) : new Date();
      const endDate = primaryCycle.end_date ? new Date(primaryCycle.end_date) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

      const allCyclesClean = cycles.map((c: any) => ({
        id: c.id,
        plan_id: c.plan_id,
        status: String(c.status || '').toUpperCase(),
        start_date: c.start_date,
        end_date: c.end_date,
        created_at: c.created_at
      }));

      const existingMeta = (localSub?.pricing_meta && typeof localSub.pricing_meta === 'object')
        ? (localSub.pricing_meta as any)
        : {};

      const updatedMeta = {
        ...existingMeta,
        cycles: allCyclesClean
      };

      if (localSub) {
        await prisma.subscription.update({
          where: { id: localSub.id },
          data: {
            plan_id: plan.id,
            status: localStatus as any,
            start_date: startDate,
            end_date: endDate,
            next_billing_date: endDate,
            pricing_meta: updatedMeta as any,
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
            auto_renew: primaryCycle.auto_renew === 1,
            pricing_meta: updatedMeta as any,
          }
        });
      }
    }

    // === TWO-WAY PRUNING & ENTITLEMENT REVOCATION (Anti-Zombie License) ===
    // 1. Kumpulkan seluruh service_code komersial aktif yang masih diakui oleh Server Lisensi
    const remoteActiveCommercialCodes = new Set<string>();
    for (const rSub of applicableSubs) {
      if (String(rSub.status || '').toLowerCase() === 'active') {
        const rSubPlanId = String(rSub.plan_id || '').toLowerCase();
        const pData = remotePlans.find((p: any) => 
          String(p.id).toLowerCase() === rSubPlanId || 
          String(p.code).toLowerCase() === rSubPlanId
        );
        const mid = (pData?.module_id || rSub.plan_id?.split('_')[0] || '').toUpperCase();
        const sCode = (pData?.service_code || (mid === 'PAKET_LENGKAP' ? 'PAKET_LENGKAP' : mid)).toUpperCase();
        if (sCode) remoteActiveCommercialCodes.add(sCode);
      }
    }

    // 2. Cari langganan komersial lokal yang saat ini ACTIVE tetapi TIDAK ADA di Server Lisensi
    const localCommercialSubs = await prisma.subscription.findMany({
      where: {
        tenant_id: tenantId,
        service_code: { notIn: ['CORE', 'ACADEMIC', 'KESISWAAN', 'KURIKULUM'] },
        status: 'ACTIVE' as any
      }
    });

    for (const deadSub of localCommercialSubs) {
      if (!remoteActiveCommercialCodes.has(deadSub.service_code.toUpperCase())) {
        console.warn(`[TWO-WAY PRUNING] Revoking deleted/unlicensed subscription for tenant ${tenantId}, service: ${deadSub.service_code}`);
        await prisma.subscription.update({
          where: { id: deadSub.id },
          data: {
            status: 'EXPIRED' as any,
            expired_reason: 'REVOKED_BY_CENTRAL_LICENSE_SERVER'
          }
        });
      }
    }

    // 3. Flush Redis Entitlement Cache seketika agar gatekeeper langsung mengunci akses modul
    try {
      const { getRedisConnection } = require('@/infra/redis/redisClient');
      const redis = getRedisConnection();
      if (redis) {
        await redis.del(`tenant:features:${tenantId}`);
      }
    } catch (err: any) {
      // Abaikan jika Redis offline
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
