import React from 'react';
import { ClassInfo } from './types';
import { Download, Users, School } from 'lucide-react';

interface HeaderCommandCenterProps {
  classInfo: ClassInfo;
  onClassChange?: (className: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onOpenExportModal: () => void;
  studentCount: { male: number; female: number; total: number };
  isApiConnected?: boolean;
}

export const HeaderCommandCenter: React.FC<HeaderCommandCenterProps> = ({
  classInfo,
  onOpenExportModal,
  studentCount,
  isApiConnected = false
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
      {/* Left: Compact Class & Student Info Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
          <School size={15} />
          <span className="text-xs font-black tracking-tight uppercase">
            Rombel: {classInfo.className}
          </span>
        </div>

        {!isApiConnected && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Belum Terhubung ke API</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <Users size={14} className="text-blue-500" />
          <span>
            Total <strong className="text-slate-900 dark:text-white font-black">{studentCount.total} Siswa</strong>
          </span>
        </div>

        {/* Laki-laki & Perempuan Badge */}
        <div className="flex items-center gap-2 text-xs font-bold bg-indigo-500/10 dark:bg-indigo-500/15 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-indigo-500/20">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{studentCount.male} Laki-laki</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{studentCount.female} Perempuan</span>
          </span>
        </div>
      </div>

      {/* Right: Export Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenExportModal}
          className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
