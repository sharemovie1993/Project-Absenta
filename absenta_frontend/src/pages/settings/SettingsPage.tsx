import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserNotificationPreferences } from '@/api/notifications.api';
import { fetchActiveSystemConfig, saveSystemConfig, type SystemConfigPayload } from '@/services/systemConfig';
import { Settings } from 'lucide-react';
import { Button, Loader, EmptyState } from '../../components/ui';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

// Lazy loaded sub-components
const TenantSettings = lazy(() => import('@/components/tenant/TenantSettings').then(module => ({ default: module.TenantSettings })));

// New settings components
const GeneralSettingsForm = lazy(() => import('@/components/settings/GeneralSettingsForm').then(m => ({ default: m.GeneralSettingsForm })));
const BrandingSettingsForm = lazy(() => import('@/components/settings/BrandingSettingsForm').then(m => ({ default: m.BrandingSettingsForm })));
const CompanySettingsForm = lazy(() => import('@/components/settings/CompanySettingsForm').then(m => ({ default: m.CompanySettingsForm })));
const PaymentSettingsForm = lazy(() => import('@/components/settings/PaymentSettingsForm').then(m => ({ default: m.PaymentSettingsForm })));
const SecuritySettingsForm = lazy(() => import('@/components/settings/SecuritySettingsForm').then(m => ({ default: m.SecuritySettingsForm })));
const NotificationSettingsForm = lazy(() => import('@/components/settings/NotificationSettingsForm').then(m => ({ default: m.NotificationSettingsForm })));
const AttendanceSettingsForm = lazy(() => import('@/components/settings/AttendanceSettingsForm').then(m => ({ default: m.AttendanceSettingsForm })));
const ParentAppSettingsForm = lazy(() => import('@/components/settings/ParentAppSettingsForm').then(m => ({ default: m.ParentAppSettingsForm })));
const EasyTunnelPage = lazy(() => import('../system/EasyTunnelPage'));
const SystemUpdatePage = lazy(() => import('./SystemUpdatePage'));

const SettingsPage: React.FC = () => {
  const { user, isLoading, can } = useAuth();
  const isSuperAdminUser = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  const isTenantAdmin = user?.role?.name === 'ADMIN' && !isSuperAdminUser;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') || (isTenantAdmin ? 'tenant_profile' : 'general')).toLowerCase();
  const [activeTab, setActiveTab] = useState(initialTab);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/settings' },
    { label: 'Pengaturan', path: '/settings' }
  ], []);

  const canView = useMemo(() => isSuperAdminUser || isTenantAdmin || can('core.system.config.view'), [isSuperAdminUser, isTenantAdmin, can]);
  const canEdit = useMemo(() => isSuperAdminUser || isTenantAdmin || can('core.system.config.update'), [isSuperAdminUser, isTenantAdmin, can]);

  const [config, setConfig] = useState<SystemConfigPayload>({
    app_name: '',
    tagline: '',
    description: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    favicon_url: '',
    logo_url: '',
    footer_text: '',
    support_email: '',
    support_phone: '',
    default_language: 'id',
    timezone: 'Asia/Jakarta',
    date_format: 'DD/MM/YYYY',
    stripe_enabled: false,
    midtrans_enabled: false,
    xendit_enabled: false,
    tripay_enabled: false,
    notif_email_new_payment: true,
    notif_email_payment_failed: false,
    notif_email_monthly_summary: true,
    session_timeout_minutes: 30,
    two_factor_enabled: false,
    login_attempt_monitoring: true,
    backup_frequency: 'DAILY',
    log_retention_days: 30,
    max_upload_mb: 10,
    api_rate_limit_per_minute: 100,
    default_late_threshold: 5,
    default_notap_threshold: 5,
    is_pkp: false,
    ppn_rate: 11,
    parent_app_enabled: true,
    parent_app_dashboard_enabled: true,
    parent_app_attendance_history_enabled: true,
    parent_app_notifications_enabled: true,
    parent_app_monthly_recap_enabled: true,
    parent_app_daily_tracking_enabled: true,
    parent_app_report_absence_enabled: true,
    bpbk_summons_require_principal_approval: true,
    company_legal_name: '',
    company_trade_name: '',
    company_npwp: '',
    company_address: '',
    company_email_billing: '',
    company_phone_billing: '',
    company_logo_url: '',
    company_signature_name: '',
    company_signature_title: '',
    company_bank_name: '',
    company_bank_account: '',
    company_bank_holder: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const p = await getUserNotificationPreferences();
        if (!isMounted) return;
        const data = p?.data;
        if (data) {
          const next = { enabledTypes: { ATTENDANCE: !!data.enabledTypes?.ATTENDANCE }, digestFrequency: data.digestFrequency };
          localStorage.setItem(`notif_prefs_${user?.id || 'anon'}`, JSON.stringify(next));
        }
      } catch (e) {
        console.error('Failed to load prefs', e);
      }
    })();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (canView && !isTenantAdmin) {
        setLoadingConfig(true);
        fetchActiveSystemConfig()
        .then(d => {
            if (!isMounted) return;
            if (d) {
            setConfig(prev => ({
                ...prev,
                ...d,
                stripe_enabled: !!d.stripe_enabled,
                midtrans_enabled: !!d.midtrans_enabled,
                xendit_enabled: !!d.xendit_enabled,
                tripay_enabled: !!d.tripay_enabled,
                notif_email_new_payment: !!d.notif_email_new_payment,
                notif_email_payment_failed: !!d.notif_email_payment_failed,
                notif_email_monthly_summary: !!d.notif_email_monthly_summary,
                two_factor_enabled: !!d.two_factor_enabled,
                login_attempt_monitoring: !!d.login_attempt_monitoring,
                is_pkp: !!d.is_pkp,
                parent_app_enabled: d.parent_app_enabled ?? true,
                parent_app_dashboard_enabled: d.parent_app_dashboard_enabled ?? true,
                parent_app_attendance_history_enabled: d.parent_app_attendance_history_enabled ?? true,
                parent_app_notifications_enabled: d.parent_app_notifications_enabled ?? true,
                parent_app_monthly_recap_enabled: d.parent_app_monthly_recap_enabled ?? true,
                parent_app_daily_tracking_enabled: d.parent_app_daily_tracking_enabled ?? true,
                parent_app_report_absence_enabled: d.parent_app_report_absence_enabled ?? true,
            }));
            }
        })
        .catch(err => {
            console.error('Failed to fetch config', err);
        })
        .finally(() => {
            if (isMounted) setLoadingConfig(false);
        });
    } else {
      setLoadingConfig(false);
    }
    return () => { isMounted = false; };
  }, [canView, isTenantAdmin]);

  const handleSave = useCallback(async () => {
    if (!canEdit) {
        setSaveMessage('Anda tidak memiliki izin untuk mengubah pengaturan.');
        setTimeout(() => setSaveMessage(null), 3000);
        return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = { ...config };
      if (payload.ppn_rate) payload.ppn_rate = Number(payload.ppn_rate);
      if (payload.session_timeout_minutes) payload.session_timeout_minutes = Number(payload.session_timeout_minutes);
      if (payload.log_retention_days) payload.log_retention_days = Number(payload.log_retention_days);
      if (payload.max_upload_mb) payload.max_upload_mb = Number(payload.max_upload_mb);
      if (payload.api_rate_limit_per_minute) payload.api_rate_limit_per_minute = Number(payload.api_rate_limit_per_minute);
      if (payload.default_late_threshold) payload.default_late_threshold = Number(payload.default_late_threshold);
      if (payload.default_notap_threshold) payload.default_notap_threshold = Number(payload.default_notap_threshold);

      const d = await saveSystemConfig(payload);
      if (d) {
        setSaveMessage('Konfigurasi berhasil disimpan');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan konfigurasi';
      setSaveMessage(errorMessage);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [canEdit, config]);

  const handleChange = useCallback((field: keyof SystemConfigPayload, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const tabs = useMemo(() => {
    const list = isTenantAdmin
      ? [
          { id: 'tenant_profile', label: 'Profil Sekolah' },
          { id: 'easy_tunnel', label: 'Akses Online' }
        ]
      : [
          { id: 'general', label: 'Umum' },
          { id: 'branding', label: 'Branding' },
          { id: 'payment', label: 'Pembayaran' },
          { id: 'company', label: 'Perusahaan' },
          { id: 'security', label: 'Keamanan' },
          { id: 'notifications', label: 'Notifikasi' },
          { id: 'attendance', label: 'Absensi' },
          { id: 'parent_app', label: 'Parent App' },
          { id: 'easy_tunnel', label: 'Akses Online' }
        ];

    if (can('core.system.config.update')) {
      list.push({ id: 'system_update', label: 'Pembaruan Sistem' });
    }
    return list;
  }, [isTenantAdmin, can]);

  const toolbar = useMemo(() => (
    <div className="flex items-center gap-2">
      {saveMessage && (
        <span className={`text-sm font-medium ${saveMessage.includes('Gagal') ? 'text-red-600' : 'text-green-600'}`}>
          {saveMessage}
        </span>
      )}
      {canEdit && !isTenantAdmin && activeTab !== 'easy_tunnel' && (
        <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan Perubahan
        </Button>
      )}
    </div>
  ), [saveMessage, canEdit, isTenantAdmin, handleSave, saving, activeTab]);

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader size="lg" /></div>;

  if (!canView) {
    return (
      <AcademicPageLayout title="Akses Ditolak" hardeningModuleKey="settingspage">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Anda tidak memiliki izin untuk melihat halaman ini.</p>
        </div>
      </AcademicPageLayout>
    );
  }



  return (
    <AcademicPageLayout
      title="Pengaturan Sistem"
      description="Kelola konfigurasi global aplikasi sekolah."
      hardeningModuleKey="settingspage"
      breadcrumbs={breadcrumbs}
      toolbar={toolbar}
      instruction={{
        title: "Pengaturan Sistem",
        description: "Konfigurasi parameter global seperti aplikasi, gateway pembayaran, keamanan, dan pengaturan aplikasi orang tua.",
        items: [
          { text: "Hati-hati dalam mengubah konfigurasi pembayaran, karena dapat memengaruhi transaksi aktif." },
          { text: "Penyimpanan akan diaplikasikan ke seluruh lingkungan (global)." }
        ]
      }}
      canView={canView}
      isLoading={isLoading}
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {!loadingConfig && !config.app_name && activeTab === 'general' ? (
            <EmptyState icon={Settings} title="Konfigurasi Kosong" description="Belum ada data konfigurasi yang dimuat." />
          ) : null}

          <React.Fragment>
            <Suspense fallback={<div className="p-8 text-center"><Loader /></div>}>
              {activeTab === 'general' && <GeneralSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'branding' && <BrandingSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'company' && <CompanySettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'payment' && <PaymentSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'security' && <SecuritySettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'notifications' && <NotificationSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'attendance' && <AttendanceSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'parent_app' && <ParentAppSettingsForm config={config} onChange={handleChange} canEdit={canEdit} />}
              {activeTab === 'tenant_profile' && <TenantSettings />}
              {activeTab === 'easy_tunnel' && <EasyTunnelPage />}
              {activeTab === 'system_update' && <SystemUpdatePage isTab={true} />}
            </Suspense>
          </React.Fragment>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default SettingsPage;
