import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Switch, Loader, Alert, AlertTitle, AlertDescription, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui';
import { MessageSquare, Save, Send, ShieldCheck, FileText, Info, CheckCircle2, XCircle, QrCode, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getWhatsappConfig, saveWhatsappConfig, testWhatsappConnection, connectLocalWhatsapp, disconnectLocalWhatsapp, getLocalWhatsappStatus, getLocalWhatsappQR, type WhatsappConfig } from '@/api/whatsapp.api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

const PremiumFeatureGate = lazy(() => import('@/components/auth/PremiumFeatureGate'));

const WhatsappSettingsPage: React.FC = () => {
  const MenuTabs = TabsList;
  const [config, setConfig] = useState<WhatsappConfig>({
    provider_name: 'FONNTE',
    api_url: 'https://' + 'api.fonnte.com/send',
    api_token: '',
    sender_number: '',
    is_active: true,
    template_absen_masuk: 'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah tiba di sekolah pada pukul {{waktu}}. Terima kasih.',
    template_absen_pulang: 'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah meninggalkan sekolah pada pukul {{waktu}}. Terima kasih.',
    template_izin: 'Informasi: {{nama_siswa}} telah dikonfirmasi {{tipe}} pada pukul {{waktu}}.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [localStatus, setLocalStatus] = useState<'disconnected' | 'connecting' | 'connected' | null>(null);
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [dbProviderName, setDbProviderName] = useState<string | null>(null);

  const fetchLocalStatus = useCallback(async () => {
    try {
      const response = await getLocalWhatsappStatus();
      if (response.success && response.data) {
        const status = response.data.status;
        if (status === 'connected') {
          setLocalStatus('connected');
          setConnectedNumber(response.data.number || connectedNumber);
          setQrCode(null);
        } else if (status === 'connecting') {
          // Lock state: Once connected, never drop back to connecting spinner
          setLocalStatus(prev => prev === 'connected' ? 'connected' : 'connecting');
          const qrRes = await getLocalWhatsappQR();
          if (qrRes.success && qrRes.qr) {
            setQrCode(qrRes.qr);
          }
        } else if (status === 'disconnected') {
          setLocalStatus(prev => prev === 'connected' ? 'connected' : 'disconnected');
        }
      }
    } catch (error) {
      console.error('Error fetching local WA status:', error);
    }
  }, [connectedNumber]);

  const handleConnectLocal = useCallback(async () => {
    try {
      setLocalStatus('connecting');
      const response = await connectLocalWhatsapp();
      if (response.success) {
        toast.success('Sesi WhatsApp diinisialisasi. Menunggu QR code...');
        fetchLocalStatus();
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memulai sesi WhatsApp');
      setLocalStatus('disconnected');
    }
  }, [fetchLocalStatus]);

  const handleDisconnectLocal = useCallback(async () => {
    try {
      const response = await disconnectLocalWhatsapp();
      if (response.success) {
        toast.success('Koneksi WhatsApp diputuskan');
        setLocalStatus('disconnected');
        setConnectedNumber(null);
        setQrCode(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memutuskan sesi WhatsApp');
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getWhatsappConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setDbProviderName(response.data.provider_name);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Gagal memuat konfigurasi WhatsApp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Poll local gateway status continuously every 3s so state is never stuck
  useEffect(() => {
    fetchLocalStatus();
    const interval = setInterval(() => {
      fetchLocalStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchLocalStatus]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const response = await saveWhatsappConfig(config);
      if (response.success) {
        toast.success('Konfigurasi berhasil disimpan');
        setDbProviderName(config.provider_name);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan konfigurasi';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!testNumber) {
      toast.error('Masukkan nomor WhatsApp untuk pengetesan');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const response = await testWhatsappConnection(testNumber);
      if (response.success) {
        toast.success('Pesan tes berhasil dikirim!');
        setTestResult({ success: true, message: 'Pesan uji coba berhasil dikirim ke nomor tujuan. Silakan cek aplikasi WhatsApp Anda.' });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Gagal mengirim pesan tes. Pastikan API Key dan URL sudah benar.';
      toast.error(errorMsg);
      setTestResult({ success: false, message: errorMsg });
    } finally {
      setTesting(false);
    }
  }, [testNumber]);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/settings' },
    { label: 'WhatsApp', path: '/settings/whatsapp' }
  ], []);

  const toolbar = useMemo(() => (
    <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400">
        Integrasi Fonnte / WoWA
      </span>
    </div>
  ), []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
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
        title: "Konfigurasi WhatsApp Gateway",
        description: "Kelola koneksi API WhatsApp untuk mengirimkan notifikasi absensi dan informasi lainnya.",
        items: [
          { text: "Gunakan API Key yang valid dari provider seperti Fonnte atau WoWA." },
          { text: "Selalu lakukan uji coba setelah melakukan perubahan kredensial API." },
          { text: "Fitur ini hanya dapat digunakan jika Anda memiliki lisensi aktif." }
        ]
      }}
      isLoading={loading}
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          moduleName="WHATSAPP"
          featureName="WhatsApp Notification Gateway"
          description="Aktifkan notifikasi otomatis ke orang tua siswa lewat WhatsApp. Anda dapat mengatur provider gateway, template pesan, dan melakukan pengujian pengiriman."
        >
          <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-5xl mx-auto">
          <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-400 font-bold">Model Bring Your Own Gateway (BYOG)</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-300 text-xs">
            Absenta tidak menyediakan nomor WA pengirim. Anda bebas menggunakan provider gateway manapun. Pastikan Anda memiliki API Key yang aktif.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="connection" className="w-full">
          <MenuTabs className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 mb-8">
            <TabsTrigger value="connection" className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 mr-2" /> Koneksi
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider">
              <FileText className="h-4 w-4 mr-2" /> Template
            </TabsTrigger>
            <TabsTrigger value="test" className="flex-1 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all py-2.5 font-bold text-xs uppercase tracking-wider">
              <Send className="h-4 w-4 mr-2" /> Uji Coba
            </TabsTrigger>
          </MenuTabs>
          <TabsContent value="connection" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">Kredensial & Tipe Gateway</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Status Layanan</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Aktifkan atau nonaktifkan pengiriman pesan secara global.</p>
                  </div>
                  <Switch 
                    checked={config.is_active} 
                    onCheckedChange={(val) => setConfig({ ...config, is_active: val })} 
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Tipe Gateway</Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, provider_name: 'LOCAL' })}
                      className={`flex-1 py-4 px-6 rounded-2xl border text-left transition-all ${
                        config.provider_name === 'LOCAL'
                          ? 'border-green-600 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className={`h-6 w-6 ${config.provider_name === 'LOCAL' ? 'text-green-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Local Gateway (Scan QR)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Tautkan nomor WhatsApp sendiri dengan scan QR code.</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, provider_name: 'FONNTE' })}
                      className={`flex-1 py-4 px-6 rounded-2xl border text-left transition-all ${
                        config.provider_name !== 'LOCAL'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Send className={`h-6 w-6 ${config.provider_name !== 'LOCAL' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">External API (BYOG)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Gunakan provider pihak ketiga seperti Fonnte atau WoWA.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {config.provider_name === 'LOCAL' ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Status Local Gateway</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Pantau status tautan sesi WhatsApp local Anda.</p>
                      </div>
                      <div>
                        {localStatus === 'connected' ? (
                          <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
                            <Wifi className="h-3 w-3" /> Connected
                          </Badge>
                        ) : localStatus === 'connecting' ? (
                          <Badge variant="warning" className="gap-1 px-3 py-1 text-xs animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Connecting
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 px-3 py-1 text-xs bg-slate-100 dark:bg-slate-850">
                            <WifiOff className="h-3 w-3 text-slate-500" /> Disconnected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {localStatus === 'connected' && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/10 rounded-xl border border-green-100 dark:border-green-900/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div>
                          <p className="text-xs text-green-800 dark:text-green-400 font-bold">Nomor WhatsApp Terhubung</p>
                          <p className="text-sm font-black text-green-900 dark:text-green-300 mt-1">+{connectedNumber}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="bg-white dark:bg-slate-900 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 text-xs font-bold w-full sm:w-auto"
                          onClick={handleDisconnectLocal}
                        >
                          Putuskan Koneksi
                        </Button>
                      </div>
                    )}

                    {localStatus === 'connecting' && (
                      <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        {qrCode ? (
                          <div className="space-y-4 text-center max-w-sm">
                            <div className="bg-white p-4 rounded-2xl inline-block border border-slate-200 shadow-md">
                              <img src={qrCode} alt="WhatsApp Connection QR Code" className="w-56 h-56 mx-auto" />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                              Silakan buka WhatsApp di HP Anda &rarr; <b>Perangkat Tertaut (Linked Devices)</b> &rarr; <b>Tautkan Perangkat</b> lalu scan QR Code di atas.
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-3">
                            <Loader size="lg" />
                            <p className="text-xs text-slate-500">Menyiapkan sesi & memuat QR Code dari server...</p>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          className="text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                          onClick={handleDisconnectLocal}
                        >
                          Batal / Tutup Sesi
                        </Button>
                      </div>
                    )}

                    {localStatus === 'disconnected' && (
                      <div className="text-center py-8 space-y-4 max-w-md mx-auto">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                          <QrCode className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">WhatsApp Belum Ditautkan</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Hubungkan sistem dengan nomor WhatsApp sekolah untuk mengirimkan notifikasi absensi siswa secara langsung dari server.
                          </p>
                        </div>
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-green-600/20"
                          onClick={handleConnectLocal}
                        >
                          Hubungkan WhatsApp
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="provider_name" className="text-[11px] font-black uppercase tracking-widest text-slate-400">Provider Name</Label>
                        <Input 
                          id="provider_name"
                          value={config.provider_name} 
                          onChange={(e) => setConfig({ ...config, provider_name: e.target.value.toUpperCase() })}
                          placeholder="Contoh: FONNTE, WOWA, CUSTOM"
                          className="h-12 rounded-xl border-slate-200 focus:ring-green-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sender_number" className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sender Number</Label>
                        <Input 
                          id="sender_number"
                          value={config.sender_number || ''} 
                          onChange={(e) => setConfig({ ...config, sender_number: e.target.value })}
                          placeholder="628123456789"
                          className="h-12 rounded-xl border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api_url" className="text-[11px] font-black uppercase tracking-widest text-slate-400">Gateway API URL</Label>
                      <Input 
                        id="api_url"
                        value={config.api_url} 
                        onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                        placeholder={"https://" + "api.fonnte.com/send"}
                        className="h-12 rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api_token" className="text-[11px] font-black uppercase tracking-widest text-slate-400">API Token / Key</Label>
                      <Input 
                        id="api_token"
                        type="password"
                        value={config.api_token} 
                        onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                        placeholder="Masukkan API Key dari provider Anda"
                        className="h-12 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="templates" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">Template Notifikasi Otomatis</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl flex gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <p className="font-bold">Panduan Variabel:</p>
                    <p><code>{"{{nama_siswa}}"}</code>, <code>{"{{waktu}}"}</code>, <code>{"{{tipe}}"}</code></p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="template_absen_masuk" className="flex items-center justify-between text-xs font-bold text-slate-600">
                      Template Absen Masuk
                      <Badge variant="outline" className="bg-green-50 text-green-600 text-[9px] border-green-100">AUTO-SEND</Badge>
                    </Label>
                    <textarea 
                      id="template_absen_masuk"
                      className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      value={config.template_absen_masuk || ''} 
                      onChange={(e) => setConfig({ ...config, template_absen_masuk: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="template_absen_pulang" className="flex items-center justify-between text-xs font-bold text-slate-600">
                      Template Absen Pulang
                      <Badge variant="outline" className="bg-green-50 text-green-600 text-[9px] border-green-100">AUTO-SEND</Badge>
                    </Label>
                    <textarea 
                      id="template_absen_pulang"
                      className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      value={config.template_absen_pulang || ''} 
                      onChange={(e) => setConfig({ ...config, template_absen_pulang: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <CardContent className="p-12 text-center space-y-8">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl w-24 h-24 flex items-center justify-center mx-auto shadow-inner border border-slate-100 dark:border-slate-800">
                    <Send className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Uji Coba Pengiriman</h3>
                    <p className="text-xs text-slate-500 mt-2">Kirim pesan uji coba untuk memverifikasi fungsionalitas pengiriman WhatsApp.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 text-left w-full">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gateway Aktif (Database)</p>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {dbProviderName === 'LOCAL' ? 'Local Gateway (Scan QR)' : `External API (BYOG - ${dbProviderName || 'FONNTE'})`}
                      </p>
                    </div>
                    {dbProviderName === 'LOCAL' ? (
                      <Badge variant="success" className="px-2.5 py-0.5 text-[10px]">LOCAL GATEWAY</Badge>
                    ) : (
                      <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50/30">EXTERNAL API</Badge>
                    )}
                  </div>

                  {config.provider_name !== dbProviderName && (
                    <Alert className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 rounded-xl shadow-sm text-left">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800 dark:text-amber-400 font-bold text-xs">Perubahan Belum Disimpan!</AlertTitle>
                      <AlertDescription className="text-amber-600 dark:text-amber-300 text-[11px] leading-relaxed mt-1">
                        Anda telah mengubah opsi gateway di tab <b>Koneksi</b> menjadi <b>{config.provider_name === 'LOCAL' ? 'Local Gateway' : 'External API'}</b>. 
                        Silakan klik tombol <b>Simpan Konfigurasi WhatsApp</b> di bagian bawah halaman terlebih dahulu agar server pengujian menggunakan opsi terbaru Anda.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4 text-left">
                    <div className="space-y-2">
                      <Label htmlFor="test_number" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nomor WA Tujuan</Label>
                      <Input 
                        id="test_number"
                        value={testNumber} 
                        onChange={(e) => setTestNumber(e.target.value)}
                        placeholder="62812xxxxxx"
                        className="h-12 rounded-xl border-slate-200"
                      />
                    </div>
                    
                    <Button 
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-600/20 transition-all font-bold"
                      onClick={handleTest} 
                      disabled={testing}
                    >
                      {testing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Kirim Pesan Uji Coba
                    </Button>
                  </div>

                  {testResult && (
                    <div className={`mt-6 p-4 rounded-xl border animate-in zoom-in-95 duration-300 ${
                      testResult.success 
                        ? 'bg-green-50 border-green-100 text-green-800' 
                        : 'bg-red-50 border-red-100 text-red-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest">
                            {testResult.success ? 'Berhasil' : 'Gagal'}
                          </p>
                          <p className="text-[11px] font-medium opacity-80 mt-0.5">
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Button at the Bottom */}
        <div className="flex justify-end pt-8">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
            className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xl shadow-indigo-600/20 font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
          >
            {saving ? <Loader className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Simpan Konfigurasi WhatsApp
          </Button>
        </div>
      </div>
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default WhatsappSettingsPage;
