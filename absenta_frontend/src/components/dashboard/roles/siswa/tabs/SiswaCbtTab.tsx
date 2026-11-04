import React, { useMemo, useState } from 'react';
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
  FileQuestion,
  KeyRound,
  RefreshCw,
  ChevronRight,
  Hourglass,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtStudentExamItem } from '@/types/cbt.types';

type FilterKey = 'aktif' | 'riwayat' | 'semua';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'aktif', label: 'Sedang Berlangsung' },
  { key: 'riwayat', label: 'Riwayat' },
  { key: 'semua', label: 'Semua' },
];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Ujian yang masih bisa dikerjakan / dilanjutkan oleh siswa */
const isActionable = (item: CbtStudentExamItem) =>
  (item.status_jadwal === 'ACTIVE' || item.status_jadwal === 'PAUSED') &&
  item.status_peserta !== 'FINISHED' &&
  item.status_peserta !== 'DISQUALIFIED';

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
  return {
    label: 'Tidak Mengikuti',
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: Ban,
  };
};

export const SiswaCbtTab: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('aktif');

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
      riwayat: exams.filter((e) => !isActionable(e)).length,
      semua: exams.length,
    }),
    [exams]
  );

  const filtered = useMemo(() => {
    if (filter === 'aktif') return exams.filter(isActionable);
    if (filter === 'riwayat') return exams.filter((e) => !isActionable(e));
    return exams;
  }, [exams, filter]);

  const finishedWithScore = useMemo(() => exams.filter((e) => e.hasil), [exams]);
  const avgScore = useMemo(() => {
    if (finishedWithScore.length === 0) return null;
    const sum = finishedWithScore.reduce((acc, e) => acc + (e.hasil?.nilai_akhir || 0), 0);
    return Math.round((sum / finishedWithScore.length) * 10) / 10;
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
            <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">Ruang Ujian CBT</h3>
            <p className="text-xs text-violet-100/85 font-medium">
              Masukkan token resmi dari pengawas untuk memulai ujian yang sedang dibuka.
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

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Ujian Dibuka</span>
          <span className="text-lg sm:text-xl font-black text-violet-600 dark:text-violet-400">{counts.aktif}</span>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Sudah Dikerjakan</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            {exams.filter((e) => e.status_peserta === 'FINISHED').length}
          </span>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Rata-Rata Nilai</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{avgScore ?? '-'}</span>
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
              <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
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
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileQuestion size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {filter === 'aktif' ? 'Belum ada ujian yang dibuka' : 'Belum ada riwayat ujian'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'aktif'
                ? 'Ujian akan muncul di sini saat pengawas mengaktifkan sesi untuk kelasmu. Daftar ini diperbarui otomatis.'
                : 'Ujian yang sudah selesai atau ditutup akan tercatat di sini.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((item) => {
              const meta = getStatusMeta(item);
              const StatusIcon = meta.icon;
              const actionable = isActionable(item);
              const isPaused = item.status_jadwal === 'PAUSED';
              const isResume = item.status_peserta === 'IN_PROGRESS';

              return (
                <li key={item.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold',
                          meta.className
                        )}
                      >
                        <StatusIcon size={11} />
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {item.mapel}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{item.nama_sesi}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDateTime(item.tanggal_mulai)} – {formatDateTime(item.tanggal_selesai)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {item.durasi_menit} menit
                      </span>
                      <span className="flex items-center gap-1">
                        <FileQuestion size={12} />
                        {item.total_soal} soal
                      </span>
                      {item.guru && <span className="truncate">Pengampu: {item.guru}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    {actionable ? (
                      <button
                        type="button"
                        onClick={goToExamRoom}
                        disabled={isPaused}
                        className={cn(
                          'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98',
                          isPaused
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                        )}
                      >
                        {isPaused ? <PauseCircle size={14} /> : isResume ? <RotateCcw size={14} /> : <PlayCircle size={14} />}
                        {isPaused ? 'Menunggu Pengawas' : isResume ? 'Lanjutkan Ujian' : 'Kerjakan Ujian'}
                      </button>
                    ) : item.status_peserta === 'FINISHED' ? (
                      item.hasil ? (
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                            {item.hasil.nilai_akhir}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.hasil.jumlah_benar} benar • {item.hasil.jumlah_salah} salah
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Nilai menunggu rilis guru
                        </span>
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
