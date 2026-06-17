import React from 'react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import type { PlatformOverview } from '@/api/superadmin-intelligence.api';
import { Users, UserCheck, UserX, CreditCard, AlertTriangle } from 'lucide-react';

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('id-ID').format(n);
}

function formatCurrencyIdr(n: number) {
  if (!Number.isFinite(n)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function IntelligenceOverviewCards({ data }: { data: PlatformOverview | null | undefined }) {
  const totalTenants = data?.totalTenants ?? 0;
  const activeTenants = data?.activeTenants ?? 0;
  const suspendedTenants = data?.suspendedTenants ?? 0;
  const totalMRR = data?.totalMRR ?? 0;
  const avgRiskScore = data?.avgRiskScore ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <AnalyticsCard
        title="Total Sekolah Terdaftar"
        value={formatNumber(totalTenants)}
        icon={<Users className="h-4 w-4 text-white" />}
        gradient="from-blue-500 to-indigo-600"
        subtitle="Sekolah terintegrasi"
      />

      <AnalyticsCard
        title="Sekolah Aktif"
        value={formatNumber(activeTenants)}
        icon={<UserCheck className="h-4 w-4 text-white" />}
        gradient="from-green-500 to-emerald-600"
        subtitle="Koneksi real-time"
      />

      <AnalyticsCard
        title="Sekolah Ditangguhkan"
        value={formatNumber(suspendedTenants)}
        icon={<UserX className="h-4 w-4 text-white" />}
        gradient="from-rose-500 to-pink-600"
        subtitle="Akses dinonaktifkan"
      />

      <AnalyticsCard
        title="Pendapatan Bulanan (MRR)"
        value={formatCurrencyIdr(totalMRR)}
        icon={<CreditCard className="h-4 w-4 text-white" />}
        gradient="from-purple-500 to-violet-600"
        subtitle="Omzet berjalan bulanan"
      />

      <AnalyticsCard
        title="Rata-rata Tingkat Risiko"
        value={formatNumber(Math.round(avgRiskScore))}
        icon={<AlertTriangle className="h-4 w-4 text-white" />}
        gradient="from-amber-500 to-orange-600"
        subtitle="Skor kerentanan platform"
      />
    </div>
  );
}

export default IntelligenceOverviewCards;
