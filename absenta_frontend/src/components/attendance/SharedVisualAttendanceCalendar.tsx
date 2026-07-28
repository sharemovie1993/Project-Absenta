import React, { useMemo } from 'react';
import { Input, Loader } from '../ui';
import { Calendar } from 'lucide-react';

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
  bulan: string;
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
}) => {
  const { cells, statsCards, year, monthIdx, headers } = useMemo(() => {
    const [yStr, mStr] = (bulan || '2026-07').split('-');
    const year = parseInt(yStr, 10) || 2026;
    const monthIdx = (parseInt(mStr, 10) || 7) - 1;
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();
    const firstDay = new Date(year, monthIdx, 1);
    const jsWeekday = firstDay.getDay();

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

    return { cells, statsCards, year, monthIdx, headers };
  }, [bulan, details, detailMap, statistik, startOfWeek]);

  if (isLoading) return <div className="p-12 flex justify-center"><Loader /></div>;

  return (
    <div className="space-y-4">
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

      {/* CALENDAR GRID CONTAINER */}
      <div className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {headers.map(d => (
            <div key={d} className="text-center text-[9px] font-black text-slate-400 tracking-widest py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">

          {cells.map((cell, idx) => {
            const dateStr = cell.day 
              ? `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
              : '';
            const isSelected = !!cell.day && selectedDate === dateStr;

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (cell.day && onDateSelect) {
                    onDateSelect(dateStr);
                  }
                }}
                className={`relative h-9 sm:h-10 md:h-11 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center ${
                  !cell.day 
                    ? 'bg-transparent border-transparent' 
                    : isSelected
                    ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100 font-black shadow-md scale-105 z-10 cursor-pointer'
                    : cell.mark === 'H' 
                    ? 'bg-emerald-50/90 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold hover:scale-105 cursor-pointer' 
                    : cell.mark === 'T' 
                    ? 'bg-purple-50/90 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold hover:scale-105 cursor-pointer' 
                    : cell.mark === 'S' 
                    ? 'bg-amber-50/90 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold hover:scale-105 cursor-pointer' 
                    : cell.mark === 'I' 
                    ? 'bg-blue-50/90 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold hover:scale-105 cursor-pointer' 
                    : cell.mark === 'A' 
                    ? 'bg-rose-50/90 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold hover:scale-105 cursor-pointer' 
                    : cell.isWeekend 
                    ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 opacity-40 hover:opacity-100 cursor-pointer' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:scale-105 cursor-pointer'
                }`}
              >
                {cell.day && (
                  <>
                    <span className={`text-xs font-black ${
                      isSelected ? 'text-indigo-950 dark:text-indigo-100' : cell.mark ? 'text-current' : 'text-slate-500 dark:text-slate-400'
                    }`}>{cell.day}</span>
                    {cell.mark && (
                      <span className="text-[8px] font-black uppercase tracking-tight -mt-0.5 opacity-90">
                        {cell.mark === 'H' ? 'Hadir' : 
                         cell.mark === 'T' ? 'Telat' : 
                         cell.mark === 'S' ? 'Sakit' : 
                         cell.mark === 'I' ? 'Izin' : 
                         cell.mark === 'A' ? 'Alpa' : ''}
                      </span>
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
