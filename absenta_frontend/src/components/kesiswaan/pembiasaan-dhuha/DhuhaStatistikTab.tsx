import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  HeartHandshake,
  Award,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
  getDhuhaStats,
  type DhuhaTrendItem,
} from '@/api/kesiswaan/pembiasaanDhuha.api';

interface DhuhaStatistikTabProps {
  jadwalKegiatanId: string | null;
}

type RentangPreset = 'bulan_ini' | '30_hari' | 'semester' | 'semua' | 'kustom';

function formatTanggal(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

export const DhuhaStatistikTab: React.FC<DhuhaStatistikTabProps> = ({ jadwalKegiatanId }) => {
  const [preset, setPreset] = useState<RentangPreset>('bulan_ini');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

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
    queryKey: ['dhuha-stats', jadwalKegiatanId, dateRange.tanggal_mulai, dateRange.tanggal_selesai],
    queryFn: () => getDhuhaStats({
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
      tanggal_mulai: dateRange.tanggal_mulai,
      tanggal_selesai: dateRange.tanggal_selesai,
    }),
    staleTime: 60 * 1000,
  });

  const stats = data?.data;
  const trendList = useMemo(() => stats?.trend ?? [], [stats?.trend]);
  const kelasList = useMemo(() => stats?.by_kelas ?? [], [stats?.by_kelas]);
  const tingkatList = useMemo(() => stats?.by_tingkat ?? [], [stats?.by_tingkat]);
  const ringkasan = stats?.ringkasan_periode;

  // Sorting rombel kelas
  const sortedKelas = useMemo(() => {
    if (!kelasList.length) return { top: [], attention: [], hasData: false };
    const hasData = kelasList.some((k) => (k.hadir || 0) > 0);
    const sorted = [...kelasList].sort((a, b) => b.persen - a.persen);
    return {
      top: sorted.slice(0, 3),
      attention: sorted.slice(-3).reverse(),
      hasData,
    };
  }, [kelasList]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* FILTER BAR RENTANG WAKTU: Ringkas, Elegan, Bebas Noise */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Rentang Waktu Laporan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan performa kehadiran: <strong className="text-emerald-600 dark:text-emerald-400">{dateRange.label}</strong>
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
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
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
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-7 h-7 opacity-60" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
            Belum Ada Sesi Pertemuan Pada Periode Ini
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Tidak ada rekaman sesi Pembiasaan Dhuha pada rentang waktu {dateRange.label}. Pilih rentang waktu lain atau buka 'Semua Riwayat' untuk melihat rekapitulasi data.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreset('semua')}
            className="text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
          >
            Tampilkan Semua Riwayat
          </Button>
        </div>
      ) : (
        <>
          {/* RINGKASAN PERFORMA EKSEKUTIF (4 KARTU BERSIH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Rata-rata Hadir Siswa
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.avg_persen_siswa ?? 0}%
                </span>
                {deltaBadge(trendList[trendList.length - 1]?.delta_siswa)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {(ringkasan?.total_hadir_siswa ?? 0).toLocaleString()} akumulasi jamaah hadir
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Kepatuhan Pendamping
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.avg_persen_guru ?? 0}%
                </span>
                {deltaBadge(trendList[trendList.length - 1]?.delta_guru)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Rata-rata kehadiran guru & wali kelas
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Pertemuan Terlaksana
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {ringkasan?.total_sesi ?? trendList.length} Pertemuan
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tercatat resmi dalam rentang waktu
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Evaluasi Keterlibatan
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {ringkasan?.evaluasi ?? 'Stabil'}
                </span>
                <Badge variant={ringkasan?.arah_perkembangan === 'NAIK' ? 'success' : ringkasan?.arah_perkembangan === 'TURUN' ? 'error' : 'neutral'} className="text-[10px]">
                  {ringkasan?.arah_perkembangan === 'NAIK' ? 'Tren Positif' : ringkasan?.arah_perkembangan === 'TURUN' ? 'Tren Turun' : 'Konsisten'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Berdasarkan target kehadiran &gt;85%
              </p>
            </div>
          </div>

          {/* PERKEMBANGAN DARI PERTEMUAN KE PERTEMUAN (VISUAL PROGRESSION) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Perkembangan Pertemuan Pembiasaan Dhuha
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Progres kehadiran siswa dan tim pendamping dari pertemuan ke pertemuan
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-slate-200 dark:border-slate-800">
                {trendList.length} Pertemuan Terdata
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Pertemuan</th>
                    <th className="text-left px-4 py-3">Tanggal Pelaksanaan</th>
                    <th className="text-center px-4 py-3">Kehadiran Jamaah Siswa</th>
                    <th className="text-center px-4 py-3">Perubahan (Δ)</th>
                    <th className="text-center px-4 py-3">Tim Pendamping</th>
                    <th className="text-center px-4 py-3">Status Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trendList.map((item: DhuhaTrendItem) => {
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
                              {item.hadir_siswa}/{item.total_siswa} siswa
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
          </div>

          {/* KOMPARASI TINGKAT & ROMBEL (MENGHILANGKAN KEBISINGAN, FOKUS INSIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Breakdown per Tingkat */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Kehadiran Per Tingkat
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tingkat partisipasi jamaah Kelas X, XI, dan XII
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {tingkatList.map((t) => (
                  <div key={String(t.tingkat)} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{t.tingkat}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{t.persen}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(t.persen, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t.hadir} Hadir</span>
                      <span>Total {t.total} Siswa</span>
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
                  Identifikasi kelas teladan dan kelas yang membutuhkan intervensi kesiswaan
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
                    Evaluasi kepatuhan rombel otomatis terpetakan begitu siswa mulai melakukan presensi pada sesi pembiasaan dhuha.
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Kelas Memerlukan Pembinaan
                    </span>
                    {sortedKelas.attention.map((k) => (
                      <div key={k.kelas_id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{k.kelas_nama}</span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">{k.persen}% Hadir</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
