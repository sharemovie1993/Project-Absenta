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

export const subscriptionLifecycleController = {
  async createSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      
      const { tenant_id, plan_id, start_date, end_date, auto_renew, next_billing_date, status } = request.body;

      // Permission: SUPERADMIN can create for any tenant; ADMIN can create only for own tenant
      if (isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        // ok
      } else {
        // Only ADMIN can create for own tenant
        if (user.roleName !== RoleName.ADMIN) {
          reply.status(403);
          return {
            success: false,
            message: 'Insufficient permissions. Only ADMIN or SUPERADMIN can create subscriptions',
          };
        }
        // Validate tenant ownership
        if (!tenant_id || tenant_id !== user.tenant_id) {
          reply.status(403);
          return {
            success: false,
            message: 'ADMIN can only create subscriptions for their own tenant',
          };
        }
      }

      // Validate required fields
      if (!tenant_id || !plan_id || !start_date || !end_date) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: tenant_id, plan_id, start_date, end_date',
        };
      }

      // Validate and parse dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const DEFAULT_TRIAL_END_BEHAVIOR = (process.env.DEFAULT_TRIAL_END_BEHAVIOR || 'NEXT_BILLING_FROM_END').toUpperCase();
      const nextBillingDate = next_billing_date
        ? new Date(next_billing_date)
        : (DEFAULT_TRIAL_END_BEHAVIOR === 'NEXT_BILLING_FROM_END' ? endDate : undefined);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid date format',
        };
      }

      // Validate status if provided - only allow ACTIVE, PENDING_PAYMENT, or TRIAL at creation
      const allowedStatuses = ['ACTIVE', 'PENDING_PAYMENT', 'TRIAL'];
      if (status !== undefined && !allowedStatuses.includes(String(status))) {
        reply.status(400);
        return {
          success: false,
          message: 'Invalid status. Allowed: ACTIVE | PENDING_PAYMENT | TRIAL',
        };
      }

      const subscriptionInput: CreateSubscriptionInput = {
        tenant_id,
        plan_id,
        start_date: startDate,
        end_date: endDate,
        auto_renew,
        ...(status !== undefined && { status }),
        ...(nextBillingDate && { next_billing_date: nextBillingDate }),
      };

      // Create subscription
      const subscription = await subscriptionService.createSubscription(subscriptionInput);

      try {
        const now = new Date();
        const shouldAutoGenerateByDate = !nextBillingDate || nextBillingDate <= now;
        if (shouldAutoGenerateByDate) {
          const billingDate = nextBillingDate ?? startDate;
          const dueDate = new Date(billingDate);
          dueDate.setDate(dueDate.getDate() + 3);
          const amount = subscription.plan?.price_monthly;
          const hasTrial = typeof (subscription.plan as any)?.trial_days === 'number' && ((subscription.plan as any).trial_days > 0);
          const shouldGenerate = (String(subscription.status) === 'PENDING_PAYMENT') || (String(subscription.status) === 'ACTIVE' && !hasTrial);
          if (shouldGenerate && typeof amount === 'number' && amount > 0) {
            const billing = await billingService.createBilling({
              subscription_id: subscription.id,
              amount,
              billing_date: billingDate,
              due_date: dueDate,
            });
            await emitDomainEvent({
              event_type: 'billing.invoice.requested',
              tenant_id: String(tenant_id || '') || null,
              source_service: 'billing',
              payload: {
                tenant_id: String(tenant_id || '') || null,
                subscription_id: String(subscription.id),
                billing_id: String(billing.id),
                timestamp: new Date().toISOString(),
                invoice_data: { due_date: dueDate.toISOString() },
                send: false,
              },
            });
          }
        }
      } catch (genError) {
        console.error('Auto-generation of billing/invoice failed:', genError);
      }

      reply.status(201);
      return {
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription';
      
      if (errorMessage.includes('not found') || errorMessage.includes('already has')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
async updateSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      
      // Only system SUPERADMIN can update subscriptions
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can update subscriptions',
        };
      }

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Subscription ID is required',
        };
      }

      const { start_date, end_date, auto_renew, next_billing_date } = request.body;
      if (end_date !== undefined || next_billing_date !== undefined) {
        reply.status(400);
        return {
          success: false,
          message: 'Forbidden: end_date/next_billing_date can only be updated via invoice payment',
        };
      }

      const updateInput: UpdateSubscriptionInput = {};

      if (auto_renew !== undefined) updateInput.auto_renew = auto_renew;

      if (start_date !== undefined) {
        const startDate = new Date(start_date);
        if (isNaN(startDate.getTime())) {
          reply.status(400);
          return {
            success: false,
            message: 'Invalid start_date format',
          };
        }
        updateInput.start_date = startDate;
      }
      
      const subscription = await subscriptionService.updateSubscription(id, updateInput, user.id);

      reply.status(200);
      return {
        success: true,
        message: 'Subscription updated successfully',
        data: subscription,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update subscription';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('not active')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
async cancelSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const { reason } = request.body || {};

      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'Subscription ID is required',
        };
      }

      // Check subscription ownership for users other than system SUPERADMIN
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        const subscription = await subscriptionService.getSubscriptionById(id);
        
        if (!subscription) {
          reply.status(404);
          return {
            success: false,
            message: 'Subscription not found',
          };
        }

        if (user.tenant_id !== subscription.tenant_id) {
          reply.status(403);
          return {
            success: false,
            message: 'Insufficient permissions to cancel this subscription',
          };
        }

        // Only ADMIN can cancel their tenant's subscription
        if (user.roleName !== RoleName.ADMIN) {
          reply.status(403);
          return {
            success: false,
            message: 'Insufficient permissions. Only ADMIN can cancel subscriptions',
          };
        }
      }

      reply.status(200);
      return {
        success: true,
        message: 'Subscription cancel scheduled successfully',
        data: await scheduleCancelCommand(String(id), reason ? String(reason) : undefined),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('already') || errorMessage.includes('Cannot') || errorMessage.includes('scheduled')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async undoCancelSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID is required' };
      }

      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        const subscription = await subscriptionService.getSubscriptionById(id);
        if (!subscription) {
          reply.status(404);
          return { success: false, message: 'Subscription not found' };
        }
        if (user.tenant_id !== subscription.tenant_id) {
          reply.status(403);
          return { success: false, message: 'Insufficient permissions to undo cancel for this subscription' };
        }
        if (user.roleName !== RoleName.ADMIN) {
          reply.status(403);
          return { success: false, message: 'Insufficient permissions. Only ADMIN can undo cancel' };
        }
      }

      const cancelled = await undoCancelCommand(String(id));
      reply.status(200);
      return { success: true, message: 'Cancel request undone', data: cancelled };
    } catch (error: any) {
      const msg = error?.message || 'Failed to undo cancel';
      const lowered = String(msg).toLowerCase();
      if (lowered.includes('not found')) reply.status(404);
      else if (lowered.includes('no scheduled cancel')) reply.status(400);
      else reply.status(500);
      return { success: false, message: msg };
    }
  },

  async resumeSubscription(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID is required' };
      }

      // Check permission: System SUPERADMIN or Tenant ADMIN (own tenant)
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        const subscription = await subscriptionService.getSubscriptionById(id);
        if (!subscription) {
          reply.status(404);
          return { success: false, message: 'Subscription not found' };
        }
        if (user.tenant_id !== subscription.tenant_id) {
          reply.status(403);
          return { success: false, message: 'Insufficient permissions to resume this subscription' };
        }
      }

      const subscription = await subscriptionService.resumeSubscription(id, user.id);

      reply.status(200);
      return {
        success: true,
        message: 'Subscription auto-renew resumed successfully',
        data: subscription,
      };
    } catch (error: any) {
      reply.status(500);
      return {
        success: false,
        message: error?.message || 'Failed to resume subscription',
      };
    }
  },
async checkExpiredSubscriptions(request: any, reply: any) {
    try {
      const user = request.user!;
      
      // Only system SUPERADMIN can check expired subscriptions
      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can check expired subscriptions',
        };
      }

      const expiredSubscriptions = await subscriptionService.checkExpiredSubscriptions();

      reply.status(200);
      return {
        success: true,
        message: `Found and updated ${expiredSubscriptions.length} expired subscriptions`,
        data: expiredSubscriptions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check expired subscriptions';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
async deleteSubscription(request: any, reply: any) {
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

      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        reply.status(403);
        return {
          success: false,
          message: 'Insufficient permissions. Only SUPERADMIN can delete subscriptions',
        };
      }

      const result = await subscriptionService.deleteSubscription(id);

      reply.status(200);
      return {
        success: true,
        message: 'Subscription deleted successfully',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete subscription';
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('Cannot delete') || errorMessage.includes('Only canceled') || errorMessage.includes('Only cancelled')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async updateAcademicTier(request: any, reply: any) {
    try {
      const user = request.user!;
      const { tier } = request.body || {};

      if (!tier) {
        reply.status(400);
        return { success: false, message: 'tier is required' };
      }

      const tierUpper = String(tier).trim().toUpperCase();
      if (!['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'].includes(tierUpper)) {
        reply.status(400);
        return { success: false, message: 'Invalid tier. Allowed values: MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE' };
      }

      const targetPlanId = `ACADEMIC_${tierUpper}_TAHUNAN`;
      let localPlan = await prisma.plan.findUnique({ where: { id: targetPlanId } });
      if (!localPlan) {
        // Fallback: Jika belum ada di lokal, coba cari atau buat dari default seed
        const defaultPlans = {
          'MICRO': 100,
          'SMALL': 300,
          'MEDIUM': 600,
          'LARGE': 1200,
          'ENTERPRISE': null
        };
        const maxUser = (defaultPlans as any)[tierUpper];
        localPlan = await prisma.plan.create({
          data: {
            id: targetPlanId,
            code: targetPlanId,
            service_code: 'CORE',
            module_id: 'CORE',
            name: `Academic Core (${tierUpper.charAt(0) + tierUpper.slice(1).toLowerCase()}) - Tahunan`,
            price_monthly: 0,
            price_yearly: 0,
            max_user: maxUser,
            features_json: [],
            description: `Academic Core capacity tier ${tierUpper}`,
            billing_period: 'YEAR',
            absensi_mode: 'SIMPLE',
            is_active: true,
            is_public: true,
            size_label: tierUpper.charAt(0) + tierUpper.slice(1).toLowerCase(),
            currency: 'IDR'
          }
        });
      }

      // Cari core subscription aktif milik tenant saat ini
      let coreSub = await prisma.subscription.findFirst({
        where: { tenant_id: user.tenant_id, service_code: 'CORE', status: 'ACTIVE' }
      });

      if (!coreSub) {
        // Fallback: Jika tidak ketemu, coba cari CORE_PLATFORM atau buat baru
        const now = new Date();
        const end = new Date(now);
        end.setFullYear(end.getFullYear() + 100);
        coreSub = await prisma.subscription.create({
          data: {
            tenant_id: user.tenant_id,
            plan_id: localPlan.id,
            service_code: 'CORE',
            status: 'ACTIVE',
            start_date: now,
            end_date: end,
            next_billing_date: end,
            auto_renew: false
          }
        });
      } else {
        await prisma.subscription.update({
          where: { id: coreSub.id },
          data: { plan_id: localPlan.id }
        });
      }

      // Synchronize dengan Licensing Server
      const licenseKey = process.env.LICENSE_KEY;
      if (licenseKey) {
        const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
        const axios = require('axios');
        try {
          await axios.post(`${LICENSE_SERVER_URL}/api/license/update-academic-tier`, {
            license_key: licenseKey.trim(),
            tier: tierUpper
          }, { timeout: 8000 });
        } catch (e: any) {
          console.error('[SYNC TIER] Failed to sync tier with licensing server:', e.message);
          // Kita tidak batalkan request karena lokal sukses terupdate, sinkronisasi berkala selanjutnya akan memulihkan data
        }
      }

      return { success: true, message: `Kapasitas sekolah berhasil diubah ke ${tierUpper}.` };
    } catch (err: any) {
      reply.status(500);
      return { success: false, message: err.message || 'Gagal mengubah kapasitas sekolah' };
    }
  }
};
