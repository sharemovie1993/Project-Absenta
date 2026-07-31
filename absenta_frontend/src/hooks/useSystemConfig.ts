import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getSystemConfig, SystemConfig } from '../api/systemConfig.api';

export function useSystemConfig() {
  const query = useQuery({
    queryKey: ['system-config', 'active'],
    queryFn: async () => {
      const res = await getSystemConfig();
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10-minute cache
  });

  const config: SystemConfig | null = useMemo(() => query.data || null, [query.data]);

  // Derived Parent App Features
  const parentAppFeatures = useMemo(() => ({
    enabled: Boolean(config?.parent_app_enabled !== false),
    dashboard: Boolean(config?.parent_app_dashboard_enabled !== false),
    attendanceHistory: Boolean(config?.parent_app_attendance_history_enabled !== false),
    notifications: Boolean(config?.parent_app_notifications_enabled !== false),
    monthlyRecap: Boolean(config?.parent_app_monthly_recap_enabled !== false),
    dailyTracking: Boolean(config?.parent_app_daily_tracking_enabled !== false),
    reportAbsence: Boolean(config?.parent_app_report_absence_enabled !== false),
  }), [config]);

  // Derived Payment Gateways Status
  const gateways = useMemo(() => ({
    midtrans: Boolean(config?.midtrans_enabled),
    xendit: Boolean(config?.xendit_enabled),
    tripay: Boolean(config?.tripay_enabled),
    stripe: Boolean(config?.stripe_enabled),
    hasActiveGateway: Boolean(
      config?.midtrans_enabled ||
      config?.xendit_enabled ||
      config?.tripay_enabled ||
      config?.stripe_enabled
    ),
  }), [config]);

  // Derived App Branding
  const branding = useMemo(() => ({
    appName: config?.app_name || 'Absenta',
    tagline: config?.tagline || 'Sistem Informasi Presensi & Manajemen Sekolah',
    description: config?.description || '',
    logoUrl: config?.logo_url || '/logo.png',
    faviconUrl: config?.favicon_url || '/favicon.ico',
    supportEmail: config?.support_email || 'support@absenta.id',
    supportPhone: config?.support_phone || '',
    footerText: config?.footer_text || '© Absenta. All rights reserved.',
    primaryColor: config?.primary_color || '#4f46e5',
  }), [config]);

  return {
    config,
    systemConfig: config, // Alias for backward compatibility
    parentAppFeatures,
    gateways,
    branding,
    maxUploadMb: config?.max_upload_mb || 10,
    sessionTimeoutMinutes: config?.session_timeout_minutes || 60,
    twoFactorEnabled: Boolean(config?.two_factor_enabled),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useSystemConfig;
