import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, CheckCircle, AlertTriangle, Clock, Send } from 'lucide-react';
import { Button, Card, SectionHeader, Badge, Loader, ErrorAlert, WarningAlert, Input, Textarea } from '../../components/ui';
import { getNotificationServiceStatus, sendTestWhatsApp } from '../../api/notifications.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { formatDate } from '../../utils/layoutUtils';

const WhatsAppHealthPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [waConfigured, setWaConfigured] = useState<boolean>(false);
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [testPhone, setTestPhone] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('Tes WhatsApp dari sistem');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const status = useMemo<'healthy' | 'degraded' | 'unhealthy'>(() => {
    if (!waConfigured) return 'degraded';
    if (waStatus === 'connected' && !error) return 'healthy';
    if (error) return 'unhealthy';
    return 'degraded';
  }, [waConfigured, waStatus, error]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setLastCheck('');
    setTestResult(null);
    try {
      const res = await getNotificationServiceStatus();
      setWaConfigured(Boolean(res?.data?.whatsapp?.configured));
      setWaStatus((res?.data?.whatsapp?.status || 'disconnected') as 'connected' | 'disconnected');
      setLastCheck(new Date().toISOString());
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Gagal memuat status WhatsApp';
      setError(msg);
      setWaConfigured(false);
      setWaStatus('disconnected');
      setLastCheck(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await sendTestWhatsApp({ phoneNumber: testPhone, message: testMessage });
      setTestResult({ success: !!res?.success, message: res?.message || '' });
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Gagal mengirim WhatsApp' });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <PremiumFeatureGate
      moduleName="WHATSAPP"
      featureName="WhatsApp Service Monitoring"
      description="Pantau status koneksi dan kesehatan layanan gateway WhatsApp Anda untuk memastikan notifikasi terkirim tepat waktu."
    >
      <div className="p-6 space-y-6">
        <SectionHeader
          title="WhatsApp Health"
          subtitle="Pantau kesehatan integrasi WhatsApp Gateway."
          icon={<MessageCircle className="w-6 h-6" />}
        >
          <Button variant="primary" onClick={refresh} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Cek Ulang
          </Button>
        </SectionHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Status">
            <div className="flex items-center space-x-3">
              {status === 'healthy' && <CheckCircle className="w-6 h-6 text-green-600" />}
              {status === 'degraded' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
              {status === 'unhealthy' && <AlertTriangle className="w-6 h-6 text-red-600" />}
              <Badge variant={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'destructive'}>
                {status === 'healthy' ? 'Healthy' : status === 'degraded' ? 'Degraded' : 'Unhealthy'}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-gray-500">Configured</div>
                <div className="text-base">{waConfigured ? 'Ya' : 'Tidak'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-500">Connection</div>
                <div className="text-base">
                  <Badge variant={waStatus === 'connected' ? 'success' : 'destructive'}>
                    {waStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-500">Terakhir Dicek</div>
                <div className="text-base flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {lastCheck ? formatDate(lastCheck) : '-'}
                </div>
              </div>
            </div>
            {loading && (
              <div className="mt-4">
                <Loader />
              </div>
            )}
            {error && (
              <div className="mt-4">
                <ErrorAlert title="Gagal memuat">{error}</ErrorAlert>
              </div>
            )}
          </Card>

          <Card title="Tes WhatsApp">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                <Input
                  placeholder="+6281234567890"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                <Textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Button variant="primary" onClick={runTest} disabled={testing}>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Tes
                </Button>
                {testing && <Loader />}
              </div>
              {testResult && (
                <div className="mt-2">
                  {testResult.success ? (
                    <Badge variant="success">Berhasil: {testResult.message}</Badge>
                  ) : (
                    <Badge variant="destructive">Gagal: {testResult.message}</Badge>
                  )}
                </div>
              )}
              {!waConfigured && (
                <div className="mt-2">
                  <WarningAlert title="Belum terkonfigurasi">Harap setel WHATSAPP_API_KEY dan WHATSAPP_API_URL.</WarningAlert>
                </div>
              )}
            </div>
          </Card>

          <Card title="Ringkasan">
            <div className="space-y-2 text-sm">
              <div>Status diambil dari endpoint status notifikasi.</div>
              <div>Tes pengiriman membantu validasi koneksi dan kredensial.</div>
            </div>
          </Card>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

export default WhatsAppHealthPage;
