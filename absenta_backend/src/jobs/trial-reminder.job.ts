import { prisma } from '@/utils/prisma';
import { SubscriptionStatus } from '@prisma/client';
import { eventBus } from '@/utils/event-bus';
import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';

export const TRIAL_REMINDER_JOB_NAME = 'trial-reminder-job';

export default defineCronJob({
  name: TRIAL_REMINDER_JOB_NAME,
  schedule: '0 0 * * *', // tengah malam setiap hari
  async run() {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const expiringTrials = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        end_date: { gte: now, lte: threeDaysFromNow },
      },
      include: {
        Tenant: {
          include: {
            users: { where: { Role: { name: 'ADMIN' } } },
          },
        },
      },
    });

    if (expiringTrials.length === 0) {
      appLogger.info({ job: TRIAL_REMINDER_JOB_NAME }, 'No trials expiring soon');
      return;
    }

    let sent = 0;
    for (const trial of expiringTrials) {
      const daysLeft = Math.ceil(
        (trial.end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      await eventBus.publish('trial.expiring', {
        tenantId: trial.tenant_id,
        subscriptionId: trial.id,
        serviceCode: trial.service_code,
        daysLeft,
        // @ts-ignore
        recipients: trial.Tenant.users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.full_name,
          no_hp: u.no_hp,
        })),
      });
      sent++;
    }

    appLogger.info({ job: TRIAL_REMINDER_JOB_NAME, sent }, 'trial-reminder: notifications sent');
  },
});
