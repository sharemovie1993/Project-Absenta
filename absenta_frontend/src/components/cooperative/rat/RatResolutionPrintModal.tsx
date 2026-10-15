import React from 'react';
import { Modal, Button, Badge } from '../../ui';
import { Printer, Copy, Check, FileCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatResolutionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: CoopResolutionItem | null;
  coopName?: string;
}

export const RatResolutionPrintModal: React.FC<RatResolutionPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  resolution,
  coopName = 'KOPERASI KONSUMEN / SIMPAN PINJAM',
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !resolution) return null;

  const handleCopyText = async () => {
    try {
      const fullText = `
SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN (RAT)
Nomor: ${resolution.resolutionNo}
Tentang: ${resolution.subject}

${resolution.summary}
      `.trim();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Naskah ketetapan berhasil disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin naskah');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salinan Surat Ketetapan Resmi (TAP RAT)"
      size="xl"
    >
      <div className="space-y-6">
        {/* ACTION TOOLBAR (HIDDEN ON PRINT) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dokumen Otentik Hasil Sidang Pleno RAT</span>
            <Badge variant="success" className="text-[10px]">Sah & Mengikat</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Naskah'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* PRINTABLE LEGAL DOCUMENT CONTAINER */}
        <div className="p-8 md:p-12 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-sm font-serif space-y-6 print:shadow-none print:border-none print:p-0">
          {/* HEADER */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base md:text-lg font-black tracking-wider uppercase">
              {coopName}
            </h2>
            <h3 className="text-sm font-bold uppercase tracking-wide">
              RAPAT ANGGOTA TAHUNAN (RAT)
            </h3>
            <p className="text-xs font-sans text-slate-600">
              Berdasarkan Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian
            </p>
          </div>

          {/* TAP METADATA */}
          <div className="text-center space-y-1.5 pt-2">
            <h4 className="text-sm md:text-base font-black underline uppercase">
              SURAT KETETAPAN RAPAT ANGGOTA TAHUNAN
            </h4>
            <p className="font-mono text-xs md:text-sm font-bold text-slate-800">
              NOMOR: {resolution.resolutionNo}
            </p>
            <p className="text-xs md:text-sm font-bold uppercase pt-1 text-slate-800">
              TENTANG: {resolution.subject}
            </p>
          </div>

          {/* DOCUMENT BODY */}
          <div className="text-xs md:text-sm leading-relaxed text-justify whitespace-pre-line text-slate-800 pt-3">
            {resolution.summary}
          </div>

          {/* SIGNATURE SECTION */}
          <div className="pt-8 border-t border-slate-200 mt-8 font-sans">
            <div className="text-right text-xs text-slate-700 mb-6">
              Ditetapkan dalam Sidang Pleno RAT
            </div>
            <div className="text-center font-bold text-xs uppercase mb-8">
              PRESIDIUM SIDANG RAPAT ANGGOTA TAHUNAN
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div className="space-y-12">
                <span className="font-semibold text-slate-600">Ketua Sidang</span>
                <div className="border-t border-slate-400 pt-1 font-bold">
                  ( .................................... )
                </div>
              </div>
              <div className="space-y-12">
                <span className="font-semibold text-slate-600">Sekretaris Sidang</span>
                <div className="border-t border-slate-400 pt-1 font-bold">
                  ( .................................... )
                </div>
              </div>
              <div className="space-y-12">
                <span className="font-semibold text-slate-600">Anggota Presidium</span>
                <div className="border-t border-slate-400 pt-1 font-bold">
                  ( .................................... )
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

RatResolutionPrintModal.displayName = 'RatResolutionPrintModal';
export default RatResolutionPrintModal;
