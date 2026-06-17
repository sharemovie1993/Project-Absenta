import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, SectionCard } from '@/components/ui';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';
import IntelligenceRiskTable from '@/components/superadmin/intelligence/IntelligenceRiskTable';
import IntelligenceEmailChart from '@/components/superadmin/intelligence/IntelligenceEmailChart';
import IntelligencePaymentChart from '@/components/superadmin/intelligence/IntelligencePaymentChart';
import AttendancePerformanceSection from '@/components/superadmin/intelligence/AttendancePerformanceSection';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { Users, UserCheck, CreditCard, AlertTriangle } from 'lucide-react';

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('id-ID').format(n);
}

function formatCurrencyIdr(n: number) {
  if (!Number.isFinite(n)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function PlatformIntelligencePage() {
  const overviewQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'overview'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getOverview();
      return res.data;
    },
  });

  const topRiskQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'top-risk'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getTopRisk();
      return res.data;
    },
  });

  const emailQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'email-health'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getEmailHealth();
      return res.data;
    },
  });

  const paymentQuery = useQuery({
    queryKey: ['superadmin', 'intelligence', 'payment-health'],
    queryFn: async () => {
      const res = await superadminIntelligenceApi.getPaymentHealth();
      return res.data;
    },
  });

  const anyLoading = overviewQuery.isLoading || topRiskQuery.isLoading || emailQuery.isLoading || paymentQuery.isLoading;
  const anyError = overviewQuery.isError || topRiskQuery.isError || emailQuery.isError || paymentQuery.isError;

  // Pemetaan Stats Card premium untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    const data = overviewQuery.data;
    const totalTenants = data?.totalTenants ?? 0;
    const activeTenants = data?.activeTenants ?? 0;
    const totalMRR = data?.totalMRR ?? 0;
    const avgRiskScore = data?.avgRiskScore ?? 0;

    return [
      {
        title: "Total Sekolah Terdaftar",
        value: formatNumber(totalTenants),
        icon: <Users className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Jumlah seluruh sekolah terintegrasi"
      },
      {
        title: "Sekolah Aktif",
        value: formatNumber(activeTenants),
        icon: <UserCheck className="h-4 w-4 text-white" />,
        gradient: "from-green-500 to-emerald-600",
        subtitle: "Menggunakan sistem secara real-time"
      },
      {
        title: "Pendapatan Bulanan (MRR)",
        value: formatCurrencyIdr(totalMRR),
        icon: <CreditCard className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-violet-600",
        subtitle: "Total omzet berulang bulanan"
      },
      {
        title: "Rata-rata Tingkat Risiko",
        value: formatNumber(Math.round(avgRiskScore)),
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
        gradient: "from-rose-500 to-pink-600",
        subtitle: "Skor kerentanan tenant platform"
      }
    ];
  }, [overviewQuery.data]);

  if (anyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat Ringkasan Platform</AlertTitle>
          <AlertDescription>Periksa koneksi atau coba ulang.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SuperAdminPageLayout
      title="Dashboard Ringkasan Platform"
      description="Analisis kesehatan tenant, pengiriman notifikasi, performa transaksi, serta estimasi tingkat risiko platform Absenta.id."
      breadcrumbs={[
        { label: 'Platform Intelligence' }
      ]}
      stats={statsList}
      isLoading={anyLoading && !overviewQuery.data}
    >
      <div className="space-y-6">
        {/* Tabel Risiko Tenant */}
        <IntelligenceRiskTable data={topRiskQuery.data || []} loading={topRiskQuery.isLoading} />

        {/* Grafik Notifikasi & Transaksi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IntelligenceEmailChart data={emailQuery.data} />
          <IntelligencePaymentChart data={paymentQuery.data} />
        </div>

        {/* Performa Presensi Global */}
        <SectionCard
          title="Performa Presensi Global (Absensi)"
          icon={UserCheck}
          fullWidth
        >
          <div className="w-full">
            <AttendancePerformanceSection topRiskTenants={topRiskQuery.data || []} />
          </div>
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  );
}
