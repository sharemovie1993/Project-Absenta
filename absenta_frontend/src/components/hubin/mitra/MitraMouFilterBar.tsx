import React from 'react';
import type { MitraStats } from './types';

export interface MitraMouFilterBarProps {
  selectedMouFilter: 'ALL' | 'AKTIF' | 'EXPIRING_SOON' | 'EXPIRED';
  setSelectedMouFilter: (filter: 'ALL' | 'AKTIF' | 'EXPIRING_SOON' | 'EXPIRED') => void;
  setPage: (page: number) => void;
  mouStats: MitraStats;
}

export const MitraMouFilterBar: React.FC<MitraMouFilterBarProps> = ({
  selectedMouFilter,
  setSelectedMouFilter,
  setPage,
  mouStats,
}) => {
  return (
    <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('ALL'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            selectedMouFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Semua Mitra ({mouStats.total})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('AKTIF'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'AKTIF'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          MoU Aktif ({mouStats.aktif})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('EXPIRING_SOON'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'EXPIRING_SOON'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Mendekati Berakhir &lt; 30 Hari ({mouStats.expiringSoon})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('EXPIRED'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'EXPIRED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Expired / Belum Ada ({mouStats.expired})
        </button>
      </div>
    </div>
  );
};

export default MitraMouFilterBar;
