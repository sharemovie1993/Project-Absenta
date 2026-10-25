import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  DoorOpen,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';
import type { CalendarDayDetail } from './MultiChannelMonthlyCalendar';

interface MonthlyAnomalyFeedProps {
  details?: CalendarDayDetail[];
  selectedDate?: string;
  onDateSelect: (dateStr: string) => void;
  className?: string;
}

export const MonthlyAnomalyFeed: React.FC<MonthlyAnomalyFeedProps> = React.memo(({
  details = [],
  selectedDate,
  onDateSelect,
  className,
}) => {
  const [filterMode, setFilterMode] = useState<'ANOMALY_ONLY' | 'ALL'>('ANOMALY_ONLY');

  // Format date helper: "Selasa, 06 Okt 2026"
  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const { anomalyDays, allDays } = useMemo(() => {
    const list = Array.isArray(details) ? details : [];
    // Sort descending by date
    const sorted = [...list].sort((a, b) => {
      const da = a.tanggal || a.waktu || '';
      const db = b.tanggal || b.waktu || '';
      return db.localeCompare(da);
    });

    const anomalies = sorted.filter((d) => d.anomali?.is_anomali);
    return {
      anomalyDays: anomalies,
      allDays: sorted,
    };
  }, [details]);

  const displayedList = filterMode === 'ANOMALY_ONLY' ? anomalyDays : allDays;

  return (
    <div className={cn('space-y-4 w-full min-w-0', className)}>
      {/* FILTER BUTTONS & SUMMARY STRIP */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterMode('ANOMALY_ONLY')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              filterMode === 'ANOMALY_ONLY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Butuh Perhatian ({anomalyDays.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Semua Hari ({allDays.length})</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Menampilkan kronologi dan deteksi anomali absensi bulanan siswa.
        </p>
      </div>

      {/* FEED CARDS LIST */}
      {displayedList.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {filterMode === 'ANOMALY_ONLY'
              ? 'Tidak Ditemukan Anomali Absensi'
              : 'Tidak Ada Data Presensi'}
          </h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {filterMode === 'ANOMALY_ONLY'
              ? 'Siswa hadir tepat waktu dan mematuhi seluruh sesi pembelajaran sepanjang bulan ini.'
              : 'Belum ada catatan aktivitas pada rentang bulan ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((item) => {
            const rawDate = item.tanggal || item.waktu || '';
            const dateStr = typeof rawDate === 'string' && rawDate.length >= 10 ? rawDate.slice(0, 10) : '';
            const isSelected = selectedDate === dateStr;
            const anomali = item.anomali;
            const channels = item.channels;
            const isAnomali = Boolean(anomali?.is_anomali);

            return (
              <div
                key={dateStr || item.id}
                className={cn(
                  'p-3.5 sm:p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-2xs space-y-3',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : isAnomali
                    ? 'border-rose-200/80 dark:border-rose-900/60 hover:border-rose-300'
                    : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                )}
              >
                {/* Header: Date + Anomali / Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatDateLabel(dateStr)}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-white">
                        Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isAnomali ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>
                          {anomali?.tipe === 'CABUT_KBM'
                            ? 'Indikasi Cabut Kelas'
                            : anomali?.tipe === 'TERLAMBAT_GERBANG'
                            ? 'Terlambat Pintu Masuk'
                            : anomali?.tipe === 'TAP_GANTUNG'
                            ? 'Tap Gantung (Belum Pulang)'
                            : anomali?.tipe === 'LEWAT_PEMBIASAAN'
                            ? 'Melewatkan Pembiasaan'
                            : 'Alpa Seluruh Channel'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Presensi Normal</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Anomaly Description Message if any */}
                {anomali?.pesan && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{anomali.pesan}</span>
                  </div>
                )}

                {/* Multi-Channel 4-Column Breakdown Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  {/* Channel 1: Gerbang */}
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <DoorOpen className="w-3 h-3 text-indigo-500" />
                      <span>Gerbang</span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                      {channels?.gerbang?.waktu_masuk
                        ? `Masuk: ${channels.gerbang.waktu_masuk}`
                        : 'Tidak Ada Tap'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {channels?.gerbang?.waktu_pulang
                        ? `Pulang: ${channels.gerbang.waktu_pulang}`
                        : channels?.gerbang?.is_tap_gantung
                        ? '⚠️ Belum Tap Pulang'
                        : '-'}
                    </div>
                  </div>

                  {/* Channel 2: Pembiasaan */}
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <BookOpen className="w-3 h-3 text-emerald-500" />
                      <span>Pembiasaan</span>
                    </div>
                    <div
                      className={cn(
                        'font-semibold text-[11px] truncate',
                        channels?.pembiasaan?.status === 'HADIR'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : channels?.pembiasaan?.status === 'ALPA'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      )}
                    >
                      {channels?.pembiasaan?.status || 'Tidak Ada Sesi'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {channels?.pembiasaan?.nama || 'Dhuha / Apel'}
                    </div>
                  </div>

                  {/* Channel 3: KBM */}
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <GraduationCap className="w-3 h-3 text-amber-500" />
                      <span>Sesi KBM</span>
                    </div>
                    <div
                      className={cn(
                        'font-semibold text-[11px] truncate',
                        channels?.kbm?.status === 'FULL'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : channels?.kbm?.status === 'PARTIAL'
                          ? 'text-amber-600 dark:text-amber-400'
                          : channels?.kbm?.status === 'ALPA'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      )}
                    >
                      {channels?.kbm?.total_sesi
                        ? `${channels.kbm.hadir_sesi}/${channels.kbm.total_sesi} JP Hadir`
                        : 'Tidak Ada Sesi'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {channels?.kbm?.alpa_sesi
                        ? `⚠️ ${channels.kbm.alpa_sesi} JP Alpa`
                        : 'Semua Terpenuhi'}
                    </div>
                  </div>

                  {/* Channel 4: PKL */}
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Briefcase className="w-3 h-3 text-purple-500" />
                      <span>DU/DI (PKL)</span>
                    </div>
                    <div
                      className={cn(
                        'font-semibold text-[11px] truncate',
                        channels?.pkl?.status === 'HADIR'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-slate-500'
                      )}
                    >
                      {channels?.pkl?.status === 'NON_PKL'
                        ? 'Non-PKL'
                        : channels?.pkl?.status || 'Non-PKL'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {channels?.pkl?.mitra || 'Pembelajaran di Sekolah'}
                    </div>
                  </div>
                </div>

                {/* Footer Action: Drill-down to this day */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onDateSelect(dateStr)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border border-primary/20 transition-all cursor-pointer"
                  >
                    <span>Periksa Timeline Jam per Jam</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

MonthlyAnomalyFeed.displayName = 'MonthlyAnomalyFeed';
