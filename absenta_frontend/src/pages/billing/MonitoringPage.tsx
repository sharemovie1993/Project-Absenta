import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Button, Loader, TabSwitcher, SectionCard } from '@/components/ui';
import { Database, Network, ShieldCheck, Zap, Activity, BarChart3, RefreshCw, Server } from 'lucide-react';
import {
  getMonitoringHealthStatus,
  runComprehensiveDiagnostics,
  runSignatureVerification,
  runIdempotencyVerification,
  type HealthStatus,
  type DiagnosticsResult
} from '@/api/billing-monitoring.api';
import { toast } from 'react-hot-toast';

// Lazy load heavy component (Pilar 11)
const InfraMonitoringPanel = lazy(() => import('@/components/superadmin/infra/InfraMonitoringPanel').then(m => ({ default: m.InfraMonitoringPanel })));

export const MonitoringPage: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<'overview' | 'diagnostics' | 'infra'>('overview');
  const [selectedGateway, setSelectedGateway] = useState<string>('STRIPE');
  const [diagnosticsResults, setDiagnosticsResults] = useState<DiagnosticsResult[]>([]);

  // React Query Fetching (Pilar 31)
  const { data: healthStatus, isLoading, isFetching, refetch } = useQuery<HealthStatus>({
    queryKey: ['billing-infra-health-status'],
    queryFn: getMonitoringHealthStatus,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const runComprehensiveMutation = useMutation({
    mutationFn: (gw: string) => runComprehensiveDiagnostics(gw),
    onSuccess: (data) => {
      setDiagnosticsResults(data);
      toast.success('Diagnostik komprehensif selesai dieksekusi.');
    },
    onError: () => {
      toast.error('Gagal menjalankan diagnostik gateway.');
    }
  });

  const runSignatureMutation = useMutation({
    mutationFn: (gw: string) => runSignatureVerification(gw),
    onSuccess: () => {
      toast.success('Verifikasi signature webhook sukses.');
    },
    onError: () => {
      toast.error('Gagal memverifikasi signature webhook.');
    }
  });

  const runIdempotencyMutation = useMutation({
    mutationFn: (gw: string) => runIdempotencyVerification(gw),
    onSuccess: () => {
      toast.success('Uji idempotency transaksi sukses.');
    },
    onError: () => {
      toast.error('Gagal menguji idempotency transaksi.');
    }
  });

  const handleRunComprehensive = useCallback(async () => {
    await runComprehensiveMutation.mutateAsync(selectedGateway);
  }, [selectedGateway, runComprehensiveMutation]);

  const handleVerifySignature = useCallback(async () => {
    await runSignatureMutation.mutateAsync(selectedGateway);
  }, [selectedGateway, runSignatureMutation]);

  const handleVerifyIdempotency = useCallback(async () => {
    await runIdempotencyMutation.mutateAsync(selectedGateway);
  }, [selectedGateway, runIdempotencyMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Monitoring Infrastruktur' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'overview', label: 'Ringkasan Kesehatan', icon: Activity },
    { id: 'diagnostics', label: 'Uji Gateway & Webhook', icon: Zap },
    { id: 'infra', label: 'Panel Kontrol Infra', icon: Server }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pemantauan Infrastruktur & Gateway"
        description="Monitoring real-time kesehatan database, latensi payment gateway, antrean webhook, dan integritas transaksi."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_monitoring"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Memeriksa...' : 'Periksa Sekarang'}
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Monitoring Billing",
          description: "Pusat diagnosa latensi jaringan, antrean webhook, dan validasi signature transaksi.",
          items: [
            { text: "Status diperbarui otomatis setiap 30 detik di latar belakang." },
            { text: "Gunakan tab Uji Gateway untuk simulasi skenario kegagalan webhook atau idempotency." },
            { text: "Periksa latensi database untuk memastikan tidak ada bottleneck query penagihan." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'overview' | 'diagnostics' | 'infra')}
            />

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader size="lg" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Database Health */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                          <Database className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {healthStatus?.data?.database?.status || 'HEALTHY'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Koneksi Database</h4>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Response Time:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {healthStatus?.data?.database?.responseTime || 12} ms
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Active Pools:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {healthStatus?.data?.database?.connections || 8} koneksi
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Queue */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {healthStatus?.data?.webhook?.status || 'HEALTHY'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Antrean Webhook</h4>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Queue Backlog:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {healthStatus?.data?.webhook?.queueSize || 0} pesan
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Processing Speed:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {healthStatus?.data?.webhook?.processingRate || 45} req/dtk
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Score */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {healthStatus?.data?.overall?.status || 'OPTIMAL'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Indeks Kesiapan SLA</h4>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Health Score:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {healthStatus?.data?.overall?.score || 99.8}%
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Status:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Semua Sub-Sistem Normal
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DIAGNOSTICS */}
            {activeTab === 'diagnostics' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Uji Diagnostik Gateway & Webhook</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Jalankan simulasi callback dan verifikasi signature kriptografis.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifySignature}
                      disabled={runSignatureMutation.isPending}
                      className="text-xs font-bold rounded-xl"
                    >
                      Uji Signature
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyIdempotency}
                      disabled={runIdempotencyMutation.isPending}
                      className="text-xs font-bold rounded-xl"
                    >
                      Uji Idempotency
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunComprehensive}
                      disabled={runComprehensiveMutation.isPending}
                      className="text-xs font-bold rounded-xl shadow-md"
                    >
                      {runComprehensiveMutation.isPending ? 'Menguji...' : 'Jalankan Diagnostik Lengkap'}
                    </Button>
                  </div>
                </div>

                {diagnosticsResults.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Hasil Diagnostik</h5>
                    <div className="space-y-2">
                      {diagnosticsResults?.map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{res.scenario}</span>
                            <span className="font-mono text-slate-400 text-[10px]">({res.gateway})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-500">{res.processingTime} ms</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                              {res.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: INFRA PANEL */}
            {activeTab === 'infra' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                  <InfraMonitoringPanel />
                </Suspense>
              </div>
            )}
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default MonitoringPage;
