import React from 'react';
import { Sparkles, Loader2, AlertCircle, X, Download } from 'lucide-react';
import { Button } from '../../ui/Button';
import { toast } from 'sonner';
import { LegerStudent, SummaryFormData } from '../../../types/cetakRapor.types';

interface RaporSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  rekapSiswaData?: unknown;
  summaryForm: SummaryFormData;
  formErrors: Partial<Record<keyof SummaryFormData, string>>;
  onFormChange: (field: keyof SummaryFormData, val: string | number) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  tampilkanKokurikuler?: boolean;
}

const ABSENSI_FIELDS: Array<{ field: 'sakit' | 'izin' | 'alpa'; label: string; badgeColor: string }> = [
  { field: 'sakit', label: 'Sakit', badgeColor: 'text-amber-600 dark:text-amber-400' },
  { field: 'izin', label: 'Izin', badgeColor: 'text-blue-600 dark:text-blue-400' },
  { field: 'alpa', label: 'Alpa', badgeColor: 'text-rose-600 dark:text-rose-400' },
];

export const RaporSummaryModal: React.FC<RaporSummaryModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  rekapSiswaData,
  summaryForm,
  formErrors,
  onFormChange,
  onSubmit,
  isSaving,
  tampilkanKokurikuler = true,
}) => {
  if (!isOpen || !selectedStudent) return null;

  const rawRef = selectedStudent.referensi_absensi_harian || { sakit: 0, izin: 0, alpa: 0 };
  const statRef = (rekapSiswaData as { data?: { statistik?: Record<string, number> }; statistik?: Record<string, number> })?.data?.statistik
    || (rekapSiswaData as { statistik?: Record<string, number> })?.statistik;

  const finalRef = {
    sakit: rawRef.sakit || statRef?.SAKIT || statRef?.sakit || 0,
    izin: rawRef.izin || statRef?.IZIN || statRef?.izin || 0,
    alpa: rawRef.alpa || statRef?.ALPA || statRef?.alpa || 0,
  };

  const handleTarikRekap = () => {
    onFormChange('sakit', finalRef.sakit || 0);
    onFormChange('izin', finalRef.izin || 0);
    onFormChange('alpa', finalRef.alpa || 0);
    toast.info('Rekap presensi berhasil diisikan ke form');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-summary"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200/80 dark:border-slate-800">
        
        {/* Modal Header (Sticky) */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="min-w-0 pr-3">
            <h3
              id="modal-title-summary"
              className="text-base font-bold text-slate-900 dark:text-white truncate"
            >
              Catatan Wali Kelas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Siswa: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudent.nama_siswa}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable with mobile overscroll-contain) */}
        <form
          id="form-summary"
          onSubmit={onSubmit}
          className="flex flex-col flex-1 min-h-0"
          noValidate
        >
          <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
            
            {/* Presensi Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kehadiran (Hari)
                </label>
                <button
                  type="button"
                  onClick={handleTarikRekap}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Isi otomatis dengan data rekap presensi semester"
                >
                  <Download size={12} className="shrink-0" />
                  <span>Ambil Rekap: S:{finalRef.sakit} I:{finalRef.izin} A:{finalRef.alpa}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {(ABSENSI_FIELDS ?? []).map(({ field, label, badgeColor }) => (
                  <div key={field} className="space-y-1">
                    <label
                      htmlFor={`input-summary-${field}`}
                      className={`text-[11px] font-bold block text-center ${badgeColor}`}
                    >
                      {label}
                    </label>
                    <input
                      id={`input-summary-${field}`}
                      type="number"
                      min={0}
                      max={365}
                      value={summaryForm[field] ?? 0}
                      onChange={(e) => onFormChange(field, parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white px-3 py-2 text-sm text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                    {formErrors[field] && (
                      <p className="text-[10px] text-rose-500 font-semibold text-center flex items-center justify-center gap-1">
                        <AlertCircle size={10} /> {formErrors[field]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan Wali Kelas */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-summary-catatan"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 block"
              >
                Catatan Wali Kelas
              </label>
              <textarea
                id="input-summary-catatan"
                rows={3}
                maxLength={500}
                placeholder="Tulis catatan perkembangan atau motivasi siswa..."
                value={summaryForm.catatan_wali ?? ''}
                onChange={(e) => onFormChange('catatan_wali', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
              />
              {formErrors.catatan_wali && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle size={10} /> {formErrors.catatan_wali}
                </p>
              )}
            </div>

            {/* Kokurikuler & Pembiasaan Pagi (Karakter) */}
            {tampilkanKokurikuler && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="input-summary-kokurikuler"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 block"
                  >
                    Catatan Kokurikuler
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange(
                        'catatan_kokurikuler',
                        'Peserta didik secara konsisten mengikuti Pembiasaan Pagi dengan disiplin (Mandiri), aktif menjaga ketertiban dan bekerja sama dengan teman (Gotong Royong), serta menunjukkan sikap hormat, sopan, dan peduli terhadap lingkungan sekolah.'
                      )
                    }
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Gunakan narasi bawaan"
                  >
                    <Sparkles size={11} className="text-amber-500" />
                    <span>Gunakan Narasi Bawaan</span>
                  </button>
                </div>
                <textarea
                  id="input-summary-kokurikuler"
                  rows={3}
                  maxLength={1000}
                  placeholder="Tulis evaluasi pembiasaan karakter atau projek kokurikuler..."
                  value={summaryForm.catatan_kokurikuler ?? ''}
                  onChange={(e) => onFormChange('catatan_kokurikuler', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                />
                <div className="flex items-center justify-end text-[10px] text-slate-400 font-mono">
                  {(summaryForm.catatan_kokurikuler || '').length}/1000
                </div>
                {formErrors.catatan_kokurikuler && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                    <AlertCircle size={10} /> {formErrors.catatan_kokurikuler}
                  </p>
                )}
              </div>
            )}

            {/* Keputusan Kenaikan / Transisi */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-summary-keputusan"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 block"
              >
                Keputusan Kenaikan / Kelulusan
              </label>
              <input
                id="input-summary-keputusan"
                type="text"
                maxLength={200}
                placeholder="Contoh: Naik ke Kelas XI TJKT 1"
                value={summaryForm.keputusan_transisi ?? ''}
                onChange={(e) => onFormChange('keputusan_transisi', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
              {formErrors.keputusan_transisi && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle size={10} /> {formErrors.keputusan_transisi}
                </p>
              )}
            </div>

          </div>

          {/* Modal Footer (Sticky) */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs px-5 py-2 shadow-sm transition-all flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
});
