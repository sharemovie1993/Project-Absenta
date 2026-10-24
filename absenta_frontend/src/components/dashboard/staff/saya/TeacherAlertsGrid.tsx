import React from 'react';
import { FileEdit, ClipboardList, ShieldAlert, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherAlertsGridProps {
  unfilledJournalsCount: number;
  pendingLeavesCount: number;
  upcomingPiketDate?: string | null;
  gradeDeadlineText?: string | null;
  onOpenJournals?: () => void;
  onOpenLeaves?: () => void;
  onOpenPiket?: () => void;
  onOpenGrades?: () => void;
  className?: string;
}

export const TeacherAlertsGrid: React.FC<TeacherAlertsGridProps> = React.memo(({
  unfilledJournalsCount,
  pendingLeavesCount,
  upcomingPiketDate = 'Kamis Besok',
  gradeDeadlineText = 'Akhir Bulan',
  onOpenJournals,
  onOpenLeaves,
  onOpenPiket,
  onOpenGrades,
  className,
}) => {
  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Tugas &amp; Peringatan Saya
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full">
        {/* 1. Hutang Jurnal */}
        <button
          type="button"
          onClick={onOpenJournals}
          className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center relative group cursor-pointer hover:border-rose-500/40 active:scale-95 transition-all select-none min-h-[72px]"
        >
          {unfilledJournalsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
              {unfilledJournalsCount}
            </span>
          )}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
            <FileEdit size={15} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
            Hutang Jurnal
          </span>
          <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
            {unfilledJournalsCount > 0 ? `${unfilledJournalsCount} Sesi` : 'Tuntas'}
          </div>
        </button>

        {/* 2. Status Izin Saya */}
        <button
          type="button"
          onClick={onOpenLeaves}
          className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer hover:border-amber-500/40 active:scale-95 transition-all select-none min-h-[72px]"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
            <ClipboardList size={15} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
            Izin Saya
          </span>
          <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
            {pendingLeavesCount > 0 ? `${pendingLeavesCount} Menunggu` : 'Nihil'}
          </div>
        </button>

        {/* 3. Tugas Piket */}
        <button
          type="button"
          onClick={onOpenPiket}
          className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer hover:border-blue-500/40 active:scale-95 transition-all select-none min-h-[72px]"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
            <ShieldAlert size={15} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
            Jadwal Piket
          </span>
          <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
            {upcomingPiketDate || 'Siaga'}
          </div>
        </button>

        {/* 4. Deadline Nilai */}
        <button
          type="button"
          onClick={onOpenGrades}
          className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer hover:border-purple-500/40 active:scale-95 transition-all select-none min-h-[72px]"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shrink-0">
            <Award size={15} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate max-w-full">
            Setor Nilai
          </span>
          <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
            {gradeDeadlineText || 'Aman'}
          </div>
        </button>
      </div>
    </div>
  );
});

TeacherAlertsGrid.displayName = 'TeacherAlertsGrid';
