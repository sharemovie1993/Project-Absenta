import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Loader, Table, SectionCard, SearchableSelect, Button } from '@/components/ui';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';
import { BarChart3, PieChart as PieChartIcon, Award, ShieldAlert, LineChart as LineChartIcon, RefreshCcw, Search } from 'lucide-react';

// Lazy load heavy charts
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const ScatterChart = lazy(() => import('recharts').then(m => ({ default: m.ScatterChart })));
const Scatter = lazy(() => import('recharts').then(m => ({ default: m.Scatter })));
const ZAxis = lazy(() => import('recharts').then(m => ({ default: m.ZAxis })));

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function levelBadge(level: string) {
  const v = String(level || '').toUpperCase();
  if (v === 'HOT') return <Badge variant="success">Tinggi (HOT)</Badge>;
  if (v === 'HIGH') return <Badge variant="secondary">Sedang (HIGH)</Badge>;
  if (v === 'WARM') return <Badge variant="info">Rendah (WARM)</Badge>;
  return <Badge variant="outline">Rendah (LOW)</Badge>;
}

function levelColor(level: string): string {
  const v = String(level || '').toUpperCase();
  if (v === 'HOT') return '#22c55e';
  if (v === 'HIGH') return '#4ade80';
  if (v === 'WARM') return '#a7f3d0';
  return '#d1d5db';
}

function UpgradeIntelligenceContent() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [topHotPage, setTopHotPage] = useState(1);
  const [topHotSize, setTopHotSize] = useState(10);
  const [scatterPage, setScatterPage] = useState(1);
  const [scatterSize, setScatterSize] = useState(10);

  const instruction = useMemo(() => ({
    title: 'Panduan Upgrade Intelligence',
    description: 'Halaman ini menganalisis niat (intent) sekolah untuk melakukan upgrade paket layanan berdasarkan aktivitas penggunaan fitur.',
    items: [
      { text: 'Grafik Konversi menunjukkan efektivitas corong (funnel) dari ketertarikan hingga pembayaran.' },
      { text: 'Matriks Risiko vs Niat membantu mengidentifikasi sekolah yang butuh bantuan sebelum churn.' },
      { text: 'Daftar Tenant Hot Intent adalah prospek utama untuk dilakukan follow-up oleh tim sales.' }
    ]
  }), []);

  const overviewQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'upgrade-intelligence', 'overview', 12],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getUpgradeOverview(12);
      return res.data;
    },
  });

  const latestMonth = useMemo(() => overviewQuery.data?.latest_month || null, [overviewQuery.data]);
  const month = useMemo(() => selectedMonth || latestMonth, [selectedMonth, latestMonth]);

  const monthQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'upgrade-intelligence', 'month', month],
    queryFn: async () => {
      if (!month) return null;
      const res = await superadminIntelligenceApi.getUpgradeMonthSnapshot(month);
      return res.data;
    },
    enabled: Boolean(month),
  });

  const anyLoading = overviewQuery.isLoading || monthQuery.isLoading;
  const anyError = overviewQuery.isError || monthQuery.isError;

  const monthSnapshot = useMemo(() => monthQuery.data || null, [monthQuery.data]);
  const funnels = useMemo(() => overviewQuery.data?.funnels || [], [overviewQuery.data]);
  
  const months = useMemo(() => {
    return (funnels ?? [])?.map((f) => String(f.month)).slice().reverse();
  }, [funnels]);

  const funnelChartData = useMemo(() => {
    return (months ?? [])?.map((m) => {
      const row = funnels.find((f) => String(f.month) === m);
      const rate = row ? Number(row.conversion_rate || 0) * 100 : 0;
      return { month: m, conversion_rate: rate };
    });
  }, [months, funnels]);

  const funnel = useMemo(() => monthSnapshot?.funnel || null, [monthSnapshot]);
  
  const distribution = useMemo(() => {
    const dist = (monthSnapshot?.intent_distribution || overviewQuery.data?.intent_distribution || []) as any[];
    const map = new Map<string, number>();
    for (const d of dist || []) {
      map.set(String(d.intent_level), Number(d?._count?._all || 0));
    }
    return ['LOW', 'WARM', 'HIGH', 'HOT']?.map((k) => ({ level: k, count: map.get(k) || 0 }));
  }, [monthSnapshot, overviewQuery.data]);

  const topHot = useMemo(() => (monthSnapshot?.top_hot_tenants || overviewQuery.data?.top_hot_tenants || []) as any[], [monthSnapshot, overviewQuery.data]);
  const scatter = useMemo(() => (monthSnapshot?.risk_vs_intent_scatter || []) as any[], [monthSnapshot]);

  const paginatedTopHot = useMemo(() => {
    const start = (topHotPage - 1) * topHotSize;
    return (topHot ?? []).slice(start, start + topHotSize).map((t: any) => ({
      tenant_id: <span className="font-mono text-[11px] font-bold">{String(t.tenant_id || '').substring(0, 16)}...</span>,
      intent: (
        <div className="flex items-center gap-2">
          {levelBadge(String(t.intent_level || ''))}
          <span className="font-black font-mono">{Number(t.intent_score || 0)}</span>
        </div>
      ),
      attempts: <span className="font-mono">{Number(t.upgrade_attempt_count || 0)}</span>,
      paid: <span className="font-mono">{Number(t.upgrade_paid_count || 0)}</span>,
      overdue: <span className="font-mono text-rose-500 font-bold">{Number(t.invoice_overdue_count || 0)}</span>,
      risk: <span className="font-mono font-bold">{Number(t.risk_score_snapshot || 0)}</span>,
      growth: <span className="font-mono font-bold text-emerald-600">{t.usage_growth_percent == null ? '-' : formatPct(Number(t.usage_growth_percent || 0))}</span>,
    }));
  }, [topHot, topHotPage, topHotSize]);

  const paginatedScatter = useMemo(() => {
    const start = (scatterPage - 1) * scatterSize;
    return (scatter ?? []).slice(start, start + scatterSize).map((s: any) => ({
      tenant_id: <span className="font-mono text-[11px] font-bold">{String(s.tenant_id || '').substring(0, 12)}...</span>,
      intent: (
        <div className="flex items-center gap-2">
          {levelBadge(String(s.intent_level || ''))}
          <span className="font-black font-mono">{Number(s.intent_score || 0)}</span>
        </div>
      ),
      risk: <span className="font-mono font-bold">{Number(s.risk_score_snapshot || 0)}</span>,
      paid: <span className="font-mono">{Number(s.upgrade_paid_count || 0)}</span>,
    }));
  }, [scatter, scatterPage, scatterSize]);

  const funnelStageData = useMemo(() => [
    { stage: 'Intent', value: funnel ? Number(funnel.intent_count || 0) : 0 },
    { stage: 'Invoice Created', value: funnel ? Number(funnel.invoice_created_count || 0) : 0 },
    { stage: 'Invoice Paid', value: funnel ? Number(funnel.invoice_paid_count || 0) : 0 },
    { stage: 'Upgrade Applied', value: funnel ? Number(funnel.upgrade_applied_count || 0) : 0 },
  ], [funnel]);

  const pieData = useMemo(() => {
    return (distribution ?? [])?.map((d) => ({ name: d.level, value: d.count, fill: levelColor(d.level) }));
  }, [distribution]);

  const scatterData = useMemo(() => {
    return (scatter ?? [])?.map((s: any) => ({
      tenant_id: String(s.tenant_id || ''),
      intent_score: Number(s.intent_score || 0),
      risk_score_snapshot: Number(s.risk_score_snapshot || 0),
      intent_level: String(s.intent_level || 'LOW'),
      upgrade_paid_count: Number(s.upgrade_paid_count || 0),
      size: Math.max(1, Math.min(20, Number(s.upgrade_paid_count || 0) + 2)),
    }));
  }, [scatter]);

  const statsMetrics = useMemo(() => [
    {
      title: "Minat Upgrade",
      value: funnel ? Number(funnel.intent_count || 0) : 0,
      icon: <Badge variant="info" className="text-white bg-blue-500 border-none font-bold">INT</Badge>,
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Tagihan Dibuat",
      value: funnel ? Number(funnel.invoice_created_count || 0) : 0,
      icon: <Badge variant="warning" className="text-white bg-amber-500 border-none font-bold">INV</Badge>,
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "Upgrade Berhasil",
      value: funnel ? Number(funnel.upgrade_applied_count || 0) : 0,
      icon: <Badge variant="success" className="text-white bg-green-500 border-none font-bold">SUC</Badge>,
      gradient: "from-green-500 to-emerald-600"
    },
    {
      title: "Keberhasilan Upgrade",
      value: funnel ? formatPct(Number(funnel.conversion_rate || 0) * 100) : '0.0%',
      icon: <Badge className="text-white bg-purple-500 border-none font-bold">RATE</Badge>,
      gradient: "from-purple-500 to-pink-600"
    }
  ], [funnel]);

  const breadcrumbs = useMemo(() => [
    { label: 'Intelligence Center', path: '/menu/intelligence' },
    { label: 'Upgrade Analysis' }
  ], []);

  const handleMonthChange = useCallback((val: string | null) => {
    setSelectedMonth(val || null);
  }, []);

  const handleRefresh = useCallback(() => {
    overviewQuery.refetch();
    monthQuery.refetch();
  }, [overviewQuery, monthQuery]);

  if (anyLoading && !overviewQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size="lg" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Menganalisis Data Upgrade...</p>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-xl border-2">
          <AlertTitle className="font-black uppercase tracking-tight">Gagal memuat Analisis Upgrade Langganan</AlertTitle>
          <AlertDescription className="font-medium">Pastikan snapshot bulan sudah terbentuk, lalu coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overviewQuery.data && !anyLoading) {
    return (
      <SuperAdminPageLayout
        title="Upgrade Intent Intelligence"
        description="Analisis pola konversi paket layanan dan prediksi kecenderungan upgrade tenant."
        hardeningModuleKey="superadmin_upgrade_intelligence"
        breadcrumbs={breadcrumbs}
      >
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <Search size={32} />
           </div>
           <h3 className="text-xl font-bold mb-2">Snapshot Belum Tersedia</h3>
           <p className="text-slate-500 max-w-xs mx-auto mb-6">Maaf, Upgrade Intelligence belum pernah digenerate untuk periode ini.</p>
           <Button onClick={handleRefresh} variant="outline" className="rounded-xl">
              <RefreshCcw size={16} className="mr-2" /> Segarkan Data
           </Button>
        </div>
      </SuperAdminPageLayout>
    );
  }

  const toolbarActions = (
    <div className="flex items-center space-x-2">
      <label htmlFor="monthSelectTrigger" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">Periode:</label>
      <SearchableSelect
        id="monthSelectTrigger"
        value={month || ''}
        onValueChange={handleMonthChange}
        options={months.map((m) => ({ value: m, label: m }))}
        placeholder="Pilih bulan..."
        searchPlaceholder="Cari bulan..."
        triggerClassName="w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100 h-9 rounded-xl font-bold"
      />
    </div>
  );

  return (
    <SuperAdminPageLayout
      title="Upgrade Intent Intelligence"
      description="Analisis pola konversi paket layanan dan prediksi kecenderungan upgrade tenant."
      stats={statsMetrics}
      isLoadingStats={overviewQuery.isLoading}
      toolbar={toolbarActions}
      hardeningModuleKey="superadmin_upgrade_intelligence"
      instruction={instruction}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <SectionCard
          title="Alur Proses Upgrade"
          icon={BarChart3}
          fullWidth
        >
          <div className="w-full space-y-4">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Perjalanan sekolah dari minat upgrade hingga upgrade berhasil diaplikasikan ke sistem.
            </p>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[520px]">
                <Suspense fallback={<Loader />}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={funnelStageData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.4} />
                      <XAxis dataKey="stage" tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SectionCard
            title="Distribusi Minat Upgrade"
            icon={PieChartIcon}
            fullWidth
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
              <div className="w-full flex items-center justify-center">
                <Suspense fallback={<Loader />}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {(pieData ?? [])?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
              <div className="overflow-x-auto">
                <Table
                  columns={[
                    { key: 'level', label: 'Tingkat Minat' },
                    { key: 'count', label: 'Jumlah Sekolah', className: 'text-right' },
                  ]}
                  data={(distribution ?? [])?.map((d) => ({
                    level: levelBadge(d.level),
                    count: <span className="font-black font-mono">{d.count}</span>,
                  }))}
                  emptyMessage="Belum ada data distribusi intent."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Upgrade Conversion Rate"
            icon={LineChartIcon}
            fullWidth
          >
            <div className="w-full overflow-x-auto">
              <div className="min-w-[400px]">
                <Suspense fallback={<Loader />}>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={funnelChartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: any) => [formatPct(Number(value || 0)), 'Conversion']} 
                      />
                      <Line type="monotone" dataKey="conversion_rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} name="Conversion" />
                    </LineChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Top 10 HOT Tenants"
          icon={Award}
          fullWidth
          noPadding
        >
          <div className="p-4 w-full overflow-x-auto">
            <Table
              columns={[
                { key: 'tenant_id', label: 'Tenant' },
                { key: 'intent', label: 'Intent Score' },
                { key: 'attempts', label: 'Attempts', className: 'text-center' },
                { key: 'paid', label: 'Paid', className: 'text-center' },
                { key: 'overdue', label: 'Overdue', className: 'text-center' },
                { key: 'risk', label: 'Risk Score', className: 'text-center' },
                { key: 'growth', label: 'Usage Growth', className: 'text-right' },
              ]}
              data={paginatedTopHot}
              emptyMessage="Belum ada tenant HOT untuk bulan ini."
              pagination={{
                  currentPage: topHotPage,
                  totalPages: Math.ceil(topHot.length / topHotSize),
                  totalItems: topHot.length,
                  itemsPerPage: topHotSize,
                  onPageChange: setTopHotPage,
                  onLimitChange: setTopHotSize,
                }}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Risk vs Intent Scatter"
          icon={ShieldAlert}
          fullWidth
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 w-full">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[400px]">
                <Suspense fallback={<Loader />}>
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="intent_score" name="Intent" type="number" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis dataKey="risk_score_snapshot" name="Risk" type="number" domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <ZAxis dataKey="size" range={[20, 200]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: any, name: any) => {
                          if (name === 'risk_score_snapshot') return [Number(value || 0), 'Risk'];
                          if (name === 'intent_score') return [Number(value || 0), 'Intent'];
                          return [value, name];
                        }}
                        labelFormatter={(_, payload: any[]) => {
                          const p = payload?.[0]?.payload;
                          return p ? `Tenant: ${String(p.tenant_id || '').substring(0,8)}` : '';
                        }}
                      />
                      <Scatter data={scatterData} fill="#3b82f6">
                        {(scatterData ?? [])?.map((p: any, index: number) => (
                          <Cell key={`scatter-cell-${index}`} fill={levelColor(p.intent_level)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table
                columns={[
                  { key: 'tenant_id', label: 'Tenant' },
                  { key: 'intent', label: 'Intent' },
                  { key: 'risk', label: 'Risk', className: 'text-center' },
                  { key: 'paid', label: 'Paid', className: 'text-center' },
                ]}
                data={paginatedScatter}
                emptyMessage="Belum ada data scatter untuk bulan ini."
                pagination={{
                  currentPage: scatterPage,
                  totalPages: Math.ceil(scatter.length / scatterSize),
                  totalItems: scatter.length,
                  itemsPerPage: scatterSize,
                  onPageChange: setScatterPage,
                  onLimitChange: setScatterSize,
                }}
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  );
}

export default function UpgradeIntelligencePage() {
  return (
    <UpgradeIntelligenceContent />
  );
}
