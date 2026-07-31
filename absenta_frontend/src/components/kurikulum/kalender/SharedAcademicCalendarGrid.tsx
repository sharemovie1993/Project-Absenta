import React, { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { Tooltip, Button } from '../../ui';
import {
  CalendarEvent,
} from './EventFormModal';
import {
  ALL_HARI_KEYS
} from '../../../constants/day.constants';
import {
  getJenisOption,
  JENIS_OPTIONS
} from './constants';

const INDONESIAN_DAY_NAMES = ['MINGGU', ...ALL_HARI_KEYS.slice(0, 6)];

export interface SharedAcademicCalendarGridProps {
  calYear: number;
  calMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  events?: CalendarEvent[];
  hariSekolah?: string[];
  canManage?: boolean;
  onAddEventOnDate?: (day: number) => void;
  showLegend?: boolean;
  showMonthHeaderNav?: boolean;
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

export const SharedAcademicCalendarGrid: React.FC<SharedAcademicCalendarGridProps> = ({
  calYear,
  calMonth,
  onPrevMonth,
  onNextMonth,
  events = [],
  hariSekolah,
  canManage = false,
  onAddEventOnDate,
  showLegend = true,
  showMonthHeaderNav = true,
  className,
  readOnly = false
}) => {
  const today = useMemo(() => new Date(), []);

  const activeMonthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('id-ID', { month: 'long' });
  }, [calYear, calMonth]);

  const localizedDayNames = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2020, 0, 6 + i).toLocaleDateString('id-ID', { weekday: 'short' })
    );
  }, []);

  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const getDayEvents = (day: number | null): CalendarEvent[] => {
    if (!day || !events) return [];
    const date = new Date(calYear, calMonth, day);
    return events.filter(e => dateInRange(date, e.tanggal_mulai, e.tanggal_selesai));
  };

  const renderDayTooltip = (dayEvs: CalendarEvent[]) => {
    return (
      <div className="flex flex-col gap-2 p-1 max-w-[260px]">
        {dayEvs?.map(ev => {
          const j = getJenisOption(ev.jenis);
          return (
            <div key={ev.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-1.5 last:pb-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("w-1.5 h-1.5 rounded-full", j.dotColorClass)} />
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 leading-tight">{ev.judul}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {formatDateToYYYYMMDD(ev.tanggal_mulai)} s/d {formatDateToYYYYMMDD(ev.tanggal_selesai)}
              </p>
              {ev.keterangan && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">{ev.keterangan}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ─── Legend ────────────────────────────────────────────── */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm">
          <span className="font-bold text-slate-700 dark:text-slate-300 mr-1 uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Info size={13} className="text-indigo-500" /> Keterangan Warna:
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Libur Nasional</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Libur Sekolah</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Ujian (STS / SAS)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Kegiatan Sekolah</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-semibold">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Libur Rutin Mingguan</span>
          </div>
        </div>
      )}

      {/* ─── Calendar Grid Container ────────────────────────────── */}
      <div id="calendar-grid" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Calendar Header Nav */}
        {showMonthHeaderNav && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrevMonth}
              disabled={!onPrevMonth}
              className="h-8 w-8 p-0 rounded-xl"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </Button>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {activeMonthName} {calYear}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNextMonth}
              disabled={!onNextMonth}
              className="h-8 w-8 p-0 rounded-xl"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}

        {/* Day Name Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
          {localizedDayNames?.map(d => {
            const isWeekendHeader = d === 'Sab' || d === 'Min';
            return (
              <div
                key={d}
                className={cn(
                  "text-center text-[10px] font-black uppercase tracking-widest py-3 border-r last:border-r-0 border-slate-200 dark:border-slate-800",
                  isWeekendHeader ? "bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-extrabold" : "text-slate-400 dark:text-slate-500"
                )}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {calDays?.map((day, i) => {
            const dayEvents = getDayEvents(day);
            const isToday = day !== null && today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

            // Border classes
            const isLastCol = (i + 1) % 7 === 0;
            const borderClasses = `${isLastCol ? '' : 'border-r'} border-b border-slate-200 dark:border-slate-800/80`;

            const cellBgClass = day
              ? 'bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
              : 'bg-slate-50/30 dark:bg-slate-900/10';

            let eventCellClasses = '';
            const date = day ? new Date(calYear, calMonth, day) : null;
            const dayOfWeekName = date ? INDONESIAN_DAY_NAMES[date.getDay()] : null;
            const isDefaultSchoolOffDay = hariSekolah && dayOfWeekName && !hariSekolah.includes(dayOfWeekName);

            if (day) {
              if (dayEvents.length > 0) {
                const priorityOrder = ['LIBUR_NASIONAL', 'LIBUR_SEKOLAH', 'PTS', 'PAS', 'KEGIATAN', 'MINGGU_EFEKTIF', 'LAINNYA'];
                const sortedEvents = [...dayEvents].sort((a, b) => {
                  return priorityOrder.indexOf(a.jenis) - priorityOrder.indexOf(b.jenis);
                });
                const primaryEvent = sortedEvents[0];
                const j = getJenisOption(primaryEvent.jenis);
                if (j) {
                  eventCellClasses = `${j.bgColorClass} border-l-[3px] ${j.borderColorClass}`;
                }
              }
            }

            const innerContent = day ? (
              <>
                <div className="flex justify-between items-start w-full">
                  {isToday ? (
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm shadow-indigo-500/30">
                      {day}
                    </span>
                  ) : (
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                      {day}
                    </span>
                  )}
                  {canManage && !readOnly && onAddEventOnDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddEventOnDate(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 bg-white dark:bg-slate-800 shadow-sm cursor-pointer"
                      title="Tambah event pada tanggal ini"
                      aria-label={`Tambah event pada tanggal ${day}`}
                    >
                      <Plus size={10} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>

                <div className="flex-1"></div>

                {dayEvents.length > 0 && (
                  <div className="flex flex-col gap-1 w-full mt-auto">
                    {dayEvents.slice(0, 1)?.map((ev: CalendarEvent) => {
                      const j = getJenisOption(ev.jenis);
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "text-[9px] font-bold rounded px-1.5 py-0.5 overflow-hidden text-ellipsis whitespace-nowrap shadow-sm border border-black/5 dark:border-white/5 text-center leading-normal",
                            j.bgColorClass,
                            j.textColorClass
                          )}
                        >
                          {ev.judul}
                        </div>
                      );
                    })}
                    {dayEvents.length > 1 && (
                      <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 text-center leading-none mt-0.5">
                        +{dayEvents.length - 1} lagi
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null;

            const commonClasses = `group h-28 p-2.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${borderClasses} ${cellBgClass}`;

            if (day && dayEvents.length > 0) {
              return (
                <Tooltip
                  key={i}
                  content={renderDayTooltip(dayEvents)}
                  placement="top"
                  className={cn(commonClasses, eventCellClasses)}
                >
                  {innerContent}
                </Tooltip>
              );
            }

            return (
              <div
                key={i}
                className={cn(commonClasses, eventCellClasses, isDefaultSchoolOffDay && "bg-slate-100/55 dark:bg-slate-900/50")}
              >
                {innerContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SharedAcademicCalendarGrid;
