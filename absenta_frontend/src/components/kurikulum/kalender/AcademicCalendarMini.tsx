import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  Info,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Tooltip, Button } from '@/components/ui';
import { CalendarEvent } from './EventFormModal';
import { ALL_HARI_KEYS } from '@/constants/day.constants';
import { getJenisOption } from './constants';

const INDONESIAN_DAY_NAMES = ['MINGGU', ...ALL_HARI_KEYS.slice(0, 6)];

export interface AcademicCalendarMiniProps {
  calYear: number;
  calMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onGoToToday?: () => void;
  selectedDate?: string | null; // Format: YYYY-MM-DD
  onSelectDate?: (dateStr: string | null) => void;
  events?: CalendarEvent[];
  hariSekolah?: string[];
  canManage?: boolean;
  onAddEventOnDate?: (day: number) => void;
  className?: string;
  readOnly?: boolean;
}

function formatDateToYYYYMMDD(d: Date | string): string {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const adjFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < adjFirstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function dateInRange(date: Date, mulai: Date | string, selesai: Date | string): boolean {
  const dateFormatted = formatDateToYYYYMMDD(date);
  const mulaiStr = formatDateToYYYYMMDD(mulai);
  const selesaiStr = formatDateToYYYYMMDD(selesai);
  return dateFormatted >= mulaiStr && dateFormatted <= selesaiStr;
}

export const AcademicCalendarMini: React.FC<AcademicCalendarMiniProps> = React.memo(({
  calYear,
  calMonth,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  selectedDate,
  onSelectDate,
  events = [],
  hariSekolah,
  canManage = false,
  onAddEventOnDate,
  className,
  readOnly = false,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToYYYYMMDD(today), [today]);

  const activeMonthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('id-ID', { month: 'long' });
  }, [calYear, calMonth]);

  const localizedDayNames = useMemo(() => {
    return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  }, []);

  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const isCurrentMonthView = today.getFullYear() === calYear && today.getMonth() === calMonth;

  const getDayEvents = (day: number | null): CalendarEvent[] => {
    if (!day || !events) return [];
    const date = new Date(calYear, calMonth, day);
    return events.filter(e => dateInRange(date, e.tanggal_mulai, e.tanggal_selesai));
  };

  const renderDayTooltip = (dayNumber: number, dayEvs: CalendarEvent[]) => {
    const fullDateStr = new Date(calYear, calMonth, dayNumber).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="flex flex-col gap-1.5 p-1 max-w-[240px]">
        <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">
          {fullDateStr}
        </div>
        {dayEvs.map(ev => {
          const j = getJenisOption(ev.jenis);
          return (
            <div key={ev.id} className="text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', j.dotColorClass)} />
                <span className="font-bold text-slate-800 dark:text-slate-200">{ev.judul}</span>
              </div>
              <span className="text-[9px] text-slate-400 pl-3.5 block">
                {j.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* ─── Header Mini Navigation ────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarIcon size={14} />
          </div>
          <div>
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 capitalize">
              {activeMonthName} {calYear}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onGoToToday && !isCurrentMonthView && (
            <button
              type="button"
              onClick={onGoToToday}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1 rounded-lg transition-colors border border-emerald-200/50 dark:border-emerald-800/50"
              title="Kembali ke bulan ini"
            >
              Bulan Ini
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevMonth}
            disabled={!onPrevMonth}
            className="h-7 w-7 p-0 rounded-lg"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextMonth}
            disabled={!onNextMonth}
            className="h-7 w-7 p-0 rounded-lg"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* ─── Days of Week Row ──────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/30 dark:bg-slate-900/20 py-2">
        {localizedDayNames.map((d, idx) => {
          const isWeekend = idx >= 5; // Sab & Min
          return (
            <div
              key={d}
              className={cn(
                'text-center text-[10px] font-bold tracking-wider select-none',
                isWeekend ? 'text-amber-500/80 dark:text-amber-400/80 font-extrabold' : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* ─── Days Grid ─────────────────────────────────────────── */}
      <div className="p-2 sm:p-2.5 grid grid-cols-7 gap-1">
        {calDays.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square w-full" />;
          }

          const date = new Date(calYear, calMonth, day);
          const cellDateStr = formatDateToYYYYMMDD(date);
          const dayEvents = getDayEvents(day);
          const isToday = cellDateStr === todayStr;
          const isSelected = selectedDate === cellDateStr;

          const dayOfWeekName = INDONESIAN_DAY_NAMES[date.getDay()];
          const isDefaultSchoolOffDay = hariSekolah && dayOfWeekName && !hariSekolah.includes(dayOfWeekName);

          // Get unique dot colors based on events
          const uniqueJenis = Array.from(new Set(dayEvents.map(e => e.jenis)));
          const priorityOrder = ['LIBUR_NASIONAL', 'LIBUR_SEKOLAH', 'PTS', 'PAS', 'KEGIATAN', 'MINGGU_EFEKTIF', 'LAINNYA'];
          const sortedJenis = uniqueJenis.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));

          const cellNode = (
            <button
              type="button"
              onClick={() => {
                if (onSelectDate) {
                  onSelectDate(isSelected ? null : cellDateStr);
                }
              }}
              onDoubleClick={() => {
                if (canManage && !readOnly && onAddEventOnDate) {
                  onAddEventOnDate(day);
                }
              }}
              className={cn(
                'group relative aspect-square w-full rounded-xl flex flex-col items-center justify-center p-0.5 transition-all select-none border',
                // Base background
                isSelected
                  ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600 shadow-sm font-black ring-2 ring-emerald-500/30'
                  : isToday
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 font-bold'
                  : dayEvents.length > 0
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                  : isDefaultSchoolOffDay
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              )}
              title={dayEvents.length > 0 ? `${dayEvents.length} event` : undefined}
            >
              {/* Day Number */}
              <span
                className={cn(
                  'text-[11px] sm:text-xs leading-none font-bold',
                  isSelected && 'text-white'
                )}
              >
                {day}
              </span>

              {/* Event Dot Indicators */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1 shrink-0 h-1.5">
                  {sortedJenis.slice(0, 3).map(jKey => {
                    const j = getJenisOption(jKey);
                    return (
                      <span
                        key={jKey}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          isSelected ? 'bg-white' : j.dotColorClass
                        )}
                      />
                    );
                  })}
                  {sortedJenis.length > 3 && (
                    <span className={cn('text-[7px] leading-none font-black', isSelected ? 'text-white' : 'text-slate-400')}>
                      +
                    </span>
                  )}
                </div>
              )}
            </button>
          );

          if (dayEvents.length > 0) {
            return (
              <Tooltip
                key={`day-${i}`}
                content={renderDayTooltip(day, dayEvents)}
                placement="top"
              >
                {cellNode}
              </Tooltip>
            );
          }

          return <div key={`day-${i}`}>{cellNode}</div>;
        })}
      </div>

      {/* ─── Compact Legend & Quick Reset Bar ──────────────────── */}
      <div className="mt-auto px-3 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
        <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Libur Nas</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Libur Sek</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Ujian</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Kegiatan</span>
          </div>
        </div>

        {selectedDate && onSelectDate && (
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <RotateCcw size={10} />
            <span>Reset Tgl</span>
          </button>
        )}
      </div>
    </div>
  );
});

AcademicCalendarMini.displayName = 'AcademicCalendarMini';
export default AcademicCalendarMini;
