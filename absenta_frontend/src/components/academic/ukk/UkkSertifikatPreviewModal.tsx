import React, { useState } from 'react';
import { Award, Download, ExternalLink, Printer, X, Loader } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { raporApi } from '@/api/rapor.api';

export interface UkkSertifikatPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
}

export const UkkSertifikatPreviewModal: React.FC<UkkSertifikatPreviewModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  namaSiswa = 'Siswa',
  nomorSertifikat,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen || !siswaId) return null;

  const pdfUrl = raporApi.getPdfUkkUrl(siswaId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[96vw] max-w-[1280px] max-h-[92vh] flex flex-col overflow-hidden"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pratinjau Sertifikat UKK
                </h3>
                {nomorSertifikat && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {nomorSertifikat}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sertifikat Kompetensi Keahlian SMK • {namaSiswa}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="text-xs font-semibold rounded-xl cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              Buka Tab Baru
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `Sertifikat_UKK_${namaSiswa.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative w-full h-[calc(92vh-120px)] bg-slate-100 dark:bg-slate-950 p-2">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-slate-900/80 z-10 backdrop-blur-xs">
            <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Memuat dokumen sertifikat UKK...
            </p>
          </div>
        )}
        <iframe
          src={pdfUrl}
          title={`Sertifikat UKK ${namaSiswa}`}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
        />
      </div>
    </Modal>
  );
};
