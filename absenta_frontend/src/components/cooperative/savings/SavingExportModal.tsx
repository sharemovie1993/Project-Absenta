import React from 'react';
import { FileSpreadsheet, Printer, X } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

interface SavingExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportStartDate: string;
  setExportStartDate: (val: string) => void;
  exportEndDate: string;
  setExportEndDate: (val: string) => void;
  exportLoading: boolean;
  onExport: (format: 'EXCEL' | 'PDF') => void;
}

export const SavingExportModal: React.FC<SavingExportModalProps> = React.memo(({
  isOpen,
  onClose,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
  exportLoading,
  onExport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative mx-4 transform transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Rekap Mutasi Kas Koperasi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Silakan pilih rentang tanggal transaksi simpanan yang ingin diekspor untuk laporan mutasi kas harian atau rekonsiliasi.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="modal-export-start-date" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Tanggal Mulai
              </label>
              <div className="relative">
                <Input
                  id="modal-export-start-date"
                  name="exportStartDate"
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="h-10 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-export-end-date" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Tanggal Selesai
              </label>
              <div className="relative">
                <Input
                  id="modal-export-end-date"
                  name="exportEndDate"
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="h-10 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Batal
          </button>
          
          <Button
            type="button"
            isLoading={exportLoading}
            onClick={() => onExport('EXCEL')}
            variant="outline"
            className="py-2 px-3 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 dark:border-indigo-900/50 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> Ekspor Excel
          </Button>

          <Button
            type="button"
            isLoading={exportLoading}
            onClick={() => onExport('PDF')}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
          >
            <Printer size={14} /> Cetak PDF
          </Button>
        </div>
      </div>
    </div>
  );
});

SavingExportModal.displayName = 'SavingExportModal';
