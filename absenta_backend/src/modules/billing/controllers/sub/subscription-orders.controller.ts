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

export const subscriptionOrdersController = {
  async upgradeWizard(_request: any, reply: any) {
    try {
      const plans = await listPublicPlans();
      reply.status(200);
      return {
        success: true,
        message: 'Upgrade wizard is deprecated. Use /billing/subscriptions/order instead.',
        data: {
          subscription: null,
          plans,
          checkout: null,
        },
      };
    } catch (error: any) {
      const statusCode = Number(error?.statusCode) || 500;
      reply.status(statusCode);
      return { success: false, message: error?.message || 'Upgrade wizard failed' };
    }
  },

  async choosePlan(_request: any, reply: any) {
    reply.status(200);
    return {
      success: true,
      message: 'choosePlan is deprecated. Use /billing/subscriptions/order instead.',
      data: {
        checkout: null,
      },
    };
  },

  async orderPlan(request: any, reply: any) {
    try {
      const user = request.user!;
      const { plan_id, billing_period, payment_method } = request.body || {};

      if (!plan_id) {
        reply.status(400);
        return { success: false, message: 'plan_id is required' };
      }

      // Determine which plan variant to use based on billing_period
      let targetPlanId = plan_id;
      if (billing_period) {
        const originalPlan = await prisma.plan.findUnique({ where: { id: plan_id } });
        if (!originalPlan) {
          const baseName = String(plan_id).replace(/-MONTHLY|-YEARLY$/, '');
          const variant = await prisma.plan.findFirst({
            where: {
              name: `${baseName}-${billing_period}`,
              is_active: true,
              is_public: true,
            },
          });
          if (variant) {
            targetPlanId = variant.id;
          }
        } else {
          const baseName = originalPlan.name.replace(/-MONTHLY|-YEARLY$/, '');
          const variant = await prisma.plan.findFirst({
            where: {
              name: `${baseName}-${billing_period}`,
              is_active: true,
              is_public: true,
            },
          });
          if (variant) {
            targetPlanId = variant.id;
          }
        }
      }

      // === 2. Resolve local Plan ===
      const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
      const axios = require('axios');
      
      let localPlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { id: String(targetPlanId) },
            { code: String(targetPlanId) }
          ]
        }
      });
      if (!localPlan) {
        // Fallback import plan dynamically if not seeded locally yet
        const plansResponse = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=absenta`, { timeout: 8000 });
        if (plansResponse.data && plansResponse.data.success && Array.isArray(plansResponse.data.data)) {
          const planData = plansResponse.data.data.find((p: any) => p.id === targetPlanId);
          if (planData) {
            let features = planData.features_json;
            if (typeof features === 'string') {
              try { features = JSON.parse(features); } catch (e) { features = []; }
            }
            const modId = planData.module_id || 'ABSENSI';
            let localMod = await prisma.module.findUnique({ where: { id: modId } });
            if (!localMod) {
              localMod = await prisma.module.create({
                data: { id: modId, name: modId, is_active: true }
              });
            }
            localPlan = await prisma.plan.create({
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
        }
      }

      if (!localPlan) {
        throw toHttpError(404, 'Plan specifications could not be resolved locally or from the licensing server.');
      }

      // Double-Lock Validation: order tier must be >= active academic core tier
      const isCorePlan = localPlan.service_code === 'CORE';
      const isKoperasi = localPlan.service_code === 'KOPERASI';
      if (!isCorePlan && !isKoperasi) {
        const coreSub = await prisma.subscription.findFirst({
          where: {
            tenant_id: user.tenant_id,
            service_code: 'CORE',
            status: 'ACTIVE',
          },
          include: { Plan: true },
        });

        if (coreSub && coreSub.Plan) {
          const orderTier = getPlanSizeLabel(localPlan).toLowerCase();
          const coreTier = getPlanSizeLabel(coreSub.Plan).toLowerCase();
          const orderIdx = TIER_ORDER.indexOf(orderTier);
          const coreIdx = TIER_ORDER.indexOf(coreTier);

          if (orderIdx !== -1 && coreIdx !== -1 && orderIdx < coreIdx) {
            throw toHttpError(400, `Paket yang dibeli (${getPlanSizeLabel(localPlan)}) minimal harus setara dengan kapasitas sekolah Anda (${getPlanSizeLabel(coreSub.Plan)}).`);
          }
        }
      }

      const isUnlimited = localPlan.billing_period === 'YEAR' ? 1 : 0;
      const targetPrice = localPlan.billing_period === 'YEAR' ? (localPlan.price_yearly || 0) : (localPlan.price_monthly || 0);

      // === 3. Call Licensing Server to Create Central Invoice ===
      const licenseKey = process.env.LICENSE_KEY;
      if (!licenseKey) {
        throw toHttpError(400, 'LICENSE_KEY is not configured in this server environment.');
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenant_id } });
      const schoolName = tenant ? tenant.name : 'Cakola School';

      console.log(`[ORDER PROXY] Requesting central invoice for plan: ${targetPlanId} from licensing server...`);
      const response = await axios.post(`${LICENSE_SERVER_URL}/api/license/request`, {
        school_name: schoolName,
        device_limit: localPlan.max_user || 100,
        is_unlimited: isUnlimited,
        product_id: 'cakola',
        plan_id: String(targetPlanId),
        price: targetPrice,
        payment_method: payment_method || 'QRIS2',
        renew_license_key: licenseKey.trim()
      }, { timeout: 12000 });

      if (!response.data || !response.data.success || !response.data.data) {
        throw toHttpError(500, response.data?.message || 'Gagal membuat invoice di Server Lisensi pusat.');
      }

      const remoteInvoice = response.data.data;
      const checkoutUrl = remoteInvoice.qr_url || remoteInvoice.checkout_url || remoteInvoice.payment_url || remoteInvoice.pay_url;

      reply.status(200);
      return {
        success: true,
        message: 'Order berhasil dibuat secara terpusat',
        data: {
          checkout_url: checkoutUrl,
          checkout: {
            public_token: remoteInvoice.invoice_number,
            public_url: checkoutUrl
          }
        }
      };
    } catch (error: any) {
      console.error('[ORDER PLAN PROXY ERROR]', error);
      
      let statusCode = Number(error?.statusCode) || 500;
      let msg = error instanceof Error ? error.message : 'Failed to order plan centrally';
      
      // Mengekstrak detail status dan pesan kesalahan asli dari Axios/Server Lisensi
      if (error?.response) {
        statusCode = error.response.status || statusCode;
        if (error.response.data && error.response.data.message) {
          msg = error.response.data.message;
        }
      }
      
      reply.status(statusCode);
      return { success: false, message: msg };
    }
  },

  async orderPlanMulti(request: any, reply: any) {
    try {
      const user = request.user;
      if (!user) throw toHttpError(401, 'Unauthorized');

      const { items, payment_method, shipping_address } = request.body as {
        items: Array<{ plan_id: string; qty: number }>;
        payment_method?: string;
        shipping_address?: any;
      };

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw toHttpError(400, 'Keranjang belanja tidak boleh kosong.');
      }

      const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
      const axios = require('axios');

      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenant_id } });
      const schoolName = tenant ? tenant.name : 'Sekolah Absenta Client';

      console.log(`[ORDER MULTI PROXY] Forwarding ${items.length} items to CLS server...`);
      const response = await axios.post(`${LICENSE_SERVER_URL}/api/public/checkout-multi`, {
        school_name: schoolName,
        tenant_id: user.tenant_id,
        items,
        payment_method: payment_method || 'QRIS',
        shipping_address,
        phone_number: user.phone || '087779937341'
      }, { timeout: 15000 });

      if (!response.data || !response.data.success || !response.data.data) {
        throw toHttpError(500, response.data?.message || 'Gagal membuat invoice multi-item di Server Lisensi.');
      }

      reply.status(200);
      return response.data;
    } catch (error: any) {
      console.error('[ORDER MULTI PROXY ERROR]', error);
      let statusCode = Number(error?.statusCode) || 500;
      let msg = error instanceof Error ? error.message : 'Failed to process multi-item checkout centrally';
      if (error?.response) {
        statusCode = error.response.status || statusCode;
        if (error.response.data && error.response.data.message) {
          msg = error.response.data.message;
        }
      }
      reply.status(statusCode);
      return { success: false, message: msg };
    }
  },

  async cancelPendingUpgrade(request: any, reply: any) {
    try {
      const user = request.user!;
      const userId = user.id || null;
      const { subscription_id } = request.body;
      const correlationId = request.correlationId;

      if (!subscription_id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID is required' };
      }

      const result = await cancelPendingUpgradeCommand(
        subscription_id,
        userId,
        correlationId
      );

      if (!result.success) {
        reply.status(400);
        return result;
      }

      reply.status(200);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel pending upgrade';
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async renewSubscription(request: any, reply: any) {
    try {
      void request;
      reply.status(400);
      return {
        success: false,
        message: 'Forbidden: renew endpoint is disabled; use invoice payment to extend',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to renew subscription';
      
      if (errorMessage.includes('not found')) {
        reply.status(404);
      } else if (errorMessage.includes('Only active') || errorMessage.includes('must be after')) {
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

  async scheduleDowngrade(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const { target_plan_id, reason } = request.body || {};

      if (!id || !target_plan_id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID and target_plan_id are required' };
      }

      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        const sub = await subscriptionService.getSubscriptionById(String(id));
        if (!sub) {
          reply.status(404);
          return { success: false, message: 'Subscription not found' };
        }
        const roleName = String(user?.roleName || user?.role?.name || '');
        if (roleName !== RoleName.ADMIN || String(sub.tenant_id) !== String(user.tenant_id)) {
          reply.status(403);
          return { success: false, message: 'Insufficient permissions to downgrade this subscription' };
        }
      }

      const pcr = await scheduleDowngradeCommand(String(id), String(target_plan_id), reason ? String(reason) : undefined);
      reply.status(200);
      return { success: true, message: 'Downgrade scheduled', data: pcr };
    } catch (error: any) {
      const msg = error?.message || 'Failed to schedule downgrade';
      const lowered = String(msg).toLowerCase();
      if (lowered.includes('not found')) reply.status(404);
      else if (lowered.includes('required') || lowered.includes('cannot') || lowered.includes('must')) reply.status(400);
      else if (lowered.includes('permissions')) reply.status(403);
      else reply.status(500);
      return { success: false, message: msg };
    }
  },

  async cancelDowngrade(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      if (!id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID is required' };
      }

      if (!isSystemSuperAdmin(user.roleName, user.tenant_id)) {
        const sub = await subscriptionService.getSubscriptionById(String(id));
        if (!sub) {
          reply.status(404);
          return { success: false, message: 'Subscription not found' };
        }
        const roleName = String(user?.roleName || user?.role?.name || '');
        if (roleName !== RoleName.ADMIN || String(sub.tenant_id) !== String(user.tenant_id)) {
          reply.status(403);
          return { success: false, message: 'Insufficient permissions to cancel downgrade for this subscription' };
        }
      }

      const cancelled = await cancelDowngradeCommand(String(id));
      reply.status(200);
      return { success: true, message: 'Downgrade cancelled', data: cancelled };
    } catch (error: any) {
      const msg = error?.message || 'Failed to cancel downgrade';
      const lowered = String(msg).toLowerCase();
      if (lowered.includes('not found')) reply.status(404);
      else if (lowered.includes('no scheduled downgrade')) reply.status(400);
      else reply.status(500);
      return { success: false, message: msg };
    }
  },
async handleLicenseWebhook(request: any, reply: any) {
    try {
      const signature = request.headers['x-license-signature'];
      const localLicenseKey = process.env.LICENSE_KEY;
      const secret = process.env.LICENSE_SECRET || localLicenseKey;

      if (signature && secret) {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(request.body || {}))
          .digest('hex');
        if (signature !== expectedSignature) {
          reply.status(401);
          return { success: false, message: 'Invalid signature verification' };
        }
      }

      const parsedBody = licenseWebhookSchema.parse(request.body || {});
      const { license_key, tenant_id } = parsedBody;
      
      if (!localLicenseKey || !license_key || String(license_key).trim() !== localLicenseKey.trim()) {
        reply.status(400);
        return { success: false, message: 'Invalid license key' };
      }

      console.log(`[LICENSE CALLBACK] Received real-time push event for tenant: ${tenant_id || 'unknown'}. Triggering sync...`);
      
      // Pull and update database state securely from central licensing server
      const targetTenantId = tenant_id || String(request.headers['x-tenant-id'] || '');
      let finalTenantId = targetTenantId;
      if (!finalTenantId) {
        const tenant = await prisma.tenant.findFirst({ select: { id: true } });
        if (tenant) finalTenantId = tenant.id;
      }

      if (finalTenantId) {
        await syncLocalSubscriptionsWithLicensingServer(finalTenantId);
      }

      reply.status(200);
      return { success: true, message: 'Real-time sync triggered successfully' };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        reply.status(400);
        return {
          success: false,
          message: e.errors.map(err => err.message).join(', '),
          errors: e.errors
        };
      }
      console.error('[LICENSE CALLBACK ERROR]', e);
      reply.status(500);
      return { success: false, message: e.message || 'Callback failed' };
    }
  }
};
