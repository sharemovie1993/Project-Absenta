import { formatDate } from '@/utils/date.utils';
import React, { useMemo, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, ClipboardList, ShieldCheck, Users, LayoutGrid,
  RefreshCw, CalendarDays, TrendingUp, Activity, Zap,
  GraduationCap, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, FileText, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList,
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { Card } from '@/components/ui/Card';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { motion, AnimatePresence } from 'framer-motion';

import { kurikulumApi } from '@/api/kurikulum.api';
import { guruApi, kelasApi, mapelApi, semesterApi, jurusanApi, tahunPelajaranApi } from '@/api/academic.api';
import { getJadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { useTvStore } from '@/store/tvStore';
import { useTvStore as useTvStoreLocal } from '@/store/tvStore'; // unused mapping prevention
import { useJenjang } from '@/hooks/useJenjang';
import { useCapabilities } from '@/hooks/useCapabilities';
import { cn } from '@/lib/utils';
import {
  EmptyState, DistribusiChart, SupervisiPanel, PerangkatPanel,
  PALETTE, STATUS_COLORS,
  safeArr, safeTotal, getKelompokLabel, buildDistribusi, buildBeban,
  detectConflicts, type ConflictResult,
  type RowItem, type SelectOption,
  type PerangkatRecentItem, type SupervisiRecentItem,
  type JadwalEntry
} from '@/components/kurikulum/dashboard/DashboardComponents';

const REFETCH = 60_000;
const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const STANDAR_MAX = 24;
const STANDAR_MIN = 12;

const chartTooltipContentStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 };
const chartLabelStyle = { fill: '#475569', fontSize: 10, fontWeight: 'bold' };



/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function KurikulumDashboard() {
  const { isTvMode } = useTvStore();
  const { can } = useCapabilities();
  const hasSupervisiAccess = can('curriculum.supervision.view.schedule');
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const { jenjang, kelompokOptions, tingkatList } = useJenjang();
  const isVocational = useMemo(() => ['SMK', 'MAK'].includes(jenjang || ''), [jenjang]);
  const [currentScene, setCurrentScene] = React.useState(0);

  React.useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  /* ── queries with optimized caching (Zero Network Contention) ── */
  const { data: semR, isLoading: lSem } = useQuery({
    queryKey: ['semester', 'active'], queryFn: semesterApi.getActive,
    staleTime: 10 * 60 * 1000,
  });
  const { data: yearsR } = useQuery({
    queryKey: ['academic-years-dash'], queryFn: () => tahunPelajaranApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: guruR, isLoading: lGuru } = useQuery({
    queryKey: ['guru', 'all-dash'], queryFn: () => guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' }),
    staleTime: 10 * 60 * 1000,
  });
  const { data: kelasR, isLoading: lKelas } = useQuery({
    queryKey: ['kelas', 'all-dash'], queryFn: () => kelasApi.getAll({ limit: 500, is_active: true } as Record<string, unknown>),
    staleTime: 10 * 60 * 1000,
  });
  const { data: mapelR, isLoading: lMapel } = useQuery({
    queryKey: ['mapel', 'all-dash'], queryFn: () => mapelApi.getAll({ limit: 500 }),
    staleTime: 10 * 60 * 1000,
  });

  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum/struktur' },
    { label: 'Dashboard' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Dashboard Analitik Kurikulum',
    description: 'Menyajikan informasi komprehensif beban jam mengajar guru, statistik beban KBM per jurusan, dan hasil supervisi akademik secara real-time.',
    items: [
      { text: 'Pantau distribusi beban JP (Jam Pelajaran) per jurusan/kelompok mapel.' },
      { text: 'Lihat status antrean dan hasil observasi supervisi akademik penilai.' },
      { text: 'Gunakan TvModeToggle untuk visualisasi live dashboard KBM layar penuh.' }
    ]
  }), []);

  const semesterRaw = (semR as { data?: unknown })?.data ?? null;
  const semester    = (Array.isArray(semesterRaw) ? semesterRaw[0] : semesterRaw) as { nama_semester?: string; tahun_pelajaran_id?: string; id?: string; TahunPelajaran?: { tahun?: string } } | null;
  const semNama     = semester?.nama_semester ?? '';
  
  const activeYear = useMemo(() => (yearsR?.data ?? []).find(y => y.is_active), [yearsR]);
  const resolvedTahunPelajaranId = semester?.tahun_pelajaran_id || activeYear?.id;
  const tpTahun     = semester?.TahunPelajaran?.tahun || activeYear?.tahun || '';

  const { data: strR, isLoading: lStr } = useQuery({
    queryKey: ['kurikulum', 'struktur-dash', resolvedTahunPelajaranId],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: resolvedTahunPelajaranId, limit: 500 }),
    enabled: !!resolvedTahunPelajaranId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: supR, isLoading: lSup } = useQuery({
    queryKey: ['kurikulum', 'supervisi-dash'], queryFn: () => kurikulumApi.getSupervisi({ limit: 200 }),
    enabled: hasSupervisiAccess,
    staleTime: 5 * 60 * 1000,
  });
  const { data: jwR } = useQuery({
    queryKey: ['attendance', 'jadwal-kbm-dash', semester?.id],
    queryFn: () => getJadwalKBM({ semester_id: semester?.id }),
    enabled: !!semester?.id,
    staleTime: 5 * 60 * 1000,
  });
  const { data: perangkatR, isLoading: lPerangkat } = useQuery({
    queryKey: ['kurikulum', 'perangkat-dash', semester?.tahun_pelajaran_id, semester?.id],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: semester?.tahun_pelajaran_id,
      semester_id: semester?.id
    }),
    enabled: !!semester?.tahun_pelajaran_id && !!semester?.id,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => { if (strR) setLastRefresh(new Date()); }, [strR]);

  /* ── derived ── */
  const activeEducators = useMemo(() => {
    const raw = safeArr<{
      id: string;
      nama_guru: string;
      jenis_ptk?: string;
      User?: { is_active?: boolean; status?: string };
    }>(guruR);

    return raw.filter(g => {
      // 1. Must be PENDIDIK or GURU
      const ptk = (g.jenis_ptk || 'PENDIDIK').toUpperCase();
      const isPendidik = ptk === 'PENDIDIK' || ptk.includes('GURU');

      // 2. Must be Active
      const u = g.User;
      const isUserActive = u
        ? (u.is_active !== false && u.status?.toUpperCase() !== 'INACTIVE' && u.status?.toUpperCase() !== 'NONAKTIF' && u.status?.toUpperCase() !== 'SUSPENDED')
        : true;

      return isPendidik && isUserActive;
    });
  }, [guruR]);

  const totalGuru   = activeEducators.length;

  const activeClasses = useMemo(() => {
    const raw = safeArr<{
      id: string;
      nama_kelas: string;
      is_active?: boolean;
      status?: string;
    }>(kelasR);

    return raw.filter(k => {
      const isActiveBool = k.is_active !== false;
      const statusText = (k.status || 'AKTIF').toUpperCase();
      const isActiveStatus = statusText === 'AKTIF' || statusText === 'ACTIVE';
      return isActiveBool && isActiveStatus;
    });
  }, [kelasR]);

  const totalKelas  = activeClasses.length;
  const totalMapel  = safeTotal(mapelR);

  const strRows     = useMemo(() => {
    const raw = safeArr<RowItem>(strR);
    return raw.filter(r => tingkatList.includes(Number(r.tingkat)));
  }, [strR, tingkatList]);
  const supRows     = useMemo(() => safeArr<SupervisiRecentItem>(supR), [supR]);

  const distribusi  = useMemo(() => buildDistribusi(strRows, kelompokOptions, isVocational), [strRows, kelompokOptions, isVocational]);
  const beban       = useMemo(() => buildBeban(strRows, kelompokOptions, isVocational), [strRows, kelompokOptions, isVocational]);

  // Realistis Guru Load calculation from actual JadwalKBM data
  const teachersLoad = useMemo(() => {
    const teachers = activeEducators;
    const jadwalList = safeArr<{ guru_id?: string }>(jwR);
    if (teachers.length === 0) return [];
    
    // Count KBM slots for each teacher
    const jwMap: Record<string, number> = {};
    for (const j of jadwalList) {
      if (j.guru_id) {
        jwMap[j.guru_id] = (jwMap[j.guru_id] || 0) + 1;
      }
    }
    
    return teachers?.map((t) => {
      const jp = jwMap[t.id] || 0;
      return {
        id: t.id,
        nama: t.nama_guru,
        jp,
      };
    })?.sort((a, b) => b.jp - a.jp);
  }, [activeEducators, jwR]);

  const supSelesai   = supRows.filter(r => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI').length;
  const supTerjadwal = supRows.filter(r => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL').length;
  const supBelum     = Math.max(0, supRows.length - supSelesai - supTerjadwal);
  const supPct       = supRows.length > 0 ? Math.round((supSelesai / supRows.length) * 100) : 0;

  const pieData = [
    { name: 'Selesai', value: supSelesai, color: STATUS_COLORS.SELESAI },
    { name: 'Terjadwal', value: supTerjadwal, color: STATUS_COLORS.TERJADWAL },
    { name: 'Belum', value: supBelum, color: STATUS_COLORS.BELUM },
  ].filter(d => d.value > 0);

  const overload  = teachersLoad.filter(t => t.jp > STANDAR_MAX);
  const underload = teachersLoad.filter(t => t.jp < STANDAR_MIN);

  const perangkatStats = useMemo(() => {
    const list = safeArr<{ status?: string; guru_id?: string }>(perangkatR);
    const total = list.length;
    const approved = list.filter(p => p.status?.toUpperCase() === 'APPROVED').length;
    const rejected = list.filter(p => p.status?.toUpperCase() === 'REJECTED').length;
    const pending = Math.max(0, total - approved - rejected);
    
    const uniqueApprovedTeachers = new Set(
      list.filter(p => p.status?.toUpperCase() === 'APPROVED' && p.guru_id)?.map(p => p.guru_id)
    );
    
    const teachersCount = activeEducators.length;
    const pctCompleteness = teachersCount > 0 
      ? Math.round((uniqueApprovedTeachers.size / teachersCount) * 100) 
      : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      pctCompleteness,
      uniqueApprovedTeachersCount: uniqueApprovedTeachers.size
    };
  }, [perangkatR, activeEducators]);

  const recentPerangkat = useMemo((): PerangkatRecentItem[] => {
    return safeArr<PerangkatRecentItem>(perangkatR).slice(0, 5);
  }, [perangkatR]);

  const conflicts = useMemo(() => {
    return detectConflicts(safeArr<JadwalEntry>(jwR)).slice(0, 15);
  }, [jwR]);

  const recentSup: SupervisiRecentItem[] = [...supRows]
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .slice(0, 5);

  const headerDesc = [semNama, tpTahun ? `TP ${tpTahun}` : ''].filter(Boolean).join(' — ')
    || 'Analitik beban belajar, supervisi guru, dan perencanaan akademik';

  /* ── ──────────────────────────────────────────────────────────────────────
     TV MODE
  ──────────────────────────────────────────────────────────────────────── */
  if (isTvMode) {
    return (
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white font-bold">Memuat Kurikulum TV Mode...</div>}>
        <KurikulumTvModeLayout
          lastRefresh={lastRefresh}
          setLastRefresh={setLastRefresh}
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          semNama={semNama}
          tpTahun={tpTahun}
          totalGuru={totalGuru}
          totalKelas={totalKelas}
          totalMapel={totalMapel}
          totalJpMinggu={totalJpMinggu}
          distribusi={distribusi}
          beban={beban}
          perangkatStats={perangkatStats}
          supervisiStats={supervisiStats}
          bebanPerGuru={bebanPerGuru}
          conflicts={conflicts}
          activeEducators={activeEducators}
          perangkatR={perangkatR}
          supervisiR={supervisiR}
          jadwalR={jadwalR}
          guruR={guruR}
          lStr={lStr}
          lSup={lSup}
          lPrk={lPrk}
          lJad={lJad}
          isVocational={isVocational}
          refetchAll={refetchAll}
        />
      </Suspense>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────
     NORMAL MODE
  ──────────────────────────────────────────────────────────────────────── */
  const [curriculumTab, setCurriculumTab] = useState<'overview' | 'beban' | 'perangkat' | 'supervisi'>('overview');
  const navigate = useNavigate();

  const teachersPendingPerangkat = useMemo(() => {
    const list = safeArr<{ status?: string; guru_id?: string }>(perangkatR);
    const approvedGuruIds = new Set(
      list.filter(p => p.status?.toUpperCase() === 'APPROVED' && p.guru_id)?.map(p => p.guru_id)
    );
    return activeEducators
      .filter(g => !approvedGuruIds.has(g.id))
      ?.map(g => ({
        id: g.id,
        nama: g.nama_guru,
        nip: (g as Record<string, unknown>).nip || '-',
        hasSubmitted: list.some(p => p.guru_id === g.id),
      }));
  }, [activeEducators, perangkatR]);

  const metricsData = [
    {
      label: 'Semester Aktif',
      value: semNama || '—',
      sub: tpTahun ? `TP ${tpTahun}` : 'Tahun Pelajaran',
      icon: CalendarDays,
      color: 'teal',
      loading: lSem,
      onClick: () => navigate('/academic/semester'),
    },
    {
      label: 'Guru Pendidik',
      value: totalGuru > 0 ? `${totalGuru}` : '—',
      sub: 'Pendidik aktif mengajar',
      icon: Users,
      color: 'blue',
      loading: lGuru,
      onClick: () => navigate('/academic/guru'),
    },
    {
      label: 'Rombongan Belajar',
      value: totalKelas > 0 ? `${totalKelas}` : '—',
      sub: 'Kelas terdaftar aktif',
      icon: LayoutGrid,
      color: 'purple',
      loading: lKelas,
      onClick: () => navigate('/academic/kelas'),
    },
    {
      label: 'Mata Pelajaran',
      value: totalMapel > 0 ? `${totalMapel}` : '—',
      sub: 'Struktur kurikulum aktif',
      icon: BookOpen,
      color: 'amber',
      loading: lMapel,
      onClick: () => navigate('/academic/mapel'),
    },
  ];

  return (
    <AcademicPageLayout
      breadcrumbs={[]}
      instruction={instruction}
      hardeningModuleKey="kurikulum_dashboard"
      topSlot={<WorkspaceAppLauncherCard workspaceId="KURIKULUM_WORKSPACE" />}
    >
      <div className="space-y-6 pt-1">

        {/* 1. HERO UNIFIED BLOCK METRICS CONTAINER */}
        <div className="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            {metricsData?.map((m, idx) => {
              const Icon = m.icon;
              const colorStyles: Record<string, { bg: string; text: string; ring: string }> = {
                teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-500/20' },
                blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' },
                purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' },
                amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
              };
              const style = colorStyles[m.color] || colorStyles.teal;

              return (
                <div
                  key={idx}
                  onClick={m.onClick}
                  className={cn(
                    "flex flex-col justify-between p-3 sm:p-4 rounded-2xl transition-all cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    idx % 2 === 1 && "pt-3 sm:pt-4",
                    idx >= 2 && "pt-3 sm:pt-4"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                      {m.label}
                    </span>
                    <div className={cn("p-2 rounded-xl ring-1 transition-transform group-hover:scale-110", style.bg, style.text, style.ring)}>
                      <Icon size={16} />
                    </div>
                  </div>

                  <div>
                    {m.loading ? (
                      <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg my-1" />
                    ) : (
                      <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                        {m.value}
                      </div>
                    )}
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {m.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* 3. SUB-TAB SWITCHER */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Ringkasan & KBM Live', icon: Activity },
            { id: 'beban', label: 'Beban JP & Konflik', icon: TrendingUp },
            { id: 'perangkat', label: 'Perangkat Ajar Guru', icon: FileText, badge: teachersPendingPerangkat.length > 0 ? `${teachersPendingPerangkat.length}` : undefined },
            { id: 'supervisi', label: 'Supervisi Akademik', icon: ShieldCheck },
          ]?.map((tab) => {
            const Icon = tab.icon;
            const active = curriculumTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurriculumTab(tab.id as Record<string, unknown>)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ==========================================
            TAB CONTENT: OVERVIEW (RINGKASAN & KBM LIVE)
            ========================================== */}
        {(curriculumTab === 'overview' || curriculumTab === 'beban') && (
          <div className="space-y-6">
            {/* Charts (Distribusi JP & Beban JP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribusi JP */}
              <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between min-h-[360px]">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      {isVocational ? 'Distribusi JP per Jurusan / Kelompok' : 'Beban JP per Kelas / Tingkat'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isVocational 
                        ? 'Total jam pelajaran per minggu dari struktur kurikulum aktif' 
                        : 'Total alokasi jam pelajaran per minggu di setiap tingkat kelas'
                      }
                    </p>
                  </div>
                  <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-2xl">
                    <TrendingUp size={15} className="text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
                <div className="h-64 flex-1"><DistribusiChart data={distribusi} loading={lStr} /></div>
              </Card>

              {/* Beban JP */}
              <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between min-h-[360px]">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Beban JP per Kelompok Mapel
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total alokasi jam pelajaran per kelompok mata pelajaran aktif</p>
                  </div>
                  <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-2xl">
                    <Activity size={15} className="text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div className="h-64 flex-1">
                  {lStr ? (
                    <div className="h-full flex items-end gap-3 animate-pulse">
                      {[...Array(6)]?.map((_, i) => <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg" style={{ height: `${35 + i * 10}%` }} />)}
                    </div>
                  ) : beban.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis dataKey="nama" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipContentStyle} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                        <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                          {beban?.map((b, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                          <LabelList dataKey="jp" position="top" style={chartLabelStyle} formatter={(v: number) => `${v} JP`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Belum ada data struktur kurikulum" />
                  )}
                </div>
              </Card>
            </div>

            {/* LIVE KBM MONITORING */}
            {curriculumTab === 'overview' && <MonitoringKbmWidget />}
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: BEBAN & KONFLIK JADWAL
            ========================================== */}
        {(curriculumTab === 'overview' || curriculumTab === 'beban') && (
          <div className="space-y-6">
            {/* Resolusi Konflik (Beban + Bentrok) */}
            <Card className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-6 min-h-[360px] flex flex-col justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Resolusi Konflik & Beban Mengajar Guru
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Verifikasi otomatis kelebihan/kekurangan jam mengajar & bentrok jadwal KBM</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Left Column: Overload/Underload */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notifikasi Beban Guru</h4>
                    {overload.length === 0 && underload.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Semua Normal</p>
                        <p className="text-[9px] text-slate-400">Beban mengajar dalam rentang standar ({STANDAR_MIN}–{STANDAR_MAX} JP)</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {overload.length > 0 && (
                          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase mb-2">Overload ({overload.length} Guru)</p>
                            {overload?.slice(0, 5)?.map((g, i) => (
                              <div key={i} className="flex justify-between items-center py-0.5">
                                <span className="text-[10px] text-rose-700 dark:text-rose-300 truncate max-w-[65%]">{g.nama}</span>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full">{g.jp}JP</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {underload.length > 0 && (
                          <div className="p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-2">Underload ({underload.length} Guru)</p>
                            {underload?.slice(0, 5)?.map((g, i) => (
                              <div key={i} className="flex justify-between items-center py-0.5">
                                <span className="text-[10px] text-amber-700 dark:text-amber-300 truncate max-w-[65%]">{g.nama}</span>
                                <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">{g.jp}JP</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Schedule Conflicts */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bentrok Jadwal KBM</h4>
                    {conflicts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Jadwal 100% Aman</p>
                        <p className="text-[9px] text-slate-400">Tidak terdeteksi bentrok ruangan, kelas, maupun jam guru.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {conflicts?.map((conflict, i) => (
                          <div key={i} className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-2">
                            <AlertTriangle size={12} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">{conflict.type} Bentrok</p>
                              <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{conflict.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0 mt-4">
                * Peringatan beban dan bentrok dihasilkan otomatis dari verifikasi data Jadwal KBM aktif.
              </div>
            </Card>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: PERANGKAT AJAR GURU
            ========================================== */}
        {(curriculumTab === 'overview' || curriculumTab === 'perangkat') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 min-h-[360px]">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Statistik Perangkat Ajar
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Persentase kelengkapan administrasi guru</p>
                  </div>
                </div>
                <PerangkatPanel stats={perangkatStats} recent={recentPerangkat} loading={lPerangkat} teachersCount={totalGuru} />
              </Card>

              <Card className="lg:col-span-2 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 min-h-[360px] flex flex-col justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Radar Kelengkapan Modul Guru
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {teachersPendingPerangkat.length} Guru Belum Lengkap
                    </span>
                  </div>

                  {teachersPendingPerangkat.length > 0 ? (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {teachersPendingPerangkat.slice(0, 6)?.map((tp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate">{tp.nama}</h5>
                            <p className="text-[10px] text-slate-400 font-mono">NIP: {tp.nip}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0",
                            tp.hasSubmitted ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          )}>
                            {tp.hasSubmitted ? 'Menunggu ACC' : 'Belum Unggah'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                      <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">Seluruh Guru Sudah Melengkapi Administrasi</h4>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">100% dokumen ajar telah disetujui untuk semester ini.</p>
                    </div>
                  )}

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3 mt-2">
                    <div className="p-1.5 bg-indigo-500 text-white rounded-lg flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Status Verifikasi Administrasi</h4>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">Sistem secara otomatis mendeteksi kepatuhan administrasi. Pastikan seluruh dokumen ajar berstatus "Disetujui" agar validasi kurikulum dinilai 100%.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: SUPERVISI AKADEMIK
            ========================================== */}
        {(curriculumTab === 'overview' || curriculumTab === 'supervisi') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Progress Supervisi */}
              <Card className="lg:col-span-1 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 min-h-[360px]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Progress Supervisi
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monitoring kegiatan pembelajaran guru</p>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                    <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} hasPermission={hasSupervisiAccess} />
              </Card>

              {/* Panduan Supervisi & Quick Action */}
              <Card className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-6 min-h-[360px] flex flex-col justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                        Instrumen & Hasil Penilaian Supervisi
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Observasi kelas, instrumen penilaian proses KBM, dan tindak lanjut pembinaan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                      <span className="text-[10px] font-black text-emerald-600 uppercase block">Tuntas Dinilai</span>
                      <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{supSelesai} Guru</h4>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                      <span className="text-[10px] font-black text-amber-600 uppercase block">Terjadwal</span>
                      <h4 className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">{supTerjadwal} Sesi</h4>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase block">Belum Dijadwalkan</span>
                      <h4 className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{supBelum} Guru</h4>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 mt-4">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white">Alur Pelaksanaan Supervisi Akademik:</h5>
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
                      <li>Penetapan jadwal observasi tatap muka di kelas bersama guru bersangkutan.</li>
                      <li>Pengisian instrumen kurikulum berbasis rubrik kompetensi pedagogik & profesional.</li>
                      <li>Pemberian umpan balik konstruktif dan rekomendasi pengembangan keprofesian berkelanjutan (PKB).</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/kurikulum/supervisi')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <span>Buka Jadwal & Instrumen Supervisi</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
}
