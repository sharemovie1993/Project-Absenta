import * as nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationEvent } from '../types/notification-event.enum';
import { DEFAULT_SUPPORT_EMAIL, getSmartFrontendBaseUrl } from '../../../utils/url-helper';
import { systemConfigService } from '../../system-config/services/system-config.service';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
  correlationId?: string;
  event?: NotificationEvent | string;
  relatedId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface PaymentNotificationData {
  studentName: string;
  schoolName: string;
  amount: string;
  paymentMethod: string;
  transactionId: string;
  billingDescription: string;
  failureReason?: string;
  paidAt?: string;
  logoUrl?: string; // Added for branding
  tenantId?: string; // Added for contact resolution
}

export interface BillingReminderData {
  billingDescription: string;
  amount: number | string;
  currency?: string;
  billingDate?: string | Date;
  dueDate: string | Date;
  isOverdue: boolean;
  daysUntilDue?: number;
  paymentUrl: string;
  tenantId?: string;
  logoUrl?: string; // Added for branding
}

export interface AttendanceNotificationData {
  studentName: string;
  studentClass: string;
  schoolName: string;
  attendanceDate: string;
  attendanceStatus: 'present' | 'absent' | 'late' | 'sick' | 'permit' | 'alpa';
  isTerlambat?: boolean; // Added helper for template
  checkInTime?: string;
  checkOutTime?: string;
  location?: string;
  isOnTime?: boolean;
  lateMinutes?: number;
  notes?: string;
  attendanceSummary?: {
    present: number;
    late: number;
    absent: number;
    sick: number;
    permit: number;
  };
  logoUrl?: string; // Added for branding consistency
}

export interface TrialEndingData {
  tenantName: string;
  planName: string;
  endDate: string; // formatted string
  daysLeft: number;
  ctaUrl?: string;
  tenantId?: string;
}

export interface TrialWelcomeData {
  tenantName: string;
  setupLink?: string;
  tenantId?: string;
}

export interface TrialFeatureHighlightData {
  tenantName: string;
  ctaUrl?: string;
  tenantId?: string;
}

export interface TrialCaseStudyData {
  tenantName?: string;
  ctaUrl?: string;
  tenantId?: string;
}

export interface TrialUpgradeReminderData {
  tenantName: string;
  daysLeft: number;
  ctaUrl?: string;
  tenantId?: string;
}

export interface WelcomeLoginInfoData {
  schoolName: string;
  adminName: string;
  email: string;
  loginUrl: string;
  year: number;
  password?: string;
  logoUrl?: string; // Added for branding consistency
  tenantId?: string;
}

export interface PasswordResetSuccessData {
  userName: string;
  email: string;
  dateTime: string;
  year: number;
  logoUrl?: string; // Added for branding consistency
  tenantId?: string;
}

export interface VerificationEmailData {
  fullName: string;
  appName: string;
  appLabel: string;
  verifyUrl: string;
  companyLegalName?: string;
  year: number;
  logoUrl?: string; // Added for branding consistency
  tenantId?: string;
}

export interface PasswordResetRequestData {
  userName: string;
  resetLink: string;
  appName: string;
  year: number;
  logoUrl?: string; // Added for branding consistency
  tenantId?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    const rawHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    // Fix: localhost often resolves to IPv6 (::1) in Node 17+, but local mail services like Mailpit 
    // usually listen on IPv4 (127.0.0.1). Force 127.0.0.1 if host is exactly 'localhost'.
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
    const secureEnv = (process.env.EMAIL_SECURE ?? process.env.SMTP_SECURE ?? 'false').toString().toLowerCase();
    const secure = secureEnv === 'true' || port === 465;

    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const useAuth = !!(user && pass);

    const transportOptions: any = {
      host,
      port,
      secure,
    };

    // Include auth only when both user and pass are provided (Mailpit typically doesn't need auth)
    if (useAuth) {
      transportOptions.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    let logId: string | null = null;
    try {
      const enabled = (process.env.NOTIFICATIONS_ENABLED || 'true').toLowerCase() === 'true';
      if (!enabled) {
        await this.logNotification('EMAIL', emailData.to, emailData.subject, 'SKIPPED_DISABLED', null, undefined, emailData.tenantId, emailData.event, emailData.relatedId);
        return false;
      }

      // 1. Idempotency Check (If event provided)
      if (emailData.event && emailData.relatedId) {
         const existing = await this.prisma.notificationLog.findFirst({
           where: {
             event: emailData.event as string,
             related_id: emailData.relatedId,
             recipient: emailData.to,
             status: 'SENT'
           }
         });
         if (existing) {
           console.log(`[EmailService] Skipped duplicate event ${emailData.event} for ${emailData.to}`);
           return true;
         }

         // 2. Insert Log BEFORE Send (PENDING)
         try {
             const log = await this.prisma.notificationLog.create({
               data: {
                 tenant_id: emailData.tenantId || 'system',
                 type: 'EMAIL',
                 event: emailData.event as string,
                 recipient: emailData.to,
                 subject: emailData.subject,
                 message: emailData.subject,
                 status: 'PENDING',
                 related_id: emailData.relatedId
               }
             });
             logId = log.id;
         } catch (e) {
             console.error('[EmailService] Failed to create PENDING log (possible race condition):', e);
             return false; // Stop if we can't lock the event
         }
      }

      const tenantIdForThrottle = emailData.tenantId || null;
      let throttleSeconds = 30;
      let quietStart: string | null = null;
      let quietEnd: string | null = null;
      if (tenantIdForThrottle) {
        try {
          const cfg = await this.prisma.systemConfig.findFirst({ where: { tenant_id: tenantIdForThrottle } });
          throttleSeconds = Number(cfg?.notification_throttle_seconds || 30);
          quietStart = cfg?.quiet_hours_start || null;
          quietEnd = cfg?.quiet_hours_end || null;
        } catch {}
      }
      if (quietStart && quietEnd) {
        const now = new Date();
        const [qsH, qsM] = quietStart.split(':').map(x => parseInt(x));
        const [qeH, qeM] = quietEnd.split(':').map(x => parseInt(x));
        const start = new Date(now); start.setHours(qsH || 0, qsM || 0, 0, 0);
        const end = new Date(now); end.setHours(qeH || 0, qeM || 0, 0, 0);
        const inQuiet = start <= end ? (now >= start && now <= end) : (now >= start || now <= end);
        if (inQuiet) {
          if (logId) {
             await this.prisma.notificationLog.update({ where: { id: logId }, data: { status: 'SKIPPED_QUIET_HOURS' } });
          } else {
             await this.logNotification('EMAIL', emailData.to, emailData.subject, 'SKIPPED_QUIET_HOURS', null, undefined, emailData.tenantId, emailData.event, emailData.relatedId);
          }
          return false;
        }
      }
      
      // Throttle Check (only if not event-based, or should we throttle events too? Events are critical usually)
      // If event is provided, we might want to bypass throttle? 
      // User said "Invoice Created -> 1 email". Realtime.
      // So I will skip throttle for critical events.
      if (!emailData.event) {
          const recentWindowMs = Math.max(1, throttleSeconds) * 1000;
          const since = new Date(Date.now() - recentWindowMs);
          if (emailData.tenantId) {
            const recent = await this.prisma.notificationLog.findFirst({
              where: { tenant_id: emailData.tenantId, type: 'EMAIL', recipient: emailData.to, created_at: { gte: since } },
              orderBy: { created_at: 'desc' },
            });
            if (recent) {
              await this.logNotification('EMAIL', emailData.to, emailData.subject, 'SKIPPED', null, undefined, emailData.tenantId);
              return false;
            }
          }
      }

      const fallbackName = process.env.SMTP_FROM_NAME;
      const fallbackEmail = process.env.SMTP_FROM_EMAIL;
      const computedFrom = process.env.EMAIL_FROM || (fallbackEmail ? `${fallbackName || 'Sistem Absensi'} <${fallbackEmail}>` : `"Sistem Absensi" <${DEFAULT_SUPPORT_EMAIL}>`);
      const info = await this.transporter.sendMail({
        from: computedFrom,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments
      });

      // 3. Update Log to SENT
      if (logId) {
        await this.prisma.notificationLog.update({
          where: { id: logId },
          data: { status: 'SENT' }
        });
      } else {
        await this.logNotification('EMAIL', emailData.to, emailData.subject, 'SENT', info.messageId, undefined, emailData.tenantId, emailData.event, emailData.relatedId);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      if (logId) {
         await this.prisma.notificationLog.update({
             where: { id: logId },
             data: { status: 'FAILED' }
         });
      } else {
         await this.logNotification('EMAIL', emailData.to, emailData.subject, 'FAILED', null, (error as Error).message, emailData.tenantId, emailData.event, emailData.relatedId);
      }
      
      return false;
    }
  }

  private async resolveSupportContacts(tenantId?: string | null, prefilledText?: string) {
    try {
      const config = await systemConfigService.getActive(tenantId);
      const email = config?.support_email || DEFAULT_SUPPORT_EMAIL;
      const phone = config?.support_phone || '';
      
      let whatsappUrl = '';
      if (phone) {
        // Simple sanitization for WA link
        const cleanPhone = phone.replace(/\D/g, '');
        // Default to Indonesian 62 if starts with 0
        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
        
        const encodedText = prefilledText ? encodeURIComponent(prefilledText) : '';
        whatsappUrl = `https://wa.me/${finalPhone}${encodedText ? '?text=' + encodedText : ''}`;
      }
      
      return { 
        supportEmail: email, 
        supportWhatsappUrl: whatsappUrl,
        supportPhone: phone
      };
    } catch (error) {
      console.error('[EmailService] Failed to resolve support contacts:', error);
      return { supportEmail: DEFAULT_SUPPORT_EMAIL, supportWhatsappUrl: '', supportPhone: '' };
    }
  }

  private loadTemplate(templateName: string): string {
    const distPath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    if (fs.existsSync(distPath)) {
      return fs.readFileSync(distPath, 'utf-8');
    }
    const srcPath = path.join(process.cwd(), 'src', 'modules', 'notification', 'templates', `${templateName}.html`);
    return fs.readFileSync(srcPath, 'utf-8');
  }

  private renderTemplate(template: string, data: any): string {
    let rendered = template;
    
    // Simple template rendering - replace {{variable}} with data values
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key] || '');
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (_match, condition, content) => {
      return data[condition] ? content : '';
    });

    // Handle equality checks {{#if (eq variable 'value')}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+\(eq\s+(\w+)\s+'([^']+)'\)}}([\s\S]*?){{\/if}}/g, (_match, variable, value, content) => {
      return data[variable] === value ? content : '';
    });

    return rendered;
  }

  async sendPaymentSuccessNotification(to: string, data: PaymentNotificationData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(data.tenantId);
      const template = this.loadTemplate('payment-success');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `Pembayaran Berhasil - ${data.billingDescription}`,
        html
      });
    } catch (error) {
      console.error('Failed to send payment success notification:', error);
      return false;
    }
  }

  async sendWelcomeLoginInfo(to: string, data: WelcomeLoginInfoData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(data.tenantId);
      const template = this.loadTemplate('welcome-login-info');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `Selamat Bergabung! Informasi Login ${data.schoolName}`,
        html
      });
    } catch (error) {
      console.error('Failed to send welcome login info email:', error);
      return false;
    }
  }

  async sendPasswordResetSuccessNotification(to: string, data: PasswordResetSuccessData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(
        data.tenantId, 
        `Halo Tim Support Absenta, saya admin dari institusi yang terhubung dengan akun ${data.email}. Saya baru saja menerima notifikasi perubahan kata sandi yang bukan saya lakukan. Mohon bantuan untuk mengamankan akun saya kembali.`
      );
      const template = this.loadTemplate('password-reset-success');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `[Keamanan] Kata Sandi Anda Berhasil Diperbarui`,
        html
      });
    } catch (error) {
      console.error('Failed to send password reset success notification:', error);
      return false;
    }
  }

  async sendVerificationEmail(to: string, data: VerificationEmailData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(data.tenantId);
      const template = this.loadTemplate('email-verification');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `Penting: Verifikasi Akun ${data.appName}`,
        html
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetRequest(to: string, data: PasswordResetRequestData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(data.tenantId);
      const template = this.loadTemplate('password-reset-request');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `Lupa Kata Sandi Akun ${data.appName}`,
        html
      });
    } catch (error) {
      console.error('Failed to send password reset request email:', error);
      return false;
    }
  }

  async sendPaymentFailureNotification(to: string, data: PaymentNotificationData): Promise<boolean> {
    try {
      const support = await this.resolveSupportContacts(
        data.tenantId,
        `Halo Tim Support Absenta, saya mengalami kendala saat melakukan pembayaran sebesar ${data.amount} untuk ${data.schoolName}. Mohon bantuannya.`
      );
      const template = this.loadTemplate('payment-failure');
      const html = this.renderTemplate(template, {
        ...data,
        ...support,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      return await this.sendEmail({
        to,
        subject: `Pembayaran Gagal - ${data.billingDescription}`,
        html
      });
    } catch (error) {
      console.error('Failed to send payment failure notification:', error);
      return false;
    }
  }

  async sendBillingReminder(to: string, data: BillingReminderData): Promise<boolean> {
    try {
      const template = this.loadTemplate('billing-reminder');
      const admin = await this.prisma.user.findFirst({
        where: { email: to },
        select: { full_name: true, tenant_id: true }
      });
      const tenant = admin?.tenant_id
        ? await this.prisma.tenant.findUnique({ where: { id: admin.tenant_id }, select: { name: true } })
        : null;

      const status = data.isOverdue ? 'OVERDUE' : 'UNPAID';
      const amountNumber = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount || '0').replace(/[^\d.-]/g, '')) || 0;
      const amountIdr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amountNumber);
      const dueDateStr = new Date(data.dueDate).toLocaleDateString('id-ID');
      const billingDateStr = data.billingDate ? new Date(data.billingDate).toLocaleDateString('id-ID') : '';
      const support = await this.resolveSupportContacts(
        data.tenantId,
        `Halo Tim Support Absenta, saya admin dari ${tenant?.name || ''}, ingin bertanya mengenai tagihan sekolah nomor ${data.billingDescription || ''}.`
      );
      
      const html = this.renderTemplate(template, {
        status,
        adminName: admin?.full_name || '',
        tenantName: tenant?.name || '',
        planName: data.billingDescription || '',
        amountIdr,
        dueDateStr,
        billingDateStr,
        daysUntilDue: data.daysUntilDue ?? '',
        invoiceUrl: data.paymentUrl,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`,
        ...support
      });

      const subject = data.isOverdue 
        ? `⚠️ Pengingat Pembayaran – Dalam Masa Tenggang`
        : `🔔 Pengingat Pembayaran Langganan`;

      return await this.sendEmail({
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Failed to send billing reminder:', error);
      return false;
    }
  }

  async sendAttendanceNotification(to: string, data: AttendanceNotificationData): Promise<boolean> {
    try {
      // Map isTerlambat flag to 'late' status for the template
      if (data.attendanceStatus === 'present' && data.isTerlambat) {
        data.attendanceStatus = 'late';
      }

      const template = this.loadTemplate('attendance-alert');
      const html = this.renderTemplate(template, {
        ...data,
        logoUrl: data.logoUrl || `${getSmartFrontendBaseUrl()}/logo.png`
      });
      
      let subject = '';
      switch (data.attendanceStatus) {
        case 'present':
          subject = `${data.studentName} Hadir di Sekolah`;
          break;
        case 'absent':
          subject = `${data.studentName} Tidak Hadir di Sekolah`;
          break;
        case 'late':
          subject = `${data.studentName} Terlambat Masuk Sekolah`;
          break;
        case 'sick':
          subject = `${data.studentName} Sakit - Tidak Hadir`;
          break;
        case 'permit':
          subject = `${data.studentName} Izin - Tidak Hadir`;
          break;
        case 'alpa':
          subject = `${data.studentName} Alpa - Tidak Hadir`;
          break;
      }
      
      return await this.sendEmail({
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Failed to send attendance notification:', error);
      return false;
    }
  }

  async sendTrialEndingNotification(to: string, data: TrialEndingData): Promise<boolean> {
    try {
      const template = this.loadTemplate('trial-ending');
      const html = this.renderTemplate(template, data);
      const subject = `Trial Berakhir dalam ${data.daysLeft} hari`;
      return await this.sendEmail({ to, subject, html, tenantId: data.tenantId });
    } catch (error) {
      console.error('Failed to send trial ending notification:', error);
      return false;
    }
  }

  async sendTrialWelcome(to: string, data: TrialWelcomeData): Promise<boolean> {
    try {
      const template = this.loadTemplate('trial-welcome');
      const html = this.renderTemplate(template, data);
      const subject = 'Selamat Datang — Cara Memulai';
      return await this.sendEmail({ to, subject, html, tenantId: data.tenantId });
    } catch (error) {
      console.error('[EMAIL_SERVICE_ERROR] Failed to send trial welcome email:', error);
      return false;
    }
  }

  async sendTrialFeatureHighlight(to: string, data: TrialFeatureHighlightData): Promise<boolean> {
    try {
      const template = this.loadTemplate('trial-feature-highlight');
      const html = this.renderTemplate(template, data);
      const subject = 'Fitur Unggulan: Absensi RFID & Laporan Real-time';
      return await this.sendEmail({ to, subject, html, tenantId: data.tenantId });
    } catch (error) {
      console.error('[EMAIL_SERVICE_ERROR] Failed to send trial feature highlight email:', error);
      return false;
    }
  }

  async sendTrialCaseStudy(to: string, data: TrialCaseStudyData): Promise<boolean> {
    try {
      const template = this.loadTemplate('trial-case-study');
      const html = this.renderTemplate(template, data);
      const subject = 'Case Study: Hemat 20 jam kerja/bulan';
      return await this.sendEmail({ to, subject, html, tenantId: data.tenantId });
    } catch (error) {
      console.error('[EMAIL_SERVICE_ERROR] Failed to send trial case study email:', error);
      return false;
    }
  }

  async sendTrialUpgradeReminder(to: string, data: TrialUpgradeReminderData): Promise<boolean> {
    try {
      const template = this.loadTemplate('trial-upgrade-reminder');
      const html = this.renderTemplate(template, data);
      const subject = `Trial akan berakhir dalam ${data.daysLeft} hari — Upgrade sekarang`;
      return await this.sendEmail({ to, subject, html, tenantId: data.tenantId });
    } catch (error) {
      console.error('[EMAIL_SERVICE_ERROR] Failed to send trial upgrade reminder email:', error);
      return false;
    }
  }

  async sendTestEmail(to: string, subject: string, message: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📧 Test Email</h2>
          </div>
          <div class="content">
            <p>${message}</p>
            <p><strong>Waktu Pengiriman:</strong> ${new Date().toLocaleString('id-ID')}</p>
          </div>
          <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem notifikasi.</p>
            <p>&copy; ${new Date().getFullYear()} Sistem Absensi</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject,
      html
    });
  }

  private async logNotification(
    type: string, 
    recipient: string, 
    subject: string, 
    status: string, 
    _messageId: string | null, 
    _errorMessage?: string,
    tenantId?: string,
    event?: string | NotificationEvent,
    relatedId?: string
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          tenant_id: tenantId || 'system',
          type: type,
          recipient: recipient,
          subject: subject,
          message: subject,
          status: status,
          event: (event as string) || 'GENERAL',
          related_id: relatedId
        },
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
