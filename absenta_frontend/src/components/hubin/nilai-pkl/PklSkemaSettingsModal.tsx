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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              Skema &amp; Bobot Penilaian PKL
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold shrink-0 cursor-pointer"
            title="Tutup Modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 overscroll-contain">
          {!canEditScheme && (
            <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px] sm:text-xs">Mode Hanya-Lihat (Transparansi Guru Pembimbing)</p>
                <p className="text-[10px] sm:text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
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
                className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                  formMode === 'DUDI_ONLY'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base">🏢</span>
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
                className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                  formMode === 'COMPOSITE'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base">⚖️</span>
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
            <div className="space-y-3 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {canEditScheme ? 'Atur Bobot (%):' : 'Rincian Bobot (%):'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isWeightValid
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                }`}>
                  Total: {totalBobot}% {isWeightValid ? '✓' : '(Wajib 100%)'}
                </span>
              </div>

              {/* Tiga kolom berdampingan di mobile & desktop (hemat ruang vertikal 60%) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label htmlFor="input-bobot-dudi" className="block text-[10px] font-bold text-slate-500 mb-1 truncate">
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
                      className={`w-full h-8 sm:h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-4 sm:pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-1.5 sm:right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="input-bobot-laporan" className="block text-[10px] font-bold text-slate-500 mb-1 truncate">
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
                      className={`w-full h-8 sm:h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-4 sm:pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-1.5 sm:right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="input-bobot-sidang" className="block text-[10px] font-bold text-slate-500 mb-1 truncate">
                    Sidang/Seminar
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
                      className={`w-full h-8 sm:h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-4 sm:pr-5 ${
                        !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                      }`}
                    />
                    <span className="absolute right-1.5 sm:right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-[10px] sm:text-[11px] text-blue-700 dark:text-blue-300 leading-snug flex items-start gap-1.5">
                <Info size={13} className="shrink-0 mt-0.5 text-blue-500" />
                <span>
                  <strong>Smart Fallback:</strong> Siswa yang belum sidang otomatis menggunakan nilai DUDI secara proporsional.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/80 dark:bg-slate-900/90">
          <Button
            type="button"
            variant="ghost"
            onClick={onNavigateToSettings}
            className="rounded-xl text-xs font-bold px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center sm:justify-start gap-1.5 h-9"
          >
            <Settings size={14} />
            <span>Pengaturan &amp; Referensi</span>
          </Button>

          <div className="flex items-center gap-2">
            {canEditScheme ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 sm:flex-none rounded-xl text-xs font-bold px-4 py-2 h-9"
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
                  className="flex-1 sm:flex-none rounded-xl text-xs font-bold px-4 py-2 h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSaving ? 'Menyimpan...' : 'Terapkan Skema'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl text-xs font-bold px-6 py-2 h-9 border-slate-300 dark:border-slate-700"
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
