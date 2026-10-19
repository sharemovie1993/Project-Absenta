import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckSquare, Square, Calendar, Building2, ShieldCheck, AlertTriangle, X, Trash2 } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { SimpleFormField } from '../ui/SimpleFormField';
import { kelasApi, siswaApi } from '../../api/academic.api';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { toast } from 'react-hot-toast';

export interface SelectedBulkStudent {
  id: string;
  nama_siswa: string;
  nis: string;
  kelas_id: string;
  nama_kelas: string;
}

interface HubinPklBulkPlottingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  placedStudentIds: Set<string>;
  onSubmit: (data: {
    siswa_ids: string[];
    mitra_id: string;
    pembimbing_id: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    tahun_pelajaran_id?: string | null;
    semester_id?: string | null;
    kelas_id?: string | null;
    items?: Array<{ siswa_id: string; kelas_id?: string | null }>;
  }) => void;
  isPending: boolean;
  onGuruSearch?: (val: string) => void;
  onMitraSearch?: (val: string) => void;
  isLoadingGuru?: boolean;
  isLoadingMitra?: boolean;
  filterJurusanId?: string;
  jurusanNama?: string;
  kelasOptions?: SearchableSelectOption[];
  tpOptions?: SearchableSelectOption[];
  selectedTpFilter?: string;
}

export const HubinPklBulkPlottingModal: React.FC<HubinPklBulkPlottingModalProps> = React.memo(({
  isOpen,
  onClose,
  mitraOptions,
  guruOptions,
  placedStudentIds,
  onSubmit,
  isPending,
  onGuruSearch,
  onMitraSearch,
  isLoadingGuru,
  isLoadingMitra,
  filterJurusanId,
  jurusanNama,
}) => {
  const [selectedKelasId, setSelectedKelasId] = useState('');
  // Entity map to support seamless cross-class (lintas rombel) selections
  const [selectedStudents, setSelectedStudents] = useState<Record<string, SelectedBulkStudent>>({});
  const [selectedMitraId, setSelectedMitraId] = useState('');
  const [selectedPembimbingId, setSelectedPembimbingId] = useState('');

  // Tahun Pelajaran & Semester hooks
  const { options: tpOptions, activeTahunPelajaran, isLoading: isLoadingTp } = useTahunPelajaranOptions();
  const [selectedTpId, setSelectedTpId] = useState<string>('');

  useEffect(() => {
    if (activeTahunPelajaran?.id && !selectedTpId) {
      setSelectedTpId(activeTahunPelajaran.id);
    }
  }, [activeTahunPelajaran, selectedTpId]);

  const { options: semOptions, activeSemester, isLoading: isLoadingSem } = useSemesterOptions({
    tahunPelajaranId: selectedTpId || activeTahunPelajaran?.id
  });
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  useEffect(() => {
    if (activeSemester?.id && !selectedSemesterId) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedKelasId('');
      setSelectedStudents({});
      setSelectedMitraId('');
      setSelectedPembimbingId('');
      if (activeTahunPelajaran?.id) setSelectedTpId(activeTahunPelajaran.id);
      if (activeSemester?.id) setSelectedSemesterId(activeSemester.id);
    }
  }, [isOpen, activeTahunPelajaran, activeSemester]);

  // Derived student lists
  const selectedStudentList = useMemo(() => Object.values(selectedStudents), [selectedStudents]);

  // Summary of classes involved in the current bulk selection
  const selectedClassesSummary = useMemo(() => {
    const map = new Map<string, { nama_kelas: string; count: number }>();
    selectedStudentList.forEach((s) => {
      const existing = map.get(s.kelas_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.kelas_id, { nama_kelas: s.nama_kelas, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [selectedStudentList]);

  const selectedMitra = useMemo(() => {
    return mitraOptions.find(m => m.value === selectedMitraId)?.raw as any;
  }, [mitraOptions, selectedMitraId]);

  const isOverQuota = useMemo(() => {
    if (!selectedMitra || !selectedMitra.kuota || selectedMitra.kuota === 0) return false;
    return selectedStudentList.length > selectedMitra.sisa;
  }, [selectedMitra, selectedStudentList.length]);

  // Fetch Classes
  const { data: kelasResponse, isLoading: isLoadingKelas } = useQuery({
    queryKey: ['kelas-bulk-list'],
    queryFn: () => kelasApi.getAll({ limit: 500 }),
    enabled: isOpen,
  });

  const kelasList = useMemo(() => {
    const dataObj = kelasResponse as { data?: any[] } | undefined;
    const all = Array.isArray(kelasResponse?.data) ? kelasResponse.data : dataObj?.data || [];
    if (filterJurusanId) {
      return all.filter((k: any) => k.jurusan_id === filterJurusanId);
    }
    return all;
  }, [kelasResponse, filterJurusanId]);

  const kelasOptions = useMemo(() => {
    return kelasList.map((k: any) => {
      const kodeJurusan = k.Jurusan?.kode_jurusan || (k.Jurusan as any)?.singkatan;
      return {
        label: `${k.nama_kelas}${kodeJurusan && !filterJurusanId ? ` (${kodeJurusan})` : ''}`,
        value: k.id,
      };
    });
  }, [kelasList, filterJurusanId]);

  const currentKelasObj = useMemo(() => {
    return kelasList.find((k: any) => k.id === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  // Fetch Students for selected Class
  const { data: siswaResponse, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['siswa-by-kelas', selectedKelasId],
    queryFn: () => siswaApi.getAll({ kelas_id: selectedKelasId, limit: 200 }),
    enabled: isOpen && !!selectedKelasId,
  });

  const siswaListRaw = useMemo(() => {
    const dataObj = siswaResponse as { data?: any[] } | undefined;
    return Array.isArray(siswaResponse?.data) ? siswaResponse.data : dataObj?.data || [];
  }, [siswaResponse]);

  // Filter students who are NOT currently placed in active PKL
  const filteredStudents = useMemo(() => {
    return siswaListRaw.filter((s: any) => !placedStudentIds.has(s.id));
  }, [siswaListRaw, placedStudentIds]);

  // Handle toggle single student selection (cross-class safe)
  const handleToggleSiswa = (siswa: any) => {
    setSelectedStudents((prev) => {
      const next = { ...prev };
      if (next[siswa.id]) {
        delete next[siswa.id];
      } else {
        const kId = siswa.kelas_id || selectedKelasId;
        const kNama = siswa.Kelas?.nama_kelas || currentKelasObj?.nama_kelas || 'Kelas';
        next[siswa.id] = {
          id: siswa.id,
          nama_siswa: siswa.nama_siswa,
          nis: siswa.nis || '-',
          kelas_id: kId,
          nama_kelas: kNama,
        };
      }
      return next;
    });
  };

  // Remove individual student from selected list
  const handleRemoveStudent = (siswaId: string) => {
    setSelectedStudents((prev) => {
      const next = { ...prev };
      delete next[siswaId];
      return next;
    });
  };

  // Clear all selected students across all classes
  const handleClearAllSelected = () => {
    setSelectedStudents({});
  };

  // Check if all students in the currently viewed class are selected
  const isAllCurrentClassSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s: any) => !!selectedStudents[s.id]);
  }, [filteredStudents, selectedStudents]);

  // Handle select all / deselect all in the current class without affecting other classes
  const handleToggleSelectAllInCurrentClass = () => {
    if (filteredStudents.length === 0) return;
    setSelectedStudents((prev) => {
      const next = { ...prev };
      if (isAllCurrentClassSelected) {
        // Deselect only students of this current class
        filteredStudents.forEach((s: any) => {
          delete next[s.id];
        });
      } else {
        // Select all students of this class, keeping previous selections intact
        const kId = selectedKelasId;
        const kNama = currentKelasObj?.nama_kelas || 'Kelas';
        filteredStudents.forEach((s: any) => {
          next[s.id] = {
            id: s.id,
            nama_siswa: s.nama_siswa,
            nis: s.nis || '-',
            kelas_id: s.kelas_id || kId,
            nama_kelas: s.Kelas?.nama_kelas || kNama,
          };
        });
      }
      return next;
    });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (selectedStudentList.length === 0) {
      toast.error('Mohon pilih minimal satu siswa untuk di-plot');
      return;
    }
    if (!selectedMitraId) {
      toast.error('Mohon pilih mitra industri');
      return;
    }

    const tMulai = formData.get('tanggal_mulai') as string;
    const tSelesai = formData.get('tanggal_selesai') as string;

    const items = selectedStudentList.map((s) => ({
      siswa_id: s.id,
      kelas_id: s.kelas_id,
    }));

    onSubmit({
      siswa_ids: selectedStudentList.map((s) => s.id),
      mitra_id: selectedMitraId,
      pembimbing_id: selectedPembimbingId || null,
      tanggal_mulai: tMulai ? new Date(tMulai).toISOString() : new Date().toISOString(),
      tanggal_selesai: tSelesai ? new Date(tSelesai).toISOString() : null,
      tahun_pelajaran_id: selectedTpId || activeTahunPelajaran?.id || null,
      semester_id: selectedSemesterId || activeSemester?.id || null,
      kelas_id: selectedKelasId || null,
      items,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          <span>Plotting Penempatan PKL Kolektif (Lintas Kelas)</span>
        </div>
      }
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rombel / Kelas Selector & Students List */}
          <div className="md:col-span-1 border-r border-slate-150 dark:border-slate-800 pr-4 space-y-3">
            {/* Konteks Tahun Pelajaran & Semester */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar size={13} className="text-indigo-600" />
                <span>Konteks Akademik</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SimpleFormField htmlFor="bulk-tp" label="Tahun Pelajaran" required>
                  <SearchableSelect
                    id="bulk-tp"
                    options={tpOptions}
                    placeholder="-- Pilih TP --"
                    triggerClassName="h-9 text-xs w-full rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                    onValueChange={(val) => {
                      setSelectedTpId(val);
                      setSelectedSemesterId('');
                    }}
                    value={selectedTpId || activeTahunPelajaran?.id || ''}
                    isLoading={isLoadingTp}
                  />
                </SimpleFormField>
                <SimpleFormField htmlFor="bulk-semester" label="Semester" required>
                  <SearchableSelect
                    id="bulk-semester"
                    options={semOptions}
                    placeholder="-- Pilih Semester --"
                    triggerClassName="h-9 text-xs w-full rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                    onValueChange={(val) => setSelectedSemesterId(val)}
                    value={selectedSemesterId || activeSemester?.id || ''}
                    isLoading={isLoadingSem}
                  />
                </SimpleFormField>
              </div>
            </div>

            {/* Kaprog Scope Indicator */}
            {filterJurusanId && (
              <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="text-[11px] leading-snug">
                  <p className="font-bold">Mode Kaprog Terkunci</p>
                  <p className="text-indigo-700/80 dark:text-indigo-300/80">
                    Hanya menampilkan kelas Jurusan {jurusanNama || 'Anda'}.
                  </p>
                </div>
              </div>
            )}

            <SimpleFormField htmlFor="bulk-kelas" label="Pilih Kelas / Rombel" required>
              <SearchableSelect
                id="bulk-kelas"
                options={kelasOptions}
                placeholder="-- Pilih Kelas --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedKelasId(val);
                  // Do NOT clear selectedStudents; keep cross-class selections intact!
                }}
                value={selectedKelasId}
                isLoading={isLoadingKelas}
              />
            </SimpleFormField>

            {/* Students List Container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Daftar Siswa ({filteredStudents.length} Belum PKL)
                </span>
                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllInCurrentClass}
                    className="text-[10px] font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    {isAllCurrentClassSelected ? 'Batal Semua di Kelas Ini' : 'Pilih Semua di Kelas Ini'}
                  </button>
                )}
              </div>

              <div className="h-[260px] overflow-y-auto overflow-x-hidden border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-2 space-y-1.5">
                {isLoadingSiswa ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Memuat data siswa...
                  </div>
                ) : !selectedKelasId ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center px-4 italic">
                    Silakan pilih kelas terlebih dahulu untuk memuat daftar siswa.
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 text-center px-4 font-medium italic">
                    Semua siswa di kelas ini sudah memiliki plotting penempatan aktif!
                  </div>
                ) : (
                  filteredStudents.map((siswa: any) => {
                    const isChecked = !!selectedStudents[siswa.id];
                    return (
                      <div
                        key={siswa.id}
                        onClick={() => handleToggleSiswa(siswa)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 border rounded-lg cursor-pointer select-none transition-all duration-100 ${
                          isChecked
                            ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square size={15} className="text-slate-400 shrink-0" />
                        )}
                        <div className="text-left leading-tight min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-slate-850 dark:text-slate-200" title={siswa.nama_siswa}>
                            {siswa.nama_siswa}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            {siswa.nis}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total Selection Counter Pill in Left Column */}
              {selectedStudentList.length > 0 && (
                <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-indigo-750 dark:text-indigo-300">
                      {selectedStudentList.length} Siswa Terpilih
                    </p>
                    <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 font-medium">
                      Dari {selectedClassesSummary.length} Rombel
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllSelected}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline transition-colors"
                  >
                    Batal Semua
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Placement Details & Selected Students Tray */}
          <div className="md:col-span-2 space-y-3.5 pl-0 md:pl-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
              Detail Penempatan Kolektif
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SimpleFormField htmlFor="bulk-mitra" label="Mitra Industri DU/DI" required>
                <SearchableSelect
                  id="bulk-mitra"
                  options={mitraOptions}
                  placeholder="-- Pilih perusahaan --"
                  triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                  onValueChange={(val) => setSelectedMitraId(val)}
                  value={selectedMitraId}
                  onSearch={onMitraSearch}
                  isLoading={isLoadingMitra}
                />
                {selectedMitra && (
                  <div className={`mt-2 p-2.5 rounded-xl border text-xs transition-all ${
                    isOverQuota || selectedMitra.isPenuh 
                      ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-800 dark:text-amber-300' 
                      : 'bg-slate-50 border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Users size={13} className={isOverQuota || selectedMitra.isPenuh ? 'text-amber-600' : 'text-indigo-600'} />
                        <span>Kapasitas:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold">{selectedMitra.terisi} / {selectedMitra.kuota || '∞'} Siswa</span>
                        {selectedMitra.kuota > 0 ? (
                          isOverQuota ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-300">
                              ⚠️ Over (+{selectedStudentList.length - selectedMitra.sisa})
                            </span>
                          ) : selectedMitra.isPenuh ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/50 dark:text-rose-300">
                              Penuh
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300">
                              ✓ Sisa {selectedMitra.sisa} Slot
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum dibatasi</span>
                        )}
                      </div>
                    </div>

                    {/* Referensi Keahlian Mitra */}
                    {selectedMitra.kompetensi_keahlian && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Fokus Keahlian:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[170px]" title={selectedMitra.kompetensi_keahlian}>
                          {selectedMitra.kompetensi_keahlian}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </SimpleFormField>

              <SimpleFormField htmlFor="bulk-pembimbing" label="Guru Pembimbing Lapangan">
                <SearchableSelect
                  id="bulk-pembimbing"
                  options={guruOptions}
                  placeholder="-- Pilih guru pembimbing --"
                  triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                  onValueChange={(val) => setSelectedPembimbingId(val)}
                  value={selectedPembimbingId}
                  onSearch={onGuruSearch}
                  isLoading={isLoadingGuru}
                />
              </SimpleFormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SimpleFormField htmlFor="bulk-tanggal-mulai" label="Tanggal Mulai PKL" required>
                <Input
                  id="bulk-tanggal-mulai"
                  type="date"
                  name="tanggal_mulai"
                  required
                />
              </SimpleFormField>
              <SimpleFormField htmlFor="bulk-tanggal-selesai" label="Tanggal Selesai PKL (Estimasi)">
                <Input
                  id="bulk-tanggal-selesai"
                  type="date"
                  name="tanggal_selesai"
                />
              </SimpleFormField>
            </div>

            {/* Tray Ringkasan Rombongan Siswa Terpilih (Lintas Rombel) */}
            {selectedStudentList.length > 0 && (
              <div className="p-3 bg-slate-50/90 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Rombongan Siswa Terpilih ({selectedStudentList.length})
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {selectedClassesSummary.length} Rombel
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllSelected}
                    className="text-[10px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={11} />
                    <span>Kosongkan</span>
                  </button>
                </div>

                {/* Distribusi Rombel */}
                <div className="flex flex-wrap gap-1">
                  {selectedClassesSummary.map((cls) => (
                    <span
                      key={cls.nama_kelas}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{cls.nama_kelas}:</span> {cls.count} siswa
                    </span>
                  ))}
                </div>

                {/* List Siswa Chips with Quick Remove */}
                <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-2">
                  {selectedStudentList.map((student) => (
                    <div
                      key={student.id}
                      className="group flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg bg-white dark:bg-slate-950 border border-indigo-200/70 dark:border-indigo-900/60 text-xs shadow-2xs transition-all hover:border-indigo-400"
                    >
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {student.nama_kelas}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[130px] truncate" title={student.nama_siswa}>
                        {student.nama_siswa}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(student.id)}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={`Hapus ${student.nama_siswa} dari rombongan`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isOverQuota && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex gap-2.5 items-start text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Perhatian Over-Kuota</span>: Penempatan {selectedStudentList.length} siswa akan melebihi sisa kapasitas mitra ini ({selectedMitra?.sisa} slot tersisa). Sistem tetap mengizinkan penempatan ini sebagai dispensasi kemitraan DUDI.
                </div>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-150/40 dark:border-slate-800/40 rounded-xl flex gap-3 items-start">
              <Building2 className="text-indigo-500 shrink-0 mt-0.5" size={17} />
              <div className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-750 dark:text-slate-350">Catatan Plotting Kolektif</span>: Semua siswa terpilih ({selectedStudentList.length} siswa{selectedClassesSummary.length > 1 ? ` dari ${selectedClassesSummary.length} kelas` : ''}) akan di-plot secara serentak ke mitra industri dan pembimbing yang sama. Status penempatan akan langsung disetel menjadi <span className="font-semibold text-indigo-650 dark:text-indigo-400">AKTIF</span>.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending} disabled={selectedStudentList.length === 0}>
            Terapkan Plotting Kolektif ({selectedStudentList.length} Siswa)
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default HubinPklBulkPlottingModal;
