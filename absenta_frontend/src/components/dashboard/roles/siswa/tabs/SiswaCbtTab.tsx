import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Laptop,
  PlayCircle,
  RotateCcw,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  CalendarClock,
  DoorOpen,
  Lock,
  FileQuestion,
  KeyRound,
  RefreshCw,
  ChevronRight,
  Hourglass,
  Ban,
  Trophy,
  Award,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtStudentExamItem } from '@/types/cbt.types';
import { getTimezone, getTimezoneLabel } from '@/utils/attendance/time';

type FilterKey = 'aktif' | 'mendatang' | 'riwayat' | 'semua';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'aktif', label: 'Sedang Berlangsung' },
  { key: 'mendatang', label: 'Jadwal Mendatang' },
  { key: 'riwayat', label: 'Riwayat & Nilai' },
  { key: 'semua', label: 'Semua Ujian' },
];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const tz = getTimezone();
  return d.toLocaleString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
};

const formatTimeOnly = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const tz = getTimezone();
  return `${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })} ${getTimezoneLabel(tz)}`;
};

const formatScore = (val: number) => {
  const rounded1 = Math.round(val * 10) / 10;
  return Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
};

const getPredikatMeta = (score: number) => {
  const rounded = Math.round(score);
  if (rounded >= 85) {
    return {
      label: 'Sangat Baik',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      scoreClass: 'text-emerald-600 dark:text-emerald-400',
      boxClass: 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    };
  }
  if (rounded >= 70) {
    return {
      label: 'Tuntas',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
      scoreClass: 'text-sky-600 dark:text-sky-400',
      boxClass: 'bg-sky-50/70 border-sky-200/80 dark:bg-sky-950/25 dark:border-sky-900/60',
    };
  }
  return {
    label: 'Perlu Penguatan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    scoreClass: 'text-amber-600 dark:text-amber-400',
    boxClass: 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/25 dark:border-amber-900/60',
  };
};

/** Ujian yang masih bisa dikerjakan / dilanjutkan oleh siswa */
const isActionable = (item: CbtStudentExamItem) =>
  (item.status_jadwal === 'ACTIVE' || item.status_jadwal === 'PAUSED') &&
  item.status_peserta !== 'FINISHED' &&
  item.status_peserta !== 'DISQUALIFIED';

/** Ujian resmi yang sudah terbit namun belum dibuka pengawas */
const isUpcoming = (item: CbtStudentExamItem) =>
  item.status_jadwal === 'DRAFT' &&
  item.status_peserta !== 'FINISHED' &&
  item.status_peserta !== 'DISQUALIFIED';

/** Ujian yang sudah selesai, diskualifikasi, atau ditutup */
const isHistory = (item: CbtStudentExamItem) =>
  item.status_peserta === 'FINISHED' ||
  item.status_peserta === 'DISQUALIFIED' ||
  item.status_jadwal === 'COMPLETED';

interface StatusMeta {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const getStatusMeta = (item: CbtStudentExamItem): StatusMeta => {
  if (item.status_peserta === 'FINISHED') {
    return {
      label: 'Selesai Dikerjakan',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      icon: CheckCircle2,
    };
  }
  if (item.status_peserta === 'DISQUALIFIED') {
    return {
      label: 'Didiskualifikasi',
      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
      icon: XCircle,
    };
  }
  if (item.status_jadwal === 'PAUSED') {
    return {
      label: 'Dijeda Pengawas',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      icon: PauseCircle,
    };
  }
  if (item.status_jadwal === 'ACTIVE') {
    if (item.status_peserta === 'IN_PROGRESS') {
      return {
        label: 'Sedang Dikerjakan',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
        icon: Hourglass,
      };
    }
    return {
      label: 'Ujian Dibuka',
      className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
      icon: PlayCircle,
    };
  }
  if (item.status_jadwal === 'DRAFT') {
    return {
      label: 'Jadwal Resmi Diterbitkan',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
      icon: CalendarClock,
    };
  }
  return {
    label: 'Tidak Mengikuti',
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: Ban,
  };
};

export const SiswaCbtTab: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('aktif');
  const didAutoSelectTab = useRef(false);

  const {
    data: exams = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: cbtQueryKeys.myExams(),
    queryFn: cbtApi.getMyExams,
    refetchInterval: 30000, // pantau ujian yang baru diaktifkan pengawas
    refetchOnWindowFocus: true,
  });

  const counts = useMemo(
    () => ({
      aktif: exams.filter(isActionable).length,
      mendatang: exams.filter(isUpcoming).length,
      riwayat: exams.filter(isHistory).length,
      semua: exams.length,
    }),
    [exams]
  );

  // Otomatis tampilkan tab Mendatang atau Riwayat jika tidak ada ujian aktif
  useEffect(() => {
    if (!isLoading && !didAutoSelectTab.current && exams.length > 0) {
      didAutoSelectTab.current = true;
      if (counts.aktif === 0) {
        if (counts.mendatang > 0) {
          setFilter('mendatang');
        } else if (counts.riwayat > 0) {
          setFilter('riwayat');
        }
      }
    }
  }, [isLoading, exams.length, counts.aktif, counts.mendatang, counts.riwayat]);

  const filtered = useMemo(() => {
    let list = exams;
    if (filter === 'aktif') list = exams.filter(isActionable);
    else if (filter === 'mendatang') list = exams.filter(isUpcoming);
    else if (filter === 'riwayat') list = exams.filter(isHistory);

    // Urutkan jadwal mendatang secara kronologis terdekat (Senin Sesi 1 duluan)
    if (filter === 'mendatang') {
      return [...list].sort(
        (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
      );
    }
    // Urutkan riwayat secara terbalik (terbaru selesai di atas)
    if (filter === 'riwayat') {
      return [...list].sort(
        (a, b) => new Date(b.tanggal_selesai).getTime() - new Date(a.tanggal_selesai).getTime()
      );
    }
    return list;
  }, [exams, filter]);

  const finishedCount = useMemo(
    () => exams.filter((e) => e.status_peserta === 'FINISHED').length,
    [exams]
  );

  const finishedWithScore = useMemo(() => exams.filter((e) => e.hasil), [exams]);

  const avgScore = useMemo(() => {
    if (finishedWithScore.length === 0) return null;
    const sum = finishedWithScore.reduce((acc, e) => acc + (e.hasil?.nilai_akhir || 0), 0);
    return Math.round((sum / finishedWithScore.length) * 10) / 10;
  }, [finishedWithScore]);

  const highestScore = useMemo(() => {
    if (finishedWithScore.length === 0) return null;
    const max = Math.max(...finishedWithScore.map((e) => e.hasil?.nilai_akhir || 0));
    return Math.round(max * 10) / 10;
  }, [finishedWithScore]);

  const goToExamRoom = () => navigate('/cbt/ruang-ujian');

  return (
    <div className="space-y-4">
      {/* Hero / Token CTA */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Laptop size={22} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">Ruang Ujian CBT</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold">
                <Sparkles size={10} /> Anti-Cheat & Auto-Save Aktif
              </span>
            </div>
            <p className="text-xs text-violet-100/85 font-medium">
              Masukkan 6 digit token resmi dari pengawas ruangan untuk memulai sesi ujian yang sedang dibuka.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={goToExamRoom}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-violet-50 text-violet-900 text-xs font-black shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all active:scale-98"
        >
          <KeyRound size={15} className="text-violet-700" />
          <span>Masukkan Token Ujian</span>
          <ChevronRight size={14} className="text-violet-400" />
        </button>
      </div>

      {/* Ringkasan Statistik Ujian Siswa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <PlayCircle size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Ujian Dibuka
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-violet-600 dark:text-violet-400">{counts.aktif}</span>
              <span className="text-[10px] font-semibold text-slate-400">sesi aktif</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Sudah Dikerjakan
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{finishedCount}</span>
              <span className="text-[10px] font-semibold text-slate-400">dari {counts.semua} jadwal</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Rata-Rata Nilai
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {avgScore !== null ? formatScore(avgScore) : '-'}
              </span>
              {avgScore !== null && (
                <span className="text-[10px] font-semibold text-slate-400">
                  (Bulat: {Math.round(avgScore)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Trophy size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Nilai Tertinggi
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                {highestScore !== null ? formatScore(highestScore) : '-'}
              </span>
              {highestScore !== null && (
                <span className="text-[10px] font-semibold text-slate-400">poin terbaik</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Ujian */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
                  filter === f.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'px-1.5 rounded-full text-[10px]',
                    filter === f.key ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Segarkan daftar ujian"
            aria-label="Segarkan daftar ujian"
            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600">Gagal memuat daftar ujian.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileQuestion size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {filter === 'aktif'
                ? 'Tidak ada ujian yang sedang berlangsung'
                : filter === 'mendatang'
                ? 'Belum ada jadwal ujian mendatang'
                : 'Belum ada riwayat ujian'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'aktif'
                ? 'Ujian akan muncul di sini saat pengawas mengaktifkan sesi untuk kelasmu. Kamu juga bisa melihat jadwal ujian di tab Jadwal Mendatang.'
                : filter === 'mendatang'
                ? 'Jadwal ujian resmi yang diterbitkan oleh kurikulum/panitia akan muncul di sini lengkap dengan alokasi ruang fisik.'
                : 'Ujian yang sudah selesai dikerjakan atau ditutup oleh pengawas akan tercatat lengkap beserta nilainya di sini.'}
            </p>
            {filter === 'aktif' && counts.mendatang > 0 && (
              <button
                type="button"
                onClick={() => setFilter('mendatang')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Lihat {counts.mendatang} Jadwal Ujian Mendatang
                <ChevronRight size={13} />
              </button>
            )}
            {filter === 'aktif' && counts.mendatang === 0 && counts.riwayat > 0 && (
              <button
                type="button"
                onClick={() => setFilter('riwayat')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Lihat {counts.riwayat} Riwayat Ujian &amp; Nilai
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((item) => {
              const meta = getStatusMeta(item);
              const StatusIcon = meta.icon;
              const actionable = isActionable(item);
              const isPaused = item.status_jadwal === 'PAUSED';
              const isResume = item.status_peserta === 'IN_PROGRESS';
              const isFinished = item.status_peserta === 'FINISHED';
              const predikat = item.hasil ? getPredikatMeta(item.hasil.nilai_akhir) : null;
              const accuracyPct =
                item.hasil && item.total_soal > 0
                  ? Math.round((item.hasil.jumlah_benar / item.total_soal) * 100)
                  : null;
              const pelanggaranCount = item.pelanggaran_count ?? 0;
              const jumlahTerjawab =
                item.jumlah_terjawab && item.jumlah_terjawab > 0
                  ? item.jumlah_terjawab
                  : item.hasil
                  ? item.hasil.jumlah_benar + item.hasil.jumlah_salah
                  : 0;

              return (
                <li
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Baris Badge Status, Mapel, Bank Soal & Konteks Akademik */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] font-bold',
                          meta.className
                        )}
                      >
                        <StatusIcon size={11} />
                        {meta.label}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-900 px-2 py-0.5 rounded-md">
                        <BookOpen size={10} />
                        {item.mapel}
                      </span>

                      {(item.kode_bank || (item.judul_bank && item.judul_bank !== '-')) && (
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {item.kode_bank ? `${item.kode_bank} • ` : ''}
                          {item.judul_bank}
                        </span>
                      )}

                      {(item.semester || item.tahun_ajaran) && (
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 rounded-md">
                          {[item.semester ? `Semester ${item.semester}` : null, item.tahun_ajaran]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      )}
                    </div>

                    {/* Nama Sesi Ujian */}
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                        {item.nama_sesi}
                      </h4>
                    </div>

                    {/* Info Jadwal, Durasi, Jumlah Soal & Guru Pengampu */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-slate-400 shrink-0" />
                        <span>
                          Jadwal: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(item.tanggal_mulai)}</strong> –{' '}
                          <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(item.tanggal_selesai)}</strong>
                        </span>
                      </span>

                      {(item.ruang_ujian || item.ruang_ujian_nama) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800">
                          <DoorOpen size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Ruang: {item.ruang_ujian_nama || item.ruang_ujian}</span>
                          {item.ruang_ujian && item.ruang_ujian_nama && item.ruang_ujian !== item.ruang_ujian_nama && (
                            <span className="text-[10px] text-indigo-500 font-medium">({item.ruang_ujian})</span>
                          )}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Alokasi {item.durasi_menit} menit</span>
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <FileQuestion size={13} className="text-slate-400 shrink-0" />
                        <span>{item.total_soal} butir soal</span>
                      </span>

                      {item.guru && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <UserCheck size={13} className="text-slate-400 shrink-0" />
                          <span>Pengampu: <strong className="font-semibold text-slate-700 dark:text-slate-300">{item.guru}</strong></span>
                        </span>
                      )}
                    </div>

                    {/* Rincian Riwayat Pengerjaan Siswa (Jika sudah mulai / selesai) */}
                    {(item.waktu_mulai || isFinished) && (
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        {item.waktu_mulai && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
                            <Clock size={11} className="text-slate-400" />
                            <span>
                              Dikerjakan: <strong>{formatTimeOnly(item.waktu_mulai)}</strong>
                              {item.waktu_selesai ? (
                                <>
                                  {' '}– <strong>{formatTimeOnly(item.waktu_selesai)}</strong>
                                </>
                              ) : null}
                              {item.durasi_pengerjaan_menit ? ` (${item.durasi_pengerjaan_menit} mnt)` : ''}
                            </span>
                          </span>
                        )}

                        {isFinished && item.total_soal > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span>
                              Terjawab: <strong>{jumlahTerjawab}/{item.total_soal} soal</strong>
                            </span>
                          </span>
                        )}

                        {isFinished && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold',
                              pelanggaranCount === 0
                                ? 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-50/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            )}
                          >
                            {pelanggaranCount === 0 ? (
                              <>
                                <ShieldCheck size={11} />
                                <span>Tertib (0 Pelanggaran)</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert size={11} />
                                <span>{pelanggaranCount}x Peringatan Keamanan</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel Kanan: Tombol Aksi, Status Terkunci Mendatang, atau Kartu Hasil Nilai */}
                  <div className="shrink-0 lg:text-right">
                    {actionable ? (
                      <button
                        type="button"
                        onClick={goToExamRoom}
                        disabled={isPaused}
                        className={cn(
                          'w-full lg:w-auto px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98',
                          isPaused
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                        )}
                      >
                        {isPaused ? <PauseCircle size={14} /> : isResume ? <RotateCcw size={14} /> : <PlayCircle size={14} />}
                        {isPaused ? 'Menunggu Pengawas' : isResume ? 'Lanjutkan Ujian' : 'Kerjakan Ujian'}
                      </button>
                    ) : item.status_jadwal === 'DRAFT' ? (
                      <div className="flex flex-col items-stretch lg:items-end gap-1 min-w-[190px]">
                        <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center lg:justify-end gap-1.5 shadow-2xs">
                          <Lock size={13} className="text-slate-400" />
                          <span>Dibuka saat Hari H</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center lg:text-right">
                          Menunggu pengawas ruangan
                        </span>
                      </div>
                    ) : isFinished ? (
                      item.hasil && predikat ? (
                        <div
                          className={cn(
                            'p-3 rounded-xl border flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 lg:gap-1 min-w-[190px]',
                            predikat.boxClass
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md border text-[10px] font-bold',
                                predikat.badgeClass
                              )}
                            >
                              {predikat.label}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              Nilai Rapor: {Math.round(item.hasil.nilai_akhir)}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1.5">
                            <span className={cn('text-2xl sm:text-3xl font-black leading-none tracking-tight', predikat.scoreClass)}>
                              {formatScore(item.hasil.nilai_akhir)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">/ 100</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {item.hasil.jumlah_benar} Benar
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              {item.hasil.jumlah_salah} Salah
                            </span>
                            {accuracyPct !== null && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  Akurasi {accuracyPct}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Nilai menunggu rilis guru
                        </div>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SiswaCbtTab;
