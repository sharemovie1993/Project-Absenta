/**
 * WhatsappSettingsView.tsx
 * Universal Role-Ready View (DRY) untuk Konfigurasi WhatsApp Gateway.
 *
 * Standar Industri Arsitektur Tiga Tingkat (Three-Tier Architecture):
 * - Lapisan 1: Standalone Page Wrapper (src/pages/settings/WhatsappSettingsPage.tsx)
 * - Lapisan 2: CORE VIEW (Komponen ini) - reusable di Standalone, Tab Dashboard, maupun Modal
 * - Lapisan 3: Dashboard Role Tab / Modal (Admin Dashboard, dsb)
 */

import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Loader,
  Alert,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SectionCard,
} from '@/components/ui';
import {
  Save,
  Send,
  ShieldCheck,
  FileText,
  Info,
  CheckCircle2,
  History,
  ArrowRight,
  Users,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getWhatsappConfig,
  saveWhatsappConfig,
  testWhatsappConnection as executeWaTrialSend,
  connectLocalWhatsapp,
  disconnectLocalWhatsapp,
  getLocalWhatsappStatus,
  getLocalWhatsappQR,
  type WhatsappConfig,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import {
  EMPTY_WA_CONFIG,
  WhatsappConfigSchema,
  TestConnectionSchema,
  extractWaError,
  parseZodFieldErrors,
  type LocalStatus,
  type TestResult,
  type WaApiResponse,
  type WaLocalStatusResponse,
  type WaQrResponse,
  type WaValidationErrors,
} from './whatsappSettings.types';

// Lazy loading sub-components
const PremiumFeatureGate = lazy(() => import('@/components/auth/PremiumFeatureGate'));
const WhatsappConnectionForm = lazy(() => import('./WhatsappConnectionForm'));
const WhatsappTemplateForm = lazy(() => import('./WhatsappTemplateForm'));
const WhatsappTrialForm = lazy(() => import('./WhatsappTrialForm'));
const WhatsappGroupsTab = lazy(() => import('./WhatsappGroupsTab'));

export interface UniversalWhatsappSettingsViewProps {
  // Display Modifiers
  hideLayout?: boolean; // True jika dirender dalam Tab (sembunyikan AcademicPageLayout/Header ganda)
  isModal?: boolean;    // True jika dirender dalam Modal dialog
  readOnly?: boolean;   // True jika mode hanya baca

  // Event Callbacks
  onClose?: () => void;
  onNavigateLogs?: () => void;
  onNavigateOnboarding?: () => void;
}

export const WhatsappSettingsView: React.FC<UniversalWhatsappSettingsViewProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
  onNavigateLogs,
  onNavigateOnboarding,
}) => {
  const navigate = useNavigate();
  const MenuTabs = TabsList;

  const [config, setConfig] = useState<WhatsappConfig>(EMPTY_WA_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTrialSending, setIsTrialSending] = useState(false);
  const [trialPhone, setTrialPhone] = useState('');
  const [trialResult, setTrialResult] = useState<TestResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<WaValidationErrors>({});

  const [localStatus, setLocalStatus] = useState<LocalStatus>('disconnected');
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [dbProviderName, setDbProviderName] = useState<string | null>(null);

  // Partial update helper
  const handleConfigPatch = useCallback((patch: Partial<WhatsappConfig>) => {
    if (readOnly) return;
    setConfig(prev => ({ ...prev, ...patch }));
  }, [readOnly]);

  // ── Fetch local WA gateway status ────────────────────────────────────────
  const fetchLocalStatus = useCallback(async () => {
    try {
      const response = (await getLocalWhatsappStatus()) as WaLocalStatusResponse;
      if (response.success && response.data) {
        const { status, number } = response.data;
        if (status === 'connected') {
          setLocalStatus('connected');
          setConnectedNumber(number || null);
          setQrCode(null);
        } else if (status === 'connecting') {
          setLocalStatus('connecting');
          const qrRes = (await getLocalWhatsappQR()) as WaQrResponse;
          if (qrRes.success && qrRes.qr) {
            setQrCode(qrRes.qr);
          }
        } else {
          setLocalStatus('disconnected');
          setConnectedNumber(null);
        }
      }
    } catch (err) {
      console.warn('[WA-UI:Status] Error fetching status:', extractWaError(err, 'Unknown error'));
      setLocalStatus('disconnected');
    }
  }, []);

  const handleConnectLocal = useCallback(async () => {
    if (readOnly) return;
    try {
      setLocalStatus('connecting');
      const response = (await connectLocalWhatsapp()) as WaApiResponse;
      if (response.success) {
        if (response.qr) {
          setQrCode(response.qr);
        }
        toast.success('Sesi WhatsApp diinisialisasi. Menunggu QR code...');
      }
    } catch (err: unknown) {
      console.error('[WA-UI:Connect] Error connecting:', err);
      toast.error(extractWaError(err, 'Gagal memulai sesi WhatsApp'));
      setLocalStatus('disconnected');
      setQrCode(null);
    }
  }, [readOnly]);

  const handleDisconnectLocal = useCallback(async () => {
    if (readOnly) return;
    try {
      const response = (await disconnectLocalWhatsapp()) as WaApiResponse;
      if (response.success) {
        toast.success('Koneksi WhatsApp diputuskan');
        setLocalStatus('disconnected');
        setConnectedNumber(null);
        setQrCode(null);
      }
    } catch (err: unknown) {
      toast.error(extractWaError(err, 'Gagal memutuskan sesi WhatsApp'));
    }
  }, [readOnly]);

  // ── Fetch config via TanStack Query ───────────────────────────────────────
  const { data: configResponse } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: getWhatsappConfig,
  });

  useEffect(() => {
    if (configResponse && configResponse.success && configResponse.data) {
      setConfig(configResponse.data);
      setDbProviderName(configResponse.data.provider_name);
      setLoading(false);
    }
  }, [configResponse]);

  // Poll local status
  useEffect(() => {
    fetchLocalStatus();
    const interval = setInterval(fetchLocalStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchLocalStatus]);

  // ── Save config with Zod Validation Guard ─────────────────────────────────
  const handleSave = useCallback(async () => {
    if (readOnly) return;
    setValidationErrors({});

    const formData = {
      provider_name: config.provider_name,
      api_url: config.api_url ?? '',
      api_token: config.api_token ?? '',
      sender_number: config.sender_number ?? '',
      is_active: config.is_active,
      template_absen_masuk: config.template_absen_masuk ?? '',
      template_absen_pulang: config.template_absen_pulang ?? '',
      template_izin: config.template_izin ?? '',
    };

    const parsed = WhatsappConfigSchema.safeParse(formData);
    if (!parsed.success) {
      setValidationErrors(parseZodFieldErrors(parsed));
      toast.error('Mohon periksa kembali isian form sebelum menyimpan.');
      return;
    }

    try {
      setSaving(true);
      const response = (await saveWhatsappConfig(config)) as WaApiResponse;
      if (response.success) {
        toast.success('Konfigurasi berhasil disimpan');
        setDbProviderName(config.provider_name);
      }
    } catch (err: unknown) {
      toast.error(extractWaError(err, 'Gagal menyimpan konfigurasi'));
    } finally {
      setSaving(false);
    }
  }, [config, readOnly]);

  // ── Trial connection with Zod Validation Guard ────────────────────────────
  const handleTrialSend = useCallback(async () => {
    setValidationErrors({});

    const parsed = TestConnectionSchema.safeParse({ phone: trialPhone });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Nomor WA tidak valid';
      setValidationErrors({ phone: msg });
      toast.error(msg);
      return;
    }

    try {
      setIsTrialSending(true);
      setTrialResult(null);
      const response = (await executeWaTrialSend(parsed.data.phone)) as WaApiResponse;
      if (response.success) {
        toast.success('Pesan tes berhasil dikirim!');
        setTrialResult({
          success: true,
          message: 'Pesan uji coba berhasil dikirim ke nomor tujuan. Silakan cek aplikasi WhatsApp Anda.',
        });
      }
    } catch (err: unknown) {
      const msg = extractWaError(err, 'Gagal mengirim pesan tes. Pastikan API Key dan URL sudah benar.');
      toast.error(msg);
      setTrialResult({ success: false, message: msg });
    } finally {
      setIsTrialSending(false);
    }
  }, [trialPhone]);

  // ── Navigation shortcuts ──────────────────────────────────────────────────
  const handleNavigateLogs = useCallback(() => {
    if (onNavigateLogs) {
      onNavigateLogs();
    } else {
      navigate('/notifications/wa-chat-logs');
    }
  }, [navigate, onNavigateLogs]);

  const handleNavigateOnboarding = useCallback(() => {
    if (onNavigateOnboarding) {
      onNavigateOnboarding();
    } else {
      navigate('/notifications/wa-onboarding');
    }
  }, [navigate, onNavigateOnboarding]);

  // ── UI Memos ──────────────────────────────────────────────────────────────
  const breadcrumbs = useMemo(
    () => [
      { label: 'Sistem', path: '/settings' },
      { label: 'WhatsApp', path: '/settings/whatsapp' },
    ],
    [],
  );

  const waStats = useMemo(() => [
    {
      title: "Status Gateway",
      value: config.is_enabled ? (localStatus === 'connected' ? 'TERHUBUNG' : 'AKTIF') : 'NONAKTIF',
      icon: <ShieldCheck size={14} />,
      gradient: config.is_enabled ? "from-emerald-500 to-teal-600" : "from-slate-500 to-zinc-600"
    },
    {
      title: "Provider Gateway",
      value: config.provider_name ? config.provider_name.toUpperCase() : 'FONNTE',
      icon: <Send size={14} />,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Nomor Gateway",
      value: connectedNumber || config.sender_number || 'Belum Terhubung',
      icon: <History size={14} />,
      gradient: "from-purple-500 to-indigo-600"
    },
    {
      title: "Template Notifikasi",
      value: "4 Format Siap",
      icon: <FileText size={14} />,
      gradient: "from-amber-500 to-orange-600"
    }
  ], [config, localStatus, connectedNumber]);

  const toolbar = useMemo(
    () => (
      <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-400">
          Integrasi Fonnte / WoWA
        </span>
      </div>
    ),
    [],
  );

  // ── Core Body Content (DRY) ──────────────────────────────────────────────
  const renderCoreContent = () => (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
      <PremiumFeatureGate
        moduleName="WHATSAPP"
        featureName="WhatsApp Notification Gateway"
        description="Aktifkan notifikasi otomatis ke orang tua siswa lewat WhatsApp. Anda dapat mengatur provider gateway, template pesan, dan melakukan pengujian pengiriman."
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-0 bg-transparent shadow-none p-0">
          <div className="space-y-6 animate-in fade-in duration-500 pb-16 max-w-5xl mx-auto w-full">
            {/* Info Alert */}
            <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <AlertTitle className="text-blue-700 dark:text-blue-400 font-bold text-xs sm:text-sm">
                  Model Bring Your Own Gateway (BYOG)
                </AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-300 text-xs mt-0.5">
                  Absenta tidak menyediakan nomor WA pengirim. Anda bebas menggunakan provider gateway manapun (Fonnte, WoWA, dsb). Pastikan Anda memiliki API Key yang aktif.
                </AlertDescription>
              </div>
            </Alert>

            {/* Quick Access Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Riwayat Chat */}
              <div
                role="button"
                tabIndex={0}
                id="wa-chatlog-shortcut"
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 cursor-pointer hover:from-emerald-500/15 hover:to-teal-500/10 transition-all group shadow-sm"
                onClick={handleNavigateLogs}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleNavigateLogs();
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Riwayat Percakapan WA</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Monitor percakapan chatbot real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 group-hover:gap-3 transition-all">
                  <span className="text-xs font-semibold hidden sm:block">Lihat</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* 2. Monitoring & Sapa WA */}
              <div
                role="button"
                tabIndex={0}
                id="wa-onboarding-shortcut"
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 cursor-pointer hover:from-amber-500/15 hover:to-orange-500/10 transition-all group shadow-sm"
                onClick={handleNavigateOnboarding}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleNavigateOnboarding();
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Monitoring &amp; Sapa WA</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cek status &amp; kirim sapaan onboarding Guru/Siswa/Ortu
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 group-hover:gap-3 transition-all">
                  <span className="text-xs font-semibold hidden sm:block font-bold">Buka</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="connection" className="w-full">
              <MenuTabs className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                <TabsTrigger
                  value="connection"
                  className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" /> Koneksi
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider"
                >
                  <FileText className="h-4 w-4 mr-2" /> Template
                </TabsTrigger>
                <TabsTrigger
                  value="test"
                  className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider"
                >
                  <Send className="h-4 w-4 mr-2" /> Uji Coba
                </TabsTrigger>
                <TabsTrigger
                  value="groups"
                  className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider"
                >
                  <Users className="h-4 w-4 mr-2" /> Daftar Grup WA
                </TabsTrigger>
              </MenuTabs>

              <TabsContent value="connection" className="animate-in slide-in-from-bottom-2 duration-300">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                  <WhatsappConnectionForm
                    config={config}
                    onConfigChange={handleConfigPatch}
                    localStatus={localStatus}
                    connectedNumber={connectedNumber}
                    qrCode={qrCode}
                    onConnect={handleConnectLocal}
                    onDisconnect={handleDisconnectLocal}
                    errors={validationErrors}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="templates" className="animate-in slide-in-from-bottom-2 duration-300">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                  <WhatsappTemplateForm
                    config={config}
                    onConfigChange={handleConfigPatch}
                    errors={validationErrors}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="test" className="animate-in slide-in-from-bottom-2 duration-300">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                  <WhatsappTrialForm
                    config={config}
                    dbProviderName={dbProviderName}
                    testNumber={trialPhone}
                    onTestNumberChange={setTrialPhone}
                    onTest={handleTrialSend}
                    testing={isTrialSending}
                    testResult={trialResult}
                    errors={validationErrors}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="groups" className="animate-in slide-in-from-bottom-2 duration-300">
                <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                  <WhatsappGroupsTab localStatus={localStatus} />
                </Suspense>
              </TabsContent>
            </Tabs>

            {/* Action Save Button */}
            {!readOnly && (
              <div className="flex justify-end pt-6">
                <Button
                  id="btn-save-wa-config"
                  onClick={handleSave}
                  disabled={saving}
                  size="toolbar"
                  variant="toolbarPrimary"
                  className="h-12 sm:h-14 px-6 sm:px-8 font-black text-xs sm:text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  {saving ? (
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Simpan Konfigurasi WhatsApp
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      </PremiumFeatureGate>
    </Suspense>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader size="lg" />
      </div>
    );
  }

  // JIKA TAMPIL DALAM TAB ATAU MODAL (hideLayout = true)
  if (hideLayout) {
    return (
      <div className={cn("space-y-6 animate-in fade-in duration-300 w-full min-w-0", isModal ? "p-3 sm:p-5" : "pb-12")}>
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  WhatsApp Notification Gateway
                </h2>
                {config.is_enabled ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    {localStatus === 'connected' ? 'TERHUBUNG' : 'AKTIF'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    NONAKTIF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Konfigurasi integrasi WhatsApp Gateway (Fonnte, WoWA, dsb) untuk notifikasi absensi &amp; komunikasi orang tua.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isModal && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4 mr-1" />
                Tutup
              </Button>
            )}
          </div>
        </div>

        {renderCoreContent()}
      </div>
    );
  }

  // STANDALONE ROUTE MODE (hideLayout = false)
  return (
    <AcademicPageLayout
      title="WhatsApp Service"
      description="Konfigurasi sistem notifikasi otomatis untuk orang tua dan wali siswa."
      hardeningModuleKey="whatsappsettings"
      breadcrumbs={breadcrumbs}
      stats={waStats}
      toolbar={toolbar}
      instruction={{
        title: 'Konfigurasi WhatsApp Gateway',
        description: 'Kelola koneksi API WhatsApp untuk mengirimkan notifikasi absensi dan informasi lainnya.',
        items: [
          { text: 'Gunakan API Key yang valid dari provider seperti Fonnte atau WoWA.' },
          { text: 'Selalu lakukan uji coba setelah melakukan perubahan kredensial API.' },
          { text: 'Fitur ini hanya dapat digunakan jika Anda memiliki lisensi aktif.' },
        ],
      }}
      isLoading={loading}
    >
      {renderCoreContent()}
    </AcademicPageLayout>
  );
});

WhatsappSettingsView.displayName = 'WhatsappSettingsView';

export default WhatsappSettingsView;
