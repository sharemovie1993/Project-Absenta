import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, ClipboardList, ShieldCheck, Users, LayoutGrid,
  RefreshCw, CalendarDays, TrendingUp, Activity, Zap,
  GraduationCap, Clock, CheckCircle2, AlertTriangle, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';

import { kurikulumApi } from '@/api/kurikulum.api';
import { guruApi, kelasApi, mapelApi, semesterApi, jurusanApi } from '@/api/academic.api';
import { useTvStore } from '@/store/tvStore';
import { cn } from '@/lib/utils';

const REFETCH = 60_000;
const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */
const safeArr = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  return [];
};

const safeTotal = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.total === 'number') return v.total;
  if (typeof v?.pagination?.total === 'number') return v.pagination.total;
  if (Array.isArray(v?.data)) return v.data.length;
  if (Array.isArray(v)) return v.length;
  return 0;
};

/* ── Color palette ───────────────────────────────────────────────────────── */
const PALETTE = ['#0f766e','#0284c7','#7c3aed','#d97706','#be123c','#0369a1','#059669','#9333ea'];
const STANDAR_MAX = 24;
const STANDAR_MIN = 12;

/* ── Derive distribusi JP per Jurusan dari data struktur ─────────────────── */
function buildDistribusi(rows: any[]) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = r.Jurusan?.nama ?? r.kelompok ?? (r.tingkat ? `Tingkat ${r.tingkat}` : 'Umum');
    map[k] = (map[k] || 0) + (r.jp_per_minggu || 0);
  }
  return Object.entries(map).map(([name, jp]) => ({ name, jp })).sort((a, b) => b.jp - a.jp);
}

/* ── Derive beban per kelompok ───────────────────────────────────────────── */
function buildBeban(rows: any[]) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = r.kelompok ?? r.Jurusan?.nama ?? 'Umum';
    map[k] = (map[k] || 0) + (r.jp_per_minggu || 0);
  }
  return Object.entries(map).map(([nama, jp]) => ({ nama, jp })).sort((a, b) => b.jp - a.jp);
}

/* ── Pie colors per status supervisi ─────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  SELESAI: '#10b981', TERJADWAL: '#f59e0b', BELUM: '#cbd5e1',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function KurikulumDashboard() {
  const { isTvMode } = useTvStore();
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

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
  const { data: strR, isLoading: lStr } = useQuery({
    queryKey: ['kurikulum', 'struktur-dash'], queryFn: () => kurikulumApi.getStruktur({ limit: 500 }),
    refetchInterval: REFETCH, staleTime: 30_000,
  });
  const { data: supR, isLoading: lSup } = useQuery({
    queryKey: ['kurikulum', 'supervisi-dash'], queryFn: () => kurikulumApi.getSupervisi({ limit: 200 }),
    refetchInterval: REFETCH, staleTime: 30_000,
  });

  React.useEffect(() => { if (strR) setLastRefresh(new Date()); }, [strR]);

  /* ── derived ── */
  const semester    = (semR as any)?.data ?? null;
  const semNama     = semester?.nama_semester ?? '';
  const tpTahun     = (semester?.TahunPelajaran as any)?.tahun ?? '';

  const totalGuru   = safeTotal(guruR);
  const totalKelas  = safeTotal(kelasR);
  const totalMapel  = safeTotal(mapelR);

  const strRows     = useMemo(() => safeArr(strR), [strR]);
  const supRows     = useMemo(() => safeArr(supR), [supR]);

  const distribusi  = useMemo(() => buildDistribusi(strRows), [strRows]);
  const beban       = useMemo(() => buildBeban(strRows), [strRows]);

  const supSelesai   = supRows.filter(r => r.status?.toUpperCase() === 'SELESAI').length;
  const supTerjadwal = supRows.filter(r => r.status?.toUpperCase() === 'TERJADWAL').length;
  const supBelum     = Math.max(0, supRows.length - supSelesai - supTerjadwal);
  const supPct       = supRows.length > 0 ? Math.round((supSelesai / supRows.length) * 100) : 0;

  const pieData = [
    { name: 'Selesai', value: supSelesai, color: STATUS_COLORS.SELESAI },
    { name: 'Terjadwal', value: supTerjadwal, color: STATUS_COLORS.TERJADWAL },
    { name: 'Belum', value: supBelum, color: STATUS_COLORS.BELUM },
  ].filter(d => d.value > 0);

  const overload  = beban.filter(b => b.jp > STANDAR_MAX);
  const underload = beban.filter(b => b.jp < STANDAR_MIN);

  const recentSup = [...supRows]
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    .slice(0, 5);

  const headerDesc = [semNama, tpTahun ? `TP ${tpTahun}` : ''].filter(Boolean).join(' — ')
    || 'Analitik beban belajar, supervisi guru, dan perencanaan akademik';

  /* ────────────────────────────────────────────────────────────────────────
     RENDER HELPERS
  ──────────────────────────────────────────────────────────────────────── */
  const StatCard = ({
    label, value, sub, icon, grad, iconColor, loading,
  }: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; grad: string; iconColor: string; loading?: boolean;
  }) => (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5 flex items-center gap-4',
      'shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group cursor-default',
      grad,
    )}>
      {/* Decorative circle */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 bg-white" />
      <div className={cn('flex-shrink-0 p-3.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform', iconColor)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80 truncate">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-20 bg-white/30 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-black tracking-tight mt-0.5 truncate">{value || '—'}</p>
        )}
        {sub && <p className="text-[10px] opacity-70 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );

  /* ────────────────────────────────────────────────────────────────────────
     TV MODE
  ──────────────────────────────────────────────────────────────────────── */
  if (isTvMode) {
    return (
      <AcademicPageLayout title="Dashboard Kurikulum" description={headerDesc} toolbar={<TvModeToggle />}>
        <div className="space-y-6">
          {/* Timestamp for TV Mode */}
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
            <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
            Diperbarui pukul {fmt(lastRefresh)} · auto-refresh tiap 60 detik
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Semester Aktif" value={semNama || '—'} sub={tpTahun ? `TP ${tpTahun}` : ''} icon={<CalendarDays size={22} className="text-white" />} grad="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-400/30" iconColor="bg-white/20" loading={lSem} />
            <StatCard label="Guru Aktif" value={totalGuru > 0 ? `${totalGuru} Guru` : '—'} sub="tenaga pengajar" icon={<Users size={22} className="text-white" />} grad="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-400/30" iconColor="bg-white/20" loading={lGuru} />
            <StatCard label="Rombel" value={totalKelas > 0 ? `${totalKelas} Kelas` : '—'} sub="kelas aktif" icon={<LayoutGrid size={22} className="text-white" />} grad="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30" iconColor="bg-white/20" loading={lKelas} />
            <StatCard label="Total Mapel" value={totalMapel > 0 ? `${totalMapel} Mapel` : '—'} sub="mata pelajaran" icon={<BookOpen size={22} className="text-white" />} grad="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30" iconColor="bg-white/20" loading={lMapel} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Distribusi JP per Jurusan</h3>
              <div className="h-60"><DistribusiChart data={distribusi} loading={lStr} /></div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Progress Supervisi</h3>
              <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} />
            </div>
          </div>

          {/* Beban JP & Alert in TV Mode */}
          {(strRows.length > 0 || lStr) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4 font-black">Beban JP per Kelompok Mapel</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis dataKey="nama" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                      <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {beban.map((b, i) => (
                          <Cell key={i} fill={b.jp > STANDAR_MAX ? '#f43f5e' : b.jp < STANDAR_MIN ? '#f59e0b' : '#0f766e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 font-black">Notifikasi Beban</h3>
                {overload.length === 0 && underload.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Semua Normal</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overload.length > 0 && (
                      <div className="p-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 rounded-lg">
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400">Overload ({overload.length})</p>
                      </div>
                    )}
                    {underload.length > 0 && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 rounded-lg">
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400">Underload ({underload.length})</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KBM Monitoring in TV Mode */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
      </AcademicPageLayout>
    );
  }


  /* ────────────────────────────────────────────────────────────────────────
     NORMAL MODE
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <AcademicPageLayout title="Dashboard Kurikulum" description={headerDesc} toolbar={<TvModeToggle />}>
      <div className="space-y-6">

        {/* Timestamp */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
          Diperbarui pukul {fmt(lastRefresh)} · auto-refresh tiap 60 detik
        </div>

        {/* ── HERO STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Semester Aktif" value={semNama || '—'} sub={tpTahun ? `Tahun Pelajaran ${tpTahun}` : 'Tahun Pelajaran'} icon={<CalendarDays size={20} className="text-white" />} grad="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-400/30" iconColor="bg-white/20" loading={lSem} />
          <StatCard label="Guru Aktif" value={totalGuru > 0 ? `${totalGuru} Guru` : '—'} sub="tenaga pengajar terdaftar" icon={<Users size={20} className="text-white" />} grad="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-400/30" iconColor="bg-white/20" loading={lGuru} />
          <StatCard label="Rombongan Belajar" value={totalKelas > 0 ? `${totalKelas} Kelas` : '—'} sub="kelas aktif semester ini" icon={<LayoutGrid size={20} className="text-white" />} grad="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30" iconColor="bg-white/20" loading={lKelas} />
          <StatCard label="Mata Pelajaran" value={totalMapel > 0 ? `${totalMapel} Mapel` : '—'} sub="mapel terdaftar kurikulum" icon={<BookOpen size={20} className="text-white" />} grad="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30" iconColor="bg-white/20" loading={lMapel} />
        </div>

        {/* ── CHART + SUPERVISI ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Distribusi JP — 3/5 */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  Distribusi JP per Jurusan / Kelompok
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Total jam pelajaran per minggu dari struktur kurikulum aktif</p>
              </div>
              <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                <TrendingUp size={15} className="text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div className="h-60"><DistribusiChart data={distribusi} loading={lStr} /></div>
          </div>

          {/* Supervisi Progress — 2/5 */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  Progress Supervisi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Monitoring kegiatan pembelajaran guru</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} />
          </div>
        </div>

        {/* ── BEBAN MENGAJAR + ALERT ── */}
        {(strRows.length > 0 || lStr) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Beban chart — 2/3 */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Beban JP per Kelompok Mapel
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />Merah &gt;{STANDAR_MAX}JP ·
                    <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mx-1" />Hijau Normal ·
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mx-1" />Kuning &lt;{STANDAR_MIN}JP
                  </p>
                </div>
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                  <Activity size={15} className="text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              {lStr ? (
                <div className="h-52 flex items-end gap-3 animate-pulse">
                  {[...Array(6)].map((_, i) => <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg" style={{ height: `${35 + i * 10}%` }} />)}
                </div>
              ) : beban.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                      <XAxis dataKey="nama" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                      <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {beban.map((b, i) => (
                          <Cell key={i} fill={b.jp > STANDAR_MAX ? '#f43f5e' : b.jp < STANDAR_MIN ? '#f59e0b' : '#0f766e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="Belum ada data struktur kurikulum" />
              )}
            </div>

            {/* Alert panel — 1/3 */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                Notifikasi Beban
              </h3>
              {lStr ? (
                <div className="space-y-3 animate-pulse">
                  {[0,1].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
                </div>
              ) : (overload.length === 0 && underload.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Semua Normal</p>
                  <p className="text-[10px] text-slate-400">Beban mengajar dalam rentang standar ({STANDAR_MIN}–{STANDAR_MAX} JP)</p>
                </div>
              ) : (
                <>
                  {overload.length > 0 && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                      <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Overload ({overload.length})
                      </p>
                      {overload.slice(0, 3).map((g, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5">
                          <span className="text-[10px] text-rose-700 dark:text-rose-300 truncate max-w-[65%]">{g.nama}</span>
                          <span className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full">{g.jp}JP</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {underload.length > 0 && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                      <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Underload ({underload.length})
                      </p>
                      {underload.slice(0, 3).map((g, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5">
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 truncate max-w-[65%]">{g.nama}</span>
                          <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">{g.jp}JP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── KBM MONITORING ── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
        </div>

      </div>
    </AcademicPageLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (co-located for simplicity)
═══════════════════════════════════════════════════════════════════════════ */

function DistribusiChart({ data, loading }: { data: { name: string; jp: number }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-full flex items-end gap-3 animate-pulse px-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg" style={{ height: `${30 + i * 14}%` }} />
        ))}
      </div>
    );
  }
  if (data.length === 0) return <EmptyState text="Belum ada data struktur kurikulum" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          formatter={(v: number) => [`${v} JP/minggu`, 'Total JP']}
        />
        <Bar dataKey="jp" radius={[5, 5, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SupervisiPanel({
  pct, pieData, selesai, terjadwal, belum, total, recent, loading,
}: {
  pct: number; pieData: any[]; selesai: number; terjadwal: number;
  belum: number; total: number; recent: any[]; loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-center"><div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
        {[0,1,2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
      </div>
    );
  }

  const formatTgl = (s: string) => {
    try { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); } catch { return s; }
  };

  return (
    <div className="space-y-4">
      {/* Donut + legend */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData.length ? pieData : [{ name: 'Kosong', value: 1, color: '#e2e8f0' }]}
                cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3}
                dataKey="value" strokeWidth={0}>
                {(pieData.length ? pieData : [{ color: '#e2e8f0' }]).map((e: any, i: number) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-black text-slate-800 dark:text-slate-100">{pct}%</span>
            <span className="text-[8px] text-slate-400 uppercase font-black">Selesai</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            { label: 'Selesai', val: selesai, dot: 'bg-emerald-500' },
            { label: 'Terjadwal', val: terjadwal, dot: 'bg-amber-400' },
            { label: 'Belum', val: belum, dot: 'bg-slate-300 dark:bg-slate-600' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', row.dot)} />
              <span className="text-[10px] text-slate-500">{row.label}</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 ml-auto">{row.val}</span>
            </div>
          ))}
          <p className="text-[9px] text-slate-400 font-black uppercase pt-1">Total: {total} supervisi</p>
        </div>
      </div>

      {/* Recent list */}
      <div className="space-y-1.5">
        {recent.length === 0 && <EmptyState text="Belum ada data supervisi" small />}
        {recent.map((item, i) => {
          const st = item.status?.toUpperCase();
          return (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  {item.Guru?.nama_guru ?? '—'}
                </p>
                <p className="text-[9px] text-slate-400">{item.mapel} · {formatTgl(item.tanggal)}</p>
              </div>
              <span className={cn(
                'ml-2 flex-shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full',
                st === 'SELESAI' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                st === 'TERJADWAL' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                'bg-slate-100 text-slate-500'
              )}>
                {st === 'SELESAI' ? 'Selesai' : st === 'TERJADWAL' ? 'Antrean' : 'Belum'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ text, small }: { text: string; small?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center gap-2', small ? 'py-4' : 'h-full min-h-[160px]')}>
      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <ClipboardList size={15} className="text-slate-400" />
      </div>
      <p className="text-xs text-slate-400 italic">{text}</p>
    </div>
  );
}
