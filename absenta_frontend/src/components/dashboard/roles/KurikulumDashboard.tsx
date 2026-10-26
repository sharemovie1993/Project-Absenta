import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  Clock,
  FileText,
  CheckCircle2,
  Award,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useJenjang } from '@/hooks/useJenjang';
import { useCapabilities } from '@/hooks/useCapabilities';
import { kurikulumApi } from '@/api/kurikulum.api';
import { guruApi, kelasApi, mapelApi } from '@/api/academic.api';
import { getJadwalKBM } from '@/api/attendance/jadwalKBM.api';
import {
  safeArr,
  safeTotal,
  buildDistribusi,
  buildBeban,
  detectConflicts,
  STATUS_COLORS,
  type RowItem,
  type SupervisiRecentItem,
  type PerangkatRecentItem,
  type JadwalEntry,
} from '@/components/kurikulum/dashboard/DashboardComponents';
import { KurikulumDashboardSkeleton } from './kurikulum/KurikulumDashboardSkeleton';
import type { KurikulumTabId, KurikulumNavTabItem } from './kurikulum/types';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { KurikulumBerandaTab } from './kurikulum/tabs/KurikulumBerandaTab';
import { KurikulumJadwalTab } from './kurikulum/tabs/KurikulumJadwalTab';
import { KurikulumGuruMapelTab } from './kurikulum/tabs/KurikulumGuruMapelTab';
import { KurikulumStrukturTab } from './kurikulum/tabs/KurikulumStrukturTab';
import { KurikulumPiketTab } from './kurikulum/tabs/KurikulumPiketTab';
import { KurikulumPerangkatTab } from './kurikulum/tabs/KurikulumPerangkatTab';
import { KurikulumSupervisiTab } from './kurikulum/tabs/KurikulumSupervisiTab';
import { KurikulumRaporTab } from './kurikulum/tabs/KurikulumRaporTab';

export interface KurikulumDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KurikulumDashboard: React.FC<KurikulumDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KurikulumTabId | null;

  const validTabs: KurikulumTabId[] = [
    'ringkasan',
    'jadwal',
    'guru_mapel',
    'struktur',
    'piket',
    'perangkat',
    'supervisi',
    'rapor',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<KurikulumTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat pindah tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<KurikulumTabId>>(() => new Set([activeTab]));

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
    (tabId: KurikulumTabId) => {
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

  const resolvedTahunPelajaranId = academicFilter.values.tahunPelajaranId;
  const resolvedSemesterId = academicFilter.values.semesterId;
  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  const { jenjang, kelompokOptions, tingkatList } = useJenjang();
  const isVocational = useMemo(() => ['SMK', 'MAK'].includes(jenjang || ''), [jenjang]);
  const { can } = useCapabilities();
  const hasSupervisiAccess = can('curriculum.supervision.view.schedule');

  // React Query Caching
  const { data: guruR, isLoading: lGuru } = useQuery({
    queryKey: ['guru', 'all-dash-kuri'],
    queryFn: () => guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: kelasR, isLoading: lKelas } = useQuery({
    queryKey: ['kelas', 'all-dash-kuri'],
    queryFn: () => kelasApi.getAll({ limit: 500, is_active: true } as Record<string, unknown>),
    staleTime: 10 * 60 * 1000,
  });

  const { data: mapelR, isLoading: lMapel } = useQuery({
    queryKey: ['mapel', 'all-dash-kuri'],
    queryFn: () => mapelApi.getAll({ limit: 500 }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: strR, isLoading: lStr } = useQuery({
    queryKey: ['kurikulum', 'struktur-dash', resolvedTahunPelajaranId],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: resolvedTahunPelajaranId, limit: 500 }),
    enabled: !!resolvedTahunPelajaranId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: supR, isLoading: lSup } = useQuery({
    queryKey: ['kurikulum', 'supervisi-dash'],
    queryFn: () => kurikulumApi.getSupervisi({ limit: 200 }),
    enabled: hasSupervisiAccess,
    staleTime: 5 * 60 * 1000,
  });

  const { data: jwR, isLoading: lJw } = useQuery({
    queryKey: ['attendance', 'jadwal-kbm-dash', resolvedSemesterId],
    queryFn: () => getJadwalKBM({ semester_id: resolvedSemesterId }),
    enabled: !!resolvedSemesterId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: perangkatR, isLoading: lPerangkat } = useQuery({
    queryKey: ['kurikulum', 'perangkat-dash', resolvedTahunPelajaranId, resolvedSemesterId],
    queryFn: () =>
      kurikulumApi.getPerangkatAjar({
        tahun_pelajaran_id: resolvedTahunPelajaranId,
        semester_id: resolvedSemesterId,
      }),
    enabled: !!resolvedTahunPelajaranId && !!resolvedSemesterId,
    staleTime: 5 * 60 * 1000,
  });

  // Derived Stats
  const activeEducators = useMemo(() => {
    const raw = safeArr<{
      id: string;
      nama_guru: string;
      nip?: string;
      jenis_ptk?: string;
      User?: { is_active?: boolean; status?: string };
    }>(guruR);

    return raw.filter((g) => {
      const ptk = (g.jenis_ptk || 'PENDIDIK').toUpperCase();
      const isPendidik = ptk === 'PENDIDIK' || ptk.includes('GURU');
      const u = g.User;
      const isUserActive = u
        ? u.is_active !== false &&
          u.status?.toUpperCase() !== 'INACTIVE' &&
          u.status?.toUpperCase() !== 'NONAKTIF' &&
          u.status?.toUpperCase() !== 'SUSPENDED'
        : true;
      return isPendidik && isUserActive;
    });
  }, [guruR]);

  const totalGuru = activeEducators.length;

  const activeClasses = useMemo(() => {
    const raw = safeArr<{
      id: string;
      nama_kelas: string;
      is_active?: boolean;
      status?: string;
    }>(kelasR);

    return raw.filter((k) => {
      const isActiveBool = k.is_active !== false;
      const statusText = (k.status || 'AKTIF').toUpperCase();
      return isActiveBool && (statusText === 'AKTIF' || statusText === 'ACTIVE');
    });
  }, [kelasR]);

  const totalKelas = activeClasses.length;
  const totalMapel = safeTotal(mapelR);

  const strRows = useMemo(() => {
    const raw = safeArr<RowItem>(strR);
    return raw.filter((r) => tingkatList.includes(Number(r.tingkat)));
  }, [strR, tingkatList]);

  const supRows = useMemo(() => safeArr<SupervisiRecentItem>(supR), [supR]);
  const distribusi = useMemo(
    () => buildDistribusi(strRows, kelompokOptions, isVocational),
    [strRows, kelompokOptions, isVocational]
  );
  const beban = useMemo(
    () => buildBeban(strRows, kelompokOptions, isVocational),
    [strRows, kelompokOptions, isVocational]
  );

  const teachersLoad = useMemo(() => {
    const teachers = activeEducators;
    const jadwalList = safeArr<{ guru_id?: string }>(jwR);
    if (teachers.length === 0) return [];

    const jwMap: Record<string, number> = {};
    for (const j of jadwalList) {
      if (j.guru_id) {
        jwMap[j.guru_id] = (jwMap[j.guru_id] || 0) + 1;
      }
    }

    return teachers
      .map((t) => ({
        id: t.id,
        nama: t.nama_guru,
        nip: t.nip,
        jp: jwMap[t.id] || 0,
      }))
      .sort((a, b) => b.jp - a.jp);
  }, [activeEducators, jwR]);

  const totalJpMinggu = useMemo(() => {
    return teachersLoad.reduce((acc, curr) => acc + curr.jp, 0);
  }, [teachersLoad]);

  const supSelesai = supRows.filter(
    (r) => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI'
  ).length;
  const supTerjadwal = supRows.filter(
    (r) => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL'
  ).length;
  const supBelum = Math.max(0, supRows.length - supSelesai - supTerjadwal);
  const supPct = supRows.length > 0 ? Math.round((supSelesai / supRows.length) * 100) : 0;

  const pieData = [
    { name: 'Selesai', value: supSelesai, color: STATUS_COLORS.SELESAI },
    { name: 'Terjadwal', value: supTerjadwal, color: STATUS_COLORS.TERJADWAL },
    { name: 'Belum', value: supBelum, color: STATUS_COLORS.BELUM },
  ].filter((d) => d.value > 0);

  const recentSup: SupervisiRecentItem[] = [...supRows]
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .slice(0, 5);

  const conflicts = useMemo(() => {
    return detectConflicts(safeArr<JadwalEntry>(jwR)).slice(0, 15);
  }, [jwR]);

  const perangkatStats = useMemo(() => {
    const list = safeArr<{ status?: string; guru_id?: string }>(perangkatR);
    const total = list.length;
    const approved = list.filter((p) => p.status?.toUpperCase() === 'APPROVED').length;
    const rejected = list.filter((p) => p.status?.toUpperCase() === 'REJECTED').length;
    const pending = Math.max(0, total - approved - rejected);

    const uniqueApprovedTeachers = new Set(
      list.filter((p) => p.status?.toUpperCase() === 'APPROVED' && p.guru_id).map((p) => p.guru_id)
    );

    const teachersCount = activeEducators.length;
    const pctCompleteness =
      teachersCount > 0 ? Math.round((uniqueApprovedTeachers.size / teachersCount) * 100) : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      pctCompleteness,
      uniqueApprovedTeachersCount: uniqueApprovedTeachers.size,
    };
  }, [perangkatR, activeEducators]);

  const recentPerangkat = useMemo((): PerangkatRecentItem[] => {
    return safeArr<PerangkatRecentItem>(perangkatR).slice(0, 5);
  }, [perangkatR]);

  const overloadCount = teachersLoad.filter((t) => t.jp > 24).length;

  // Nav Tabs Definition
  const navTabs: KurikulumNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'jadwal',
        label: 'Jadwal KBM',
        shortLabel: 'Jadwal',
        icon: Calendar,
        badge: conflicts.length > 0 ? `${conflicts.length}` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'guru_mapel',
        label: 'Plotting Guru',
        shortLabel: 'Guru Mapel',
        icon: Users,
        badge: overloadCount > 0 ? `${overloadCount}` : undefined,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        id: 'struktur',
        label: 'Struktur Kurikulum',
        shortLabel: 'Struktur',
        icon: Layers,
      },
      {
        id: 'piket',
        label: 'Jadwal Piket',
        shortLabel: 'Piket',
        icon: Clock,
      },
      {
        id: 'perangkat',
        label: 'Perangkat Ajar',
        shortLabel: 'Perangkat',
        icon: FileText,
        badge: perangkatStats.pending > 0 ? `${perangkatStats.pending}` : undefined,
        badgeColor: 'bg-teal-500 text-white',
      },
      {
        id: 'supervisi',
        label: 'Supervisi Akademik',
        shortLabel: 'Supervisi',
        icon: CheckCircle2,
      },
      {
        id: 'rapor',
        label: 'Pleno Rapor',
        shortLabel: 'Rapor',
        icon: Award,
      },
    ],
    [conflicts.length, overloadCount, perangkatStats.pending]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guru'] }),
        queryClient.invalidateQueries({ queryKey: ['kelas'] }),
        queryClient.invalidateQueries({ queryKey: ['mapel'] }),
        queryClient.invalidateQueries({ queryKey: ['kurikulum'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance', 'jadwal-kbm-dash'] }),
      ]);
      toast.success('Data kurikulum berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isInitialLoading = lGuru && lKelas && lMapel;

  if (isInitialLoading) {
    return <KurikulumDashboardSkeleton />;
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
                  Dashboard Kurikulum
                </h1>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                  &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                Manajemen KBM, Beban Mengajar, Supervisi, & Pelaporan Akademik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            {/* Tombol Toggle Filter Periode (Khusus Mobile) */}
            <button
              type="button"
              onClick={() => setShowMobileFilter((prev) => !prev)}
              className={cn(
                'lg:hidden p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                showMobileFilter
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              )}
              title="Atur Periode Akademik"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Periode</span>
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
          {/* Identitas Kurikulum Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-tight">
                  Bidang Akademik
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                  Kurikulum
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
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-bold min-w-5 text-center transition-colors',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
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

        {/* Right Column: Main Content Canvas */}
        <main className="min-w-0 space-y-4">
          {/* TAB 1: RINGKASAN / BERANDA */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              <KurikulumBerandaTab
                semNama={semNama}
                tpTahun={tpTahun}
                totalGuru={totalGuru}
                totalKelas={totalKelas}
                totalMapel={totalMapel}
                totalJpMinggu={totalJpMinggu}
                distribusi={distribusi}
                beban={beban}
                teachersLoad={teachersLoad}
                conflicts={conflicts}
                perangkatStats={perangkatStats}
                recentPerangkat={recentPerangkat}
                supRows={supRows}
                supPct={supPct}
                pieData={pieData}
                recentSup={recentSup}
                loading={lStr || lSup || lPerangkat}
                onTabSelect={handleTabSelect}
              />
            </div>
          )}

          {/* TAB 2: JADWAL KBM */}
          {visitedTabs.has('jadwal') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'jadwal'}
              className={cn('w-full min-w-0', activeTab === 'jadwal' ? 'block' : 'hidden')}
            >
              <KurikulumJadwalTab
                semesterId={resolvedSemesterId}
                tahunPelajaranId={resolvedTahunPelajaranId}
              />
            </div>
          )}

          {/* TAB 3: PLOTTING GURU & MAPEL */}
          {visitedTabs.has('guru_mapel') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'guru_mapel'}
              className={cn('w-full min-w-0', activeTab === 'guru_mapel' ? 'block' : 'hidden')}
            >
              <KurikulumGuruMapelTab
                teachersLoad={teachersLoad}
                loading={lGuru || lJw}
              />
            </div>
          )}

          {/* TAB 4: STRUKTUR KURIKULUM */}
          {visitedTabs.has('struktur') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'struktur'}
              className={cn('w-full min-w-0', activeTab === 'struktur' ? 'block' : 'hidden')}
            >
              <KurikulumStrukturTab
                strRows={strRows}
                kelompokOptions={kelompokOptions}
                isVocational={isVocational}
                loading={lStr}
              />
            </div>
          )}

          {/* TAB 5: JADWAL PIKET */}
          {visitedTabs.has('piket') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'piket'}
              className={cn('w-full min-w-0', activeTab === 'piket' ? 'block' : 'hidden')}
            >
              <KurikulumPiketTab
                tahunPelajaranId={resolvedTahunPelajaranId}
                semesterId={resolvedSemesterId}
              />
            </div>
          )}

          {/* TAB 6: PERANGKAT AJAR */}
          {visitedTabs.has('perangkat') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'perangkat'}
              className={cn('w-full min-w-0', activeTab === 'perangkat' ? 'block' : 'hidden')}
            >
              <KurikulumPerangkatTab
                perangkatStats={perangkatStats}
                activeEducators={activeEducators}
                perangkatList={safeArr(perangkatR)}
                loading={lPerangkat}
              />
            </div>
          )}

          {/* TAB 7: SUPERVISI */}
          {visitedTabs.has('supervisi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'supervisi'}
              className={cn('w-full min-w-0', activeTab === 'supervisi' ? 'block' : 'hidden')}
            >
              <KurikulumSupervisiTab
                supRows={supRows}
                supPct={supPct}
                loading={lSup}
              />
            </div>
          )}

          {/* TAB 8: RAPOR */}
          {visitedTabs.has('rapor') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'rapor'}
              className={cn('w-full min-w-0', activeTab === 'rapor' ? 'block' : 'hidden')}
            >
              <KurikulumRaporTab />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
