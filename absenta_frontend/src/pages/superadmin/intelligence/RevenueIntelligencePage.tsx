import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Loader, Table, SectionCard, Button } from '@/components/ui';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { TrendingUp, Coins, BarChart3, RefreshCcw, Search } from 'lucide-react';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';

interface CohortRow {
  cohort_month: string;
  active_count: number;
  retained_after_1_month?: number;
  retained_after_3_month?: number;
  retained_after_6_month?: number;
  retained_after_12_month?: number;
  revenue_generated?: number;
}

function formatMonthLabel(raw: string | Date | null | undefined): string {
  if (!raw) return '-';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  try {
    return d.toISOString().slice(0, 7);
  } catch (e) {
    return '-';
  }
}

function formatCurrency(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
}

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function RetentionBadge({ retained, total }: { retained: number; total: number }) {
  const pct = useMemo(() => total > 0 ? (retained / total) * 100 : 0, [retained, total]);
  if (pct >= 80) return <Badge variant="success">{formatPct(pct)}</Badge>;
  if (pct >= 50) return <Badge variant="secondary">{formatPct(pct)}</Badge>;
  return <Badge variant="warning">{formatPct(pct)}</Badge>;
}

function RevenueIntelligenceContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const forecastQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'revenue-forecast'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getRevenueForecast();
      return res.data;
    },
  });

  const cohortQuery = useQuery({
    queryKey: ['superadmin', 'analytics', 'cohort', 24],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getCohortRetention(24);
      return res.data as CohortRow[];
    },
  });

  const anyLoading = forecastQuery.isLoading || cohortQuery.isLoading;
  const anyError = forecastQuery.isError || cohortQuery.isError;

  const cohorts = useMemo(() => cohortQuery.data || [], [cohortQuery.data]);

  const statsData = useMemo(() => {
    const data = forecastQuery.data as any;
    const currentMrr = Number(data?.current_mrr || 0);
    const forecastMrr = Number(data?.forecast_mrr || 0);
    const riskAdjusted = Number(data?.risk_adjusted_forecast || 0);
    const forecastArr = Number(data?.forecast_arr || 0);
    const projectedChurn = Number(data?.projected_churn_loss || 0);
    const projectedUpgrade = Number(data?.projected_upgrade_gain || 0);
    const riskLoss = Number(data?.risk_loss || 0);
    const baseMrr = currentMrr > 0 ? currentMrr : forecastMrr;
    const netGrowthPct = baseMrr > 0 ? ((forecastMrr - baseMrr) / baseMrr) * 100 : 0;
    const riskLossPct = baseMrr > 0 ? (riskLoss / baseMrr) * 100 : 0;

    return {
      currentMrr,
      forecastMrr,
      riskAdjusted,
      forecastArr,
      projectedChurn,
      projectedUpgrade,
      riskLoss,
      netGrowthPct,
      riskLossPct
    };
  }, [forecastQuery.data]);

  const statsMetrics = useMemo(() => [
    {
      title: "MRR Berjalan",
      value: formatCurrency(statsData.currentMrr),
      icon: <Badge variant="success" className="text-white bg-green-500 border-none font-bold">MRR</Badge>,
      gradient: "from-green-500 to-emerald-600"
    },
    {
      title: "Estimasi MRR",
      value: formatCurrency(statsData.forecastMrr),
      icon: <Badge variant="info" className="text-white bg-blue-500 border-none font-bold">FC</Badge>,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "ARR Proyeksi",
      value: formatCurrency(statsData.forecastArr),
      icon: <Badge className="text-white bg-purple-500 border-none font-bold">ARR</Badge>,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "Pertumbuhan Bersih",
      value: formatPct(statsData.netGrowthPct),
      icon: <Badge className="text-white bg-amber-500 border-none font-bold">NET</Badge>,
      gradient: "from-amber-500 to-orange-600"
    }
  ], [statsData]);

  const sortedCohorts = useMemo(() => {
    const items = [...(cohorts ?? [])];
    if (sortConfig) {
      items.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [cohorts, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (sortedCohorts ?? []).slice(start, start + pageSize).map((c) => {
      const total = Number(c.active_count || 0);
      return {
        cohort_month: formatMonthLabel(c.cohort_month),
        active_count: total,
        r1: <RetentionBadge retained={Number(c.retained_after_1_month || 0)} total={total} />,
        r3: <RetentionBadge retained={Number(c.retained_after_3_month || 0)} total={total} />,
        r6: <RetentionBadge retained={Number(c.retained_after_6_month || 0)} total={total} />,
        r12: <RetentionBadge retained={Number(c.retained_after_12_month || 0)} total={total} />,
        revenue_generated: formatCurrency(Number(c.revenue_generated || 0)),
      };
    });
  }, [sortedCohorts, currentPage, pageSize]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    forecastQuery.refetch();
    cohortQuery.refetch();
  }, [forecastQuery, cohortQuery]);

  if (anyLoading && !forecastQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size="lg" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Menganalisis Data Pendapatan...</p>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-xl border-2">
          <AlertTitle className="font-black uppercase tracking-tight">Gagal memuat Analisis & Proyeksi</AlertTitle>
          <AlertDescription className="font-medium">Sistem kecerdasan bisnis sedang mengalami gangguan teknis. Periksa koneksi atau coba ulang beberapa saat lagi.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!forecastQuery.data && !cohortQuery.data && !anyLoading) {
    return (
      <SuperAdminPageLayout
        hardeningModuleKey="superadmin_revenue_intelligence"
        title="Perencanaan & Proyeksi Pendapatan"
        description="Belum ada data analisis yang tersedia untuk periode ini."
        breadcrumbs={[
          { label: 'Analisis & Kecerdasan Bisnis' },
          { label: 'Perencanaan Pendapatan' }
        ]}
      >
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <Search size={32} />
           </div>
           <h3 className="text-xl font-bold mb-2">Data Tidak Ditemukan</h3>
           <p className="text-slate-500 max-w-xs mx-auto mb-6">Maaf, kami tidak menemukan data pendapatan untuk dianalisis saat ini.</p>
           <Button onClick={handleRefresh} variant="outline" className="rounded-xl">
              <RefreshCcw size={16} className="mr-2" /> Segarkan Data
           </Button>
        </div>
      </SuperAdminPageLayout>
    );
  }

  const instruction = useMemo(() => ({
    title: 'Panduan Revenue Intelligence',
    description: 'Analisis pendapatan (MRR/ARR) dan tingkat retensi sekolah untuk membantu perencanaan strategis platform.',
    items: [
      { text: 'Ringkasan Angka Perencanaan memberikan proyeksi pendapatan bulan berjalan dan masa depan.' },
      { text: 'Faktor Perubahan menunjukkan dampak upgrade, churn, dan risiko terhadap pendapatan.' },
      { text: 'Tabel Retensi Sekolah membantu memahami seberapa lama sekolah bertahan menggunakan platform.' },
      { text: 'Gunakan fitur sorting pada tabel untuk menganalisis angkatan sekolah (cohort) tertentu.' }
    ]
  }), []);

  return (
    <SuperAdminPageLayout
      hardeningModuleKey="superadmin_revenue_intelligence"
      instruction={instruction}
      title="Perencanaan & Proyeksi Pendapatan"
      description="Digunakan untuk menyusun skenario pendapatan ke depan dan memahami faktor penggeraknya."
      breadcrumbs={[
        { label: 'Analisis & Kecerdasan Bisnis', path: '/superadmin/intelligence/revenue' },
        { label: 'Perencanaan Pendapatan' }
      ]}
      stats={statsMetrics}
      isLoadingStats={forecastQuery.isLoading}
    >
      <div className="space-y-6">
        <SectionCard
          title="Ringkasan Angka Perencanaan"
          icon={TrendingUp}
          fullWidth
          actions={<span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Periode Proyeksi: {formatMonthLabel(forecastQuery.data?.month || null)}</span>}
        >
          <div className="w-full space-y-4">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Ringkasan angka utama yang dipakai sebagai dasar simulasi dan proyeksi pertumbuhan platform Absenta.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 w-full">
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">MRR Saat Ini</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Total pendapatan langganan bulan berjalan.</div>
                <div className="text-lg font-black mt-2 text-slate-900 dark:text-white tracking-tight">{formatCurrency(statsData.currentMrr)}</div>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Estimasi MRR</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Estimasi pendapatan bulan berikutnya.</div>
                <div className="text-lg font-black mt-2 text-slate-900 dark:text-white tracking-tight">{formatCurrency(statsData.forecastMrr)}</div>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pasca Risiko</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Pendapatan dikurangi potensi risiko.</div>
                <div className="text-lg font-black mt-2 text-slate-900 dark:text-white tracking-tight">{formatCurrency(statsData.riskAdjusted)}</div>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Proyeksi ARR</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Estimasi total pendapatan 1 tahun.</div>
                <div className="text-lg font-black mt-2 text-slate-900 dark:text-white tracking-tight">{formatCurrency(statsData.forecastArr)}</div>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Growth</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Selisih pertumbuhan bersih.</div>
                <div className="text-lg font-black mt-2 text-emerald-600 dark:text-emerald-400 tracking-tight">{formatPct(statsData.netGrowthPct)}</div>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-colors">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Risk Loss</div>
                <div className="text-[10px] text-slate-500 min-h-[30px] mt-1 leading-tight">Estimasi pendapatan berisiko hilang.</div>
                <div className="text-lg font-black mt-2 text-rose-600 dark:text-rose-400 tracking-tight">{formatPct(statsData.riskLossPct)}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Faktor Perubahan Pendapatan"
          icon={Coins}
          fullWidth
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Kenaikan Upgrade</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">{formatCurrency(statsData.projectedUpgrade)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Kehilangan Churn</div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tight">{formatCurrency(statsData.projectedChurn)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Risiko Kehilangan</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">{formatCurrency(statsData.riskLoss)}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Retensi Sekolah Berdasarkan Angkatan"
          icon={BarChart3}
          fullWidth
          noPadding
        >
          <div className="p-6 w-full space-y-4">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Visualisasi tingkat bertahannya sekolah setelah mulai berlangganan platform (Retention Analysis).
            </p>
            <Table
              columns={[
                { key: 'cohort_month', label: 'Periode Mulai', sortable: true },
                { key: 'active_count', label: 'Sekolah', sortable: true },
                { key: 'r1', label: 'R+1 Bulan', className: 'text-center' },
                { key: 'r3', label: 'R+3 Bulan', className: 'text-center' },
                { key: 'r6', label: 'R+6 Bulan', className: 'text-center' },
                { key: 'r12', label: 'R+12 Bulan', className: 'text-center' },
                { key: 'revenue_generated', label: 'LTV (12 Bln)', className: 'text-right', sortable: true },
              ]}
              data={paginatedData}
              emptyMessage="Belum ada data cohort untuk ditampilkan."
              pagination={{
                currentPage: currentPage,
                totalPages: Math.ceil(sortedCohorts.length / pageSize),
                totalItems: sortedCohorts.length,
                itemsPerPage: pageSize,
                onPageChange: setCurrentPage,
                onLimitChange: setPageSize,
              }}
              onSort={handleSort}
              sortBy={sortConfig?.key}
              sortOrder={sortConfig?.direction}
            />
          </div>
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  );
}

export default function RevenueIntelligencePage() {
  return (
    <RevenueIntelligenceContent />
  );
}
