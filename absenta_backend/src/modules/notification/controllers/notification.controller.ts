import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { PLATFORM_TIMEZONE } from '@/infra/jobEngine';
import { EmailService } from '../services/email.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { notificationDb as prisma } from '../services/repositories/notification.db';

export class NotificationController {
  private emailService: EmailService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
  }

  async sendTestEmail(request: any, reply: any) {
    const tz = await getTenantTimezone(request.tenantId) || PLATFORM_TIMEZONE;
    appLogger.info({ tz }, 'Sending test email');
    try {
      const { email, subject, message } = request.body as {
        email: string;
        subject: string;
        message: string;
      };

      const success = await this.emailService.sendEmail({
        to: email,
        subject,
        html: message,
      });

      if (success) {
        reply.status(200).send({
          success: true,
          message: 'Test email sent successfully',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Failed to send test email',
        });
      }
    } catch (error) {
      console.error('Send test email error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async sendTestWhatsApp(request: any, reply: any) {
    try {
      const { phoneNumber, message } = request.body as {
        phoneNumber: string;
        message: string;
      };

      const tenantId = (request as any).tenantId ?? (request.user?.tenantId ?? request.user?.tenant_id ?? null);

      const formattedPhone = this.whatsappService.formatPhoneNumber(phoneNumber);
      
      const success = await this.whatsappService.sendWhatsApp({
        phoneNumber: formattedPhone,
        message,
        tenantId,
        bypassThrottleQuiet: true,
        throwOnError: true,
      });

      if (success) {
        reply.status(200).send({
          success: true,
          message: 'Test WhatsApp sent successfully',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Failed to send test WhatsApp',
        });
      }
    } catch (error: any) {
      console.error('Send test WhatsApp error:', error);
      reply.status(500).send({
        success: false,
        message: error?.message || 'Internal server error',
      });
    }
  }

  async getNotificationLogs(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      if (!tenantId) {
        return reply.status(200).send({
          success: true,
          message: 'Notification logs retrieved successfully',
          data: {
            logs: [],
            pagination: { page: 1, limit: 0, total: 0, totalPages: 0 }
          }
        });
      }
      const { page = 1, limit = 20, type, status } = request.query as {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
      };

      const skip = (page - 1) * limit;

      const where: any = {
        tenant_id: tenantId,
      };

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      const [logs, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            created_at: 'desc',
          },
        }),
        prisma.notificationLog.count({ where }),
      ]);

      reply.status(200).send({
        success: true,
        message: 'Notification logs retrieved successfully',
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get notification logs error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getNotificationStats(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      if (!tenantId) {
        return reply.status(200).send({
          success: true,
          message: 'Notification stats retrieved successfully',
          data: {
            stats: {},
            recentNotifications: [],
            period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
          }
        });
      }
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const stats = await prisma.notificationLog.groupBy({
        by: ['type', 'status'],
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: start,
            lte: end,
          },
        },
        _count: {
          id: true,
        },
      });

      const formattedStats = stats.reduce((acc: any, stat) => {
        if (!acc[stat.type]) {
          acc[stat.type] = {};
        }
        acc[stat.type][stat.status] = stat._count.id;
        return acc;
      }, {});

      // Get recent notifications
      const recentNotifications = await prisma.notificationLog.findMany({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: start,
            lte: end,
          },
          type: {
            notIn: ['WHATSAPP', 'EMAIL']
          }
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      });

      reply.send({
        success: true,
        message: 'Notification stats retrieved successfully',
        data: {
          stats: formattedStats,
          recentNotifications,
          period: { start, end },
        },
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to get notification stats',
      });
    }
  }

  async getUserNotifications(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const user = (request as any).user || null;
      const userId = user?.id;
      const roleName = user?.roleName || user?.role?.name;
      const userTenantId = user?.tenant_id ?? user?.tenantId ?? tenantId ?? null;
      const systemSuperAdmin = isSystemSuperAdmin(roleName, userTenantId);
      
      if (!tenantId && systemSuperAdmin && userId) {
        return reply.send({
          success: true,
          message: 'User notifications retrieved successfully',
          data: {
            recentNotifications: [],
          },
        });
      }

      if (!tenantId || !userId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Get user notifications
      // We assume recipient stores the userId for in-app notifications
      const recentNotifications = await prisma.notificationLog.findMany({
        where: {
          tenant_id: tenantId,
          recipient: userId,
          type: {
            notIn: ['WHATSAPP', 'EMAIL']
          }
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 20,
      });

      reply.send({
        success: true,
        message: 'User notifications retrieved successfully',
        data: {
          recentNotifications,
        },
      });
    } catch (error) {
      console.error('Get user notifications error:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to get user notifications',
      });
    }
  }

  async checkServiceStatus(_request: any, reply: any) {
    try {
      const [emailStatus, whatsappStatus] = await Promise.all([
        this.emailService.verifyConnection(),
        this.whatsappService.verifyConnection(),
      ]);

      reply.status(200).send({
        success: true,
        message: 'Service status checked successfully',
        data: {
          email: {
            status: emailStatus ? 'connected' : 'disconnected',
            configured: !!(((process.env.EMAIL_HOST || process.env.SMTP_HOST)) && ((process.env.EMAIL_PORT || process.env.SMTP_PORT))),
          },
          whatsapp: {
            status: whatsappStatus ? 'connected' : 'disconnected',
            configured: !!process.env.WHATSAPP_API_KEY,
          },
        },
      });
    } catch (error) {
      console.error('Check service status error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async resendNotification(request: any, reply: any) {
    try {
      const { notificationId } = request.params as { notificationId: string };
      const tenantId = (request as any).tenantId;

      const notification = await prisma.notificationLog.findFirst({
        where: {
          id: notificationId,
          tenant_id: tenantId,
        },
      });

      if (!notification) {
        reply.status(404).send({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      let success = false;

      if (notification.type === 'EMAIL') {
        success = await this.emailService.sendEmail({
          to: notification.recipient,
          subject: notification.subject || 'Resent Notification',
          html: notification.message,
        });
      } else if (notification.type === 'WHATSAPP') {
        success = await this.whatsappService.sendWhatsApp({
          phoneNumber: notification.recipient,
          message: notification.message,
          tenantId,
          relatedId: notification.related_id || undefined,
        });
      }

      if (success) {
        reply.status(200).send({
          success: true,
          message: 'Notification resent successfully',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Failed to resend notification',
        });
      }
    } catch (error) {
      console.error('Resend notification error:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async sendTrialWelcome(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { email, setupLink, tenantName } = request.body || {};
      const ok = await this.emailService.sendTrialWelcome(email, { tenantName, setupLink, tenantId });
      return reply.status(ok ? 200 : 500).send({ success: ok, message: ok ? 'Sent' : 'Failed' });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async sendTrialFeature(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { email, ctaUrl, tenantName } = request.body || {};
      const ok = await this.emailService.sendTrialFeatureHighlight(email, { tenantName, ctaUrl, tenantId });
      return reply.status(ok ? 200 : 500).send({ success: ok, message: ok ? 'Sent' : 'Failed' });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async sendTrialCaseStudy(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { email, ctaUrl, tenantName } = request.body || {};
      const ok = await this.emailService.sendTrialCaseStudy(email, { tenantName, ctaUrl, tenantId });
      return reply.status(ok ? 200 : 500).send({ success: ok, message: ok ? 'Sent' : 'Failed' });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async sendTrialUpgradeReminder(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { email, ctaUrl, tenantName, daysLeft } = request.body || {};
      const ok = await this.emailService.sendTrialUpgradeReminder(email, { tenantName, daysLeft, ctaUrl, tenantId });
      return reply.status(ok ? 200 : 500).send({ success: ok, message: ok ? 'Sent' : 'Failed' });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async getUserPreferences(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const userId = (request as any).user?.id;
      const userRole = (request as any).user?.roleName;
      const userTenant = (request as any).user?.tenantId ?? (request as any).user?.tenant_id ?? null;
      if (!tenantId || !userId) {
        const superAdmin = isSystemSuperAdmin(userRole, userTenant);
        if (!superAdmin) {
          reply.status(401);
          return { success: false, message: 'Unauthorized' };
        }
        const data = {
          enabledTypes: { ATTENDANCE: true },
          digestFrequency: 'NONE',
          thresholds: { late: 5, no_tap: 5 },
          channels: { ATTENDANCE: { in_app: true, email: false, wa: false, parent_email: false, parent_wa: false } },
        };
        return reply.status(200).send({ success: true, message: 'OK', data });
      }
      const pref = await (prisma as any).notificationPreference.findFirst({
        where: { tenant_id: tenantId, user_id: userId },
      });
      const cfg = await prisma.systemConfig.findFirst({ where: { tenant_id: tenantId } });
      const data = {
        enabledTypes: (pref?.enabled_types_json as any) || { ATTENDANCE: true },
        digestFrequency: (pref?.digest_frequency as any) || 'NONE',
        thresholds: (pref?.thresholds_json as any) || { late: Number(cfg?.default_late_threshold || 5), no_tap: Number(cfg?.default_notap_threshold || 5) },
        channels: (pref?.channels_json as any) || { ATTENDANCE: { in_app: true, email: !!cfg?.default_attendance_email, wa: !!cfg?.default_attendance_wa, parent_email: !!cfg?.default_parent_email, parent_wa: !!cfg?.default_parent_wa } },
      };
      return reply.status(200).send({ success: true, message: 'OK', data });
    } catch (error) {
      console.error('Get user preferences error:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async updateUserPreferences(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const userId = (request as any).user?.id;
      const { enabledTypes, digestFrequency, thresholds, channels } = request.body || {};
      if (!tenantId || !userId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      if (thresholds) {
        const late = Number(thresholds.late ?? 5);
        const noTap = Number(thresholds.no_tap ?? 5);
        if (Number.isNaN(late) || Number.isNaN(noTap) || late < 0 || noTap < 0 || late > 1000 || noTap > 1000) {
          reply.status(400);
          return { success: false, message: 'Invalid thresholds range' };
        }
      }
      const updated = await (prisma as any).notificationPreference.upsert({
        where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
        update: {
          enabled_types_json: enabledTypes || undefined,
          digest_frequency: digestFrequency || undefined,
          thresholds_json: thresholds || undefined,
          channels_json: channels || undefined,
          updated_at: new Date(),
        },
        create: {
          tenant_id: tenantId,
          user_id: userId,
          enabled_types_json: enabledTypes || { ATTENDANCE: true },
          digest_frequency: digestFrequency || 'NONE',
          thresholds_json: thresholds || { late: 5, no_tap: 5 },
          channels_json: channels || { ATTENDANCE: { in_app: true, email: false, wa: false } },
        },
      });
      return reply.status(200).send({ success: true, message: 'Saved', data: { id: updated.id } });
    } catch (error) {
      console.error('Update user preferences error:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async whatsappWebhook(request: any, reply: any) {
    try {
      const tenantId = (request.headers['x-tenant-id'] as string) || (request as any).tenantId || 'system';
      const secret = process.env.WHATSAPP_WEBHOOK_SECRET || '';
      const headerToken = (request.headers['x-callback-token'] as string) || (request.headers['x-whatsapp-signature'] as string) || '';
      const bodyToken = (request.body?.token as string) || '';
      if (secret && secret.length > 0) {
        const ok = headerToken === secret || bodyToken === secret;
        if (!ok) {
          reply.status(401).send({ success: false, message: 'Unauthorized webhook' });
          return;
        }
      }
      const payload = request.body || {};
      const recipient = payload.target || payload.phone || payload.recipient || '';
      const status = String(payload.status || 'DELIVERED').toUpperCase();
      const relatedId = payload.relatedId || payload.messageId || undefined;
      const message = payload.message || payload.text || 'WhatsApp webhook update';

      await prisma.notificationLog.create({
        data: {
          tenant_id: tenantId,
          type: 'WHATSAPP',
          recipient: recipient || 'unknown',
          subject: 'WhatsApp Webhook',
          message,
          status: status.includes('FAIL') ? 'FAILED' : 'SENT',
          related_id: relatedId,
        },
      });

      reply.status(200).send({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async subscribePush(request: any, reply: any) {
    try {
      const { subscription, orangTuaId, userAgent } = request.body;
      
      if (!subscription || !subscription.endpoint || !orangTuaId) {
        return reply.status(400).send({ success: false, message: 'Invalid subscription data' });
      }

      // Upsert subscription
      const prismaAny = prisma as any;
      
      await prismaAny.parentPushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          orang_tua_id: orangTuaId,
          keys_json: subscription.keys,
          user_agent: userAgent || request.headers['user-agent'],
          updated_at: new Date()
        },
        create: {
          orang_tua_id: orangTuaId,
          endpoint: subscription.endpoint,
          keys_json: subscription.keys,
          user_agent: userAgent || request.headers['user-agent']
        }
      });

      return reply.send({ success: true, message: 'Subscription saved' });
    } catch (error) {
      console.error('Subscribe push error:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async getVapidPublicKey(_request: any, reply: any) {
    return reply.send({ 
      success: true, 
      publicKey: process.env.VAPID_PUBLIC_KEY || 'BOlOVdYypqAtw4v34doJpAD16bLVGgW1Meno0YRkWWPx5LSvWBNTJNuf37dmPdKqnCTdigoVBK4nWQ1Ss9w6zTA' 
    });
  }

  async registerFcmToken(request: any, reply: any) {
    try {
      const { orangTuaId, fcmToken, platform, deviceInfo } = request.body || {};
      if (!orangTuaId || !fcmToken) {
        return reply.status(400).send({ success: false, message: 'orangTuaId dan fcmToken wajib diisi' });
      }
      const prismaAny = prisma as any;
      await prismaAny.parentFcmToken.upsert({
        where: { token: fcmToken },
        update: {
          orang_tua_id: orangTuaId,
          platform: platform || 'android',
          device_info: deviceInfo || null,
          updated_at: new Date()
        },
        create: {
          orang_tua_id: orangTuaId,
          token: fcmToken,
          platform: platform || 'android',
          device_info: deviceInfo || null
        }
      });
      return reply.send({ success: true, message: 'FCM token registered' });
    } catch (error) {
      console.error('Register FCM token error:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }

  async listSubscriptions(request: any, reply: any) {
    try {
      const { page = 1, limit = 10, search = '' } = request.query as any;
      const skip = (Number(page) - 1) * Number(limit);
      
      const prismaAny = prisma as any;
      
      const where: any = {};
      if (search) {
        where.OR = [
          { endpoint: { contains: search, mode: 'insensitive' } },
          { OrangTua: { nama: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [data, total] = await Promise.all([
        prismaAny.parentPushSubscription.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { updated_at: 'desc' },
          include: {
            OrangTua: {
              select: {
                id: true,
                nama: true,
                no_hp: true
              }
            }
          }
        }),
        prismaAny.parentPushSubscription.count({ where })
      ]);

      return reply.send({
        success: true,
        data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('List subscriptions error:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }
}
