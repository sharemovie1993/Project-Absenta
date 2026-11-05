import React, { useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { PrintHeader } from '@/components/ui';
import toast from 'react-hot-toast';
import type { DenahElementNode, DenahSpasial } from '../../types/spasial.types';

interface DenahPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  denah: DenahSpasial;
  nodes: DenahElementNode[];
}

export const DenahPrintModal: React.FC<DenahPrintModalProps> = ({
  isOpen,
  onClose,
  denah,
  nodes,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContentRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Mempersiapkan PDF Denah A4 Landscape...');
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = printContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`Denah_${denah.nama_denah.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Denah berhasil diunduh', { id: toastId });
    } catch (err: any) {
      console.error('Gagal ekspor PDF:', err);
      toast.error('Gagal membuat PDF denah', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Find canvas bounding box for scaling onto A4 Landscape
  const maxX = Math.max(1200, ...nodes.map((n) => n.x + n.width + 40));
  const maxY = Math.max(700, ...nodes.map((n) => n.y + n.height + 40));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Pratinjau Cetak Denah Lokasi ({denah.nama_denah})
            </h3>
            <p className="text-xs text-slate-500">
              Format Standar A4 Landscape • Siap Cetak Fisik &amp; Ekspor PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Browser
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Unduh PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Canvas Area */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-200/70 dark:bg-slate-950">
          <div
            ref={printContentRef}
            className="bg-white text-slate-900 shadow-xl border border-slate-300 print:shadow-none print:border-none"
            style={{
              width: '297mm',
              minHeight: '210mm',
              padding: '12mm 15mm',
              boxSizing: 'border-box',
            }}
          >
            {/* Kop Resmi Surat */}
            <PrintHeader orientation="landscape" />

            {/* Denah Title & Meta */}
            <div className="text-center my-3 border-b-2 border-slate-800 pb-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                PETA &amp; DENAH SPASIAL RUANG UJIAN ASESMEN
              </h1>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                {denah.nama_denah} • Lantai {denah.lantai} {denah.gedung ? `• Gedung ${denah.gedung}` : ''}
              </div>
            </div>

            {/* Scaled Visual Map Surface */}
            <div
              className="relative border-2 border-slate-800 rounded-lg bg-slate-50/50 my-2 overflow-hidden"
              style={{
                width: '100%',
                height: '420px',
              }}
            >
              {nodes.map((node) => {
                const scaleX = 940 / maxX;
                const scaleY = 400 / maxY;
                const left = node.x * scaleX + 15;
                const top = node.y * scaleY + 10;
                const width = node.width * scaleX;
                const height = node.height * scaleY;
                const flipX = node.flip_h ? -1 : 1;
                const flipY = node.flip_v ? -1 : 1;

                return (
                  <div
                    key={node.id}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      transform: `rotate(${node.rotation}deg) scale(${flipX}, ${flipY})`,
                      transformOrigin: 'center center',
                    }}
                    className="absolute border-2 border-slate-800 bg-white rounded-md flex flex-col items-center justify-center p-1 text-center shadow-xs"
                  >
                    <div
                      className="flex flex-col items-center justify-center w-full"
                      style={{ transform: `scale(${flipX}, ${flipY})` }}
                    >
                      <span className="font-mono font-black text-xs text-slate-900 leading-tight">
                        {node.label_utama}
                      </span>
                      {node.label_sub && (
                        <span className="text-[9px] font-bold text-slate-700 truncate max-w-full">
                          {node.label_sub}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend & Signatures */}
            <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold uppercase text-slate-800">Keterangan:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-indigo-100 border border-indigo-600 rounded-xs inline-block" />
                  Ruang Ujian Siswa
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-cyan-100 border border-cyan-600 rounded-xs inline-block" />
                  Laboratorium
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-500 rounded-xs inline-block" />
                  Toilet
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-purple-100 border border-purple-500 rounded-xs inline-block" />
                  Ruang Panitia / Guru
                </span>
              </div>

              <div className="font-mono text-slate-500">
                Dicetak otomatis via Sistem Absenta Spasial
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
