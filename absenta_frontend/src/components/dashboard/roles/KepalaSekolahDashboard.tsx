import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BookOpen,
  Users,
  HeartHandshake,
  Building,
  Briefcase,
  FileText,
  SlidersHorizontal,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';
import {
  getAttendanceChart,
  getKepsekEscalations,
  getDashboardOverview,
  getSarprasStats,
  getHubinStats,
  getBkkStats,
  getViolationStats,
  getTUStats,
} from '@/api/dashboard.api';
import { kesiswaanApi } from '@/api/kesiswaan.api';
import { getLeaderboardGuru } from '@/api/attendanceGerbang.api';
import { toLocalMonth } from '@/utils/attendance/time';
import { TeacherAttendanceLeaderboardModal } from '@/components/attendance/my_attendance/TeacherAttendanceLeaderboardModal';
import { KepsekDashboardSkeleton } from './kepsek/KepsekDashboardSkeleton';
import type { KepsekTabId, KepsekNavTabItem } from './kepsek/types';
import toast from 'react-hot-toast';

// Subtabs
import { KepsekRingkasanTab } from './kepsek/tabs/KepsekRingkasanTab';
import { KepsekKbmTab } from './kepsek/tabs/KepsekKbmTab';
import { KepsekKesiswaanTab } from './kepsek/tabs/KepsekKesiswaanTab';
import { KepsekBkTab } from './kepsek/tabs/KepsekBkTab';
import { KepsekSarprasTab } from './kepsek/tabs/KepsekSarprasTab';
import { KepsekHubinTab } from './kepsek/tabs/KepsekHubinTab';
import { KepsekTuTab } from './kepsek/tabs/KepsekTuTab';

export interface KepalaSekolahDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KepalaSekolahDashboard: React.FC<KepalaSekolahDashboardProps> = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonth = useMemo(() => toLocalMonth(), []);

  // Zustand Global Store: 0ms Synchronous Mobile & Desktop Synchronization
  const { currentPillar, setPillar } = useExecutivePillarStore();

  const validTabs: KepsekTabId[] = ['ringkasan', 'kbm', 'kesiswaan', 'bk', 'sarpras', 'hubin', 'tu'];
  const subtabParam = searchParams.get('subtab') as KepsekTabId | null;

  // Mobile Filter Collapsible & Refresh State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTeacherLeaderboardOpen, setIsTeacherLeaderboardOpen] = useState(false);

  // Active Tab State with Fallback Priority: searchParam -> currentPillar -> 'ringkasan'
  const [activeTab, setActiveTab] = useState<KepsekTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) return subtabParam;
    if (currentPillar && validTabs.includes(currentPillar)) return currentPillar;
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<KepsekTabId>>(() => new Set([activeTab]));

  // Sync when subtabParam changes
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setPillar(subtabParam);
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam) {
      if (currentPillar && validTabs.includes(currentPillar)) {
        setActiveTab(currentPillar);
        setVisitedTabs((prev) => (prev.has(currentPillar) ? prev : new Set(prev).add(currentPillar)));
      }
    }
  }, [subtabParam, currentPillar, setPillar]);

  const handleTabSelect = useCallback(
    (tabId: KepsekTabId) => {
      setActiveTab(tabId);
      setPillar(tabId);
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
    [searchParams, setSearchParams, setPillar]
  );

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  // 1. Data Queries
  const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => getDashboardOverview(),
    staleTime: 60_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['attendance-chart', currentMonth],
    queryFn: () => getAttendanceChart(currentMonth),
    staleTime: 5 * 60_000,
  });

  const { data: escalationsData } = useQuery({
    queryKey: ['kepsek-escalations'],
    queryFn: () => getKepsekEscalations(10),
    staleTime: 60_000,
  });

  const { data: sarprasData } = useQuery({
    queryKey: ['kepsek-sarpras-stats'],
    queryFn: () => getSarprasStats(),
    staleTime: 5 * 60_000,
  });

  const { data: hubinData } = useQuery({
    queryKey: ['kepsek-hubin-stats'],
    queryFn: () => getHubinStats(),
    staleTime: 5 * 60_000,
  });

  const { data: bkkData } = useQuery({
    queryKey: ['kepsek-bkk-stats'],
    queryFn: () => getBkkStats(),
    staleTime: 5 * 60_000,
  });

  const { data: violationData } = useQuery({
    queryKey: ['kepsek-violations-stats'],
    queryFn: () => getViolationStats(),
    staleTime: 2 * 60_000,
  });

  const { data: pelanggaranData } = useQuery({
    queryKey: ['kepsek-pelanggaran-list'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 10 }),
    staleTime: 2 * 60_000,
  });

  const { data: tuData } = useQuery({
    queryKey: ['kepsek-tu-stats'],
    queryFn: () => getTUStats(),
    staleTime: 2 * 60_000,
  });

  const { data: teacherLeaderboardRes } = useQuery({
    queryKey: ['kepsek-teacher-leaderboard'],
    queryFn: () => getLeaderboardGuru(5, 'PENDIDIK'),
    staleTime: 60_000,
  });

  const { data: studentLeaderboardRes, isLoading: isLoadingStudentLb } = useQuery({
    queryKey: ['kepsek-student-leaderboard'],
    queryFn: () => kesiswaanApi.getLeaderboard(),
    staleTime: 60_000,
  });

  const stats = overviewData?.data;
  const escalations = useMemo(() => escalationsData?.data || [], [escalationsData?.data]);
  const teacherLeaderboard = useMemo(() => teacherLeaderboardRes?.data || [], [teacherLeaderboardRes?.data]);
  const studentLeaderboard = useMemo(() => studentLeaderboardRes?.data || [], [studentLeaderboardRes?.data]);

  const careStudents = useMemo(() => {
    const list = Array.isArray(pelanggaranData?.data) ? pelanggaranData.data : pelanggaranData?.data?.list || [];
    if (!list.length) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};

    list.forEach((v: any) => {
      const id = v.siswa_id || v.id;
      if (!id) return;
      if (!studentPoints[id]) {
        studentPoints[id] = {
          id,
          name: v.Siswa?.nama_siswa || v.nama_siswa || 'Siswa',
          class: v.Siswa?.Kelas?.nama_kelas || v.nama_kelas || '-',
          points: 0,
        };
      }
      studentPoints[id].points += v.poin || 0;
    });

    return Object.values(studentPoints)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [pelanggaranData]);

  // Navigation Items Desktop Sidebar
  const navTabs: KepsekNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Ringkasan 360°',
        shortLabel: 'Ringkasan',
        icon: Award,
      },
      {
        id: 'kbm',
        label: 'KBM & Kurikulum',
        shortLabel: 'KBM',
        icon: BookOpen,
        badge: `${stats?.total_sesi_aktif || 0} Sesi`,
        badgeColor: 'bg-indigo-500 text-white',
      },
      {
        id: 'kesiswaan',
        label: 'Kesiswaan & Disiplin',
        shortLabel: 'Kesiswaan',
        icon: Users,
        badge: `${violationData?.data?.total_today || 0} Poin`,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'bk',
        label: 'Konseling & EWS',
        shortLabel: 'BP/BK',
        icon: HeartHandshake,
        badge: 'EWS',
        badgeColor: 'bg-purple-500 text-white',
      },
      {
        id: 'sarpras',
        label: 'Sarpras & Fasilitas',
        shortLabel: 'Sarpras',
        icon: Building,
        badge: 'ASET',
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'hubin',
        label: 'Hubin & Mitra DUDI',
        shortLabel: 'Hubin',
        icon: Briefcase,
        badge: 'PKL',
        badgeColor: 'bg-teal-500 text-white',
      },
      {
        id: 'tu',
        label: 'Tata Usaha & Surat',
        shortLabel: 'TU & Surat',
        icon: FileText,
        badge: 'SURAT',
        badgeColor: 'bg-blue-500 text-white',
      },
    ],
    [stats?.total_sesi_aktif, violationData?.data?.total_today]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchOverview(),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['kepsek-escalations'] }),
        queryClient.invalidateQueries({ queryKey: ['kepsek-teacher-leaderboard'] }),
      ]);
      toast.success('Data eksekutif berhasil disinkronkan');
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
                title="Kembali ke Ringkasan Eksekutif"
                aria-label="Kembali ke Ringkasan"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Overview Eksekutif
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {activeTab === 'ringkasan' ? 'Pusat Pengawasan Eksekutif Kepala Sekolah' : activeTabMeta.label}
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
          {/* Identity Mini Card */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-tight">
                  Pimpinan Sekolah
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                  Kepala Sekolah
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
          {/* TAB 1: RINGKASAN 360° */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              {loadingOverview && !stats ? (
                <KepsekDashboardSkeleton />
              ) : (
                <KepsekRingkasanTab
                  stats={stats}
                  chartData={chartData}
                  escalations={escalations}
                  sarprasData={sarprasData}
                  hubinData={hubinData}
                  teacherLeaderboard={teacherLeaderboard}
                  onTabSelect={handleTabSelect}
                  onOpenTeacherLeaderboard={() => setIsTeacherLeaderboardOpen(true)}
                />
              )}
            </div>
          )}

          {/* TAB 2: KBM & KURIKULUM */}
          {visitedTabs.has('kbm') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kbm'}
              className={cn('w-full min-w-0', activeTab === 'kbm' ? 'block' : 'hidden')}
            >
              <KepsekKbmTab
                stats={stats}
                teacherLeaderboard={teacherLeaderboard}
                onOpenTeacherLeaderboard={() => setIsTeacherLeaderboardOpen(true)}
              />
            </div>
          )}

          {/* TAB 3: KESISWAAN & DISIPLIN */}
          {visitedTabs.has('kesiswaan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kesiswaan'}
              className={cn('w-full min-w-0', activeTab === 'kesiswaan' ? 'block' : 'hidden')}
            >
              <KepsekKesiswaanTab
                violationData={violationData}
                pelanggaranData={pelanggaranData}
                escalations={escalations}
                careStudents={careStudents}
                studentLeaderboard={studentLeaderboard}
                isLoadingStudentLb={isLoadingStudentLb}
              />
            </div>
          )}

          {/* TAB 4: BP / BK (KONSELING & EWS) */}
          {visitedTabs.has('bk') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'bk'}
              className={cn('w-full min-w-0', activeTab === 'bk' ? 'block' : 'hidden')}
            >
              <KepsekBkTab />
            </div>
          )}

          {/* TAB 5: SARPRAS & FASILITAS */}
          {visitedTabs.has('sarpras') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'sarpras'}
              className={cn('w-full min-w-0', activeTab === 'sarpras' ? 'block' : 'hidden')}
            >
              <KepsekSarprasTab sarprasData={sarprasData} />
            </div>
          )}

          {/* TAB 6: HUBIN & MITRA DUDI */}
          {visitedTabs.has('hubin') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'hubin'}
              className={cn('w-full min-w-0', activeTab === 'hubin' ? 'block' : 'hidden')}
            >
              <KepsekHubinTab hubinData={hubinData} bkkData={bkkData} />
            </div>
          )}

          {/* TAB 7: TATA USAHA & PERSURATAN */}
          {visitedTabs.has('tu') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'tu'}
              className={cn('w-full min-w-0', activeTab === 'tu' ? 'block' : 'hidden')}
            >
              <KepsekTuTab tuData={tuData} stats={stats} />
            </div>
          )}
        </main>
      </div>

      {/* Modal Klasemen Kedisiplinan & Kinerja PTK */}
      <TeacherAttendanceLeaderboardModal
        isOpen={isTeacherLeaderboardOpen}
        onClose={() => setIsTeacherLeaderboardOpen(false)}
        teacherLeaderboard={teacherLeaderboard}
      />
    </div>
  );
});

KepalaSekolahDashboard.displayName = 'KepalaSekolahDashboard';

export default KepalaSekolahDashboard;
