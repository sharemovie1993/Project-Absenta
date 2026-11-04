import React, { useMemo } from 'react';
import { Users, CheckSquare, Square, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import type { GuruMapel } from '@/types/academic';
import { cn } from '@/lib/utils';
import { formatTingkatRomawi } from './cbtAsesmenHelper';

interface CbtMgmpColleaguePickerProps {
  mapelId: string;
  tingkat?: string; // 'X' | 'XI' | 'XII' | 'SEMUA'
  currentGuruId: string;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
}

export const CbtMgmpColleaguePicker: React.FC<CbtMgmpColleaguePickerProps> = ({
  mapelId,
  tingkat,
  currentGuruId,
  selectedIds,
  onChangeSelectedIds,
}) => {
  const { data: parallelTeachersRes, isLoading } = useQuery({
    queryKey: ['parallel-teachers', mapelId],
    queryFn: () => (mapelId ? listGuruMapel({ mapel_id: mapelId }) : null),
    enabled: Boolean(mapelId),
  });

  // Konversi tingkat target menjadi angka (10, 11, 12) untuk pencocokan ketat
  const targetTingkatNum = useMemo(() => {
    if (!tingkat || tingkat === 'SEMUA') return null;
    if (tingkat === 'XI' || tingkat === '11') return 11;
    if (tingkat === 'XII' || tingkat === '12') return 12;
    if (tingkat === 'X' || tingkat === '10') return 10;
    return Number(tingkat) || null;
  }, [tingkat]);

  const parallelColleagues = useMemo(() => {
    const list = parallelTeachersRes?.data || [];
    const map = new Map<string, { id: string; name: string; tingkatNum?: number }>();

    list.forEach((gm: GuruMapel) => {
      const gId = gm.guru_id;
      const gName = gm.Guru?.nama_guru;
      if (!gId || gId === currentGuruId || !gName) return;

      // Ekstraksi tingkat mengajar guru dari kelas atau mapel
      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      let gmTingkatNum = Number(rawTingkat);
      if (!gmTingkatNum && gm.Kelas?.nama_kelas) {
        const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          gmTingkatNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }

      // Filter ketat: Hanya tampilkan guru yang mengajar tingkat yang sama
      if (targetTingkatNum && gmTingkatNum && gmTingkatNum !== targetTingkatNum) {
        return;
      }

      if (!map.has(gId)) {
        map.set(gId, { id: gId, name: gName, tingkatNum: gmTingkatNum });
      }
    });

    return Array.from(map.values());
  }, [parallelTeachersRes?.data, currentGuruId, targetTingkatNum]);

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

  const tingkatLabel = tingkat && tingkat !== 'SEMUA' ? `Tingkat ${formatTingkatRomawi(tingkat)}` : '';

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Users size={13} className="text-violet-600 dark:text-violet-400" />
          <span>Bagikan ke Rekan MGMP (Guru Paralel {tingkatLabel})</span>
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
            Rekan guru {tingkatLabel} yang dicentang otomatis terdaftar sebagai <strong>Ter-cover Master</strong> di radar panitia
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
                  'flex items-center justify-between gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all',
                  isChecked
                    ? 'border-violet-400 bg-violet-50/80 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 font-medium'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 shrink-0"
                  />
                  <span className="truncate">{colleague.name}</span>
                </div>
                {colleague.tingkatNum && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold shrink-0">
                    Tingkat {formatTingkatRomawi(colleague.tingkatNum)}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
