import React from 'react';
import { History } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Progress } from '@/components/ui/Progress';

interface RegistrationPeriodControlProps {
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  yearOptions: { value: string; label: string }[];
  selectedSemesterId: string;
  setSelectedSemesterId: (id: string) => void;
  semesterOptions: { value: string; label: string }[];
  isActiveContext: boolean;
  filteredCount: number;
  totalCount: number;
}

export const RegistrationPeriodControl: React.FC<RegistrationPeriodControlProps> = ({
  selectedYearId,
  setSelectedYearId,
  yearOptions,
  selectedSemesterId,
  setSelectedSemesterId,
  semesterOptions,
  isActiveContext,
  filteredCount,
  totalCount
}) => {
  return (
    <div className="px-6 py-3 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl px-4 py-1 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <History size={14} className="text-slate-400 mr-2" />
          <SearchableSelect
            triggerClassName="h-8 text-[11px] w-40 border-none bg-transparent shadow-none font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight"
            value={selectedYearId}
            onValueChange={setSelectedYearId}
            options={yearOptions}
            placeholder="Tahun"
          />
          <div className="w-[1px] h-4 bg-slate-100 dark:bg-slate-800 mx-2" />
          <SearchableSelect
            triggerClassName="h-8 text-[11px] w-36 border-none bg-transparent shadow-none font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight"
            value={selectedSemesterId}
            onValueChange={setSelectedSemesterId}
            options={semesterOptions}
            placeholder="Semester"
          />
        </div>

        {isActiveContext ? (
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Periode Aktif</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <History size={14} className="text-slate-500" />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Mode Historis</span>
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
         <div className="flex flex-col items-end mr-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cakupan Data</p>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{filteredCount} / {totalCount} Siswa</p>
         </div>
         <Progress value={(filteredCount / Math.max(1, totalCount)) * 100} className="w-20 h-1.5" />
      </div>
    </div>
  );
};
