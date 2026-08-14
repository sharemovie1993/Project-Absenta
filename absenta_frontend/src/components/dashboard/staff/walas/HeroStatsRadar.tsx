import React from 'react';
import { UserCheck, FileCheck2, AlertTriangle, Trophy, ChevronRight, Activity, ShieldAlert, Award } from 'lucide-react';
import { ClassHealthMetric, Student } from './types';

interface HeroStatsRadarProps {
  metrics: ClassHealthMetric;
  pendingCount: number;
  atRiskCount: number;
  starStudents: Student[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const HeroStatsRadar: React.FC<HeroStatsRadarProps> = ({
  metrics,
  pendingCount,
  atRiskCount,
  starStudents,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80">
      {/* 1. Kehadiran Hari Ini Card */}
      <div 
        onClick={() => onTabChange('health')}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
          activeTab === 'health' 
            ? 'bg-white dark:bg-slate-900 border border-blue-500/30 shadow-xs' 
            : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Activity size={12} className="text-blue-500" />
            <span>Kehadiran</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">{metrics.attendancePercentage}%</span>
            <span className="text-[10px] font-bold text-emerald-500">+2.1%</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            34 Hadir · 1 Sakit · 1 Izin
          </p>
        </div>
      </div>

      {/* 2. Izin Perlu Validasi Card */}
      <div 
        onClick={() => onTabChange('approval')}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
          activeTab === 'approval' 
            ? 'bg-white dark:bg-slate-900 border border-amber-500/30 shadow-xs' 
            : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <FileCheck2 size={12} className="text-amber-500" />
            <span>Validasi Izin</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{String(pendingCount).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Pending</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            {pendingCount > 0 ? 'Perlu persetujuan Walas' : 'Semua disetujui'}
          </p>
        </div>
      </div>

      {/* 3. Siswa Rawan (EWS) Card */}
      <div 
        onClick={() => onTabChange('health')}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
          activeTab === 'health' 
            ? 'bg-white dark:bg-slate-900 border border-rose-500/30 shadow-xs' 
            : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <ShieldAlert size={12} className="text-rose-500" />
            <span>Siswa Rawan (EWS)</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{String(atRiskCount).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Tindakan</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            Bayu &amp; Dimas (Alpha ≥3)
          </p>
        </div>
      </div>

      {/* 4. Top Siswa / Star Students Card */}
      <div 
        onClick={() => onTabChange('halloffame')}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
          activeTab === 'halloffame' 
            ? 'bg-white dark:bg-slate-900 border border-purple-500/30 shadow-xs' 
            : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
        }`}
      >
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Award size={12} className="text-purple-500" />
            <span>Top Siswa</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">03</span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Star Students</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            🥇 {starStudents[0]?.name || 'Achmad Fauzi'}
          </p>
        </div>
      </div>
    </div>
  );
};
