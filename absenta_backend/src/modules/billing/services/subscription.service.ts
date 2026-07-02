import { subscriptionDb as prisma } from './repositories/subscription.db';
import { getSmartFrontendBaseUrl } from '@/utils/url-helper';
import { SubscriptionStatus, ObservabilityMetricType } from '@prisma/client';
import { observabilityAggregationService } from '../../observability/services/observabilityAggregation.service';
import type { CreateSubscriptionInput, SubscriptionResponse, UpdateSubscriptionInput } from './subscription.types';
import { applyDuePlanChangesCommand } from './commands/apply-due-plan-changes.command';
import { schedulePlanChangeCommand } from './commands/schedule-plan-change.command';
import { getSubscriptionAnalyticsQuery } from './queries/subscription-analytics.query';
import { getInvoicesByTenantQuery, getMySubscriptionOverviewQuery, getPaymentsByTenantQuery } from './queries/subscription-overview.query';
import { checkTenantLimitQuery } from './queries/tenant-limit.query';
import { cacheService } from '@/utils/cache.service';
import { sidebarRenderingService } from '@/modules/menu/services/sidebar-rendering.service';
export type { CreateSubscriptionInput, SubscriptionResponse, UpdateSubscriptionInput } from './subscription.types';

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

export const subscriptionService = {
  async schedulePlanChange(subscriptionId: string, toPlanId: string, reason?: string) {
    return schedulePlanChangeCommand(subscriptionId, toPlanId, reason);
  },

  async applyDuePlanChanges(): Promise<number> {
    return await applyDuePlanChangesCommand();
  },
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

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResponse> {
    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenant_id }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }
    // Ensure tenant is active
    if ((tenant as any).status && (tenant as any).status !== 'ACTIVE') {
      throw new Error('Tenant is not active');
    }

    // Validate plan exists and is active
    const plan = await prisma.plan.findUnique({
      where: { id: input.plan_id }
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    if (!plan.is_active) {
      throw new Error('Plan is not active');
    }

    // Capture plan snapshot for this subscription
    const planSnapshot = {
        id: plan.id,
        code: (plan as any).code,
        service_code: (plan as any).service_code,
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_user: plan.max_user,
        features_json: plan.features_json,
        absensi_mode: plan.absensi_mode
    };

    // Ensure tenant mode matches plan mode
    await prisma.tenant.update({
      where: { id: input.tenant_id },
      data: { absensi_mode: plan.absensi_mode }
    });

    // Prevent overlapping ACTIVE/TRIAL subscriptions for the same modules
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        tenant_id: input.tenant_id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        AND: [
          { start_date: { lte: input.end_date } },
          { end_date: { gte: input.start_date } }
        ]
      },
      include: { Plan: true }
    });

    const newPlanModules = Array.isArray(plan.features_json) ? (plan.features_json as string[]) : [];

    for (const activeSub of activeSubscriptions) {
      const activePlan = activeSub.Plan;
      const activeModules = Array.isArray(activePlan.features_json) ? (activePlan.features_json as string[]) : [];

      // Intersection check
      const hasConflict = newPlanModules.some(mod => activeModules.includes(mod));
      if (hasConflict) {
        throw new Error('Module already subscribed in an active subscription');
      }
    }

    // Validate dates
    if (input.start_date >= input.end_date) {
      throw new Error('End date must be after start date');
    }

  const subscription = await prisma.subscription.create({
      data: {
        tenant_id: input.tenant_id,
        plan_id: input.plan_id,
        service_code: (plan as any).service_code,
        start_date: input.start_date,
        end_date: input.end_date,
        auto_renew: input.auto_renew ?? true,
        next_billing_date: input.next_billing_date ?? null,
        status: input.status ?? SubscriptionStatus.ACTIVE,
        payment_method: 'MANUAL', // Admin created
        plan_snapshot: planSnapshot as any, // Store snapshot
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
      }
    });

    // Audit trail: initial activation
    try {
      await prisma.subscriptionHistory.create({
        data: {
          subscription_id: subscription.id,
          old_plan_id: null,
          new_plan_id: subscription.plan_id,
          changed_by: null,
          reason: 'INITIAL_ACTIVATION'
        }
      });
    } catch (e) {
      console.warn('Failed to write initial SubscriptionHistory:', e);
    }

    await cacheService.delete(`tenant:features:${String(input.tenant_id)}`);
    await sidebarRenderingService.invalidateAll();

    // Transform data untuk konsistensi dengan frontend
    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async updateSubscription(id: string, input: UpdateSubscriptionInput, changedBy?: string): Promise<SubscriptionResponse> {
    if (input.end_date !== undefined || input.next_billing_date !== undefined) {
      throw new Error('Forbidden: end_date/next_billing_date can only be updated via invoice payment');
    }

    if (input.plan_id !== undefined || input.status !== undefined) {
      throw new Error('Forbidden: plan_id/status can only be updated via invoice payment');
    }

    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    const data: any = {};

    if (input.auto_renew !== undefined) {
      data.auto_renew = input.auto_renew;
    }

    if (input.start_date !== undefined) {
      data.start_date = input.start_date;
    }

    if ((input as any).notes !== undefined) {
      (data as any).notes = (input as any).notes;
    }

    if (Object.keys(data).length === 0) {
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

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const { Plan, Tenant, ...subscriptionData } = subscription;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data,
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

    try {
      await prisma.activityLog.create({
        data: {
          tenant_id: subscription.tenant_id,
          user_id: changedBy || null,
          action: 'SUBSCRIPTION_METADATA_UPDATE',
          entity: 'SUBSCRIPTION',
          entity_id: subscription.id,
          metadata: JSON.stringify({
            changed_fields: Object.keys(data)
          })
        }
      });
    } catch (e) {
      console.warn('Failed to write subscription metadata update to ActivityLog:', e);
    }

    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async cancelSubscription(id: string, changedBy?: string): Promise<SubscriptionResponse> {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    if (existingSubscription.status === SubscriptionStatus.CANCELLED) {
      throw new Error('Subscription is already cancelled');
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        cancel_date: new Date(),
        auto_renew: false
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
      }
    });

    await cacheService.delete(`tenant:features:${String(subscription.tenant_id)}`);
    await sidebarRenderingService.invalidateAll();

    // Notification: cancellation notice
    try {
      const admin = await prisma.user.findFirst({ where: { tenant_id: subscription.tenant_id, Role: { name: 'ADMIN' } }, select: { email: true } });
      if (admin?.email) {
        const { EmailService } = await import('../../notification/services/email.service');
        const emailSvc = new EmailService();
        await emailSvc.sendBillingReminder(admin.email, {
          billingDescription: `Pembatalan langganan - ${subscription.Plan?.name || 'Subscription'}`,
          amount: 0,
          currency: subscription.Plan?.currency || 'IDR',
          dueDate: subscription.end_date || new Date(),
          daysUntilDue: 0,
          paymentUrl: `${getSmartFrontendBaseUrl()}/billing/subscriptions`
        } as any);
      }
    } catch {}

    // Audit trail: status change ACTIVE -> CANCELLED (Pending)
    try {
      await prisma.subscriptionHistory.create({
        data: {
          subscription_id: subscription.id,
          old_plan_id: existingSubscription.plan_id,
          new_plan_id: subscription.plan_id,
          changed_by: changedBy || null,
          reason: 'AUTO_RENEW_OFF'
        }
      });
    } catch (e) {
      console.warn('Failed to write cancellation status change to SubscriptionHistory:', e);
    }

    // Transform data untuk konsistensi dengan frontend
    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async resumeSubscription(id: string, changedBy?: string): Promise<SubscriptionResponse> {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    if (existingSubscription.status === SubscriptionStatus.CANCELLED) {
      throw new Error('Forbidden: cannot resume cancelled subscription');
    }

    if (existingSubscription.status === SubscriptionStatus.ACTIVE) {
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
      const { Plan, Tenant, ...subscriptionData } = subscription as any;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    }

    let shouldActivate = false;
    if (
      existingSubscription.status === SubscriptionStatus.SUSPENDED ||
      existingSubscription.status === SubscriptionStatus.EXPIRED ||
      existingSubscription.status === (SubscriptionStatus as any).PENDING_PAYMENT
    ) {
      shouldActivate = true;
    }

    if (!shouldActivate) {
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
      const { Plan, Tenant, ...subscriptionData } = subscription as any;
      return {
        ...subscriptionData,
        plan: Plan,
        tenant: mapTenant(Tenant)
      };
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        cancel_date: null,
        auto_renew: true
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
      }
    });

    // Audit trail
    try {
      await prisma.subscriptionHistory.create({
        data: {
          subscription_id: subscription.id,
          old_plan_id: existingSubscription.plan_id,
          new_plan_id: subscription.plan_id,
          changed_by: changedBy || null,
          reason: 'AUTO_RENEW_ON'
        }
      });
    } catch (e) {
      console.warn('Failed to write resume history:', e);
    }

    // Transform data
    const { Plan, Tenant, ...subscriptionData } = subscription;
    return {
      ...subscriptionData,
      plan: Plan,
      tenant: mapTenant(Tenant)
    };
  },

  async renewSubscription(id: string, newEndDate: Date): Promise<SubscriptionResponse> {
    void id;
    void newEndDate;
    throw new Error('Forbidden: renewSubscription is disabled; use invoice payment to extend');
  },

  async checkExpiredSubscriptions(): Promise<SubscriptionResponse[]> {
    const now = new Date();
    
    // GAP 4: Fetch both ACTIVE and TRIAL that are past end_date
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        end_date: {
          lt: now
        },
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
        }
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
         },
       }
    });

    // Update expired subscriptions
    if (expiredSubscriptions.length > 0) {
      // Group by expiration reason logic
      const idsToCancel = expiredSubscriptions.filter(s => !!(s as any).cancel_date).map(s => s.id);
      
      const idsPendingPayment: string[] = [];
      const idsTrialExpire: string[] = [];
      const idsActiveExpire: string[] = [];

      for (const sub of expiredSubscriptions) {
        // If cancelled manually, it goes to CANCELLED regardless of invoices
        if ((sub as any).cancel_date) continue; 

        // GAP 3: If has unpaid invoice -> PENDING_PAYMENT (not EXPIRED)
        const hasUnpaidInvoice = false;
        
        if (hasUnpaidInvoice) {
          idsPendingPayment.push(sub.id);
        } else if (sub.status === SubscriptionStatus.TRIAL) {
          idsTrialExpire.push(sub.id);
        } else {
          idsActiveExpire.push(sub.id);
        }
      }

      // 1. Handle Cancelled (User manually cancelled auto-renew) -> Reason: MANUAL
      if (idsToCancel.length > 0) {
        await prisma.subscription.updateMany({
          where: { id: { in: idsToCancel } },
          data: { 
            status: SubscriptionStatus.CANCELLED,
            expired_reason: 'MANUAL' 
          }
        });
      }

      // 2. Handle Pending Payment -> Status: PENDING_PAYMENT (Access continues)
      if (idsPendingPayment.length > 0) {
        await prisma.subscription.updateMany({
          where: { id: { in: idsPendingPayment } },
          data: { 
            status: SubscriptionStatus.PENDING_PAYMENT,
            // expired_reason is null because it's not expired yet
          }
        });
      }

      // 3. Handle Trial Expiry -> Reason: TRIAL_END
      if (idsTrialExpire.length > 0) {
        await prisma.subscription.updateMany({
          where: { id: { in: idsTrialExpire } },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            expired_reason: 'TRIAL_END' 
          }
        });
        {
          const targetIds = new Set(idsTrialExpire);
          const counts = new Map<string, number>();
          for (const s of expiredSubscriptions) {
            if (!targetIds.has(s.id)) continue;
            const tid = String((s as any).tenant_id || '');
            if (!tid) continue;
            counts.set(tid, (counts.get(tid) || 0) + 1);
          }
          for (const [tenantId, count] of counts.entries()) {
            void observabilityAggregationService.incrementMetric(ObservabilityMetricType.SUBSCRIPTION_EXPIRED, tenantId, count);
          }
        }
        for (const subId of idsTrialExpire) {
          const sub = expiredSubscriptions.find(s => s.id === subId) as any;
          await prisma.activityLog.create({
            data: {
              tenant_id: sub?.tenant_id,
              user_id: 'system',
              action: 'SUBSCRIPTION_EXPIRED',
              entity: 'SUBSCRIPTION',
              entity_id: subId,
              metadata: JSON.stringify({ reason: 'TRIAL_END' })
            }
          });
        }
      }

      // 4. Handle Active Expiry (Auto-renew failed or off, no invoice) -> Reason: NON_PAYMENT
      if (idsActiveExpire.length > 0) {
        await prisma.subscription.updateMany({
          where: { id: { in: idsActiveExpire } },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            expired_reason: 'NON_PAYMENT' 
          }
        });
        {
          const targetIds = new Set(idsActiveExpire);
          const counts = new Map<string, number>();
          for (const s of expiredSubscriptions) {
            if (!targetIds.has(s.id)) continue;
            const tid = String((s as any).tenant_id || '');
            if (!tid) continue;
            counts.set(tid, (counts.get(tid) || 0) + 1);
          }
          for (const [tenantId, count] of counts.entries()) {
            void observabilityAggregationService.incrementMetric(ObservabilityMetricType.SUBSCRIPTION_EXPIRED, tenantId, count);
          }
        }
        for (const subId of idsActiveExpire) {
          const sub = expiredSubscriptions.find(s => s.id === subId) as any;
          await prisma.activityLog.create({
            data: {
              tenant_id: sub?.tenant_id,
              user_id: 'system',
              action: 'SUBSCRIPTION_EXPIRED',
              entity: 'SUBSCRIPTION',
              entity_id: subId,
              metadata: JSON.stringify({ reason: 'NON_PAYMENT' })
            }
          });
        }
      }

      // Write STATUS_CHANGE history entries for each expired subscription (system-triggered)
      try {
        for (const sub of expiredSubscriptions) {
          await prisma.subscriptionHistory.create({
            data: {
              subscription_id: sub.id,
              old_plan_id: sub.plan_id,
              new_plan_id: sub.plan_id,
              changed_by: 'SYSTEM',
              reason: 'STATUS_CHANGE'
            }
          });
        }
      } catch (e) {
        console.warn('Failed to write expired status changes to SubscriptionHistory:', e);
      }

      // Fetch updated subscriptions
      const updatedSubscriptions = await prisma.subscription.findMany({
        where: {
          id: {
            in: expiredSubscriptions.map(sub => sub.id)
          }
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
        }
      });

      // Transform data untuk konsistensi dengan frontend
      return updatedSubscriptions.map(subscription => {
        const { Plan, Tenant, ...subscriptionData } = subscription;
        return {
          ...subscriptionData,
          plan: Plan,
          tenant: mapTenant(Tenant)
        };
      });
    }

    return [];
  },

  async deleteSubscription(id: string): Promise<{ deleted: boolean; id: string }> {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Subscription not found');
    }
    if (existing.status !== SubscriptionStatus.CANCELLED && existing.status !== SubscriptionStatus.EXPIRED) {
      throw new Error('Only canceled or expired subscriptions can be deleted');
    }

    await prisma.subscriptionHistory.deleteMany({ where: { subscription_id: id } });
    await prisma.subscription.delete({ where: { id } });
    return { deleted: true, id };
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
