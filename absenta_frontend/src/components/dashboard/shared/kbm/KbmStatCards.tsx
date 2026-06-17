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

export const KbmStatCards = React.memo<KbmStatCardsProps>(({
  stats,
  statusFilter,
  setStatusFilter,
  teacherStatusFilter,
  setTeacherStatusFilter,
  healthScore
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {/* Section 1: Aktivitas Pembelajaran */}
      <Card noPadding className="p-2 border-none shadow-sm bg-white dark:bg-gray-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-indigo-500" />
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aktivitas Pembelajaran (KBM)</h3>
          </div>
          
          {/* Health Score Component (Compact Version inside Card Header) */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black",
              healthScore > 80 ? "bg-emerald-500 text-white" : 
              healthScore > 50 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
            )}>
              {healthScore}
            </div>
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Health Score</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'ALL', label: 'Total Sesi', val: stats.total, sub: 'Jadwal', icon: LayoutGrid, color: 'slate' },
            { id: 'LIVE', label: 'Berlangsung', val: stats.live, sub: 'Live', icon: Activity, color: 'emerald', pulse: true },
            { id: 'JURNAL', label: 'Jurnal Terisi', val: stats.withJournal, sub: `${Math.round((stats.withJournal / (stats.total || 1)) * 100)}%`, icon: BookOpen, color: 'indigo' },
            { id: 'FINISHED', label: 'Selesai', val: stats.finished, sub: 'Sesi', icon: CheckCircle2, color: 'slate' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as any)}
              className={cn(
                "p-2 rounded-xl border transition-all duration-300 text-left group",
                (statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL'))
                  ? `bg-${item.color}-500 border-${item.color}-500 shadow-md`
                  : `bg-${item.color}-50/50 dark:bg-${item.color}-900/10 border-gray-50 dark:border-gray-800 hover:border-${item.color}-200`
              )}
            >
              <p className={cn(
                "text-[7px] font-black uppercase tracking-widest mb-1",
                (statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL')) ? "text-white/80" : `text-${item.color}-600`
              )}>{item.label}</p>
              <div className="flex items-end justify-between">
                <h4 className={cn(
                  "text-lg font-black leading-none",
                  (statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL')) ? "text-white" : "text-gray-900 dark:text-white"
                )}>{item.val}</h4>
                <item.icon size={14} className={cn(
                  (statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL')) ? "text-white/40" : "text-gray-200",
                  item.pulse && "animate-pulse"
                )} />
              </div>
              <p className={cn(
                "text-[8px] font-bold mt-0.5 uppercase",
                (statusFilter === item.id || (item.id === 'ALL' && statusFilter === 'ALL')) ? "text-white/60" : "text-gray-400"
              )}>{item.sub}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Section 2: Kehadiran Guru (Clickable Filters) */}
      <Card noPadding className="p-2 border-none shadow-sm bg-white dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-indigo-500" />
          <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Kehadiran Guru (Klik untuk Filter)</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'TEPAT_WAKTU', label: 'Tepat Waktu', val: stats.teacherOnTime, color: 'emerald', icon: CheckCircle2 },
            { id: 'TERLAMBAT', label: 'Terlambat', val: stats.teacherLate, color: 'amber', icon: Clock },
            { id: 'BELUM_TAP', label: 'Belum Tap', val: stats.teacherNotArrived, color: 'blue', icon: Activity },
            { id: 'ALPA', label: 'Alpa', val: stats.teacherAlpa, color: 'rose', icon: AlertCircle },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTeacherStatusFilter(teacherStatusFilter === t.id ? 'ALL' : t.id)}
              className={cn(
                "p-2 rounded-xl border transition-all duration-300 text-left group",
                teacherStatusFilter === t.id 
                ? `bg-${t.color}-500 border-${t.color}-500 shadow-lg shadow-${t.color}-500/20` 
                : `bg-${t.color}-50/30 dark:bg-${t.color}-900/10 border-${t.color}-50 dark:border-${t.color}-900/20 hover:border-${t.color}-200`
              )}
            >
              <p className={cn(
                "text-[7px] font-black uppercase tracking-widest mb-1",
                teacherStatusFilter === t.id ? "text-white/80" : `text-${t.color}-600`
              )}>{t.label}</p>
              <div className="flex items-end justify-between">
                <h4 className={cn(
                  "text-lg font-black leading-none",
                  teacherStatusFilter === t.id ? "text-white" : `text-${t.color}-700 dark:text-${t.color}-400`
                )}>{t.val}</h4>
                <t.icon size={14} className={cn(
                  "transition-transform group-hover:scale-110",
                  teacherStatusFilter === t.id ? "text-white/40" : `text-${t.color}-200`
                )} />
              </div>
              <div className={cn(
                "mt-1 w-full h-1 rounded-full bg-black/5 dark:bg-white/5",
                teacherStatusFilter === t.id && "bg-white/20"
              )}>
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    teacherStatusFilter === t.id ? "bg-white" : `bg-${t.color}-500`
                  )}
                  style={{ width: `${(t.val / (stats.total || 1)) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
});

KbmStatCards.displayName = 'KbmStatCards';
