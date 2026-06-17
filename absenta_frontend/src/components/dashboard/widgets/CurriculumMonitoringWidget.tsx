import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Users, 
  PlayCircle,
  TrendingUp,
  Fingerprint
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { CircularProgress } from '../../ui/CircularProgress';
import { cn } from '../../../lib/utils';

interface CurriculumMonitoringWidgetProps {
  healthScore: number;
  activeClasses: number;
  totalClasses: number;
  teacherPresence: number;
  supervisionCount: number;
  onAction?: (tab: string) => void;
}

export const CurriculumMonitoringWidget: React.FC<CurriculumMonitoringWidgetProps> = ({
  healthScore,
  activeClasses,
  totalClasses,
  teacherPresence,
  supervisionCount,
  onAction
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Academic Health Score */}
        <CompactSectionCard title="Academic Health Score" icon={Zap} iconColor="indigo">
          <div className="flex items-center gap-4 py-1">
            <div className="relative w-14 h-14">
              <CircularProgress percentage={healthScore} size={56} strokeWidth={6} color="#4F46E5" />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-600">
                {healthScore}%
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">Status KBM</h4>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tight font-black">
                {activeClasses} / {totalClasses} Kelas Aktif
              </p>
            </div>
          </div>
        </CompactSectionCard>

        {/* Supervision Overview */}
        <CompactSectionCard title="Supervisi & Penjaminan" icon={ShieldCheck} iconColor="emerald">
          <div className="flex items-center gap-4 py-1">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100/50 dark:border-emerald-900/30">
              <Fingerprint size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">{supervisionCount} Jadwal</h4>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tight font-black">Agenda Hari Ini</p>
            </div>
          </div>
        </CompactSectionCard>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Guru Hadir</div>
            <div className="text-sm font-black text-indigo-600">{teacherPresence}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Kelas Terisi</div>
            <div className="text-sm font-black text-emerald-600">{healthScore}%</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-center flex items-center justify-center">
            <button 
              onClick={() => onAction?.('LIVE')}
              className="text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-wider transition-colors"
            >
              Monitor Live →
            </button>
        </div>
      </div>
    </div>
  );
};
