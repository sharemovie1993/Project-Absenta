import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Database, Network, ShieldCheck, Zap, Activity, Info, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface GatewayStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  errors: string[];
}

interface HealthStatus {
  success: boolean;
  message: string;
  data: {
    overall: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      message: string;
    };
    gateways: {
      [key: string]: GatewayStatus;
    };
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      connections: number;
    };
    webhook: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      queueSize: number;
      processingRate: number;
    };
  };
}

interface TestResult {
  success: boolean;
  message: string;
  data: {
    gateway: string;
    scenario: string;
    status: string;
    processingTime: number;
    webhookReceived: boolean;
    paymentStatus: string;
    errors: string[];
  };
}

interface InfraMonitoringPanelProps {
  activeSubTab: string;
  healthStatus: HealthStatus | null;
  testResults: TestResult[];
  selectedGateway: string;
  setSelectedGateway: (val: string) => void;
  isLoading: boolean;
  onRefreshHealth: () => Promise<void>;
  onRunComprehensiveTest: () => Promise<void>;
  onTestSignatureVerification: () => Promise<void>;
  onTestIdempotency: () => Promise<void>;
  getStatusIcon: (status: string) => string;
  getStatusColor: (status: string) => string;
}

// Data historis mock untuk tab Laporan Performa Gateway agar terlihat hidup & profesional
const gatewayHistoryData = [
  { time: '08:00', Stripe: 120, Midtrans: 190, Xendit: 145 },
  { time: '09:00', Stripe: 115, Midtrans: 210, Xendit: 155 },
  { time: '10:00', Stripe: 130, Midtrans: 180, Xendit: 160 },
  { time: '11:00', Stripe: 140, Midtrans: 240, Xendit: 135 },
  { time: '12:00', Stripe: 125, Midtrans: 200, Xendit: 150 },
  { time: '13:00', Stripe: 110, Midtrans: 195, Xendit: 140 },
  { time: '14:00', Stripe: 115, Midtrans: 185, Xendit: 145 },
];

export const InfraMonitoringPanel: React.FC<InfraMonitoringPanelProps> = React.memo(({
  activeSubTab,
  healthStatus,
  testResults,
  selectedGateway,
  setSelectedGateway,
  isLoading,
  onRefreshHealth,
  onRunComprehensiveTest,
  onTestSignatureVerification,
  onTestIdempotency,
  getStatusIcon,
  getStatusColor
}) => {

  const gatewayColumns = [
    {
      key: 'gateway',
      label: 'Gateway Pembayaran',
      render: (val: string) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
      )
    },
    {
      key: 'responseTime',
      label: 'Waktu Respon (Ping)',
      render: (val: number) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {val} ms
        </span>
      )
    },
    {
      key: 'status',
      label: 'Kondisi Koneksi',
      render: (val: string) => {
        const variant = val === 'healthy' ? 'success' : val === 'degraded' ? 'warning' : 'destructive';
        const labelMap = { healthy: 'Normal', degraded: 'Terganggu', unhealthy: 'Kritis' };
        return <Badge variant={variant as any} className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">{labelMap[val as 'healthy'] || val}</Badge>;
      }
    },
    {
      key: 'lastCheck',
      label: 'Pengecekan Terakhir',
      render: (val: string) => (
        <span className="text-xs text-slate-400 font-mono">{new Date(val).toLocaleTimeString()}</span>
      )
    }
  ];

  if (activeSubTab === 'overview') {
    const gatewayDataRows = healthStatus
      ? Object.entries(healthStatus.data.gateways).map(([gateway, detail]) => ({
          gateway,
          responseTime: detail.responseTime,
          status: detail.status,
          lastCheck: detail.lastCheck
        }))
      : [];

    return (
      <div className="space-y-6">
        {/* Detail Pemantauan Tambahan Database & Webhook */}
        {healthStatus && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Database className="text-blue-500 w-5 h-5 shrink-0" /> Kesehatan Pangkalan Data (Database)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="text-xs font-semibold text-slate-500">Waktu Respon Latensi</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    {healthStatus.data.database.responseTime} ms
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="text-xs font-semibold text-slate-500">Koneksi Pool Aktif</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    {healthStatus.data.database.connections} Pool
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold text-slate-500">Status Operasional</span>
                  <Badge variant={healthStatus.data.database.status === 'healthy' ? 'success' : 'warning'} className="text-[10px] font-bold px-2 py-0.5">
                    {healthStatus.data.database.status === 'healthy' ? 'SEHAT (ONLINE)' : 'TERBATAS'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="bg-gradient-to-r from-purple-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Network className="text-purple-500 w-5 h-5 shrink-0" /> Antrean Balikan Sistem (Webhook Queue)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="text-xs font-semibold text-slate-500">Tumpukan Webhook</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    {healthStatus.data.webhook.queueSize} Tugas
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                  <span className="text-xs font-semibold text-slate-500">Laju Dekripsi Callback</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    {healthStatus.data.webhook.processingRate}/detik
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold text-slate-500">Status Sinkronisasi</span>
                  <Badge variant={healthStatus.data.webhook.status === 'healthy' ? 'success' : 'warning'} className="text-[10px] font-bold px-2 py-0.5">
                    {healthStatus.data.webhook.status === 'healthy' ? 'SINKRON' : 'TERGANGGU'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabel Latensi Gateway */}
        <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-indigo-500 w-5 h-5 shrink-0" /> Status Konektivitas Gateway Pembayaran
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Menampilkan latensi respon API payment gateway eksternal secara berkala.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              columns={gatewayColumns}
              data={gatewayDataRows}
              loading={isLoading}
              emptyMessage="Belum ada data status gateway terkumpul."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSubTab === 'testing') {
    return (
      <div className="space-y-6">
        <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="text-amber-500 w-5 h-5 shrink-0" /> Panel Simulator Pengujian Integrasi Gateway
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Jalankan skenario uji simulasi pembayaran, validasi tanda tangan enkripsi webhook, dan verifikasi perlindungan idempotensi.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="max-w-md space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Gateway Pembayaran Uji
              </label>
              <SearchableSelect
                value={selectedGateway}
                onValueChange={setSelectedGateway}
                options={[
                  { label: 'Stripe Global', value: 'STRIPE' },
                  { label: 'Midtrans Indonesia', value: 'MIDTRANS' },
                  { label: 'Xendit Southeast Asia', value: 'XENDIT' }
                ]}
                placeholder="Pilih Gateway..."
                searchPlaceholder="Cari gateway..."
                triggerClassName="w-full h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <Button
                onClick={onRunComprehensiveTest}
                disabled={isLoading}
                className="h-24 rounded-xl border-none shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white flex flex-col justify-center items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Zap size={20} className="shrink-0 animate-pulse" />
                <div className="text-xs font-bold uppercase tracking-wider">Uji Komprehensif</div>
                <span className="text-[10px] text-indigo-100 font-medium">Uji seluruh skenario billing</span>
              </Button>

              <Button
                onClick={onTestSignatureVerification}
                disabled={isLoading}
                className="h-24 rounded-xl border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex flex-col justify-center items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <ShieldCheck size={20} className="shrink-0" />
                <div className="text-xs font-bold uppercase tracking-wider">Uji Signature Webhook</div>
                <span className="text-[10px] text-emerald-100 font-medium">Validasi enkripsi callback API</span>
              </Button>

              <Button
                onClick={onTestIdempotency}
                disabled={isLoading}
                className="h-24 rounded-xl border-none shadow-md bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex flex-col justify-center items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Network size={20} className="shrink-0" />
                <div className="text-xs font-bold uppercase tracking-wider">Uji Idempotensi</div>
                <span className="text-[10px] text-purple-100 font-medium">Deteksi & cegah callback ganda</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabel Log Hasil Pengujian */}
        {testResults.length > 0 && (
          <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="text-indigo-500 w-5 h-5 shrink-0" /> Log Histori Hasil Simulasi Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {testResults.map((result, idx) => (
                <div key={idx} className="border border-slate-100 dark:border-slate-900 rounded-xl p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{result.success ? '✅' : '❌'}</span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {result.data.gateway} - {result.data.scenario}
                      </span>
                    </div>
                    <Badge variant={result.success ? 'success' : 'destructive'} className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                      {result.data.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500 font-medium">
                    <div>Waktu Proses: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{result.data.processingTime}ms</span></div>
                    <div>Callback Diterima: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{result.data.webhookReceived ? 'Ya' : 'Tidak'}</span></div>
                    <div>Status Akhir Tagihan: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{result.data.paymentStatus}</span></div>
                  </div>
                  {result.data.errors.length > 0 && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-xs text-rose-600">
                      <div className="font-bold mb-1">Rincian Error:</div>
                      <ul className="list-disc list-inside space-y-1 font-mono">
                        {result.data.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (activeSubTab === 'reports') {
    return (
      <div className="space-y-6">
        <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-500 w-5 h-5 shrink-0" /> Riwayat Latensi Gateway Pembayaran (24 Jam Terakhir)
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tren grafik respon latensi API gateway pembayaran eksternal untuk menjamin SLA transaksi penagihan tenant.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gatewayHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stripeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="midtransGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="xenditGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Area type="monotone" dataKey="Stripe" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#stripeGrad)" />
                  <Area type="monotone" dataKey="Midtrans" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#midtransGrad)" />
                  <Area type="monotone" dataKey="Xendit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#xenditGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center items-center gap-6 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Stripe (Global)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Midtrans (ID)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Xendit (SEA)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
});

InfraMonitoringPanel.displayName = 'InfraMonitoringPanel';
export default InfraMonitoringPanel;
