import { InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { subscriptionDb as prisma } from '../repositories/subscription.db';

export async function getMySubscriptionOverviewQuery(tenantId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { tenant_id: tenantId },
    orderBy: { end_date: 'desc' },
    include: {
      Plan: { include: { Module: true } },
      Invoice: {
        where: { status: InvoiceStatus.PAID as any },
        orderBy: { paid_at: 'desc' },
        take: 1,
      },
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

  let upgradeInvoiceId: string | null = null;
  let upgradeInvoiceStatus: string | null = null;
  let upgradePaymentStatus: string | null = null;

  if (upgradePlanChange) {
    const upgradeBilling = await prisma.billing.findFirst({
      where: {
        subscription_id: subscription.id,
        plan_change_request_id: upgradePlanChange.id,
        charge_type: 'UPGRADE' as any,
      },
      include: {
        Invoice: true,
        Payment: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });

    const invoice = (upgradeBilling as any)?.Invoice;
    if (invoice) {
      upgradeInvoiceId = String(invoice.id);
      upgradeInvoiceStatus = String(invoice.status);
    }
    const p = Array.isArray((upgradeBilling as any)?.Payment) ? (upgradeBilling as any).Payment[0] : null;
    if (p?.status) {
      upgradePaymentStatus = String(p.status);
    }
  }

  // FALLBACK: Jika tidak ada upgradePlanChange tapi ada tagihan tertunda secara umum
  if (!upgradeInvoiceId) {
    const pendingInvoice = await prisma.invoice.findFirst({
      where: {
        tenant_id: tenantId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE] as any }
      },
      orderBy: { issue_date: 'desc' }
    });

    if (pendingInvoice) {
      upgradeInvoiceId = String(pendingInvoice.id);
      upgradeInvoiceStatus = String(pendingInvoice.status);
    }
  }

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
    upgrade_invoice_id: upgradeInvoiceId,
    upgrade_invoice_status: upgradeInvoiceStatus,
    upgrade_payment_status: upgradePaymentStatus,
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

export async function getInvoicesByTenantQuery(tenantId: string) {
  return prisma.invoice.findMany({
    where: { tenant_id: tenantId },
    orderBy: { issue_date: 'desc' },
    include: { 
      Billing: {
        include: { 
          Subscription: {
            include: {
              Plan: {
                include: { Module: true }
              }
            }
          } 
        }
      },
      Subscription: {
        include: {
          Plan: {
            include: { Module: true }
          }
        }
      },
      payments: {
        orderBy: { created_at: 'desc' },
        take: 1
      }
    },
  });
}

export async function getPaymentsByTenantQuery(tenantId: string) {
  return prisma.payment.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  });
}
