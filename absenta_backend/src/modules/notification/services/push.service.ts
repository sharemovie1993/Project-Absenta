import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import webpush from 'web-push';

export class PushService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
    
    // Initialize VAPID keys
    // In production, these should be in environment variables
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BOlOVdYypqAtw4v34doJpAD16bLVGgW1Meno0YRkWWPx5LSvWBNTJNuf37dmPdKqnCTdigoVBK4nWQ1Ss9w6zTA';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'u3NKkK1h2LC6alhcdvvD9eAgEisrF4c-YAA3zZh5m2w';
    
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:admin@absenta.com', // TODO: Configure email
        vapidPublicKey,
        vapidPrivateKey
      );
    }
  }

  /**
   * Send Web Push Notification
   */
  async sendWebPush(subscription: any, title: string, body: string, tenantId: string, event?: string, relatedId?: string) {
    try {
      const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/logo.png', // Default icon (updated to existing file)
        data: {
          url: '/parent/dashboard', // Default click action
          event,
          relatedId
        }
      });

      await webpush.sendNotification(subscription, payload, {
        TTL: 86400, // 24 hours
        headers: {
          'Urgency': 'high'
        }
      });

      // Log success
      if (tenantId) {
        await this.logNotification({
          tenantId,
          type: 'WEB_PUSH',
          recipient: subscription.endpoint,
          message: title,
          status: 'SENT',
          relatedId,
          event
        });
      }

      return true;
    } catch (error) {
      console.error('[PushService] Error sending web push:', error);
      
      // Handle 410 Gone (expired subscription)
      if ((error as any).statusCode === 410) {
        console.log('[PushService] Subscription expired, should remove from DB');
        // We can optionally remove it here if we have the ID, or let the caller handle it
      }

      if (tenantId) {
        await this.logNotification({
          tenantId,
          type: 'WEB_PUSH',
          recipient: subscription.endpoint,
          message: title,
          status: 'FAILED',
          relatedId,
          event
        });
      }
      return false;
    }
  }

  /**
   * Send Push Notification (Legacy/Stub for Mobile App)
   */
  async sendPush(_token: string, _title: string, _body: string, _tenantId: string, _event?: string, _relatedId?: string) {
    // Legacy implementation kept for compatibility
    return false;
  }

  private async logNotification(data: {
    tenantId: string;
    type: string;
    recipient: string;
    message: string;
    status: string;
    relatedId?: string;
    event?: string;
  }) {
    try {
      await this.prisma.notificationLog.create({
        data: {
          tenant_id: data.tenantId,
          type: data.type,
          recipient: data.recipient,
          message: data.message,
          status: data.status,
          related_id: data.relatedId,
          event: data.event
        }
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}

export const pushService = new PushService();
