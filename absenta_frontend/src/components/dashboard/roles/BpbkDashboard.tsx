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
  Network,
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
import { EwsBimbinganModal, type EwsCriticalStudent } from './bpbk/EwsBimbinganModal';
import { BpbkCasesTab } from './bpbk/tabs/BpbkCasesTab';
import { BpbkKonselingTab } from './bpbk/tabs/BpbkKonselingTab';
import { BpbkPemanggilanTab } from './bpbk/tabs/BpbkPemanggilanTab';
import { BpbkHomeVisitTab } from './bpbk/tabs/BpbkHomeVisitTab';
import { BpbkRujukanTab } from './bpbk/tabs/BpbkRujukanTab';
import { BpbkAsesmenTab } from './bpbk/tabs/BpbkAsesmenTab';
import { BpbkRekapTab } from './bpbk/tabs/BpbkRekapTab';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
import {
  BPBK_CATEGORIES,
  getBpbkNavTabs,
} from './bpbk/bpbkNavigation.config';

const Modal = lazy(() => import('@/components/ui/Modal').then((m) => ({ default: m.Modal })));
const SiswaDetailView = lazy(() =>
  import('@/components/academic/siswa/SiswaDetailView').then((m) => ({ default: m.SiswaDetailView }))
);
const PelanggaranPage = lazy(() => import('@/pages/kesiswaan/PelanggaranPage'));
const PrestasiView = lazy(() =>
  import('@/components/kesiswaan/prestasi').then((m) => ({ default: m.PrestasiView }))
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
    'struktur_organisasi',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('bpbk');

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
            const parentTab = prev.get('tab') || 'bpbk';
            next.set('tab', parentTab);
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

  // Navigation Items Desktop Sidebar (SSOT Kanonikal - 100% DRY)
  const navTabs = useMemo(
    () =>
      getBpbkNavTabs({
        criticalStudentsCount: stats?.criticalStudents?.length,
        activeCounselingCount: stats?.activeCounselingCount,
        pendingCallsCount: stats?.pendingCallsCount,
      }),
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

  const [selectedEwsStudent, setSelectedEwsStudent] = useState<EwsCriticalStudent | null>(null);

  const handleOpenBimbingModal = useCallback((student: EwsCriticalStudent) => {
    setSelectedEwsStudent(student);
  }, []);

  const handleCloseBimbingModal = useCallback(() => {
    setSelectedEwsStudent(null);
  }, []);

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

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'cases': return 'Kasus Siswa';
      case 'konseling': return 'Layanan Konseling';
      case 'pemanggilan': return 'Pemanggilan Ortu';
      case 'homevisit':
      case 'home_visit': return 'Kunjungan Rumah';
      case 'rujukan': return 'Alih Tangan (Rujukan)';
      case 'asesmen': return 'Asesmen & Sosiometri';
      case 'pelanggaran': return 'Catatan Pelanggaran';
      case 'prestasi': return 'Catatan Prestasi';
      case 'rekap': return 'Cetak Dokumen';
      case 'struktur_organisasi': return 'Struktur Organisasi';
      default: return 'Beranda';
    }
  }, [activeTab]);

  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Bimbingan Konseling (BP/BK)"
      description="Layanan Bimbingan Konseling terpadu sekolah untuk mengelola data kasus siswa, konseling klinis, pemanggilan orang tua, home visit, asesmen/angket, dan Early Warning System (EWS)."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
        <UniversalEcosystemTopbar
          ecosystem="bpbk"
          title={currentSubtabTitle}
          icon={HeartHandshake}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <button
              type="button"
              onClick={() => setShowMobileFilter((prev) => !prev)}
              className={cn(
                'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                showMobileFilter
                  ? 'bg-white text-purple-800 shadow-xs'
                  : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs'
              )}
              title="Atur Periode Akademik"
              aria-label="Atur Periode Akademik"
            >
              <SlidersHorizontal size={14} />
            </button>
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
          title="Bimbingan Konseling"
          subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • Layanan Siswa`}
          roleBadge="BP / BK"
          scope="bpbk"
          roleIcon={HeartHandshake}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabSelect(tabId as BpbkTabId)}
          categories={BPBK_CATEGORIES}
        />

        {/* 2. Desktop 2-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll with elegant sleek scrollbar) */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12">
            {/* BPBK Identity Mini Card (Ecosystem Banner Accent) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-800 text-white shadow-xs space-y-2.5 border border-purple-500/40 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" aria-hidden="true" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-100/90 block leading-tight drop-shadow-2xs">
                    Layanan Siswa
                  </span>
                  <h2 className="text-sm font-black text-white tracking-wider truncate uppercase drop-shadow-2xs">
                    BP / BK
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 relative z-10">
                <span className="font-medium text-purple-100/80">Periode Aktif</span>
                <span className="font-bold text-white text-[10px] bg-white/20 backdrop-blur-xs border border-white/25 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                </span>
              </div>
            </div>

            {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="sidebar"
            />

            {/* Desktop Vertical Nav Menu (Terkelompok Kategori SSOT ala Kaprog & Kurikulum) */}
            <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              {BPBK_CATEGORIES.map((cat, idx) => {
                const catTabs = navTabs.filter((t) => t.category === cat.id);
                if (catTabs.length === 0) return null;
                const CatIcon = cat.icon;

                return (
                  <React.Fragment key={cat.id}>
                    {idx > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-800/80 mx-1.5" />
                    )}

                    <div className="space-y-0.5">
                      {/* Header Kategori */}
                      <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                          <CatIcon className="w-3 h-3" />
                          {cat.label}
                        </span>
                      </div>

                      {/* Tombol Sub-tab dalam Kategori */}
                      {catTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabSelect(tab.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                              isActive
                                ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </div>

                            {tab.badge !== undefined && (
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors shrink-0',
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : tab.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </React.Fragment>
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
                    onBimbingSiswa={handleOpenBimbingModal}
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

            {/* TAB 7B: PELANGGARAN (MONITORING & KOORDINASI) */}
            {visitedTabs.has('pelanggaran') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pelanggaran'}
                className={cn('w-full min-w-0', activeTab === 'pelanggaran' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<BpbkDashboardSkeleton />}>
                  <PelanggaranPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 7C: PRESTASI (MONITORING & KOORDINASI) */}
            {visitedTabs.has('prestasi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'prestasi'}
                className={cn('w-full min-w-0', activeTab === 'prestasi' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<BpbkDashboardSkeleton />}>
                  <PrestasiView hideLayout={true} />
                </Suspense>
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

            {/* TAB 9: STRUKTUR ORGANISASI */}
            {visitedTabs.has('struktur_organisasi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'struktur_organisasi'}
                className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block' : 'hidden')}
              >
                <DivisiStrukturOrganisasiView divisiKey="BK" divisiNama="Bimbingan Konseling" />
              </div>
            )}
          </main>
        </div>

        {/* Modal Tindak Lanjut Bimbingan EWS */}
        <EwsBimbinganModal
          isOpen={Boolean(selectedEwsStudent)}
          student={selectedEwsStudent}
          onClose={handleCloseBimbingModal}
          onOpenFullProfile={(siswaId) => {
            handleCloseBimbingModal();
            navigate(`/bpbk/siswa/${siswaId}`);
          }}
        />

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
                <SiswaDetailView
                  siswaId={selectedSiswaId}
                  onBack={handleCloseDetail}
                  canEdit={false}
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
