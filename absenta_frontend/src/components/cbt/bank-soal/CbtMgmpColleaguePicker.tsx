import React, { useMemo, useEffect, useRef } from 'react';
import { Users, CheckSquare, Square, Info, UserCheck, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import type { GuruMapel } from '@/types/academic';
import { cn } from '@/lib/utils';
import { formatTingkatRomawi } from './cbtAsesmenHelper';
import { findParallelColleaguesSSOT } from './cbtDutyEngine';

interface CbtMgmpColleaguePickerProps {
  mapelId: string;
  tingkat?: string; // 'X' | 'XI' | 'XII' | 'SEMUA'
  jurusan?: string; // misal 'KUL', 'TSM', 'PHT', atau kosong untuk semua
  currentGuruId: string;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  title?: string;
  isEditMode?: boolean;
}

export const CbtMgmpColleaguePicker: React.FC<CbtMgmpColleaguePickerProps> = ({
  mapelId,
  tingkat,
  jurusan,
  currentGuruId,
  selectedIds,
  onChangeSelectedIds,
  title,
  isEditMode = false,
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

  const targetJurusanTokens = useMemo(() => {
    if (!jurusan) return [];
    return jurusan
      .toUpperCase()
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [jurusan]);

  const parallelColleagues = useMemo(() => {
    const list = parallelTeachersRes?.data || [];
    return findParallelColleaguesSSOT({
      mapelId,
      tingkatNum: targetTingkatNum,
      targetJurusanTokens,
      currentGuruId,
      guruMapelList: list,
    });
  }, [parallelTeachersRes?.data, mapelId, currentGuruId, targetTingkatNum, targetJurusanTokens]);

  // Otomatis sinkronkan centang rekan guru saat tingkat, mapel, atau sasaran jurusan berubah
  // PENTING: Pada mode edit, JANGAN otomatis memilih semua agar penarikan share (uncheck) tidak tertimpa!
  // Namun, bersihkan id guru yang sudah tidak lagi lolos filter jurusan target.
  const autoSelectedKeyRef = useRef<string>('');
  useEffect(() => {
    const currentKey = `${mapelId}_${tingkat}_${targetJurusanTokens.join('-')}`;
    if (autoSelectedKeyRef.current !== currentKey) {
      autoSelectedKeyRef.current = currentKey;
      if (!isEditMode) {
        // Centang hanya rekan guru yang lolos filter jurusan & tingkat pada saat pembuatan baru
        onChangeSelectedIds(parallelColleagues.map((c) => c.id));
      } else {
        // Pada mode edit: jika ada guru terpilih yang sudah tidak lagi mengajar jurusan target, bersihkan
        const validIds = new Set(parallelColleagues.map((c) => c.id));
        const filtered = selectedIds.filter((id) => validIds.has(id));
        if (filtered.length !== selectedIds.length) {
          onChangeSelectedIds(filtered);
        }
      }
    }
  }, [parallelColleagues, mapelId, tingkat, targetJurusanTokens, onChangeSelectedIds, isEditMode, selectedIds]);

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
  const scopeLabel = targetJurusanTokens.length > 0
    ? `konsentrasi keahlian ${targetJurusanTokens.join(', ')} pada ${tingkatLabel || 'tingkat ini'}`
    : `${tingkatLabel || 'tingkat ini'}`;

  if (parallelColleagues.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
        <Info size={15} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Anda adalah satu-satunya pengampu mapel ini di {scopeLabel}.</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {targetJurusanTokens.length > 0 ? (
              <>Paket Master ini khusus dialokasikan untuk seluruh rombel <strong>{targetJurusanTokens.join(', ')}</strong> binaan Anda tanpa membebani guru jurusan lain.</>
            ) : (
              <>Paket Master MGMP ini akan langsung aktif untuk seluruh rombel binaan Anda dan terdaftar di jadwal ujian sekolah.</>
            )}
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
          <span>{title || `Mau dibagi ke siapa saja? (Rekan Guru ${tingkatLabel}${targetJurusanTokens.length > 0 ? ` - ${targetJurusanTokens.join(', ')}` : ''})`}</span>
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
            {targetJurusanTokens.length > 0 ? (
              <>Rekan guru se-jurusan <strong>{targetJurusanTokens.join(', ')}</strong> yang dicentang otomatis menerima paket Master ini di akun mereka.</>
            ) : (
              <>Rekan guru yang dicentang otomatis menerima paket Master ini di akun mereka &amp; tercatat sebagai <strong>Ter-cover Master</strong> di meja orkestrasi panitia.</>
            )}
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
                    {colleague.matchedJurusanKelas.length > 0 ? (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate block">
                        Mengajar: {colleague.matchedJurusanKelas.join(', ')}
                      </span>
                    ) : colleague.kelasNames.length > 0 ? (
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
                {typeof colleague.tingkatNum === 'number' && !isNaN(colleague.tingkatNum) && colleague.tingkatNum > 0 && (
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
