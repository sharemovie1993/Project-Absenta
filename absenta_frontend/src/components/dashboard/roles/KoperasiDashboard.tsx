import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  PiggyBank,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Tv,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import api from '@/lib/axiosInstance';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { useCapabilities } from '@/hooks/useCapabilities';
import { KoperasiDashboardSkeleton } from './koperasi/KoperasiDashboardSkeleton';
import type { KoperasiTabId } from './koperasi/types';
import {
  getKoperasiNavTabs,
  getVisibleKoperasiCategories,
} from './koperasi/koperasiNavigation.config';
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
import { KoperasiAsetTab } from './koperasi/tabs/KoperasiAsetTab';
import { KoperasiRatTab } from './koperasi/tabs/KoperasiRatTab';
import { KoperasiTiketTab } from './koperasi/tabs/KoperasiTiketTab';
import {
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
} from './common/UniversalMobileSubtabSidebar';

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

  const {
    can,
    isAdmin,
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiStore,
    isKoperasiAuditor,
  } = useCapabilities();

  const canCoopCap = useCallback(
    (capability: string) => isAdmin || can(capability),
    [isAdmin, can]
  );

  // Identitas Jabatan Koperasi Dinamis (1 Unified Capability-Driven Shell)
  const koperasiIdentity = useMemo(() => {
    const activeRoles: string[] = [];
    if (isKoperasiHead) activeRoles.push('Ketua Koperasi');
    if (isKoperasiFinance) activeRoles.push('Bendahara Koperasi');
    if (isKoperasiSecretary) activeRoles.push('Sekretaris Koperasi');
    if (isKoperasiStore) activeRoles.push('Manajer Toko');
    if (isKoperasiAuditor) activeRoles.push('Pengawas Koperasi');

    const isPureAuditor =
      isKoperasiAuditor &&
      !isAdmin &&
      !isKoperasiHead &&
      !isKoperasiFinance &&
      !isKoperasiSecretary &&
      !isKoperasiStore;

    if (isKoperasiHead) {
      return {
        unitTitle: 'Dashboard Ketua Koperasi',
        subtitle: 'Pengawasan Eksekutif, Approval Pinjaman & Keanggotaan, SHU, dan Tata Kelola',
        sidebarTitle: 'Ketua',
        sidebarCode: 'KETUA KOP',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiFinance && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Bendahara Koperasi',
        subtitle: 'Simpan Pinjam, Pencairan Kredit, Pembukuan Akuntansi, dan Kalkulasi SHU',
        sidebarTitle: 'Bendahara',
        sidebarCode: 'BENDAHARA',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiSecretary && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Sekretaris Koperasi',
        subtitle: 'Registrasi Anggota, Inventaris Aset, Sidang RAT, Pengumuman & Tiket Aduan',
        sidebarTitle: 'Sekretaris',
        sidebarCode: 'SEKRETARIS',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiStore && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Toko & Kasir Koperasi',
        subtitle: 'Operasional Kasir POS, Katalog Produk, Stok Minimarket, Supplier & Voucher',
        sidebarTitle: 'Manajer Toko',
        sidebarCode: 'TOKO KOP',
        isReadOnlyAuditor: false,
      };
    }
    if (isPureAuditor) {
      return {
        unitTitle: 'Dashboard Pengawas Koperasi',
        subtitle: 'Audit Independen Simpan Pinjam, Laporan Keuangan, Aset & SHU (Mode Baca Saja)',
        sidebarTitle: 'Pengawas',
        sidebarCode: 'PENGAWAS',
        isReadOnlyAuditor: true,
      };
    }

    return {
      unitTitle: 'Dashboard Koperasi',
      subtitle:
        activeRoles.length > 0
          ? activeRoles.join(' • ')
          : 'Simpan Pinjam, Kasir Minimarket, Sisa Hasil Usaha & Pembukuan Akuntansi',
      sidebarTitle: 'Koperasi',
      sidebarCode: 'KOPERASI',
      isReadOnlyAuditor: false,
    };
  }, [
    isAdmin,
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiStore,
    isKoperasiAuditor,
  ]);

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('koperasi');

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  const canFetchInventoryStock =
    canCoopCap('cooperative.store.products.view.list') ||
    canCoopCap('cooperative.store.view.catalog') ||
    canCoopCap('cooperative.store.inventory.manage');

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
    enabled: canFetchInventoryStock,
    staleTime: 5 * 60 * 1000,
  });

  // Navigation Items Desktop Sidebar & Mobile Sheet (Filtered by Canonical Capabilities)
  const navBadges = useMemo(
    () => ({
      dueInstallments: stats?.dueInstallments ?? 0,
      pendingMembers: stats?.pendingMembers?.count ?? 0,
      criticalStock: criticalStock.length,
      openTickets: stats?.openTickets ?? 0,
    }),
    [stats?.dueInstallments, stats?.pendingMembers?.count, criticalStock.length, stats?.openTickets]
  );

  const navTabs = useMemo(
    () => getKoperasiNavTabs(navBadges, canCoopCap),
    [navBadges, canCoopCap]
  );

  const visibleCategories = useMemo(
    () => getVisibleKoperasiCategories(navTabs),
    [navTabs]
  );

  const allowedTabIds = useMemo(() => new Set(navTabs?.map((t) => t.id)), [navTabs]);

  // Active Tab State (Strictly validated against permitted capabilities)
  const [activeTab, setActiveTab] = useState<KoperasiTabId>(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      return subtabParam;
    }
    return navTabs[0]?.id || 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<KoperasiTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (navTabs.length === 0) return;

    const firstAllowed = navTabs[0]?.id || 'ringkasan';
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam || !allowedTabIds.has(subtabParam)) {
      setActiveTab(firstAllowed);
      setVisitedTabs((prev) => (prev.has(firstAllowed) ? prev : new Set(prev).add(firstAllowed)));
      if (subtabParam && !allowedTabIds.has(subtabParam)) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (firstAllowed === 'ringkasan') {
              next.delete('subtab');
            } else {
              next.set('subtab', firstAllowed);
            }
            return next;
          },
          { replace: true }
        );
      }
    }
  }, [subtabParam, allowedTabIds, navTabs, setSearchParams]);

  const handleTabSelect = useCallback(
    (tabId: KoperasiTabId) => {
      if (!allowedTabIds.has(tabId)) return;
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
    [allowedTabIds, searchParams, setSearchParams]
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
                    {koperasiIdentity.unitTitle}
                  </h1>
                  {koperasiIdentity.isReadOnlyAuditor && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                      <ShieldCheck size={11} />
                      <span>Mode Pengawas (Read-Only)</span>
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                    &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                  {koperasiIdentity.subtitle}
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

        {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
        <UniversalMobileSubtabSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          title={koperasiIdentity.unitTitle}
          subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
          roleBadge={koperasiIdentity.sidebarCode}
          scope="koperasi"
          roleIcon={Receipt}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabSelect(tabId as KoperasiTabId)}
          categories={visibleCategories}
        />

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll without scrollbar UI) */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain no-scrollbar space-y-3 pb-6">
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
                    {koperasiIdentity.sidebarTitle}
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">Jabatan</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {koperasiIdentity.sidebarCode}
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
              {navTabs?.map((tab) => {
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
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0',
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

          {/* Right Column: Dynamic Subtab Viewports (Keep-Alive Cache, Strictly Capability-Gated) */}
          <main className="min-w-0 flex-1 space-y-4">
            {/* TAB 1: BERANDA RINGKASAN KOPERASI */}
            {allowedTabIds.has('ringkasan') && visitedTabs.has('ringkasan') && (
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
                  canAccess={canCoopCap}
                />
              </div>
            )}

            {/* TAB 2: KASIR POINT OF SALE (POS) */}
            {allowedTabIds.has('pos') && visitedTabs.has('pos') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pos'}
                className={cn('w-full min-w-0', activeTab === 'pos' ? 'block' : 'hidden')}
              >
                <KoperasiPosTab />
              </div>
            )}

            {/* TAB 3: SIMPANAN ANGGOTA */}
            {allowedTabIds.has('simpanan') && visitedTabs.has('simpanan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'simpanan'}
                className={cn('w-full min-w-0', activeTab === 'simpanan' ? 'block' : 'hidden')}
              >
                <KoperasiSimpananTab />
              </div>
            )}

            {/* TAB 4: PINJAMAN & KREDIT */}
            {allowedTabIds.has('pinjaman') && visitedTabs.has('pinjaman') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pinjaman'}
                className={cn('w-full min-w-0', activeTab === 'pinjaman' ? 'block' : 'hidden')}
              >
                <KoperasiPinjamanTab />
              </div>
            )}

            {/* TAB 5: BUKU ANGGOTA */}
            {allowedTabIds.has('anggota') && visitedTabs.has('anggota') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'anggota'}
                className={cn('w-full min-w-0', activeTab === 'anggota' ? 'block' : 'hidden')}
              >
                <KoperasiAnggotaTab />
              </div>
            )}

            {/* TAB 6: KATALOG & STOK */}
            {allowedTabIds.has('produk') && visitedTabs.has('produk') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'produk'}
                className={cn('w-full min-w-0', activeTab === 'produk' ? 'block' : 'hidden')}
              >
                <KoperasiProdukTab />
              </div>
            )}

            {/* TAB 7: SISA HASIL USAHA (SHU) */}
            {allowedTabIds.has('shu') && visitedTabs.has('shu') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'shu'}
                className={cn('w-full min-w-0', activeTab === 'shu' ? 'block' : 'hidden')}
              >
                <KoperasiShuTab />
              </div>
            )}

            {/* TAB 8: BUKU AKUNTANSI */}
            {allowedTabIds.has('akuntansi') && visitedTabs.has('akuntansi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'akuntansi'}
                className={cn('w-full min-w-0', activeTab === 'akuntansi' ? 'block' : 'hidden')}
              >
                <KoperasiAkuntansiTab />
              </div>
            )}

            {/* TAB 9: INVENTARIS ASET KOPERASI */}
            {allowedTabIds.has('aset') && visitedTabs.has('aset') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'aset'}
                className={cn('w-full min-w-0', activeTab === 'aset' ? 'block' : 'hidden')}
              >
                <KoperasiAsetTab />
              </div>
            )}

            {/* TAB 10: SIDANG RAT & E-VOTING */}
            {allowedTabIds.has('rat') && visitedTabs.has('rat') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rat'}
                className={cn('w-full min-w-0', activeTab === 'rat' ? 'block' : 'hidden')}
              >
                <KoperasiRatTab />
              </div>
            )}

            {/* TAB 11: TIKET & ADUAN KOPERASI */}
            {allowedTabIds.has('tiket') && visitedTabs.has('tiket') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'tiket'}
                className={cn('w-full min-w-0', activeTab === 'tiket' ? 'block' : 'hidden')}
              >
                <KoperasiTiketTab />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

KoperasiDashboard.displayName = 'KoperasiDashboard';
