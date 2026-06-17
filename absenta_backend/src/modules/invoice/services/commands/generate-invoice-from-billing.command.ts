import { InvoiceStatus } from '@prisma/client';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { observabilityService } from '@/modules/observability/services/observability.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { appLogger } from '@/utils/app-logger';
import type { InvoiceResponse } from '../invoice.types';
import { invoiceDb as prisma } from '../repositories/invoice.db';
import { getSmartApiBaseUrl } from '@/utils/url-helper';

export type GenerateFromBillingHelpers = {
  generateInvoiceNumber: () => Promise<string>;
  requestInvoicePdfGeneration: (input: { invoiceId: string; tenantId: string; publicBaseUrl: string }) => Promise<void>;
  formatInvoiceResponse: (invoice: any) => InvoiceResponse;
};

export async function generateInvoiceFromBillingCommand(params: {
  tenantId: string;
  billingId: string;
  invoiceData: { due_date: Date; notes?: string };
  helpers: GenerateFromBillingHelpers;
}): Promise<InvoiceResponse> {
  const { tenantId, billingId, invoiceData, helpers } = params;

  const billing: any = await prisma.billing.findFirst({
    where: {
      id: billingId,
      Subscription: {
        tenant_id: tenantId,
      },
    } as any,
    include: {
      Invoice: true,
      Subscription: {
        include: {
          Tenant: {
            include: {
              sekolah: {
                take: 1,
              },
            },
          },
          Plan: true,
        },
      },
    },
  });

  if (!billing) {
    throw new Error('Billing not found or access denied');
  }

  if (billing.Invoice) {
    throw new Error('Invoice already exists for this billing');
  }

  const invoiceNumber = await helpers.generateInvoiceNumber();

  const tenant = billing.Subscription.Tenant;
  const sekolah = (tenant as any).sekolah?.[0];
  const tenantAddress = sekolah ? [sekolah.alamat, sekolah.kota, sekolah.provinsi, sekolah.kode_pos].filter(Boolean).join(', ') : undefined;

  const globalConfig = await prisma.systemConfig.findFirst({
    where: { tenant_id: null },
  });

  const activeConfig = await systemConfigService.getActive(tenantId);
  const subtotal = Number(billing.amount || 0);
  let taxRate: number | null = 0;
  let taxAmount = 0;
  let taxLabel: string | null = null;
  let taxType: string = 'NONE';

  if (activeConfig && (activeConfig as any).is_pkp === true) {
    taxRate = Number((activeConfig as any).ppn_rate ?? 11) / 100;
    taxAmount = Math.round(subtotal * taxRate);
    taxLabel = `PPN ${(activeConfig as any).ppn_rate ?? 11}%`;
    taxType = 'PPN';
  }

  const total = subtotal + taxAmount;

  const now = new Date();
  const currentEnd = new Date(billing.Subscription.end_date as any);
  const status = String((billing.Subscription as any).status || '');
  const lastAppliedInvoiceId = (billing.Subscription as any).last_applied_invoice_id as string | null | undefined;
  const isFirstPaidPeriod = !lastAppliedInvoiceId && status === 'PENDING_PAYMENT';
  const chargeType = String((billing as any).charge_type || '');

  let periodStart: Date;
  if (chargeType === 'UPGRADE') {
    periodStart = now;
  } else {
    periodStart = isFirstPaidPeriod ? now : currentEnd.getTime() > now.getTime() ? currentEnd : now;
  }

  let billingPeriod = (billing.Subscription as any).Plan?.billing_period || 'MONTH';
  if ((billing as any).upgrade_plan_id_snapshot) {
    const targetPlan = await prisma.plan.findUnique({
      where: { id: (billing as any).upgrade_plan_id_snapshot },
      select: { billing_period: true },
    });
    if ((targetPlan as any)?.billing_period) {
      billingPeriod = (targetPlan as any).billing_period;
    }
  }

  const periodEnd = new Date(periodStart);
  if (billingPeriod === 'YEAR') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const invoice = await prisma.invoice.create({
    data: {
      tenant_id: tenantId,
      billing_id: billingId,
      subscription_id: billing.subscription_id,
      invoice_number: invoiceNumber,
      invoice_tenant_name: tenant.name,
      invoice_tenant_identifier: tenant.domain || tenant.id,
      invoice_tenant_address: tenantAddress,
      invoice_company_legal_name: (globalConfig as any)?.company_legal_name,
      invoice_company_trade_name: (globalConfig as any)?.company_trade_name,
      invoice_company_npwp: (globalConfig as any)?.company_npwp,
      invoice_company_address: (globalConfig as any)?.company_address,
      invoice_company_email_billing: (globalConfig as any)?.company_email_billing,
      invoice_company_phone_billing: (globalConfig as any)?.company_phone_billing,
      invoice_company_logo_url: (globalConfig as any)?.company_logo_url,
      invoice_company_signature_name: (globalConfig as any)?.company_signature_name,
      invoice_company_signature_title: (globalConfig as any)?.company_signature_title,
      amount: billing.amount,
      subtotal_amount: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      tax_label: taxLabel,
      tax_type: taxType,
      total_amount: total,
      due_date: invoiceData.due_date,
      period_start: periodStart,
      period_end: periodEnd,
      status: InvoiceStatus.DRAFT,
      notes: invoiceData.notes || null,
    } as any,
    include: {
      Billing: {
        include: {
          Subscription: {
            include: {
              Tenant: true,
              Plan: true,
            },
          },
        },
      },
    },
  });

  observabilityService.logEvent({
    event_type: 'INVOICE_CREATED',
    domain: 'INVOICE',
    entity_type: 'Invoice',
    entity_id: (invoice as any).id,
    tenant_id: (invoice as any).tenant_id,
    severity: 'INFO',
    metadata: {
      invoice_number: (invoice as any).invoice_number,
      status: (invoice as any).status,
      total_amount: (invoice as any).total_amount,
      billing_id: (invoice as any).billing_id,
      subscription_id: (invoice as any).subscription_id,
    },
  });

  void helpers
    .requestInvoicePdfGeneration({
      invoiceId: (invoice as any).id,
      tenantId: (invoice as any).tenant_id,
      publicBaseUrl: getSmartApiBaseUrl(),
    })
    .catch(() => {});

  try {
    const tenantAdmin = await prisma.user.findFirst({
      where: { tenant_id: (invoice as any).tenant_id, Role: { name: 'ADMIN' } } as any,
      select: { email: true, full_name: true } as any,
    });
    if ((tenantAdmin as any)?.email) {
      const amountIdr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format((invoice as any).total_amount);
      const subject = `Tagihan Baru #${(invoice as any).invoice_number} Telah Terbit`;
      const html = `
          <h3>Tagihan Baru Tersedia</h3>
          <p>Halo ${(tenantAdmin as any).full_name || 'Admin'},</p>
          <p>Tagihan baru <strong>${(invoice as any).invoice_number}</strong> senilai <strong>${amountIdr}</strong> telah diterbitkan.</p>
          <p>Status: <strong>DRAFT</strong> (Menunggu konfirmasi pengiriman)</p>
          <p>Silakan login untuk melihat detailnya.</p>
        `;
      await emitDomainEvent({
        event_type: 'notification.email.send-requested',
        tenant_id: (invoice as any).tenant_id,
        source_service: 'invoice',
        payload: {
          to: (tenantAdmin as any).email,
          subject,
          html,
          event: 'INVOICE_CREATED',
          relatedId: (invoice as any).id,
          tenantId: (invoice as any).tenant_id,
        },
      });
    }
  } catch (err) {
    appLogger.error({ err, invoice_id: (invoice as any).id }, 'invoice.invoice_created_email_failed');
  }

  return helpers.formatInvoiceResponse(invoice);
}
