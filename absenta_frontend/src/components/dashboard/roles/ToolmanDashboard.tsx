import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  Layers,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { getToolmanStats } from '@/api/dashboard.api';
import { sarprasApi } from '@/api/sarpras.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { ToolmanDashboardSkeleton } from './toolman/ToolmanDashboardSkeleton';
import type { ToolmanTabId, ToolmanNavTabItem, ToolmanStats } from './toolman/types';
import toast from 'react-hot-toast';

// Subtabs
import { ToolmanBerandaTab } from './toolman/tabs/ToolmanBerandaTab';
import { ToolmanPinjamTab } from './toolman/tabs/ToolmanPinjamTab';
import { ToolmanServisTab } from './toolman/tabs/ToolmanServisTab';
import { ToolmanAlatTab } from './toolman/tabs/ToolmanAlatTab';
import { ToolmanRekapTab } from './toolman/tabs/ToolmanRekapTab';

const QuickScanLoanModal = lazy(() =>
  import('@/components/sarpras/QuickScanLoanModal').then((m) => ({ default: m.QuickScanLoanModal }))
);

export interface ToolmanDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const ToolmanDashboard: React.FC<ToolmanDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as ToolmanTabId | null;

  const validTabs: ToolmanTabId[] = ['ringkasan', 'pinjam', 'servis', 'alat', 'rekap'];

  // Mobile Filter Collapsible State & Quick Scan Modal
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<ToolmanTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<ToolmanTabId>>(() => new Set([activeTab]));

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
    (tabId: ToolmanTabId) => {
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

  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  // Data Queries
  const {
    data: toolmanStatsData,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery<ToolmanStats | null>({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: async () => {
      try {
        const [dashRes, loansRes, repairsRes, inventoryRes] = await Promise.allSettled([
          getToolmanStats(),
          sarprasApi.getLoans({ status: 'ACTIVE', limit: 5 }),
          sarprasApi.getRepairs({ status: 'PROSES', limit: 5 }),
          sarprasApi.getInventory({ limit: 1 }),
        ]);

        const rawDash = dashRes.status === 'fulfilled' ? dashRes.value?.data || {} : {};
        const rawLoans = loansRes.status === 'fulfilled' ? loansRes.value?.data?.list || [] : [];
        const rawRepairs = repairsRes.status === 'fulfilled' ? repairsRes.value?.data?.list || [] : [];
        const rawTotalTools = inventoryRes.status === 'fulfilled' ? inventoryRes.value?.data?.pagination?.total || 0 : 0;

        return {
          tools_borrowed: rawDash.tools_borrowed ?? rawLoans.length,
          tools_available: rawDash.tools_available ?? Math.max(0, rawTotalTools - rawLoans.length),
          damaged_reports: rawDash.damaged_reports ?? rawRepairs.length,
          total_tools: rawDash.total_tools ?? rawTotalTools,
          active_loans: rawLoans.map((l: any) => ({
            id: l.id,
            nama_peminjam: l.Peminjam?.full_name || 'Siswa/Guru',
            nama_alat: l.Asset?.nama || 'Alat Praktik',
            kode_alat: l.Asset?.kode,
            tanggal_pinjam: l.tanggal_pinjam,
            status: l.status,
          })),
          pending_maintenance: rawRepairs.map((r: any) => ({
            id: r.id,
            nama_alat: r.Asset?.nama || 'Perkakas Lab',
            teknisi: r.teknisi,
            status: r.status,
            tanggal_mulai: r.tanggal_mulai,
          })),
        };
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = toolmanStatsData;

  // Navigation Items Desktop Sidebar
  const navTabs: ToolmanNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Beranda Toolman',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'pinjam',
        label: 'Peminjaman Alat',
        shortLabel: 'Peminjaman',
        icon: Wrench,
        badge: (stats?.tools_borrowed ?? 0) > 0 ? `${stats?.tools_borrowed}` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'servis',
        label: 'Servis & Perbaikan',
        shortLabel: 'Servis & Kerusakan',
        icon: AlertTriangle,
        badge: (stats?.damaged_reports ?? 0) > 0 ? `${stats?.damaged_reports}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'alat',
        label: 'Inventaris Perkakas',
        shortLabel: 'Inventaris Alat',
        icon: Layers,
        badge: (stats?.total_tools ?? 0) > 0 ? `${stats?.total_tools}` : undefined,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen Alat',
        shortLabel: 'Cetak Dokumen',
        icon: Printer,
      },
    ],
    [stats]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'toolman'] }),
        queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] }),
        queryClient.invalidateQueries({ queryKey: ['sarpras-repairs'] }),
      ]);
      toast.success('Data peralatan berhasil disinkronkan');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Manajemen Toolman & Lab"
      description="Pusat sirkulasi peminjaman perkakas, pemeliharaan peralatan bengkel/lab, dan kartu kontrol kesiapan alat praktik kejuruan."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Shopee-Grade Clean Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {activeTab !== 'ringkasan' && (
                <button
                  type="button"
                  onClick={() => handleTabSelect('ringkasan')}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
                  title="Kembali ke Beranda Toolman"
                  aria-label="Kembali ke Beranda"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    Teknisi Bengkel / Lab
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                  {activeTab === 'ringkasan' ? 'Pusat Kendali Toolman & Alat Praktik' : activeTabMeta.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Scan Barcode Button */}
              <button
                type="button"
                onClick={() => setIsQuickScanOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-all cursor-pointer"
                title="Scan Barcode Peminjaman Cepat"
              >
                <ScanLine size={14} />
                <span className="hidden sm:inline">Scan Cepat</span>
              </button>

              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  showMobileFilter
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
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

          {/* Collapsible Mobile Filter Toolbar */}
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

        {/* 2. Desktop 2-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky) */}
          <aside className="hidden lg:block sticky top-20 space-y-3">
            {/* Identity Card */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block leading-tight">
                    Teknisi Lab
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    Toolman
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

            {/* Desktop Vertical Nav Menu */}
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
                        ? 'bg-amber-600 text-white shadow-xs'
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
            {/* TAB 1: BERANDA RINGKASAN TOOLMAN */}
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                {loadingStats && !stats ? (
                  <ToolmanDashboardSkeleton />
                ) : (
                  <ToolmanBerandaTab
                    stats={stats}
                    loading={loadingStats}
                    onTabSelect={handleTabSelect}
                    onOpenQuickScan={() => setIsQuickScanOpen(true)}
                  />
                )}
              </div>
            )}

            {/* TAB 2: PEMINJAMAN ALAT */}
            {visitedTabs.has('pinjam') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pinjam'}
                className={cn('w-full min-w-0', activeTab === 'pinjam' ? 'block' : 'hidden')}
              >
                <ToolmanPinjamTab />
              </div>
            )}

            {/* TAB 3: SERVIS & PERBAIKAN */}
            {visitedTabs.has('servis') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'servis'}
                className={cn('w-full min-w-0', activeTab === 'servis' ? 'block' : 'hidden')}
              >
                <ToolmanServisTab />
              </div>
            )}

            {/* TAB 4: INVENTARIS PERKAKAS */}
            {visitedTabs.has('alat') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'alat'}
                className={cn('w-full min-w-0', activeTab === 'alat' ? 'block' : 'hidden')}
              >
                <ToolmanAlatTab />
              </div>
            )}

            {/* TAB 5: CETAK DOKUMEN ALAT */}
            {visitedTabs.has('rekap') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rekap'}
                className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
              >
                <ToolmanRekapTab />
              </div>
            )}
          </main>
        </div>

        {/* Quick Scan Modal */}
        <Suspense fallback={null}>
          <QuickScanLoanModal
            isOpen={isQuickScanOpen}
            onClose={() => setIsQuickScanOpen(false)}
            onSuccess={() => {
              setIsQuickScanOpen(false);
              queryClient.invalidateQueries({ queryKey: ['dashboard', 'toolman'] });
            }}
          />
        </Suspense>
      </div>
    </PremiumFeatureGate>
  );
};

export default ToolmanDashboard;
