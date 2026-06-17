import { PrismaClient } from '@prisma/client';
import { processDueSubscription } from '@/jobs/recurringBilling.job';
import { scheduleCancelCommand, undoCancelCommand } from '@/modules/billing/services/commands/schedule-cancel.command';
import { applyDueCancelForSubscriptionCommand } from '@/modules/billing/services/commands/apply-due-cancel.command';

const prisma = new PrismaClient();

describe('Subscription Cancel Flow', () => {
  let tenantId: string;
  let planId: string;
  let subscriptionId: string;

  beforeEach(async () => {
    const suffix = String(Date.now());
    const tenant = await prisma.tenant.create({
      data: { name: 'Cancel Tenant', domain: `cancel-${suffix}.example.com` },
      select: { id: true },
    });
    tenantId = tenant.id;

    const plan = await prisma.plan.create({
      data: {
        code: `ABSENSI_PRO_MONTHLY_${suffix}`,
        service_code: 'ABSENSI',
        name: `Absensi-Pro-MONTHLY-${suffix}`,
        price_monthly: 200_000,
        price_yearly: 2_400_000,
        billing_period: 'MONTH',
        currency: 'IDR',
        max_user: 300,
        features_json: ['ABSENSI'],
        is_active: true,
        is_public: true,
      } as any,
      select: { id: true },
    });
    planId = plan.id;

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setSeconds(nextBilling.getSeconds() - 2);
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: planId,
        service_code: 'ABSENSI',
        status: 'ACTIVE' as any,
        start_date: now,
        end_date: endDate,
        next_billing_date: nextBilling,
        auto_renew: true,
      } as any,
      select: { id: true },
    });
    subscriptionId = sub.id;
  });

  afterEach(async () => {
    if (subscriptionId) {
      await prisma.invoice.deleteMany({ where: { subscription_id: subscriptionId } });
      await prisma.billing.deleteMany({ where: { subscription_id: subscriptionId } });
      await prisma.planChangeRequest.deleteMany({ where: { subscription_id: subscriptionId } });
      await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
    }
    if (planId) await prisma.plan.deleteMany({ where: { id: planId } });
    if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  it('schedules cancel without changing subscription status', async () => {
    const before = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });
    expect(String(before?.status)).toBe('ACTIVE');

    const req = await scheduleCancelCommand(subscriptionId, 'CANCEL_TEST');
    expect(String((req as any).change_type)).toBe('CANCEL');
    expect(String((req as any).status)).toBe('SCHEDULED');

    const after = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });
    expect(String(after?.status)).toBe('ACTIVE');
  });

  it('applies cancel on renewal and prevents billing creation', async () => {
    await scheduleCancelCommand(subscriptionId);

    await processDueSubscription(subscriptionId, 'test-cancel');

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });
    expect(String(sub?.status)).toBe('CANCELLED');

    const billing = await prisma.billing.findFirst({
      where: { subscription_id: subscriptionId },
      select: { id: true },
    });
    expect(billing).toBeNull();
  });

  it('undo cancel keeps renewal using active subscription (billing created)', async () => {
    await scheduleCancelCommand(subscriptionId);
    await undoCancelCommand(subscriptionId);

    await applyDueCancelForSubscriptionCommand(subscriptionId, new Date());

    await processDueSubscription(subscriptionId, 'test-cancel-undo');

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });
    expect(String(sub?.status)).toBe('ACTIVE');

    const billing = await prisma.billing.findFirst({
      where: { subscription_id: subscriptionId },
      orderBy: { created_at: 'desc' },
      select: { amount: true },
    });
    expect(Number(billing?.amount)).toBe(200_000);
  });
});

