import React from 'react';
import { Sparkles, Download, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../../ui/Card';
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

const ABSENSI_FIELDS: Array<{ field: 'sakit' | 'izin' | 'alpa'; label: string }> = [
  { field: 'sakit', label: 'Sakit (Hari)' },
  { field: 'izin', label: 'Izin (Hari)' },
  { field: 'alpa', label: 'Alpa (Hari)' },
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
    toast.info('Rekap presensi harian 1 semester berhasil diterjemahkan ke form Rapor');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-summary"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl rounded-2xl border-none">
        <div className="w-full max-w-full min-w-0">
          <h3
            id="modal-title-summary"
            className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight"
          >
            Absensi & Catatan Wali Kelas
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Siswa: {selectedStudent.nama_siswa}
          </p>
        </div>

        <form
          id="form-summary"
          onSubmit={onSubmit}
          className="space-y-4 w-full max-w-full min-w-0"
          noValidate
        >
          {/* Referensi Presensi System Info Box */}
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Referensi Presensi Harian 1 Semester
              </span>
              <button
                type="button"
                onClick={handleTarikRekap}
                className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg shadow-xs flex items-center gap-1 transition-all"
                title="Tarik angka presensi harian 1 semester ke form Rapor"
              >
                <Download size={11} />
                Tarik Rekap Kehadiran
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Sakit: <strong className="text-amber-600 font-black">{finalRef.sakit}</strong> hari</span>
              <span>•</span>
              <span>Izin: <strong className="text-blue-600 font-black">{finalRef.izin}</strong> hari</span>
              <span>•</span>
              <span>Alpa: <strong className="text-rose-600 font-black">{finalRef.alpa}</strong> hari</span>
            </div>
          </div>

          {/* Form Presensi */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-full min-w-0">
            {(ABSENSI_FIELDS ?? []).map(({ field, label }) => (
              <div key={field} className="space-y-1 w-full max-w-full min-w-0">
                <label
                  htmlFor={`input-summary-${field}`}
                  className="text-[10px] font-bold text-slate-500 uppercase block truncate"
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
                  className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-slate-800 dark:text-white px-3 py-2 text-sm text-center focus:ring-1 focus:ring-indigo-500"
                />
                {formErrors[field] && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
                    <AlertCircle size={10} /> {formErrors[field]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Form Catatan Wali Kelas */}
          <div className="space-y-1 w-full max-w-full min-w-0">
            <label
              htmlFor="input-summary-catatan"
              className="text-[10px] font-bold text-slate-500 uppercase block"
            >
              Catatan Wali Kelas / Rekomendasi
            </label>
            <textarea
              id="input-summary-catatan"
              rows={3}
              maxLength={500}
              placeholder="Contoh: Pertahankan prestasi akademik Anda..."
              value={summaryForm.catatan_wali ?? ''}
              onChange={(e) => onFormChange('catatan_wali', e.target.value)}
              className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold text-slate-800 dark:text-white p-3 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            {formErrors.catatan_wali && (
              <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle size={10} /> {formErrors.catatan_wali}
              </p>
            )}
          </div>

          {/* Form Kokurikuler & Pembiasaan Pagi (Hormat pada saklar tampilkanKokurikuler) */}
          {tampilkanKokurikuler && (
            <div className="space-y-1.5 w-full max-w-full min-w-0 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="input-summary-kokurikuler"
                  className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block"
                >
                  Evaluasi Kokurikuler & Pembiasaan Pagi (Karakter)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onFormChange(
                      'catatan_kokurikuler',
                      'Peserta didik secara konsisten mengikuti Pembiasaan Pagi dengan disiplin (Mandiri), aktif menjaga ketertiban dan bekerja sama dengan teman (Gotong Royong), serta menunjukkan sikap hormat, sopan, dan peduli terhadap lingkungan sekolah (Beriman dan Bertakwa serta Berakhlak Mulia, Berkebinekaan Global).'
                    )
                  }
                  className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Gunakan narasi pembiasaan pagi standar"
                >
                  <Sparkles size={10} />
                  Gunakan Template Default
                </button>
              </div>
              <textarea
                id="input-summary-kokurikuler"
                rows={3}
                maxLength={1000}
                placeholder="Contoh: Peserta didik secara konsisten mengikuti Pembiasaan Pagi dengan disiplin (Mandiri)..."
                value={summaryForm.catatan_kokurikuler ?? ''}
                onChange={(e) => onFormChange('catatan_kokurikuler', e.target.value)}
                className="w-full max-w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white p-2.5 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Muncul pada Bagian II. Kokurikuler (Halaman 2 Rapor)</span>
                <span>{(summaryForm.catatan_kokurikuler || '').length}/1000</span>
              </div>
              {formErrors.catatan_kokurikuler && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                  <AlertCircle size={10} /> {formErrors.catatan_kokurikuler}
                </p>
              )}
            </div>
          )}

          {/* Form Keputusan Kenaikan / Transisi */}
          <div className="space-y-1 w-full max-w-full min-w-0">
            <label
              htmlFor="input-summary-keputusan"
              className="text-[10px] font-bold text-slate-500 uppercase block"
            >
              Keputusan Akhir Semester / Transisi Kenaikan
            </label>
            <input
              id="input-summary-keputusan"
              type="text"
              maxLength={200}
              placeholder="Contoh: Naik ke Kelas XI TJKT 1"
              value={summaryForm.keputusan_transisi ?? ''}
              onChange={(e) => onFormChange('keputusan_transisi', e.target.value)}
              className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold text-slate-800 dark:text-white px-3 py-2.5 focus:ring-1 focus:ring-indigo-500"
            />
            {formErrors.keputusan_transisi && (
              <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle size={10} /> {formErrors.keputusan_transisi}
              </p>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-slate-600 font-bold text-xs"
            >
              BATAL
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
              SIMPAN PERUBAHAN
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});
