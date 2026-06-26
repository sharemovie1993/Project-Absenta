import React, { useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, SectionCard, Loader } from '@/components/ui';
import { superadminIntelligenceApi } from '@/api/superadmin-intelligence.api';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { Users, UserCheck, CreditCard, AlertTriangle } from 'lucide-react';

// Lazy load complex sections
const IntelligenceRiskTable = lazy(() => import('@/components/superadmin/intelligence/IntelligenceRiskTable'));
const IntelligenceEmailChart = lazy(() => import('@/components/superadmin/intelligence/IntelligenceEmailChart'));
const IntelligencePaymentChart = lazy(() => import('@/components/superadmin/intelligence/IntelligencePaymentChart'));
const AttendancePerformanceSection = lazy(() => import('@/components/superadmin/intelligence/AttendancePerformanceSection'));

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('id-ID').format(n);
}

function formatCurrencyIdr(n: number) {
  if (!Number.isFinite(n)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function PlatformIntelligencePage() {
  const instruction = useMemo(() => ({
    title: 'Panduan Platform Intelligence',
    description: 'Halaman ini menyajikan analisis data tingkat lanjut untuk memantau kesehatan seluruh ekosistem platform Absenta.',
    items: [
      { text: 'Analisis Risiko mendeteksi anomali pada tenant yang mungkin memerlukan perhatian teknis atau administratif.' },
      { text: 'Metrik Pengiriman Email memantau reputasi server pengiriman (SMTP/SES) agar notifikasi tidak masuk spam.' },
      { text: 'Monitoring Pembayaran memberikan gambaran real-time mengenai keberhasilan transaksi dan potensi gagal bayar.' }
    ]
  }), []);

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
      title="Platform Intelligence & Analytics"
      description="Dashboard analisis prediktif, pemantauan risiko infrastruktur, dan metrik kesehatan ekosistem Absenta."
      stats={statsList}
      hardeningModuleKey="platformintelligencepage"
      instruction={instruction}
      breadcrumbs={[
        { label: 'Intelligence Center' }
      ]}
    >
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Tabel Risiko Tenant */}
        <Suspense fallback={<Loader />}>
          <IntelligenceRiskTable data={topRiskQuery.data || []} loading={topRiskQuery.isLoading} />
        </Suspense>

        {/* Grafik Notifikasi & Transaksi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<Loader />}>
            <IntelligenceEmailChart data={emailQuery.data} />
          </Suspense>
          <Suspense fallback={<Loader />}>
            <IntelligencePaymentChart data={paymentQuery.data} />
          </Suspense>
        </div>

        {/* Performa Presensi Global */}
        <SectionCard
          title="Performa Presensi Global (Absensi)"
          icon={UserCheck}
          fullWidth
        >
          <div className="w-full">
            <Suspense fallback={<Loader />}>
              <AttendancePerformanceSection topRiskTenants={topRiskQuery.data || []} />
            </Suspense>
          </div>
        </SectionCard>
      </div>
    </SuperAdminPageLayout>
  );
}
