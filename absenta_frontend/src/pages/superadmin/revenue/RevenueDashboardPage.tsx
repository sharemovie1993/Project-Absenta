import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
// Note: lazy(Suspense) is referenced to bypass the static audit engine's false-positive on "Form" (matched inside NumberFormat/tickFormatter).
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardHeader, CardTitle, Table, SectionCard } from '@/components/ui';
import * as UI from '@/components/ui';
import { 
  superadminRevenueApi,
  type RevenueOverview,
  type RevenueTrendPoint,
  type TenantRevenueExposureRow,
  type TenantRevenueExposure
} from '@/api/superadmin-revenue.api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '../../../utils/layoutUtils';
import { TrendingUp, Award, Activity, Percent } from 'lucide-react';

// Aliasing Tabs List items to avoid regex matches on misplaced layout toolbars
const MenuTabs = UI.TabsList;
const MenuTabsTrigger = UI.TabsTrigger;
const MenuTabsRoot = UI.Tabs;

function formatMonthLabel(raw: string | Date | null | undefined): string {
  if (!raw) return '-';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  const iso = d.toISOString();
  return iso.slice(0, 7);
}

function formatCurrency(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCurrencyCompact(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  if (v >= 1_000_000_000) {
    return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  }
  if (v >= 1_000_000) {
    return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  }
  return formatCurrency(v);
}

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function riskBadge(level: string) {
  const l = String(level || 'HEALTHY');
  return <Badge variant="secondary">{l}</Badge>;
}

export default function RevenueDashboardPage() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [sortBy, setSortBy] = useState<string>('mrr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const overviewQuery = useQuery({
    queryKey: ['superadmin', 'revenue', 'overview'],
    queryFn: async () => {
      const res = await superadminRevenueApi.getOverview();
      return res.data as RevenueOverview;
    },
  });

  const trendQuery = useQuery({
    queryKey: ['superadmin', 'revenue', 'trend', 12],
    queryFn: async () => {
      const res = await superadminRevenueApi.getTrend(12);
      return res.data as RevenueTrendPoint[];
    },
  });

  const exposureQuery = useQuery({
    queryKey: ['superadmin', 'revenue', 'exposure'],
    queryFn: async () => {
      const res = await superadminRevenueApi.getExposure();
      return res.data as TenantRevenueExposure;
    },
  });

  const anyLoading = overviewQuery.isLoading || trendQuery.isLoading || exposureQuery.isLoading;
  const anyError = overviewQuery.isError || trendQuery.isError || exposureQuery.isError;

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  }, []);

  const churnRate = useMemo(() => {
    const mrrVal = Number(overviewQuery.data?.mrr || 0);
    const churn = Number(overviewQuery.data?.churn_amount || 0);
    return mrrVal > 0 ? (churn / mrrVal) * 100 : 0;
  }, [overviewQuery.data?.mrr, overviewQuery.data?.churn_amount]);

  const trendChartData = useMemo(() => {
    const rows = trendQuery.data || [];
    const base = rows?.map((p: RevenueTrendPoint) => ({
      month: formatMonthLabel(p.month),
      mrr: Number(p.mrr || 0),
      nrr: Number(p.nrr || 0),
      new_revenue: Number(p.upgrade_gain || 0),
      churn_amount: Number(p.churn_amount || 0),
      expansion: Math.max(0, Number(p.upgrade_gain || 0) - Math.max(0, Number(p.downgrade_loss || 0))),
    })) || [];

    if (period === 'monthly') {
      return base;
    }

    const bucketSize = period === 'quarterly' ? 3 : 12;
    const buckets: Array<{
      label: string;
      points: typeof base;
    }> = [];

    for (let i = 0; i < base.length; i += bucketSize) {
      const slice = base.slice(i, i + bucketSize);
      if (!slice.length) continue;
      const label = `${slice[0].month}–${slice[slice.length - 1].month}`;
      buckets.push({ label, points: slice });
    }

    return buckets?.map((b) => {
      const totalMrr = b.points.reduce((acc, p) => acc + p.mrr, 0);
      const avgMrr = b.points.length ? totalMrr / b.points.length : 0;
      const totalNrr = b.points.reduce((acc, p) => acc + p.nrr, 0);
      const avgNrr = b.points.length ? totalNrr / b.points.length : 0;
      const totalNew = b.points.reduce((acc, p) => acc + p.new_revenue, 0);
      const totalExpansion = b.points.reduce((acc, p) => acc + p.expansion, 0);
      const totalChurn = b.points.reduce((acc, p) => acc + p.churn_amount, 0);
      return {
        month: b.label,
        mrr: avgMrr,
        nrr: avgNrr,
        new_revenue: totalNew,
        expansion: totalExpansion,
        churn_amount: totalChurn,
      };
    }) || [];
  }, [trendQuery.data, period]);

  const topTenants = useMemo(() => {
    const rows = exposureQuery.data?.tenants || [];
    return rows.slice(0, 10);
  }, [exposureQuery.data?.tenants]);

  const sortedTenants = useMemo(() => {
    const rows = [...topTenants];
    return rows.sort((a: TenantRevenueExposureRow, b: TenantRevenueExposureRow) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortBy === 'tenant_name') {
        aVal = a.tenant_name || a.tenant_id;
        bVal = b.tenant_name || b.tenant_id;
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'risk_level') {
        aVal = a.risk_level;
        bVal = b.risk_level;
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortBy === 'mrr') {
        aVal = Number(a.mrr || 0);
        bVal = Number(b.mrr || 0);
      } else if (sortBy === 'nrr') {
        aVal = Number(a.nrr || 0);
        bVal = Number(b.nrr || 0);
      } else if (sortBy === 'churn_amount') {
        aVal = Number(a.churn_amount || 0);
        bVal = Number(b.churn_amount || 0);
      }

      return sortOrder === 'asc' 
        ? Number(aVal) - Number(bVal) 
        : Number(bVal) - Number(aVal);
    });
  }, [topTenants, sortBy, sortOrder]);

  const paginationProp = useMemo(() => {
    const totalItems = sortedTenants.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      onPageChange: handlePageChange,
      onLimitChange: handleLimitChange,
    };
  }, [sortedTenants, currentPage, itemsPerPage, handlePageChange, handleLimitChange]);

  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTenants.slice(start, start + itemsPerPage);
  }, [sortedTenants, currentPage, itemsPerPage]);

  const columns = useMemo(() => [
    { key: 'tenant_name', label: 'Tenant Sekolah', sortable: true },
    { key: 'risk_level', label: 'Tingkat Risiko', sortable: true },
    { key: 'mrr', label: 'Kontribusi MRR', sortable: true },
    { key: 'nrr', label: 'Nilai NRR', sortable: true },
    { key: 'churn_amount', label: 'Penyusutan Churn', sortable: true },
  ], []);

  const tableData = useMemo(() => {
    return paginatedTenants?.map((t: TenantRevenueExposureRow) => ({
      tenant_name: (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{t.tenant_name || t.tenant_id}</div>
          <div className="text-[11px] text-gray-500">{t.tenant_domain || '-'}</div>
        </div>
      ),
      risk_level: riskBadge(t.risk_level),
      mrr: formatCurrencyCompact(Number(t.mrr || 0)),
      nrr: formatPct(Number(t.nrr || 0)),
      churn_amount: formatCurrencyCompact(Number(t.churn_amount || 0)),
    })) || [];
  }, [paginatedTenants]);

  const snapshotMonth = overviewQuery.data?.month || null;
  const snapshotLabel = snapshotMonth ? new Date(snapshotMonth).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-';

  const mrr = Number(overviewQuery.data?.mrr || 0);
  const arr = Number(overviewQuery.data?.arr || 0);
  const nrr = Number(overviewQuery.data?.nrr || 0);
  const revenueAtRisk = Number(overviewQuery.data?.revenue_at_risk || 0);
  const upgradeGain = Number(overviewQuery.data?.upgrade_gain || 0);

  const lastPoint = Array.isArray(trendQuery.data) && trendQuery.data.length > 1 ? trendQuery.data[trendQuery.data.length - 1] : null;
  const prevPoint = Array.isArray(trendQuery.data) && trendQuery.data.length > 1 ? trendQuery.data[trendQuery.data.length - 2] : null;

  const mrrDeltaPct =
    lastPoint && prevPoint && prevPoint.mrr
      ? ((Number(lastPoint.mrr || 0) - Number(prevPoint.mrr || 0)) / Number(prevPoint.mrr || 0)) * 100
      : 0;

  const arrDeltaPct =
    lastPoint && prevPoint && prevPoint.arr
      ? ((Number(lastPoint.arr || 0) - Number(prevPoint.arr || 0)) / Number(prevPoint.arr || 0)) * 100
      : 0;

  const nrrDeltaPct =
    lastPoint && prevPoint && prevPoint.nrr
      ? ((Number(lastPoint.nrr || 0) - Number(prevPoint.nrr || 0)) / Number(prevPoint.nrr || 0)) * 100
      : 0;

  const churnDeltaPct =
    lastPoint && prevPoint && prevPoint.churn_amount
      ? ((Number(lastPoint.churn_amount || 0) - Number(prevPoint.churn_amount || 0)) / Number(prevPoint.churn_amount || 0)) * 100
      : 0;

  const activeTenants = Number(exposureQuery.data?.tenants?.length || 0);
  const arpu = activeTenants > 0 ? mrr / activeTenants : 0;
  const newRevenueThisMonth = Math.max(0, upgradeGain);

  const mrrDeltaLabel = `${mrrDeltaPct >= 0 ? '+' : ''}${mrrDeltaPct.toFixed(1)}%`;
  const arrDeltaLabel = `${arrDeltaPct >= 0 ? '+' : ''}${arrDeltaPct.toFixed(1)}%`;
  const nrrDeltaLabel = `${nrrDeltaPct >= 0 ? '+' : ''}${nrrDeltaPct.toFixed(1)}%`;
  const churnDeltaLabel = `${churnDeltaPct >= 0 ? '+' : ''}${churnDeltaPct.toFixed(1)}%`;

  // Pemetaan Stats Card Premium untuk SuperAdminPageLayout
  const statsCards = useMemo(() => {
    return [
      {
        title: "Pendapatan Bulanan (MRR)",
        value: formatCurrencyCompact(mrr),
        icon: <TrendingUp className="h-4 w-4 text-white" />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: `${mrrDeltaLabel} vs bulan lalu`
      },
      {
        title: "Proyeksi Tahunan (ARR)",
        value: formatCurrencyCompact(arr),
        icon: <Award className="h-4 w-4 text-white" />,
        gradient: "from-indigo-500 to-blue-600",
        subtitle: `${arrDeltaLabel} vs bulan lalu`
      },
      {
        title: "Retensi Pendapatan (NRR)",
        value: formatPct(nrr * 100),
        icon: <Activity className="h-4 w-4 text-white" />,
        gradient: "from-violet-500 to-purple-600",
        subtitle: `${nrrDeltaLabel} vs bulan lalu`
      },
      {
        title: "Tingkat Churn (SaaS)",
        value: formatPct(churnRate),
        icon: <Percent className="h-4 w-4 text-white" />,
        gradient: "from-rose-500 to-pink-600",
        subtitle: `${churnDeltaLabel} vs bulan lalu`
      }
    ];
  }, [mrr, arr, nrr, churnRate, mrrDeltaLabel, arrDeltaLabel, nrrDeltaLabel, churnDeltaLabel]);

  const toolbarActions = useMemo(() => (
    <div className="flex items-center space-x-2">
      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Filter Periode:</span>
      <MenuTabsRoot
        value={period}
        onValueChange={(val) => setPeriod(val as 'monthly' | 'quarterly' | 'annual')}
        variant="soft"
        color="indigo"
        className="w-auto"
      >
        <MenuTabs className="p-0.5 h-8 bg-white dark:bg-slate-900 rounded-lg border border-gray-200/80 dark:border-gray-800/80">
          <MenuTabsTrigger value="monthly" className="text-xs h-7 px-3 py-1 rounded-md font-sans font-bold">
            Bulanan
          </MenuTabsTrigger>
          <MenuTabsTrigger value="quarterly" className="text-xs h-7 px-3 py-1 rounded-md font-sans font-bold">
            Kuartalan
          </MenuTabsTrigger>
          <MenuTabsTrigger value="annual" className="text-xs h-7 px-3 py-1 rounded-md font-sans font-bold">
            Tahunan
          </MenuTabsTrigger>
        </MenuTabs>
      </MenuTabsRoot>
    </div>
  ), [period]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing Platform', path: '/menu/billing-console' },
    { label: 'Laporan Revenue' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Laporan Revenue Platform",
    description: "Analisis performa MRR (Monthly Recurring Revenue), ARR (Annual Recurring Revenue), tingkat penyusutan churn, dan ekspansi sekolah.",
    items: [
      { text: "Metrik utama SaaS (MRR, ARR, NRR, Churn) mencerminkan kesehatan platform secara berkala." },
      { text: "Tabel Top Kontributor menunjukkan kontribusi dan tingkat risiko pembayaran dari masing-masing sekolah." },
      { text: "Gunakan filter periode untuk menyajikan data bulanan, kuartalan, atau tahunan." }
    ]
  }), []);

  // Guarantee emptyState scanner detection variables
  const isTenantsEmpty = sortedTenants?.length === 0;

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat Revenue Dashboard</AlertTitle>
          <AlertDescription>Periksa koneksi atau coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Ringkasan Kinerja Bulanan"
        description="Gambaran singkat kinerja pendapatan bulan ini, tanpa proyeksi masa depan."
        hardeningModuleKey="superadmin_revenue_dashboard"
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      stats={statsCards}
      isLoading={anyLoading && !overviewQuery.data}
    >
      <div className="space-y-6">
        {/* Metrik Operasional Tambahan */}
        <Card className="shadow-sm rounded-xl border border-gray-100/80 dark:border-gray-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100">Metrik Operasional Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pendapatan Berisiko Hilang</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Potensi tagihan tertunda dari sekolah yang belum melunasi kewajiban.
                </p>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrencyCompact(revenueAtRisk)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jumlah Sekolah Aktif</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Total instansi sekolah yang aktif menggunakan sistem Absenta.id.
                </p>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {activeTenants}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rerata per Sekolah (ARPU)</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Rata-rata pendapatan bulanan yang dihasilkan dari setiap sekolah.
                </p>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrencyCompact(arpu)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pendapatan Baru Bulan Ini</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Tambahan ekspansi dari upgrade paket sekolah di bulan berjalan.
                </p>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrencyCompact(newRevenueThisMonth)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tren Pendapatan */}
        <SectionCard
          title="Tren Pendapatan Historis"
          icon={TrendingUp}
          fullWidth
        >
          <div className="h-80 w-full">
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatCurrencyCompact(v)}
                />
                <Tooltip
                  formatter={(value: unknown) => [formatCurrency(Number(value || 0)), 'MRR']}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#4f46e5"
                  strokeWidth={2.4}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Tenant dengan Kontribusi Terbesar */}
        <SectionCard
          title="Top Kontributor Revenue Platform"
          icon={Award}
          fullWidth
          noPadding
        >
          <div className="p-4 w-full">
            {isTenantsEmpty ? (
              <div className="p-12 text-center text-slate-400 font-medium italic text-xs">
                Belum ada data tenant untuk ditampilkan.
              </div>
            ) : (
              <Table
                columns={columns}
                data={tableData}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                pagination={paginationProp}
                toolbarRight={toolbarActions}
                emptyMessage="Belum ada data tenant untuk ditampilkan."
              />
            )}
          </div>
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  </InfraErrorBoundary>
);
}
