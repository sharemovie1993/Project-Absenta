import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { Sparkles, Calendar, CheckSquare, Square, Users, AlertCircle } from 'lucide-react';
import { AutoGenerateUpacaraPayload } from '@/api/attendance/pembinaUpacara.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AutoGenerateUpacaraPayload) => Promise<void>;
  guruList: Array<{ id: string; nama_guru: string; nip?: string | null }>;
  classList: Array<{ id: string; nama_kelas: string }>;
  tahunPelajaranId: string;
  semesterId?: string;
}

export const AutoGenerateUpacaraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  guruList,
  classList,
  tahunPelajaranId,
  semesterId,
}) => {
  const [selectedGuruIds, setSelectedGuruIds] = useState<string[]>(guruList.map(g => g.id));
  const [enableKelasRotation, setEnableKelasRotation] = useState(true);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>(classList.map(c => c.id));
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleAllGuru = () => {
    if (selectedGuruIds.length === guruList.length) {
      setSelectedGuruIds([]);
    } else {
      setSelectedGuruIds(guruList.map(g => g.id));
    }
  };

  const handleToggleGuru = (id: string) => {
    setSelectedGuruIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllKelas = () => {
    if (selectedKelasIds.length === classList.length) {
      setSelectedKelasIds([]);
    } else {
      setSelectedKelasIds(classList.map(c => c.id));
    }
  };

  const handleToggleKelas = (id: string) => {
    setSelectedKelasIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGuruIds.length === 0) return;

    setLoading(true);
    try {
      await onSubmit({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId || null,
        tanggal_mulai: tanggalMulai || undefined,
        tanggal_selesai: tanggalSelesai || undefined,
        guru_ids: selectedGuruIds,
        kelas_ids: enableKelasRotation ? selectedKelasIds : undefined,
      });
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
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <p className="font-bold">Generator Cerdas Rotasi Upacara</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              Sistem akan memindai seluruh hari <strong>Senin</strong> dalam rentang semester ini, lalu mendistribusikan guru pembina dan kelas petugas secara adil dan berurutan (Round-Robin).
            </p>
          </div>
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
          <div className="max-h-48 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || selectedGuruIds.length === 0}
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
