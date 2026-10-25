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
  const { cells, year, monthIdx, monthName, hasPklActive } = useMemo(() => {
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
    let hasPkl = false;

    if (Array.isArray(details)) {
      for (const d of details) {
        const t = d?.tanggal || (d?.waktu ? d.waktu.slice(0, 10) : '');
        if (t) {
          detailMap.set(t, d);
          if (d.channels?.pkl && d.channels.pkl.status !== 'NON_PKL') {
            hasPkl = true;
          }
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

    return { cells, year, monthIdx, monthName, hasPklActive: hasPkl };
  }, [bulan, details]);

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
      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CalendarIcon size={14} className="text-primary" />
            <span>{title}</span>
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Visual strip 4 channel per hari. Tanggal merah/oranye menandakan adanya anomali absensi.
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
                  className="h-16 sm:h-20 bg-slate-50/20 dark:bg-slate-900/10 pointer-events-none"
                />
              );
            }

            const detail = cell.detail;
            const channels = detail?.channels;
            const anomali = detail?.anomali;
            const isSelected = selectedDate === cell.dateKey;
            const isAnomali = Boolean(anomali?.is_anomali);

            // Channel Status Colors
            const gerbangColor =
              channels?.gerbang?.status === 'HADIR'
                ? 'bg-emerald-500'
                : channels?.gerbang?.status === 'TERLAMBAT'
                ? 'bg-amber-500'
                : channels?.gerbang?.status === 'TIDAK_TAP'
                ? 'bg-slate-200 dark:bg-slate-700'
                : 'bg-rose-500';

            const pembiasaanColor =
              channels?.pembiasaan?.status === 'HADIR'
                ? 'bg-emerald-500'
                : channels?.pembiasaan?.status === 'ALPA'
                ? 'bg-rose-500'
                : 'bg-slate-100 dark:bg-slate-800';

            const kbmColor =
              channels?.kbm?.status === 'FULL'
                ? 'bg-emerald-500'
                : channels?.kbm?.status === 'PARTIAL'
                ? 'bg-amber-500'
                : channels?.kbm?.status === 'ALPA'
                ? 'bg-rose-500'
                : 'bg-slate-100 dark:bg-slate-800';

            const pklColor =
              channels?.pkl?.status === 'HADIR'
                ? 'bg-purple-500'
                : channels?.pkl?.status === 'ALPA'
                ? 'bg-rose-500'
                : 'bg-slate-100 dark:bg-slate-800';

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => onDateSelect?.(cell.dateKey)}
                className={cn(
                  'h-16 sm:h-20 p-1 sm:p-1.5 flex flex-col justify-between text-left transition-all relative cursor-pointer group',
                  cell.isWeekend
                    ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200',
                  isSelected &&
                    'ring-2 ring-primary ring-inset bg-primary/5 dark:bg-primary/10 shadow-xs z-10',
                  isAnomali &&
                    !isSelected &&
                    'bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60'
                )}
              >
                {/* Top Row: Date Number & Anomali Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-bold leading-none inline-flex items-center justify-center rounded-md px-1 py-0.5',
                      isSelected
                        ? 'bg-primary text-white'
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
                      className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 animate-pulse"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                    </span>
                  )}
                </div>

                {/* Bottom Row: Multi-Channel Strips */}
                {detail ? (
                  <div className="space-y-0.5 sm:space-y-1 w-full pt-1">
                    {/* Strip 1: Gerbang */}
                    <div className="flex items-center gap-1">
                      <div
                        className={cn('h-1 sm:h-1.5 flex-1 rounded-full', gerbangColor)}
                        title={`Gerbang: ${channels?.gerbang?.status || '-'}`}
                      />
                    </div>

                    {/* Strip 2: Pembiasaan */}
                    {channels?.pembiasaan?.status !== 'TIDAK_ADA' && (
                      <div className="flex items-center gap-1">
                        <div
                          className={cn('h-1 sm:h-1.5 flex-1 rounded-full', pembiasaanColor)}
                          title={`Pembiasaan: ${channels?.pembiasaan?.status || '-'}`}
                        />
                      </div>
                    )}

                    {/* Strip 3: KBM */}
                    {channels?.kbm?.status !== 'TIDAK_ADA' && (
                      <div className="flex items-center gap-1">
                        <div
                          className={cn('h-1 sm:h-1.5 flex-1 rounded-full', kbmColor)}
                          title={`KBM: ${channels?.kbm?.status || '-'}`}
                        />
                      </div>
                    )}

                    {/* Strip 4: PKL (if active) */}
                    {hasPklActive && channels?.pkl?.status !== 'NON_PKL' && (
                      <div className="flex items-center gap-1">
                        <div
                          className={cn('h-1 sm:h-1.5 flex-1 rounded-full', pklColor)}
                          title={`PKL: ${channels?.pkl?.status || '-'}`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/40 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STRIP LEGEND */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[9.5px]">
          Panduan Strip Channel:
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Hadir Tepat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Terlambat / Sebagian KBM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Alpa / Bolos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Presensi PKL</span>
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
