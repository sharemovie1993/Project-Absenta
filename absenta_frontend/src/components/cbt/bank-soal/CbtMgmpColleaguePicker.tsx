import React, { useMemo, useEffect, useRef } from 'react';
import { Users, CheckSquare, Square, Info, UserCheck, Loader2 } from 'lucide-react';
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
  title?: string;
}

export const CbtMgmpColleaguePicker: React.FC<CbtMgmpColleaguePickerProps> = ({
  mapelId,
  tingkat,
  currentGuruId,
  selectedIds,
  onChangeSelectedIds,
  title,
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
    const map = new Map<string, { id: string; name: string; tingkatNum?: number; kelasNames: string[] }>();

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
        map.set(gId, { id: gId, name: gName, tingkatNum: gmTingkatNum, kelasNames: [] });
      }

      const entry = map.get(gId)!;
      if (gm.Kelas?.nama_kelas && !entry.kelasNames.includes(gm.Kelas.nama_kelas)) {
        entry.kelasNames.push(gm.Kelas.nama_kelas);
      }
    });

    return Array.from(map.values());
  }, [parallelTeachersRes?.data, currentGuruId, targetTingkatNum]);

  // Otomatis centang semua rekan guru paralel saat data baru dimuat untuk mapel & tingkat ini
  const autoSelectedKeyRef = useRef<string>('');
  useEffect(() => {
    const currentKey = `${mapelId}_${tingkat}`;
    if (parallelColleagues.length > 0 && autoSelectedKeyRef.current !== currentKey) {
      autoSelectedKeyRef.current = currentKey;
      if (selectedIds.length === 0) {
        onChangeSelectedIds(parallelColleagues.map((c) => c.id));
      }
    }
  }, [parallelColleagues, mapelId, tingkat, selectedIds.length, onChangeSelectedIds]);

  if (!mapelId) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Info size={14} className="text-slate-400 shrink-0" />
        <span>Pilih mata pelajaran &amp; tingkat kelas di atas untuk menentukan target pembagian soal MGMP.</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-2 py-3.5">
        <Loader2 size={15} className="animate-spin text-indigo-600" />
        <span>Mencari rekan guru paralel se-mata pelajaran...</span>
      </div>
    );
  }

  const tingkatLabel = tingkat && tingkat !== 'SEMUA' ? `Tingkat ${formatTingkatRomawi(tingkat)}` : '';

  if (parallelColleagues.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
        <Info size={15} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Anda adalah satu-satunya pengampu mapel ini di {tingkatLabel || 'tingkat ini'}.</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Paket Master MGMP ini akan langsung aktif untuk seluruh rombel binaan Anda dan terdaftar di jadwal ujian sekolah.
          </p>
        </div>
      </div>
    );
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
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
          <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>{title || `Mau dibagi ke siapa saja? (Rekan Guru ${tingkatLabel})`}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
            {selectedIds.length} dari {parallelColleagues.length} guru dipilih
          </span>
        </label>
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
        >
          {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          <span>{allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
        </button>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          <UserCheck size={13} className="text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Rekan guru yang dicentang otomatis menerima paket Master ini di akun mereka &amp; tercatat sebagai <strong>Ter-cover Master</strong> di meja orkestrasi panitia.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {parallelColleagues.map((colleague) => {
            const isChecked = selectedIds.includes(colleague.id);
            return (
              <label
                key={colleague.id}
                onClick={() => toggleItem(colleague.id)}
                className={cn(
                  'flex items-center justify-between gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all',
                  isChecked
                    ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block truncate">{colleague.name}</span>
                    {colleague.kelasNames.length > 0 ? (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                        Mengajar: {colleague.kelasNames.join(', ')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 truncate block">
                        Guru Pengampu Paralel
                      </span>
                    )}
                  </div>
                </div>
                {colleague.tingkatNum && (
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold shrink-0">
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
