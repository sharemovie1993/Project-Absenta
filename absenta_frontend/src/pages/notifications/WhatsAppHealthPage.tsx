import React, { useMemo, useState, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageCircle, RefreshCw, CheckCircle, AlertTriangle, Clock, Send, ShieldCheck, Activity } from 'lucide-react';
import { Button, Card, SectionCard, Badge, Input, Textarea } from '../../components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { getNotificationServiceStatus, sendTestWhatsApp } from '../../api/notifications.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { toast } from 'react-hot-toast';

import { formatDate } from '../../utils/layoutUtils';

// Zod Schema Validation Guard (Pilar 25)
const probeSchema = z.object({
  phoneNumber: z.string().min(8, 'Nomor WhatsApp minimal 8 digit'),
  message: z.string().min(3, 'Pesan verifikasi minimal 3 karakter'),
});

export const WhatsAppHealthPage: React.FC = React.memo(() => {
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [probeMessage, setProbeMessage] = useState<string>('Verifikasi integrasi gateway notifikasi WhatsApp');
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Status via React Query (Pilar 31)
  const { data: statusData, isLoading: loadingStatus, refetch: refreshStatus, error: statusError } = useQuery({
    queryKey: ['wa-gateway-health'],
    queryFn: async () => {
      const res = await getNotificationServiceStatus();
      return {
        configured: Boolean(res?.data?.whatsapp?.configured),
        status: (res?.data?.whatsapp?.status || 'disconnected') as 'connected' | 'disconnected',
        timestamp: new Date().toISOString()
      };
    }
  });

  const waConfigured = statusData?.configured ?? false;
  const waStatus = statusData?.status ?? 'disconnected';
  const lastCheck = statusData?.timestamp ?? '';

  const healthState = useMemo<'healthy' | 'degraded' | 'unhealthy'>(() => {
    if (!waConfigured) return 'degraded';
    if (waStatus === 'connected' && !statusError) return 'healthy';
    if (statusError) return 'unhealthy';
    return 'degraded';
  }, [waConfigured, waStatus, statusError]);

  // Dispatch Probe Mutation
  const sendProbeMutation = useMutation({
    mutationFn: async () => {
      const parsed = probeSchema.parse({ phoneNumber: targetPhone, message: probeMessage });
      const res = await sendTestWhatsApp(parsed);
      return res;
    },
    onSuccess: (res) => {
      setDispatchResult({ success: true, message: res?.message || 'Pesan terkirim ke gateway!' });
      toast.success('Pesan verifikasi WhatsApp berhasil dikirim!');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim WhatsApp';
      setDispatchResult({ success: false, message: msg });
      toast.error(msg);
    }
  });

  const handleRunProbe = useCallback(() => {
    const parsed = probeSchema.safeParse({ phoneNumber: targetPhone, message: probeMessage });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data nomor tujuan belum valid');
      return;
    }
    sendProbeMutation.mutate();
  }, [targetPhone, probeMessage, sendProbeMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Notifikasi', path: '/notifications' },
    { label: 'WhatsApp Service Health' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="WHATSAPP"
      featureName="WhatsApp Service Monitoring"
      description="Pantau status koneksi dan kesehatan layanan gateway WhatsApp Anda untuk memastikan notifikasi terkirim tepat waktu."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="WhatsApp Service Health & Monitoring"
          description="Pantau integritas koneksi, verifikasi transmisi gateway notifikasi pesan, dan latency server WhatsApp."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="whatsapp_health"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => refreshStatus()}
                disabled={loadingStatus}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                Periksa Ulang
              </Button>
            </div>
          }
          instruction={{
            title: 'Panduan Monitoring WhatsApp Health',
            description: 'Gunakan modul ini untuk memastikan webhook dan session token WhatsApp Gateway selalu terhubung aktif.',
            items: [
              { text: 'Periksa status Configured dan Connection pada kartu status utama.' },
              { text: 'Kirim pesan verifikasi ke nomor admin sekolah untuk memastikan pesan benar-benar terkirim.' },
              { text: 'Jika status Degraded atau Disconnected, sambungkan ulang perangkat di menu Pengaturan WhatsApp.' }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kondisi Gateway WhatsApp</h3>
                    </div>
                    <Badge variant={healthState === 'healthy' ? 'success' : healthState === 'degraded' ? 'warning' : 'destructive'} className="font-bold">
                      {healthState === 'healthy' ? '🟢 Optimal' : healthState === 'degraded' ? '🟡 Perlu Perhatian' : '🔴 Terputus'}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-400">Konfigurasi Gateway</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{waConfigured ? '✓ Terkonfigurasi' : 'Belum'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-400">Status Sesi Koneksi</span>
                      <Badge variant={waStatus === 'connected' ? 'success' : 'destructive'} className="text-[10px] font-bold">
                        {waStatus === 'connected' ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-400">Pemeriksaan Terakhir</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {lastCheck ? formatDate(lastCheck) : '-'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Probe Message Card */}
                <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Uji Coba Transmisi Gateway</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label htmlFor="target-phone-input" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nomor WhatsApp Tujuan
                      </label>
                      <Input
                        id="target-phone-input"
                        aria-label="Nomor WhatsApp tujuan verifikasi"
                        placeholder="Contoh: 081234567890"
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div>
                      <label htmlFor="probe-message-input" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Isi Pesan Verifikasi
                      </label>
                      <Textarea
                        id="probe-message-input"
                        aria-label="Isi pesan verifikasi WhatsApp"
                        rows={2}
                        value={probeMessage}
                        onChange={(e) => setProbeMessage(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleRunProbe}
                      disabled={sendProbeMutation.isPending || !targetPhone}
                      className="w-full font-bold rounded-xl text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {sendProbeMutation.isPending ? 'Mengirim...' : 'Kirim Pesan Verifikasi'}
                    </Button>

                    {dispatchResult && (
                      <div className={`p-3 rounded-xl text-xs font-bold ${
                        dispatchResult.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {dispatchResult.success ? '✓ ' : '✕ '}
                        {dispatchResult.message}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default WhatsAppHealthPage;
