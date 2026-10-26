import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileText,
  HeartHandshake,
  MailOpen,
  Home,
  Share2,
  ClipboardList,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { bpbkApi, bpbkQueryKeys } from '@/api/bpbk.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Loader } from '@/components/ui/Loader';
import { BpbkDashboardSkeleton } from './bpbk/BpbkDashboardSkeleton';
import type { BpbkTabId, BpbkNavTabItem } from './bpbk/types';
import toast from 'react-hot-toast';

// Modular Subtabs
import { BpbkBerandaTab } from './bpbk/tabs/BpbkBerandaTab';
import { BpbkCasesTab } from './bpbk/tabs/BpbkCasesTab';
import { BpbkKonselingTab } from './bpbk/tabs/BpbkKonselingTab';
import { BpbkPemanggilanTab } from './bpbk/tabs/BpbkPemanggilanTab';
import { BpbkHomeVisitTab } from './bpbk/tabs/BpbkHomeVisitTab';
import { BpbkRujukanTab } from './bpbk/tabs/BpbkRujukanTab';
import { BpbkAsesmenTab } from './bpbk/tabs/BpbkAsesmenTab';
import { BpbkRekapTab } from './bpbk/tabs/BpbkRekapTab';

const Modal = lazy(() => import('@/components/ui/Modal').then((m) => ({ default: m.Modal })));
const SiswaForm = lazy(() =>
  import('@/components/academic/siswa/SiswaForm').then((m) => ({ default: m.SiswaForm }))
);

export interface BpbkDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const BpbkDashboard: React.FC<BpbkDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as BpbkTabId | null;

  const validTabs: BpbkTabId[] = [
    'ringkasan',
    'cases',
    'konseling',
    'pemanggilan',
    'homevisit',
    'rujukan',
    'asesmen',
    'rekap',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Student Detail Modal State
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<BpbkTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<BpbkTabId>>(() => new Set([activeTab]));

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
    (tabId: BpbkTabId) => {
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
    data: stats = null,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: bpbkQueryKeys.stats(),
    queryFn: async () => {
      const res = await bpbkApi.getDashboardStats();
      if (!res.success) throw new Error(res.message || 'Gagal memuat statistik BK');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Navigation Items Desktop Sidebar
  const navTabs: BpbkNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Beranda Konseling',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'cases',
        label: 'Kasus Siswa',
        shortLabel: 'Kasus',
        icon: FileText,
        badge: (stats?.criticalStudents?.length ?? 0) > 0 ? `${stats?.criticalStudents.length}` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'konseling',
        label: 'Layanan Konseling',
        shortLabel: 'Konseling',
        icon: HeartHandshake,
        badge: (stats?.activeCounselingCount ?? 0) > 0 ? `${stats?.activeCounselingCount}` : undefined,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        id: 'pemanggilan',
        label: 'Panggilan Ortu',
        shortLabel: 'Panggilan',
        icon: MailOpen,
        badge: (stats?.pendingCallsCount ?? 0) > 0 ? `${stats?.pendingCallsCount}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'homevisit',
        label: 'Home Visit',
        shortLabel: 'Home Visit',
        icon: Home,
      },
      {
        id: 'rujukan',
        label: 'Rujukan Kasus',
        shortLabel: 'Rujukan',
        icon: Share2,
      },
      {
        id: 'asesmen',
        label: 'Asesmen & Angket',
        shortLabel: 'Asesmen',
        icon: ClipboardList,
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen BK',
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
        queryClient.invalidateQueries({ queryKey: ['bpbk-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['bpbk-dashboard'] }),
      ]);
      toast.success('Data konseling berhasil disinkronkan');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenSiswaDetail = useCallback((id: string) => {
    setSelectedSiswaId(id);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  const handleDetailSuccess = useCallback(() => {
    setIsDetailOpen(false);
    queryClient.invalidateQueries({ queryKey: ['bpbk-stats'] });
  }, [queryClient]);

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Bimbingan Konseling (BP/BK)"
      description="Layanan Bimbingan Konseling terpadu sekolah untuk mengelola data kasus siswa, konseling klinis, pemanggilan orang tua, home visit, asesmen/angket, dan Early Warning System (EWS)."
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
                  title="Kembali ke Beranda Konseling"
                  aria-label="Kembali ke Beranda"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Bimbingan Konseling
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                  {activeTab === 'ringkasan' ? 'Pusat Kendali Bimbingan Konseling' : activeTabMeta.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
            {/* BPBK Identity Mini Card */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-tight">
                    Layanan Siswa
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    BP / BK
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
            {/* TAB 1: BERANDA RINGKASAN & EWS */}
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                {loadingStats && !stats ? (
                  <BpbkDashboardSkeleton />
                ) : (
                  <BpbkBerandaTab
                    stats={stats}
                    loading={loadingStats}
                    onTabSelect={handleTabSelect}
                    onSelectSiswaDetail={handleOpenSiswaDetail}
                    onViewAllSiswa={() => navigate('/bpbk/siswa')}
                  />
                )}
              </div>
            )}

            {/* TAB 2: KASUS SISWA */}
            {visitedTabs.has('cases') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'cases'}
                className={cn('w-full min-w-0', activeTab === 'cases' ? 'block' : 'hidden')}
              >
                <BpbkCasesTab />
              </div>
            )}

            {/* TAB 3: LAYANAN KONSELING */}
            {visitedTabs.has('konseling') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'konseling'}
                className={cn('w-full min-w-0', activeTab === 'konseling' ? 'block' : 'hidden')}
              >
                <BpbkKonselingTab />
              </div>
            )}

            {/* TAB 4: PEMANGGILAN ORANG TUA */}
            {visitedTabs.has('pemanggilan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pemanggilan'}
                className={cn('w-full min-w-0', activeTab === 'pemanggilan' ? 'block' : 'hidden')}
              >
                <BpbkPemanggilanTab />
              </div>
            )}

            {/* TAB 5: HOME VISIT */}
            {visitedTabs.has('homevisit') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'homevisit'}
                className={cn('w-full min-w-0', activeTab === 'homevisit' ? 'block' : 'hidden')}
              >
                <BpbkHomeVisitTab />
              </div>
            )}

            {/* TAB 6: RUJUKAN KASUS */}
            {visitedTabs.has('rujukan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rujukan'}
                className={cn('w-full min-w-0', activeTab === 'rujukan' ? 'block' : 'hidden')}
              >
                <BpbkRujukanTab />
              </div>
            )}

            {/* TAB 7: ASESMEN & ANGKET */}
            {visitedTabs.has('asesmen') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'asesmen'}
                className={cn('w-full min-w-0', activeTab === 'asesmen' ? 'block' : 'hidden')}
              >
                <BpbkAsesmenTab />
              </div>
            )}

            {/* TAB 8: CETAK DOKUMEN BK */}
            {visitedTabs.has('rekap') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rekap'}
                className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
              >
                <BpbkRekapTab />
              </div>
            )}
          </main>
        </div>

        {/* Modal Siswa Detail */}
        <Suspense fallback={null}>
          <Modal
            isOpen={isDetailOpen}
            onClose={handleCloseDetail}
            title="Profil Lengkap & Linimasa Siswa"
            size="4xl"
          >
            <Suspense
              fallback={
                <div className="p-12 flex justify-center">
                  <Loader />
                </div>
              }
            >
              {selectedSiswaId && (
                <SiswaForm
                  siswaId={selectedSiswaId}
                  mode="view"
                  onSuccess={handleDetailSuccess}
                  onCancel={handleCloseDetail}
                />
              )}
            </Suspense>
          </Modal>
        </Suspense>
      </div>
    </PremiumFeatureGate>
  );
};

export default BpbkDashboard;
