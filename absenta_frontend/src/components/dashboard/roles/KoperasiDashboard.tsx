import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import api from '@/lib/axiosInstance';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { KoperasiDashboardSkeleton } from './koperasi/KoperasiDashboardSkeleton';
import type { KoperasiTabId, KoperasiNavTabItem } from './koperasi/types';
import type { CoopManagementStats } from '@/components/cooperative/dashboard/types';
import type { Announcement, CriticalStockItem } from '@/components/cooperative/types';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { KoperasiBerandaTab } from './koperasi/tabs/KoperasiBerandaTab';
import { KoperasiPosTab } from './koperasi/tabs/KoperasiPosTab';
import { KoperasiSimpananTab } from './koperasi/tabs/KoperasiSimpananTab';
import { KoperasiPinjamanTab } from './koperasi/tabs/KoperasiPinjamanTab';
import { KoperasiAnggotaTab } from './koperasi/tabs/KoperasiAnggotaTab';
import { KoperasiProdukTab } from './koperasi/tabs/KoperasiProdukTab';
import { KoperasiShuTab } from './koperasi/tabs/KoperasiShuTab';
import { KoperasiAkuntansiTab } from './koperasi/tabs/KoperasiAkuntansiTab';

export interface KoperasiDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KoperasiDashboard: React.FC<KoperasiDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KoperasiTabId | null;

  const validTabs: KoperasiTabId[] = [
    'ringkasan',
    'pos',
    'simpanan',
    'pinjaman',
    'anggota',
    'produk',
    'shu',
    'akuntansi',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<KoperasiTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<KoperasiTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam) {
      setActiveTab('ringkasan');
      setVisitedTabs((prev) => (prev.has('ringkasan') ? prev : new Set(prev).add('ringkasan')));
    }
  }, [subtabParam]);

  const handleTabSelect = useCallback(
    (tabId: KoperasiTabId) => {
      setActiveTab(tabId);
      setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));

      const currentSubtab = searchParams.get('subtab') || 'ringkasan';
      if (currentSubtab !== tabId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (tabId === 'ringkasan') {
              next.delete('subtab');
            } else {
              next.set('subtab', tabId);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [searchParams, setSearchParams]
  );

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  // Data Queries
  const { data: stats = null, isLoading: loadingStats } = useQuery<CoopManagementStats | null>({
    queryKey: ['cooperative-dashboard', 'stats'],
    queryFn: async () => {
      const statsRes = await api.get('/cooperative/dashboard/stats');
      const raw = statsRes.data?.data || {};
      return {
        ...raw,
        totalMembers: Number(raw.totalMembers) || 0,
        totalSavings: Number(raw.totalSavings) || 0,
        totalLoans: Number(raw.totalLoans) || 0,
        dueInstallments: Number(raw.dueInstallments) || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['cooperative-announcements'],
    queryFn: async () => {
      try {
        const annRes = await api.get('/cooperative/announcements');
        const annList = annRes.data?.data;
        return Array.isArray(annList) ? annList : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: criticalStock = [], isLoading: criticalStockLoading } = useQuery<CriticalStockItem[]>({
    queryKey: ['cooperative-critical-stock'],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/reports/inventory/stock');
        const items = res.data?.items || [];
        return items.filter((item: CriticalStockItem) => item.status === 'HABIS' || item.status === 'RENDAH');
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Navigation Items Desktop Sidebar
  const navTabs: KoperasiNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Beranda Koperasi',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'pos',
        label: 'Kasir Toko (POS)',
        shortLabel: 'Kasir POS',
        icon: Receipt,
      },
      {
        id: 'simpanan',
        label: 'Simpanan Anggota',
        shortLabel: 'Simpanan',
        icon: Wallet,
      },
      {
        id: 'pinjaman',
        label: 'Pinjaman & Kredit',
        shortLabel: 'Pinjaman',
        icon: PiggyBank,
        badge: (stats?.dueInstallments ?? 0) > 0 ? `${stats?.dueInstallments}` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'anggota',
        label: 'Buku Anggota',
        shortLabel: 'Anggota',
        icon: Users,
        badge: (stats?.pendingMembers?.count ?? 0) > 0 ? `${stats?.pendingMembers?.count}` : undefined,
        badgeColor: 'bg-blue-500 text-white',
      },
      {
        id: 'produk',
        label: 'Katalog & Stok',
        shortLabel: 'Katalog',
        icon: Package,
        badge: criticalStock.length > 0 ? `${criticalStock.length}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'shu',
        label: 'Sisa Hasil Usaha',
        shortLabel: 'SHU',
        icon: TrendingUp,
      },
      {
        id: 'akuntansi',
        label: 'Buku Akuntansi',
        shortLabel: 'Akuntansi',
        icon: BookOpen,
      },
    ],
    [stats?.dueInstallments, stats?.pendingMembers?.count, criticalStock.length]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-critical-stock'] }),
      ]);
      toast.success('Data Koperasi berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadingStats && !stats) {
    return <KoperasiDashboardSkeleton />;
  }

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Dashboard Koperasi"
      description="Kelola transaksi kasir, simpan pinjam, bagi hasil SHU, dan pembukuan akuntansi koperasi sekolah dalam satu dashboard terintegrasi."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Header Toolbar Mobile & Desktop */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate('/dashboard?tab=ringkasan');
                  }
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0 cursor-pointer"
                title="Kembali ke Portal"
                aria-label="Kembali"
              >
                <ArrowLeft size={18} className="stroke-[2.2]" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    Dashboard Koperasi
                  </h1>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                    &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                  Simpan Pinjam, Kasir Minimarket, Sisa Hasil Usaha & Pembukuan Akuntansi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* TV Mode Shortcut */}
              <button
                type="button"
                onClick={() => navigate('/cooperative/dashboard')}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Buka Mode TV Monitor Koperasi"
              >
                <Tv size={14} />
                <span className="hidden sm:inline">Layar TV</span>
              </button>

              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  showMobileFilter
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                )}
                aria-label="Filter Akademik"
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filter</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Collapsible Academic Filter Toolbar Mobile */}
          {showMobileFilter && (
            <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <AcademicFilterToolbar
                {...academicFilter.toolbarProps}
                variant="compact"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky) */}
          <aside className="hidden lg:block sticky top-20 space-y-3">
            {/* Identitas Koperasi Ringkas */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-tight">
                    Ekonomi Sekolah
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    Koperasi
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">Periode Aktif</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                </span>
              </div>
            </div>

            {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="sidebar"
            />

            {/* Navigasi Menu Vertikal Sidebar */}
            <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSelect(tab.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                          isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Column: Dynamic Subtab Viewports (Keep-Alive Cache) */}
          <main className="min-w-0 flex-1 space-y-4">
            {/* TAB 1: BERANDA RINGKASAN KOPERASI */}
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                <KoperasiBerandaTab
                  stats={stats}
                  announcements={announcements}
                  criticalStock={criticalStock}
                  criticalStockLoading={criticalStockLoading}
                  loading={loadingStats}
                  onTabSelect={handleTabSelect}
                />
              </div>
            )}

            {/* TAB 2: KASIR POINT OF SALE (POS) */}
            {visitedTabs.has('pos') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pos'}
                className={cn('w-full min-w-0', activeTab === 'pos' ? 'block' : 'hidden')}
              >
                <KoperasiPosTab />
              </div>
            )}

            {/* TAB 3: SIMPANAN ANGGOTA */}
            {visitedTabs.has('simpanan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'simpanan'}
                className={cn('w-full min-w-0', activeTab === 'simpanan' ? 'block' : 'hidden')}
              >
                <KoperasiSimpananTab />
              </div>
            )}

            {/* TAB 4: PINJAMAN & KREDIT */}
            {visitedTabs.has('pinjaman') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pinjaman'}
                className={cn('w-full min-w-0', activeTab === 'pinjaman' ? 'block' : 'hidden')}
              >
                <KoperasiPinjamanTab />
              </div>
            )}

            {/* TAB 5: BUKU ANGGOTA */}
            {visitedTabs.has('anggota') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'anggota'}
                className={cn('w-full min-w-0', activeTab === 'anggota' ? 'block' : 'hidden')}
              >
                <KoperasiAnggotaTab />
              </div>
            )}

            {/* TAB 6: KATALOG & STOK */}
            {visitedTabs.has('produk') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'produk'}
                className={cn('w-full min-w-0', activeTab === 'produk' ? 'block' : 'hidden')}
              >
                <KoperasiProdukTab />
              </div>
            )}

            {/* TAB 7: SISA HASIL USAHA (SHU) */}
            {visitedTabs.has('shu') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'shu'}
                className={cn('w-full min-w-0', activeTab === 'shu' ? 'block' : 'hidden')}
              >
                <KoperasiShuTab />
              </div>
            )}

            {/* TAB 8: BUKU AKUNTANSI */}
            {visitedTabs.has('akuntansi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'akuntansi'}
                className={cn('w-full min-w-0', activeTab === 'akuntansi' ? 'block' : 'hidden')}
              >
                <KoperasiAkuntansiTab />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

KoperasiDashboard.displayName = 'KoperasiDashboard';
