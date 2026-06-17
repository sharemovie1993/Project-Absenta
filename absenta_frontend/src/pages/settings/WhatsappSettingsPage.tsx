import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Switch, Loader, Alert, AlertTitle, AlertDescription, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui';
import { MessageSquare, Save, Send, ShieldCheck, FileText, Info, CheckCircle2, XCircle } from 'lucide-react';
import { getWhatsappConfig, saveWhatsappConfig, testWhatsappConnection, type WhatsappConfig } from '@/api/whatsapp.api';
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

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getWhatsappConfig();
      if (response.success && response.data) {
        setConfig(response.data);
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

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const response = await saveWhatsappConfig(config);
      if (response.success) {
        toast.success('Konfigurasi berhasil disimpan');
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
                <CardTitle className="text-lg font-bold">Kredensial API Gateway</CardTitle>
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
                    <p className="text-xs text-slate-500 mt-2">Pastikan API Key sudah disimpan sebelum melakukan pengetesan.</p>
                  </div>
                  
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
