import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Table, SectionCard, SearchableSelect, Button, type Column } from '@/components/ui';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';
import { BarChart3, PieChart as PieChartIcon, Award, ShieldAlert, LineChart as LineChartIcon, RefreshCcw, Search, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/layoutUtils';

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

// Zod Schema Validation Guard (Pilar 25)
const filterMonthSchema = z.object({
  month: z.string().nullable().optional()
});

interface FunnelItem {
  month: string;
  conversion_rate?: number;
}

interface TenantItem {
  tenant_id: string;
  intent_level: string;
  intent_score: number;
  upgrade_attempt_count?: number;
  upgrade_paid_count?: number;
  invoice_overdue_count?: number;
  risk_score_snapshot?: number;
  usage_growth_percent?: number | null;
}

interface ScatterItem {
  tenant_id: string;
  intent_score: number;
  risk_score_snapshot: number;
  intent_level: string;
  upgrade_paid_count: number;
}

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

export const UpgradeIntelligencePage: React.FC = React.memo(() => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [topHotPage, setTopHotPage] = useState(1);
  const [topHotSize, setTopHotSize] = useState(10);
  const [topHotSortBy, setTopHotSortBy] = useState<string>('intent_score');
  const [topHotSortOrder, setTopHotSortOrder] = useState<'asc' | 'desc'>('desc');

  const [scatterPage, setScatterPage] = useState(1);
  const [scatterSize, setScatterSize] = useState(10);
  const [scatterSortBy, setScatterSortBy] = useState<string>('intent_score');
  const [scatterSortOrder, setScatterSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const currentSnapshotMonth = useMemo(() => overviewQuery.data?.latest_month || null, [overviewQuery.data]);
  const month = useMemo(() => selectedMonth || currentSnapshotMonth, [selectedMonth, currentSnapshotMonth]);

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
  const funnels = useMemo(() => (overviewQuery.data?.funnels || []) as FunnelItem[], [overviewQuery.data]);
  
  const months = useMemo(() => {
    return (funnels ?? [])?.map((f) => String(f.month)).slice().reverse();
  }, [funnels]);

  const funnelChartData = useMemo(() => {
    return (months ?? [])?.map((m) => {
      const row = (funnels ?? []).find((f) => String(f.month) === m);
      const rate = row ? Number(row.conversion_rate || 0) * 100 : 0;
      return { month: m, conversion_rate: rate };
    });
  }, [months, funnels]);

  const funnel = useMemo(() => monthSnapshot?.funnel || null, [monthSnapshot]);
  
  const distribution = useMemo(() => {
    const dist = (monthSnapshot?.intent_distribution || overviewQuery.data?.intent_distribution || []) as Array<{ intent_level: string; _count?: { _all?: number } }>;
    const map = new Map<string, number>();
    for (const d of dist || []) {
      map.set(String(d.intent_level), Number(d?._count?._all || 0));
    }
    return ['LOW', 'WARM', 'HIGH', 'HOT']?.map((k) => ({ level: k, count: map.get(k) || 0 }));
  }, [monthSnapshot, overviewQuery.data]);

  const topHot = useMemo(() => (monthSnapshot?.top_hot_tenants || overviewQuery.data?.top_hot_tenants || []) as TenantItem[], [monthSnapshot, overviewQuery.data]);
  const scatter = useMemo(() => (monthSnapshot?.risk_vs_intent_scatter || []) as ScatterItem[], [monthSnapshot]);

  const sortedTopHot = useMemo(() => {
    const list = [...(topHot ?? [])];
    list.sort((a, b) => {
      const valA = a[topHotSortBy as keyof TenantItem] ?? 0;
      const valB = b[topHotSortBy as keyof TenantItem] ?? 0;
      if (valA < valB) return topHotSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return topHotSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [topHot, topHotSortBy, topHotSortOrder]);

  const paginatedTopHot = useMemo(() => {
    const start = (topHotPage - 1) * topHotSize;
    return (sortedTopHot ?? []).slice(start, start + topHotSize)?.map((t) => ({
      id: t.tenant_id,
      tenant_id: <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{String(t.tenant_id || '').substring(0, 16)}...</span>,
      intent: (
        <div className="flex items-center gap-2">
          {levelBadge(String(t.intent_level || ''))}
          <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">{Number(t.intent_score || 0)}</span>
        </div>
      ),
      attempts: <span className="font-mono text-xs">{Number(t.upgrade_attempt_count || 0)}</span>,
      paid: <span className="font-mono text-xs">{Number(t.upgrade_paid_count || 0)}</span>,
      overdue: <span className="font-mono text-rose-500 font-bold text-xs">{Number(t.invoice_overdue_count || 0)}</span>,
      risk: <span className="font-mono font-bold text-xs">{Number(t.risk_score_snapshot || 0)}</span>,
      growth: <span className="font-mono font-bold text-xs text-emerald-600">{t.usage_growth_percent == null ? '-' : formatPct(Number(t.usage_growth_percent || 0))}</span>,
    }));
  }, [sortedTopHot, topHotPage, topHotSize]);

  const sortedScatter = useMemo(() => {
    const list = [...(scatter ?? [])];
    list.sort((a, b) => {
      const valA = a[scatterSortBy as keyof ScatterItem] ?? 0;
      const valB = b[scatterSortBy as keyof ScatterItem] ?? 0;
      if (valA < valB) return scatterSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return scatterSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [scatter, scatterSortBy, scatterSortOrder]);

  const paginatedScatter = useMemo(() => {
    const start = (scatterPage - 1) * scatterSize;
    return (sortedScatter ?? []).slice(start, start + scatterSize)?.map((s) => ({
      id: s.tenant_id,
      tenant_id: <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{String(s.tenant_id || '').substring(0, 12)}...</span>,
      intent: (
        <div className="flex items-center gap-2">
          {levelBadge(String(s.intent_level || ''))}
          <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">{Number(s.intent_score || 0)}</span>
        </div>
      ),
      risk: <span className="font-mono font-bold text-xs">{Number(s.risk_score_snapshot || 0)}</span>,
      paid: <span className="font-mono text-xs">{Number(s.upgrade_paid_count || 0)}</span>,
    }));
  }, [sortedScatter, scatterPage, scatterSize]);

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
    return (scatter ?? [])?.map((s) => ({
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
    { label: 'Intelligence Center' },
    { label: 'Upgrade Analysis' }
  ], []);

  const handleMonthChange = useCallback((val: string) => {
    const parsed = filterMonthSchema.safeParse({ month: val });
    if (parsed.success) {
      setSelectedMonth(val || null);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    overviewQuery.refetch();
    monthQuery.refetch();
  }, [overviewQuery, monthQuery]);

  const topHotColumns: Column[] = useMemo(() => [
    { key: 'tenant_id', label: 'ID Tenant', sortable: true },
    { key: 'intent', label: 'Intent Score', sortable: true },
    { key: 'attempts', label: 'Upgr. Attempts', align: 'center', sortable: true },
    { key: 'paid', label: 'Paid', align: 'center', sortable: true },
    { key: 'overdue', label: 'Overdue', align: 'center', sortable: true },
    { key: 'risk', label: 'Risk Score', align: 'center', sortable: true },
    { key: 'growth', label: 'Usage Growth', align: 'right', sortable: true },
  ], []);

  const scatterColumns: Column[] = useMemo(() => [
    { key: 'tenant_id', label: 'ID Tenant', sortable: true },
    { key: 'intent', label: 'Intent Level & Score', sortable: true },
    { key: 'risk', label: 'Risk Score', align: 'center', sortable: true },
    { key: 'paid', label: 'Paid Invoices', align: 'center', sortable: true },
  ], []);

  const monthSelectOptions = useMemo(() => [
    ...(months ?? [])?.map((m) => ({ value: m, label: m }))
  ], [months]);

  if (anyLoading && !overviewQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menganalisis Data Upgrade...</p>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-2xl border-2">
          <AlertTitle className="font-bold uppercase tracking-tight">Gagal Memuat Analisis Upgrade Langganan</AlertTitle>
          <AlertDescription className="font-medium">Pastikan snapshot bulan sudah terbentuk, lalu coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Upgrade Intent Intelligence"
        description="Analisis pola konversi paket layanan dan prediksi kecenderungan upgrade tenant."
        stats={statsMetrics}
        isLoadingStats={overviewQuery.isLoading}
        hardeningModuleKey="superadmin_upgrade_intelligence"
        instruction={instruction}
        breadcrumbs={breadcrumbs}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-8 pb-12 w-full min-w-0 max-w-full">
            {/* Filter Periode Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Periode Analisis:</span>
                <div className="w-48">
                  <SearchableSelect
                    id="monthSelectTrigger"
                    aria-label="Pilih periode bulan analisis"
                    value={month || ''}
                    onValueChange={handleMonthChange}
                    options={monthSelectOptions}
                    placeholder="Pilih bulan..."
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={handleRefresh}
                className="rounded-xl"
              >
                <RefreshCcw size={12} className="mr-1.5" /> Segarkan Data
              </Button>
            </div>

            {/* Funnel Chart Section */}
            <SectionCard
              title="Alur Proses Upgrade"
              icon={BarChart3}
              fullWidth
            >
              <div className="w-full space-y-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Perjalanan sekolah dari minat upgrade hingga upgrade berhasil diaplikasikan ke sistem.
                </p>
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[520px]">
                    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat grafik...</div>}>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full min-w-0 max-w-full">
              <SectionCard
                title="Distribusi Minat Upgrade"
                icon={PieChartIcon}
                fullWidth
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
                  <div className="w-full flex items-center justify-center">
                    <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat pie chart...</div>}>
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
                  <div className="overflow-x-auto w-full">
                    <Table
                      columns={[
                        { key: 'level', label: 'Tingkat Minat' },
                        { key: 'count', label: 'Jumlah Sekolah', align: 'right' },
                      ]}
                      data={(distribution ?? [])?.map((d) => ({
                        id: d.level,
                        level: levelBadge(d.level),
                        count: <span className="font-bold font-mono text-xs">{d.count}</span>,
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
                    <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat grafik tren...</div>}>
                      <LineChart
                        data={funnelChartData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={{ stroke: '#e5e7eb' }} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                          formatter={(value) => [formatPct(Number(value || 0)), 'Conversion']} 
                        />
                        <Line type="monotone" dataKey="conversion_rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} name="Conversion" />
                      </LineChart>
                    </Suspense>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Top 10 HOT Tenants */}
            <SectionCard
              title="Top 10 HOT Tenants (Prospek Upgrade Terkuat)"
              icon={Award}
              fullWidth
              noPadding
            >
              <div className="p-4 w-full overflow-x-auto">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
                  <Table
                    columns={topHotColumns}
                    data={paginatedTopHot}
                    sortBy={topHotSortBy}
                    sortOrder={topHotSortOrder}
                    onSort={(col, dir) => { setTopHotSortBy(col); setTopHotSortOrder(dir); }}
                    emptyMessage="Belum ada tenant HOT untuk bulan ini."
                    toolbarLeft={
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Prospek Hot Intent ({topHot.length} Tenant)
                      </span>
                    }
                    pagination={{
                      currentPage: topHotPage,
                      totalPages: Math.max(1, Math.ceil(topHot.length / topHotSize)),
                      totalItems: topHot.length,
                      itemsPerPage: topHotSize,
                      onPageChange: setTopHotPage,
                      onLimitChange: (limit) => { setTopHotSize(limit); setTopHotPage(1); }
                    }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Risk vs Intent Scatter */}
            <SectionCard
              title="Risk vs Intent Scatter"
              icon={ShieldAlert}
              fullWidth
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 w-full min-w-0 max-w-full">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[400px]">
                    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat scatter chart...</div>}>
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
                            formatter={(value, name) => {
                              if (name === 'risk_score_snapshot') return [Number(value || 0), 'Risk'];
                              if (name === 'intent_score') return [Number(value || 0), 'Intent'];
                              return [value, name];
                            }}
                          />
                          <Scatter data={scatterData} fill="#3b82f6">
                            {(scatterData ?? [])?.map((p, index: number) => (
                              <Cell key={`scatter-cell-${index}`} fill={levelColor(p.intent_level)} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </Suspense>
                  </div>
                </div>
                <div className="overflow-x-auto w-full">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
                    <Table
                      columns={scatterColumns}
                      data={paginatedScatter}
                      sortBy={scatterSortBy}
                      sortOrder={scatterSortOrder}
                      onSort={(col, dir) => { setScatterSortBy(col); setScatterSortOrder(dir); }}
                      emptyMessage="Belum ada data scatter untuk bulan ini."
                      toolbarLeft={
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Matriks Risiko ({scatter.length} Sampel)
                        </span>
                      }
                      pagination={{
                        currentPage: scatterPage,
                        totalPages: Math.max(1, Math.ceil(scatter.length / scatterSize)),
                        totalItems: scatter.length,
                        itemsPerPage: scatterSize,
                        onPageChange: setScatterPage,
                        onLimitChange: (limit) => { setScatterSize(limit); setScatterPage(1); }
                      }}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </SectionCard>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default UpgradeIntelligencePage;
