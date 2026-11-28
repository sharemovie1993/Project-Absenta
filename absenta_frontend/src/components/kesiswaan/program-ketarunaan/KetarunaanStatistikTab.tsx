import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  Shield,
  Award,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PieChart as PieIcon,
  Flame,
  AlertTriangle,
  Layers,
  PhoneCall,
  UserCheck,
  CheckCircle2,
  Trophy,
  Medal,
  Crown,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { PersonPhoto } from '@/components/ui/PersonPhoto';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getKetarunaanStats,
  type KetarunaanTrendItem,
  type KetarunaanTarunaRankingItem,
} from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanStatistikTabProps {
  jadwalKegiatanId: string | null;
  tahunPelajaranId?: string;
  semesterId?: string;
  onNavigateTab?: (tabId: string) => void;
}

type ScopePeriode = '1_tahun' | '1_semester' | '1_bulan';
type RankingTabMode = 'global' | 'jurusan' | 'kelas';
type ModeAgenda = 'SEMUA_SIKLUS' | 'APEL_PAGI' | 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';

function formatBulanYm(ym: string) {
  if (!ym || ym === 'latest_30d') return '30 Hari Aktif Terakhir';
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function formatTanggal(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTanggalShort(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function deltaBadge(v?: number) {
  if (v === undefined || v === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-400">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  if (v > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
        <TrendingUp className="w-3 h-3" /> +{v.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
      <TrendingDown className="w-3 h-3" /> {v.toFixed(1)}%
    </span>
  );
}

// Warna Status Donut
const DONUT_COLORS: Record<string, string> = {
  HADIR: '#10b981',       // Emerald
  SAKIT: '#f59e0b',       // Amber
  IZIN: '#3b82f6',        // Blue
  ALPA: '#f43f5e',        // Rose
  DISPENSASI: '#a855f7',  // Purple
};

export const KetarunaanStatistikTab: React.FC<KetarunaanStatistikTabProps> = ({
  jadwalKegiatanId,
  tahunPelajaranId,
  semesterId,
  onNavigateTab,
}) => {
  const [scopePeriode, setScopePeriode] = useState<ScopePeriode>('1_tahun');
  const [selectedBulanYm, setSelectedBulanYm] = useState<string>('latest_30d');
  const [modeAgenda, setModeAgenda] = useState<ModeAgenda>('SEMUA_SIKLUS');
  const [showAllMeetings, setShowAllMeetings] = useState<boolean>(false);
  const [activeDetailPanel, setActiveDetailPanel] = useState<'ranking' | 'alpa' | 'log'>('ranking');
  const [showAllRankingRows, setShowAllRankingRows] = useState<boolean>(false);

  // State Hall of Fame & Peringkat Taruna Terbaik
  const [rankingTab, setRankingTab] = useState<RankingTabMode>('global');
  const [selectedRankingJurusanId, setSelectedRankingJurusanId] = useState<string>('ALL');
  const [selectedRankingKelasId, setSelectedRankingKelasId] = useState<string>('ALL');
  const [rankingSearch, setRankingSearch] = useState<string>('');
  const [showAllTiedGlobal, setShowAllTiedGlobal] = useState<boolean>(false);

  const scopeLabel = useMemo(() => {
    if (scopePeriode === '1_tahun') return '1 Tahun Pelajaran Penuh';
    if (scopePeriode === '1_semester') return '1 Semester Aktif';
    return `1 Bulan (${formatBulanYm(selectedBulanYm)})`;
  }, [scopePeriode, selectedBulanYm]);

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, scopePeriode, selectedBulanYm, modeAgenda, tahunPelajaranId, semesterId],
    queryFn: () => getKetarunaanStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      scope_periode: scopePeriode,
      bulan_ym: scopePeriode === '1_bulan' ? selectedBulanYm : undefined,
      mode_agenda: modeAgenda,
      tahun_pelajaran_id: tahunPelajaranId || undefined,
      semester_id: semesterId || undefined,
    }),
    staleTime: 60 * 1000,
  });

  const stats = data?.data;
  const agendaBreakdown = useMemo(() => stats?.agenda_breakdown ?? [], [stats?.agenda_breakdown]);
  const trendList = useMemo(() => stats?.trend ?? [], [stats?.trend]);
  const kelasList = useMemo(() => stats?.by_kelas ?? [], [stats?.by_kelas]);
  const tingkatList = useMemo(() => stats?.by_tingkat ?? [], [stats?.by_tingkat]);
  const ringkasan = stats?.ringkasan_periode;
  const statusBreakdown = stats?.status_breakdown;
  const byJurusan = useMemo(() => stats?.by_jurusan ?? [], [stats?.by_jurusan]);
  const polaHari = useMemo(() => stats?.pola_hari ?? [], [stats?.pola_hari]);
  const atRiskStudents = useMemo(() => stats?.at_risk_students ?? [], [stats?.at_risk_students]);
  const barometer = stats?.barometer_sertifikasi;
  const availableMonths = useMemo(() => stats?.available_months ?? [], [stats?.available_months]);
  const tarunaRanking = stats?.taruna_ranking;
  const rankingMeta = tarunaRanking?.ranking_metadata;

  // Daftar taruna yang ditampilkan di tabel Peringkat sesuai tab & filter
  const activeRankingRows = useMemo<KetarunaanTarunaRankingItem[]>(() => {
    if (!tarunaRanking) return [];
    let list: KetarunaanTarunaRankingItem[] = [];
    if (rankingTab === 'global') {
      list = showAllTiedGlobal
        ? (tarunaRanking.all_tied_global ?? tarunaRanking.top_global ?? [])
        : (tarunaRanking.top_global ?? []);
    } else if (rankingTab === 'jurusan') {
      if (selectedRankingJurusanId === 'ALL') {
        list = tarunaRanking.best_per_jurusan ?? [];
      } else {
        list = tarunaRanking.top_by_jurusan?.[selectedRankingJurusanId] ?? [];
      }
    } else {
      if (selectedRankingKelasId === 'ALL') {
        list = tarunaRanking.best_per_kelas ?? [];
      } else {
        list = tarunaRanking.top_by_kelas?.[selectedRankingKelasId] ?? [];
      }
    }

    if (rankingSearch.trim()) {
      const q = rankingSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.nama_siswa.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nama_kelas.toLowerCase().includes(q) ||
          s.nama_jurusan.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tarunaRanking, rankingTab, selectedRankingJurusanId, selectedRankingKelasId, rankingSearch, showAllTiedGlobal]);

  // Transform Data untuk Chart Recharts
  const chartTrendData = useMemo(() => {
    return trendList.map((t) => ({
      name: `#${t.sesi_ke}`,
      tanggal: formatTanggalShort(t.tanggal),
      tanggalFull: formatTanggal(t.tanggal),
      kehadiran: t.persen_hadir_siswa,
      pembina: t.persen_hadir_guru,
      hadir_siswa: t.hadir_siswa,
      total_siswa: t.total_siswa,
      benchmark: 85,
    }));
  }, [trendList]);

  // Transform Data Donut Status
  const donutData = useMemo(() => {
    if (!statusBreakdown || statusBreakdown.total === 0) return [];
    return [
      { name: 'HADIR', label: 'Hadir Tepat', value: statusBreakdown.HADIR, color: DONUT_COLORS.HADIR },
      { name: 'SAKIT', label: 'Sakit', value: statusBreakdown.SAKIT, color: DONUT_COLORS.SAKIT },
      { name: 'IZIN', label: 'Izin', value: statusBreakdown.IZIN, color: DONUT_COLORS.IZIN },
      { name: 'ALPA', label: 'Alpa / Mangkir', value: statusBreakdown.ALPA, color: DONUT_COLORS.ALPA },
      { name: 'DISPENSASI', label: 'Dispensasi', value: statusBreakdown.DISPENSASI, color: DONUT_COLORS.DISPENSASI },
    ].filter((d) => d.value > 0);
  }, [statusBreakdown]);

  // Sorting rombel kelas (Top 3 & Attention 3) — Hanya rombel yang memiliki jadwal/kuota sesi aktif
  const sortedKelas = useMemo(() => {
    if (!kelasList.length) return { top: [], attention: [], hasData: false };
    const activeKelas = kelasList.filter((k) => (k.total || 0) > 0);
    const pool = activeKelas.length > 0 ? activeKelas : kelasList;
    const hasData = pool.some((k) => (k.hadir || 0) > 0);
    const sorted = [...pool].sort((a, b) => b.persen - a.persen);
    return {
      top: sorted.slice(0, 3),
      attention: sorted.slice(-3).reverse(),
      hasData,
    };
  }, [kelasList]);

  // Displayed meetings table
  const displayedMeetings = useMemo(() => {
    if (showAllMeetings) return trendList;
    return trendList.slice(-8).reverse(); // Latest 8 meetings in compact view
  }, [trendList, showAllMeetings]);

  // Ekstraksi Insight Cepat 3 Detik (Terkuat, Terlemah, Hari Rawan)
  const instantHighlights = useMemo(() => {
    const sortedAgendas = [...agendaBreakdown].sort((a, b) => (b.persen_hadir ?? 0) - (a.persen_hadir ?? 0));
    const bestAgenda = sortedAgendas[0] || null;
    const worstAgenda = sortedAgendas[sortedAgendas.length - 1] || null;

    const sortedDays = [...polaHari].sort((a, b) => (b.avg_persen ?? 0) - (a.avg_persen ?? 0));
    const bestDay = sortedDays[0] || null;
    const worstDay = sortedDays[sortedDays.length - 1] || null;

    const bestClass = sortedKelas.top[0] || null;
    const worstClass = sortedKelas.attention[0] || null;

    return { bestAgenda, worstAgenda, bestDay, worstDay, bestClass, worstClass };
  }, [agendaBreakdown, polaHari, sortedKelas]);

  const cdiPersen = ringkasan?.avg_persen_siswa ?? 0;
  const isCdiOnTarget = cdiPersen >= 85;
  const isCdiWarning = cdiPersen >= 75 && cdiPersen < 85;

  return (
    <div className="space-y-4 p-3 sm:p-4">
      {/* ── COMPACT FILTER BAR & AGENDA CHIPS (ZERO NOISE, 1-GLANCE) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs space-y-2.5">
        {/* Row 1: Scope Periode + Rentang Tanggal + Agenda Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Periode:
            </span>
            {([
              { id: '1_tahun', label: '1 Tahun' },
              { id: '1_semester', label: '1 Semester' },
              { id: '1_bulan', label: '1 Bulan' },
            ] as Array<{ id: ScopePeriode; label: string }>).map((p) => {
              const isActive = scopePeriode === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setScopePeriode(p.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            {ringkasan?.tanggal_mulai && ringkasan?.tanggal_selesai && (
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline ml-1">
                ({formatTanggal(ringkasan.tanggal_mulai)} – {formatTanggal(ringkasan.tanggal_selesai)})
              </span>
            )}
          </div>

          {/* Sub-pilihan Bulan saat Scope 1 Bulan aktif */}
          {scopePeriode === '1_bulan' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={selectedBulanYm}
                onChange={(e) => setSelectedBulanYm(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-xs font-bold text-amber-900 dark:text-amber-200"
              >
                <option value="latest_30d">30 Hari Aktif Terakhir</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatBulanYm(ym)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Pilar Siklus Cepat (Compact Pills dengan Persentase Langsung) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setModeAgenda('SEMUA_SIKLUS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modeAgenda === 'SEMUA_SIKLUS'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Semua Siklus
            </button>
            <button
              type="button"
              onClick={() => setModeAgenda('APEL_PAGI')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modeAgenda === 'APEL_PAGI'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Apel Pagi
            </button>
            {agendaBreakdown.map((ag) => {
              const active = modeAgenda === ag.kode;
              const shortTitle = ag.kode === 'UPACARA' ? 'Upacara' : ag.kode === 'KETARUNAAN' ? 'Ketarunaan' : ag.kode === 'DUHA' ? 'Dhuha' : 'Apel Sore';
              const pctColor = ag.persen_hadir >= 85 ? 'text-emerald-600' : ag.persen_hadir >= 75 ? 'text-amber-600' : 'text-rose-600';
              return (
                <button
                  key={ag.kode}
                  type="button"
                  onClick={() => setModeAgenda(active ? 'SEMUA_SIKLUS' : (ag.kode as ModeAgenda))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    active
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <span>{shortTitle}</span>
                  <span className={`font-black ${active ? 'text-amber-100' : pctColor}`}>
                    {ag.persen_hadir}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !stats || trendList.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <BarChart3 className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
            Belum Ada Sesi Pada Periode Ini
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
            Tidak ada rekaman Program Ketarunaan pada cakupan {scopeLabel}.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScopePeriode('1_tahun')}
            className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Tampilkan Scope 1 Tahun
          </Button>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [PAPAN INFORMASI 3-DETIK] EXECUTIVE GLANCE BOARD: INTI MASALAH & CAPAIAN SEKILAS */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Panel Kiri (7 Kolom): 3 Angka Kesehatan Utama Sekilas */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Ringkasan Kesehatan Program
                </span>
                <Badge
                  variant={isCdiOnTarget ? 'success' : isCdiWarning ? 'warning' : 'error'}
                  className="text-[10px] font-black"
                >
                  {isCdiOnTarget ? 'SESUAI TARGET (≥85%)' : isCdiWarning ? 'PERLU PENINGKATAN' : 'DI BAWAH TARGET'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                {/* 1. Hadir Taruna */}
                <div className="pr-3">
                  <span className="text-[11px] font-bold text-slate-400 block">Hadir Taruna</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-2xl sm:text-3xl font-black ${isCdiOnTarget ? 'text-emerald-600' : isCdiWarning ? 'text-amber-600' : 'text-rose-600'}`}>
                      {cdiPersen}%
                    </span>
                    {deltaBadge(trendList[trendList.length - 1]?.delta_siswa)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    Target sekolah: ≥85%
                  </span>
                </div>

                {/* 2. Layak Sertifikat */}
                <div className="px-3">
                  <span className="text-[11px] font-bold text-slate-400 block">Layak Sertifikat</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                      {barometer?.persen_kelayakan ?? 0}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    {(barometer?.siap_sertifikasi ?? 0).toLocaleString()} / {(barometer?.total_taruna ?? 0).toLocaleString()} taruna (≥80%)
                  </span>
                </div>

                {/* 3. Pembina & Sesi */}
                <div className="pl-3">
                  <span className="text-[11px] font-bold text-slate-400 block">Pembina &amp; Sesi</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                      {ringkasan?.avg_persen_guru ?? 0}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    {ringkasan?.total_pertemuan_taruna ?? ringkasan?.total_sesi ?? trendList.length} Sesi &bull; {ringkasan?.total_sesi ?? 0} Hari
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Kanan (5 Kolom): Sorotan Terkuat vs Terlemah & Prioritas Tindakan */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Sorotan Cepat &amp; Fokus Pembinaan
              </span>

              <div className="space-y-2 text-xs">
                {/* Baris 1: Agenda Terkuat vs Terlemah */}
                {instantHighlights.bestAgenda && instantHighlights.worstAgenda && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-500 font-semibold">Agenda:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-600">
                        ▲ {instantHighlights.bestAgenda.kode === 'APEL_SORE' ? 'Apel Sore' : instantHighlights.bestAgenda.kode} ({instantHighlights.bestAgenda.persen_hadir}%)
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-amber-600">
                        ▼ {instantHighlights.worstAgenda.kode === 'APEL_SORE' ? 'Apel Sore' : instantHighlights.worstAgenda.kode} ({instantHighlights.worstAgenda.persen_hadir}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Baris 2: Kelas Terbaik vs Perlu Perhatian */}
                {instantHighlights.bestClass && instantHighlights.worstClass && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-500 font-semibold">Rombel:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-600">
                        ★ {instantHighlights.bestClass.kelas_nama} ({instantHighlights.bestClass.persen}%)
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-600">
                        ! {instantHighlights.worstClass.kelas_nama} ({instantHighlights.worstClass.persen}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Baris 3: Hari Rawan & Radar Alpa */}
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Perlu Tindakan:
                  </span>
                  <div className="flex items-center gap-2 font-extrabold">
                    {instantHighlights.worstDay && (
                      <span className="text-slate-700 dark:text-slate-200">
                        Hari {instantHighlights.worstDay.hari} ({instantHighlights.worstDay.avg_persen}%)
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px]">
                      {atRiskStudents.length} Taruna Alpa Kronis
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [WIDGET 2 & 3] GRAFIK TREN KETARUNAAN (AREA CHART) & KOMPOSISI STATUS (DONUT)     */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Widget 2: Interactive Attendance Trendline (8 Kolom) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Tren Kehadiran Taruna (#1 – #{trendList.length})
                </h4>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-3 h-0.5 bg-amber-500 rounded-full inline-block" /> Taruna (%)
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block border-b border-dashed border-emerald-500" /> Target 85%
                  </div>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer minWidth={0} width="100%" height="100%">
                  <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      unit="%"
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                              <p className="font-black text-amber-400">Pertemuan {p.name} ({p.tanggalFull})</p>
                              <p className="flex justify-between gap-4">
                                <span className="text-slate-300">Hadir Taruna:</span>
                                <strong className="text-white">{p.kehadiran}% ({p.hadir_siswa}/{p.total_siswa})</strong>
                              </p>
                              <p className="flex justify-between gap-4">
                                <span className="text-slate-300">Pembina:</span>
                                <strong className="text-slate-200">{p.pembina}% Hadir</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={85}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{ value: 'Target 85%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="kehadiran"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill="#f59e0b"
                      fillOpacity={0.22}
                      dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 3: Komposisi Status Ketidakhadiran (4 Kolom Donut) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-emerald-500" />
                  Komposisi Status
                </h4>
                <span className="text-[11px] font-bold text-slate-400">
                  {(statusBreakdown?.total ?? 0).toLocaleString()} Rekaman
                </span>
              </div>

              {donutData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Belum ada rekaman presensi</div>
              ) : (
                <>
                  <div className="h-44 w-full relative flex items-center justify-center">
                    <ResponsiveContainer minWidth={0} width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          innerRadius={48}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any, item: any) => [
                            `${Number(value).toLocaleString()} taruna (${Math.round((Number(value) / (statusBreakdown?.total || 1)) * 100)}%)`,
                            item.payload.label,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {Math.round(((statusBreakdown?.HADIR || 0) / (statusBreakdown?.total || 1)) * 100)}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Hadir</span>
                    </div>
                  </div>

                  {/* Legenda Custom */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px] truncate">
                          {d.label}: <strong>{d.value.toLocaleString()}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [RINGKASAN SEBARIS] KOMPARASI JURUSAN, POLA HARI & TINGKAT/ROMBEL (3 KOLOM)     */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Kolom 1: Komparasi Jurusan */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Jurusan ({byJurusan.length})
                </h4>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('laporan_kelas')}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    Rekap Rombel <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {byJurusan.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data jurusan</p>
              ) : (
                <div className="space-y-2">
                  {byJurusan.slice(0, 6).map((j, idx) => (
                    <div key={j.jurusan_id || idx} className="flex items-center gap-2 text-xs">
                      {/* Logo / Rank Badge */}
                      <div className="w-7 h-7 rounded-lg shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {(j as any).logo_url ? (
                          <img
                            src={resolveProfilePhotoUrl((j as any).logo_url)}
                            alt={j.nama_jurusan}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <span
                            className={`text-[10px] font-black ${
                              idx === 0
                                ? 'text-amber-800 dark:text-amber-300'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 w-14 truncate" title={j.nama_jurusan}>
                        {j.nama_jurusan}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            j.persen >= 80 ? 'bg-emerald-500' : j.persen >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(j.persen, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`font-black w-9 text-right shrink-0 ${
                          j.persen >= 80 ? 'text-emerald-600 dark:text-emerald-400' : j.persen >= 60 ? 'text-amber-600' : 'text-rose-600'
                        }`}
                      >
                        {j.persen}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kolom 2: Pola Kehadiran Per Hari (Ringkas) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                Pola Hari
              </h4>

              {polaHari.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada riwayat hari</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {polaHari.map((ph) => {
                    const isGood = ph.avg_persen >= 80;
                    const isModerate = ph.avg_persen >= 60 && ph.avg_persen < 80;
                    return (
                      <div
                        key={ph.day_index}
                        title={`${ph.hari}: ${ph.avg_persen}% (${ph.total_pertemuan}x sesi)`}
                        className={`p-2.5 rounded-xl border text-center ${
                          isGood
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            : isModerate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 block">
                          {ph.hari}
                        </span>
                        <span
                          className={`text-lg font-black leading-tight block mt-0.5 ${
                            isGood ? 'text-emerald-600' : isModerate ? 'text-amber-600' : 'text-rose-600'
                          }`}
                        >
                          {ph.avg_persen}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kolom 3: Tingkat & Rombel Sorotan */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Tingkat &amp; Rombel
                </h4>
                <div className="flex items-center gap-1.5">
                  {tingkatList.map((t) => (
                    <span
                      key={String(t.tingkat)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      {t.tingkat}: <span className="font-black text-amber-600 dark:text-amber-400">{t.persen}%</span>
                    </span>
                  ))}
                </div>
              </div>

              {!sortedKelas.hasData ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada rekam rombel</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                      Terbaik
                    </span>
                    {sortedKelas.top.slice(0, 3).map((k) => (
                      <div
                        key={k.kelas_id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{k.kelas_nama}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">{k.persen}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block">
                      Perlu Pembinaan
                    </span>
                    {sortedKelas.attention.slice(0, 3).map((k) => (
                      <div
                        key={k.kelas_id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 text-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{k.kelas_nama}</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">{k.persen}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [DETAIL TERPADU] TAB TUNGGAL: PERINGKAT TARUNA | RADAR ALPA | LOG SESI          */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            {/* Baris Tab Navigasi Utama Detail */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/70 p-1 rounded-xl self-start flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveDetailPanel('ranking')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeDetailPanel === 'ranking'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Peringkat Taruna
                  {rankingMeta?.is_backfill_dominant && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                      {rankingMeta.total_kandidat_sempurna} #1
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailPanel('alpa')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeDetailPanel === 'alpa'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Radar Alpa
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      atRiskStudents.length > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {atRiskStudents.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailPanel('log')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeDetailPanel === 'log'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Log Sesi ({trendList.length})
                </button>
              </div>

              {/* Pintasan ke rekap lengkap */}
              {onNavigateTab && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {activeDetailPanel === 'ranking' && (
                    <button type="button" onClick={() => onNavigateTab('penilaian')}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                      Rekap Penilaian <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {activeDetailPanel === 'alpa' && (
                    <button type="button" onClick={() => onNavigateTab('laporan_kelas')}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                      Rekap Per Rombel <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {activeDetailPanel === 'log' && (
                    <button type="button" onClick={() => onNavigateTab('laporan_tim')}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 whitespace-nowrap">
                      Laporan Pembina <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {activeDetailPanel === 'ranking' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/70 p-0.5 rounded-lg">
                    {([
                      { id: 'global', label: 'Global' },
                      { id: 'jurusan', label: 'Jurusan' },
                      { id: 'kelas', label: 'Kelas' },
                    ] as Array<{ id: RankingTabMode; label: string }>).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRankingTab(tab.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          rankingTab === tab.id
                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-44 sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={rankingSearch}
                      onChange={(e) => setRankingSearch(e.target.value)}
                      placeholder="Cari nama / NIS..."
                      className="w-full h-7 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── PANEL 1: PERINGKAT TARUNA (RINGKAS) ── */}
            {activeDetailPanel === 'ranking' && (
              <div className="space-y-3">
                {/* Sub-filter kontekstual (hanya muncul bila diperlukan) */}
                {(rankingTab !== 'global' ||
                  (rankingMeta && rankingMeta.is_backfill_dominant && rankingMeta.total_kandidat_sempurna > 20)) && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {rankingTab === 'jurusan' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedRankingJurusanId('ALL')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              selectedRankingJurusanId === 'ALL'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            Semua Jurusan
                          </button>
                          {byJurusan.map((j) => (
                            <button
                              key={j.jurusan_id}
                              type="button"
                              onClick={() => setSelectedRankingJurusanId(j.jurusan_id)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                selectedRankingJurusanId === j.jurusan_id
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {j.nama_jurusan}
                            </button>
                          ))}
                        </>
                      )}

                      {rankingTab === 'kelas' && (
                        <select
                          value={selectedRankingKelasId}
                          onChange={(e) => setSelectedRankingKelasId(e.target.value)}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
                        >
                          <option value="ALL">Semua Kelas (#1 Tiap Rombel)</option>
                          {kelasList
                            .filter((k) => (k.total || 0) > 0)
                            .sort((a, b) => a.kelas_nama.localeCompare(b.kelas_nama))
                            .map((k) => (
                              <option key={k.kelas_id} value={k.kelas_id}>
                                {k.kelas_nama}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    {rankingMeta &&
                      rankingMeta.is_backfill_dominant &&
                      rankingTab === 'global' &&
                      rankingMeta.total_kandidat_sempurna > 20 && (
                        <button
                          type="button"
                          onClick={() => setShowAllTiedGlobal((prev) => !prev)}
                          className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          {showAllTiedGlobal
                            ? 'Tampilkan 20 Perwakilan'
                            : `Buka Semua ${rankingMeta.total_kandidat_sempurna} Kandidat #1`}
                        </button>
                      )}
                  </div>
                )}

                {/* Tabel Peringkat Bersih (7 Kolom Padat) */}
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                        <th className="py-2.5 px-3 w-14 text-center">Rank</th>
                        <th className="py-2.5 px-3">Taruna</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3 text-center">Hadir</th>
                        <th className="py-2.5 px-3 text-center">Apel</th>
                        <th className="py-2.5 px-3 text-center">Telat</th>
                        <th className="py-2.5 px-3 text-center">Rincian</th>
                        <th className="py-2.5 px-3 text-right">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {activeRankingRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400">
                            Tidak ditemukan data taruna.
                          </td>
                        </tr>
                      ) : (
                        (showAllRankingRows || rankingSearch.trim() ? activeRankingRows : activeRankingRows.slice(0, 5)).map(
                          (row: KetarunaanTarunaRankingItem, idx) => {
                            const displayRank = row.rank || idx + 1;
                            const isTied = Boolean(row.is_tied && (row.tied_count || 1) > 1);
                            const lateCount = row.terlambat ?? 0;

                            return (
                              <tr
                                key={`${row.siswa_id}_${idx}`}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                                      displayRank === 1
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : displayRank === 2
                                        ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                        : displayRank === 3
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                        : 'text-slate-500 font-bold'
                                    }`}
                                  >
                                    #{displayRank}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <PersonPhoto
                                      name={row.nama_siswa}
                                      foto={(row as any).foto}
                                      variant="circle"
                                      size="sm"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-800 dark:text-slate-100">{row.nama_siswa}</div>
                                      <div className="text-[10px] text-slate-400">{row.nis}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{row.nama_kelas}</span>
                                    <span className="text-[10px] text-slate-400">({row.nama_jurusan})</span>
                                  </div>
                                  {isTied && rankingTab === 'kelas' && selectedRankingKelasId === 'ALL' && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRankingKelasId(row.kelas_id)}
                                      className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                                    >
                                      +{row.tied_count! - 1} lainnya &rarr;
                                    </button>
                                  )}
                                  {isTied && rankingTab === 'jurusan' && selectedRankingJurusanId === 'ALL' && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRankingJurusanId(row.jurusan_id)}
                                      className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                                    >
                                      +{row.tied_count! - 1} lainnya &rarr;
                                    </button>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-black text-emerald-600 dark:text-emerald-400">{row.persen_hadir}%</span>
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    ({row.hadir}/{row.total_sesi})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                                  {row.persen_apel_pendukung}%
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {lateCount === 0 ? (
                                    <span className="text-slate-400 font-semibold">—</span>
                                  ) : (
                                    <span className="text-rose-600 dark:text-rose-400 font-black">
                                      {lateCount}x ({row.total_menit_terlambat ?? 0}m)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                                  <span className="text-emerald-600 font-bold">{row.hadir}H</span>{' '}
                                  {row.dispensasi > 0 && <span className="text-purple-600">{row.dispensasi}D </span>}
                                  {row.sakit > 0 && <span className="text-amber-600">{row.sakit}S </span>}
                                  {row.izin > 0 && <span className="text-blue-600">{row.izin}I </span>}
                                  {row.alpa > 0 && <span className="text-rose-600 font-bold">{row.alpa}A</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black">
                                    {row.skor_disiplin}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {!rankingSearch.trim() && activeRankingRows.length > 5 && (
                  <div className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAllRankingRows((prev) => !prev)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      {showAllRankingRows ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 mr-1" /> Ciutkan (Top 5)
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 mr-1" /> Tampilkan Semua ({activeRankingRows.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── PANEL 2: RADAR ALPA (BERSIH TANPA TEKS BERULANG) ── */}
            {activeDetailPanel === 'alpa' && (
              <div>
                {atRiskStudents.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tidak Ada Taruna Dengan Alpa Kronis
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {atRiskStudents.map((st, sIdx) => (
                      <div
                        key={st.siswa_id || sIdx}
                        className="p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 flex items-center gap-2.5"
                      >
                        <PersonPhoto
                          name={st.nama_siswa}
                          foto={(st as any).foto}
                          variant="circle"
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate" title={st.nama_siswa}>
                            {st.nama_siswa}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {st.nama_kelas} • {st.nis}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[11px] font-black shrink-0">
                          {st.total_alpa} Alpa
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PANEL 3: LOG SESI PERTEMUAN ── */}
            {activeDetailPanel === 'log' && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-3 py-2.5">Sesi</th>
                        <th className="text-left px-3 py-2.5">Tanggal</th>
                        <th className="text-center px-3 py-2.5">Taruna</th>
                        <th className="text-center px-3 py-2.5">&Delta;</th>
                        <th className="text-center px-3 py-2.5">Pembina</th>
                        <th className="text-right px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {displayedMeetings.map((item: KetarunaanTrendItem) => {
                        const isGood = item.persen_hadir_siswa >= 85;
                        const isModerate = item.persen_hadir_siswa >= 70 && item.persen_hadir_siswa < 85;

                        return (
                          <tr key={item.tanggal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                              #{item.sesi_ke}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                              {formatTanggal(item.tanggal)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`font-black ${
                                  isGood ? 'text-emerald-600' : isModerate ? 'text-amber-600' : 'text-rose-600'
                                }`}
                              >
                                {item.persen_hadir_siswa}%
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({item.hadir_siswa}/{item.total_siswa})
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">{deltaBadge(item.delta_siswa)}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              {item.persen_hadir_guru}%
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Badge variant={isGood ? 'success' : isModerate ? 'warning' : 'error'} className="text-[10px]">
                                {isGood ? 'Baik' : isModerate ? 'Cukup' : 'Kurang'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {trendList.length > 8 && (
                  <div className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAllMeetings((prev) => !prev)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      {showAllMeetings ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 mr-1" /> Ciutkan (8 Terakhir)
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 mr-1" /> Lihat Semua ({trendList.length} Sesi)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
