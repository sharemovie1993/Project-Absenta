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
  CalendarDays,
  ArrowRightLeft,
  Printer,
  ShieldCheck,
  Zap,
  Settings,
  BarChart2,
  UserCheck,
  Settings2,
  Laptop,
  Network,
} from 'lucide-react';
import { Loader } from '@/components/ui';
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
import {
  KURIKULUM_CATEGORIES,
  getKurikulumNavTabs
} from './kurikulum/kurikulumNavigation.config';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
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
import { KurikulumTitimangsaRaporTab } from './kurikulum/tabs/KurikulumTitimangsaRaporTab';
import { KurikulumKalenderTab } from './kurikulum/tabs/KurikulumKalenderTab';
import { KurikulumJamKbmTab } from './kurikulum/tabs/KurikulumJamKbmTab';
import { KurikulumDelegasiTab } from './kurikulum/tabs/KurikulumDelegasiTab';
import { KurikulumCetakTab } from './kurikulum/tabs/KurikulumCetakTab';
import { KurikulumRekapKbmTab } from './kurikulum/tabs/KurikulumRekapKbmTab';
import { KurikulumWaliKelasTab } from './kurikulum/tabs/KurikulumWaliKelasTab';
import { KurikulumCbtTab } from './kurikulum/tabs/KurikulumCbtTab';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
const TenantAttendanceForm = React.lazy(() => import('@/components/attendance/settings/TenantAttendanceForm'));
const KurikulumEvaluasiKinerjaTab = React.lazy(() => import('./kurikulum/tabs/KurikulumEvaluasiKinerjaTab'));

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
    'delegasi',
    'rekap_kbm',
    'perangkat',
    'supervisi',
    'evaluasi_kinerja',
    'cbt',
    'rapor',
    'titimangsa_rapor',
    'kalender',
    'jam_kbm',
    'aturan_absensi',
    'struktur',
    'guru_mapel',
    'wali_kelas',
    'jadwal',
    'piket',
    'cetak',
    'struktur_organisasi',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('kurikulum');

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
  const semNama = academicFilter.selectedSemesterNama || academicFilter.activeSemester?.nama_semester?.replace(/\s*⭐\s*/g, '').trim() || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || academicFilter.activeTpYear?.tahun || '';

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
    queryKey: ['kurikulum', 'supervisi-dash', resolvedTahunPelajaranId, resolvedSemesterId],
    queryFn: () => kurikulumApi.getSupervisi({
      limit: 200,
      tahun_pelajaran_id: resolvedTahunPelajaranId,
      semester_id: resolvedSemesterId,
    }),
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

  // Nav Tabs Definition (SSOT - 100% DRY)
  const navTabs: KurikulumNavTabItem[] = useMemo(
    () =>
      getKurikulumNavTabs({
        pendingPerangkat: perangkatStats.pending,
        overloadCount,
        conflicts: conflicts.length,
      }),
    [conflicts.length, overloadCount, perangkatStats.pending]
  );

  const kurikulumCategories = KURIKULUM_CATEGORIES;

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

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'delegasi': return 'Delegasi Inval';
      case 'rekap_kbm': return 'Realisasi KBM';
      case 'perangkat': return 'Perangkat Ajar';
      case 'jadwal': return 'Jadwal Pelajaran';
      case 'plotting': return 'Plotting Guru';
      case 'atp': return 'Alur Tujuan (ATP)';
      case 'kosp': return 'Kurikulum Operasional';
      case 'struktur': return 'Struktur Modul';
      case 'supervisi': return 'Supervisi Guru';
      case 'rekap': return 'Rekapitulasi KBM';
      case 'penilaian': return 'Buku Nilai & Rapor';
      case 'kalender': return 'Kalender Akademik';
      case 'kokurikuler': return 'Kokurikuler (P5)';
      case 'pengumuman': return 'Pengumuman';
      case 'jam_kbm': return 'Jam Pelajaran';
      case 'rekap_mapel': return 'Rekap Mapel';
      case 'settings': return 'Pengaturan';
      default: return 'Beranda';
    }
  }, [activeTab]);

  if (isInitialLoading) {
    return <KurikulumDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
      <UniversalEcosystemTopbar
        ecosystem="kurikulum"
        title={currentSubtabTitle}
        icon={BookOpen}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={
          <button
            type="button"
            onClick={() => setShowMobileFilter((prev) => !prev)}
            className={cn(
              'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
              showMobileFilter
                ? 'bg-white text-emerald-800 shadow-xs'
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
        title="Dashboard Kurikulum"
        subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
        roleBadge="KURIKULUM"
        scope="kurikulum"
        roleIcon={BookOpen}
        tabs={navTabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleTabSelect(tabId as KurikulumTabId)}
        categories={kurikulumCategories}
      />

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

          {/* Navigasi Menu Vertikal Sidebar dengan 2 Kategori Siklus Kerja */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            {/* ⚡ Seksi 1: OPERASIONAL KBM */}
            <div className="space-y-0.5">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Zap className="w-3 h-3" />
                  Operasional KBM
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded font-bold">
                  Harian
                </span>
              </div>
              {navTabs.filter((t) => t.category === 'operasional').map((tab) => {
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
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors shrink-0',
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
            </div>

            {/* Garis Pemisah */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 mx-1.5" />

            {/* ⚙️ Seksi 2: PERSIAPAN TAHUN AJARAN */}
            <div className="space-y-0.5">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Settings className="w-3 h-3" />
                  Persiapan TA Baru
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded font-bold">
                  Setup
                </span>
              </div>
              {navTabs.filter((t) => t.category === 'persiapan').map((tab) => {
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
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors shrink-0',
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
            </div>
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
                tahunPelajaranId={resolvedTahunPelajaranId}
                semesterId={resolvedSemesterId}
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
                tahunPelajaranId={resolvedTahunPelajaranId}
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
                tahunPelajaranId={resolvedTahunPelajaranId}
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
                tahunPelajaranId={resolvedTahunPelajaranId}
                semesterId={resolvedSemesterId}
                supRows={supRows}
                supPct={supPct}
                loading={lSup}
              />
            </div>
          )}

          {/* TAB EVALUASI KINERJA (UNIVERSAL ROLE-READY MODAL) */}
          {visitedTabs.has('evaluasi_kinerja') && (
            <div
              key="tab-evaluasi-kinerja"
              role="tabpanel"
              aria-hidden={activeTab !== 'evaluasi_kinerja'}
              className={cn('w-full min-w-0', activeTab === 'evaluasi_kinerja' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Evaluasi Kinerja Guru...</span>
                  </div>
                }
              >
                <KurikulumEvaluasiKinerjaTab
                  tahunPelajaranId={resolvedTahunPelajaranId}
                  semesterId={resolvedSemesterId}
                />
              </Suspense>
            </div>
          )}

          {/* TAB CBT & ASESMEN UJIAN */}
          {visitedTabs.has('cbt') && (
            <div
              key="tab-cbt"
              role="tabpanel"
              aria-hidden={activeTab !== 'cbt'}
              className={cn('w-full min-w-0', activeTab === 'cbt' ? 'block' : 'hidden')}
            >
              <KurikulumCbtTab />
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

          {/* TAB REKAP REALISASI KBM */}
          {visitedTabs.has('rekap_kbm') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'rekap_kbm'}
              className={cn('w-full min-w-0', activeTab === 'rekap_kbm' ? 'block' : 'hidden')}
            >
              <KurikulumRekapKbmTab
                tahunPelajaranId={resolvedTahunPelajaranId}
                semesterId={resolvedSemesterId}
              />
            </div>
          )}

          {/* TAB PENUGASAN WALI KELAS */}
          {visitedTabs.has('wali_kelas') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'wali_kelas'}
              className={cn('w-full min-w-0', activeTab === 'wali_kelas' ? 'block' : 'hidden')}
            >
              <KurikulumWaliKelasTab
                tahunPelajaranId={resolvedTahunPelajaranId}
              />
            </div>
          )}

          {/* TAB 9: DELEGASI & GURU INVAL */}
          {visitedTabs.has('delegasi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'delegasi'}
              className={cn('w-full min-w-0', activeTab === 'delegasi' ? 'block' : 'hidden')}
            >
              <KurikulumDelegasiTab
                tahunPelajaranId={resolvedTahunPelajaranId}
                semesterId={resolvedSemesterId}
              />
            </div>
          )}

          {/* TAB 10: KALENDER AKADEMIK */}
          {visitedTabs.has('kalender') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kalender'}
              className={cn('w-full min-w-0', activeTab === 'kalender' ? 'block' : 'hidden')}
            >
              <KurikulumKalenderTab
                tahunPelajaranId={resolvedTahunPelajaranId}
                tahunPelajaranNama={tpTahun}
              />
            </div>
          )}

          {/* TAB 11: JAM KBM & SHIFT */}
          {visitedTabs.has('jam_kbm') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'jam_kbm'}
              className={cn('w-full min-w-0', activeTab === 'jam_kbm' ? 'block' : 'hidden')}
            >
              <KurikulumJamKbmTab />
            </div>
          )}

          {/* TAB: ATURAN JAM & PRESENSI SEKOLAH (SUBTAB KHUSUS) */}
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
                    <span className="text-xs text-slate-500 font-medium">Memuat Kebijakan Presensi Sekolah...</span>
                  </div>
                }
              >
                <TenantAttendanceForm hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* TAB TITIMANGSA RAPOR */}
          {visitedTabs.has('titimangsa_rapor') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'titimangsa_rapor'}
              className={cn('w-full min-w-0', activeTab === 'titimangsa_rapor' ? 'block' : 'hidden')}
            >
              <KurikulumTitimangsaRaporTab />
            </div>
          )}

          {/* TAB 12: CETAK BERKAS KURIKULUM */}
          {visitedTabs.has('cetak') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'cetak'}
              className={cn('w-full min-w-0', activeTab === 'cetak' ? 'block' : 'hidden')}
            >
              <KurikulumCetakTab />
            </div>
          )}

          {/* TAB: STRUKTUR ORGANISASI KURIKULUM */}
          {visitedTabs.has('struktur_organisasi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'struktur_organisasi'}
              className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block' : 'hidden')}
            >
              <DivisiStrukturOrganisasiView
                divisionCode="KURIKULUM"
                divisionTitle="Struktur Organisasi Kurikulum"
                hideLayout={true}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
