import React, { useMemo, useEffect, useRef } from 'react';
import { Users, CheckSquare, Square, Info, UserCheck, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import { formatTingkatRomawi } from './cbtAsesmenHelper';
import {
  findParallelColleaguesSSOT,
  parseStrictTingkatValue,
  resolveStrictBankTingkat,
} from './cbtDutyEngine';

interface CbtMgmpColleaguePickerProps {
  mapelId: string;
  tingkat?: string; // 'X' | 'XI' | 'XII' | 'SEMUA'
  jurusan?: string; // misal 'KUL', 'TSM', 'PHT', atau kosong untuk semua
  currentGuruId: string;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  selectedKelasIds?: string[];
  onChangeSelectedKelasIds?: (kelasIds: string[]) => void;
  title?: string;
  isEditMode?: boolean;
  tahunPelajaranId?: string;
  semesterId?: string;
  eventId?: string;
}

export const CbtMgmpColleaguePicker: React.FC<CbtMgmpColleaguePickerProps> = ({
  mapelId,
  tingkat,
  jurusan,
  currentGuruId,
  selectedIds,
  onChangeSelectedIds,
  selectedKelasIds = [],
  onChangeSelectedKelasIds,
  title,
  isEditMode = false,
  tahunPelajaranId,
  semesterId,
  eventId,
}) => {
  const { data: parallelTeachersRes, isLoading } = useQuery({
    queryKey: ['parallel-teachers', mapelId, tahunPelajaranId, semesterId],
    queryFn: () =>
      mapelId
        ? listGuruMapel({
            mapel_id: mapelId,
            ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {}),
            ...(semesterId ? { semester_id: semesterId } : {}),
          })
        : null,
    enabled: Boolean(mapelId),
  });

  // Cek rekan yang sudah memiliki bank soal mandiri sendiri pada event/TP/semester aktif
  const { data: mapelBanksRes } = useQuery({
    queryKey: ['mapel-banks-distribution', mapelId, tahunPelajaranId, semesterId, eventId],
    queryFn: () =>
      mapelId
        ? cbtApi.getBankSoalList({
            mapel_id: mapelId,
            ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {}),
            ...(semesterId ? { semester_id: semesterId } : {}),
            ...(eventId ? { event_id: eventId } : {}),
            limit: 200,
          })
        : null,
    enabled: Boolean(mapelId),
    staleTime: 30 * 1000,
  });

  // Konversi tingkat target multi-jenjang (1..13 / I..XIII) untuk pencocokan ketat
  const targetTingkatNum = useMemo(() => {
    if (!tingkat || tingkat === 'SEMUA') return null;
    return parseStrictTingkatValue(tingkat);
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

  // Peta eksplisit guru_id -> daftar kelas (id, nama_kelas, jurusanCode) pada tingkat sasaran
  const { colleagueKelasMap, creatorInfo } = useMemo(() => {
    const map = new Map<string, Array<{ kelasId: string; namaKelas: string; jurusanCode: string }>>();
    const creatorKelas: Array<{ kelasId: string; namaKelas: string; jurusanCode: string }> = [];
    let creatorName = '';
    const rows: any[] = parallelTeachersRes?.data || [];
    rows.forEach((gm: any) => {
      if (!gm?.guru_id || !gm.Kelas?.id) return;
      const gmTingkat = Number(gm.Kelas?.tingkat ?? gm.tingkat);
      if (targetTingkatNum && gmTingkat && gmTingkat !== targetTingkatNum) return;
      const jObj = gm.Kelas?.Jurusan || gm.Jurusan;
      const jCode = (jObj?.singkatan || jObj?.kode || jObj?.kode_jurusan || jObj?.nama || '')
        .toUpperCase()
        .trim();
      const kelasItem = {
        kelasId: gm.Kelas.id,
        namaKelas: gm.Kelas.nama_kelas || gm.Kelas.nama || '-',
        jurusanCode: jCode,
      };
      if (gm.guru_id === currentGuruId) {
        if (!creatorName && gm.Guru?.nama_guru) creatorName = gm.Guru.nama_guru;
        if (!creatorKelas.some((x) => x.kelasId === kelasItem.kelasId)) {
          creatorKelas.push(kelasItem);
        }
        return;
      }
      const arr = map.get(gm.guru_id) || [];
      if (!arr.some((x) => x.kelasId === kelasItem.kelasId)) {
        arr.push(kelasItem);
      }
      map.set(gm.guru_id, arr);
    });
    map.forEach((arr, key) => {
      arr.sort((a, b) => a.namaKelas.localeCompare(b.namaKelas, 'id', { numeric: true }));
      map.set(key, arr);
    });
    creatorKelas.sort((a, b) => a.namaKelas.localeCompare(b.namaKelas, 'id', { numeric: true }));
    return {
      colleagueKelasMap: map,
      creatorInfo: currentGuruId
        ? {
            id: currentGuruId,
            name: creatorName || 'Anda (Pembuat Soal)',
            kelasList: creatorKelas,
          }
        : null,
    };
  }, [parallelTeachersRes?.data, currentGuruId, targetTingkatNum]);

  const guruOwnBankSet = useMemo(() => {
    const items: CbtBankSoal[] = mapelBanksRes?.items || (mapelBanksRes as any)?.data?.items || [];
    const set = new Set<string>();
    items.forEach((b) => {
      if (!b.guru_id || b.guru_id === currentGuruId) return;
      const bTingkat = resolveStrictBankTingkat(b);
      if (targetTingkatNum && bTingkat && bTingkat !== targetTingkatNum) return;
      set.add(b.guru_id);
    });
    return set;
  }, [mapelBanksRes, currentGuruId, targetTingkatNum]);

  // Otomatis sinkronkan centang rekan guru saat tingkat, mapel, atau sasaran jurusan berubah
  // PENTING: Pada mode edit, JANGAN otomatis memilih semua agar penarikan share (uncheck) tidak tertimpa!
  // Pada pembuatan baru: hanya centang rekan yang BELUM memiliki bank soal mandiri.
  const autoSelectedKeyRef = useRef<string>('');
  useEffect(() => {
    if (isLoading || !mapelId) return;
    const currentKey = `${mapelId}_${tingkat}_${targetJurusanTokens.join('-')}_${parallelColleagues.length}_${guruOwnBankSet.size}`;
    if (autoSelectedKeyRef.current !== currentKey) {
      autoSelectedKeyRef.current = currentKey;
      if (!isEditMode) {
        const autoTeachers = parallelColleagues.filter((c) => !guruOwnBankSet.has(c.id));
        onChangeSelectedIds(autoTeachers.map((c) => c.id));
        if (onChangeSelectedKelasIds) {
          const autoKelas: string[] = [];
          autoTeachers.forEach((c) => {
            (colleagueKelasMap.get(c.id) || []).forEach((k) => autoKelas.push(k.kelasId));
          });
          onChangeSelectedKelasIds(Array.from(new Set(autoKelas)));
        }
      } else {
        // Pada mode edit: jika ada guru terpilih yang sudah tidak lagi mengajar jurusan target, bersihkan
        const validIds = new Set(parallelColleagues.map((c) => c.id));
        const filtered = selectedIds.filter((id) => validIds.has(id));
        if (filtered.length !== selectedIds.length) {
          onChangeSelectedIds(filtered);
        }
      }
    }
  }, [isLoading, parallelColleagues, colleagueKelasMap, mapelId, tingkat, targetJurusanTokens, onChangeSelectedIds, onChangeSelectedKelasIds, isEditMode, selectedIds, guruOwnBankSet]);

  // Sinkronisasi dua arah: jika ada kelas rekan pada selectedKelasIds tetapi ID guru belum masuk ke selectedIds,
  // otomatis masukkan guru tersebut agar counter "X dari Y guru dipilih" dan contributor_guru_ids ke backend selalu konsisten.
  useEffect(() => {
    if (isLoading || colleagueKelasMap.size === 0 || selectedKelasIds.length === 0) return;
    const missingGuruIds: string[] = [];
    colleagueKelasMap.forEach((kelasList, gId) => {
      const hasSelectedKelas = kelasList.some((k) => selectedKelasIds.includes(k.kelasId));
      if (hasSelectedKelas && !selectedIds.includes(gId)) {
        missingGuruIds.push(gId);
      }
    });
    if (missingGuruIds.length > 0) {
      onChangeSelectedIds(Array.from(new Set([...selectedIds, ...missingGuruIds])));
    }
  }, [isLoading, colleagueKelasMap, selectedKelasIds, selectedIds, onChangeSelectedIds]);

  // Fallback 1 kali untuk bank soal lama (legacy) saat mode Edit:
  // Jika Kontributor guru sudah ada tetapi target_kelas_ids masih kosong/null, centang semua kelas guru tsb pada konteks akademik aktif
  const legacyEditFallbackAppliedRef = useRef<boolean>(false);
  useEffect(() => {
    if (
      isEditMode &&
      !legacyEditFallbackAppliedRef.current &&
      selectedIds.length > 0 &&
      selectedKelasIds.length === 0 &&
      colleagueKelasMap.size > 0 &&
      onChangeSelectedKelasIds
    ) {
      legacyEditFallbackAppliedRef.current = true;
      const fallbackKelas: string[] = [];
      selectedIds.forEach((id) => {
        (colleagueKelasMap.get(id) || []).forEach((k) => fallbackKelas.push(k.kelasId));
      });
      if (fallbackKelas.length > 0) {
        onChangeSelectedKelasIds(Array.from(new Set(fallbackKelas)));
      }
    }
  }, [isEditMode, selectedIds, selectedKelasIds.length, colleagueKelasMap, onChangeSelectedKelasIds]);

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
      onChangeSelectedKelasIds?.([]);
    } else {
      onChangeSelectedIds(parallelColleagues.map((c) => c.id));
      if (onChangeSelectedKelasIds) {
        const allK: string[] = [];
        parallelColleagues.forEach((c) => {
          (colleagueKelasMap.get(c.id) || []).forEach((k) => allK.push(k.kelasId));
        });
        onChangeSelectedKelasIds(Array.from(new Set(allK)));
      }
    }
  };

  const toggleItem = (id: string) => {
    const teacherKelas = (colleagueKelasMap.get(id) || []).map((k) => k.kelasId);
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((item) => item !== id));
      if (onChangeSelectedKelasIds && teacherKelas.length > 0) {
        const removeSet = new Set(teacherKelas);
        onChangeSelectedKelasIds(selectedKelasIds.filter((kid) => !removeSet.has(kid)));
      }
    } else {
      onChangeSelectedIds([...selectedIds, id]);
      if (onChangeSelectedKelasIds && teacherKelas.length > 0) {
        onChangeSelectedKelasIds(Array.from(new Set([...selectedKelasIds, ...teacherKelas])));
      }
    }
  };

  const toggleSingleKelas = (guruIdOwner: string, kelasId: string) => {
    if (!onChangeSelectedKelasIds) return;
    const isSelected = selectedKelasIds.includes(kelasId);
    const nextKelasIds = isSelected
      ? selectedKelasIds.filter((k) => k !== kelasId)
      : [...selectedKelasIds, kelasId];
    onChangeSelectedKelasIds(nextKelasIds);

    const teacherKelas = (colleagueKelasMap.get(guruIdOwner) || []).map((k) => k.kelasId);
    const stillHasAny = teacherKelas.some((kid) => nextKelasIds.includes(kid));
    if (stillHasAny && !selectedIds.includes(guruIdOwner)) {
      onChangeSelectedIds([...selectedIds, guruIdOwner]);
    } else if (!stillHasAny && selectedIds.includes(guruIdOwner)) {
      onChangeSelectedIds(selectedIds.filter((id) => id !== guruIdOwner));
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

        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
          {creatorInfo && (
            <div className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1 select-none">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    readOnly
                    className="rounded border-emerald-400 text-emerald-600 shrink-0 cursor-not-allowed"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {creatorInfo.name}
                  </span>
                  {creatorInfo.kelasList.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                      {creatorInfo.kelasList.length}/{creatorInfo.kelasList.length} kelas
                    </span>
                  )}
                </div>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold shrink-0">
                  Pembuat Master (Anda)
                </span>
              </div>
              {creatorInfo.kelasList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {creatorInfo.kelasList.map((k) => (
                    <span
                      key={k.kelasId}
                      className="px-2 py-1 rounded-lg border border-emerald-500 bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-3 h-3 rounded-xs flex items-center justify-center text-[9px] border border-white/70 bg-white/20 text-white">
                        ✓
                      </span>
                      <span>{k.namaKelas}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {parallelColleagues.map((colleague) => {
            const teacherKelasList = colleagueKelasMap.get(colleague.id) || [];
            const selectedCountForTeacher = teacherKelasList.filter((k) =>
              selectedKelasIds.includes(k.kelasId)
            ).length;
            const isAllTeacherKelasSelected =
              teacherKelasList.length > 0 &&
              selectedCountForTeacher === teacherKelasList.length;
            const isPartialTeacherSelected =
              selectedCountForTeacher > 0 &&
              selectedCountForTeacher < teacherKelasList.length;
            const isChecked =
              teacherKelasList.length > 0
                ? selectedCountForTeacher > 0
                : selectedIds.includes(colleague.id);

            return (
              <div
                key={colleague.id}
                className={cn(
                  'p-2.5 rounded-xl border text-xs transition-all space-y-2',
                  isChecked
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    onClick={() => toggleItem(colleague.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isAllTeacherKelasSelected || (teacherKelasList.length === 0 && isChecked)}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartialTeacherSelected;
                      }}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {colleague.name}
                    </span>
                    {teacherKelasList.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                        {selectedCountForTeacher}/{teacherKelasList.length} kelas
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    {guruOwnBankSet.has(colleague.id) && (
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-bold"
                        title="Rekan ini sudah memiliki Bank Soal Mandiri sendiri"
                      >
                        Sudah Ada Mandiri
                      </span>
                    )}
                    {typeof colleague.tingkatNum === 'number' && !isNaN(colleague.tingkatNum) && colleague.tingkatNum > 0 && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        Tingkat {formatTingkatRomawi(colleague.tingkatNum)}
                      </span>
                    )}
                  </div>
                </div>

                {teacherKelasList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {teacherKelasList.map((k) => {
                      const kelasSelected = selectedKelasIds.includes(k.kelasId);
                      return (
                        <button
                          key={k.kelasId}
                          type="button"
                          onClick={() => toggleSingleKelas(colleague.id, k.kelasId)}
                          className={cn(
                            'px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                            kelasSelected
                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                          )}
                        >
                          <span
                            className={cn(
                              'w-3 h-3 rounded-xs flex items-center justify-center text-[9px] border',
                              kelasSelected
                                ? 'border-white/70 bg-white/20 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            )}
                          >
                            {kelasSelected ? '✓' : ''}
                          </span>
                          <span>{k.namaKelas}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 pl-6">
                    {colleague.kelasNames.length > 0
                      ? `Mengajar: ${colleague.kelasNames.join(', ')}`
                      : 'Guru Pengampu Paralel'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
