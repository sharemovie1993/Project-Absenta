import { SubscriptionStatus } from '@prisma/client';
import { subscriptionDb as prisma } from '../repositories/subscription.db';
import axios from 'axios';

export async function getMySubscriptionOverviewQuery(tenantId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { tenant_id: tenantId },
    orderBy: { end_date: 'desc' },
    include: {
      Plan: { include: { Module: true } },
    },
  });

  const activeSubscriptions = await prisma.subscription.findMany({
    where: { 
      tenant_id: tenantId, 
      status: { 
        in: [
          SubscriptionStatus.ACTIVE, 
          SubscriptionStatus.TRIAL, 
          SubscriptionStatus.UPGRADE_PENDING,
          SubscriptionStatus.PENDING_PAYMENT
        ] as any 
      } 
    },
    orderBy: { end_date: 'desc' },
    include: { Plan: { include: { Module: true } } },
  });

  if (!subscription) {
    return null;
  }

  const upgradePlanChange = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscription.id,
      status: 'SCHEDULED' as any,
      change_type: 'UPGRADE' as any,
    },
    orderBy: {
      effective_date: 'asc',
    },
    include: {
      toPlan: true,
    },
  });

  const scheduledDowngrade = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscription.id,
      status: 'SCHEDULED' as any,
      change_type: 'DOWNGRADE' as any,
    },
    orderBy: { effective_date: 'asc' },
    include: { toPlan: true },
  });

  const scheduledCancel = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscription.id,
      status: 'SCHEDULED' as any,
      change_type: 'CANCEL' as any,
    },
    orderBy: { effective_date: 'asc' },
  });

  // Agregasi fitur hanya dari langganan yang benar-benar aktif (ACTIVE/TRIAL)
  const subscriptionsForFeatures = activeSubscriptions.filter(s => 
    s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIAL
  );

  const featureSet = new Set<string>(['CORE']);
  for (const s of subscriptionsForFeatures as any[]) {
    const snap: any = (s as any).plan_snapshot || null;
    const fromSnap: string[] = Array.isArray(snap?.features_json) ? snap.features_json : [];
    const fromPlan: string[] = Array.isArray((s as any).Plan?.features_json) ? ((s as any).Plan.features_json as string[]) : [];
    const merged = fromSnap.length > 0 ? fromSnap : fromPlan;
    for (const f of merged) {
      featureSet.add(String(f).toUpperCase());
    }
    // Also add the service_code as a feature identifier
    const serviceCode = (s as any).Plan?.service_code || (s as any).plan_snapshot?.service_code;
    if (serviceCode) {
      featureSet.add(String(serviceCode).toUpperCase());
    }
  }
  const aggregatedFeatures = Array.from(featureSet);

  return {
    ...subscription,
    features: aggregatedFeatures,
    subscriptions: (activeSubscriptions as any[]).map((s) => ({
      id: s.id,
      plan_id: s.plan_id,
      status: s.status,
      end_date: s.end_date,
      start_date: s.start_date,
      auto_renew: s.auto_renew,
      plan_snapshot: (s as any).plan_snapshot || null,
      plan_name: (s as any).Plan?.name ?? null,
      plan_features: (s as any).Plan?.features_json ?? null,
      Plan: s.Plan || null, // Include full Plan object for UI richness
    })),
    target_upgrade_plan: upgradePlanChange
      ? {
          id: upgradePlanChange.to_plan_id,
          name: upgradePlanChange.toPlan?.name ?? null,
          billing_period: upgradePlanChange.toPlan?.billing_period ?? null,
        }
      : null,
    upgrade_invoice_id: null,
    upgrade_invoice_status: null,
    upgrade_payment_status: null,
    expected_upgrade_price: upgradePlanChange ? upgradePlanChange.price_snapshot : null,
    scheduled_downgrade: scheduledDowngrade
      ? {
          id: scheduledDowngrade.id,
          to_plan_id: scheduledDowngrade.to_plan_id,
          to_plan_name: scheduledDowngrade.toPlan?.name ?? null,
          effective_at: scheduledDowngrade.effective_date,
          status: scheduledDowngrade.status,
        }
      : null,
    scheduled_cancel: scheduledCancel
      ? {
          id: scheduledCancel.id,
          effective_at: scheduledCancel.effective_date,
          status: scheduledCancel.status,
          reason: scheduledCancel.reason ?? null,
        }
      : null,
  };
}

function resolveServiceMetadata(planTitle: string, productId: string) {
  const title = String(planTitle || '').toUpperCase();
  const prod = String(productId || '').toUpperCase();

  if (prod === 'PLATFORM-ABSENTA') {
    return {
      service_code: 'CORE',
      plan_name: planTitle || 'Layanan Utama',
      module_name: 'Layanan Utama'
    };
  }

  // Default values
  let service_code = 'MODUL';
  let module_name = planTitle ? planTitle.split('(')[0].trim() : 'Layanan Modular';

  if (title.includes('HUBUNGAN INDUSTRI') || title.includes('HUBIN')) {
    service_code = 'HUBIN';
    module_name = 'Hubungan Industri';
  } else if (title.includes('SARANA PRASARANA') || title.includes('SARPRAS') || title.includes('SARANA & PRASARANA') || title.includes('SARPRAS')) {
    service_code = 'SARPRAS';
    module_name = 'Sarana & Prasarana';
  } else if (title.includes('KOPERASI')) {
    service_code = 'KOPERASI';
    module_name = 'Koperasi';
  } else if (title.includes('KANTIN')) {
    service_code = 'KANTIN';
    module_name = 'Kantin';
  } else if (title.includes('EASY TUNNEL') || title.includes('EASY-TUNNEL')) {
    service_code = 'EASY_TUNNEL';
    module_name = 'Easy Tunnel';
  } else if (title.includes('VPN')) {
    service_code = 'VPN';
    module_name = 'VPN Tunnel';
  } else if (title.includes('RAPOR')) {
    service_code = 'RAPOR';
    module_name = 'Rapor';
  } else if (title.includes('ABSENSI') || title.includes('PRESENCE') || title.includes('ATTENDANCE')) {
    service_code = 'ABSENSI';
    module_name = 'Absensi';
  }

  return {
    service_code,
    plan_name: planTitle || 'Layanan Modular',
    module_name
  };
}

export async function getInvoicesByTenantQuery(_tenantId: string) {
  const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
  const coreKey = process.env.LICENSE_KEY || '';
  if (!coreKey) return [];

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: _tenantId },
      select: { subdomain: true }
    });
    const slug = tenant?.subdomain?.toLowerCase();

    const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
    if (response.data?.success && response.data?.data?.invoices) {
      let rawInvoices = response.data.data.invoices;

      if (slug) {
        const licenses = response.data.data.licenses || [];
        const tenantLicenses = licenses
          .filter((l: any) => l.requested_slug?.toLowerCase() === slug)
          .map((l: any) => l.id);
        rawInvoices = rawInvoices.filter((inv: any) => 
          tenantLicenses.includes(inv.license_id) || 
          inv.school_name?.toLowerCase() === slug || 
          inv.schoolName?.toLowerCase() === slug
        );
      }

      return rawInvoices.map((inv: any) => {
        const mappedStatus = String(inv.status).toUpperCase();
        let status = 'SENT';
        if (mappedStatus === 'PAID') status = 'PAID';
        else if (mappedStatus === 'CANCELLED') status = 'CANCELLED';
        else if (mappedStatus === 'EXPIRED') status = 'OVERDUE';

        const nowUnix = Math.floor(Date.now() / 1000);
        const expTime = Number(inv.expired_time || 0);
        if (status !== 'PAID' && status !== 'CANCELLED' && expTime > 0 && nowUnix > expTime) {
          status = 'OVERDUE';
        }

        const meta = resolveServiceMetadata(inv.plan_title || inv.planTitle || '', inv.product_id || inv.productId || '');

        return {
          id: String(inv.invoice_number),
          invoice_number: inv.invoice_number,
          amount: inv.amount,
          total_amount: inv.amount,
          currency: 'IDR',
          status: status,
          created_at: inv.created_at,
          paid_at: inv.paid_at,
          expired_time: inv.expired_time,
          plan_id: inv.plan_id || null,
          plan_name: meta.plan_name,
          payment_method: inv.payment_method || null,
          payments: inv.paid_at ? [{ status: 'SUCCESS', payment_method: inv.payment_method || 'TRIPAY' }] : [],
          Subscription: {
            service_code: meta.service_code,
            Plan: {
              name: meta.plan_name,
              Module: {
                name: meta.module_name
              }
            }
          }
        };
      });
    }
  } catch (err: any) {
    console.error('[getInvoicesByTenantQuery] Failed to fetch invoices from licensing server:', err.message);
  }
  return [];
}

export async function getPaymentsByTenantQuery(_tenantId: string) {
  const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
  const coreKey = process.env.LICENSE_KEY || '';
  if (!coreKey) return [];

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: _tenantId },
      select: { subdomain: true }
    });
    const slug = tenant?.subdomain?.toLowerCase();

    const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
    if (response.data?.success && response.data?.data?.invoices) {
      let rawInvoices = response.data.data.invoices;

      if (slug) {
        const licenses = response.data.data.licenses || [];
        const tenantLicenses = licenses
          .filter((l: any) => l.requested_slug?.toLowerCase() === slug)
          .map((l: any) => l.id);
        rawInvoices = rawInvoices.filter((inv: any) => 
          tenantLicenses.includes(inv.license_id) || 
          inv.school_name?.toLowerCase() === slug || 
          inv.schoolName?.toLowerCase() === slug
        );
      }

      return rawInvoices
        .filter((inv: any) => inv.paid_at)
        .map((inv: any) => {
          const meta = resolveServiceMetadata(inv.plan_title || inv.planTitle || '', inv.product_id || inv.productId || '');
          return {
            id: `PAY-${inv.invoice_number}`,
            amount: inv.amount,
            currency: 'IDR',
            status: 'SUCCESS',
            payment_method: inv.payment_method || 'TRIPAY',
            paid_at: inv.paid_at,
            created_at: inv.paid_at,
            invoice_number: inv.invoice_number,
            plan_name: meta.plan_name,
            Subscription: {
              service_code: meta.service_code,
              Plan: {
                name: meta.plan_name,
                Module: {
                  name: meta.module_name
                }
              }
            }
          };
        });
    }
  } catch (err: any) {
    console.error('[getPaymentsByTenantQuery] Failed to fetch payments from licensing server:', err.message);
  }
  return [];
}
