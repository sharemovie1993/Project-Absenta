import React from 'react';
import {
  BookOpen,
  ChevronRight,
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
  BarChart2
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface KurikulumSidebarPanelProps {
  className?: string;
  /** KBM Health Score 0–100 */
  healthScore?: number;
  /** Jumlah kelas KBM aktif hari ini */
  activeClasses: number;
  /** Total kelas */
  totalClasses: number;
  /** Jumlah guru hadir */
  teacherPresent: number;
  /** Total guru */
  totalTeachers?: number;
  /** Jumlah supervisi berjalan */
  supervisionCount?: number;
  /** Loading state */
  isLoading?: boolean;
  onMonitor?: () => void;
  onSpecialEvent?: () => void;
}

export const KurikulumSidebarPanel: React.FC<KurikulumSidebarPanelProps> = ({
  className,
  healthScore = 0,
  activeClasses,
  totalClasses,
  teacherPresent,
  totalTeachers = 0,
  supervisionCount = 0,
  isLoading = false,
  onMonitor,
  onSpecialEvent,
}) => {
  const healthColor =
    healthScore >= 80 ? 'text-emerald-600' :
    healthScore >= 60 ? 'text-amber-500' :
    'text-rose-600';

  const healthBg =
    healthScore >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' :
    healthScore >= 60 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' :
    'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30';

  const healthLabel =
    healthScore >= 80 ? 'Sehat' :
    healthScore >= 60 ? 'Perlu Perhatian' :
    'Kritis';

  const kbmPercent = totalClasses > 0 ? Math.round((activeClasses / totalClasses) * 100) : 0;
  const guruPercent = totalTeachers > 0 ? Math.round((teacherPresent / totalTeachers) * 100) : 0;

  return (
    <div className={cn(
      'rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-purple-50/50 dark:bg-purple-900/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <BookOpen size={14} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest leading-none">Staf Kurikulum</p>
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Monitoring KBM Global</p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border',
          healthScore >= 80
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/40'
            : healthScore >= 60
            ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/40'
            : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-900/40'
        )}>
          {healthLabel}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Health Score */}
        <div className={cn('flex items-center gap-3 p-3 rounded-xl border', healthBg)}>
          <div className="flex-1">
            <p className={cn('text-2xl font-black leading-none', healthColor)}>
              {isLoading ? '—' : `${healthScore}`}
              <span className="text-xs font-bold opacity-60 ml-0.5">/100</span>
            </p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">KBM Health Score</p>
          </div>
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            healthScore >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/20'
            : healthScore >= 60 ? 'bg-amber-100 dark:bg-amber-900/20'
            : 'bg-rose-100 dark:bg-rose-900/20'
          )}>
            <BarChart2 size={16} className={healthColor} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* KBM Kelas Aktif */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <Activity size={11} className="text-purple-400" />
              <span className="text-[8px] font-black text-gray-400 uppercase">Kelas KBM</span>
            </div>
            {isLoading ? (
              <div className="h-5 bg-gray-200 dark:bg-slate-600/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-base font-black text-gray-800 dark:text-gray-100 leading-none">
                  {activeClasses}
                  <span className="text-[9px] font-bold text-gray-400 ml-0.5">/{totalClasses}</span>
                </p>
                <div className="mt-1.5 h-1 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all"
                    style={{ width: `${kbmPercent}%` }}
                  />
                </div>
                <p className="text-[8px] text-gray-400 mt-0.5">{kbmPercent}% aktif</p>
              </>
            )}
          </div>

          {/* Kehadiran Guru */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <Users size={11} className="text-indigo-400" />
              <span className="text-[8px] font-black text-gray-400 uppercase">Kehadiran Guru</span>
            </div>
            {isLoading ? (
              <div className="h-5 bg-gray-200 dark:bg-slate-600/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-base font-black text-gray-800 dark:text-gray-100 leading-none">
                  {teacherPresent}
                  {totalTeachers > 0 && (
                    <span className="text-[9px] font-bold text-gray-400 ml-0.5">/{totalTeachers}</span>
                  )}
                </p>
                {totalTeachers > 0 && (
                  <>
                    <div className="mt-1.5 h-1 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all"
                        style={{ width: `${guruPercent}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-gray-400 mt-0.5">{guruPercent}% hadir</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Supervisi */}
        {supervisionCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
            <CheckCircle2 size={12} className="text-purple-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
              {supervisionCount} Supervisi sedang berjalan
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <button
            onClick={onMonitor}
            className="w-full flex items-center justify-between group"
          >
            <span className="text-[9px] font-black text-gray-400 group-hover:text-purple-600 uppercase tracking-widest transition-colors">
              Pantau KBM Sekolah
            </span>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] font-bold text-purple-400 group-hover:text-purple-600 transition-colors">Buka</span>
              <ChevronRight size={12} className="text-gray-300 group-hover:text-purple-600 transition-colors" />
            </div>
          </button>

          {onSpecialEvent && (
            <button
              onClick={onSpecialEvent}
              className="w-full flex items-center justify-between group"
            >
              <span className="text-[9px] font-black text-gray-400 group-hover:text-rose-600 uppercase tracking-widest transition-colors">
                Kejadian Khusus / Libur
              </span>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-bold text-rose-400 group-hover:text-rose-600 transition-colors">Atur</span>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-rose-600 transition-colors" />
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
