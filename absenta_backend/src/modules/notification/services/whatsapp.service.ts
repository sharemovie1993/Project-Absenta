import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { resolveBaseUrlFromRequest, getSmartFrontendBaseUrl } from '../../../utils/url-helper';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import { randomBytes } from 'crypto';
import { tenantEntitlementService } from '@/modules/billing/services/tenant-entitlement.service';
import { waGatewayService } from '../../../services/wa-gateway.service';



export interface WhatsAppOptions {
  phoneNumber: string;
  message: string;
  tenantId: string | null;
  relatedId?: string;
  event?: string;
  bypassThrottleQuiet?: boolean;
  throwOnError?: boolean;
  subject?: string;
  force?: boolean;
}

export async function buildPublicInvoiceUrl(invoiceId: string, tenantId: string, ttlOverrideSeconds?: number): Promise<string | null> {
  try {
    const existing = await cacheService.get<string>(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId));
    const token = existing && existing.length > 0 ? existing : randomBytes(32).toString('hex');
    if (!existing) {
      const ttlSeconds = (() => {
        const envTtl = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
        if (typeof ttlOverrideSeconds === 'number' && ttlOverrideSeconds > 0) return ttlOverrideSeconds;
        return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (7 * 24 * 60 * 60);
      })();
      const expiry = Date.now() + ttlSeconds * 1000;
      await cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token), { invoice_id: invoiceId, tenant_id: tenantId, created_at: Date.now(), expiry }, ttlSeconds);
      await cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoiceId), token, ttlSeconds);
      try {
        const { persistPublicInvoiceToken } = await import('../../../utils/publicInvoiceToken');
        await persistPublicInvoiceToken(invoiceId, tenantId, token, ttlSeconds);
      } catch {}
    }
    const appBase = resolveBaseUrlFromRequest(undefined, { fallbackVar: 'API_URL' });
    const normalizedBase = String(appBase).replace(/\/+$/, '');
    return `${normalizedBase}/invoice/public/${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

export class WhatsAppService {
  private prisma: PrismaClient;
  private apiUrl: string;
  private apiKey: string;
  private getLogPath() {
    const p = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'backend.log');
    try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
    return p;
  }
  private appendFileLog(entry: any) {
    try { fs.appendFileSync(this.getLogPath(), JSON.stringify(entry) + '\n'); } catch {}
  }

  constructor() {
    this.prisma = new PrismaClient();
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send';
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
  }
  private redactSensitive(text: string): string {
    try {
      let out = String(text || '');
      out = out.replace(/(Password:\s*)(.+)/i, (_m, p1) => `${p1}********`);
      return out;
    } catch {
      return text;
    }
  }

  private async hasSentPhase(tenantId: string, invoiceId: string, phase: 'H-7' | 'H-3' | 'H+1' | 'OVERDUE' | 'SUSPENDED'): Promise<boolean> {
    try {
      const existing = await this.prisma.notificationLog.findFirst({
        where: {
          tenant_id: tenantId,
          type: 'WHATSAPP',
          related_id: invoiceId
        },
        orderBy: { created_at: 'desc' }
      });
      if (!existing) return false;
      return typeof existing.message === 'string' && existing.message.includes(`[WA_PHASE:${phase}]`);
    } catch {
      return false;
    }
  }

  private withPhaseTag(message: string, phase?: 'H-7' | 'H-3' | 'H+1' | 'OVERDUE' | 'SUSPENDED'): string {
    if (!phase) return message;
    return `${message}\n\n[WA_PHASE:${phase}]`;
  }

  async sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
    try {
      const enabled = (process.env.NOTIFICATIONS_ENABLED || 'true').toLowerCase() === 'true';
      if (!enabled) {
        if (options.tenantId) {
          await this.logNotification({ tenantId: options.tenantId, type: 'WHATSAPP', recipient: options.phoneNumber, message: this.redactSensitive(options.message), status: 'SKIPPED_DISABLED', relatedId: options.relatedId, event: options.event });
        }
        return false;
      }

      // 1. Idempotency Check
      if (options.event && options.relatedId && options.tenantId && !options.force) {
         const existing = await this.prisma.notificationLog.findFirst({
           where: {
             tenant_id: options.tenantId,
             event: options.event,
             related_id: options.relatedId,
             recipient: options.phoneNumber,
             status: 'SENT'
           }
         });
         if (existing) {
           // console.log(`[WhatsAppService] Skipped duplicate event ${options.event} for ${options.phoneNumber}`);
           return true; 
         }
      }

      const hasTenant = typeof options.tenantId === 'string' && options.tenantId.length > 0;
      const bypass = !!options.bypassThrottleQuiet;
      if (hasTenant && !bypass && !options.event) { // Skip throttle if event is critical (has event name)
        let throttleSeconds = 30;
        let quietStart: string | null = null;
        let quietEnd: string | null = null;
        try {
          const cfg = await this.prisma.systemConfig.findFirst({ where: { tenant_id: options.tenantId! } });
          throttleSeconds = Number(cfg?.notification_throttle_seconds || 30);
          quietStart = cfg?.quiet_hours_start || null;
          quietEnd = cfg?.quiet_hours_end || null;
        } catch {}
        if (quietStart && quietEnd) {
          const now = new Date();
          const [qsH, qsM] = quietStart.split(':').map(x => parseInt(x));
          const [qeH, qeM] = quietEnd.split(':').map(x => parseInt(x));
          const start = new Date(now); start.setHours(qsH || 0, qsM || 0, 0, 0);
          const end = new Date(now); end.setHours(qeH || 0, qeM || 0, 0, 0);
          const inQuiet = start <= end ? (now >= start && now <= end) : (now >= start || now <= end);
          if (inQuiet) {
            await this.logNotification({ tenantId: options.tenantId!, type: 'WHATSAPP', recipient: options.phoneNumber, message: this.redactSensitive(options.message), status: 'SKIPPED_QUIET_HOURS', relatedId: options.relatedId, subject: options.subject });
            return false;
          }
        }
        const recentWindowMs = Math.max(1, throttleSeconds) * 1000;
        const since = new Date(Date.now() - recentWindowMs);
        const recent = await this.prisma.notificationLog.findFirst({
          where: { tenant_id: options.tenantId!, type: 'WHATSAPP', recipient: options.phoneNumber, created_at: { gte: since } },
          orderBy: { created_at: 'desc' },
        });
        if (recent) {
          await this.logNotification({ tenantId: options.tenantId!, type: 'WHATSAPP', recipient: options.phoneNumber, message: this.redactSensitive(options.message), status: 'SKIPPED', relatedId: options.relatedId, subject: options.subject });
          return false;
        }
      }

      // 2. Resolve Gateway Config (BYOG vs Platform)
      let currentApiUrl = this.apiUrl;
      let currentApiKey = this.apiKey;
      let currentDeviceId: string | undefined = process.env.WHATSAPP_DEVICE_ID;

      if (hasTenant) {
        // Check if tenant has WHATSAPP feature enabled
        const features = await tenantEntitlementService.resolveTenantFeatures(options.tenantId!);
        if (!features.includes('WHATSAPP')) {
          await this.logNotification({ tenantId: options.tenantId!, type: 'WHATSAPP', recipient: options.phoneNumber, message: this.redactSensitive(options.message), status: 'SKIPPED_FEATURE_LOCKED', relatedId: options.relatedId, event: options.event });
          return false;
        }

        // Look for custom config
        const customConfig = await this.prisma.whatsappConfig.findUnique({
          where: { tenant_id: options.tenantId! }
        });

        if (customConfig && customConfig.is_active) {
          if (customConfig.provider_name === 'LOCAL') {
            try {
              const success = await waGatewayService.sendMessage(options.tenantId!, options.phoneNumber, options.message);
              if (success) {
                await this.logNotification({
                  tenantId: options.tenantId!,
                  type: 'WHATSAPP',
                  recipient: options.phoneNumber,
                  message: this.redactSensitive(options.message),
                  status: 'SENT',
                  relatedId: options.relatedId,
                  subject: options.subject,
                  event: options.event,
                });
                return true;
              }
            } catch (error: any) {
              console.error(`[WhatsAppService] Failed to send via local gateway for tenant ${options.tenantId!}:`, error.message);
              await this.logNotification({
                tenantId: options.tenantId!,
                type: 'WHATSAPP',
                recipient: options.phoneNumber,
                message: this.redactSensitive(options.message),
                status: 'FAILED',
                relatedId: options.relatedId,
                subject: options.subject,
              });
              if (options.throwOnError) {
                throw error;
              }
              return false;
            }
          } else if (customConfig.api_url && customConfig.api_token) {
            currentApiUrl = customConfig.api_url;
            currentApiKey = customConfig.api_token;
            currentDeviceId = undefined; // BYOG usually doesn't need platform device id
          }
        }
      }

      // If local gateway was processed, we already returned. Otherwise, we verify external api key.
      const isLocalProvider = hasTenant && (await this.prisma.whatsappConfig.findUnique({ where: { tenant_id: options.tenantId! } }))?.provider_name === 'LOCAL';
      if (!isLocalProvider && !currentApiKey) {
        throw new Error('WhatsApp API key not configured');
      }

      // 3. Send via resolved gateway
      // Note: If BYOG, we might need to handle different provider formats.
      // For now, we assume Fonnte-compatible or standard POST as per our previous design.
      
      const paramsPrimary: Record<string, string> = { target: options.phoneNumber, message: options.message };
      if (currentDeviceId && String(currentDeviceId).trim().length > 0) {
        paramsPrimary.device = String(currentDeviceId).trim();
      }
      const formBody = new URLSearchParams(paramsPrimary).toString();
      let response = await fetch(currentApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': currentApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formBody,
      });
      let result: any = undefined;
      try {
        result = await response.json();
      } catch {
        result = undefined;
      }
      if (!(response.ok && (result?.status || result?.success))) {
        // Fallback attempt: JSON body
        const paramsFallback: Record<string, string> = { target: options.phoneNumber, message: options.message };
        if (currentDeviceId && String(currentDeviceId).trim().length > 0) {
          (paramsFallback as any).device = String(currentDeviceId).trim();
        }
        response = await fetch(currentApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': currentApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(paramsFallback),
        });
        try {
          result = await response.json();
        } catch {
          result = undefined;
        }
      }

      if (response.ok && (result?.status || result?.success)) {
        // Log successful notification
        if (hasTenant) {
          await this.logNotification({
            tenantId: options.tenantId!,
            type: 'WHATSAPP',
            recipient: options.phoneNumber,
            message: this.redactSensitive(options.message),
            status: 'SENT',
            relatedId: options.relatedId,
            subject: options.subject,
            event: options.event,
          });
        }

        return true;
      } else {
        const reason = (result && (result.reason || result.message)) || `HTTP ${response.status}`;
        throw new Error(reason);
      }
    } catch (error) {
      console.error('WhatsApp sending failed:', error);

      // Log failed notification
      if (typeof options.tenantId === 'string' && options.tenantId.length > 0) {
        await this.logNotification({
          tenantId: options.tenantId!,
          type: 'WHATSAPP',
          recipient: options.phoneNumber,
          message: this.redactSensitive(options.message),
          status: 'FAILED',
          relatedId: options.relatedId,
          subject: options.subject,
        });
      }

      if (options.throwOnError) {
        throw error;
      }

      return false;
    }
  }

  async sendPaymentSuccessWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    recipientPhone: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
    billingId: string;
  }): Promise<boolean> {
    const message = this.generatePaymentSuccessMessage(data);
    this.appendFileLog({ type: 'wa_payment_success_notify_attempt', tenantId: data.tenantId, phone: data.recipientPhone, invoiceNumber: data.invoiceNumber, amount: data.amount, paymentMethod: data.paymentMethod, relatedId: data.billingId, ts: Date.now() });
    const ok = await this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.billingId,
    });
    this.appendFileLog({ type: ok ? 'wa_payment_success_notify_sent' : 'wa_payment_success_notify_failed', tenantId: data.tenantId, phone: data.recipientPhone, invoiceNumber: data.invoiceNumber, amount: data.amount, paymentMethod: data.paymentMethod, relatedId: data.billingId, ts: Date.now() });
    return ok;
  }

  private generatePaymentSuccessMessage(data: {
    tenantName: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
  }): string {
    return `Halo ${data.tenantName} 👋

Pembayaran invoice ${data.invoiceNumber} sebesar *Rp ${data.amount.toLocaleString('id-ID')}* telah *berhasil* ✅

📋 Detail Pembayaran:
• Invoice: ${data.invoiceNumber}
• Jumlah: Rp ${data.amount.toLocaleString('id-ID')}
• Metode: ${data.paymentMethod}
• Status: *PAID*

Terima kasih atas kerja samanya. Layanan Anda akan tetap aktif sesuai dengan paket yang telah dibayar.

---
Pesan ini dikirim secara otomatis oleh Sistem Absensi Multitenant`;
  }

  async sendBillingReminderWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    recipientPhone: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    billingId: string;
  }): Promise<boolean> {
    const message = this.generateBillingReminderMessage(data);

    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.billingId,
    });
  }

  private generateBillingReminderMessage(data: {
    tenantName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
  }): string {
    const dueDateStr = data.dueDate.toLocaleDateString('id-ID');
    
    return `Halo ${data.tenantName} 👋

⏰ *Pengingat Pembayaran*

Invoice ${data.invoiceNumber} akan jatuh tempo pada *${dueDateStr}*

💰 Detail Tagihan:
• Invoice: ${data.invoiceNumber}
• Jumlah: *Rp ${data.amount.toLocaleString('id-ID')}*
• Jatuh Tempo: ${dueDateStr}
• Status: UNPAID

Mohon segera lakukan pembayaran untuk menghindari gangguan layanan.

👉 ${getSmartFrontendBaseUrl() + '/billing/subscriptions'}

---
Pesan ini dikirim secara otomatis oleh Sistem Absensi Multitenant`;
  }

  async sendBillingUnpaidWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    adminName: string;
    recipientPhone: string;
    planName: string;
    amount: number;
    dueDate: Date;
    invoiceId: string;
    billingId: string;
    phase?: 'H-7' | 'H-3';
  }): Promise<boolean> {
    if (data.phase && await this.hasSentPhase(data.tenantId, data.invoiceId, data.phase)) {
      return false;
    }
    const invoiceUrl = await buildPublicInvoiceUrl(data.invoiceId, data.tenantId);
    const amountStr = `Rp ${data.amount.toLocaleString('id-ID')}`;
    const dueStr = data.dueDate.toLocaleDateString('id-ID');
    const messageBase = `🔔 Pengingat Pembayaran

Halo ${data.adminName},
Tagihan langganan TRAE Absensi untuk ${data.tenantName} akan segera jatuh tempo.

💼 Paket: ${data.planName}
💳 Total: ${amountStr}
📅 Jatuh tempo: ${dueStr}

👉 Bayar sekarang:
${invoiceUrl || ''}`;
    const message = this.withPhaseTag(messageBase, data.phase);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.invoiceId,
    });
  }

  async sendBillingOverdueWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    adminName: string;
    recipientPhone: string;
    amount: number;
    dueDate: Date;
    invoiceId: string;
    billingId: string;
    phase?: 'H+1' | 'OVERDUE';
  }): Promise<boolean> {
    if (data.phase && await this.hasSentPhase(data.tenantId, data.invoiceId, data.phase)) {
      return false;
    }
    const invoiceUrl = await buildPublicInvoiceUrl(data.invoiceId, data.tenantId);
    const amountStr = `Rp ${data.amount.toLocaleString('id-ID')}`;
    const dueStr = data.dueDate.toLocaleDateString('id-ID');
    const messageBase = `⚠️ Pembayaran Belum Diterima

Halo ${data.adminName},
Tagihan langganan ${data.tenantName} telah melewati tanggal jatuh tempo.

💳 Total: ${amountStr}
📅 Jatuh tempo: ${dueStr}

Layanan masih aktif dalam masa tenggang.
👉 Lanjutkan pembayaran:
${invoiceUrl || ''}`;
    const message = this.withPhaseTag(messageBase, data.phase);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.invoiceId,
    });
  }

  async sendBillingSuspendedWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    adminName: string;
    recipientPhone: string;
    invoiceId: string;
    billingId?: string;
    phase?: 'SUSPENDED';
  }): Promise<boolean> {
    if (data.phase && await this.hasSentPhase(data.tenantId, data.invoiceId, data.phase)) {
      return false;
    }
    const invoiceUrl = await buildPublicInvoiceUrl(data.invoiceId, data.tenantId);
    const messageBase = `⛔ Langganan Ditangguhkan

Halo ${data.adminName},
Langganan TRAE Absensi untuk ${data.tenantName} saat ini ditangguhkan sementara
karena pembayaran belum kami terima.

👉 Aktifkan kembali layanan:
${invoiceUrl || ''}`;
    const message = this.withPhaseTag(messageBase, data.phase);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.invoiceId,
    });
  }

  async sendTenantRegistrationWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    adminName: string;
    recipientPhone: string;
    appUrl: string;
    planName?: string;
    subscriptionStatus?: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE';
    trialDays?: number;
    billingCycleMonths?: number;
    initialAmount?: number;
    paymentUrl?: string;
    tenantLoginUrl?: string;
    verifyUrl?: string;
    fallbackVerifyUrl?: string;
    adminEmail?: string;
    adminPassword?: string;
  }): Promise<boolean> {
    const message = this.generateTenantRegistrationMessage(data);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.tenantId,
    });
  }

  private generateTenantRegistrationMessage(data: {
    tenantName: string;
    adminName: string;
    appUrl: string;
    planName?: string;
    subscriptionStatus?: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE';
    trialDays?: number;
    billingCycleMonths?: number;
    initialAmount?: number;
    paymentUrl?: string;
    tenantLoginUrl?: string;
    verifyUrl?: string;
    fallbackVerifyUrl?: string;
    adminEmail?: string;
    adminPassword?: string;
  }): string {
    const plan = data.planName && data.planName.trim().length > 0 ? data.planName : 'Paket';
    let statusLine = 'Status: Free Trial 30 hari';
    if (data.subscriptionStatus === 'TRIAL') {
      const days = typeof data.trialDays === 'number' && data.trialDays > 0 ? data.trialDays : 30;
      statusLine = `Status: Free Trial ${days} hari`;
    } else if (data.subscriptionStatus === 'PENDING_PAYMENT') {
      const months = typeof data.billingCycleMonths === 'number' && data.billingCycleMonths > 0 ? data.billingCycleMonths : undefined;
      const amountStr = typeof data.initialAmount === 'number' ? `Tagihan awal: *Rp ${data.initialAmount.toLocaleString('id-ID')}*` : '';
      const periodStr = months ? `Periode: ${months} bulan` : '';
      statusLine = `Status: ${plan} — Menunggu Pembayaran${periodStr ? `\n${periodStr}` : ''}${amountStr ? `\n${amountStr}` : ''}`;
    } else if (data.subscriptionStatus === 'ACTIVE') {
      const months = typeof data.billingCycleMonths === 'number' && data.billingCycleMonths > 0 ? data.billingCycleMonths : undefined;
      const periodStr = months ? `\nPeriode: ${months} bulan` : '';
      statusLine = `Status: ${plan} — Aktif${periodStr}`;
    }
    const loginLink = (data.tenantLoginUrl && data.tenantLoginUrl.trim().length > 0) ? data.tenantLoginUrl : data.appUrl;
    let verifyLine = '• Verifikasi email admin';
    const hasFallback = !!(data.fallbackVerifyUrl && data.fallbackVerifyUrl.trim().length > 0);
    if (hasFallback) {
      verifyLine = `• Verifikasi email admin:\n👉 ${data.fallbackVerifyUrl}\n`;
    }
    const includeCreds = (process.env.WA_INCLUDE_CREDENTIALS || 'false').toLowerCase() === 'true';
    const mask = (process.env.WA_MASK_PASSWORD || 'true').toLowerCase() !== 'false';
    const maskedPassword = (() => {
      const p = data.adminPassword || '';
      if (!mask) return p;
      if (!p || p.length < 3) return '********';
      return p[0] + '***' + p[p.length - 1];
    })();
    const credsBlock = includeCreds && data.adminEmail ? `\nKredensial Akun:\n• Email: ${data.adminEmail}\n• Password: ${data.adminPassword ? (mask ? maskedPassword : data.adminPassword) : '********'}\n` : '';
    return `Halo ${data.adminName},

Akun sekolah ${data.tenantName} berhasil didaftarkan di TRAE Absensi 🎉
${statusLine}

Langkah awal:
 ${verifyLine.trim()}
 • Lengkapi profil & data sekolah
 • Tambahkan kelas, guru, dan siswa
 • Buat sesi absensi pertama

Login:
 👉 ${loginLink}
${data.subscriptionStatus === 'PENDING_PAYMENT' && data.paymentUrl ? `\nPembayaran:\n👉 ${data.paymentUrl}\n` : ''}
${credsBlock}

Butuh bantuan? Balas pesan ini atau hubungi dukungan TRAE.`;
  }

  async sendTrialReminderWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    recipientPhone: string;
    daysLeft: number;
    billingUrl: string;
  }): Promise<boolean> {
    const message = this.generateTrialReminderMessage(data);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.tenantId,
    });
  }

  private generateTrialReminderMessage(data: {
    tenantName: string;
    daysLeft: number;
    billingUrl: string;
  }): string {
    return `Pengingat Trial ⏳

Trial ${data.tenantName} akan berakhir dalam ${data.daysLeft} hari.
Untuk menghindari gangguan layanan, silakan lakukan aktivasi paket.

👉 ${data.billingUrl}`;
  }

  async sendTrialExpiredWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    recipientPhone: string;
    billingUrl: string;
  }): Promise<boolean> {
    const message = this.generateTrialExpiredMessage(data);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.tenantId,
    });
  }

  private generateTrialExpiredMessage(data: {
    tenantName: string;
    billingUrl: string;
  }): string {
    return `Trial Berakhir ⚠️

Masa trial ${data.tenantName} telah berakhir.
Akses kini terbatas hingga pembayaran dilakukan.

Aktifkan kembali layanan:
👉 ${data.billingUrl}`;
  }

  async sendSubscriptionRenewalReminderWhatsApp(data: {
    tenantId: string;
    tenantName: string;
    recipientPhone: string;
    endDate: Date;
    billingUrl: string;
  }): Promise<boolean> {
    const message = this.generateSubscriptionRenewalReminderMessage(data);
    return this.sendWhatsApp({
      phoneNumber: data.recipientPhone,
      message,
      tenantId: data.tenantId,
      relatedId: data.tenantId,
    });
  }

  private generateSubscriptionRenewalReminderMessage(data: {
    tenantName: string;
    endDate: Date;
    billingUrl: string;
  }): string {
    const endDateStr = data.endDate.toLocaleDateString('id-ID');
    return `Langganan Akan Berakhir ⏳

Langganan ${data.tenantName} akan berakhir pada ${endDateStr}.
Silakan lakukan perpanjangan agar layanan tidak terhenti.

👉 ${data.billingUrl}`;
  }

  private async logNotification(data: {
    tenantId: string;
    type: string;
    recipient: string;
    message: string;
    status: string;
    relatedId?: string;
    subject?: string;
    event?: string;
  }) {
    try {
      const eventName = data.event || 'GENERAL';
      const relatedId = data.relatedId || null;

      if (relatedId) {
        const existing = await this.prisma.notificationLog.findFirst({
          where: {
            event: eventName,
            related_id: relatedId,
            recipient: data.recipient,
          },
        });

        if (existing) {
          await this.prisma.notificationLog.update({
            where: { id: existing.id },
            data: {
              status: data.status,
              message: data.message,
            },
          });
          return;
        }
      }

      await this.prisma.notificationLog.create({
        data: {
          tenant_id: data.tenantId,
          type: data.type,
          recipient: data.recipient,
          message: data.message,
          status: data.status,
          related_id: relatedId,
          subject: data.subject,
          event: eventName,
        },
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const baseUrl = this.apiUrl.endsWith('/send') ? this.apiUrl.slice(0, -('/send'.length)) : this.apiUrl;
      const testUrlPrimary = `${baseUrl}/devices`;
      const testUrlFallback = `${baseUrl}/device`;
      let response = await fetch(testUrlPrimary, { method: 'GET', headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' } });
      if (!response.ok) {
        response = await fetch(testUrlFallback, { method: 'GET', headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' } });
      }
      if (response.ok) {
        try {
          const json: any = await response.json();
          // Consider connected if device list exists or a device object is returned
          const hasDevice =
            (Array.isArray(json) && json.length > 0) ||
            (json && typeof json === 'object' && (json.device || json.id || json.status !== undefined));
          if (hasDevice) return true;
        } catch {
          // Some endpoints may not return JSON; still treat HTTP 200 as reachable
          return true;
        }
      }
      // Fallback: try reaching API host to detect connectivity
      const head = await fetch(baseUrl, { method: 'HEAD' }).catch(() => undefined as any);
      return !!head && (head.ok || [401, 403, 404].includes(head.status));
    } catch (error) {
      console.error('WhatsApp service connection failed:', error);
      return false;
    }
  }

  formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    
    return cleaned;
  }
}
