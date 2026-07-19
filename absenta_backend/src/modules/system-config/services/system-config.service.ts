import { prisma } from '@/utils/prisma';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { Prisma } from '@prisma/client';
import { cacheService } from '@/utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';

export interface SystemConfigPayload {
  tenant_id?: string | null;
  // General
  app_name?: string | null;
  default_language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  // Branding
  tagline?: string | null;
  description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  favicon_url?: string | null;
  logo_url?: string | null;
  footer_text?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  // Company Identity (Global Only)
  company_legal_name?: string | null;
  company_trade_name?: string | null;
  company_npwp?: string | null;
  company_address?: string | null;
  company_email_billing?: string | null;
  company_phone_billing?: string | null;
  company_bank_name?: string | null;
  company_bank_account?: string | null;
  company_bank_holder?: string | null;
  company_logo_url?: string | null;
  company_signature_name?: string | null;
  company_signature_title?: string | null;
  // Stripe
  stripe_enabled?: boolean;
  // Midtrans
  midtrans_enabled?: boolean;
  midtrans_environment?: string | null; // sandbox/production
  // Xendit
  xendit_enabled?: boolean;
  // Tripay
  tripay_enabled?: boolean;
  // Notifications
  notif_email_new_payment?: boolean;
  notif_email_payment_failed?: boolean;
  notif_email_subscription_expired?: boolean;
  notif_email_monthly_summary?: boolean;
  webhook_payment_status?: boolean;
  webhook_subscription_changes?: boolean;
  webhook_billing_events?: boolean;
  // Security
  session_timeout_minutes?: number;
  two_factor_enabled?: boolean;
  login_attempt_monitoring?: boolean;
  // System
  backup_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  log_retention_days?: number;
  max_upload_mb?: number;
  api_rate_limit_per_minute?: number;
  is_pkp?: boolean;
  ppn_rate?: number;
  // Audit
  is_active?: boolean;
  // Parent App Feature Flags
  parent_app_enabled?: boolean;
  parent_app_dashboard_enabled?: boolean;
  parent_app_attendance_history_enabled?: boolean;
  parent_app_notifications_enabled?: boolean;
  parent_app_monthly_recap_enabled?: boolean;
  parent_app_daily_tracking_enabled?: boolean;
  parent_app_report_absence_enabled?: boolean;
  // BPBK Settings
  bpbk_summons_require_principal_approval?: boolean;
  // Piket
  max_izin_sementara_menit?: number;
}

export const systemConfigService = {
  async getActive(tenantId?: string | null) {
    const cacheKey = CACHE_KEYS.SYSTEM_CONFIG.ACTIVE(tenantId || null);
    const cached = await cacheService.get<any>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let globalActive: any = null;

    try {
      globalActive = await prisma.systemConfig.findFirst({
        where: { tenant_id: null, is_active: true },
        orderBy: { updated_at: 'desc' },
      });
    } catch (err: any) {
      const isMissingParentAppColumn =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2022' &&
        typeof err.meta?.column === 'string' &&
        err.meta.column.startsWith('SystemConfig.parent_app_');

      if (isMissingParentAppColumn) {
        console.warn(
          '[SystemConfig] Parent App columns missing in database, continuing without feature flags (global scope)'
        );
        const rows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM "SystemConfig" WHERE "tenant_id" IS NULL AND "is_active" = true ORDER BY "updated_at" DESC LIMIT 1'
        );
        globalActive = rows && rows.length > 0 ? rows[0] : null;
      } else {
        throw err;
      }
    }

    if (tenantId) {
      let tenantActive: any = null;

      try {
        tenantActive = await prisma.systemConfig.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          orderBy: { updated_at: 'desc' },
        });
      } catch (err: any) {
        const isMissingParentAppColumn =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2022' &&
          typeof err.meta?.column === 'string' &&
          err.meta.column.startsWith('SystemConfig.parent_app_');

        if (isMissingParentAppColumn) {
          console.warn(
            '[SystemConfig] Parent App columns missing in database, continuing without feature flags (tenant scope)'
          );
          const rows = await prisma.$queryRawUnsafe<any[]>(
            'SELECT * FROM "SystemConfig" WHERE "tenant_id" = $1 AND "is_active" = true ORDER BY "updated_at" DESC LIMIT 1',
            tenantId
          );
          tenantActive = rows && rows.length > 0 ? rows[0] : null;
        } else {
          throw err;
        }
      }

      if (tenantActive) {
        const merged = {
          ...tenantActive,
          company_legal_name: globalActive?.company_legal_name ?? null,
          company_trade_name: globalActive?.company_trade_name ?? null,
          company_npwp: globalActive?.company_npwp ?? null,
          company_address: globalActive?.company_address ?? null,
          company_email_billing: globalActive?.company_email_billing ?? null,
          company_phone_billing: globalActive?.company_phone_billing ?? null,
          company_bank_name: globalActive?.company_bank_name ?? null,
          company_bank_account: globalActive?.company_bank_account ?? null,
          company_bank_holder: globalActive?.company_bank_holder ?? null,
          company_logo_url: globalActive?.company_logo_url ?? null,
          company_signature_name: globalActive?.company_signature_name ?? null,
          company_signature_title: globalActive?.company_signature_title ?? null,
        };
        await cacheService.set(cacheKey, merged, CACHE_TTL.STATIC);
        return merged;
      }
    }

    const finalConfig = globalActive || null;
    await cacheService.set(cacheKey, finalConfig, CACHE_TTL.STATIC);
    return finalConfig;
  },

  async upsert(payload: SystemConfigPayload, roleName?: string, requesterTenantId?: string | null) {
    const superAdmin = isSystemSuperAdmin(roleName, requesterTenantId || undefined);
    const tenantIdToUse = superAdmin ? (payload.tenant_id ?? null) : (requesterTenantId ?? null);
    const isGlobalConfig = !tenantIdToUse;

    // Enforce: only system-level SUPERADMIN can manage payment gateway toggles
    const requestedPaymentToggleChange =
      typeof payload.stripe_enabled !== 'undefined' ||
      typeof payload.midtrans_enabled !== 'undefined' ||
      typeof payload.xendit_enabled !== 'undefined' ||
      typeof payload.tripay_enabled !== 'undefined';
    if (requestedPaymentToggleChange && !superAdmin) {
      throw new Error('Hanya SUPERADMIN tenant system yang dapat mengelola toggle payment gateway');
    }

    console.log('[SystemConfigService] Upserting for tenant:', tenantIdToUse);
    console.log('[SystemConfigService] Payload logo_url:', payload.logo_url);
    console.log('[SystemConfigService] Payload favicon_url:', payload.favicon_url);

    // HANDLE GLOBAL FIELDS (Logo, Favicon & Company Identity)
    // These fields must always be saved to the GLOBAL config (tenant_id: null),
    // regardless of who is requesting (even Tenant Admin logged into a specific tenant).
    const globalFieldKeys = [
      'logo_url', 'favicon_url',
      'company_legal_name', 'company_trade_name', 'company_npwp',
      'company_address', 'company_email_billing', 'company_phone_billing',
      'company_bank_name', 'company_bank_account', 'company_bank_holder',
      'company_logo_url', 'company_signature_name', 'company_signature_title',
    ] as const;

    const globalUpdateData: any = {};
    for (const key of globalFieldKeys) {
      if ((payload as any)[key] !== undefined) {
        globalUpdateData[key] = (payload as any)[key];
      }
    }

    if (Object.keys(globalUpdateData).length > 0) {
      console.log('[SystemConfigService] Saving global fields:', Object.keys(globalUpdateData));
      const globalConfig = await prisma.systemConfig.findFirst({ where: { tenant_id: null } });
      if (globalConfig) {
        await prisma.systemConfig.update({ where: { id: globalConfig.id }, data: globalUpdateData });
      } else {
        await prisma.systemConfig.create({
          data: {
            tenant_id: null,
            is_active: true,
            ...globalUpdateData
          }
        });
      }
    }

    // Find existing config in scope
    const existing = await prisma.systemConfig.findFirst({
      where: { tenant_id: tenantIdToUse },
      orderBy: { updated_at: 'desc' },
    });

    const data = {
      tenant_id: tenantIdToUse,
      // General
      app_name: payload.app_name ?? null,
      default_language: payload.default_language ?? undefined,
      timezone: payload.timezone ?? undefined,
      date_format: payload.date_format ?? undefined,
      // Branding
      tagline: payload.tagline ?? undefined,
      description: payload.description ?? undefined,
      primary_color: payload.primary_color ?? undefined,
      secondary_color: payload.secondary_color ?? undefined,
      accent_color: payload.accent_color ?? undefined,
      // Note: favicon_url and logo_url are handled globally above. 
      // We do NOT save them to tenant config to avoid confusion, 
      // or we can leave them undefined so they don't overwrite tenant columns if they exist.
      // If we are editing Global Config (tenantIdToUse is null), they are already updated above, 
      // but including them here for the main update call is fine/redundant.
      // If we are editing Tenant Config (tenantIdToUse is set), we should NOT save them here.
      favicon_url: isGlobalConfig ? (payload.favicon_url ?? undefined) : undefined,
      logo_url: isGlobalConfig ? (payload.logo_url ?? undefined) : undefined,
      
      footer_text: payload.footer_text ?? undefined,
      support_email: payload.support_email ?? undefined,
      support_phone: payload.support_phone ?? undefined,
      // Company Identity (Global Only - Enforced by isGlobalConfig check)
      company_legal_name: isGlobalConfig ? (payload.company_legal_name ?? undefined) : undefined,
      company_trade_name: isGlobalConfig ? (payload.company_trade_name ?? undefined) : undefined,
      company_npwp: isGlobalConfig ? (payload.company_npwp ?? undefined) : undefined,
      company_address: isGlobalConfig ? (payload.company_address ?? undefined) : undefined,
      company_email_billing: isGlobalConfig ? (payload.company_email_billing ?? undefined) : undefined,
      company_phone_billing: isGlobalConfig ? (payload.company_phone_billing ?? undefined) : undefined,
      company_bank_name: isGlobalConfig ? (payload.company_bank_name ?? undefined) : undefined,
      company_bank_account: isGlobalConfig ? (payload.company_bank_account ?? undefined) : undefined,
      company_bank_holder: isGlobalConfig ? (payload.company_bank_holder ?? undefined) : undefined,
      company_logo_url: isGlobalConfig ? (payload.company_logo_url ?? undefined) : undefined,
      company_signature_name: isGlobalConfig ? (payload.company_signature_name ?? undefined) : undefined,
      company_signature_title: isGlobalConfig ? (payload.company_signature_title ?? undefined) : undefined,
      // Stripe
      stripe_enabled: payload.stripe_enabled ?? undefined,
      // Midtrans
      midtrans_enabled: payload.midtrans_enabled ?? undefined,
      midtrans_environment: payload.midtrans_environment ?? undefined,
      // Xendit
      xendit_enabled: payload.xendit_enabled ?? undefined,
      // Tripay
      tripay_enabled: payload.tripay_enabled ?? undefined,
      // Notifications
      notif_email_new_payment: payload.notif_email_new_payment ?? undefined,
      notif_email_payment_failed: payload.notif_email_payment_failed ?? undefined,
      notif_email_subscription_expired: payload.notif_email_subscription_expired ?? undefined,
      notif_email_monthly_summary: payload.notif_email_monthly_summary ?? undefined,
      webhook_payment_status: payload.webhook_payment_status ?? undefined,
      webhook_subscription_changes: payload.webhook_subscription_changes ?? undefined,
      webhook_billing_events: payload.webhook_billing_events ?? undefined,
      // Security
      session_timeout_minutes: payload.session_timeout_minutes ?? undefined,
      two_factor_enabled: payload.two_factor_enabled ?? undefined,
      login_attempt_monitoring: payload.login_attempt_monitoring ?? undefined,
      // System
      backup_frequency: payload.backup_frequency ?? undefined,
      log_retention_days: payload.log_retention_days ?? undefined,
      max_upload_mb: payload.max_upload_mb ?? undefined,
      api_rate_limit_per_minute: payload.api_rate_limit_per_minute ?? undefined,
      is_pkp: payload.is_pkp ?? undefined,
      ppn_rate: payload.ppn_rate ?? undefined,
      // Audit
      is_active: payload.is_active ?? true,
      notification_throttle_seconds: (payload as any).notification_throttle_seconds ?? undefined,
      digest_time_daily: (payload as any).digest_time_daily ?? undefined,
      digest_time_weekly: (payload as any).digest_time_weekly ?? undefined,
      digest_weekly_day: (payload as any).digest_weekly_day ?? undefined,
      quiet_hours_start: (payload as any).quiet_hours_start ?? undefined,
      quiet_hours_end: (payload as any).quiet_hours_end ?? undefined,
      default_attendance_email: (payload as any).default_attendance_email ?? undefined,
      default_attendance_wa: (payload as any).default_attendance_wa ?? undefined,
      default_parent_email: (payload as any).default_parent_email ?? undefined,
      default_parent_wa: (payload as any).default_parent_wa ?? undefined,
      default_late_threshold: (payload as any).default_late_threshold ?? undefined,
      default_notap_threshold: (payload as any).default_notap_threshold ?? undefined,
      max_izin_sementara_menit: payload.max_izin_sementara_menit ?? undefined,
      // Parent App Feature Flags
      parent_app_enabled: payload.parent_app_enabled ?? undefined,
      parent_app_dashboard_enabled: payload.parent_app_dashboard_enabled ?? undefined,
      parent_app_attendance_history_enabled:
        payload.parent_app_attendance_history_enabled ?? undefined,
      parent_app_notifications_enabled: payload.parent_app_notifications_enabled ?? undefined,
      parent_app_monthly_recap_enabled: payload.parent_app_monthly_recap_enabled ?? undefined,
      parent_app_daily_tracking_enabled: payload.parent_app_daily_tracking_enabled ?? undefined,
      parent_app_report_absence_enabled: payload.parent_app_report_absence_enabled ?? undefined,
    } as any;

    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    try {
      let result;
      if (existing) {
        result = await prisma.systemConfig.update({ where: { id: existing.id }, data });
      } else {
        result = await prisma.systemConfig.create({ data });
      }

      // Clear cache
      await cacheService.delete(CACHE_KEYS.SYSTEM_CONFIG.ACTIVE(tenantIdToUse || null));
      if (tenantIdToUse) {
        await cacheService.delete(CACHE_KEYS.SYSTEM_CONFIG.ACTIVE(null));
      }

      return result;
    } catch (err: any) {
      const isMissingParentAppColumn =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2022' &&
        typeof err.meta?.column === 'string' &&
        err.meta.column.startsWith('SystemConfig.parent_app_');

      if (!isMissingParentAppColumn) {
        throw err;
      }

      console.warn(
        '[SystemConfig] Parent App columns missing in database, retrying upsert without parent_app_* flags'
      );

      const fallbackData: any = { ...data };
      delete fallbackData.parent_app_enabled;
      delete fallbackData.parent_app_dashboard_enabled;
      delete fallbackData.parent_app_attendance_history_enabled;
      delete fallbackData.parent_app_notifications_enabled;
      delete fallbackData.parent_app_monthly_recap_enabled;
      delete fallbackData.parent_app_daily_tracking_enabled;
      delete fallbackData.parent_app_report_absence_enabled;

      if (existing) {
        return prisma.systemConfig.update({ where: { id: existing.id }, data: fallbackData });
      }
      return prisma.systemConfig.create({ data: fallbackData });
    }
  },
};
