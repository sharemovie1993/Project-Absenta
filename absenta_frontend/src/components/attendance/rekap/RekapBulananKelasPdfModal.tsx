import React from 'react';
import { Button } from '../../ui';
import { FileText, Printer, X } from 'lucide-react';

interface RekapBulananKelasPdfModalProps {
  pdfPreviewUrl: string;
  pdfFilename: string;
  onClose: () => void;
}

export function RekapBulananKelasPdfModal({
  pdfPreviewUrl,
  pdfFilename,
  onClose,
}: RekapBulananKelasPdfModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfPreviewUrl;
    link.download = pdfFilename;
    link.click();
  };

  const handleOpenTab = () => window.open(pdfPreviewUrl, '_blank');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Preview Laporan Presensi PDF
              </h3>
              <p className="text-[10px] font-bold text-slate-400 font-mono">{pdfFilename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              size="sm"
              className="rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white h-9 px-4 shadow-md hover:bg-rose-700"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Unduh PDF
            </Button>
            <Button
              onClick={handleOpenTab}
              variant="outline"
              size="sm"
              className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 px-4 border-slate-200 dark:border-slate-800"
            >
              Buka Tab Baru ↗
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="rounded-xl h-9 w-9 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 bg-slate-100 dark:bg-slate-950 min-h-[65vh]">
          <iframe
            src={pdfPreviewUrl}
            title="Preview PDF"
            className="w-full h-full min-h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner"
          />
        </div>
      </div>
    </div>
  );
}
