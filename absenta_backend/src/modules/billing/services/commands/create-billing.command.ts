import { InvoiceStatus } from '@prisma/client';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { observabilityService } from '@/modules/observability/services/observability.service';
import type { BillingResponse, CreateBillingInput } from '../billing.types';
import { billingDb as prisma } from '../repositories/billing.db';
import { generateInvoiceNumber } from '../utils/invoice-number';

export async function createBillingCommand(input: CreateBillingInput): Promise<BillingResponse> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: input.subscription_id },
    include: {
      Plan: true,
    },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (input.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!input.billing_date || isNaN(new Date(input.billing_date).getTime())) {
    throw new Error('Invalid billing date');
  }

  const billingDate = new Date(input.billing_date);
  billingDate.setHours(0, 0, 0, 0);

  const billing: any = await prisma.billing.create({
    data: {
      tenant_id: (subscription as any).tenant_id,
      subscription_id: input.subscription_id,
      amount: input.amount,
      billing_date: billingDate,
      charge_type: (input.charge_type as any) || undefined,
      payment_method: input.payment_method || null,
      payment_reference: input.payment_reference || null,
      upgrade_plan_id_snapshot: input.upgrade_plan_id_snapshot || null,
      upgrade_price_snapshot: typeof input.upgrade_price_snapshot === 'number' ? input.upgrade_price_snapshot : null,
      plan_change_request_id: input.plan_change_request_id || null,
    } as any,
    include: {
      Subscription: {
        include: {
          Tenant: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
          Plan: {
            select: {
              id: true,
              name: true,
              price_monthly: true,
              currency: true,
            },
          },
        },
      },
      Invoice: true,
    },
  });

  if (input.due_date) {
    try {
      const activeConfig = await systemConfigService.getActive((subscription as any).tenant_id);
      const subtotal = Number((billing as any).amount || 0);
      let taxRate: number | null = null;
      let taxAmount = 0;
      let taxLabel: string | null = null;
      let taxType: 'NONE' | 'PPN' = 'NONE';
      if (activeConfig && (activeConfig as any).is_pkp === true) {
        taxRate = Number((activeConfig as any).ppn_rate ?? 11);
        taxAmount = Math.round((subtotal * (taxRate || 0)) / 100);
        taxLabel = `PPN ${taxRate}%`;
        taxType = 'PPN';
      }
      const total = subtotal + taxAmount;

      const now = new Date();
      const isUpgrade = String((billing as any).charge_type || '').toUpperCase() === 'UPGRADE';
      let targetBillingPeriod: 'MONTH' | 'YEAR' | undefined = ((subscription as any).Plan?.billing_period as any) || undefined;

      if (isUpgrade) {
        let toPlanId: string | null = null;
        if ((billing as any).upgrade_plan_id_snapshot) {
          toPlanId = String((billing as any).upgrade_plan_id_snapshot);
        } else if ((billing as any).plan_change_request_id) {
          const pc = await prisma.planChangeRequest.findUnique({
            where: { id: String((billing as any).plan_change_request_id) },
            select: { to_plan_id: true } as any,
          });
          toPlanId = (pc as any)?.to_plan_id || null;
        }
        if (toPlanId) {
          const toPlan = await prisma.plan.findUnique({
            where: { id: String(toPlanId) },
            select: { billing_period: true } as any,
          });
          targetBillingPeriod = ((toPlan as any)?.billing_period as any) || targetBillingPeriod;
        }
      }

      const currentEnd = new Date((subscription as any).end_date as any);
      const periodStart = isUpgrade ? now : currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const periodEnd = new Date(periodStart);
      if (targetBillingPeriod === 'YEAR') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const invoice = await prisma.invoice.create({
        data: {
          tenant_id: (subscription as any).tenant_id,
          billing_id: (billing as any).id,
          subscription_id: (subscription as any).id,
          invoice_number: await generateInvoiceNumber(),
          amount: (billing as any).amount,
          subtotal_amount: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          tax_label: taxLabel,
          tax_type: taxType as any,
          total_amount: total,
          due_date: input.due_date,
          period_start: periodStart,
          period_end: periodEnd,
          status: InvoiceStatus.DRAFT,
        } as any,
      });

      observabilityService.logEvent({
        event_type: 'INVOICE_CREATED',
        domain: 'INVOICE',
        severity: 'INFO',
        entity_type: 'INVOICE',
        entity_id: String((invoice as any).id),
        tenant_id: String((subscription as any).tenant_id),
        correlation_id: (input as any).correlation_id || null,
        metadata: {
          billing_id: String((billing as any).id),
          subscription_id: String((subscription as any).id),
          invoice_number: String((invoice as any).invoice_number),
          status: String((invoice as any).status),
        },
      });

      return { ...(billing as any), Invoice: invoice } as any;
    } catch {
      return billing as any;
    }
  }

  return billing as any;
}

