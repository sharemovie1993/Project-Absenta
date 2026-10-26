import React, { useMemo, useState } from 'react';
import {
  Users,
  Wallet,
  PiggyBank,
  Receipt,
  Package,
  TrendingUp,
  BookOpen,
  Bell,
  BarChart3,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { SectionCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatRupiahCompact } from '@/components/cooperative/dashboard/CoopExecutiveKpiCards';
import { CoopApprovalHub } from '@/components/cooperative/dashboard/CoopApprovalHub';
import { CoopLiquidityRadarSection } from '@/components/cooperative/dashboard/CoopLiquidityRadarSection';
import { CoopRatGovernanceBanner } from '@/components/cooperative/dashboard/CoopRatGovernanceBanner';
import type { Announcement, CriticalStockItem } from '@/components/cooperative/types';
import type { CoopManagementStats } from '@/components/cooperative/dashboard/types';
import type { KoperasiTabId } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface KoperasiBerandaTabProps {
  stats: CoopManagementStats | null;
  chartData?: Array<{ name: string; simpanan: number; pinjaman: number; penjualan?: number }>;
  announcements?: Announcement[];
  criticalStock?: CriticalStockItem[];
  criticalStockLoading?: boolean;
  loading: boolean;
  onTabSelect: (tabId: KoperasiTabId) => void;
}

export const KoperasiBerandaTab: React.FC<KoperasiBerandaTabProps> = React.memo(({
  stats,
  chartData: propChartData = [],
  announcements = [],
  criticalStock = [],
  criticalStockLoading = false,
  loading,
  onTabSelect,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'all' | 'simpanan' | 'pinjaman' | 'penjualan'>('all');

  const realChartData = (stats?.monthlyTrend && stats.monthlyTrend.length > 0)
    ? stats.monthlyTrend
    : propChartData;

  const recentActivities = stats?.recentActivities || [];

  // 1. Bento Grid 2x2 Metrik Utama (Shopee-Grade Hairline Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalMembers',
        title: 'Total Anggota',
        value: `${stats?.totalMembers ?? 0} Orang`,
        subtext: stats?.wajibCompliance 
          ? `Kepatuhan ${stats.wajibCompliance.compliancePercent}%` 
          : 'Anggota Terdaftar',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        badge: (stats?.pendingMembers?.count ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500 text-white">
            {stats?.pendingMembers?.count} Baru
          </span>
        ) : undefined,
        onClick: () => onTabSelect('anggota'),
      },
      {
        id: 'totalSavings',
        title: 'Total Simpanan',
        value: formatRupiahCompact(stats?.totalSavings),
        subtext: 'Simpanan Pokok & Wajib',
        icon: Wallet,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('simpanan'),
      },
      {
        id: 'totalLoans',
        title: 'Pinjaman Beredar',
        value: formatRupiahCompact(stats?.totalLoans),
        subtext: (stats?.dueInstallments ?? 0) > 0
          ? `${stats?.dueInstallments} Jatuh Tempo`
          : 'Portofolio Kredit',
        icon: PiggyBank,
        iconColorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
        badge: (stats?.dueInstallments ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            {stats?.dueInstallments} JT
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pinjaman'),
      },
      {
        id: 'storeSalesToday',
        title: 'Kasir Toko POS',
        value: formatRupiahCompact(stats?.storeSalesToday),
        subtext: stats?.storeSalesCountToday
          ? `${stats.storeSalesCountToday} Transaksi Hari Ini`
          : 'Omzet Toko Hari Ini',
        icon: Receipt,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onTabSelect('pos'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Pintasan Aksi Operasional (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'pos',
        label: 'Kasir POS',
        icon: Receipt,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('pos'),
      },
      {
        id: 'simpanan',
        label: 'Simpanan',
        icon: Wallet,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('simpanan'),
      },
      {
        id: 'pinjaman',
        label: 'Pinjaman',
        icon: PiggyBank,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        badge: (stats?.pendingLoans?.length ?? 0) > 0 ? stats?.pendingLoans?.length : undefined,
        onClick: () => onTabSelect('pinjaman'),
      },
      {
        id: 'anggota',
        label: 'Data Anggota',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        badge: (stats?.pendingMembers?.count ?? 0) > 0 ? stats?.pendingMembers?.count : undefined,
        onClick: () => onTabSelect('anggota'),
      },
      {
        id: 'produk',
        label: 'Katalog Toko',
        icon: Package,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        badge: criticalStock.length > 0 ? criticalStock.length : undefined,
        onClick: () => onTabSelect('produk'),
      },
      {
        id: 'shu',
        label: 'Laporan SHU',
        icon: TrendingUp,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('shu'),
      },
      {
        id: 'akuntansi',
        label: 'Buku Akuntansi',
        icon: BookOpen,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('akuntansi'),
      },
    ],
    [stats, criticalStock.length, onTabSelect]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── 1. Antrean Persetujuan Pinjaman / Anggota Baru ── */}
      {stats && (
        <CoopApprovalHub
          pendingLoans={stats.pendingLoans}
          pendingMembers={stats.pendingMembers}
        />
      )}

      {/* ── 2. Shopee-Grade Hairline Bento Grid (2x2 / 4x1) ── */}
      <HubCard padding="none" variant="flat" className="overflow-hidden">
        <HubBentoGrid cells={bentoCells} />
      </HubCard>

      {/* ── 3. Shopee-Grade Headerless Quick Action Slider ── */}
      <HubCard padding="compact" variant="flat">
        <HubActionGrid
          items={actionItems}
          columns={7}
          variant="slider"
        />
      </HubCard>

      {/* ── 4. Banner Tata Kelola RAT Koperasi ── */}
      {stats?.activePeriod && (
        <CoopRatGovernanceBanner activePeriod={stats.activePeriod} />
      )}

      {/* ── 5. Grid Operasional: Grafik Tren Finansial & Radar Likuiditas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
        <div className="lg:col-span-2 min-w-0 space-y-4">
          {/* Grafik Tren Finansial */}
          <SectionCard
            title="Tren Finansial Koperasi"
            action={
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeChartMetric === 'all'
                      ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('simpanan')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeChartMetric === 'simpanan'
                      ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  Simpanan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('pinjaman')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeChartMetric === 'pinjaman'
                      ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-purple-600 dark:text-purple-400"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  Pinjaman
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('penjualan')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    activeChartMetric === 'penjualan'
                      ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  Toko POS
                </button>
              </div>
            }
            fullWidth
            noPadding
          >
            <div className="p-4 sm:p-6 space-y-4">
              <div className="h-64 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <BarChart
                    data={realChartData}
                    margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      width={65}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (val === 0) return 'Rp 0';
                        if (val >= 1000000) return `${(val / 1000000).toLocaleString('id-ID')} Jt`;
                        return `${(val / 1000).toLocaleString('id-ID')} Rb`;
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                    />
                    {(activeChartMetric === 'all' || activeChartMetric === 'simpanan') && (
                      <Bar dataKey="simpanan" name="Simpanan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    )}
                    {(activeChartMetric === 'all' || activeChartMetric === 'pinjaman') && (
                      <Bar dataKey="pinjaman" name="Pinjaman" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    )}
                    {(activeChartMetric === 'all' || activeChartMetric === 'penjualan') && (
                      <Bar dataKey="penjualan" name="Penjualan Toko" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SectionCard>

          {/* Radar Likuiditas Kas */}
          {stats && <CoopLiquidityRadarSection stats={stats} />}
        </div>

        {/* Kolom Kanan: Peringatan Stok Kritis & Aktivitas Terkini */}
        <div className="space-y-4 min-w-0">
          {/* Stok Kritis Toko */}
          <SectionCard
            title="Peringatan Stok Toko"
            icon={Package}
            action={
              <button
                type="button"
                onClick={() => onTabSelect('produk')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Lihat Semua
              </button>
            }
          >
            {criticalStockLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Memeriksa stok...</div>
            ) : criticalStock.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Seluruh persediaan barang toko aman
              </div>
            ) : (
              <div className="space-y-2">
                {criticalStock.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Sisa: <span className="font-bold text-rose-500">{item.stock} unit</span>
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      item.status === 'HABIS' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Pengumuman Pengurus */}
          {announcements.length > 0 && (
            <SectionCard title="Pengumuman Koperasi" icon={Bell}>
              <div className="space-y-2">
                {announcements.slice(0, 3).map((ann, i) => (
                  <div key={ann.id || i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{ann.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
});

KoperasiBerandaTab.displayName = 'KoperasiBerandaTab';
