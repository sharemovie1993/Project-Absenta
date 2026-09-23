import React from 'react';
import { Sliders, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui';

export interface PklSkemaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canEditScheme: boolean;
  selectedTp: string;
  formMode: 'DUDI_ONLY' | 'COMPOSITE';
  setFormMode: (mode: 'DUDI_ONLY' | 'COMPOSITE') => void;
  formWeightDudi: number;
  setFormWeightDudi: (val: number) => void;
  formWeightLaporan: number;
  setFormWeightLaporan: (val: number) => void;
  formWeightSidang: number;
  setFormWeightSidang: (val: number) => void;
  onSave: (payload: {
    assessmentMode: 'DUDI_ONLY' | 'COMPOSITE';
    weightDudi: number;
    weightLaporan: number;
    weightSidang: number;
    tahun_pelajaran_id?: string;
  }) => void;
  isSaving: boolean;
  onNavigateToSettings: () => void;
}

export const PklSkemaSettingsModal: React.FC<PklSkemaSettingsModalProps> = ({
  isOpen,
  onClose,
  canEditScheme,
  selectedTp,
  formMode,
  setFormMode,
  formWeightDudi,
  setFormWeightDudi,
  formWeightLaporan,
  setFormWeightLaporan,
  formWeightSidang,
  setFormWeightSidang,
  onSave,
  isSaving,
  onNavigateToSettings,
}) => {
  if (!isOpen) return null;

  const totalBobot = formWeightDudi + formWeightLaporan + formWeightSidang;
  const isWeightValid = totalBobot === 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Skema & Bobot Penilaian PKL</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {!canEditScheme && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Mode Hanya-Lihat (Transparansi Guru Pembimbing)</p>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  Skema dan persentase bobot penilaian PKL ditetapkan secara terpusat oleh <strong>Bagian Hubin / Kurikulum</strong> untuk menjamin keseragaman seluruh siswa.
                </p>
              </div>
            </div>
          )}

          {/* 1. Radio Mode Penilaian */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Mode Penilaian yang Diterapkan Sekolah:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canEditScheme}
                onClick={() => canEditScheme && setFormMode('DUDI_ONLY')}
                className={`p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                  formMode === 'DUDI_ONLY'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <span className="text-xs font-bold">Hanya Industri (DUDI)</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    formMode === 'DUDI_ONLY' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {formMode === 'DUDI_ONLY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-normal mt-1 leading-snug">
                  Nilai akhir 100% diambil dari 8 aspek kinerja yang dinilai pembimbing DUDI.
                </p>
              </button>

              <button
                type="button"
                disabled={!canEditScheme}
                onClick={() => canEditScheme && setFormMode('COMPOSITE')}
                className={`p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                  formMode === 'COMPOSITE'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚖️</span>
                    <span className="text-xs font-bold">Gabungan (DUDI + Sidang)</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    formMode === 'COMPOSITE' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {formMode === 'COMPOSITE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-normal mt-1 leading-snug">
                  Kompilasi nilai industri dengan nilai laporan dan sidang seminar di sekolah.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Weight Inputs if COMPOSITE */}
          {formMode === 'COMPOSITE' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {canEditScheme ? 'Atur Persentase Bobot (%):' : 'Rincian Persentase Bobot (%):'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isWeightValid
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                }`}>
                  Total: {totalBobot}% {isWeightValid ? '✓' : '(Harus 100%)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="input-bobot-dudi" className="block text-[10px] font-bold text-slate-500 mb-1">
                    Industri (DUDI)
                  </label>
                  <div className="relative">
                    <input
                      id="input-bobot-dudi"
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEditScheme}
                      value={formWeightDudi}
                      onChange={(e) => setFormWeightDudi(Number(e.target.value) || 0)}
                      className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="input-bobot-laporan" className="block text-[10px] font-bold text-slate-500 mb-1">
                    Laporan
                  </label>
                  <div className="relative">
                    <input
                      id="input-bobot-laporan"
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEditScheme}
                      value={formWeightLaporan}
                      onChange={(e) => setFormWeightLaporan(Number(e.target.value) || 0)}
                      className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="input-bobot-sidang" className="block text-[10px] font-bold text-slate-500 mb-1">
                    Sidang Presentasi
                  </label>
                  <div className="relative">
                    <input
                      id="input-bobot-sidang"
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEditScheme}
                      value={formWeightSidang}
                      onChange={(e) => setFormWeightSidang(Number(e.target.value) || 0)}
                      className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 leading-snug flex items-start gap-1.5">
                <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                <span>
                  <strong>Smart Fallback Aktif:</strong> Jika ada siswa yang belum melaksanakan sidang, sistem otomatis menggunakan nilai DUDI secara proporsional agar nilai rapor tidak rusak/kosong.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onNavigateToSettings}
            className="rounded-xl text-xs font-bold px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5"
          >
            <Settings size={14} />
            Pusat Pengaturan & Referensi Hubin
          </Button>

          <div className="flex items-center gap-2">
            {canEditScheme ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl text-xs font-bold px-4 py-2"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isSaving || (formMode === 'COMPOSITE' && !isWeightValid)}
                  onClick={() => {
                    onSave({
                      assessmentMode: formMode,
                      weightDudi: formWeightDudi,
                      weightLaporan: formWeightLaporan,
                      weightSidang: formWeightSidang,
                      tahun_pelajaran_id: selectedTp || undefined,
                    });
                  }}
                  className="rounded-xl text-xs font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSaving ? 'Menyimpan...' : 'Terapkan Skema'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-xs font-bold px-4 py-2"
              >
                Tutup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PklSkemaSettingsModal;
