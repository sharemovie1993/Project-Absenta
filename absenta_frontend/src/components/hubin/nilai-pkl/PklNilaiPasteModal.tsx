import React, { useState } from 'react';
import { ClipboardPaste, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

export interface PklNilaiPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessPaste: (rawText: string) => void;
}

export const PklNilaiPasteModal: React.FC<PklNilaiPasteModalProps> = ({
  isOpen,
  onClose,
  onProcessPaste,
}) => {
  const [pasteRawText, setPasteRawText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data Nilai PKL dari Excel</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed">
            Salin kolom dari Excel dengan urutan format: <br />
            <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
              NIS [TAB] Teknis [TAB] K3LH [TAB] Bisnis [TAB] Disiplin [TAB] Inisiatif [TAB] Kerjasama [TAB] Jujur [TAB] TanggungJwb [TAB] Catatan
            </strong>
          </p>

          <textarea
            id="paste-excel-text"
            aria-label="Area paste data dari Excel"
            rows={8}
            value={pasteRawText}
            onChange={(e) => setPasteRawText(e.target.value)}
            placeholder="2324100289&#9;90&#9;90&#9;85&#9;90&#9;90&#9;90&#9;90&#9;90&#9;Sangat disiplin"
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold">Batal</Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={() => {
              onProcessPaste(pasteRawText);
              onClose();
            }} 
            className="rounded-xl text-xs font-bold"
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Pasang ke Tabel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PklNilaiPasteModal;
