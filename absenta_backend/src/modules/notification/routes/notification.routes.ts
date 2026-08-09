import { NotificationController } from '../controllers/notification.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function notificationRoutes(fastify: any) {
  const notificationController = new NotificationController();

  fastify.post('/test/email', {
    preHandler: [requireCapability("notify.send.test.email"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'subject', 'message'],
        properties: {
          email: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    handler: notificationController.sendTestEmail.bind(notificationController),
  });

  fastify.post('/test/whatsapp', {
    preHandler: [requireCapability("notify.send.test.whatsapp"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'message'],
        properties: {
          phoneNumber: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    handler: notificationController.sendTestWhatsApp.bind(notificationController),
  });

  fastify.post('/whatsapp/webhook', {
    config: { skipAuth: true },
    handler: notificationController.whatsappWebhook.bind(notificationController),
  });
  fastify.get('/whatsapp/webhook', {
    config: { skipAuth: true },
    handler: notificationController.whatsappWebhook.bind(notificationController),
  });

  fastify.post('/trial-email/welcome', {
    preHandler: [requireCapability("notify.send.test.email"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          tenantName: { type: 'string' },
          setupLink: { type: 'string' },
        },
      },
    },
    handler: notificationController.sendTrialWelcome.bind(notificationController),
  });

  fastify.post('/trial-email/feature', {
    preHandler: [requireCapability("notify.send.test.email"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          tenantName: { type: 'string' },
          ctaUrl: { type: 'string' },
        },
      },
    },
    handler: notificationController.sendTrialFeature.bind(notificationController),
  });

  fastify.post('/trial-email/case-study', {
    preHandler: [requireCapability("notify.send.test.email"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          tenantName: { type: 'string' },
          ctaUrl: { type: 'string' },
        },
      },
    },
    handler: notificationController.sendTrialCaseStudy.bind(notificationController),
  });

  fastify.post('/trial-email/upgrade-reminder', {
    preHandler: [requireCapability("notify.send.test.email"), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'daysLeft'],
        properties: {
          email: { type: 'string', format: 'email' },
          tenantName: { type: 'string' },
          ctaUrl: { type: 'string' },
          daysLeft: { type: 'number' },
        },
      },
    },
    handler: notificationController.sendTrialUpgradeReminder.bind(notificationController),
  });

  fastify.get('/logs', {
    preHandler: [requireCapability('notify.view.logs'), determineDataScope()],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          type: { type: 'string', enum: ['EMAIL', 'WHATSAPP'] },
          status: { type: 'string', enum: ['SENT', 'FAILED'] },
        },
      },
    },
    handler: notificationController.getNotificationLogs.bind(notificationController),
  });

  fastify.get('/stats', {
    preHandler: [requireCapability('notify.view.stats'), determineDataScope()],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
    handler: notificationController.getNotificationStats.bind(notificationController),
  });

  fastify.get('/my', {
    preHandler: [requireCapability('notify.view.my'), determineDataScope()],
    handler: notificationController.getUserNotifications.bind(notificationController),
  });

  fastify.get('/status', {
    preHandler: [requireCapability('notify.check.status'), determineDataScope()],
    handler: notificationController.checkServiceStatus.bind(notificationController),
  });

  fastify.get('/preferences', {
    preHandler: [requireCapability('notify.view.preferences'), determineDataScope()],
    handler: notificationController.getUserPreferences.bind(notificationController),
  });
  fastify.put('/preferences', {
    preHandler: [requireCapability('notify.update.preferences'), determineDataScope()],
    schema: {
      body: {
        type: 'object',
        properties: {
          enabledTypes: { type: 'object', additionalProperties: { type: 'boolean' } },
          digestFrequency: { type: 'string', enum: ['NONE', 'DAILY', 'WEEKLY'] },
          thresholds: {
            type: 'object',
            properties: { late: { type: 'number', minimum: 0, maximum: 1000 }, no_tap: { type: 'number', minimum: 0, maximum: 1000 } },
          },
          channels: {
            type: 'object',
            properties: {
              ATTENDANCE: {
                type: 'object',
                properties: { in_app: { type: 'boolean' }, email: { type: 'boolean' }, wa: { type: 'boolean' }, parent_email: { type: 'boolean' }, parent_wa: { type: 'boolean' } },
              },
            },
          },
        },
      },
    },
    handler: notificationController.updateUserPreferences.bind(notificationController),
  });

  fastify.post('/resend/:notificationId', {
    preHandler: [requireCapability('notify.resend'), determineDataScope()],
    schema: {
      params: {
        type: 'object',
        required: ['notificationId'],
        properties: {
          notificationId: { type: 'string' },
        },
      },
    },
    handler: notificationController.resendNotification.bind(notificationController),
  });

  fastify.post('/push/subscribe', {
    config: { skipAuth: true },
    handler: notificationController.subscribePush.bind(notificationController),
  });

  fastify.get('/push/vapid-public-key', {
    config: { skipAuth: true },
    handler: notificationController.getVapidPublicKey.bind(notificationController),
  });

  fastify.get('/push/subscriptions', {
    preHandler: [requireCapability('notify.push.view.subscriptions'), determineDataScope()],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1 },
          search: { type: 'string' }
        }
      }
    },
    handler: notificationController.listSubscriptions.bind(notificationController),
  });
}
