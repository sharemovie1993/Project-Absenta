import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, Loader } from '@/components/ui';

export interface MultiChannelDay {
  gerbang?: {
    status: string;
    waktu_masuk?: string | null;
    waktu_pulang?: string | null;
    is_terlambat?: boolean;
    is_tap_gantung?: boolean;
  };
  pembiasaan?: {
    status: string;
    nama?: string | null;
  };
  kbm?: {
    status: string;
    total_sesi: number;
    hadir_sesi: number;
    alpa_sesi: number;
    daftar_mapel?: Array<{ mapel: string; status: string; jam?: string }>;
  };
  pkl?: {
    status: string;
    mitra?: string | null;
    waktu_masuk?: string | null;
    waktu_pulang?: string | null;
  };
}

export interface AnomaliDay {
  is_anomali: boolean;
  tipe?: string;
  pesan?: string;
}

export interface CalendarDayDetail {
  id?: string;
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
  channels?: MultiChannelDay;
  anomali?: AnomaliDay;
}

export interface ChannelSummary {
  gerbang: { total_hadir: number; total_terlambat: number; total_tidak_tap: number; total_tap_gantung: number };
  pembiasaan: { total_hadir: number; total_alpa: number };
  kbm: { total_sesi: number; hadir_sesi: number; alpa_sesi: number; persentase: number };
  pkl: { is_active: boolean; total_hadir: number; total_alpa: number; mitra_nama?: string };
  anomali_count: number;
}

export interface CalendarStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
  DISPEN?: number;
  channel_summary?: ChannelSummary;
}

interface MultiChannelMonthlyCalendarProps {
  bulan: string; // YYYY-MM
  selectedDate?: string;
  onBulanChange?: (val: string) => void;
  onDateSelect?: (dateStr: string) => void;
  details?: CalendarDayDetail[];
  statistik?: CalendarStatistik;
  isLoading?: boolean;
  title?: string;
  className?: string;
}

export const MultiChannelMonthlyCalendar: React.FC<MultiChannelMonthlyCalendarProps> = React.memo(({
  bulan,
  selectedDate,
  onBulanChange,
  onDateSelect,
  details = [],
  statistik = {},
  isLoading = false,
  title = 'Kalender Visual Multi-Channel',
  className,
}) => {
  const { cells, year, monthIdx, monthName, statsCards } = useMemo(() => {
    const [yStr, mStr] = (bulan || '2026-10').split('-');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = (parseInt(mStr, 10) || 10) - 1;
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();
    const firstDay = new Date(year, monthIdx, 1);
    const jsWeekday = firstDay.getDay();

    const monthName = new Date(year, monthIdx, 1).toLocaleDateString('id-ID', { month: 'long' });

    // Senin - Minggu (ISO)
    const leadBlanks = (jsWeekday + 6) % 7;

    // Map details by date YYYY-MM-DD
    const detailMap = new Map<string, CalendarDayDetail>();

    if (Array.isArray(details)) {
      for (const d of details) {
        const rawT = d?.tanggal || d?.waktu || '';
        const t = typeof rawT === 'string' && rawT.length >= 10 ? rawT.slice(0, 10) : '';
        if (t) {
          detailMap.set(t, d);
        }
      }
    }

    const cells: Array<{
      day: number | null;
      dateKey: string;
      isWeekend: boolean;
      detail?: CalendarDayDetail;
    }> = [];

    // Lead blanks
    for (let i = 0; i < leadBlanks; i++) {
      cells.push({ day: null, dateKey: '', isWeekend: false });
    }

    // Days in month
    for (let i = 1; i <= totalDays; i++) {
      const colIdx = (leadBlanks + i - 1) % 7;
      const isWeekend = colIdx >= 5;
      const dayStr = String(i).padStart(2, '0');
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const detail = detailMap.get(dateKey);

      cells.push({
        day: i,
        dateKey,
        isWeekend,
        detail,
      });
    }

    const statsCards = [
      {
        label: 'Hadir',
        value: statistik.HADIR ?? 0,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50',
      },
      {
        label: 'Terlambat',
        value: statistik.TERLAMBAT ?? 0,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50',
      },
      {
        label: 'Izin',
        value: statistik.IZIN ?? 0,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50',
      },
      {
        label: 'Sakit',
        value: statistik.SAKIT ?? 0,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
      },
      {
        label: 'Alpa',
        value: statistik.ALPA ?? 0,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50',
      },
    ];

    return { cells, year, monthIdx, monthName, statsCards };
  }, [bulan, details, statistik]);

  const handlePrevMonth = () => {
    if (!onBulanChange) return;
    const prevDate = new Date(year, monthIdx - 1, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    onBulanChange(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    if (!onBulanChange) return;
    const nextDate = new Date(year, monthIdx + 1, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    onBulanChange(`${y}-${m}`);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader />
      </div>
    );
  }

  const headers = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

  return (
    <div className={cn('space-y-4 w-full min-w-0', className)}>
      {/* 5 MACRO STATS BADGES */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {statsCards.map((s, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-xl border ${s.bg} flex flex-col items-center justify-center transition-all hover:scale-[1.02]`}
          >
            <div className={`text-[9px] font-black uppercase tracking-widest ${s.color} mb-0.5 opacity-80`}>
              {s.label}
            </div>
            <div className={`text-lg sm:text-xl font-black ${s.color} tracking-tight`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
        <div className="space-y-0.5">
          <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CalendarIcon size={14} className="text-primary" />
            <span>{title}</span>
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Klik kotak tanggal untuk memeriksa rincian log aktivitas dan sesi kelas hari tersebut.
          </p>
        </div>

        {onBulanChange && (
          <Input
            type="month"
            value={bulan}
            onChange={(e) => onBulanChange(e.target.value)}
            className="h-8.5 w-40 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        )}
      </div>

      {/* CALENDAR CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        {/* Month Header Nav */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!onBulanChange}
            className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            {monthName} {year}
          </h2>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!onBulanChange}
            className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day Names Grid */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-center py-2">
          {headers.map((h, i) => (
            <div
              key={h}
              className={cn(
                'text-[10px] font-black tracking-wider',
                i >= 5 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Date Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {cells.map((cell, idx) => {
            if (!cell.day) {
              return (
                <div
                  key={`blank-${idx}`}
                  className="min-h-[72px] sm:min-h-[86px] bg-slate-50/20 dark:bg-slate-900/10 pointer-events-none"
                />
              );
            }

            const detail = cell.detail;
            const channels = detail?.channels;
            const anomali = detail?.anomali;
            const isSelected = selectedDate === cell.dateKey;
            const isAnomali = Boolean(anomali?.is_anomali);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => onDateSelect?.(cell.dateKey)}
                className={cn(
                  'min-h-[72px] sm:min-h-[86px] p-1.5 sm:p-2 flex flex-col justify-between text-left transition-all relative cursor-pointer group',
                  cell.isWeekend
                    ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200',
                  isSelected &&
                    'ring-2 ring-primary ring-inset bg-primary/5 dark:bg-primary/10 shadow-xs z-10',
                  isAnomali &&
                    !isSelected &&
                    'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                )}
              >
                {/* Top Row: Date Number & Anomali Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      'text-[10.5px] sm:text-xs font-bold leading-none inline-flex items-center justify-center rounded-md px-1 py-0.5',
                      isSelected
                        ? 'bg-primary text-white shadow-2xs'
                        : cell.isWeekend
                        ? 'text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    )}
                  >
                    {cell.day}
                  </span>

                  {isAnomali && (
                    <span
                      title={anomali?.pesan || 'Memerlukan Perhatian'}
                      className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                    </span>
                  )}
                </div>

                {/* Bottom Row: Detailed Channel Badges & Status */}
                {detail ? (
                  <div className="space-y-1 w-full pt-1">
                    {/* Status Pill in cell */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          'text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-md leading-tight truncate',
                          detail.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900'
                            : detail.status === 'TERLAMBAT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900'
                            : detail.status === 'SAKIT' || detail.status === 'IZIN'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900'
                        )}
                      >
                        {detail.status}
                      </span>

                      {channels?.gerbang?.waktu_masuk && (
                        <span className="text-[8.5px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                          {channels.gerbang.waktu_masuk}
                        </span>
                      )}
                    </div>

                    {/* Micro Tags Per Channel */}
                    <div className="flex items-center gap-1 flex-wrap text-[8px] sm:text-[8.5px] leading-tight">
                      {channels?.gerbang?.status === 'HADIR' && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                          title={`Gerbang: Masuk ${channels.gerbang.waktu_masuk || ''}`}
                        >
                          <DoorOpen className="w-2.5 h-2.5" />
                          <span>{channels.gerbang.waktu_masuk || 'Masuk'}</span>
                        </span>
                      )}

                      {channels?.pembiasaan?.status === 'HADIR' && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                          title={`Pembiasaan: ${channels.pembiasaan.nama || 'Hadir'}`}
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>{channels.pembiasaan.nama ? channels.pembiasaan.nama.slice(0, 4) : 'Dhuha'}</span>
                        </span>
                      )}

                      {channels?.kbm?.status === 'FULL' && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold"
                          title={`KBM: ${channels.kbm.hadir_sesi} JP`}
                        >
                          <GraduationCap className="w-2.5 h-2.5" />
                          <span>{channels.kbm.hadir_sesi} JP</span>
                        </span>
                      )}

                      {channels?.pkl?.status === 'HADIR' && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold"
                          title={`PKL: ${channels.pkl.mitra || 'DU/DI'}`}
                        >
                          <Briefcase className="w-2.5 h-2.5" />
                          <span>PKL</span>
                        </span>
                      )}
                    </div>

                    {/* Anomaly Flag Callout */}
                    {isAnomali && (
                      <div className="text-[7.5px] sm:text-[8px] font-bold text-rose-700 dark:text-rose-300 truncate bg-rose-100/70 dark:bg-rose-950/80 px-1 py-0.5 rounded border border-rose-200/80 dark:border-rose-900">
                        ⚠️ {anomali?.tipe === 'TAP_GANTUNG' ? 'Belum Pulang' : anomali?.tipe === 'CABUT_KBM' ? 'Bolos KBM' : 'Anomali'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/40 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STRIP LEGEND */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[9.5px]">
          Keterangan Tag:
        </span>
        <div className="flex items-center gap-1.5">
          <DoorOpen className="w-3 h-3 text-indigo-500" />
          <span>Tap Gerbang</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-emerald-500" />
          <span>Pembiasaan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GraduationCap className="w-3 h-3 text-amber-500" />
          <span>Sesi KBM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3 h-3 text-purple-500" />
          <span>Presensi DU/DI (PKL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          <span className="font-medium text-rose-600 dark:text-rose-400">Anomali Terdeteksi</span>
        </div>
      </div>
    </div>
  );
});

MultiChannelMonthlyCalendar.displayName = 'MultiChannelMonthlyCalendar';
