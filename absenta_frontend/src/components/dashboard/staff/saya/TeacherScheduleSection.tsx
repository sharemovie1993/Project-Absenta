import React from 'react';
import { Calendar, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherScheduleSectionProps {
  onOpenWeeklySchedule: () => void;
  onOpenAcademicCalendar: () => void;
  className?: string;
}

export const TeacherScheduleSection: React.FC<TeacherScheduleSectionProps> = React.memo(({
  onOpenWeeklySchedule,
  onOpenAcademicCalendar,
  className,
}) => {
  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Jadwal &amp; Agenda Mengajar Saya
        </span>
      </div>

      <div className="space-y-2 w-full">
        {/* 1. Matriks Jadwal Mingguan (Senin - Jumat) */}
        <button
          type="button"
          onClick={onOpenWeeklySchedule}
          className="w-full p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 text-left group cursor-pointer hover:border-blue-500/40 active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Calendar size={16} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                Matriks Jadwal Mengajar Mingguan
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Lihat jadwal mengajar lengkap hari Senin s.d. Jumat
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* 2. Kalender Akademik Sekolah */}
        <button
          type="button"
          onClick={onOpenAcademicCalendar}
          className="w-full p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 text-left group cursor-pointer hover:border-emerald-500/40 active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CalendarDays size={16} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                Kalender Akademik &amp; Hari Efektif
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Jadwal PTS, PAS, libur nasional, dan rapat dinas
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
});

TeacherScheduleSection.displayName = 'TeacherScheduleSection';
