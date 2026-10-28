import React from 'react';
import type { SiswaTargetItem } from './types';

export interface HubinPklKolektifStudentPickerProps {
  siswaList: SiswaTargetItem[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleStudent: (id: string) => void;
}

export const HubinPklKolektifStudentPicker: React.FC<HubinPklKolektifStudentPickerProps> = React.memo(({
  siswaList,
  selectedIds,
  onToggleSelectAll,
  onToggleStudent,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Pilih Siswa yang Ditemui ({selectedIds.length} dari {siswaList.length} Terpilih)
        </span>
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          {selectedIds.length === siswaList.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
        {siswaList.map((siswa) => {
          const isChecked = selectedIds.includes(siswa.penempatan_id);
          return (
            <label
              key={siswa.penempatan_id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isChecked
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                  : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleStudent(siswa.penempatan_id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {siswa.nama_siswa}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {siswa.kelas} • NIS: {siswa.nis}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 shrink-0">
                {siswa.visitsCount}x
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
});

export default HubinPklKolektifStudentPicker;
