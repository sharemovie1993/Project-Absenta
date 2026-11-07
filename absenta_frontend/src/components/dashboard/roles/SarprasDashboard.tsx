import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  Wrench,
  Package,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Tv,
  Map,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { requestWithFallback } from '@/api/apiUtils';
import type { StandardApiResponse } from '@/api/apiUtils';
import { sarprasApi } from '@/api/sarpras.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { SarprasDashboardSkeleton } from './sarpras/SarprasDashboardSkeleton';
import type { SarprasTabId, SarprasNavTabItem, SarprasStats } from './sarpras/types';
import type { LoanRecord, RepairRecord } from '@/components/sarpras/dashboard/SarprasDashboardComponents';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { SarprasBerandaTab } from './sarpras/tabs/SarprasBerandaTab';
import { SarprasInventarisTab } from './sarpras/tabs/SarprasInventarisTab';
import { SarprasPeminjamanTab } from './sarpras/tabs/SarprasPeminjamanTab';
import { SarprasPerbaikanTab } from './sarpras/tabs/SarprasPerbaikanTab';
import { SarprasKatalogTab } from './sarpras/tabs/SarprasKatalogTab';
import { SarprasRekapTab } from './sarpras/tabs/SarprasRekapTab';
import { SarprasDenahTab } from './sarpras/tabs/SarprasDenahTab';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';

export interface SarprasDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const SarprasDashboard: React.FC<SarprasDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as SarprasTabId | null;

  const validTabs: SarprasTabId[] = [
    'ringkasan',
    'inventaris',
    'peminjaman',
    'perbaikan',
    'katalog',
    'rekap',
    'denah',
    'struktur_organisasi',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('sarpras');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<SarprasTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<SarprasTabId>>(() => new Set([activeTab]));

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
    (tabId: SarprasTabId) => {
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
  const { data: stats = null, isLoading: loadingStats } = useQuery<SarprasStats | null>({
    queryKey: ['sarpras-stats'],
    queryFn: async () => {
      const statsRes = await requestWithFallback<StandardApiResponse<SarprasStats>>('get', '/sarpras/assets/stats');
      return statsRes.success && statsRes.data ? statsRes.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: loans = [], isLoading: loadingLoans } = useQuery<LoanRecord[]>({
    queryKey: ['sarpras-loans-recent'],
    queryFn: async () => {
      const loansRes = await sarprasApi.getLoans({ limit: 50 });
      if (loansRes.success && loansRes.data) {
        return Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.list || []);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: repairs = [], isLoading: loadingRepairs } = useQuery<RepairRecord[]>({
    queryKey: ['sarpras-repairs-active'],
    queryFn: async () => {
      const repairsRes = await sarprasApi.getRepairs({ limit: 50, status: 'PROSES' });
      if (repairsRes.success && repairsRes.data) {
        return Array.isArray(repairsRes.data) ? repairsRes.data : (repairsRes.data?.list || []);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Navigation Items Desktop Sidebar
  const navTabs: SarprasNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        shortLabel: 'Ringkasan',
        icon: LayoutDashboard,
      },
      {
        id: 'inventaris',
        label: 'Inventaris',
        shortLabel: 'Inventaris',
        icon: Layers,
        badge: (stats?.total ?? 0) > 0 ? `${stats?.total}` : undefined,
        badgeColor: 'bg-teal-500 text-white',
      },
      {
        id: 'peminjaman',
        label: 'Peminjaman',
        shortLabel: 'Peminjaman',
        icon: ArrowLeftRight,
        badge: (stats?.borrowed ?? 0) > 0 ? `${stats?.borrowed}` : undefined,
        badgeColor: 'bg-indigo-500 text-white',
      },
      {
        id: 'perbaikan',
        label: 'Perbaikan',
        shortLabel: 'Perbaikan',
        icon: Wrench,
        badge: (stats?.repair ?? 0) > 0 ? `${stats?.repair}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'katalog',
        label: 'Katalog',
        shortLabel: 'Katalog',
        icon: Package,
      },
      {
        id: 'rekap',
        label: 'Cetak',
        shortLabel: 'Cetak',
        icon: Printer,
      },
      {
        id: 'denah',
        label: 'Denah',
        shortLabel: 'Denah',
        icon: Map,
      },
      {
        id: 'struktur_organisasi',
        label: 'Organisasi',
        shortLabel: 'Organisasi',
        icon: Network,
      },
    ],
    [stats?.total, stats?.borrowed, stats?.repair]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['sarpras-loans-recent'] }),
        queryClient.invalidateQueries({ queryKey: ['sarpras-repairs-active'] }),
      ]);
      toast.success('Data sarpras berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'inventaris': return 'Aset & Inventaris';
      case 'peminjaman': return 'Peminjaman Alat';
      case 'perbaikan': return 'Servis & Perbaikan';
      case 'katalog': return 'Katalog Sarpras';
      case 'rekap': return 'Cetak Dokumen';
      case 'denah': return 'Denah Gedung';
      case 'struktur_organisasi': return 'Struktur Organisasi';
      default: return 'Beranda';
    }
  }, [activeTab]);

  if (loadingStats && !stats) {
    return <SarprasDashboardSkeleton />;
  }

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Dashboard Sarana & Prasarana"
      description="Pantau seluruh aset sekolah, status peminjaman, dan jadwal pemeliharaan barang dalam satu dashboard terintegrasi."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
        <UniversalEcosystemTopbar
          ecosystem="sarpras"
          title={currentSubtabTitle}
          icon={Layers}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/sarpras/dashboard')}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shrink-0"
                title="Buka Mode TV Monitor Sarpras"
              >
                <Tv size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                  showMobileFilter
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs'
                )}
                title="Atur Periode Akademik"
                aria-label="Atur Periode Akademik"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          }
        />

        {/* Standalone Collapsible Mobile Filter Toolbar (Terpisah secara mandiri) */}
        {showMobileFilter && (
          <div className="lg:hidden p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="compact"
              className="w-full"
            />
          </div>
        )}

        {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
        <UniversalMobileSubtabSidebar
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            title="Dashboard Sarpras"
            subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
            roleBadge="SARPRAS"
            roleIcon={Package}
            tabs={navTabs}
            activeTab={activeTab}
            onSelectTab={(tabId) => handleTabSelect(tabId as SarprasTabId)}
          />

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky) */}
          <aside className="hidden lg:block sticky top-20 space-y-3">
            {/* Identitas Sarpras Ringkas */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block leading-tight">
                    Fasilitas Sekolah
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    Sarpras
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
                        ? 'bg-orange-500 text-white shadow-xs'
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
            {/* TAB 1: BERANDA RINGKASAN SARPRAS */}
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                <SarprasBerandaTab
                  stats={stats}
                  loans={loans}
                  repairs={repairs}
                  loading={loadingStats}
                  onTabSelect={handleTabSelect}
                />
              </div>
            )}

            {/* TAB 2: INVENTARIS ASET */}
            {visitedTabs.has('inventaris') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'inventaris'}
                className={cn('w-full min-w-0', activeTab === 'inventaris' ? 'block' : 'hidden')}
              >
                <SarprasInventarisTab />
              </div>
            )}

            {/* TAB 3: PEMINJAMAN BARANG */}
            {visitedTabs.has('peminjaman') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'peminjaman'}
                className={cn('w-full min-w-0', activeTab === 'peminjaman' ? 'block' : 'hidden')}
              >
                <SarprasPeminjamanTab />
              </div>
            )}

            {/* TAB 4: PERBAIKAN & KERUSAKAN */}
            {visitedTabs.has('perbaikan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'perbaikan'}
                className={cn('w-full min-w-0', activeTab === 'perbaikan' ? 'block' : 'hidden')}
              >
                <SarprasPerbaikanTab />
              </div>
            )}

            {/* TAB 5: KATALOG STANDAR */}
            {visitedTabs.has('katalog') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'katalog'}
                className={cn('w-full min-w-0', activeTab === 'katalog' ? 'block' : 'hidden')}
              >
                <SarprasKatalogTab />
              </div>
            )}

            {/* TAB 6: CETAK BERKAS / DIR */}
            {visitedTabs.has('rekap') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rekap'}
                className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
              >
                <SarprasRekapTab />
              </div>
            )}

            {/* TAB 7: MASTER DENAH SPASIAL KAMPUS */}
            {visitedTabs.has('denah') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'denah'}
                className={cn('w-full min-w-0', activeTab === 'denah' ? 'block' : 'hidden')}
              >
                <SarprasDenahTab />
              </div>
            )}

            {/* TAB: STRUKTUR ORGANISASI SARPRAS */}
            {visitedTabs.has('struktur_organisasi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'struktur_organisasi'}
                className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block' : 'hidden')}
              >
                <DivisiStrukturOrganisasiView
                  divisionCode="SARPRAS"
                  divisionTitle="Struktur Organisasi Sarpras"
                  hideLayout={true}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};
