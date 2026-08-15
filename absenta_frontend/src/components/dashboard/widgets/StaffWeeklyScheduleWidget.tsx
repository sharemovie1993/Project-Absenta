import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { JadwalGrid } from '../../kurikulum/JadwalGrid';
import { cn } from '../../../lib/utils';
import { useStaffWeeklySchedule } from '../../../hooks/attendance/useStaffWeeklySchedule';

interface StaffWeeklyScheduleWidgetProps {
  className?: string;
}

export const StaffWeeklyScheduleWidget: React.FC<StaffWeeklyScheduleWidgetProps> = ({
  className
}) => {
  const {
    rawSchedules,
    totalWeeklyJp,
    isLoading,
  } = useStaffWeeklySchedule();

  return (
    <div className={cn("p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4", className)}>
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Matriks Jadwal Mengajar 1 Minggu
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total beban mengajar semester aktif: <span className="font-black text-blue-600 dark:text-blue-400">{totalWeeklyJp} JP / Minggu</span>
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
          <Sparkles size={13} className="text-blue-500" />
          <span>Senin — Sabtu</span>
        </div>
      </div>

      {/* ── FULL WEEK MATRIX GRID ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
        <JadwalGrid
          jadwal={rawSchedules}
          readOnly={true}
          loading={isLoading}
        />
      </div>
    </div>
  );
};
