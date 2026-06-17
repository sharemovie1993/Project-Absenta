import { PrismaClient } from '@prisma/client';
import { processDueSubscription } from '@/jobs/recurringBilling.job';
import { cancelDowngradeCommand, scheduleDowngradeCommand } from '@/modules/billing/services/commands/schedule-downgrade.command';
import { applyDueDowngradeForSubscriptionCommand } from '@/modules/billing/services/commands/apply-due-downgrades.command';

const prisma = new PrismaClient();

describe('Subscription Downgrade Flow', () => {
  let tenantId: string;
  let highPlanId: string;
  let lowPlanId: string;
  let subscriptionId: string;

  beforeEach(async () => {
    const suffix = String(Date.now());
    const tenant = await prisma.tenant.create({
      data: { name: 'Downgrade Tenant', domain: `downgrade-${suffix}.example.com` },
      select: { id: true },
    });
    tenantId = tenant.id;

    const highPlan = await prisma.plan.create({
      data: {
        code: `ABSENSI_ENTERPRISE_MONTHLY_${suffix}`,
        service_code: 'ABSENSI',
        name: `Absensi-Multi-Enterprise-MONTHLY-${suffix}`,
        price_monthly: 1_000_000,
        price_yearly: 12_000_000,
        billing_period: 'MONTH',
        currency: 'IDR',
        max_user: 1000,
        features_json: ['ABSENSI'],
        is_active: true,
        is_public: true,
      } as any,
      select: { id: true },
    });
    highPlanId = highPlan.id;

    const lowPlan = await prisma.plan.create({
      data: {
        code: `ABSENSI_SMALL_MONTHLY_${suffix}`,
        service_code: 'ABSENSI',
        name: `Absensi-Simple-Small-MONTHLY-${suffix}`,
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
    lowPlanId = lowPlan.id;

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setSeconds(nextBilling.getSeconds() - 2);
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: highPlanId,
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
    if (highPlanId) await prisma.plan.deleteMany({ where: { id: highPlanId } });
    if (lowPlanId) await prisma.plan.deleteMany({ where: { id: lowPlanId } });
    if (tenantId) await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  it('schedules downgrade without changing current plan', async () => {
    const before = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { plan_id: true } });
    expect(before?.plan_id).toBe(highPlanId);

    const req = await scheduleDowngradeCommand(subscriptionId, lowPlanId, 'DOWNGRADE_TEST');
    expect(String((req as any).change_type)).toBe('DOWNGRADE');
    expect(String((req as any).status)).toBe('SCHEDULED');

    const after = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { plan_id: true } });
    expect(after?.plan_id).toBe(highPlanId);
  });

  it('applies downgrade on renewal before billing is created', async () => {
    await scheduleDowngradeCommand(subscriptionId, lowPlanId);

    await processDueSubscription(subscriptionId, 'test-downgrade');

    const applied = await prisma.planChangeRequest.findFirst({
      where: { subscription_id: subscriptionId, change_type: 'DOWNGRADE' as any },
      select: { status: true },
    });
    expect(String(applied?.status)).toBe('APPLIED');

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { plan_id: true },
    });
    expect(sub?.plan_id).toBe(lowPlanId);

    const billing = await prisma.billing.findFirst({
      where: { subscription_id: subscriptionId },
      orderBy: { created_at: 'desc' },
      select: { amount: true },
    });
    expect(Number(billing?.amount)).toBe(200_000);
  });

  it('cancel downgrade keeps renewal using old plan', async () => {
    await scheduleDowngradeCommand(subscriptionId, lowPlanId);
    await cancelDowngradeCommand(subscriptionId);

    await applyDueDowngradeForSubscriptionCommand(subscriptionId, new Date());

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { plan_id: true } });
    expect(sub?.plan_id).toBe(highPlanId);
  });
});
