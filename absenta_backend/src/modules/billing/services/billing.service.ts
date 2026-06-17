import { billingDb as prisma } from './repositories/billing.db';
import { InvoiceStatus, PaymentStatus, BillingStatus } from '@prisma/client';
import { DataScope } from '../../../types/fastify';
import { observabilityService } from '../../observability/services/observability.service';
import type { BillingResponse, BillingStats, CreateBillingInput, UpdateBillingInput } from './billing.types';
import { createBillingCommand } from './commands/create-billing.command';
import {
  getBillingDashboardNotificationsQuery,
  getBillingDashboardRecentActivitiesQuery,
  getBillingHealthSummaryQuery,
  getFinancialDashboardRawMetricsQuery,
  getRevenueChartDataQuery,
} from './queries/billing-dashboard.query';
import { tenantEntitlementService } from './tenant-entitlement.service';

export type { BillingResponse, BillingStats, CreateBillingInput, UpdateBillingInput } from './billing.types';

class BusinessIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessIntegrityError';
  }
}

export const billingService = {
  async extendSubscription(invoiceId: string, tx?: any): Promise<void> {
    const db = tx ?? prisma;

    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const isValidDate = (d: any) => d instanceof Date && Number.isFinite(d.getTime());

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        Billing: {
          include: {
            Subscription: { include: { Plan: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const sub = invoice.Billing?.Subscription as any;
    if (!sub) {
      throw new Error('Subscription not found for this invoice');
    }

    if (sub.last_applied_invoice_id === invoice.id) {
      return;
    }

    const now = new Date();
    
    // FIX: Fetch target plan EARLY to use correct billing_period for period calculation
    // This ensures subscription extension uses TARGET plan's period, not current plan's period
    const targetPlanChange = await db.planChangeRequest.findFirst({
      where: {
        subscription_id: sub.id,
        status: 'SCHEDULED' as any,
        effective_date: { lte: now },
      },
      orderBy: { effective_date: 'asc' },
    });
    
    const targetPlanId = targetPlanChange?.to_plan_id || sub.plan_id;
    const targetPlan = await db.plan.findUnique({
      where: { id: targetPlanId },
      select: { id: true, name: true, billing_period: true, price_monthly: true, price_yearly: true, features_json: true, service_code: true }
    });

    // MULTI-SERVICE SAFETY GUARD: Prevent cross-service overwrites
    // If targetPlan has a different service_code than the subscription,
    // this is a critical data integrity issue — log and abort.
    if (targetPlan && (targetPlan as any).service_code && sub.service_code && 
        (targetPlan as any).service_code !== sub.service_code) {
      console.error(
        `[CRITICAL] extendSubscription: service_code mismatch! ` +
        `sub.service_code=${sub.service_code}, targetPlan.service_code=${(targetPlan as any).service_code}. ` +
        `This would overwrite the subscription with a different service. Aborting.`
      );
      return; // Abort — do NOT overwrite subscription with a different service
    }
    
    const computePeriodEnd = (base: Date) => {
      const next = new Date(base);
      const billingPeriod = targetPlan?.billing_period || (sub.Plan?.billing_period || 'MONTH');
      if (billingPeriod === 'YEAR') next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
      return next;
    };

    let periodStart = invoice.period_start ? new Date(invoice.period_start as any) : null;
    let periodEnd = invoice.period_end ? new Date(invoice.period_end as any) : null;

    const missingOrInvalidPeriod =
      !periodStart ||
      !periodEnd ||
      !isValidDate(periodStart) ||
      !isValidDate(periodEnd) ||
      periodEnd.getTime() <= periodStart.getTime();

    if (missingOrInvalidPeriod) {
      if (isProd) {
        throw new Error('Invalid invoice period: period_start and period_end are required');
      }
      const currentEnd = new Date(sub.end_date as any);
      const status = String(sub.status || '');
      const isFirstPaidPeriod = !sub.last_applied_invoice_id && status === 'PENDING_PAYMENT';
      
      // FIX: For UPGRADE charges, always start from TODAY, not from currentEnd
      const billing = await db.billing.findFirst({ where: { invoice_id: invoice.id } });
      const chargeType = String(billing?.charge_type || '');
      
      let computedStart: Date;
      if (chargeType === 'UPGRADE') {
        // Upgrade always starts from today
        computedStart = now;
      } else {
        // Renewal follows original logic
        computedStart = isFirstPaidPeriod ? now : (currentEnd.getTime() > now.getTime() ? currentEnd : now);
      }
      
      const computedEnd = computePeriodEnd(computedStart);
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          period_start: computedStart,
          period_end: computedEnd,
        },
      });
      periodStart = computedStart;
      periodEnd = computedEnd;
    }

    if (!periodStart || !periodEnd) {
      throw new Error('Invalid invoice period: period_start and period_end are required');
    }

    if (periodEnd.getTime() < now.getTime()) {
      const adjustedStart = now;
      const adjustedEnd = computePeriodEnd(adjustedStart);
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          period_start: adjustedStart,
          period_end: adjustedEnd,
        },
      });
      periodStart = adjustedStart;
      periodEnd = adjustedEnd;
    }

    if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) || periodEnd.getTime() <= periodStart.getTime()) {
      throw new Error('Invalid invoice period: period_end must be after period_start');
    }

    // planChange already fetched above for billing_period determination
    const planChange = targetPlanChange;

    if (planChange) {
      const expectedPrice = Number(planChange.price_snapshot || 0);
      const actualPrice = Number((invoice as any).total_amount || 0);

      if (!Number.isFinite(actualPrice) || !Number.isFinite(expectedPrice) || actualPrice !== expectedPrice) {
        const payload = {
          tenant_id: String(sub.tenant_id),
          subscription_id: String(sub.id),
          invoice_id: String(invoice.id),
          billing_id: String(invoice.billing_id),
          plan_change_id: String(planChange.id),
          expected_price: expectedPrice,
          actual_price: actualPrice,
        };

        await db.activityLog.create({
          data: {
            tenant_id: payload.tenant_id,
            action: 'REVENUE_INTEGRITY_MISMATCH',
            entity: 'SUBSCRIPTION',
            entity_id: payload.subscription_id,
            metadata: JSON.stringify(payload),
          },
        });

        const err = new BusinessIntegrityError('Invoice amount mismatch with plan snapshot');

        try {
          console.error('REVENUE_MISMATCH', {
            ...payload,
            timestamp: new Date().toISOString(),
          });

          if (isProd) {
            const req = eval('require') as any;
            const mod: any = req('@sentry/node');
            const sentry = mod?.default ?? mod;
            if (sentry && typeof sentry.captureException === 'function') {
              sentry.captureException(err, {
                tags: {
                  event: 'REVENUE_MISMATCH',
                  tenant_id: payload.tenant_id,
                  subscription_id: payload.subscription_id,
                  invoice_id: payload.invoice_id,
                  plan_change_id: payload.plan_change_id,
                },
                extra: {
                  ...payload,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }
        } catch {}

        throw err;
      }
    }

    const snapshotPrice = (() => {
      const bp = targetPlan?.billing_period || (sub.Plan?.billing_period || 'MONTH');
      if (bp === 'YEAR') return targetPlan?.price_yearly ?? null;
      return targetPlan?.price_monthly ?? null;
    })();

    const effectiveFeatures: string[] = Array.isArray(targetPlan?.features_json)
      ? (targetPlan!.features_json as string[]).map((s: any) => String(s).toUpperCase())
      : [];

    await db.subscription.update({
      where: { id: sub.id },
      data: {
        ...(planChange ? { plan_id: planChange.to_plan_id } : {}),
        ...(targetPlan ? { service_code: (targetPlan as any).service_code } : {}),
        status: 'ACTIVE' as any,
        end_date: periodEnd,
        next_billing_date: periodEnd,
        auto_renew: true,
        last_applied_invoice_id: invoice.id,
        plan_snapshot: targetPlan ? {
          id: targetPlan.id,
          code: (targetPlan as any).code,
          service_code: (targetPlan as any).service_code,
          name: targetPlan.name,
          price: snapshotPrice,
          billing_period: targetPlan.billing_period,
          features_json: effectiveFeatures
        } as any : undefined
      },
    });

    if (planChange) {
      await db.planChangeRequest.update({
        where: { id: planChange.id },
        data: { status: 'APPLIED' as any },
      });
    }

    observabilityService.logEvent({
      event_type: 'SUBSCRIPTION_AUTO_EXTENDED',
      domain: 'BILLING',
      severity: 'INFO',
      entity_type: 'SUBSCRIPTION',
      entity_id: String(sub.id),
      tenant_id: String(sub.tenant_id),
      correlation_id: null,
      metadata: {
        invoice_id: invoice.id,
        billing_id: invoice.billing_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      },
    });

    // Invalidate feature cache to ensure 'Smart Otorisasi' reflects new features immediately
    try {
      await tenantEntitlementService.invalidateTenantFeaturesCache(String(sub.tenant_id));
    } catch (cacheErr) {
      console.warn(`[Billing] Failed to invalidate cache for tenant ${sub.tenant_id}:`, cacheErr);
    }
  },

  async getAllBillings(scope: DataScope, status?: InvoiceStatus | 'UNPAID', search?: string, tenantId?: string): Promise<BillingResponse[]> {
    const whereClause: any = {};

    // Scope & Tenant Filter Logic
    if (scope.tenantId) {
      // If scoped to a tenant (Admin/User), enforce it
      whereClause.Subscription = {
        tenant_id: scope.tenantId
      };
      // If a specific tenantId was requested but doesn't match scope, return empty (or throw)
      // We'll just return empty to be safe/consistent with filtering
      if (tenantId && tenantId !== scope.tenantId) {
        return [];
      }
    } else if (tenantId) {
      // If global scope (Superadmin) and tenantId filter provided
      whereClause.Subscription = {
        tenant_id: tenantId
      };
    }

    // Search Logic (Invoice Number, Tenant Name, Tenant Domain)
    if (search) {
      whereClause.OR = [
        {
          Invoice: {
            invoice_number: { contains: search, mode: 'insensitive' }
          }
        },
        {
          Subscription: {
            Tenant: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        },
        {
          Subscription: {
            Tenant: {
              domain: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }
    
    // We'll filter by related Invoice status via a pre-query for reliability
    let billingIdFilter: string[] | undefined;
    if (status) {
      let statusWhere: any = {};

      if (status === 'UNPAID') {
         statusWhere = {
            status: { in: ['SENT', 'VIEWED'] }
         };
      } else if (status === 'OVERDUE') {
        // HANDLE OVERDUE: Catch both explicit OVERDUE and implicit OVERDUE (UNPAID + Late)
        statusWhere = {
          OR: [
            { status: 'OVERDUE' },
            { 
              status: { in: ['SENT', 'VIEWED'] }, 
              due_date: { lt: new Date() } 
            }
          ]
        };
      } else {
        statusWhere = { status };
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          ...statusWhere,
          ...(tenantId && {
            Billing: {
              Subscription: {
                tenant_id: tenantId
              }
            }
          })
        },
        select: { billing_id: true }
      });
      billingIdFilter = invoices.map(i => i.billing_id);
      
      // If filter is active but no matches, return empty immediately
      if (billingIdFilter.length === 0) {
        return [];
      }
      
      // Combine with existing whereClause (e.g. from Search)
      // Since whereClause.id might not exist yet, we set it.
      // If we had other ID filters, we'd need to intersect, but here it's the only ID filter.
      whereClause.id = { in: billingIdFilter };
    }

    const billings = await prisma.billing.findMany({
      where: whereClause,
      include: {
        Subscription: {
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              }
            },
            Plan: {
              select: {
                id: true,
                name: true,
                price_monthly: true,
                currency: true,
              }
            }
          }
        },
        Invoice: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // NORMALISASI STATUS: Ensure Output matches Source of Truth requirements
    // If Invoice is UNPAID (SENT/VIEWED) but overdue, we mark it as OVERDUE in the response.
    return billings.map(b => {
      if (b.Invoice) {
        const invStatus = String(b.Invoice.status);
        const due = b.Invoice.due_date ? new Date(b.Invoice.due_date) : null;
        const now = new Date();

        if (invStatus === 'PAID') {
          b.status = 'PAID' as any;
        } else if (invStatus === 'OVERDUE') {
          b.status = 'OVERDUE' as any;
        } else {
          if (due && ['SENT', 'VIEWED'].includes(invStatus) && due < now) {
            b.Invoice.status = 'OVERDUE' as InvoiceStatus;
            b.status = 'OVERDUE' as any;
          } else {
            b.status = 'UNPAID' as any;
          }
        }
      }
      return b;
    });
  },

  async getBillingById(scope: DataScope, id: string): Promise<BillingResponse | null> {
    const whereClause: any = { id };

    if (scope.tenantId) {
      whereClause.Subscription = {
        tenant_id: scope.tenantId
      };
    }

    return prisma.billing.findFirst({
      where: whereClause,
      include: {
        Subscription: {
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              }
            },
            Plan: {
              select: {
                id: true,
                name: true,
                price_monthly: true,
                currency: true,
              }
            }
          }
        },
        Invoice: true
      }
    });
  },

  async getBillingsBySubscription(scope: DataScope, subscriptionId: string): Promise<BillingResponse[]> {
    const whereClause: any = { subscription_id: subscriptionId };

    if (scope.tenantId) {
      whereClause.Subscription = {
        tenant_id: scope.tenantId
      };
    }

    return prisma.billing.findMany({
      where: whereClause,
      include: {
        Subscription: {
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              }
            },
            Plan: {
              select: {
                id: true,
                name: true,
                price_monthly: true,
                currency: true,
              }
            }
          }
        },
        Invoice: true
      },
      orderBy: {
        billing_date: 'desc'
      }
    });
  },

  async createBilling(input: CreateBillingInput): Promise<BillingResponse> {
    return await createBillingCommand(input);
  },

  async updateBilling(id: string, input: UpdateBillingInput): Promise<BillingResponse> {
    // Check if billing exists
    const existingBilling = await prisma.billing.findUnique({
      where: { id }
    });

    if (!existingBilling) {
      throw new Error('Billing record not found');
    }

    // Validate amount if provided
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const billing = await prisma.billing.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.billing_date !== undefined ? { billing_date: input.billing_date } : {}),
        ...(input.payment_method !== undefined ? { payment_method: input.payment_method } : {}),
        ...(input.payment_reference !== undefined ? { payment_reference: input.payment_reference } : {}),
        ...(input.charge_type !== undefined ? { charge_type: (input.charge_type as any) } : {}),
      },
      include: {
        Subscription: {
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              }
            },
            Plan: {
              select: {
                id: true,
                name: true,
                price_monthly: true,
                currency: true,
              }
            }
          }
        },
        Invoice: true
      }
    });

    return billing;
  },

  async markAsPaid(id: string, paymentMethod?: string, paymentReference?: string, confirmedBy?: string): Promise<BillingResponse> {
    // CRITICAL PATCH: Guard against unauthorized confirmation sources
    const isManual = String(confirmedBy || '').startsWith('manual-confirm');
    if (confirmedBy !== 'TRIPAY_WEBHOOK' && !isManual) {
      throw new Error('Invalid payment confirmation source. Only TRIPAY_WEBHOOK or manual-confirm is allowed.');
    }

    void paymentMethod;
    void paymentReference;

    const isInvoicePeriodGuard = (e: any) =>
      e instanceof Error && typeof e.message === 'string' && /Invalid invoice period/i.test(e.message);

    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

    let didLogPeriodGuard = false;

    const tryAlertInvoicePeriodGuard = async (payload: { tenant_id: string; invoice_id: string; billing_id: string }, err: any) => {
      if (didLogPeriodGuard) return;
      didLogPeriodGuard = true;

      console.error('INVOICE_PERIOD_GUARD_FAILED', {
        ...payload,
        timestamp: new Date().toISOString(),
        production_mode: isProd,
        error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
      });

      if (!isProd) return;

      try {
        const req = eval('require') as any;
        const mod: any = req('@sentry/node');
        const sentry = mod?.default ?? mod;
        if (sentry && typeof sentry.captureException === 'function') {
          sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
            tags: {
              event: 'INVOICE_PERIOD_GUARD_FAILED',
              tenant_id: payload.tenant_id,
              invoice_id: payload.invoice_id,
              billing_id: payload.billing_id,
            },
            extra: {
              ...payload,
              production_mode: isProd,
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch {}
    };

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingBilling = await tx.billing.findUnique({
          where: { id }
        });
        if (!existingBilling) {
          throw new Error('Billing record not found');
        }
        const invoice = await tx.invoice.findFirst({
          where: { billing_id: id }
        });
        if (!invoice) {
          throw new Error('Invoice not found for this billing');
        }
        // Resolve canonical Tripay payment (confirmed_by TRIPAY_WEBHOOK and SUCCESS)
        const successfulPayment = await tx.payment.findFirst({
          where: {
            billing_id: id,
            confirmed_by: 'TRIPAY_WEBHOOK',
            status: PaymentStatus.SUCCESS
          },
          orderBy: { paid_at: 'desc' }
        });
        if (successfulPayment && String(successfulPayment.gateway) !== 'TRIPAY') {
          throw new Error('Invalid payment source');
        }
        const canonicalMethod = successfulPayment ? String(successfulPayment.payment_method || '') : undefined;
        const canonicalReference = successfulPayment ? (successfulPayment.gateway_transaction_id || successfulPayment.id) : undefined;
        const pStart = invoice.period_start ? new Date(invoice.period_start as any) : null;
        const pEnd = invoice.period_end ? new Date(invoice.period_end as any) : null;
        const isValidDate = (d: any) => d instanceof Date && Number.isFinite(d.getTime());
        const invalidPeriod =
          !pStart ||
          !pEnd ||
          !isValidDate(pStart) ||
          !isValidDate(pEnd) ||
          pEnd.getTime() <= pStart.getTime();
        if (invalidPeriod) {
          if (isProd) {
            throw new Error('Invalid invoice period');
          }
          await this.extendSubscription(invoice.id, tx);
        }
        const invUpdate = await tx.invoice.updateMany({
          where: { id: invoice.id, status: { not: InvoiceStatus.PAID } },
          data: {
            status: InvoiceStatus.PAID,
            paid_at: new Date(),
            updated_at: new Date(),
            // Clear cached PDF to force regeneration
            pdf_path: null,
            pdf_storage_provider: null,
            pdf_storage_key: null,
            pdf_sha256: null,
            pdf_generated_at: null,
            pdf_size_bytes: null,
          }
        });
        if (invUpdate.count > 0) {
          observabilityService.logEvent({
            event_type: 'INVOICE_PAID',
            domain: 'INVOICE',
            severity: 'INFO',
            entity_type: 'INVOICE',
            entity_id: invoice.id,
            tenant_id: existingBilling.tenant_id,
            correlation_id: null,
            metadata: { billing_id: id },
          });
        }
        const billing = await tx.billing.update({
          where: { id },
          data: {
            status: BillingStatus.PAID,
            ...(canonicalMethod ? { payment_method: canonicalMethod } : {}),
            ...(canonicalReference ? { payment_reference: canonicalReference } : {}),
            updated_at: new Date()
          },
          include: {
            Subscription: {
              include: {
                Tenant: {
                  select: {
                    id: true,
                    name: true,
                    domain: true,
                  }
                },
                Plan: {
                  select: {
                    id: true,
                    name: true,
                    price_monthly: true,
                    currency: true,
                    billing_period: true,
                  }
                }
              }
            },
            Invoice: true
          }
        });
        try {
          await this.extendSubscription(invoice.id, tx);
        } catch (e: any) {
          if (isInvoicePeriodGuard(e)) {
            await tryAlertInvoicePeriodGuard(
              { tenant_id: existingBilling.tenant_id, invoice_id: invoice.id, billing_id: id },
              e
            );
          }
          throw e;
        }
        return billing;
      });
      return result;
    } catch (e: any) {
      if (isInvoicePeriodGuard(e)) {
        try {
          const inv = await prisma.invoice.findFirst({
            where: { billing_id: id },
            select: { id: true, tenant_id: true }
          });
          const tenant_id = inv?.tenant_id || (await prisma.billing.findUnique({ where: { id }, select: { tenant_id: true } }))?.tenant_id;
          const invoice_id = inv?.id;
          if (tenant_id && invoice_id) {
            await tryAlertInvoicePeriodGuard({ tenant_id, invoice_id, billing_id: id }, e);
            try {
              await prisma.activityLog.create({
                data: {
                  tenant_id,
                  action: 'INVOICE_PERIOD_GUARD_FAILED',
                  entity: 'INVOICE',
                  entity_id: invoice_id,
                  metadata: JSON.stringify({
                    billing_id: id,
                      error: e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : String(e),
                      production_mode: isProd,
                    timestamp: new Date().toISOString(),
                  }),
                },
              });
            } catch {}
          }
        } catch {}
      }
      throw e;
    }
  },

  async markAsOverdue(id: string): Promise<BillingResponse> {
    const existingBilling = await prisma.billing.findUnique({
      where: { id }
    });

    if (!existingBilling) {
      throw new Error('Billing record not found');
    }
    const invoice = await prisma.invoice.findFirst({ where: { billing_id: id } });

    if (!invoice) {
      throw new Error('Invoice not found for this billing');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot mark paid invoice as overdue');
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.OVERDUE,
        updated_at: new Date()
      }
    });

    const billing = await prisma.billing.findUnique({
      where: { id },
      include: {
        Subscription: {
          include: {
            Tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              }
            },
            Plan: {
              select: {
                id: true,
                name: true,
                price_monthly: true,
                currency: true,
              }
            }
          }
        },
        Invoice: true
      }
    });

    return billing as any;
  },

  async checkOverdueBillings(): Promise<BillingResponse[]> {
    const now = new Date();
    // Find invoices past due and not paid
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        due_date: { lt: now },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED] }
      }
    });

    if (overdueInvoices.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: overdueInvoices.map(inv => inv.id) } },
        data: { status: InvoiceStatus.OVERDUE, updated_at: new Date() }
      });

      const billings = await prisma.billing.findMany({
        where: { id: { in: overdueInvoices.map(inv => inv.billing_id) } },
        include: {
          Subscription: {
            include: {
              Tenant: { select: { id: true, name: true, domain: true } },
              Plan: { select: { id: true, name: true, price_monthly: true, currency: true } }
            }
          },
          Invoice: true
        }
      });
      return billings as any;
    }

    return [] as any;
  },

  async getBillingStats(scope: DataScope, tenantIdFilter?: string): Promise<BillingStats> {
    const whereClause: any = {};
    
    const effectiveTenantId = scope.tenantId || tenantIdFilter;

    if (effectiveTenantId) {
      whereClause.Subscription = {
        tenant_id: effectiveTenantId
      };
    }
    // Compute totals from Billing amounts
    const totalStats = await prisma.billing.aggregate({
      where: whereClause,
      _sum: { amount: true },
      _count: { id: true }
    });

    // Compute stats by Invoice status
    const paidStats = await prisma.invoice.aggregate({
      where: {
        ...(effectiveTenantId && { Billing: { Subscription: { tenant_id: effectiveTenantId } } }),
        status: InvoiceStatus.PAID
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const unpaidStats = await prisma.invoice.aggregate({
      where: {
        ...(effectiveTenantId && { Billing: { Subscription: { tenant_id: effectiveTenantId } } }),
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.VIEWED] }
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const overdueStats = await prisma.invoice.aggregate({
      where: {
        ...(effectiveTenantId && { Billing: { Subscription: { tenant_id: effectiveTenantId } } }),
        status: InvoiceStatus.OVERDUE
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    return {
      total_amount: totalStats._sum.amount || 0,
      paid_amount: paidStats._sum.amount || 0,
      unpaid_amount: unpaidStats._sum.amount || 0,
      overdue_amount: overdueStats._sum.amount || 0,
      total_count: totalStats._count.id || 0,
      paid_count: paidStats._count.id || 0,
      unpaid_count: unpaidStats._count.id || 0,
      overdue_count: overdueStats._count.id || 0,
    };
  },

  async generateMonthlyBilling(subscriptionId: string, month: number, year: number): Promise<BillingResponse> {
    // Validate subscription exists and is active
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        Plan: true
      }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new Error('Subscription is not active');
    }

    // Check if billing already exists for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const existingBilling = await prisma.billing.findFirst({
      where: {
        subscription_id: subscriptionId,
        billing_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    if (existingBilling) {
      throw new Error(`Billing for ${month}/${year} already exists`);
    }

    // Generate billing
    const billingDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, 15); // Due on 15th of the month

    const billing = await this.createBilling({
      subscription_id: subscriptionId,
      amount: subscription.Plan.price_monthly,
      billing_date: billingDate,
      due_date: dueDate
    });

    return billing;
  },

  async deleteBilling(id: string): Promise<void> {
    const existingBilling = await prisma.billing.findUnique({
      where: { id },
      include: { Invoice: true }
    });

    if (!existingBilling) {
      throw new Error('Billing record not found');
    }
    
    // Prevent deleting when invoice is PAID
    if (existingBilling.Invoice && existingBilling.Invoice.status === InvoiceStatus.PAID) {
      throw new Error('Cannot delete billing with PAID invoice');
    }

    // Delete related invoice first if exists
    if (existingBilling.Invoice) {
      await prisma.invoice.delete({ where: { id: existingBilling.Invoice.id } });
    }

    await prisma.billing.delete({ where: { id } });
  },

  async getFinancialDashboardRawMetrics(tenantId?: string) {
    return getFinancialDashboardRawMetricsQuery(tenantId);
  },

  async getBillingDashboardNotifications(tenantId?: string) {
    return getBillingDashboardNotificationsQuery(tenantId);
  },

  async getBillingDashboardRecentActivities(tenantId: string | undefined, limit: number) {
    return getBillingDashboardRecentActivitiesQuery(tenantId, limit);
  },

  async getRevenueChartData(tenantId: string | undefined, monthsCount: number) {
    return getRevenueChartDataQuery(tenantId, monthsCount);
  },

  async getBillingHealthSummary() {
    return getBillingHealthSummaryQuery();
  }
};
