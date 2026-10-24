import React from 'react';
import { BookOpen, Users, FileEdit, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherOpsMicroGridProps {
  totalJp: number;
  totalMinutes: number;
  studentsPresentCount?: number;
  studentsTotalCount?: number;
  unfilledJournalsCount: number;
  currentJp: number;
  targetJp?: number;
  onOpenSchedule?: () => void;
  onOpenJournals?: () => void;
  onOpenBeban?: () => void;
  className?: string;
}

export const TeacherOpsMicroGrid: React.FC<TeacherOpsMicroGridProps> = React.memo(({
  totalJp,
  totalMinutes,
  studentsPresentCount = 0,
  studentsTotalCount = 0,
  unfilledJournalsCount,
  currentJp,
  targetJp = 24,
  onOpenSchedule,
  onOpenJournals,
  onOpenBeban,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:gap-3.5 w-full", className)}>
      {/* 1. Sesi KBM Hari Ini */}
      <button
        type="button"
        onClick={onOpenSchedule}
        className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer hover:border-blue-500/40 active:scale-95 transition-all select-none min-h-[68px] sm:min-h-[76px]"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
          <BookOpen size={15} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
          Sesi KBM
        </span>
        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
          {totalJp} <span className="text-[10px] font-semibold text-slate-400">JP</span>
        </div>
      </button>

      {/* 2. Presensi Siswa */}
      <div className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center select-none min-h-[68px] sm:min-h-[76px]">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 shrink-0">
          <Users size={15} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
          Siswa
        </span>
        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
          {studentsPresentCount > 0 ? (
            <span>{studentsPresentCount}<span className="text-[10px] font-medium text-slate-400">/{studentsTotalCount || studentsPresentCount}</span></span>
          ) : (
            <span className="text-slate-400 font-semibold text-[11px]">-</span>
          )}
        </div>
      </div>

      {/* 3. Jurnal KBM (dengan red badge counter jika ada hutang jurnal) */}
      <button
        type="button"
        onClick={onOpenJournals}
        className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center relative group cursor-pointer hover:border-amber-500/40 active:scale-95 transition-all select-none min-h-[68px] sm:min-h-[76px]"
      >
        {unfilledJournalsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
            {unfilledJournalsCount}
          </span>
        )}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
          <FileEdit size={15} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
          Jurnal
        </span>
        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
          {unfilledJournalsCount > 0 ? (
            <span className="text-rose-600 dark:text-rose-400">{unfilledJournalsCount} Belum</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 justify-center">
              <CheckCircle2 size={11} /> Tuntas
            </span>
          )}
        </div>
      </button>

      {/* 4. Beban Mengajar Mingguan */}
      <button
        type="button"
        onClick={onOpenBeban}
        className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-500/40 active:scale-95 transition-all select-none min-h-[68px] sm:min-h-[76px]"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
          <Clock size={15} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
          Beban JP
        </span>
        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
          {currentJp} <span className="text-[10px] font-medium text-slate-400">/{targetJp}</span>
        </div>
      </button>
    </div>
  );
});

TeacherOpsMicroGrid.displayName = 'TeacherOpsMicroGrid';
