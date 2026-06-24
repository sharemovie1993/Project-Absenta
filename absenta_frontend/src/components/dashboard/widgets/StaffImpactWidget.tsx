import React from 'react';
import { 
  Users, 
  Activity,
  Heart,
  Calendar
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StaffImpactWidgetProps {
  className?: string;
  totalStudentsTaught: number;
  totalSessions: number;
  attendanceRate?: number;
  isLoading?: boolean;
}

export const StaffImpactWidget: React.FC<StaffImpactWidgetProps> = ({
  className,
  totalStudentsTaught,
  totalSessions,
  attendanceRate = 0,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 animate-pulse">
        <div className="h-28 bg-gray-50 dark:bg-slate-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-indigo-50/50 dark:bg-indigo-900/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
            <Activity size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">Kinerja Saya</p>
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Dampak Pembelajaran</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-900/30 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <Heart size={9} className="text-rose-500 fill-current animate-pulse" />
          <span>Aktif</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Siswa Terjangkau Box */}
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-900/30">
          <div className="flex-1">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {totalStudentsTaught}
            </p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Siswa Terjangkau Hari Ini</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-100/60 dark:bg-indigo-900/20 flex items-center justify-center">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50/50 dark:bg-slate-700/20 border border-gray-100/50 dark:border-slate-700/30">
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500">
              <Calendar size={12} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Sesi Ajar</span>
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-0.5">{totalSessions} Kelas</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50/50 dark:bg-slate-700/20 border border-gray-100/50 dark:border-slate-700/30">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
              <Activity size={12} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Presensi</span>
              <span className="text-[11px] font-bold text-emerald-600 mt-0.5">{attendanceRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


