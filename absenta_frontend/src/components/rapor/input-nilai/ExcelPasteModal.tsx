import React, { memo } from 'react';
import { ClipboardPaste, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ExcelPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  onRawTextChange: (text: string) => void;
  onProcessPaste: () => void;
}

export const ExcelPasteModal: React.FC<ExcelPasteModalProps> = memo(({
  isOpen,
  onClose,
  rawText,
  onRawTextChange,
  onProcessPaste,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data dari Excel / Google Sheets</h3>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog paste Excel"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Copy kolom dari Excel dalam urutan tab berikut: <br />
            <strong className="text-indigo-600 dark:text-indigo-400">NIS (atau Nama) | Sumatif 1 | Sumatif 2 | Sumatif 3 | Sumatif Akhir | CP Narasi</strong>
          </p>

          <label htmlFor="paste-raw-textarea" className="sr-only">Teks Paste Excel</label>
          <textarea
            id="paste-raw-textarea"
            aria-label="Teks Paste dari Excel"
            rows={8}
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder={`Contoh (Paste dari Excel):\n2526100414\t82\t81\t\t80\tMemahami ayat Al-Qur'an...\n2526100415\t78\t77\t\t75\tCukup mampu memahami...`}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            aria-label="Batal paste Excel"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            aria-label="Proses dan pasang data paste ke tabel"
            onClick={onProcessPaste}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            PROSES & PASANG KE TABEL
          </Button>
        </div>
      </div>
    </div>
  );
});

ExcelPasteModal.displayName = 'ExcelPasteModal';
