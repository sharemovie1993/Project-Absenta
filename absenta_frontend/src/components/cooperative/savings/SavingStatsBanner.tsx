import React, { useMemo } from 'react';
import { Wallet, TrendingUp, Clock } from 'lucide-react';
import { AnalyticsCard } from '../../ui/AnalyticsCard';
import type { Saving } from './types';

interface SavingStatsBannerProps {
  savings: Saving[];
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Jt`
    : `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const SavingStatsBanner = React.memo<SavingStatsBannerProps>(({ savings }) => {
  const stats = useMemo(() => {
    let totalBalance = 0;
    const categoryMap: Record<string, { name: string; color?: string; amount: number }> = {};
    let latestTxDate: Date | null = null;

    savings?.forEach((s) => {
      const amt = parseFloat(s.amount) || 0;
      totalBalance += amt;

      const code = s.category?.code || 'LAINNYA';
      const name = s.category?.name || 'Lainnya';
      const color = s.category?.color;

      if (!categoryMap[code]) {
        categoryMap[code] = { name, color, amount: 0 };
      }
      categoryMap[code].amount += amt;

      const txs = s.transactions;
      if (txs && txs.length > 0) {
        const d = new Date(txs[0].date);
        if (!latestTxDate || d > latestTxDate) latestTxDate = d;
      }
    });

    const categories = Object.entries(categoryMap).map(([code, v]) => ({ code, ...v }));

    return {
      totalBalance,
      accountsCount: savings?.length || 0,
      categories,
      latestTxDate: latestTxDate as Date | null,
    };
  }, [savings]);

  const latestTxStr = useMemo(() => {
    if (!stats.latestTxDate) return 'Belum ada transaksi';
    const now = new Date();
    const diffMs = now.getTime() - stats.latestTxDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 30) return `${diffDays} hari lalu`;
    const months = Math.floor(diffDays / 30);
    return `${months} bulan lalu`;
  }, [stats.latestTxDate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
      {/* Card 1: Total Simpanan */}
      <AnalyticsCard
        title="Total Simpanan"
        value={fmt(stats.totalBalance)}
        subtitle={`Rp ${Math.round(stats.totalBalance).toLocaleString('id-ID')} (${stats.accountsCount} rekening aktif)`}
        icon={<Wallet />}
        gradient="from-indigo-600 to-indigo-850"
      />

      {/* Card 2: Rincian per Kategori */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between min-h-[112px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Rincian per Jenis</p>
        </div>
        <div className="space-y-2 flex-1 flex flex-col justify-center">
          {stats.categories.length === 0 ? (
            <p className="text-slate-400 text-xs italic">Belum ada rekening</p>
          ) : stats.categories?.map(cat => {
            const pct = stats.totalBalance > 0
              ? Math.round((cat.amount / stats.totalBalance) * 100)
              : 0;
            return (
              <div key={cat.code} className="w-full">
                <div className="flex justify-between items-center mb-0.5">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: cat.color || '#64748b' }}
                  >
                    {cat.name}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {fmt(cat.amount)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.color || '#818cf8',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Transaksi Terakhir & Status */}
      <AnalyticsCard
        title="Aktivitas Terakhir"
        value={latestTxStr}
        subtitle={stats.latestTxDate ? stats.latestTxDate.toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric'
        }) : 'Belum ada transaksi'}
        icon={<Clock />}
        gradient="from-amber-500 to-orange-600"
      />
    </div>
  );
});

SavingStatsBanner.displayName = 'SavingStatsBanner';
