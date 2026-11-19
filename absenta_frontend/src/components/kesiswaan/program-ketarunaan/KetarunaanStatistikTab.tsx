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
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getKetarunaanStats,
  type KetarunaanTrendItem,
} from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanStatistikTabProps {
  jadwalKegiatanId: string | null;
  tahunPelajaranId?: string;
  semesterId?: string;
}

type RentangPreset = 'bulan_ini' | '30_hari' | 'semester' | 'semua' | 'kustom';

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
}) => {
  const [preset, setPreset] = useState<RentangPreset>('semua');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showAllMeetings, setShowAllMeetings] = useState<boolean>(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'bulan_ini') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { tanggal_mulai: firstDay, tanggal_selesai: todayStr, label: 'Bulan Ini' };
    }
    if (preset === '30_hari') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { tanggal_mulai: past30, tanggal_selesai: todayStr, label: '30 Hari Terakhir' };
    }
    if (preset === 'semester') {
      const past6m = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { tanggal_mulai: past6m, tanggal_selesai: todayStr, label: 'Semester Berjalan' };
    }
    if (preset === 'kustom' && customStart && customEnd) {
      return { tanggal_mulai: customStart, tanggal_selesai: customEnd, label: `${customStart} s.d. ${customEnd}` };
    }
    return { tanggal_mulai: undefined, tanggal_selesai: undefined, label: 'Semua Riwayat' };
  }, [preset, customStart, customEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, dateRange.tanggal_mulai, dateRange.tanggal_selesai, tahunPelajaranId, semesterId],
    queryFn: () => getKetarunaanStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      tanggal_mulai: dateRange.tanggal_mulai,
      tanggal_selesai: dateRange.tanggal_selesai,
      tahun_pelajaran_id: tahunPelajaranId || undefined,
      semester_id: semesterId || undefined,
    }),
    staleTime: 60 * 1000,
  });

  const stats = data?.data;
  const trendList = useMemo(() => stats?.trend ?? [], [stats?.trend]);
  const kelasList = useMemo(() => stats?.by_kelas ?? [], [stats?.by_kelas]);
  const tingkatList = useMemo(() => stats?.by_tingkat ?? [], [stats?.by_tingkat]);
  const ringkasan = stats?.ringkasan_periode;
  const statusBreakdown = stats?.status_breakdown;
  const byJurusan = useMemo(() => stats?.by_jurusan ?? [], [stats?.by_jurusan]);
  const polaHari = useMemo(() => stats?.pola_hari ?? [], [stats?.pola_hari]);
  const atRiskStudents = useMemo(() => stats?.at_risk_students ?? [], [stats?.at_risk_students]);
  const barometer = stats?.barometer_sertifikasi;

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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* FILTER BAR RENTANG WAKTU: Ringkas, Elegan, Bebas Noise */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Rentang Waktu Laporan Ketarunaan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan performa kehadiran: <strong className="text-amber-600 dark:text-amber-400">{dateRange.label}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['bulan_ini', '30_hari', 'semester', 'semua'] as RentangPreset[]).map((p) => {
            const labels: Record<RentangPreset, string> = {
              bulan_ini: 'Bulan Ini',
              '30_hari': '30 Hari Terakhir',
              semester: 'Semester Ini',
              semua: 'Semua Riwayat',
              kustom: 'Kustom',
            };
            const isActive = preset === p;
            return (
              <Button
                key={p}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setPreset(p)}
                className={`h-8 px-3 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                {labels[p]}
              </Button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !stats || trendList.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-7 h-7 opacity-60" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
            Belum Ada Sesi Pertemuan Pada Periode Ini
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Tidak ada rekaman sesi Program Ketarunaan pada rentang waktu {dateRange.label}. Pilih rentang waktu lain atau buka 'Semua Riwayat' untuk melihat rekapitulasi data.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreset('semua')}
            className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
          >
            Tampilkan Semua Riwayat
          </Button>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [WIDGET 1] HERO ANALYTICS & BAROMETER KESIAPAN KETARUNAAN (EXECUTIVE PULSE)      */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Indeks Disiplin Taruna */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Indeks Disiplin (CDI)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.avg_persen_siswa ?? 0}%
                </span>
                {deltaBadge(trendList[trendList.length - 1]?.delta_siswa)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {(ringkasan?.total_hadir_siswa ?? 0).toLocaleString()} akumulasi taruna hadir
              </p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(ringkasan?.avg_persen_siswa ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* 2. Barometer Kesiapan Sertifikasi */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Kesiapan Sertifikasi Taruna
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {barometer?.persen_kelayakan ?? 0}%
                </span>
                <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 dark:border-blue-800">
                  Syarat &ge;80%
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <strong className="text-emerald-600">{(barometer?.siap_sertifikasi ?? 0).toLocaleString()}</strong> siap lulus / {(barometer?.total_taruna ?? 0).toLocaleString()} taruna
              </p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(barometer?.persen_kelayakan ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* 3. Kepatuhan Pembina / Pelatih */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Kepatuhan Pembina Lapangan
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.avg_persen_guru ?? 0}%
                </span>
                {deltaBadge(trendList[trendList.length - 1]?.delta_guru)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Rata-rata kehadiran pembina & wali kelas
              </p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(ringkasan?.avg_persen_guru ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* 4. Total Pertemuan Terlaksana */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Pertemuan Terlaksana
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.total_sesi ?? trendList.length}
                </span>
                <span className="text-xs text-slate-400 font-bold">Pertemuan</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={ringkasan?.arah_perkembangan === 'NAIK' ? 'success' : ringkasan?.arah_perkembangan === 'TURUN' ? 'error' : 'neutral'} className="text-[10px]">
                  {ringkasan?.arah_perkembangan === 'NAIK' ? 'Tren Positif' : ringkasan?.arah_perkembangan === 'TURUN' ? 'Perlu Pendampingan' : 'Konsisten'}
                </Badge>
                <span className="text-[11px] text-slate-400">Target Disiplin &gt;85%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-full" />
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
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Kurva Tren Kehadiran Taruna (#1 s/d #{trendList.length})
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Grafik time-series fluktuasi kedisiplinan apel taruna dengan benchmark target sekolah (85%)
                  </p>
                </div>
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
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-emerald-500" />
                  Komposisi Kehadiran Taruna
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribusi riil {(statusBreakdown?.total ?? 0).toLocaleString()} rekaman presensi
                </p>
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
          {/* [WIDGET 4 & 5] KOMPARASI LINTAS JURUSAN & HEATMAP POLA HARI KEHADIRAN            */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Widget 4: Benchmark Program Keahlian / Jurusan (6 Kolom) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Komparasi Disiplin Antar-Jurusan
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Peringkat ketangguhan & kepatuhan apel taruna lintas program keahlian
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-800">
                  {byJurusan.length} Jurusan
                </Badge>
              </div>

              <div className="space-y-3 pt-1">
                {byJurusan.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada pemetaan jurusan</p>
                ) : (
                  byJurusan.slice(0, 6).map((j, idx) => (
                    <div key={j.jurusan_id || idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">{j.nama_jurusan}</span>
                        </div>
                        <span className={`font-black ${j.persen >= 80 ? 'text-emerald-600 dark:text-emerald-400' : j.persen >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {j.persen}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            j.persen >= 80 ? 'bg-emerald-500' : j.persen >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(j.persen, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{j.hadir.toLocaleString()} Hadir</span>
                        <span>Total {j.total.toLocaleString()} Taruna Terjadwal</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget 5: Heatmap Pola Hari Ketarunaan (6 Kolom) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Pola Kedisiplinan Hari Pelaksanaan
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mendeteksi hari apel dengan partisipasi tertinggi vs hari rawan alpa
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {polaHari.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center col-span-3">Belum ada riwayat hari</p>
                ) : (
                  polaHari.map((ph) => {
                    const isGood = ph.avg_persen >= 80;
                    const isModerate = ph.avg_persen >= 60 && ph.avg_persen < 80;

                    return (
                      <div
                        key={ph.day_index}
                        className={`p-3.5 rounded-xl border transition-all text-center space-y-1 ${
                          isGood
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            : isModerate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                          Hari {ph.hari}
                        </span>
                        <span className={`text-2xl font-black block ${
                          isGood ? 'text-emerald-600' : isModerate ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {ph.avg_persen}%
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {ph.total_pertemuan}x Apel Terlaksana
                        </p>
                        <Badge
                          variant={isGood ? 'success' : isModerate ? 'warning' : 'error'}
                          className="text-[9px] px-1.5 py-0 mt-1"
                        >
                          {isGood ? 'Disiplin Tinggi' : isModerate ? 'Cukup Stabil' : 'Rawan Alpa'}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Insight Rekomendasi POS */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  <strong>Insight Kesiswaan:</strong> Optimalkan patroli pembina dan gerbang kedisiplinan pada hari dengan tingkat kehadiran &lt;70% untuk menekan tingkat alpa apel pagi.
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [WIDGET 6] EARLY WARNING RADAR: TARUNA DENGAN ALPA TERTINGGI (ACTIONABLE)         */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Early Warning Radar: Taruna Perlu Pembinaan Fisik / POS
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daftar taruna dengan rekam alpa terbanyak pada sesi ketarunaan yang terancam tidak memenuhi syarat kelulusan
                  </p>
                </div>
              </div>
              <Badge variant="error" className="text-xs font-bold self-start sm:self-auto">
                {atRiskStudents.length} Taruna Masuk Radar
              </Badge>
            </div>

            {atRiskStudents.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tidak Ada Taruna Dengan Alpa Kronis
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seluruh taruna memiliki kepatuhan hadir di atas ambang batas aman.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {atRiskStudents.map((st, sIdx) => (
                  <div
                    key={st.siswa_id || sIdx}
                    className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 flex flex-col justify-between space-y-2 hover:border-rose-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-1" title={st.nama_siswa}>
                          {st.nama_siswa}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black shrink-0">
                          {st.total_alpa}x ALPA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {st.nama_kelas} • NIS: {st.nis}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-rose-100/60 dark:border-rose-900/30 flex items-center justify-between text-[11px]">
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Rekomendasi SP
                      </span>
                      <span className="text-slate-400 text-[10px]">Panggilan POS</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [BOTTOM ROW] BREAKDOWN TINGKAT (X, XI, XII) & KELAS TERBAIK / PERHATIAN           */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Breakdown per Tingkat */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Disiplin Kehadiran Per Tingkat
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tingkat partisipasi taruna Kelas X, XI, dan XII
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {tingkatList.map((t) => (
                  <div key={String(t.tingkat)} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{t.tingkat}</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black">{t.persen}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${Math.min(t.persen, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t.hadir.toLocaleString()} Hadir</span>
                      <span>Total {t.total.toLocaleString()} Taruna</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rombel Sorotan: Kelas Paling Disiplin & Perlu Perhatian */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Evaluasi Kepatuhan Rombel Kelas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identifikasi kelas teladan dan kelas yang memerlukan pembinaan ketarunaan
                </p>
              </div>

              {!sortedKelas.hasData ? (
                <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-5 h-5 opacity-40" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Belum Ada Rekaman Tap Siswa
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                    Evaluasi kepatuhan rombel otomatis terpetakan begitu taruna mulai melakukan presensi pada sesi ketarunaan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Top 3 Kelas Paling Disiplin
                    </span>
                    {sortedKelas.top.map((k) => (
                      <div key={k.kelas_id} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{k.kelas_nama}</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{k.persen}% Hadir</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Kelas Perlu Pembinaan Khusus
                    </span>
                    {sortedKelas.attention.map((k) => (
                      <div key={k.kelas_id} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{k.kelas_nama}</span>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">{k.persen}% Hadir</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* [COLLAPSIBLE] AUDIT LOG PERTEMUAN (TABEL 39 BARIS DIPADATKAN DENGAN TOGGLE)     */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Audit Log Pelaksanaan Sesi Ketarunaan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rincian log kehadiran taruna dan tim pembina dari pertemuan ke pertemuan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAllMeetings((prev) => !prev)}
                  className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
                >
                  {showAllMeetings ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" /> Ciutkan Tampilan (8 Terakhir)
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> Tampilkan Semua {trendList.length} Pertemuan
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Pertemuan</th>
                    <th className="text-left px-4 py-3">Tanggal Pelaksanaan</th>
                    <th className="text-center px-4 py-3">Kehadiran Taruna</th>
                    <th className="text-center px-4 py-3">Perubahan (&Delta;)</th>
                    <th className="text-center px-4 py-3">Pembina & Pendamping</th>
                    <th className="text-center px-4 py-3">Status Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedMeetings.map((item: KetarunaanTrendItem) => {
                    const isGood = item.persen_hadir_siswa >= 85;
                    const isModerate = item.persen_hadir_siswa >= 70 && item.persen_hadir_siswa < 85;

                    return (
                      <tr key={item.tanggal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          Pertemuan #{item.sesi_ke}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium text-xs">
                          {formatTanggal(item.tanggal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-xs font-black ${
                              isGood ? 'text-emerald-600' : isModerate ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {item.persen_hadir_siswa}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.hadir_siswa}/{item.total_siswa} taruna
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {deltaBadge(item.delta_siswa)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {item.persen_hadir_guru}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={isGood ? 'success' : isModerate ? 'warning' : 'error'} className="text-[10px]">
                            {isGood ? 'Sangat Baik' : isModerate ? 'Cukup' : 'Kurang'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!showAllMeetings && trendList.length > 8 && (
              <div className="pt-2 text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAllMeetings(true)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  Lihat {trendList.length - 8} Pertemuan Sebelumnya...
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
