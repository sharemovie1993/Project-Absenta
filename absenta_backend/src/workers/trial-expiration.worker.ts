import { prisma } from '@/utils/prisma';
import { SubscriptionStatus } from '@prisma/client';
import { eventBus } from '@/utils/event-bus';
import { Worker, Job } from 'bullmq';
import { registerQueue, markJobStart, markJobEnd } from '@/infra/jobRegistry';

export const TRIAL_MANAGEMENT_QUEUE = 'trial-management';
const JOB_NAME = 'trial-expiration-check';

class TrialExpirationWorker {
  worker: Worker;

  constructor(connection: any) {
    // Register queue for monitoring in Infra Control Center
    void registerQueue(TRIAL_MANAGEMENT_QUEUE, 5);

    this.worker = new Worker(TRIAL_MANAGEMENT_QUEUE, this.process.bind(this), {
      connection,
      concurrency: 5,
    });

    console.log('Trial Expiration Worker started.');
  }

  private async process(job: Job): Promise<void> {
    if (job.name !== JOB_NAME) return;

    await markJobStart(TRIAL_MANAGEMENT_QUEUE);
    const startTime = Date.now();

    try {
      const now = new Date();
      const expiredTrials = await prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIAL,
          end_date: { lte: now },
        },
      });

      if (expiredTrials.length === 0) {
        console.log('No expired trials found.');
        await markJobEnd(TRIAL_MANAGEMENT_QUEUE, Date.now() - startTime);
        return;
      }

      for (const trial of expiredTrials) {
        await prisma.subscription.update({
          where: { id: trial.id },
          data: { 
            status: SubscriptionStatus.EXPIRED,
            expired_reason: 'TRIAL_ENDED',
          },
        });

        await eventBus.publish('trial.expired', {
          tenantId: trial.tenant_id,
          subscriptionId: trial.id,
          serviceCode: trial.service_code,
        });

        console.log(`Trial for tenant ${trial.tenant_id} (service: ${trial.service_code}) has expired.`);
      }

      await markJobEnd(TRIAL_MANAGEMENT_QUEUE, Date.now() - startTime);
    } catch (error) {
      console.error('Error processing trial expiration:', error);
      await markJobEnd(TRIAL_MANAGEMENT_QUEUE, Date.now() - startTime);
      throw error;
    }
  }

  async close() {
    await this.worker.close();
  }
}

let trialWorkerInstance: TrialExpirationWorker | null = null;

export const startTrialExpirationWorker = (connection: any) => {
  if (!trialWorkerInstance) {
    trialWorkerInstance = new TrialExpirationWorker(connection);
  }
  return trialWorkerInstance;
};

export const stopTrialExpirationWorker = async () => {
  if (trialWorkerInstance) {
    await trialWorkerInstance.close();
    trialWorkerInstance = null;
  }
};

