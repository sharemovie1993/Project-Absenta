import { eventBus } from '@/utils/event-bus';
import { prisma } from '@/utils/prisma';
import { notificationService } from '@/services/notification.service'; 
import { SubscriptionStatus } from '@prisma/client';

class TrialAutomationSubscriber {
  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    eventBus.subscribe('trial.started', this.handleTrialStarted.bind(this));
    eventBus.subscribe('trial.expiring', this.handleTrialExpiring.bind(this));
    eventBus.subscribe('trial.expired', this.handleTrialExpired.bind(this));
    eventBus.subscribe('subscription.upgraded', this.handleTrialConverted.bind(this));
  }

  private async handleTrialStarted(payload: any) {
    await this.logSystemEvent('trial.started', payload);
    // Optional: Send a welcome email
  }

  private async handleTrialExpiring(payload: any) {
    await this.logSystemEvent('trial.expiring', payload);

    const { recipients, daysLeft, serviceCode } = payload;
    const subject = `Masa Coba ${serviceCode} Akan Berakhir`;
    const message = `Masa coba untuk layanan ${serviceCode} akan berakhir dalam ${daysLeft} hari. Segera upgrade untuk melanjutkan penggunaan.`;

    for (const recipient of recipients) {
      // In-App Notification
      await notificationService.sendInApp(recipient.id, subject, message);
      // Email Notification
      await notificationService.sendEmail(recipient.email, subject, message);
      // WhatsApp Notification
      await notificationService.sendWhatsApp(recipient.no_hp, message);
    }
  }

  private async handleTrialExpired(payload: any) {
    await this.logSystemEvent('trial.expired', payload);
    // Optional: Send an email informing that the trial has ended
  }

  private async handleTrialConverted(payload: any) {
    // Check if the upgrade came from a trial
    const originalSubscription = await prisma.subscription.findFirst({
      where: {
        id: payload.subscriptionId,
        status: SubscriptionStatus.EXPIRED, // Assuming status is EXPIRED before upgrade
        expired_reason: 'TRIAL_ENDED',
      }
    });

    if (originalSubscription) {
      await this.logSystemEvent('trial.converted', payload);
    }
  }

  private async logSystemEvent(eventType: string, payload: any) {
    try {
      await prisma.systemEventLog.create({
        data: {
          event_type: eventType,
          domain: 'billing',
          tenant_id: payload.tenantId,
          entity_type: 'subscription',
          entity_id: payload.subscriptionId,
          severity: 'INFO',
          metadata: payload,
        },
      });
    } catch (error) {
      console.error(`Failed to log system event ${eventType}:`, error);
    }
  }
}

// Initialize the subscriber
new TrialAutomationSubscriber();
