import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShieldAlert,
  Trophy,
  HeartPulse,
  Award,
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Activity,
  Tv,
  Clock,
  Network,
} from 'lucide-react';
import { Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { kesiswaanApi, type Pelanggaran } from '@/api/kesiswaan.api';
import { KesiswaanDashboardSkeleton } from './kesiswaan/KesiswaanDashboardSkeleton';
import type { KesiswaanTabId, KesiswaanNavTabItem } from './kesiswaan/types';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
import {
  KESISWAAN_CATEGORIES,
  getKesiswaanNavTabs,
} from './kesiswaan/kesiswaanNavigation.config';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { KesiswaanBerandaTab } from './kesiswaan/tabs/KesiswaanBerandaTab';
import { KesiswaanPelanggaranTab } from './kesiswaan/tabs/KesiswaanPelanggaranTab';
import { KesiswaanPrestasiTab } from './kesiswaan/tabs/KesiswaanPrestasiTab';
import { KesiswaanDhuhaTab } from './kesiswaan/tabs/KesiswaanDhuhaTab';
import { KesiswaanKetarunaanTab } from './kesiswaan/tabs/KesiswaanKetarunaanTab';
import { KesiswaanTatibTab } from './kesiswaan/tabs/KesiswaanTatibTab';
import { KesiswaanRekapTab } from './kesiswaan/tabs/KesiswaanRekapTab';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
const TenantAttendanceForm = React.lazy(() => import('@/components/attendance/settings/TenantAttendanceForm'));

export interface KesiswaanDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KesiswaanDashboard: React.FC<KesiswaanDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KesiswaanTabId | null;

  const validTabs: KesiswaanTabId[] = [
    'ringkasan',
    'pelanggaran',
    'prestasi',
    'dhuha',
    'ketarunaan',
    'tatib',
    'rekap',
    'aturan_absensi',
    'struktur_organisasi',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('kesiswaan');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<KesiswaanTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat pindah tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<KesiswaanTabId>>(() => new Set([activeTab]));

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
    (tabId: KesiswaanTabId) => {
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
  const { data: violations, isLoading: isLoadingViolations } = useQuery({
    queryKey: ['kesiswaan-monitoring-violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['kesiswaan-leaderboard'],
    queryFn: () => kesiswaanApi.getPrestasiLeaderboard({ limit: 5 }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['kesiswaan-analytics'],
    queryFn: () => kesiswaanApi.getPelanggaranAnalytics({ year: new Date().getFullYear() }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate Stats
  const stats = useMemo(() => {
    if (!violations?.data?.list) return { today: 0, severe: 0, totalPoints: 0, needDiscipline: 0 };
    const list = violations.data.list;
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const today = list.filter((v: Pelanggaran) => {
      const dateRaw = v.created_at || v.tanggal;
      if (!dateRaw) return false;
      const dateObj = new Date(dateRaw);
      if (isNaN(dateObj.getTime())) return false;
      const vLocalStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      return vLocalStr === localTodayStr;
    }).length;

    const severe = list.filter((v: Pelanggaran) => v.poin >= 25).length;
    const needDiscipline = list.filter(
      (v: Pelanggaran) => v.status === 'BARU' || v.status === 'PERLU_PEMBINAAN' || v.status === 'PROSES'
    ).length;
    const totalPoints = list.reduce((acc: number, curr: Pelanggaran) => acc + curr.poin, 0);

    return { today, severe, totalPoints, needDiscipline };
  }, [violations]);

  // Navigation Items Desktop Sidebar (SSOT Kanonikal - 100% DRY)
  const navTabs = useMemo(
    () =>
      getKesiswaanNavTabs({
        todayViolations: stats.today,
        totalPrestasi: (leaderboard?.data as any[])?.length,
      }),
    [stats.today, leaderboard?.data]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] }),
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-analytics'] }),
      ]);
      toast.success('Data kesiswaan berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'pelanggaran': return 'Pelanggaran & Disiplin';
      case 'prestasi': return 'Prestasi Siswa';
      case 'dhuha': return 'Pembiasaan Dhuha';
      case 'ketarunaan': return 'Ketarunaan';
      case 'tatib': return 'Tata Tertib & Poin';
      case 'rekap': return 'Cetak Dokumen';
      case 'aturan_absensi': return 'Aturan Presensi';
      case 'struktur_organisasi': return 'Struktur Organisasi';
      default: return 'Beranda';
    }
  }, [activeTab]);

  if (isLoadingViolations && !violations) {
    return <KesiswaanDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
      <UniversalEcosystemTopbar
        ecosystem="kesiswaan"
        title={currentSubtabTitle}
        icon={ShieldAlert}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/kesiswaan/monitoring')}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shrink-0"
              title="Buka Mode TV Monitor Kesiswaan"
            >
              <Tv size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowMobileFilter((prev) => !prev)}
              className={cn(
                'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                showMobileFilter
                  ? 'bg-white text-rose-800 shadow-xs'
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
        title="Dashboard Kesiswaan"
        subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
        roleBadge="KESISWAAN"
        scope="kesiswaan"
        roleIcon={ShieldAlert}
        tabs={navTabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleTabSelect(tabId as KesiswaanTabId)}
        categories={KESISWAAN_CATEGORIES}
      />

      {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll without scrollbar UI) */}
        <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain no-scrollbar space-y-3 pb-6">
          {/* Identitas Kesiswaan Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block leading-tight">
                  Bidang Kesiswaan
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                  Kedisiplinan
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
                      ? 'bg-rose-600 text-white shadow-xs'
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
          {/* TAB 1: BERANDA RINGKASAN KESISWAAN */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              <KesiswaanBerandaTab
                stats={stats}
                violationsRaw={violations}
                leaderboardRaw={leaderboard}
                analyticsRaw={analytics}
                isLoading={isLoadingViolations}
                isLoadingLeaderboard={isLoadingLeaderboard}
                isLoadingAnalytics={isLoadingAnalytics}
                onTabSelect={handleTabSelect}
              />
            </div>
          )}

          {/* TAB 2: PELANGGARAN & DISIPLIN */}
          {visitedTabs.has('pelanggaran') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'pelanggaran'}
              className={cn('w-full min-w-0', activeTab === 'pelanggaran' ? 'block' : 'hidden')}
            >
              <KesiswaanPelanggaranTab />
            </div>
          )}

          {/* TAB 3: PRESTASI SISWA */}
          {visitedTabs.has('prestasi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'prestasi'}
              className={cn('w-full min-w-0', activeTab === 'prestasi' ? 'block' : 'hidden')}
            >
              <KesiswaanPrestasiTab />
            </div>
          )}

          {/* TAB 4: PEMBIASAAN DHUHA */}
          {visitedTabs.has('dhuha') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'dhuha'}
              className={cn('w-full min-w-0', activeTab === 'dhuha' ? 'block' : 'hidden')}
            >
              <KesiswaanDhuhaTab />
            </div>
          )}

          {/* TAB 5: KETARUNAAN & EKSKUL */}
          {visitedTabs.has('ketarunaan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ketarunaan'}
              className={cn('w-full min-w-0', activeTab === 'ketarunaan' ? 'block' : 'hidden')}
            >
              <KesiswaanKetarunaanTab />
            </div>
          )}

          {/* TAB 6: MASTER TATA TERTIB */}
          {visitedTabs.has('tatib') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'tatib'}
              className={cn('w-full min-w-0', activeTab === 'tatib' ? 'block' : 'hidden')}
            >
              <KesiswaanTatibTab />
            </div>
          )}

          {/* TAB 7: REKAPITULASI & CETAK BERKAS */}
          {visitedTabs.has('rekap') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'rekap'}
              className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
            >
              <KesiswaanRekapTab />
            </div>
          )}

          {/* TAB 8: ATURAN GERBANG & PRESENSI (HASIL PLENO) */}
          {visitedTabs.has('aturan_absensi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'aturan_absensi'}
              className={cn('w-full min-w-0', activeTab === 'aturan_absensi' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Pengaturan Jam Absensi...</span>
                  </div>
                }
              >
                <TenantAttendanceForm hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB: STRUKTUR ORGANISASI KESISWAAN */}
          {visitedTabs.has('struktur_organisasi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'struktur_organisasi'}
              className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block' : 'hidden')}
            >
              <DivisiStrukturOrganisasiView
                divisionCode="KESISWAAN"
                divisionTitle="Struktur Organisasi Kesiswaan"
                hideLayout={true}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
