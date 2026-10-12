import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  Users,
  Award,
  ArrowRight,
  School,
  SlidersHorizontal,
  GraduationCap,
  Info,
} from 'lucide-react';
import { AutoGenerateUpacaraPayload } from '@/api/attendance/pembinaUpacara.api';
import type { WaliKelasStrukturAssignment } from '@/types/academic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AutoGenerateUpacaraPayload) => Promise<void>;
  waliKelasList?: WaliKelasStrukturAssignment[];
  guruList: Array<{ id: string; nama_guru: string; nip?: string | null }>;
  classList: Array<{ id: string; nama_kelas: string }>;
  tahunPelajaranId: string;
  semesterId?: string;
  academicContextLabel?: string;
}

type SortOrder = 'TINGKAT_ASC' | 'TINGKAT_DESC' | 'KELAS_ALPHA';

export const AutoGenerateUpacaraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  waliKelasList = [],
  guruList,
  classList,
  tahunPelajaranId,
  semesterId,
  academicContextLabel,
}) => {
  // Mode: Rotasi Wali Kelas (rekomendasi) atau Manual
  const hasWaliKelasData = waliKelasList.length > 0;
  const [sourceMode, setSourceMode] = useState<'WALIKELAS' | 'MANUAL'>(
    hasWaliKelasData ? 'WALIKELAS' : 'MANUAL'
  );

  // Tanggal
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [loading, setLoading] = useState(false);

  // State Mode Wali Kelas
  const formattedWaliItems = useMemo(() => {
    return waliKelasList
      .filter((w) => Boolean(w.guru_id))
      .map((w) => ({
        id: w.id,
        guru_id: w.guru_id,
        nama_guru: w.Guru?.nama_guru || 'Guru Belum Terdaftar',
        nip: w.Guru?.nip || null,
        kelas_id: w.StrukturOrganisasi?.kelas_id || w.StrukturOrganisasi?.Kelas?.id || null,
        nama_kelas: w.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas Tidak Diketahui',
        tingkat: w.StrukturOrganisasi?.Kelas?.tingkat || 10,
      }));
  }, [waliKelasList]);

  const [sortOrder, setSortOrder] = useState<SortOrder>('TINGKAT_ASC');
  const [selectedWaliIds, setSelectedWaliIds] = useState<string[]>(
    formattedWaliItems.map((w) => w.id)
  );
  const [autoPairKelasPetugas, setAutoPairKelasPetugas] = useState(true);

  // Sorted Wali Items
  const sortedWaliItems = useMemo(() => {
    const list = [...formattedWaliItems];
    if (sortOrder === 'TINGKAT_ASC') {
      list.sort((a, b) => a.tingkat - b.tingkat || a.nama_kelas.localeCompare(b.nama_kelas));
    } else if (sortOrder === 'TINGKAT_DESC') {
      list.sort((a, b) => b.tingkat - a.tingkat || a.nama_kelas.localeCompare(b.nama_kelas));
    } else if (sortOrder === 'KELAS_ALPHA') {
      list.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));
    }
    return list;
  }, [formattedWaliItems, sortOrder]);

  const handleToggleAllWali = () => {
    if (selectedWaliIds.length === formattedWaliItems.length) {
      setSelectedWaliIds([]);
    } else {
      setSelectedWaliIds(formattedWaliItems.map((w) => w.id));
    }
  };

  const handleToggleWali = (id: string) => {
    setSelectedWaliIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // State Mode Manual
  const [selectedGuruIds, setSelectedGuruIds] = useState<string[]>(guruList.map((g) => g.id));
  const [enableKelasRotation, setEnableKelasRotation] = useState(true);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>(classList.map((c) => c.id));

  const handleToggleAllGuru = () => {
    if (selectedGuruIds.length === guruList.length) {
      setSelectedGuruIds([]);
    } else {
      setSelectedGuruIds(guruList.map((g) => g.id));
    }
  };

  const handleToggleGuru = (id: string) => {
    setSelectedGuruIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllKelas = () => {
    if (selectedKelasIds.length === classList.length) {
      setSelectedKelasIds([]);
    } else {
      setSelectedKelasIds(classList.map((c) => c.id));
    }
  };

  const handleToggleKelas = (id: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (sourceMode === 'WALIKELAS') {
        const activeSelected = sortedWaliItems.filter((w) => selectedWaliIds.includes(w.id));
        if (activeSelected.length === 0) return;

        const pairs = activeSelected.map((item) => ({
          guru_id: item.guru_id,
          kelas_id: autoPairKelasPetugas ? item.kelas_id : null,
        }));

        await onSubmit({
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId || null,
          tanggal_mulai: tanggalMulai || undefined,
          tanggal_selesai: tanggalSelesai || undefined,
          rotasi_pairs: pairs,
        });
      } else {
        if (selectedGuruIds.length === 0) return;

        await onSubmit({
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId || null,
          tanggal_mulai: tanggalMulai || undefined,
          tanggal_selesai: tanggalSelesai || undefined,
          guru_ids: selectedGuruIds,
          kelas_ids: enableKelasRotation ? selectedKelasIds : undefined,
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Generate Giliran Pembina Upacara 1 Semester"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Penjelasan */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <p className="font-bold">Generator Cerdas Rotasi Upacara Bendera</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Sistem akan memindai seluruh hari <strong>Senin</strong> dalam rentang semester ini, lalu mendistribusikan giliran pembina upacara dan petugas upacara secara berurutan.
              {academicContextLabel && (
                <span className="block mt-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  📍 Konteks Akademik: {academicContextLabel}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Tab Pilihan Sumber Pembina */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setSourceMode('WALIKELAS')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sourceMode === 'WALIKELAS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Rotasi Wali Kelas (Standar Sekolah)</span>
            {hasWaliKelasData && (
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full font-bold">
                {formattedWaliItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('MANUAL')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sourceMode === 'MANUAL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pilih Manual Guru & Kelas</span>
          </button>
        </div>

        {/* Rentang Tanggal Opsional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Tanggal Mulai (Opsional)
            </label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Kosongkan untuk otomatis dari awal semester</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Tanggal Selesai (Opsional)
            </label>
            <input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Kosongkan untuk 1 semester (~5 bulan)</span>
          </div>
        </div>

        {/* KONTEN MODE: ROTASI WALI KELAS */}
        {sourceMode === 'WALIKELAS' && (
          <div className="space-y-3">
            {/* Toolbar Pengurutan & Opsi */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Urutan Giliran:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="TINGKAT_ASC">Tingkat X ➔ XII (Mulai Kelas Awal)</option>
                  <option value="TINGKAT_DESC">Tingkat XII ➔ X (Mulai Kelas Akhir)</option>
                  <option value="KELAS_ALPHA">Abjad Nama Kelas (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleAllWali}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  {selectedWaliIds.length === formattedWaliItems.length
                    ? 'Batal Pilih Semua'
                    : 'Pilih Semua'}
                </button>
              </div>
            </div>

            {/* Toggle Otomatis Pasangkan Kelas Binaan Sebagai Petugas */}
            <label className="flex items-center gap-2 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPairKelasPetugas}
                onChange={(e) => setAutoPairKelasPetugas(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Otomatis Pasangkan Kelas Binaan sebagai Petugas Upacara
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Setiap hari Senin, siswa di kelas binaan wali kelas tersebut bertugas sebagai pengibar bendera, MC, & paduan suara.
                </p>
              </div>
            </label>

            {/* List Wali Kelas Terpilih */}
            {sortedWaliItems.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada data penugasan Wali Kelas pada konteks akademik saat ini. Silakan tentukan wali kelas di modul Kurikulum atau gunakan mode manual.
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                  Urutan giliran upacara ({selectedWaliIds.length} dari {sortedWaliItems.length} wali kelas aktif terpilih):
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                  {sortedWaliItems.map((item, idx) => {
                    const isSelected = selectedWaliIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleWali(item.id)}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs border transition cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100'
                            : 'border-transparent text-slate-400 opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className="w-5 text-[11px] font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-slate-800 dark:text-slate-100">
                              {item.nama_guru}
                            </p>
                            {item.nip && (
                              <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>
                            )}
                          </div>
                        </div>

                        {/* Indikator Pasangan Kelas */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            Wali Kelas:
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded font-bold text-[11px]">
                            {item.nama_kelas}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* KONTEN MODE: MANUAL GURU & KELAS */}
        {sourceMode === 'MANUAL' && (
          <div className="space-y-3">
            {/* Pilihan Guru yang Digilir */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Daftar Guru Pembina Yang Digilir ({selectedGuruIds.length} dari {guruList.length} guru) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleToggleAllGuru}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  {selectedGuruIds.length === guruList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {guruList.map((g) => {
                  const isSelected = selectedGuruIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleGuru(g.id)}
                      className={`p-2 rounded-lg text-left text-xs flex items-center gap-2 border transition ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 font-semibold'
                          : 'border-transparent text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className="truncate">{g.nama_guru}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rotasi Kelas Petugas Upacara */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableKelasRotation}
                    onChange={(e) => setEnableKelasRotation(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Sertakan Rotasi Rombel Petugas Upacara (Pengibar/MC/Padus)
                </label>
                {enableKelasRotation && (
                  <button
                    type="button"
                    onClick={handleToggleAllKelas}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {selectedKelasIds.length === classList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {enableKelasRotation && (
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {classList.map((c) => {
                    const isSelected = selectedKelasIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleKelas(c.id)}
                        className={`p-1.5 rounded-lg text-left text-xs flex items-center gap-2 border transition ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 font-semibold'
                            : 'border-transparent text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="truncate">{c.nama_kelas}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              loading ||
              (sourceMode === 'WALIKELAS' && selectedWaliIds.length === 0) ||
              (sourceMode === 'MANUAL' && selectedGuruIds.length === 0)
            }
            className="rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Mengenerate...' : 'Mulai Generate Jadwal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
