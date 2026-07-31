import React, { useMemo } from 'react';
import { Input, Loader } from '../ui';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CalendarDayDetail {
  tanggal?: string;
  waktu?: string;
  waktu_tap?: string;
  status?: string;
  keterangan?: string;
  jam_masuk?: string;
  jam_pulang?: string;
}

export interface CalendarStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
  DISPEN?: number;
}

interface SharedVisualAttendanceCalendarProps {
  bulan: string; // Format YYYY-MM
  selectedDate?: string;
  onBulanChange?: (val: string) => void;
  onDateSelect?: (dateStr: string) => void;
  details?: CalendarDayDetail[];
  detailMap?: Map<string, CalendarDayDetail>;
  statistik?: CalendarStatistik;
  isLoading?: boolean;
  title?: string;
  showMonthPicker?: boolean;
  startOfWeek?: 'MINGGU' | 'SENIN';
  className?: string;
}

export const SharedVisualAttendanceCalendar: React.FC<SharedVisualAttendanceCalendarProps> = ({
  bulan,
  selectedDate,
  onBulanChange,
  onDateSelect,
  details = [],
  detailMap,
  statistik = {},
  isLoading = false,
  title = "Kalender Visual Presensi",
  showMonthPicker = true,
  startOfWeek = 'SENIN',
  className,
}) => {
  const { cells, statsCards, year, monthIdx, headers, monthName } = useMemo(() => {
    const [yStr, mStr] = (bulan || '2026-07').split('-');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = (parseInt(mStr, 10) || 7) - 1;
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();
    const firstDay = new Date(year, monthIdx, 1);
    const jsWeekday = firstDay.getDay();

    const monthName = new Date(year, monthIdx, 1).toLocaleDateString('id-ID', { month: 'long' });

    const isMingguFirst = startOfWeek === 'MINGGU';
    const headers = isMingguFirst 
      ? ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
      : ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

    const leadBlanks = isMingguFirst ? jsWeekday : (jsWeekday + 6) % 7;
    const ranks: Record<string, number> = { ALPA: 5, IZIN: 4, SAKIT: 3, TERLAMBAT: 2, HADIR: 1 };
    const marks: string[] = Array(totalDays).fill('');
    const statuses = ['ALPA', 'IZIN', 'SAKIT', 'TERLAMBAT', 'HADIR'];

    // Collect marks from detailMap or details list
    if (detailMap && detailMap.size > 0) {
      detailMap.forEach((d, dateKey) => {
        const day = parseInt(dateKey.slice(8, 10), 10);
        if (day && day >= 1 && day <= totalDays) {
          const raw = (d.status || d.keterangan || '').toString().toUpperCase();
          const s = statuses.find(k => raw.includes(k));
          if (s) {
            const cur = marks[day - 1];
            const curRank = cur === 'A' ? ranks.ALPA : cur === 'I' ? ranks.IZIN : cur === 'S' ? ranks.SAKIT : cur === 'T' ? ranks.TERLAMBAT : cur === 'H' ? ranks.HADIR : 0;
            if (ranks[s] >= curRank) {
              marks[day - 1] = s === 'ALPA' ? 'A' : s === 'IZIN' ? 'I' : s === 'SAKIT' ? 'S' : s === 'TERLAMBAT' ? 'T' : 'H';
            }
          }
        }
      });
    } else if (Array.isArray(details) && details.length > 0) {
      for (const d of details) {
        const t = d?.tanggal || d?.waktu || '';
        if (!t || typeof t !== 'string') continue;
        const day = parseInt(t.slice(8, 10), 10);
        if (!day || day < 1 || day > totalDays) continue;
        const raw = (d.status || d.keterangan || '').toString().toUpperCase();
        const s = statuses.find(k => raw.includes(k));
        if (!s) continue;
        const cur = marks[day - 1];
        const curRank = cur === 'A' ? ranks.ALPA : cur === 'I' ? ranks.IZIN : cur === 'S' ? ranks.SAKIT : cur === 'T' ? ranks.TERLAMBAT : cur === 'H' ? ranks.HADIR : 0;
        if (ranks[s] >= curRank) {
          marks[day - 1] = s === 'ALPA' ? 'A' : s === 'IZIN' ? 'I' : s === 'SAKIT' ? 'S' : s === 'TERLAMBAT' ? 'T' : 'H';
        }
      }
    }

    const cells: Array<{ day: number | null; mark: string; isWeekend: boolean }> = [];
    for (let i = 0; i < leadBlanks; i++) cells.push({ day: null, mark: '', isWeekend: false });
    for (let i = 0; i < totalDays; i++) {
      const colIdx = (leadBlanks + i) % 7;
      const isWeekend = isMingguFirst ? (colIdx === 0 || colIdx === 6) : colIdx >= 5;
      cells.push({ day: i + 1, mark: marks[i] || '', isWeekend });
    }

    const statsCards = [
      { label: 'Hadir', value: statistik.HADIR ?? 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' },
      { label: 'Izin', value: statistik.IZIN ?? 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50' },
      { label: 'Sakit', value: statistik.SAKIT ?? 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50' },
      { label: 'Alpa', value: statistik.ALPA ?? 0, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50' },
      { label: 'Terlambat', value: statistik.TERLAMBAT ?? 0, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50' },
    ];

    return { cells, statsCards, year, monthIdx, headers, monthName };
  }, [bulan, details, detailMap, statistik, startOfWeek]);

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

  if (isLoading) return <div className="p-12 flex justify-center"><Loader /></div>;

  return (
    <div className={cn("space-y-4", className)}>
      {/* HEADER & MONTH INPUT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>{title}</span>
          </h4>
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg w-fit border border-indigo-100 dark:border-indigo-900/50">
            <span>💡</span>
            <span>Klik tanggal pada kalender untuk memfilter timeline harian</span>
          </p>
        </div>
        {showMonthPicker && onBulanChange && (
          <Input 
            type="month" 
            value={bulan} 
            onChange={(e) => onBulanChange(e.target.value)} 
            className="h-9 w-44 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
          />
        )}
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {statsCards.map((s, idx) => (
          <div key={idx} className={`p-3 rounded-2xl border ${s.bg} flex flex-col items-center justify-center transition-all hover:scale-[1.02]`}>
            <div className={`text-[9px] font-black uppercase tracking-widest ${s.color} mb-0.5 opacity-80`}>{s.label}</div>
            <div className={`text-xl font-black ${s.color} tracking-tight`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* UNIFIED MODERN CALENDAR GRID CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Calendar Header Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!onBulanChange}
            className="h-8 w-8 p-0 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            {monthName} {year}
          </h2>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!onBulanChange}
            className="h-8 w-8 p-0 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day Name Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
          {headers.map(d => {
            const isWeekendHeader = d === 'SAB' || d === 'MIN';
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
          {cells.map((cell, idx) => {
            const dateStr = cell.day 
              ? `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
              : '';
            const isSelected = !!cell.day && selectedDate === dateStr;
            const isLastCol = (idx + 1) % 7 === 0;
            const borderClasses = `${isLastCol ? '' : 'border-r'} border-b border-slate-200 dark:border-slate-800/80`;

            const cellBgClass = cell.day
              ? isSelected
                ? 'bg-indigo-50/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 dark:ring-indigo-400 z-10'
                : cell.mark === 'H'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40'
                : cell.mark === 'T'
                ? 'bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/60 dark:hover:bg-purple-900/40'
                : cell.mark === 'S'
                ? 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
                : cell.mark === 'I'
                ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40'
                : cell.mark === 'A'
                ? 'bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/40'
                : cell.isWeekend
                ? 'bg-slate-100/40 dark:bg-slate-900/30'
                : 'bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
              : 'bg-slate-50/30 dark:bg-slate-900/10';

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (cell.day && onDateSelect) {
                    onDateSelect(dateStr);
                  }
                }}
                className={cn(
                  "group relative h-16 sm:h-20 p-2 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer",
                  borderClasses,
                  cellBgClass
                )}
              >
                {cell.day && (
                  <>
                    <div className="flex justify-between items-start w-full">
                      <span className={cn(
                        "text-xs font-black",
                        isSelected ? "text-indigo-600 dark:text-indigo-400" : cell.isWeekend ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {cell.day}
                      </span>
                    </div>

                    <div className="flex-1"></div>

                    {cell.mark && (
                      <div className="flex justify-center w-full">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md shadow-xs text-center w-full leading-tight border",
                          cell.mark === 'H' && "bg-emerald-500 text-white border-emerald-600",
                          cell.mark === 'T' && "bg-purple-500 text-white border-purple-600",
                          cell.mark === 'S' && "bg-amber-500 text-white border-amber-600",
                          cell.mark === 'I' && "bg-blue-500 text-white border-blue-600",
                          cell.mark === 'A' && "bg-rose-500 text-white border-rose-600"
                        )}>
                          {cell.mark === 'H' ? 'Hadir' : 
                           cell.mark === 'T' ? 'Terlambat' : 
                           cell.mark === 'S' ? 'Sakit' : 
                           cell.mark === 'I' ? 'Izin' : 
                           cell.mark === 'A' ? 'Alpa' : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
