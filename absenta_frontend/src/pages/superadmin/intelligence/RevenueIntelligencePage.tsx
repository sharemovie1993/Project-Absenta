import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardHeader, CardTitle, Loader, Table, SectionCard } from '@/components/ui';
import { SuperAdminPageLayout } from '../../../components/layout/SuperAdminPageLayout';
import { TrendingUp, Coins, BarChart3 } from 'lucide-react';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';

function formatMonthLabel(raw: string | Date | null | undefined): string {
  if (!raw) return '-';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return d.toISOString().slice(0, 7);
}

function formatCurrency(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
}

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function retentionBadge(retained: number, total: number) {
  const pct = total > 0 ? (retained / total) * 100 : 0;
  if (pct >= 80) return <Badge variant="success">{formatPct(pct)}</Badge>;
  if (pct >= 50) return <Badge variant="secondary">{formatPct(pct)}</Badge>;
  return <Badge variant="warning">{formatPct(pct)}</Badge>;
}

export default function RevenueIntelligencePage() {
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
      return res.data;
    },
  });

  const anyLoading = forecastQuery.isLoading || cohortQuery.isLoading;
  const anyError = forecastQuery.isError || cohortQuery.isError;

  const cohorts = useMemo(() => cohortQuery.data || [], [cohortQuery.data]);

  const currentMrr = Number(forecastQuery.data?.current_mrr || 0);
  const forecastMrr = Number(forecastQuery.data?.forecast_mrr || 0);
  const riskAdjusted = Number(forecastQuery.data?.risk_adjusted_forecast || 0);
  const forecastArr = Number(forecastQuery.data?.forecast_arr || 0);
  const projectedChurn = Number(forecastQuery.data?.projected_churn_loss || 0);
  const projectedUpgrade = Number(forecastQuery.data?.projected_upgrade_gain || 0);
  const riskLoss = Number(forecastQuery.data?.risk_loss || 0);

  const baseMrr = currentMrr > 0 ? currentMrr : forecastMrr;
  const netGrowthPct = baseMrr > 0 ? ((forecastMrr - baseMrr) / baseMrr) * 100 : 0;
  const riskLossPct = baseMrr > 0 ? (riskLoss / baseMrr) * 100 : 0;

  const statsMetrics = useMemo(() => [
    {
      title: "MRR Berjalan",
      value: formatCurrency(currentMrr),
      icon: <Badge variant="success" className="text-white bg-green-500 border-none font-bold">MRR</Badge>,
      gradient: "from-green-500 to-emerald-600"
    },
    {
      title: "Estimasi MRR",
      value: formatCurrency(forecastMrr),
      icon: <Badge variant="info" className="text-white bg-blue-500 border-none font-bold">FC</Badge>,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "ARR Proyeksi",
      value: formatCurrency(forecastArr),
      icon: <Badge className="text-white bg-purple-500 border-none font-bold">ARR</Badge>,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "Pertumbuhan Bersih",
      value: formatPct(netGrowthPct),
      icon: <Badge className="text-white bg-amber-500 border-none font-bold">NET</Badge>,
      gradient: "from-amber-500 to-orange-600"
    }
  ], [currentMrr, forecastMrr, forecastArr, netGrowthPct]);

  if (anyLoading && !forecastQuery.data) {
    return (
      <div className="flex justify-center p-10">
        <Loader />
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat Analisis &amp; Proyeksi Pendapatan</AlertTitle>
          <AlertDescription>Periksa koneksi atau coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SuperAdminPageLayout
      title="Perencanaan & Proyeksi Pendapatan"
      description="Digunakan untuk menyusun skenario pendapatan ke depan dan memahami faktor penggeraknya."
      breadcrumbs={[
        { label: 'Analisis & Kecerdasan Bisnis', path: '/superadmin/intelligence/revenue' },
        { label: 'Perencanaan Pendapatan' }
      ]}
      stats={statsMetrics}
      isLoadingStats={forecastQuery.isLoading}
      toolbar={<span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Periode Proyeksi: {formatMonthLabel(forecastQuery.data?.month || null)}</span>}
    >

      <SectionCard
        title="Ringkasan Angka Perencanaan"
        icon={TrendingUp}
        fullWidth
      >
        <div className="w-full space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ringkasan angka utama yang dipakai sebagai dasar simulasi dan proyeksi.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Pendapatan Bulanan Saat Ini</div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Total pendapatan langganan bulan berjalan.
            </div>
            <div className="text-base font-bold mt-2 text-gray-900 dark:text-gray-100">{formatCurrency(currentMrr)}</div>
          </div>
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Perkiraan Pendapatan Bulanan</div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Estimasi pendapatan bulan berikutnya berdasarkan tren.
            </div>
            <div className="text-base font-bold mt-2 text-gray-900 dark:text-gray-100">{formatCurrency(forecastMrr)}</div>
          </div>
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Pendapatan Pasca Risiko
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Pendapatan dikurangi potensi risiko kehilangan.
            </div>
            <div className="text-base font-bold mt-2 text-gray-900 dark:text-gray-100">{formatCurrency(riskAdjusted)}</div>
          </div>
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Perkiraan Pendapatan Tahunan</div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Estimasi total pendapatan dalam 1 tahun.
            </div>
            <div className="text-base font-bold mt-2 text-gray-900 dark:text-gray-100">{formatCurrency(forecastArr)}</div>
          </div>
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Pertumbuhan Bersih</div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Selisih pertumbuhan setelah dikurangi churn.
            </div>
            <div className="text-base font-bold mt-2 text-green-600 dark:text-green-400">{formatPct(netGrowthPct)}</div>
          </div>
          <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-955/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Potensi Kehilangan</div>
            <div className="text-xs text-gray-500 dark:text-gray-550 min-h-[32px] mt-1">
              Estimasi pendapatan yang berisiko hilang.
            </div>
            <div className="text-base font-bold mt-2 text-red-600 dark:text-red-400">{formatPct(riskLossPct)}</div>
          </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Faktor Perubahan Pendapatan"
        icon={Coins}
        fullWidth
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-955/20 border border-gray-100 dark:border-gray-800">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Proyeksi Kenaikan dari Upgrade</div>
            <div className="text-xl font-bold mt-2 text-green-600 dark:text-green-400">{formatCurrency(projectedUpgrade)}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-955/20 border border-gray-100 dark:border-gray-800">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Perkiraan Kehilangan karena Berhenti</div>
            <div className="text-xl font-bold mt-2 text-red-600 dark:text-red-400">{formatCurrency(projectedChurn)}</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-955/20 border border-gray-100 dark:border-gray-800">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Estimasi Risiko Kehilangan</div>
            <div className="text-xl font-bold mt-2 text-orange-600 dark:text-orange-400">{formatCurrency(riskLoss)}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Retensi Sekolah Berdasarkan Angkatan"
        icon={BarChart3}
        fullWidth
        noPadding
      >
        <div className="p-4 w-full space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tingkat bertahannya sekolah setelah mulai berlangganan.
          </p>
          <Table
            columns={[
              { key: 'cohort_month', label: 'Periode Mulai' },
              { key: 'active_count', label: 'Jumlah Sekolah' },
              { key: 'r1', label: 'R+1' },
              { key: 'r3', label: 'R+3' },
              { key: 'r6', label: 'R+6' },
              { key: 'r12', label: 'R+12' },
              { key: 'revenue_generated', label: 'Total Pendapatan 12 Bulan' },
            ]}
            data={cohorts.map((c) => {
              const total = Number(c.active_count || 0);
              return {
                cohort_month: formatMonthLabel(c.cohort_month),
                active_count: total,
                r1: retentionBadge(Number(c.retained_after_1_month || 0), total),
                r3: retentionBadge(Number(c.retained_after_3_month || 0), total),
                r6: retentionBadge(Number(c.retained_after_6_month || 0), total),
                r12: retentionBadge(Number(c.retained_after_12_month || 0), total),
                revenue_generated: formatCurrency(Number(c.revenue_generated || 0)),
              };
            })}
            emptyMessage="Belum ada data cohort untuk ditampilkan."
          />
        </div>
      </SectionCard>
    </SuperAdminPageLayout>
  );
}
