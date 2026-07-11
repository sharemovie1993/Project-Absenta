import React from 'react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';
import {
  LayoutGrid, Activity, BookOpen, CheckCircle2,
  Users, Clock, AlertCircle
} from 'lucide-react';

export interface KbmStats {
  total: number;
  live: number;
  withJournal: number;
  finished: number;
  teacherOnTime: number;
  teacherLate: number;
  teacherNotArrived: number;
  teacherAlpa: number;
}

interface KbmStatCardsProps {
  stats: KbmStats;
  statusFilter: 'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL';
  setStatusFilter: (filter: 'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL') => void;
  teacherStatusFilter: string;
  setTeacherStatusFilter: (filter: string) => void;
  healthScore: number;
}

const colorMaps: Record<string, { bgActive: string; bgInactive: string; textActive: string; textInactive: string; iconActive: string; iconInactive: string; progress: string }> = {
  slate: {
    bgActive: 'bg-slate-600 border-slate-600 shadow-md text-white shadow-slate-600/10',
    bgInactive: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300',
    textActive: 'text-white',
    textInactive: 'text-slate-600 dark:text-slate-400',
    iconActive: 'text-white/80',
    iconInactive: 'text-slate-400 dark:text-slate-500',
    progress: 'bg-slate-500',
  },
  emerald: {
    bgActive: 'bg-emerald-600 border-emerald-600 shadow-md text-white shadow-emerald-600/10',
    bgInactive: 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-800 text-emerald-700 dark:text-emerald-400',
    textActive: 'text-white',
    textInactive: 'text-emerald-600 dark:text-emerald-500',
    iconActive: 'text-white/80',
    iconInactive: 'text-emerald-400 dark:text-emerald-500',
    progress: 'bg-emerald-500',
  },
  indigo: {
    bgActive: 'bg-indigo-600 border-indigo-600 shadow-md text-white shadow-indigo-600/10',
    bgInactive: 'bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100/50 dark:border-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-800 text-indigo-700 dark:text-indigo-400',
    textActive: 'text-white',
    textInactive: 'text-indigo-600 dark:text-indigo-500',
    iconActive: 'text-white/80',
    iconInactive: 'text-indigo-400 dark:text-indigo-500',
    progress: 'bg-indigo-500',
  },
  amber: {
    bgActive: 'bg-amber-500 border-amber-500 shadow-md text-white shadow-amber-500/10',
    bgInactive: 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/20 hover:border-amber-300 dark:hover:border-amber-800 text-amber-700 dark:text-amber-400',
    textActive: 'text-white',
    textInactive: 'text-amber-600 dark:text-amber-500',
    iconActive: 'text-white/80',
    iconInactive: 'text-amber-400 dark:text-amber-500',
    progress: 'bg-amber-500',
  },
  blue: {
    bgActive: 'bg-blue-600 border-blue-600 shadow-md text-white shadow-blue-600/10',
    bgInactive: 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/20 hover:border-blue-300 dark:hover:border-blue-800 text-blue-700 dark:text-blue-400',
    textActive: 'text-white',
    textInactive: 'text-blue-600 dark:text-blue-500',
    iconActive: 'text-white/80',
    iconInactive: 'text-blue-400 dark:text-blue-500',
    progress: 'bg-blue-500',
  },
  rose: {
    bgActive: 'bg-rose-600 border-rose-600 shadow-md text-white shadow-rose-600/10',
    bgInactive: 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 hover:border-rose-300 dark:hover:border-rose-800 text-rose-700 dark:text-rose-400',
    textActive: 'text-white',
    textInactive: 'text-rose-600 dark:text-rose-500',
    iconActive: 'text-white/80',
    iconInactive: 'text-rose-400 dark:text-rose-500',
    progress: 'bg-rose-500',
  }
};

export const KbmStatCards = React.memo<KbmStatCardsProps>(({
  stats,
  statusFilter,
  setStatusFilter,
  teacherStatusFilter,
  setTeacherStatusFilter,
  healthScore
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Section 1: Aktivitas Pembelajaran */}
      <Card noPadding className="p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-indigo-500" />
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aktivitas Pembelajaran (KBM)</h3>
          </div>
          
          {/* Health Score Component (Compact Version inside Card Header) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm",
              healthScore > 80 ? "bg-emerald-500 text-white" : 
              healthScore > 50 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
            )}>
              {healthScore}
            </div>
            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Health Score</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'ALL', label: 'Total Sesi', val: stats.total, sub: 'Jadwal', icon: LayoutGrid, color: 'slate' },
            { id: 'LIVE', label: 'Berlangsung', val: stats.live, sub: 'Live', icon: Activity, color: 'emerald', pulse: true },
            { id: 'JURNAL', label: 'Jurnal Terisi', val: stats.withJournal, sub: `${Math.round((stats.withJournal / (stats.total || 1)) * 100)}%`, icon: BookOpen, color: 'indigo' },
            { id: 'FINISHED', label: 'Selesai', val: stats.finished, sub: 'Sesi', icon: CheckCircle2, color: 'slate' },
          ].map((item) => {
            const active = statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL');
            const styling = colorMaps[item.color] || colorMaps.slate;
            
            return (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id as any)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-300 text-left hover:-translate-y-0.5",
                  active ? styling.bgActive : styling.bgInactive
                )}
              >
                <p className={cn(
                  "text-[8px] font-black uppercase tracking-widest mb-1",
                  active ? "text-white/80" : styling.textInactive
                )}>{item.label}</p>
                <div className="flex items-end justify-between">
                  <h4 className={cn(
                    "text-xl font-black leading-none tracking-tight",
                    active ? "text-white" : "text-slate-800 dark:text-white"
                  )}>{item.val}</h4>
                  <item.icon size={15} className={cn(
                    active ? styling.iconActive : styling.iconInactive,
                    item.pulse && "animate-pulse"
                  )} />
                </div>
                <p className={cn(
                  "text-[8px] font-bold mt-1 uppercase",
                  active ? "text-white/70" : "text-slate-400 dark:text-slate-500"
                )}>{item.sub}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Section 2: Kehadiran Guru (Clickable Filters) */}
      <Card noPadding className="p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-indigo-500" />
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kehadiran Guru (Klik untuk Filter)</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'TEPAT_WAKTU', label: 'Tepat Waktu', val: stats.teacherOnTime, color: 'emerald', icon: CheckCircle2 },
            { id: 'TERLAMBAT', label: 'Terlambat', val: stats.teacherLate, color: 'amber', icon: Clock },
            { id: 'BELUM_TAP', label: 'Belum Tap', val: stats.teacherNotArrived, color: 'blue', icon: Activity },
            { id: 'ALPA', label: 'Alpa', val: stats.teacherAlpa, color: 'rose', icon: AlertCircle },
          ].map((t) => {
            const active = teacherStatusFilter === t.id;
            const styling = colorMaps[t.color] || colorMaps.slate;
            
            return (
              <button
                key={t.id}
                onClick={() => setTeacherStatusFilter(teacherStatusFilter === t.id ? 'ALL' : t.id)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-300 text-left hover:-translate-y-0.5",
                  active ? styling.bgActive : styling.bgInactive
                )}
              >
                <p className={cn(
                  "text-[8px] font-black uppercase tracking-widest mb-1",
                  active ? "text-white/80" : styling.textInactive
                )}>{t.label}</p>
                <div className="flex items-end justify-between">
                  <h4 className={cn(
                    "text-xl font-black leading-none tracking-tight",
                    active ? "text-white" : "text-slate-850 dark:text-white"
                  )}>{t.val}</h4>
                  <t.icon size={15} className={cn(
                    active ? styling.iconActive : styling.iconInactive
                  )} />
                </div>
                <div className="mt-2 w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      active ? "bg-white" : styling.progress
                    )}
                    style={{ width: `${(t.val / (stats.total || 1)) * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
});

KbmStatCards.displayName = 'KbmStatCards';
