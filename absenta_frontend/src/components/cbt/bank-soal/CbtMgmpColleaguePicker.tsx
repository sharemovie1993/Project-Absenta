import React, { useMemo } from 'react';
import { Users, CheckSquare, Square, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { cn } from '@/lib/utils';

interface CbtMgmpColleaguePickerProps {
  mapelId: string;
  currentGuruId: string;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
}

export const CbtMgmpColleaguePicker: React.FC<CbtMgmpColleaguePickerProps> = ({
  mapelId,
  currentGuruId,
  selectedIds,
  onChangeSelectedIds,
}) => {
  const { data: parallelTeachersRes, isLoading } = useQuery({
    queryKey: ['parallel-teachers', mapelId],
    queryFn: () => (mapelId ? listGuruMapel({ mapel_id: mapelId }) : null),
    enabled: Boolean(mapelId),
  });

  const parallelColleagues = useMemo(() => {
    const list = parallelTeachersRes?.data || [];
    const map = new Map<string, string>();
    list.forEach((gm: any) => {
      const gId = gm.guru_id;
      const gName = gm.Guru?.nama_guru;
      if (gId && gId !== currentGuruId && gName && !map.has(gId)) {
        map.set(gId, gName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [parallelTeachersRes?.data, currentGuruId]);

  if (!mapelId || isLoading || parallelColleagues.length === 0) {
    return null;
  }

  const allSelected =
    parallelColleagues.length > 0 &&
    parallelColleagues.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      onChangeSelectedIds([]);
    } else {
      onChangeSelectedIds(parallelColleagues.map((c) => c.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Users size={13} className="text-violet-600 dark:text-violet-400" />
          <span>Bagikan ke Rekan MGMP (Guru Paralel)</span>
        </label>
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
          <span>{allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
        </button>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
          <span>
            Rekan guru yang dicentang otomatis terdaftar sebagai <strong>Ter-cover Master</strong> di radar panitia
            sehingga tidak dianggap belum membuat soal.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {parallelColleagues.map((colleague) => {
            const isChecked = selectedIds.includes(colleague.id);
            return (
              <label
                key={colleague.id}
                onClick={() => toggleItem(colleague.id)}
                className={cn(
                  'flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all',
                  isChecked
                    ? 'border-violet-400 bg-violet-50/80 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 font-medium'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 shrink-0"
                />
                <span className="truncate">{colleague.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
