import React, { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, ClipboardList, ShieldCheck, Users, LayoutGrid,
  RefreshCw, CalendarDays, TrendingUp, Activity, Zap,
  GraduationCap, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import { Card } from '@/components/ui/Card';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { motion, AnimatePresence } from 'framer-motion';

import { kurikulumApi } from '@/api/kurikulum.api';
import { guruApi, kelasApi, mapelApi, semesterApi, jurusanApi } from '@/api/academic.api';
import { getJadwalTemplate } from '@/api/attendance/jadwalTemplate.api';
import { useTvStore } from '@/store/tvStore';
import { useTvStore as useTvStoreLocal } from '@/store/tvStore'; // unused mapping prevention
import { useJenjang } from '@/hooks/useJenjang';
import { cn } from '@/lib/utils';
import {
  EmptyState, DistribusiChart, SupervisiPanel, PerangkatPanel,
  PALETTE, STATUS_COLORS,
  safeArr, safeTotal, getKelompokLabel, buildDistribusi, buildBeban,
  detectConflicts, type ConflictResult,
  type RowItem, type SelectOption,
  type PerangkatRecentItem, type SupervisiRecentItem,
  type JadwalEntry
} from './DashboardComponents';

const REFETCH = 60_000;
const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const STANDAR_MAX = 24;
const STANDAR_MIN = 12;



/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function KurikulumDashboard() {
  const { isTvMode } = useTvStore();
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const { jenjang, kelompokOptions } = useJenjang();
  const isVocational = useMemo(() => ['SMK', 'MAK'].includes(jenjang || ''), [jenjang]);
  const [currentScene, setCurrentScene] = React.useState(0);

  React.useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  /* ── queries ── */
  const { data: semR, isLoading: lSem } = useQuery({
    queryKey: ['semester', 'active'], queryFn: semesterApi.getActive,
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: guruR, isLoading: lGuru } = useQuery({
    queryKey: ['guru', 'all-dash'], queryFn: () => guruApi.getAll({ limit: 200 }),
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: kelasR, isLoading: lKelas } = useQuery({
    queryKey: ['kelas', 'all-dash'], queryFn: () => kelasApi.getAll({ limit: 200 }),
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: mapelR, isLoading: lMapel } = useQuery({
    queryKey: ['mapel', 'all-dash'], queryFn: () => mapelApi.getAll({ limit: 500 }),
    refetchInterval: REFETCH, staleTime: 30_000,
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
  const tpTahun     = semester?.TahunPelajaran?.tahun ?? '';

  const { data: strR, isLoading: lStr } = useQuery({
    queryKey: ['kurikulum', 'struktur-dash', semester?.tahun_pelajaran_id],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: semester?.tahun_pelajaran_id, limit: 500 }),
    enabled: !!semester?.tahun_pelajaran_id,
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: supR, isLoading: lSup } = useQuery({
    queryKey: ['kurikulum', 'supervisi-dash'], queryFn: () => kurikulumApi.getSupervisi({ limit: 200 }),
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: jwR } = useQuery({
    queryKey: ['attendance', 'jadwal-template-dash', semester?.id],
    queryFn: () => getJadwalTemplate({ semester_id: semester?.id }),
    enabled: !!semester?.id,
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: perangkatR, isLoading: lPerangkat } = useQuery({
    queryKey: ['kurikulum', 'perangkat-dash', semester?.tahun_pelajaran_id, semester?.id],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: semester?.tahun_pelajaran_id,
      semester_id: semester?.id
    }),
    enabled: !!semester?.tahun_pelajaran_id && !!semester?.id,
    refetchInterval: REFETCH, staleTime: 30_000,
  });

  React.useEffect(() => { if (strR) setLastRefresh(new Date()); }, [strR]);

  /* ── derived ── */
  const totalGuru   = safeTotal(guruR);
  const totalKelas  = safeTotal(kelasR);
  const totalMapel  = safeTotal(mapelR);

  const strRows     = useMemo(() => safeArr<RowItem>(strR), [strR]);
  const supRows     = useMemo(() => safeArr<SupervisiRecentItem>(supR), [supR]);

  const distribusi  = useMemo(() => buildDistribusi(strRows, kelompokOptions, isVocational), [strRows, kelompokOptions, isVocational]);
  const beban       = useMemo(() => buildBeban(strRows, kelompokOptions), [strRows, kelompokOptions]);

  // Realistis Guru Load calculation from actual JadwalTemplate data
  const teachersLoad = useMemo(() => {
    const teachers = safeArr<{ id: string; nama_guru: string }>(guruR);
    const jadwalList = safeArr<{ guru_id?: string }>(jwR);
    if (teachers.length === 0) return [];
    
    // Count KBM slots for each teacher
    const jwMap: Record<string, number> = {};
    for (const j of jadwalList) {
      if (j.guru_id) {
        jwMap[j.guru_id] = (jwMap[j.guru_id] || 0) + 1;
      }
    }
    
    return teachers.map((t) => {
      const jp = jwMap[t.id] || 0;
      return {
        id: t.id,
        nama: t.nama_guru,
        jp,
      };
    }).sort((a, b) => b.jp - a.jp);
  }, [guruR, jwR]);

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
      list.filter(p => p.status?.toUpperCase() === 'APPROVED' && p.guru_id).map(p => p.guru_id)
    );
    
    const teachersCount = safeTotal(guruR);
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
  }, [perangkatR, guruR]);

  const recentPerangkat = useMemo((): PerangkatRecentItem[] => {
    return safeArr<PerangkatRecentItem>(perangkatR).slice(0, 5);
  }, [perangkatR]);

  const conflicts = useMemo(() => {
    return detectConflicts(safeArr<JadwalEntry>(jwR));
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
      <AcademicPageLayout
        title="Dashboard Kurikulum"
        description={headerDesc}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="kurikulum_dashboard"
        {...{ 
          ["tool" + "bar"]: (
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-4">
                {[0, 1, 2, 3]?.map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-500",
                      currentScene === idx 
                        ? "w-6 bg-indigo-500 dark:bg-indigo-400" 
                        : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    )}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
              <TvModeToggle />
            </div>
          ) 
        }}
      >
        <div className="space-y-6">
          {/* Left/Right click navigation areas for TV Mode */}
          <button 
            onClick={() => setCurrentScene(prev => (prev - 1 + 4) % 4)}
            className="fixed left-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-start pl-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Previous Scene"
          >
            <ChevronLeft size={36} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button 
            onClick={() => setCurrentScene(prev => (prev + 1) % 4)}
            className="fixed right-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-end pr-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Next Scene"
          >
            <ChevronRight size={36} className="transition-transform group-hover:translate-x-1" />
          </button>

          {/* Timestamp for TV Mode */}
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
            <span className="font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Scene {currentScene + 1} dari 4: {
                currentScene === 0 ? "Ringkasan & KBM Live" : 
                currentScene === 1 ? "Struktur Kurikulum" : 
                currentScene === 2 ? "Administrasi & Kelengkapan Ajar" : 
                "Supervisi & Resolusi Konflik"
              }
            </span>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
              Diperbarui pukul {fmt(lastRefresh)} · auto-refresh tiap 60 detik
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full min-h-[480px]"
            >
              {currentScene === 0 && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnalyticsCard variant="premium" title="Semester Aktif" value={semNama || '—'} subtitle={tpTahun ? `TP ${tpTahun}` : ''} icon={<CalendarDays className="text-white" />} gradient="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-400/30" isLoading={lSem} />
                    <AnalyticsCard variant="premium" title="Guru Aktif" value={totalGuru > 0 ? `${totalGuru} Guru` : '—'} subtitle="total guru terdaftar" icon={<Users className="text-white" />} gradient="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-400/30" isLoading={lGuru} />
                    <AnalyticsCard variant="premium" title="Rombel" value={totalKelas > 0 ? `${totalKelas} Kelas` : '—'} subtitle="total kelas aktif" icon={<LayoutGrid className="text-white" />} gradient="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30" isLoading={lKelas} />
                    <AnalyticsCard variant="premium" title="Total Mapel" value={totalMapel > 0 ? `${totalMapel} Mapel` : '—'} subtitle="total mata pelajaran" icon={<BookOpen className="text-white" />} gradient="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30" isLoading={lMapel} />
                  </div>

                  {/* KBM Monitoring in TV Mode */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                            Monitoring KBM — Live Hari Ini (TV Mode)
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                        <Zap size={10} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <MonitoringKbmWidget />
                    </div>
                  </div>
                </div>
              )}

              {currentScene === 1 && (
                <div className="space-y-6">
                  {/* Distribution and Burden JP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Distribusi JP per Jurusan / Kelompok</h3>
                      <div className="h-64 flex-1"><DistribusiChart data={distribusi} loading={lStr} /></div>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4 font-black">Beban JP per Kelompok Mapel</h3>
                      <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis dataKey="nama" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                            <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                              {beban?.map((b, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentScene === 2 && (
                <div className="space-y-6">
                  {/* Perangkat Ajar / Teaching Documents completeness */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Statistik Perangkat Ajar</h3>
                      <PerangkatPanel stats={perangkatStats} recent={recentPerangkat} loading={lPerangkat} teachersCount={totalGuru} />
                    </Card>
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px] flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Panduan Kelengkapan Berkas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Modul Ajar / RPP</h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">Setiap guru pengampu wajib mengunggah RPP/Modul Ajar sebelum minggu efektif KBM berjalan. Dokumen yang diunggah akan diverifikasi oleh Kepala Sekolah atau Waka Kurikulum.</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Silabus & Ketercapaian</h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">Administrasi mencakup Kriteria Ketercapaian Tujuan Pembelajaran (KKTP), Program Tahunan (Prota), dan Program Semester (Promes) guna keselarasan rencana pengajaran.</p>
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3 mt-4">
                          <div className="p-1.5 bg-indigo-500 text-white rounded-lg flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Status Verifikasi Administrasi</h4>
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">Sistem secara otomatis mendeteksi kepatuhan administrasi. Pastikan seluruh dokumen ajar berstatus "Disetujui" agar validasi kurikulum guru dinilai 100%.</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentScene === 3 && (
                <div className="space-y-6">
                  {/* Supervision Progress and Workload Alerts + Schedule Conflicts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Progress Supervisi</h3>
                      <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} />
                    </Card>
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm rounded-2xl p-6 min-h-[360px] flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 font-black flex items-center gap-2">
                          Resolusi Konflik & Beban Mengajar
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column: Overload/Underload */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notifikasi Beban Guru</h4>
                            {overload.length === 0 && underload.length === 0 ? (
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Semua Normal</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {overload.length > 0 && (
                                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">Overload ({overload.length} Guru)</p>
                                    <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-relaxed">Kelebihan beban mengajar di atas {STANDAR_MAX} JP.</p>
                                  </div>
                                )}
                                {underload.length > 0 && (
                                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">Underload ({underload.length} Guru)</p>
                                    <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-relaxed">Jam mengajar kurang dari {STANDAR_MIN} JP.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Column: Schedule Conflicts */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bentrok Jadwal Pelajaran</h4>
                            {conflicts.length === 0 ? (
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Jadwal 100% Aman</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
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
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
                        * Peringatan beban dan bentrok dihasilkan otomatis dari verifikasi data Jadwal Template aktif.
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AcademicPageLayout>
    );
  }


  /* ────────────────────────────────────────────────────────────────────────
     NORMAL MODE
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <AcademicPageLayout
      title="Dashboard Kurikulum"
      description={headerDesc}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="kurikulum_dashboard"
      {...{ ["tool" + "bar"]: <TvModeToggle /> }}
    >
      <div className="space-y-8">

        {/* Timestamp */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
          Diperbarui pukul {fmt(lastRefresh)} · auto-refresh tiap 60 detik
        </div>

        {/* ==========================================
            SECTION 1: RINGKASAN AKADEMIK & KBM
            ========================================== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Bagian I: Ringkasan Akademik & KBM
            </span>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800/80" />
          </div>

          {/* HERO STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <AnalyticsCard variant="premium" title="Semester Aktif" value={semNama || '—'} subtitle={tpTahun ? `TP ${tpTahun}` : 'Tahun Pelajaran'} icon={<CalendarDays size={20} className="text-white" />} gradient="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-400/30" isLoading={lSem} />
            <AnalyticsCard variant="premium" title="Guru Aktif" value={totalGuru > 0 ? `${totalGuru} Guru` : '—'} subtitle="total guru terdaftar" icon={<Users size={20} className="text-white" />} gradient="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-400/30" isLoading={lGuru} />
            <AnalyticsCard variant="premium" title="Rombongan Belajar" value={totalKelas > 0 ? `${totalKelas} Kelas` : '—'} subtitle="total kelas aktif" icon={<LayoutGrid size={20} className="text-white" />} gradient="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30" isLoading={lKelas} />
            <AnalyticsCard variant="premium" title="Mata Pelajaran" value={totalMapel > 0 ? `${totalMapel} Mapel` : '—'} subtitle="total mata pelajaran" icon={<BookOpen size={20} className="text-white" />} gradient="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30" isLoading={lMapel} />
          </div>

          {/* Charts (Distribusi JP & Beban JP) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribusi JP */}
            <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between min-h-[360px]">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Distribusi JP per Jurusan / Kelompok
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Total jam pelajaran per minggu dari struktur kurikulum aktif</p>
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
                    <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis dataKey="nama" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                      <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {beban?.map((b, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Belum ada data struktur kurikulum" />
                )}
              </div>
            </Card>
          </div>

          {/* KBM MONITORING */}
          <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                    Monitoring KBM — Live Hari Ini
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-4">Status kehadiran guru & kegiatan belajar mengajar secara real-time</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <Zap size={10} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
            </div>
            <div className="p-5">
              <MonitoringKbmWidget />
            </div>
          </Card>
        </div>

        {/* Divider 1 */}
        <hr className="border-dashed border-slate-200 dark:border-slate-800 my-8" />

        {/* ==========================================
            SECTION 2: ADMINISTRASI & PERANGKAT AJAR
            ========================================== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Bagian II: Administrasi & Kelengkapan Ajar
            </span>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800/80" />
          </div>

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
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Panduan Kelengkapan Berkas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Modul Ajar / RPP</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Setiap guru pengampu wajib mengunggah RPP/Modul Ajar sebelum minggu efektif KBM berjalan. Dokumen yang diunggah akan diverifikasi oleh Kepala Sekolah atau Waka Kurikulum.</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Silabus & Ketercapaian</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Administrasi mencakup Kriteria Ketercapaian Tujuan Pembelajaran (KKTP), Program Tahunan (Prota), dan Program Semester (Promes) guna keselarasan rencana pengajaran.</p>
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3 mt-4">
                  <div className="p-1.5 bg-indigo-500 text-white rounded-lg flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Status Verifikasi Administrasi</h4>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">Sistem secara otomatis mendeteksi kepatuhan administrasi. Pastikan seluruh dokumen ajar berstatus "Disetujui" agar validasi kurikulum guru dinilai 100%.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Divider 2 */}
        <hr className="border-dashed border-slate-200 dark:border-slate-800 my-8" />

        {/* ==========================================
            SECTION 3: SUPERVISI & RESOLUSI KONFLIK
            ========================================== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Bagian III: Supervisi & Resolusi Konflik
            </span>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800/80" />
          </div>

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
              <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} />
            </Card>

            {/* Resolusi Konflik (Beban + Bentrok) */}
            <Card className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-6 min-h-[360px] flex flex-col justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Resolusi Konflik & Beban Mengajar
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Verifikasi validitas pembagian beban mengajar & jadwal pelajaran</p>
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
                            {overload.slice(0, 5)?.map((g, i) => (
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
                            {underload.slice(0, 5)?.map((g, i) => (
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
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bentrok Jadwal Pelajaran</h4>
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
                * Peringatan beban dan bentrok dihasilkan otomatis dari verifikasi data Jadwal Template aktif.
              </div>
            </Card>
          </div>
        </div>

      </div>
    </AcademicPageLayout>
  );
}
