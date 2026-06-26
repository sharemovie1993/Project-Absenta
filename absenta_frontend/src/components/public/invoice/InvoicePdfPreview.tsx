import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InvoicePdfPreviewProps {
  isGeneratingPdf: boolean;
  pdfIframeError: string | null;
  pdfIframeUrl: string | null;
}

export const InvoicePdfPreview: React.FC<InvoicePdfPreviewProps> = ({
  isGeneratingPdf,
  pdfIframeError,
  pdfIframeUrl
}) => {
  return (
    <div className="relative group no-watch">
      <div className="absolute -inset-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl blur opacity-25" />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl shadow-blue-500/5 border border-slate-100 dark:border-slate-800 overflow-hidden h-[800px] flex items-center justify-center">
        {isGeneratingPdf ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Menyiapkan Dokumen</h4>
            <p className="text-xs text-slate-500 max-w-[250px] mx-auto">Sistem sedang melakukan rendering PDF secara real-time. Mohon tunggu sebentar...</p>
          </div>
        ) : pdfIframeError ? (
          <div className="flex flex-col items-center justify-center p-10 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50 mx-auto" />
            <p className="text-xs font-bold uppercase tracking-widest">{pdfIframeError}</p>
          </div>
        ) : pdfIframeUrl ? (
          <div className="w-full h-full relative">
            <iframe src={pdfIframeUrl} className="w-full h-full border-0 absolute inset-0 z-0" title="Official Invoice Preview" />
            <div className="absolute inset-0 pointer-events-none border-[12px] border-white dark:border-slate-900 rounded-xl z-10" />
          </div>
        ) : (
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Preview Tidak Tersedia</div>
        )}
      </div>
    </div>
  );
};
