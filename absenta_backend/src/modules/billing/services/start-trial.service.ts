import { prisma } from '@/utils/prisma';
import { Plan, Subscription, SubscriptionStatus } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/utils/errors';
import { eventBus } from '@/utils/event-bus';

export class StartTrialService {
  /**
   * Starts a trial for a given tenant and plan.
   * @param tenantId The ID of the tenant.
   * @param planCode The code of the plan to start a trial for.
   * @returns The newly created trial subscription.
   */
  async startTrial(tenantId: string, planCode: string): Promise<Subscription> {
    const plan = await this.findTrialPlan(planCode);

    await this.validateNoExistingSubscription(tenantId, plan.service_code);

    const { startDate, endDate } = this.calculateTrialDates(plan.trial_days);

    const subscription = await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: plan.id,
        service_code: plan.service_code,
        status: SubscriptionStatus.TRIAL,
        start_date: startDate,
        end_date: endDate,
        auto_renew: false, // Trials should not auto-renew
      },
    });

    await eventBus.publish('trial.started', { 
      tenantId,
      subscriptionId: subscription.id,
      planCode: plan.code,
      serviceCode: plan.service_code,
      trialEndDate: endDate,
    });

    return subscription;
  }

  private async findTrialPlan(planCode: string): Promise<Plan> {
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });

    if (!plan) {
      throw new NotFoundError('Plan not found.');
    }
    if (plan.trial_days <= 0) {
      throw new ForbiddenError('This plan does not offer a trial.');
    }

    return plan;
  }

  private async validateNoExistingSubscription(tenantId: string, serviceCode: string): Promise<void> {
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        service_code: serviceCode,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
    });

    if (existingSubscription) {
      throw new ForbiddenError('An active or trial subscription for this service already exists.');
    }
  }

  private calculateTrialDates(trialDays: number): { startDate: Date; endDate: Date } {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + trialDays);
    return { startDate, endDate };
  }
}

export const startTrialService = new StartTrialService();
