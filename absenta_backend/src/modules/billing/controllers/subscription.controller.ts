import { subscriptionService, CreateSubscriptionInput, UpdateSubscriptionInput } from '../services/subscription.service';
import { RoleName } from '../../../constants/enums';
import { billingService } from '../services/billing.service';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { billingDb as prisma } from '../services/repositories/billing.db';
import { cacheService } from '@/utils/cache.service';
import { CACHE_KEYS } from '@/constants/cache-keys';
import { emitDomainEvent } from '@/infra/event-bus';
import { cancelDowngradeCommand, scheduleDowngradeCommand } from '../services/commands/schedule-downgrade.command';
import { scheduleCancelCommand, undoCancelCommand } from '../services/commands/schedule-cancel.command';
import { cancelPendingUpgradeCommand } from '../services/commands/cancel-pending-upgrade.command';
import { resolveBaseUrlFromRequest } from '@/utils/url-helper';

const DUE_DAYS = parseInt(process.env.DUE_DAYS || '3');

// resolvePublicAppBaseUrlFromRequest telah dikonsolidasi ke src/utils/url-helper.ts

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

async function waitForInvoiceIdByBillingId(billingId: string, timeoutMs: number): Promise<string | null> {
  const startedAt = Date.now();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const id = String(billingId || '').trim();
  if (!id) return null;
  while (Date.now() - startedAt < timeoutMs) {
    const inv = await prisma.invoice.findFirst({ where: { billing_id: id }, select: { id: true } });
    if (inv?.id) return String(inv.id);
    await sleep(75);
  }
  return null;
}

async function resolveSubscriptionForUpgrade(user: any, _planModules: string[], subscriptionId?: string, targetServiceCode?: string) {
  const roleName = user?.roleName;
  const tenantId = String(user?.tenant_id);

  if (subscriptionId) {
    const sub = await subscriptionService.getSubscriptionById(String(subscriptionId));
    if (!sub) throw toHttpError(404, 'Subscription not found');
    if (!isSystemSuperAdmin(roleName, tenantId)) {
      if (roleName !== RoleName.ADMIN || String(sub.tenant_id) !== tenantId) {
        throw toHttpError(403, 'Insufficient permissions');
      }
    }
    return sub as any;
  }

  // MULTI-SERVICE FIX: Match by service_code instead of features_json overlap.
  // Best practice SaaS: 1 Subscription per Service per Tenant.
  // Using features_json overlap caused cross-service overwrites because all plans
  // share the "CORE" feature, making every plan match every existing subscription.
  const subscriptions = await prisma.subscription.findMany({
    where: { 
      tenant_id: tenantId,
      status: { in: ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'] as any }
    },
    include: { Plan: true }
  });

  if (targetServiceCode) {
    // Primary strategy: match by service_code (best practice)
    for (const sub of subscriptions) {
      if (sub.service_code === targetServiceCode) {
        return sub as any;
      }
    }
  }

  // No matching subscription found for this service → will create new one
  return null;
}

async function buildUpgradeCheckout(user: any, planId: string, subscriptionId?: string, correlationId?: string) {
  const roleName = user?.roleName;
  const tenantId = String(user?.tenant_id);

  if (!isSystemSuperAdmin(roleName, tenantId)) {
    if (roleName !== RoleName.ADMIN) {
      throw toHttpError(403, 'Insufficient permissions');
    }
  }

  let plan = await prisma.plan.findUnique({ where: { id: String(planId) } });
  if (!plan) {
    try {
      const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
      const axios = require('axios');
      const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/packages?product_id=absenta`, { timeout: 8000 });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const planData = response.data.data.find((p: any) => p.id === planId);
        if (planData) {
          let features = planData.features_json;
          if (typeof features === 'string') {
            try { features = JSON.parse(features); } catch (e) { features = []; }
          }
          const modId = planData.module_id || 'ABSENSI';
          let localMod = await prisma.module.findUnique({ where: { id: modId } });
          if (!localMod) {
            localMod = await prisma.module.create({
              data: {
                id: modId,
                name: modId,
                is_active: true
              }
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
              absensi_mode: planData.module_id === 'ABSENSI' ? (planData.name.includes('Multi Sesi') ? 'MULTI_SESI' : 'SIMPLE') : undefined,
              is_active: true,
              is_public: true,
              currency: 'IDR'
            }
          });
        }
      }
    } catch (err: any) {
      console.error('[BUILD CHECKOUT] Failed to lazily import plan from licensing server:', err.message);
    }
  }

  if (!plan) throw toHttpError(404, 'Plan not found');
  if (!plan.is_active || !plan.is_public) throw toHttpError(400, 'Plan is not available');

  const now = new Date();
  const normalizeToStartOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const computePeriodEnd = () => {
    const end = new Date(now);
    if (plan.billing_period === 'YEAR') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    return end;
  };

  const targetModules = Array.isArray(plan.features_json) ? (plan.features_json as string[]) : [];
  const targetServiceCode = String((plan as any).service_code || '');

  // Find all subscriptions with pending upgrades
  const pendingUpgrades = await prisma.subscription.findMany({
    where: {
      tenant_id: tenantId,
      status: 'UPGRADE_PENDING' as any,
      Billing: {
        some: {
          charge_type: 'UPGRADE' as any,
          Invoice: {
            status: { in: ['DRAFT', 'SENT', 'VIEWED'] as any },
          },
        },
      },
    },
    include: { 
      Plan: true,
      PlanChangeRequest: {
        where: { status: 'SCHEDULED' as any, change_type: 'UPGRADE' as any },
        orderBy: { created_at: 'desc' },
        take: 1
      },
      Billing: {
        where: {
          charge_type: 'UPGRADE' as any,
          Invoice: {
            status: { in: ['DRAFT', 'SENT', 'VIEWED'] as any },
          },
        },
        include: { Invoice: true },
        take: 1,
        orderBy: { created_at: 'desc' }
      }
    }
  });

  for (const pendingSub of pendingUpgrades) {
    // MULTI-SERVICE FIX: Match pending upgrade by service_code, not features_json overlap
    const pendingServiceCode = String(pendingSub.service_code || '');
    const isSameService = targetServiceCode && pendingServiceCode === targetServiceCode;
    if (isSameService) {
      const existingBilling = (pendingSub as any).Billing?.[0];
      if (existingBilling && existingBilling.Invoice) {
        return {
          subscription: pendingSub,
          checkout: { 
            billing_id: String(existingBilling.id), 
            invoice_id: String(existingBilling.Invoice.id) 
          },
          reused: true,
        };
      }
      // Graceful recovery with collision handling
      const pcr = Array.isArray((pendingSub as any).PlanChangeRequest) ? (pendingSub as any).PlanChangeRequest[0] : null;
      const billingDate = normalizeToStartOfDay(now);
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + DUE_DAYS);

      // Collision check for unique constraint [subscription_id, billing_date]
      const collision = await prisma.billing.findFirst({
        where: {
          subscription_id: String(pendingSub.id),
          billing_date: billingDate,
        },
        include: { Invoice: { select: { id: true, status: true } }, },
      });
      if (collision) {
        if (collision.upgrade_plan_id_snapshot === String(planId)) {
          if (collision.Invoice && ['DRAFT', 'SENT', 'VIEWED'].includes(String(collision.Invoice.status))) {
            const finalInvoiceId = collision.Invoice.id;
            if (finalInvoiceId) {
              try {
                await emitDomainEvent({
                  event_type: 'billing.invoice.requested',
                  tenant_id: String((pendingSub as any).tenant_id || '') || null,
                  source_service: 'billing',
                  payload: {
                    tenant_id: String((pendingSub as any).tenant_id || '') || null,
                    subscription_id: String((pendingSub as any).id || ''),
                    billing_id: String(collision.id),
                    invoice_id: String(finalInvoiceId),
                    timestamp: new Date().toISOString(),
                    send: true,
                    send_as_role: roleName || null,
                    send_as_tenant_id: tenantId || null,
                    correlation_id: correlationId || null,
                  },
                });
              } catch {}
            }
            return {
              subscription: pendingSub,
              checkout: { billing_id: collision.id, invoice_id: collision.Invoice?.id || null },
              reused: true,
            };
          } else {
            await prisma.billing.update({ where: { id: collision.id }, data: { billing_date: new Date() } });
          }
        } else {
          if (collision.Invoice && ['DRAFT', 'SENT', 'VIEWED'].includes(String(collision.Invoice.status))) {
            await prisma.invoice.update({ where: { id: collision.Invoice.id }, data: { status: 'CANCELLED' as any } });
          }
          await prisma.billing.update({ where: { id: collision.id }, data: { billing_date: new Date() } });
        }
      }

      const amount = plan.billing_period === 'YEAR' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly;
      const newBilling = await billingService.createBilling({
        subscription_id: String(pendingSub.id),
        amount: Number(amount),
        billing_date: billingDate,
        due_date: dueDate,
        charge_type: 'UPGRADE' as any,
        upgrade_plan_id_snapshot: String(planId),
        upgrade_price_snapshot: Number(amount),
        plan_change_request_id: pcr ? String(pcr.id) : undefined,
        correlation_id: correlationId || undefined,
      });
      await emitDomainEvent({
        event_type: 'billing.invoice.requested',
        tenant_id: String((pendingSub as any).tenant_id || '') || null,
        source_service: 'billing',
        payload: {
          tenant_id: String((pendingSub as any).tenant_id || '') || null,
          subscription_id: String((pendingSub as any).id || ''),
          billing_id: String(newBilling.id),
          timestamp: new Date().toISOString(),
          invoice_data: { due_date: dueDate.toISOString() },
          send: true,
          send_as_role: roleName || null,
          send_as_tenant_id: tenantId || null,
          correlation_id: correlationId || null,
        },
      });
      const createdInvId = await waitForInvoiceIdByBillingId(String(newBilling.id), 1500);
      return {
        subscription: pendingSub,
        checkout: { billing_id: String(newBilling.id), invoice_id: createdInvId },
        reused: false,
      };
    }
  }

  let subscription = await resolveSubscriptionForUpgrade(user, targetModules, subscriptionId, targetServiceCode);
  let planChange: any | null = null;

  if (!subscription) {
    const end = computePeriodEnd();
    subscription = await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: String(planId),
        service_code: (plan as any).service_code,
        start_date: now,
        end_date: end,
        next_billing_date: end,
        status: 'UPGRADE_PENDING' as any,
      },
      include: { Plan: true, Tenant: { select: { id: true, name: true, domain: true } } },
    });

    planChange = await prisma.planChangeRequest.create({
      data: {
        subscription_id: String(subscription.id),
        from_plan_id: String((subscription as any).plan_id),
        to_plan_id: String(planId),
        effective_date: now,
        change_type: 'UPGRADE' as any,
        status: 'SCHEDULED' as any,
        price_snapshot: Number(plan.billing_period === 'YEAR' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly),
        currency: String((plan as any).currency || 'IDR'),
        reason: 'UPGRADE',
      },
    });
  } else {
    // Cancel any previously SCHEDULED plan change for this subscription (idempotent for platforms with unique constraint)
    await prisma.planChangeRequest.updateMany({
      where: { subscription_id: String(subscription.id), status: 'SCHEDULED' as any },
      data: { status: 'CANCELLED' as any },
    });
    planChange = await prisma.planChangeRequest.create({
      data: {
        subscription_id: String(subscription.id),
        from_plan_id: String((subscription as any).plan_id),
        to_plan_id: String(planId),
        effective_date: now,
        change_type: 'UPGRADE' as any,
        status: 'SCHEDULED' as any,
        price_snapshot: Number(plan.billing_period === 'YEAR' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly),
        currency: String((plan as any).currency || 'IDR'),
        reason: 'UPGRADE',
      },
    });

    const next = computePeriodEnd();
    const currentStatus = String((subscription as any).status || '');
    if (currentStatus !== 'TRIAL') {
      subscription = await prisma.subscription.update({
        where: { id: String(subscription.id) },
        data: { 
          ...(currentStatus !== 'ACTIVE' ? { status: 'UPGRADE_PENDING' as any } : {}),
          next_billing_date: next 
        },
        include: { Plan: true, Tenant: { select: { id: true, name: true, domain: true } } },
      });
    } else {
      subscription = await prisma.subscription.findUnique({
        where: { id: String(subscription.id) },
        include: { Plan: true, Tenant: { select: { id: true, name: true, domain: true } } },
      });
    }
  }

  const billingDate = normalizeToStartOfDay(now);
  
  // FIX: Check for ANY billing collision on this date, not just for the same plan.
  // This handles Scenario 2 (Unique Constraint) and Scenario 3 (Reuse Cancelled Invoice)
  const collisionBilling = await prisma.billing.findFirst({
    where: {
      subscription_id: String(subscription.id),
      billing_date: billingDate,
    },
    include: { Invoice: { select: { id: true, status: true } } },
  });

  if (collisionBilling) {
    // Case A: The existing billing is for the SAME plan
    if (collisionBilling.upgrade_plan_id_snapshot === String(planId)) {
      // If Invoice is CANCELLED, we must NOT reuse it. We must supersede it.
      if (collisionBilling.Invoice?.status === 'CANCELLED') {
         // Shift the old billing date so we can create a new one
         await prisma.billing.update({
           where: { id: collisionBilling.id },
           data: { billing_date: new Date() } // Shift to now() with time
         });
         // Proceed to create new billing below...
      } else {
         // Invoice is active (DRAFT/SENT/VIEWED), reuse it.
         const finalInvoiceId = collisionBilling.Invoice?.id || null;
         if (finalInvoiceId) {
            try {
              await emitDomainEvent({
                event_type: 'billing.invoice.requested',
                tenant_id: String((subscription as any).tenant_id || '') || null,
                source_service: 'billing',
                payload: {
                  tenant_id: String((subscription as any).tenant_id || '') || null,
                  subscription_id: String((subscription as any).id || ''),
                  billing_id: String(collisionBilling.id),
                  invoice_id: String(finalInvoiceId),
                  timestamp: new Date().toISOString(),
                  send: true,
                  send_as_role: roleName || null,
                  send_as_tenant_id: tenantId || null,
                  correlation_id: correlationId || null,
                },
              });
            } catch {}
         }
         return {
           subscription,
           checkout: { billing_id: collisionBilling.id, invoice_id: finalInvoiceId },
           reused: true,
         };
      }
    } else {
      // Case B: The existing billing is for a DIFFERENT plan
      // We must supersede it because of Unique Constraint [subscription_id, billing_date]
      
      // If the old one is Active, we should probably cancel it first to be clean
      if (collisionBilling.Invoice && ['DRAFT', 'SENT', 'VIEWED'].includes(String(collisionBilling.Invoice.status))) {
         await prisma.invoice.update({
           where: { id: collisionBilling.Invoice.id },
           data: { status: 'CANCELLED' as any }
         });
      }
      
      // Shift the old billing date
      await prisma.billing.update({
        where: { id: collisionBilling.id },
        data: { billing_date: new Date() } // Shift to now()
      });
      // Proceed to create new billing below...
    }
  }

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + DUE_DAYS);
  const amount = plan.billing_period === 'YEAR' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly;
  const billing = await billingService.createBilling({
    subscription_id: String(subscription.id),
    amount: Number(amount),
    billing_date: billingDate,
    due_date: dueDate,
    charge_type: 'UPGRADE' as any,
    upgrade_plan_id_snapshot: String(planId),
    upgrade_price_snapshot: Number(amount),
    plan_change_request_id: planChange ? String(planChange.id) : undefined,
    correlation_id: correlationId || undefined,
  });

  await emitDomainEvent({
    event_type: 'billing.invoice.requested',
    tenant_id: String((subscription as any).tenant_id || '') || null,
    source_service: 'billing',
    payload: {
      tenant_id: String((subscription as any).tenant_id || '') || null,
      subscription_id: String((subscription as any).id || ''),
      billing_id: String(billing.id),
      timestamp: new Date().toISOString(),
      invoice_data: { due_date: dueDate.toISOString() },
      send: true,
      send_as_role: roleName || null,
      send_as_tenant_id: tenantId || null,
      correlation_id: correlationId || null,
    },
  });
  const createdInvoiceId = await waitForInvoiceIdByBillingId(String(billing.id), 1500);

  await prisma.activityLog.create({
    data: {
      tenant_id: String(subscription.tenant_id),
      user_id: user?.id ? String(user.id) : null,
      action: 'UPGRADE_CLICKED',
      entity: 'SUBSCRIPTION',
      entity_id: String(subscription.id),
      metadata: JSON.stringify({
        subscription_id: String(subscription.id),
        from_plan_id: planChange ? String(planChange.from_plan_id) : null,
        to_plan_id: String(planId),
        billing_id: String(billing.id),
        invoice_id: createdInvoiceId,
        plan_change_request_id: planChange ? String(planChange.id) : null,
        correlation_id: correlationId || null,
      }),
    },
  });

  return {
    subscription,
    checkout: { billing_id: String(billing.id), invoice_id: createdInvoiceId },
    reused: false,
  };
}

export const subscriptionController = {
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

  async upgradeWizard(request: any, reply: any) {
    try {
      const user = request.user!;
      const { action, plan_id, subscription_id } = request.body || {};

      const normalizedAction = String(action || 'START').toUpperCase();
      const sub = await resolveSubscriptionForUpgrade(user, subscription_id);

      if (normalizedAction === 'START') {
        const plans = await listPublicPlans();
        let checkout: any = null;
        if (sub?.id) {
          const latestBilling = await prisma.billing.findFirst({
            where: { subscription_id: String(sub.id) },
            orderBy: { created_at: 'desc' },
            include: { Invoice: { select: { id: true, status: true, due_date: true, paid_at: true } } },
          });
          if (latestBilling?.Invoice && String(latestBilling.Invoice.status) !== 'PAID') {
            checkout = { billing_id: String(latestBilling.id), invoice_id: String(latestBilling.Invoice.id) };
          }
        }
        reply.status(200);
        return {
          success: true,
          message: 'Upgrade wizard state',
          data: {
            subscription: sub || null,
            plans,
            checkout,
          },
          wizard: {
            step: 'CHOOSE_PLAN',
            instruction: 'Pilih plan, lalu kirim { action: "SELECT_PLAN", plan_id } ke endpoint yang sama.',
            next_action: { action: 'SELECT_PLAN' },
          },
        };
      }

      if (normalizedAction === 'SELECT_PLAN') {
        if (!plan_id) throw toHttpError(400, 'plan_id is required');

        const result = await buildUpgradeCheckout(
          user,
          String(plan_id),
          sub?.id ? String(sub.id) : subscription_id,
          request.correlationId
        );

        reply.status(200);
        return {
          success: true,
          message: result.reused ? 'Checkout already exists for today' : 'Checkout created',
          data: {
            subscription: result.subscription,
            checkout: result.checkout,
          },
          wizard: {
            step: 'PAY',
            instruction: 'Gunakan billing_id untuk membuat pembayaran via /api/payments/create.',
            next_action: { action: 'START' },
          },
        };
      }

      throw toHttpError(400, 'Invalid action');
    } catch (error: any) {
      const statusCode = Number(error?.statusCode) || 500;
      reply.status(statusCode);
      return { success: false, message: error?.message || 'Upgrade wizard failed' };
    }
  },

  async choosePlan(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const { plan_id } = request.body || {};

      if (!id || !plan_id) {
        reply.status(400);
        return { success: false, message: 'Subscription ID and plan_id are required' };
      }

      const result = await buildUpgradeCheckout(user, String(plan_id), String(id), request.correlationId);
      reply.status(200);
      return {
        success: true,
        message: result.reused ? 'Billing already exists for today. No duplicate created.' : 'Plan chosen and invoice created',
        data: { ...(result.subscription as any), checkout: result.checkout },
      };
    } catch (error) {
      const statusCode = Number((error as any)?.statusCode) || 500;
      const msg = error instanceof Error ? error.message : 'Failed to choose plan';
      reply.status(statusCode);
      return { success: false, message: msg };
    }
  },

  async orderPlan(request: any, reply: any) {
    try {
      const user = request.user!;
      const { plan_id, billing_period } = request.body || {};

      if (!plan_id) {
        reply.status(400);
        return { success: false, message: 'plan_id is required' };
      }

      // Determine which plan variant to use based on billing_period
      let targetPlanId = plan_id;
      if (billing_period) {
        // Find plan by original name + billing period suffix
        const originalPlan = await prisma.plan.findUnique({ where: { id: plan_id } });
        if (!originalPlan) {
          // Try to find the variant using name-based lookup
          const baseName = String(plan_id).replace(/-MONTHLY|-YEARLY$/, ''); // Remove suffix if exists
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
          // If plan was provided, try to find its variant with the selected billing_period
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

      const result = await buildUpgradeCheckout(user, String(targetPlanId), undefined, request.correlationId);

      // Eagerly generate public link token for the created/reused invoice
      let publicToken: string | undefined;
      let publicUrl: string | undefined;
      try {
        const invoiceId = String((result as any)?.checkout?.invoice_id || '');
        const tenantId = String(user?.tenant_id || '');
        if (invoiceId && tenantId) {
          const existingToken = await cacheService.get(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId));
          let token = typeof existingToken === 'string' ? existingToken : '';
          if (!token) {
            token = require('crypto').randomBytes(32).toString('hex');
            const expirySeconds = 24 * 60 * 60;
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token), { invoice_id: invoiceId, tenant_id: tenantId, expiry: Date.now() + (expirySeconds * 1000) }, expirySeconds),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId), token, expirySeconds),
            ]);
          }
          const appBaseUrl = resolveBaseUrlFromRequest(request);
          publicToken = token;
          publicUrl = `${String(appBaseUrl).replace(/\/+$/, '')}/payment/public/${token}`;
          try {
            const expirySeconds = (() => {
              const envTtl = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
              return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (7 * 24 * 60 * 60);
            })();
            const { persistPublicInvoiceToken } = await import('../../../utils/publicInvoiceToken');
            await persistPublicInvoiceToken(String(invoiceId), tenantId, token, expirySeconds);
          } catch {}
        }
      } catch {}

      reply.status(200);
      return {
        success: true,
        message: 'Order berhasil dibuat',
        data: { 
          ...(result.subscription as any), 
          checkout: { 
            ...result.checkout, 
            public_token: publicToken, 
            public_url: publicUrl 
          } 
        },
      };
    } catch (error) {
      // Graceful fallback: try to recover existing upgrade invoice instead of erroring
      try {
        const user = request.user!;
        const tenantId = String(user?.tenant_id);
        const pendingSub = await prisma.subscription.findFirst({
          where: {
            tenant_id: tenantId,
            status: { in: ['UPGRADE_PENDING', 'PENDING_PAYMENT'] as any },
            Billing: {
              some: {
                charge_type: 'UPGRADE' as any,
                Invoice: {
                  status: { in: ['DRAFT', 'SENT', 'VIEWED'] as any },
                },
              },
            },
          },
          include: {
            Billing: {
              where: {
                charge_type: 'UPGRADE' as any,
                Invoice: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] as any } },
              },
              include: { Invoice: true },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        });
        const invId = pendingSub?.Billing?.[0]?.Invoice?.id || null;
        if (invId) {
          // Attempt to generate/resolve public token as well for smoother redirect
          let publicToken: string | undefined;
          let publicUrl: string | undefined;
          try {
            const existingToken = await cacheService.get(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(invId)));
            let token = typeof existingToken === 'string' ? existingToken : '';
            if (!token) {
              token = require('crypto').randomBytes(32).toString('hex');
              const expirySeconds = 24 * 60 * 60;
              await Promise.all([
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token), { invoice_id: String(invId), tenant_id: tenantId, expiry: Date.now() + (expirySeconds * 1000) }, expirySeconds),
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(invId)), token, expirySeconds),
              ]);
            }
            const baseUrl = resolveBaseUrlFromRequest(request);
            publicToken = token;
            publicUrl = `${String(baseUrl).replace(/\/+$/, '')}/payment/public/${token}`;
            try {
              const expirySeconds = (() => {
                const envTtl = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
                return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (7 * 24 * 60 * 60);
              })();
              const { persistPublicInvoiceToken } = await import('../../../utils/publicInvoiceToken');
              await persistPublicInvoiceToken(String(invId), tenantId, token, expirySeconds);
            } catch {}
          } catch {}
          reply.status(200);
          return {
            success: true,
            message: 'Checkout already exists for today',
            data: {
              subscription: pendingSub,
              checkout: { 
                billing_id: String(pendingSub?.Billing?.[0]?.id || ''), 
                invoice_id: String(invId),
                public_token: publicToken,
                public_url: publicUrl
              },
            },
            wizard: {
              step: 'PAY',
              instruction: 'Gunakan billing_id untuk membuat pembayaran via /api/payments/create.',
              next_action: { action: 'START' },
            },
          };
        }
      } catch {}
      const statusCode = Number((error as any)?.statusCode) || 500;
      const msg = error instanceof Error ? error.message : 'Failed to order plan';
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
};
