import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserNotificationPreferences } from '@/api/notifications.api';
import { fetchActiveSystemConfig, saveSystemConfig, type SystemConfigPayload } from '@/services/systemConfig';
import { Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Loader, SearchableSelect, Switch, EmptyState } from '../../components/ui';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

const TenantSettings = lazy(() => import('@/components/tenant/TenantSettings').then(module => ({ default: module.TenantSettings })));

const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') || 'general').toLowerCase();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, isLoading, can, isAdmin } = useAuth();

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/settings' },
    { label: 'Pengaturan', path: '/settings' }
  ], []);

  const isSuperAdminUser = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  const isTenantAdmin = user?.role?.name === 'ADMIN' && !isSuperAdminUser;

  const canView = useMemo(() => isSuperAdminUser || isTenantAdmin || can('core.system.config.view'), [isSuperAdminUser, isTenantAdmin, can]);
  const canEdit = useMemo(() => isSuperAdminUser || can('core.system.config.update'), [isSuperAdminUser, can]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!canView) {
    return (
      <AcademicPageLayout
        title="Akses Ditolak"
        hardeningModuleKey="settingspage"
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Anda tidak memiliki izin untuk melihat halaman ini.</p>
        </div>
      </AcademicPageLayout>
    );
  }

  if (isTenantAdmin) {
    return (
      <AcademicPageLayout
        title="Pengaturan Tenant"
        description="Kelola pengaturan khusus tenant Anda."
        hardeningModuleKey="settingspage"
        breadcrumbs={breadcrumbs}
      >
        <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
          <TenantSettings />
        </Suspense>
      </AcademicPageLayout>
    );
  }

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
  type AttendancePrefs = { enabledTypes: { ATTENDANCE: boolean }; digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY'; thresholds?: { late?: number; no_tap?: number }; channels?: { ATTENDANCE?: { in_app?: boolean; email?: boolean; wa?: boolean } } };
  const [attendancePrefs, setAttendancePrefs] = useState<AttendancePrefs>(() => {
    try {
      const raw = localStorage.getItem(`notif_prefs_${user?.id || 'anon'}`);
      const json = raw ? JSON.parse(raw) : null;
      const enabled = json?.enabledTypes?.ATTENDANCE ?? true;
      const freq = json?.digestFrequency ?? 'NONE';
      const thresholds = json?.thresholds || { late: 5, no_tap: 5 };
      const channels = json?.channels || { ATTENDANCE: { in_app: true, email: false, wa: false } };
      return { enabledTypes: { ATTENDANCE: enabled }, digestFrequency: freq, thresholds, channels };
    } catch {
      return { enabledTypes: { ATTENDANCE: true }, digestFrequency: 'NONE', thresholds: { late: 5, no_tap: 5 }, channels: { ATTENDANCE: { in_app: true, email: false, wa: false } } };
    }
  });
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
          setAttendancePrefs(next);
        }
      } catch (e) {
        if (!isMounted) return;
        console.error('Failed to load prefs', e);
      }
    })();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    // Only fetch system config if canView is true
    if (canView) {
        setLoadingConfig(true);
        fetchActiveSystemConfig()
        .then(d => {
            if (!isMounted) return;
            if (d) {
            setConfig(prev => ({
                ...prev,
                ...d,
                // Ensure booleans are booleans
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
            if (!isMounted) return;
            console.error('Failed to fetch config', err);
        })
        .finally(() => {
            if (isMounted) setLoadingConfig(false);
        });
    }
    return () => { isMounted = false; };
  }, [canView]);

  const handleSave = useCallback(async () => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (!canEdit) {
        setSaveMessage('Anda tidak memiliki izin untuk mengubah pengaturan.');
        timeoutId = setTimeout(() => setSaveMessage(null), 3000);
        return () => clearTimeout(timeoutId);
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      // Clean up payload
      const payload = { ...config };
      // Ensure numbers
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
      console.error('Failed to save config', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan konfigurasi';
      setSaveMessage(errorMessage);
    } finally {
      setSaving(false);
      timeoutId = setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [canEdit, config]);

  const handleChange = useCallback((field: keyof SystemConfigPayload, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const tabs = useMemo(() => [
    { id: 'general', label: 'Umum' },
    { id: 'branding', label: 'Branding' },
    { id: 'payment', label: 'Pembayaran' },
    { id: 'company', label: 'Perusahaan' },
    { id: 'security', label: 'Keamanan' },
    { id: 'notifications', label: 'Notifikasi' },
    { id: 'attendance', label: 'Absensi' },
    { id: 'parent_app', label: 'Parent App' },
  ], []);

  const toolbar = useMemo(() => (
    <div className="flex items-center gap-2">
      {saveMessage && (
        <span className={`text-sm font-medium ${saveMessage.includes('Gagal') ? 'text-red-600' : 'text-green-600'}`}>
          {saveMessage}
        </span>
      )}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan Perubahan
        </Button>
      )}
    </div>
  ), [saveMessage, canEdit, handleSave, saving]);

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
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

      {/* Content */}
      <div className="space-y-6">
        {!loadingConfig && !config.app_name && activeTab === 'general' ? (
          <EmptyState 
            icon={Settings}
            title="Konfigurasi Kosong"
            description="Belum ada data konfigurasi yang dimuat. Silakan simpan untuk membuat data awal."
          />
        ) : null}

        {/* General Tab */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>Informasi Umum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="app_name">Nama Aplikasi</Label>
                <Input
                  id="app_name"
                  value={config.app_name || ''}
                  onChange={(e) => handleChange('app_name', e.target.value)}
                  placeholder="Contoh: Sistem Informasi Sekolah"
                  disabled={!canEdit}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="default_language">Bahasa Default</Label>
                  <SearchableSelect
                    value={config.default_language || 'id'}
                    onValueChange={(val: string) => handleChange('default_language', val)}
                    options={[
                        { value: 'id', label: 'Indonesia' },
                        { value: 'en', label: 'English' }
                    ]}
                    disabled={!canEdit}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Zona Waktu</Label>
                   <SearchableSelect
                    value={config.timezone || 'Asia/Jakarta'}
                    onValueChange={(val: string) => handleChange('timezone', val)}
                    options={[
                        { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
                        { value: 'Asia/Makassar', label: 'WITA (Makassar)' },
                        { value: 'Asia/Jayapura', label: 'WIT (Jayapura)' }
                    ]}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date_format">Format Tanggal</Label>
                 <SearchableSelect
                    value={config.date_format || 'DD/MM/YYYY'}
                    onValueChange={(val: string) => handleChange('date_format', val)}
                    options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2023)' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2023)' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2023-12-31)' }
                    ]}
                    disabled={!canEdit}
                  />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
           <Card>
            <CardHeader>
              <CardTitle>Branding & Tampilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={config.tagline || ''}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="Mencerdaskan Kehidupan Bangsa"
                  disabled={!canEdit}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi Singkat</Label>
                <Input
                  id="description"
                  value={config.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Platform manajemen sekolah terintegrasi..."
                  disabled={!canEdit}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="primary_color">Warna Utama (Primary)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="primary_color"
                            type="color"
                            className="w-12 p-1 h-10"
                            value={config.primary_color || '#3b82f6'}
                            onChange={(e) => handleChange('primary_color', e.target.value)}
                            disabled={!canEdit}
                        />
                        <Input
                             value={config.primary_color || '#3b82f6'}
                             onChange={(e) => handleChange('primary_color', e.target.value)}
                             disabled={!canEdit}
                        />
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="secondary_color">Warna Sekunder</Label>
                    <div className="flex gap-2">
                        <Input
                            id="secondary_color"
                            type="color"
                            className="w-12 p-1 h-10"
                            value={config.secondary_color || '#64748b'}
                            onChange={(e) => handleChange('secondary_color', e.target.value)}
                            disabled={!canEdit}
                        />
                        <Input
                             value={config.secondary_color || '#64748b'}
                             onChange={(e) => handleChange('secondary_color', e.target.value)}
                             disabled={!canEdit}
                        />
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="accent_color">Warna Aksen</Label>
                    <div className="flex gap-2">
                        <Input
                            id="accent_color"
                            type="color"
                            className="w-12 p-1 h-10"
                            value={config.accent_color || '#f59e0b'}
                            onChange={(e) => handleChange('accent_color', e.target.value)}
                            disabled={!canEdit}
                        />
                        <Input
                             value={config.accent_color || '#f59e0b'}
                             onChange={(e) => handleChange('accent_color', e.target.value)}
                             disabled={!canEdit}
                        />
                    </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="logo_url">URL Logo</Label>
                    <Input
                        id="logo_url"
                        value={config.logo_url || ''}
                        onChange={(e) => handleChange('logo_url', e.target.value)}
                        placeholder="https://..."
                        disabled={!canEdit}
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="favicon_url">URL Favicon</Label>
                    <Input
                        id="favicon_url"
                        value={config.favicon_url || ''}
                        onChange={(e) => handleChange('favicon_url', e.target.value)}
                        placeholder="https://..."
                        disabled={!canEdit}
                    />
                 </div>
              </div>
               <div className="grid gap-2">
                <Label htmlFor="footer_text">Teks Footer</Label>
                <Input
                  id="footer_text"
                  value={config.footer_text || ''}
                  onChange={(e) => handleChange('footer_text', e.target.value)}
                  placeholder="© 2024 Sekolah Maju Jaya. All rights reserved."
                  disabled={!canEdit}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="support_email">Email Support</Label>
                    <Input
                        id="support_email"
                        value={config.support_email || ''}
                        onChange={(e) => handleChange('support_email', e.target.value)}
                        placeholder="support@sekolah.id"
                        disabled={!canEdit}
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="support_phone">Telepon Support</Label>
                    <Input
                        id="support_phone"
                        value={config.support_phone || ''}
                        onChange={(e) => handleChange('support_phone', e.target.value)}
                        placeholder="+62..."
                        disabled={!canEdit}
                    />
                 </div>
              </div>
            </CardContent>
           </Card>
        )}

        {/* Company Identity Tab */}
        {activeTab === 'company' && (
             <Card>
            <CardHeader>
              <CardTitle>Identitas Perusahaan / Yayasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid gap-2">
                <Label htmlFor="company_legal_name">Nama Legal Perusahaan</Label>
                <Input
                  id="company_legal_name"
                  value={config.company_legal_name || ''}
                  onChange={(e) => handleChange('company_legal_name', e.target.value)}
                  placeholder="PT. Pendidikan Maju Sejahtera"
                  disabled={!canEdit}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="company_trade_name">Nama Dagang (Brand)</Label>
                <Input
                  id="company_trade_name"
                  value={config.company_trade_name || ''}
                  onChange={(e) => handleChange('company_trade_name', e.target.value)}
                  placeholder="Sekolah Juara"
                  disabled={!canEdit}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="company_npwp">NPWP</Label>
                <Input
                  id="company_npwp"
                  value={config.company_npwp || ''}
                  onChange={(e) => handleChange('company_npwp', e.target.value)}
                  placeholder="00.000.000.0-000.000"
                  disabled={!canEdit}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="company_address">Alamat Lengkap</Label>
                <Input
                  id="company_address"
                  value={config.company_address || ''}
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  placeholder="Jl. Raya No. 1..."
                  disabled={!canEdit}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="company_email_billing">Email Tagihan</Label>
                    <Input
                        id="company_email_billing"
                        value={config.company_email_billing || ''}
                        onChange={(e) => handleChange('company_email_billing', e.target.value)}
                        placeholder="finance@sekolah.id"
                        disabled={!canEdit}
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="company_phone_billing">Telepon Tagihan</Label>
                    <Input
                        id="company_phone_billing"
                        value={config.company_phone_billing || ''}
                        onChange={(e) => handleChange('company_phone_billing', e.target.value)}
                        placeholder="+62..."
                        disabled={!canEdit}
                    />
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company_signature_name">Nama Penanda Tangan (Invoice)</Label>
                    <Input
                        id="company_signature_name"
                        value={config.company_signature_name || ''}
                        onChange={(e) => handleChange('company_signature_name', e.target.value)}
                        placeholder="Budi Santoso"
                        disabled={!canEdit}
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="company_signature_title">Jabatan Penanda Tangan</Label>
                    <Input
                        id="company_signature_title"
                        value={config.company_signature_title || ''}
                        onChange={(e) => handleChange('company_signature_title', e.target.value)}
                        placeholder="Direktur Keuangan"
                        disabled={!canEdit}
                    />
                 </div>
              </div>

              <div className="border-t pt-4 mt-4">
                 <h3 className="font-medium mb-4">Informasi Rekening Bank (Manual Transfer)</h3>
                 <div className="grid gap-2">
                    <Label htmlFor="company_bank_name">Nama Bank</Label>
                    <Input
                        id="company_bank_name"
                        value={config.company_bank_name || ''}
                        onChange={(e) => handleChange('company_bank_name', e.target.value)}
                        placeholder="Contoh: BANK MANDIRI"
                        disabled={!canEdit}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company_bank_account">Nomor Rekening</Label>
                        <Input
                            id="company_bank_account"
                            value={config.company_bank_account || ''}
                            onChange={(e) => handleChange('company_bank_account', e.target.value)}
                            placeholder="Contoh: 1310018448883"
                            disabled={!canEdit}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="company_bank_holder">Nama Pemilik Rekening (Atas Nama)</Label>
                        <Input
                            id="company_bank_holder"
                            value={config.company_bank_holder || ''}
                            onChange={(e) => handleChange('company_bank_holder', e.target.value)}
                            placeholder="Contoh: PT BARAYA TEKNOLOGI INDONESIA"
                            disabled={!canEdit}
                        />
                    </div>
                 </div>
              </div>
            </CardContent>
           </Card>
        )}


        {/* Payment Tab */}
        {activeTab === 'payment' && (
             <Card>
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base">Stripe</Label>
                    <p className="text-sm text-gray-500">Aktifkan pembayaran kartu kredit via Stripe</p>
                </div>
                <Switch
                    checked={config.stripe_enabled ?? false}
                    onCheckedChange={(checked) => handleChange('stripe_enabled', checked)}
                    disabled={!canEdit}
                />
              </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">X</div>
                        <div>
                            <p className="font-medium">Xendit</p>
                            <p className="text-sm text-gray-500">Virtual Account, E-Wallet, Retail Outlet</p>
                        </div>
                    </div>
                    <Switch
                        checked={config.xendit_enabled ?? false}
                        onCheckedChange={(checked) => handleChange('xendit_enabled', checked)}
                        disabled={!canEdit}
                    />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">T</div>
                        <div>
                            <p className="font-medium">Tripay</p>
                            <p className="text-sm text-gray-500">Payment Gateway Aggregator</p>
                        </div>
                    </div>
                    <Switch
                        checked={config.tripay_enabled ?? false}
                        onCheckedChange={(checked) => handleChange('tripay_enabled', checked)}
                        disabled={!canEdit}
                    />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">M</div>
                        <div>
                            <p className="font-medium">Midtrans</p>
                            <p className="text-sm text-gray-500">GoPay, ShopeePay, QRIS, dll</p>
                        </div>
                    </div>
                    <Switch
                        checked={config.midtrans_enabled ?? false}
                        onCheckedChange={(checked) => handleChange('midtrans_enabled', checked)}
                        disabled={!canEdit}
                    />
                </div>
              {config.midtrans_enabled && (
                 <div className="pl-6 border-l-2 border-gray-100 ml-2">
                    <div className="grid gap-2">
                        <Label>Midtrans Environment</Label>
                        <SearchableSelect
                            value={config.midtrans_environment || 'sandbox'}
                            onValueChange={(val: string) => handleChange('midtrans_environment', val)}
                            options={[
                                { value: 'sandbox', label: 'Sandbox (Test)' },
                                { value: 'production', label: 'Production (Live)' }
                            ]}
                            disabled={!canEdit}
                        />
                    </div>
                 </div>
              )}
               <div className="border-t pt-4 mt-4">
                 <h3 className="font-medium mb-4">Pajak</h3>
                 <div className="flex items-center justify-between mb-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Pengusaha Kena Pajak (PKP)</Label>
                        <p className="text-sm text-gray-500">Aktifkan jika perusahaan anda PKP dan memungut PPN</p>
                    </div>
                    <Switch
                        checked={config.is_pkp ?? false}
                        onCheckedChange={(checked) => handleChange('is_pkp', checked)}
                        disabled={!canEdit}
                    />
                </div>
                {config.is_pkp && (
                     <div className="grid gap-2 max-w-xs">
                        <Label>Tarif PPN (%)</Label>
                        <Input
                            type="number"
                            value={config.ppn_rate || 11}
                            onChange={(e) => handleChange('ppn_rate', e.target.value)}
                            disabled={!canEdit}
                        />
                     </div>
                )}
               </div>
            </CardContent>
           </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
             <Card>
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-2 max-w-xs">
                    <Label>Session Timeout (Menit)</Label>
                    <Input
                        type="number"
                        value={config.session_timeout_minutes || 30}
                        onChange={(e) => handleChange('session_timeout_minutes', e.target.value)}
                        disabled={!canEdit}
                    />
                </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Two-Factor Authentication (2FA)</Label>
                        <p className="text-sm text-gray-500">Wajibkan 2FA untuk semua user Admin</p>
                    </div>
                    <Switch
                        checked={config.two_factor_enabled ?? false}
                        onCheckedChange={(checked) => handleChange('two_factor_enabled', checked)}
                        disabled={!canEdit}
                    />
                </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Monitoring Percobaan Login</Label>
                        <p className="text-sm text-gray-500">Catat dan blokir IP jika terlalu banyak gagal login</p>
                    </div>
                    <Switch
                        checked={config.login_attempt_monitoring ?? false}
                        onCheckedChange={(checked) => handleChange('login_attempt_monitoring', checked)}
                        disabled={!canEdit}
                    />
                </div>
                 <div className="grid gap-2 max-w-xs">
                    <Label>Rate Limit API (Request/Menit)</Label>
                    <Input
                        type="number"
                        value={config.api_rate_limit_per_minute || 100}
                        onChange={(e) => handleChange('api_rate_limit_per_minute', e.target.value)}
                        disabled={!canEdit}
                    />
                </div>
            </CardContent>
           </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
             <Card>
            <CardHeader>
              <CardTitle>Notifikasi System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Email Pembayaran Baru</Label>
                        <p className="text-sm text-gray-500">Kirim email ke admin saat ada pembayaran masuk</p>
                    </div>
                    <Switch
                        checked={config.notif_email_new_payment ?? false}
                        onCheckedChange={(checked) => handleChange('notif_email_new_payment', checked)}
                        disabled={!canEdit}
                    />
                </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Email Pembayaran Gagal</Label>
                        <p className="text-sm text-gray-500">Kirim email ke user saat pembayaran gagal</p>
                    </div>
                    <Switch
                        checked={config.notif_email_payment_failed ?? false}
                        onCheckedChange={(checked) => handleChange('notif_email_payment_failed', checked)}
                        disabled={!canEdit}
                    />
                </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Email Ringkasan Bulanan</Label>
                        <p className="text-sm text-gray-500">Kirim laporan ringkasan otomatis setiap awal bulan</p>
                    </div>
                    <Switch
                        checked={config.notif_email_monthly_summary ?? false}
                        onCheckedChange={(checked) => handleChange('notif_email_monthly_summary', checked)}
                        disabled={!canEdit}
                    />
                </div>
            </CardContent>
           </Card>
        )}

         {/* Attendance Tab */}
         {activeTab === 'attendance' && (
             <Card>
            <CardHeader>
              <CardTitle>Pengaturan Absensi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid gap-2 max-w-xs">
                    <Label>Batas Toleransi Keterlambatan (Menit)</Label>
                    <Input
                        type="number"
                        value={config.default_late_threshold || 15}
                        onChange={(e) => handleChange('default_late_threshold', e.target.value)}
                        disabled={!canEdit}
                    />
                    <p className="text-xs text-gray-500">Default untuk semua jadwal jika tidak diset spesifik</p>
                </div>
                 <div className="grid gap-2 max-w-xs">
                    <Label>Batas Toleransi Pulang Cepat (Menit)</Label>
                    <Input
                        type="number"
                        value={config.default_notap_threshold || 0}
                        onChange={(e) => handleChange('default_notap_threshold', e.target.value)}
                        disabled={!canEdit}
                    />
                </div>
            </CardContent>
           </Card>
        )}

         {/* Parent App Tab */}
         {activeTab === 'parent_app' && (
             <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Aplikasi Orang Tua</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Aktifkan Parent App</Label>
                        <p className="text-sm text-gray-500">Izinkan orang tua login dan mengakses data siswa</p>
                    </div>
                    <Switch
                        checked={config.parent_app_enabled ?? false}
                        onCheckedChange={(checked) => handleChange('parent_app_enabled', checked)}
                        disabled={!canEdit}
                    />
                </div>

                {config.parent_app_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500">
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Dashboard</Label>
                            <Switch
                                checked={config.parent_app_dashboard_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_dashboard_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Riwayat Absensi</Label>
                            <Switch
                                checked={config.parent_app_attendance_history_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_attendance_history_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Notifikasi Realtime</Label>
                            <Switch
                                checked={config.parent_app_notifications_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_notifications_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Rekap Bulanan</Label>
                            <Switch
                                checked={config.parent_app_monthly_recap_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_monthly_recap_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Tracking Harian</Label>
                            <Switch
                                checked={config.parent_app_daily_tracking_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_daily_tracking_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded">
                            <Label>Lapor Ketidakhadiran</Label>
                            <Switch
                                checked={config.parent_app_report_absence_enabled ?? false}
                                onCheckedChange={(checked) => handleChange('parent_app_report_absence_enabled', checked)}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
           </Card>
        )}
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default SettingsPage;
