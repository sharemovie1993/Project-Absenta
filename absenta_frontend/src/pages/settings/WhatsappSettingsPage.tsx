/**
 * WhatsappSettingsPage.tsx
 * Halaman utama konfigurasi WhatsApp Gateway.
 *
 * Hardening Compliance:
 * - Menggunakan SectionCard fullWidth min-w-0 sebagai pembungkus utama (Kontainer Standar Absenta)
 * - Ukuran berkas < 800 baris (modular subcomponents di src/components/whatsapp/)
 * - Subkomponen dimuat via lazy() + Suspense
 * - Strict TypeScript (zero `:any`, safe error handling)
 * - Validation Guard via Zod Schema
 * - Bebas hardcode mock data & hardcode API URLs
 */

import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Loader, Alert, AlertTitle, AlertDescription,
  Tabs, TabsList, TabsTrigger, TabsContent, SectionCard,
} from '@/components/ui';
import {
  Save, Send, ShieldCheck, FileText, Info,
  CheckCircle2, History, ArrowRight, Users,
} from 'lucide-react';
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
} from '@/components/whatsapp/whatsappSettings.types';

// Lazy loading sub-components
const PremiumFeatureGate = lazy(() => import('@/components/auth/PremiumFeatureGate'));
const WhatsappConnectionForm = lazy(() => import('@/components/whatsapp/WhatsappConnectionForm'));
const WhatsappTemplateForm = lazy(() => import('@/components/whatsapp/WhatsappTemplateForm'));
const WhatsappTrialForm = lazy(() => import('@/components/whatsapp/WhatsappTrialForm'));
const WhatsappGroupsTab = lazy(() => import('@/components/whatsapp/WhatsappGroupsTab'));


const WhatsappSettingsPage: React.FC = () => {
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
    setConfig(prev => ({ ...prev, ...patch }));
  }, []);

  // ── Fetch local WA gateway status ────────────────────────────────────────
  const fetchLocalStatus = useCallback(async () => {
    try {
      const response = (await getLocalWhatsappStatus()) as WaLocalStatusResponse;
      if (response.success && response.data) {
        const { status, number } = response.data;
        if (status === 'connected') {
          setLocalStatus('connected');
          if (number) setConnectedNumber(number);
          setQrCode(null);
        } else if (status === 'connecting') {
          setLocalStatus('connecting');
          const qrRes = (await getLocalWhatsappQR()) as WaQrResponse;
          if (qrRes.success && qrRes.qr) {
            setQrCode(qrRes.qr);
          }
        } else {
          // Hanya ubah ke disconnected jika tidak ada QR aktif di state
          setLocalStatus((prevStatus) => {
            if (prevStatus === 'connecting') {
              return 'connecting'; // Pertahankan connecting jika baru diinisialisasi
            }
            return 'disconnected';
          });
          setConnectedNumber(null);
        }
      }
    } catch (err) {
      console.warn('[WA] fetchLocalStatus:', extractWaError(err, 'Unknown error'));
      setLocalStatus('disconnected');
    }
  }, []);

  const handleConnectLocal = useCallback(async () => {
    try {
      setLocalStatus('connecting');
      const response = (await connectLocalWhatsapp()) as any;
      if (response.success) {
        if (response.qr) {
          setQrCode(response.qr);
        }
        toast.success('Sesi WhatsApp diinisialisasi. Menunggu QR code...');
      }
    } catch (err: unknown) {
      toast.error(extractWaError(err, 'Gagal memulai sesi WhatsApp'));
      setLocalStatus('disconnected');
      setQrCode(null);
    }
  }, []);

  const handleDisconnectLocal = useCallback(async () => {
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
  }, []);

  // ── Fetch config dari API ─────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = (await getWhatsappConfig()) as WaApiResponse;
      if (response.success && response.data) {
        setConfig(response.data);
        setDbProviderName(response.data.provider_name);
      }
    } catch (err: unknown) {
      toast.error(extractWaError(err, 'Gagal memuat konfigurasi WhatsApp'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Poll local status
  useEffect(() => {
    fetchLocalStatus();
    const interval = setInterval(fetchLocalStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchLocalStatus]);

  // ── Save config with Zod Validation Guard ─────────────────────────────────
  const handleSave = useCallback(async () => {
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
  }, [config]);

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

  // ── UI Memos ──────────────────────────────────────────────────────────────
  const breadcrumbs = useMemo(
    () => [
      { label: 'Sistem', path: '/settings' },
      { label: 'WhatsApp', path: '/settings/whatsapp' },
    ],
    [],
  );

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="WhatsApp Service"
      description="Konfigurasi sistem notifikasi otomatis untuk orang tua dan wali siswa."
      hardeningModuleKey="whatsappsettings"
      breadcrumbs={breadcrumbs}
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
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          moduleName="WHATSAPP"
          featureName="WhatsApp Notification Gateway"
          description="Aktifkan notifikasi otomatis ke orang tua siswa lewat WhatsApp. Anda dapat mengatur provider gateway, template pesan, dan melakukan pengujian pengiriman."
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-0 bg-transparent shadow-none p-0">
            <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-5xl mx-auto w-full">
              {/* Info Alert */}
              <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700 dark:text-blue-400 font-bold">
                  Model Bring Your Own Gateway (BYOG)
                </AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-300 text-xs">
                  Absenta tidak menyediakan nomor WA pengirim. Anda bebas menggunakan provider gateway manapun.
                  Pastikan Anda memiliki API Key yang aktif.
                </AlertDescription>
              </Alert>

              {/* Quick Access: Riwayat Chat */}
              <div
                role="button"
                tabIndex={0}
                id="wa-chatlog-shortcut"
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 cursor-pointer hover:from-emerald-500/15 hover:to-teal-500/10 transition-all group shadow-sm"
                onClick={() => navigate('/notifications/wa-chat-logs')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/notifications/wa-chat-logs');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Riwayat Percakapan Chatbot WA</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Monitor semua percakapan user dengan chatbot WhatsApp secara real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 group-hover:gap-3 transition-all">
                  <span className="text-xs font-semibold hidden sm:block">Lihat</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="connection" className="w-full">
                <MenuTabs className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 mb-8">
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
              <div className="flex justify-end pt-8">
                <Button
                  id="btn-save-wa-config"
                  onClick={handleSave}
                  disabled={saving}
                  size="toolbar"
                  variant="toolbarPrimary"
                  className="h-14 px-8 font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                >
                  {saving ? (
                    <Loader className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Simpan Konfigurasi WhatsApp
                </Button>
              </div>
            </div>
          </SectionCard>
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default WhatsappSettingsPage;
