import React, { useMemo, useState, useCallback } from 'react';
import {
  Users,
  Wallet,
  PiggyBank,
  Receipt,
  Package,
  TrendingUp,
  BookOpen,
  Bell,
  Building2,
  Vote,
  MessageSquare,
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
  canAccess?: (capability: string) => boolean;
}

export const KoperasiBerandaTab: React.FC<KoperasiBerandaTabProps> = React.memo(({
  stats,
  chartData: propChartData = [],
  announcements = [],
  criticalStock = [],
  criticalStockLoading = false,
  onTabSelect,
  canAccess,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'all' | 'simpanan' | 'pinjaman' | 'penjualan'>('all');

  const hasCap = useCallback(
    (capability: string) => (canAccess ? canAccess(capability) : true),
    [canAccess]
  );

  const canApproveLoans = hasCap('cooperative.loans.approve');
  const canVerifyMembers = hasCap('cooperative.members.activate') || hasCap('cooperative.members.update');
  const canViewMembers = hasCap('cooperative.members.view.list') || hasCap('cooperative.members.manage');
  const canViewSavings =
    hasCap('cooperative.savings.view.list') ||
    hasCap('cooperative.savings.deposit') ||
    hasCap('cooperative.savings.withdraw');
  const canViewLoans =
    hasCap('cooperative.loans.view.list') ||
    canApproveLoans ||
    hasCap('cooperative.loans.repay');
  const canViewPos = hasCap('cooperative.store.orders.manage') || hasCap('coop.pos.access');
  const canViewStore =
    hasCap('cooperative.store.products.view.list') ||
    hasCap('cooperative.store.view.catalog') ||
    hasCap('cooperative.store.inventory.manage');
  const canViewSalesMetric =
    canViewPos ||
    hasCap('cooperative.store.transactions.view') ||
    hasCap('cooperative.reports.view.financial');
  const canViewShu =
    hasCap('cooperative.shu.view.report') ||
    hasCap('cooperative.shu.calculate') ||
    hasCap('cooperative.shu.approve') ||
    hasCap('cooperative.shu.manage');
  const canViewAccounting =
    hasCap('cooperative.reports.view.financial') ||
    hasCap('cooperative.reports.view.daily') ||
    hasCap('cooperative.reports.view.monthly');
  const canViewAssets =
    hasCap('cooperative.assets.view.list') ||
    hasCap('cooperative.assets.create') ||
    hasCap('cooperative.assets.manage');
  const canViewRat =
    hasCap('cooperative.rat.view') ||
    hasCap('cooperative.rat.manage') ||
    hasCap('cooperative.rat.vote');
  const canViewTickets =
    hasCap('cooperative.tickets.view.list') ||
    hasCap('cooperative.tickets.manage') ||
    hasCap('cooperative.tickets.reply');

  const realChartData = (stats?.monthlyTrend && stats.monthlyTrend.length > 0)
    ? stats.monthlyTrend
    : propChartData;

  // 1. Bento Grid Metrik Utama (Disesuaikan dengan kapabilitas jabatan aktif)
  const bentoCells: HubBentoCell[] = useMemo(() => {
    const cells: HubBentoCell[] = [];

    if (canViewMembers) {
      cells.push({
        id: 'totalMembers',
        title: 'Total Anggota',
        value: `${stats?.totalMembers ?? 0} Orang`,
        subtext: stats?.wajibCompliance
          ? `Kepatuhan ${stats.wajibCompliance.compliancePercent}%`
          : 'Anggota Terdaftar',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        badge:
          canVerifyMembers && (stats?.pendingMembers?.count ?? 0) > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500 text-white">
              {stats?.pendingMembers?.count} Baru
            </span>
          ) : undefined,
        onClick: () => onTabSelect('anggota'),
      });
    }

    if (canViewSavings) {
      cells.push({
        id: 'totalSavings',
        title: 'Total Simpanan',
        value: formatRupiahCompact(stats?.totalSavings),
        subtext: 'Simpanan Pokok & Wajib',
        icon: Wallet,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onTabSelect('simpanan'),
      });
    }

    if (canViewLoans) {
      cells.push({
        id: 'totalLoans',
        title: 'Pinjaman Beredar',
        value: formatRupiahCompact(stats?.totalLoans),
        subtext:
          (stats?.dueInstallments ?? 0) > 0
            ? `${stats?.dueInstallments} Jatuh Tempo`
            : 'Portofolio Kredit',
        icon: PiggyBank,
        iconColorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
        badge:
          (stats?.dueInstallments ?? 0) > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
              {stats?.dueInstallments} JT
            </span>
          ) : undefined,
        onClick: () => onTabSelect('pinjaman'),
      });
    }

    if (canViewSalesMetric) {
      cells.push({
        id: 'storeSalesToday',
        title: canViewPos ? 'Kasir Toko POS' : 'Omzet Toko Hari Ini',
        value: formatRupiahCompact(stats?.storeSalesToday),
        subtext: stats?.storeSalesCountToday
          ? `${stats.storeSalesCountToday} Transaksi Hari Ini`
          : 'Omzet Toko Hari Ini',
        icon: Receipt,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => onTabSelect(canViewPos ? 'pos' : 'produk'),
      });
    }

    if (cells.length < 4 && canViewStore && !canViewPos) {
      cells.push({
        id: 'criticalStockCount',
        title: 'Pantauan Stok Toko',
        value: `${criticalStock.length} Item Kritis`,
        subtext: criticalStock.length > 0 ? 'Perlu restok segera' : 'Seluruh stok aman',
        icon: Package,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
        onClick: () => onTabSelect('produk'),
      });
    }

    if (cells.length < 4 && canViewAssets) {
      cells.push({
        id: 'assetsShortcut',
        title: 'Inventaris Aset',
        value: 'Kelola Aktiva',
        subtext: 'Peralatan & sarana koperasi',
        icon: Building2,
        iconColorClass: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60',
        onClick: () => onTabSelect('aset'),
      });
    }

    if (cells.length < 4 && canViewTickets) {
      cells.push({
        id: 'openTickets',
        title: 'Tiket & Aduan',
        value: `${stats?.openTickets ?? 0} Terbuka`,
        subtext: (stats?.openTickets ?? 0) > 0 ? 'Menunggu tindak lanjut' : 'Semua aduan tertangani',
        icon: MessageSquare,
        iconColorClass: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60',
        onClick: () => onTabSelect('tiket'),
      });
    }

    if (cells.length < 4 && canViewRat) {
      cells.push({
        id: 'ratOverview',
        title: 'Tata Kelola RAT',
        value: `Tahun ${stats?.activePeriod?.year || new Date().getFullYear()}`,
        subtext: 'Musyawarah & e-Voting Anggota',
        icon: Vote,
        iconColorClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
        onClick: () => onTabSelect('rat'),
      });
    }

    return cells.slice(0, 4);
  }, [
    stats,
    criticalStock.length,
    onTabSelect,
    canViewMembers,
    canVerifyMembers,
    canViewSavings,
    canViewLoans,
    canViewSalesMetric,
    canViewPos,
    canViewStore,
    canViewAssets,
    canViewTickets,
    canViewRat,
  ]);

  // 2. Pintasan Aksi Operasional (Disesuaikan dengan kapabilitas jabatan)
  const actionItems: HubActionItem[] = useMemo(() => {
    const items: HubActionItem[] = [];

    if (canViewPos) {
      items.push({
        id: 'pos',
        label: 'Kasir POS',
        icon: Receipt,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('pos'),
      });
    }
    if (canViewSavings) {
      items.push({
        id: 'simpanan',
        label: 'Simpanan',
        icon: Wallet,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('simpanan'),
      });
    }
    if (canViewLoans) {
      items.push({
        id: 'pinjaman',
        label: 'Pinjaman',
        icon: PiggyBank,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        badge: canApproveLoans && (stats?.pendingLoans?.length ?? 0) > 0 ? stats?.pendingLoans?.length : undefined,
        onClick: () => onTabSelect('pinjaman'),
      });
    }
    if (canViewMembers) {
      items.push({
        id: 'anggota',
        label: 'Data Anggota',
        icon: Users,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        badge: canVerifyMembers && (stats?.pendingMembers?.count ?? 0) > 0 ? stats?.pendingMembers?.count : undefined,
        onClick: () => onTabSelect('anggota'),
      });
    }
    if (canViewStore) {
      items.push({
        id: 'produk',
        label: 'Katalog Toko',
        icon: Package,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        badge: criticalStock.length > 0 ? criticalStock.length : undefined,
        onClick: () => onTabSelect('produk'),
      });
    }
    if (canViewShu) {
      items.push({
        id: 'shu',
        label: 'Laporan SHU',
        icon: TrendingUp,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('shu'),
      });
    }
    if (canViewAccounting) {
      items.push({
        id: 'akuntansi',
        label: 'Buku Akuntansi',
        icon: BookOpen,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('akuntansi'),
      });
    }
    if (canViewAssets) {
      items.push({
        id: 'aset',
        label: 'Aset Koperasi',
        icon: Building2,
        iconColorClass: 'text-cyan-600 dark:text-cyan-400',
        onClick: () => onTabSelect('aset'),
      });
    }
    if (canViewRat) {
      items.push({
        id: 'rat',
        label: 'Sidang RAT',
        icon: Vote,
        iconColorClass: 'text-violet-600 dark:text-violet-400',
        onClick: () => onTabSelect('rat'),
      });
    }
    if (canViewTickets) {
      items.push({
        id: 'tiket',
        label: 'Tiket Aduan',
        icon: MessageSquare,
        iconColorClass: 'text-orange-600 dark:text-orange-400',
        badge: (stats?.openTickets ?? 0) > 0 ? stats?.openTickets : undefined,
        onClick: () => onTabSelect('tiket'),
      });
    }

    return items;
  }, [
    stats,
    criticalStock.length,
    onTabSelect,
    canViewPos,
    canViewSavings,
    canViewLoans,
    canApproveLoans,
    canViewMembers,
    canVerifyMembers,
    canViewStore,
    canViewShu,
    canViewAccounting,
    canViewAssets,
    canViewRat,
    canViewTickets,
  ]);

  const showFinancialChart = canViewSavings || canViewLoans || canViewSalesMetric;
  const showLiquidityRadar = Boolean(stats) && (canViewLoans || canViewAccounting);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── 1. Antrean Persetujuan Pinjaman / Anggota Baru (Hanya yang berwenang) ── */}
      {stats && (canApproveLoans || canVerifyMembers) && (
        <CoopApprovalHub
          pendingLoans={stats.pendingLoans}
          pendingMembers={stats.pendingMembers}
          showLoans={canApproveLoans}
          showMembers={canVerifyMembers}
        />
      )}

      {/* ── 2. Shopee-Grade Hairline Bento Grid ── */}
      {bentoCells.length > 0 && (
        <HubCard padding="none" variant="flat" className="overflow-hidden">
          <HubBentoGrid cells={bentoCells} />
        </HubCard>
      )}

      {/* ── 3. Shopee-Grade Headerless Quick Action Slider ── */}
      {actionItems.length > 0 && (
        <HubCard padding="compact" variant="flat">
          <HubActionGrid
            items={actionItems}
            columns={Math.min(Math.max(actionItems.length, 4), 7) as 4 | 5 | 6 | 7}
            variant="slider"
          />
        </HubCard>
      )}

      {/* ── 4. Banner Tata Kelola RAT Koperasi ── */}
      {canViewRat && stats?.activePeriod && (
        <CoopRatGovernanceBanner
          totalActiveMembers={stats.activeMembers ?? stats.totalMembers}
          fiscalYear={stats.activePeriod.year}
        />
      )}

      {/* ── 5. Grid Operasional: Grafik Tren Finansial, Radar Likuiditas, Stok & Pengumuman ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
        {(showFinancialChart || showLiquidityRadar) && (
          <div className="lg:col-span-2 min-w-0 space-y-4">
            {/* Grafik Tren Finansial */}
            {showFinancialChart && (
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
                    {canViewSavings && (
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
                    )}
                    {canViewLoans && (
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
                    )}
                    {canViewSalesMetric && (
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
                    )}
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
                        {canViewSavings && (activeChartMetric === 'all' || activeChartMetric === 'simpanan') && (
                          <Bar dataKey="simpanan" name="Simpanan" fill="#10b981" radius={[4, 4, 0, 0]} />
                        )}
                        {canViewLoans && (activeChartMetric === 'all' || activeChartMetric === 'pinjaman') && (
                          <Bar dataKey="pinjaman" name="Pinjaman" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        )}
                        {canViewSalesMetric && (activeChartMetric === 'all' || activeChartMetric === 'penjualan') && (
                          <Bar dataKey="penjualan" name="Penjualan Toko" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Radar Likuiditas Kas */}
            {showLiquidityRadar && stats && <CoopLiquidityRadarSection stats={stats} />}
          </div>
        )}

        {/* Kolom Kanan (Atau Full Width jika tidak ada Grafik Keuangan, mis. Sekretaris): Peringatan Stok & Pengumuman */}
        <div className={cn('space-y-4 min-w-0', !showFinancialChart && !showLiquidityRadar && 'lg:col-span-3')}>
          {/* Stok Kritis Toko */}
          {canViewStore && (
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
                  {criticalStock.slice(0, 5)?.map((item, idx) => (
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
          )}

          {/* Pengumuman Pengurus */}
          {announcements.length > 0 && (
            <SectionCard title="Pengumuman Koperasi" icon={Bell}>
              <div className="space-y-2">
                {announcements.slice(0, 3)?.map((ann, i) => (
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
