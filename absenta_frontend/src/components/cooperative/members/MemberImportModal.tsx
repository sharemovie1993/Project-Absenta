import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../ui';
import { Modal } from '../ui/Modal';

interface ImportError {
  row: number;
  memberNo: string;
  error: string;
}

interface ImportResults {
  successCount: number;
  failCount: number;
  errors: ImportError[];
}

interface MemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDownloadTemplate: () => void;
  importLoading: boolean;
  importResults: ImportResults | null;
}

export const MemberImportModal: React.FC<MemberImportModalProps> = ({
  isOpen,
  onClose,
  onFileChange,
  onSubmit,
  onDownloadTemplate,
  importLoading,
  importResults
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impor Anggota Koperasi via Excel"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Unggah file Excel (.xlsx / .xls) untuk mendaftarkan banyak anggota koperasi sekaligus. Sistem akan otomatis mencocokkan nomor identitas siswa (NIS) atau guru (NIP) dengan data induk akademik sekolah.
          </p>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onDownloadTemplate}
            className="h-8 text-[11px] font-bold rounded-lg"
          >
            <Download size={12} className="mr-1.5 text-indigo-500" />
            Unduh Template Excel
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="excel-file" className="block text-xs font-bold text-slate-700 dark:text-slate-350">
              Pilih File Excel
            </label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950 focus:outline-none"
              required
            />
          </div>

          {importResults && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex gap-4 font-bold">
                <span className="text-emerald-600">Sukses: {importResults.successCount}</span>
                <span className="text-rose-600">Gagal: {importResults.failCount}</span>
              </div>
              
              {importResults.errors.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  <p className="font-bold text-[10px] text-rose-500 uppercase tracking-wider">Detail Kegagalan:</p>
                  {importResults.errors.map((err, idx) => (
                    <div key={idx} className="p-2 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-lg text-[10px]">
                      Baris {err.row} (No: {err.memberNo}): <span className="font-bold text-rose-700 dark:text-rose-400">{err.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={importLoading}
              className="h-9 text-xs rounded-xl"
            >
              Mulai Impor
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
