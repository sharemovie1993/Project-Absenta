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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { kesiswaanApi, type Pelanggaran } from '@/api/kesiswaan.api';
import { KesiswaanDashboardSkeleton } from './kesiswaan/KesiswaanDashboardSkeleton';
import type { KesiswaanTabId, KesiswaanNavTabItem } from './kesiswaan/types';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { KesiswaanBerandaTab } from './kesiswaan/tabs/KesiswaanBerandaTab';
import { KesiswaanPelanggaranTab } from './kesiswaan/tabs/KesiswaanPelanggaranTab';
import { KesiswaanPrestasiTab } from './kesiswaan/tabs/KesiswaanPrestasiTab';
import { KesiswaanDhuhaTab } from './kesiswaan/tabs/KesiswaanDhuhaTab';
import { KesiswaanKetarunaanTab } from './kesiswaan/tabs/KesiswaanKetarunaanTab';
import { KesiswaanTatibTab } from './kesiswaan/tabs/KesiswaanTatibTab';
import { KesiswaanRekapTab } from './kesiswaan/tabs/KesiswaanRekapTab';

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
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Navigation Items Desktop Sidebar
  const navTabs: KesiswaanNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Beranda Kesiswaan',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'pelanggaran',
        label: 'Pelanggaran & Disiplin',
        shortLabel: 'Pelanggaran',
        icon: ShieldAlert,
        badge: stats.today > 0 ? `${stats.today}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'prestasi',
        label: 'Prestasi Siswa',
        shortLabel: 'Prestasi',
        icon: Trophy,
        badge: (leaderboard?.data as any[])?.length > 0 ? `${(leaderboard?.data as any[]).length}` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'dhuha',
        label: 'Pembiasaan Dhuha',
        shortLabel: 'Dhuha',
        icon: HeartPulse,
      },
      {
        id: 'ketarunaan',
        label: 'Ketarunaan & Ekskul',
        shortLabel: 'Ketarunaan',
        icon: Award,
      },
      {
        id: 'tatib',
        label: 'Master Tata Tertib',
        shortLabel: 'Tata Tertib',
        icon: FileSpreadsheet,
      },
      {
        id: 'rekap',
        label: 'Cetak Berkas',
        shortLabel: 'Cetak',
        icon: Printer,
      },
    ],
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

  if (isLoadingViolations && !violations) {
    return <KesiswaanDashboardSkeleton />;
  }

  return (
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
                  Dashboard Kesiswaan
                </h1>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                  &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                Penegakan Disiplin, Prestasi Siswa, Pembiasaan Karakter, & Rekapitulasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* TV Mode Shortcut */}
            <button
              type="button"
              onClick={() => navigate('/kesiswaan/monitoring')}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buka Mode TV Monitor Kesiswaan"
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
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
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

      {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
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
        </main>
      </div>
    </div>
  );
};
