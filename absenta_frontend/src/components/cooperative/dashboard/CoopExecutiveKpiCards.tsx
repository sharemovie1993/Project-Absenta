import React from 'react';
import { Users, Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import type { CoopManagementStats } from './types';

export const formatRupiahCompact = (amount: number | string | undefined | null): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num) || num === 0) return 'Rp 0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Jt`;
  }
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

export const formatRupiahFull = (amount: number | string | undefined | null): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

interface CoopExecutiveKpiCardsProps {
  stats: CoopManagementStats;
  loading?: boolean;
}

export const CoopExecutiveKpiCards: React.FC<CoopExecutiveKpiCardsProps> = React.memo(({
  stats,
  loading = false,
}) => {
  const totalSavingsFull = formatRupiahFull(stats.totalSavings);
  const totalLoansFull = formatRupiahFull(stats.totalLoans);
  const estimatedShuFull = formatRupiahFull(stats.estimatedShuYtd?.totalEstimatedShu);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
      {/* 1. Keanggotaan & Kepatuhan Iuran Wajib */}
      <AnalyticsCard
        title="Total Anggota"
        value={
          <span className="text-xl sm:text-2xl font-black tracking-tight">
            {stats.totalMembers || 0}{' '}
            <span className="text-xs font-normal opacity-80">Orang</span>
          </span>
        }
        icon={<Users size={22} />}
        gradient="from-indigo-600 to-indigo-800 text-white border-indigo-400/30"
        subtitle={`${stats.wajibCompliance?.compliancePercent ?? 100}% Iuran Wajib Lunas (${stats.wajibCompliance?.unpaidCount ?? 0} belum)`}
        isLoading={loading}
      />

      {/* 2. Total Simpanan Terkumpul */}
      <AnalyticsCard
        title="Total Simpanan"
        value={
          <span 
            title={totalSavingsFull} 
            className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight truncate block cursor-help"
          >
            {formatRupiahCompact(stats.totalSavings)}
          </span>
        }
        icon={<Wallet size={22} />}
        gradient="from-emerald-600 to-teal-700 text-white border-emerald-400/30"
        subtitle={`Pokok: ${formatRupiahCompact(stats.simpananPokok)} • Wajib: ${formatRupiahCompact(stats.simpananWajib)}`}
        isLoading={loading}
      />

      {/* 3. Portofolio Pinjaman Beredar & Rasio NPL */}
      <AnalyticsCard
        title="Pinjaman Beredar"
        value={
          <span 
            title={totalLoansFull} 
            className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight truncate block cursor-help"
          >
            {formatRupiahCompact(stats.totalLoans)}
          </span>
        }
        icon={<TrendingUp size={22} />}
        gradient="from-amber-500 to-orange-600 text-white border-amber-400/30"
        subtitle={`${stats.loanPortfolio?.nplRatio ?? 0}% NPL • ${stats.activeLoansCount || 0} Pinjaman Aktif`}
        isLoading={loading}
      />

      {/* 4. Estimasi Akumulasi SHU Tahun Berjalan */}
      <AnalyticsCard
        title={`Estimasi SHU ${stats.estimatedShuYtd?.year || ''}`.trim()}
        value={
          <span 
            title={estimatedShuFull} 
            className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight truncate block cursor-help"
          >
            {formatRupiahCompact(stats.estimatedShuYtd?.totalEstimatedShu || 0)}
          </span>
        }
        icon={<PiggyBank size={22} />}
        gradient="from-purple-600 to-indigo-700 text-white border-purple-400/30"
        subtitle={`Omzet POS: ${formatRupiahCompact(stats.storeSalesMonth || 0)}/bln`}
        isLoading={loading}
      />
    </div>
  );
});

CoopExecutiveKpiCards.displayName = 'CoopExecutiveKpiCards';
