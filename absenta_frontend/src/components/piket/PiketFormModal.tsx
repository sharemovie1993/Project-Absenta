import React from 'react';
import { Modal } from '../ui/Modal';
import { SimpleFormField } from '../ui/SimpleFormField';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';
import { User, X, Printer, FileText } from 'lucide-react';
import type { PiketPersonaMode } from '../../utils/piketStatusHelper';

export interface PiketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null) => void;
  tipeIzin: string;
  onTipeIzinChange: (tipe: string) => void;
  alasan: string;
  onAlasanChange: (alasan: string) => void;
  quickReasons: string[];
  onSubmit: (e: React.FormEvent) => void;
  savingPermit: boolean;
  enablePrint: boolean;
  onEnablePrintChange: (enable: boolean) => void;
  personaMode: PiketPersonaMode;
  accentColor: string;
}

export const PiketFormModal: React.FC<PiketFormModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  onSelectStudent,
  tipeIzin,
  onTipeIzinChange,
  alasan,
  onAlasanChange,
  quickReasons,
  onSubmit,
  savingPermit,
  enablePrint,
  onEnablePrintChange,
  personaMode,
  accentColor
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={personaMode === 'JURUSAN' ? 'Form Rujukan Izin Jurusan' : 'Form Surat Izin Keluar Siswa'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 py-1">
        {/* Student Picker */}
        {!selectedStudent ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <SmartStudentPicker
              onSelect={(s) => onSelectStudent(s)}
              onSelectStudent={(s) => onSelectStudent(s)}
              autoFocus
              placeholder="Scan RFID/QR atau Ketik Nama / NIS Siswa..."
            />
          </div>
        ) : (
          /* Student Card Selected */
          (() => {
            const namaSiswa = selectedStudent.nama_siswa || selectedStudent.full_name || 'Siswa';
            const nisSiswa  = selectedStudent.nis || selectedStudent.nisn || '-';
            const kelasSiswa = selectedStudent.Kelas?.nama_kelas ||
                               (selectedStudent as any).kelas?.nama_kelas ||
                               (selectedStudent as any).nama_kelas || '-';

            return (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-base text-white shadow-sm ${
                    accentColor === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}>
                    {namaSiswa.charAt(0) || <User size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">
                      {namaSiswa}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      NIS: {nisSiswa} • Kelas: <span className={`font-black ${accentColor === 'emerald' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {kelasSiswa}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectStudent(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0 transition"
                  aria-label="Ganti Siswa Terpilih"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })()
        )}

        {/* Form Body */}
        {selectedStudent && (
          <form onSubmit={onSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SimpleFormField label="Tipe Izin" htmlFor="modal-tipe-izin" required>
                <select
                  id="modal-tipe-izin"
                  value={tipeIzin}
                  onChange={(e) => onTipeIzinChange(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500 outline-none truncate shadow-sm cursor-pointer"
                >
                  {personaMode === 'JURUSAN' ? (
                    <>
                      <option value="IZIN_JURUSAN">IZIN JURUSAN</option>
                      <option value="IZIN_KELUAR">IZIN KELUAR SEMENTARA</option>
                      <option value="PULANG_AWAL">PULANG AWAL</option>
                    </>
                  ) : (
                    <>
                      <option value="IZIN_KELUAR">IZIN KELUAR SEMENTARA</option>
                      <option value="IZIN_JURUSAN">IZIN JURUSAN</option>
                      <option value="PULANG_AWAL">PULANG AWAL</option>
                    </>
                  )}
                </select>
              </SimpleFormField>

              <SimpleFormField label="Alasan Cepat" htmlFor="modal-alasan-cepat">
                <select
                  id="modal-alasan-cepat"
                  value={quickReasons.includes(alasan) ? alasan : 'Lainnya (Ketik Manual)'}
                  onChange={(e) => {
                    if (e.target.value !== 'Lainnya (Ketik Manual)') {
                      onAlasanChange(e.target.value);
                    } else {
                      onAlasanChange('');
                    }
                  }}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500 outline-none truncate shadow-sm cursor-pointer"
                >
                  {quickReasons.map((r, i) => (
                    <option key={i} value={r} className="truncate">
                      {r}
                    </option>
                  ))}
                  <option value="Lainnya (Ketik Manual)">Lainnya (Ketik Manual)</option>
                </select>
              </SimpleFormField>
            </div>

            <SimpleFormField label="Detail Alasan / Catatan Piket" htmlFor="modal-detail-alasan" required>
              <Textarea
                id="modal-detail-alasan"
                value={alasan}
                onChange={(e) => onAlasanChange(e.target.value)}
                placeholder="Tuliskan alasan izin..."
                className="rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-indigo-100 min-h-[75px] text-xs"
                required
              />
            </SimpleFormField>

            {/* Checkbox Konfigurasi Mode Cetak */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <label htmlFor="modal-toggle-print" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="modal-toggle-print"
                  type="checkbox"
                  checked={enablePrint}
                  onChange={(e) => onEnablePrintChange(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {enablePrint ? '🖨️ Cetak Slip Fisik Otomatis' : '🚫 Simpan Tanpa Cetak Slip'}
                </span>
              </label>
            </div>

            {/* Submit Actions */}
            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-10 px-5 font-bold text-xs"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className={`rounded-xl h-10 px-6 font-black uppercase tracking-wider text-[10px] flex items-center gap-2 text-white shadow-md ${
                  accentColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
                disabled={savingPermit}
              >
                {savingPermit ? (
                  <span className="animate-pulse">Menyimpan...</span>
                ) : enablePrint ? (
                  <><Printer size={13} /> Simpan &amp; Cetak Slip</>
                ) : (
                  <><FileText size={13} /> Simpan Izin</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
});
