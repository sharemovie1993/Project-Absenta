import React, { useRef, useState, useMemo } from 'react';
import { X, Printer, Download, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { PrintHeader } from '@/components/ui';
import toast from 'react-hot-toast';
import type { DenahElementNode, DenahSpasial } from '../../types/spasial.types';

interface DenahPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  denah: DenahSpasial;
  nodes: DenahElementNode[];
}

const KATEGORI_PRINT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  RUANG_UJIAN: {
    bg: '#ffffff',
    border: '#4338ca', // Indigo 700
    text: '#1e1b4b',
  },
  LAB: {
    bg: '#ecfeff',
    border: '#0891b2',
    text: '#164e63',
  },
  TOILET: {
    bg: '#fff1f2',
    border: '#e11d48',
    text: '#881337',
  },
  KANTOR: {
    bg: '#faf5ff',
    border: '#7e22ce',
    text: '#581c87',
  },
  PERPUSTAKAAN: {
    bg: '#fffbeb',
    border: '#b45309',
    text: '#78350f',
  },
  LAPANGAN: {
    bg: '#ecfdf5',
    border: '#047857',
    text: '#064e3b',
  },
  KORIDOR: {
    bg: '#f8fafc',
    border: '#64748b',
    text: '#334155',
  },
  LAINNYA: {
    bg: '#ffffff',
    border: '#475569',
    text: '#0f172a',
  },
};

export const DenahPrintModal: React.FC<DenahPrintModalProps> = ({
  isOpen,
  onClose,
  denah,
  nodes,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Hitung bounding box riil seluruh node untuk menjamin skala seragam 1:1 (True WYSIWYG)
  const layout = useMemo(() => {
    if (nodes.length === 0) {
      return { uniformScale: 1, offsetX: 0, offsetY: 0, renderedW: 0, renderedH: 0 };
    }

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const rights = nodes.map((n) => n.x + n.width);
    const bottoms = nodes.map((n) => n.y + n.height);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...rights);
    const maxY = Math.max(...bottoms);

    const contentW = Math.max(120, maxX - minX);
    const contentH = Math.max(80, maxY - minY);

    // Ruang kanvas denah pada lembar cetak A4 Landscape (980px × 440px)
    const mapCanvasWidth = 980;
    const mapCanvasHeight = 440;
    const padding = 20;

    // Skala Isotropik (Uniform): Scale X & Scale Y WAJIB SAMA persis agar kotak TIDAK GEPENG
    const baseScale = Math.min(
      (mapCanvasWidth - padding * 2) / contentW,
      (mapCanvasHeight - padding * 2) / contentH,
      1.1
    );

    const uniformScale = baseScale * scaleMultiplier;
    const renderedW = contentW * uniformScale;
    const renderedH = contentH * uniformScale;

    // Auto-centering: Pusatkan seluruh denah di tengah-tengah kanvas A4
    const offsetX = (mapCanvasWidth - renderedW) / 2 - minX * uniformScale;
    const offsetY = (mapCanvasHeight - renderedH) / 2 - minY * uniformScale;

    return { uniformScale, offsetX, offsetY, renderedW, renderedH };
  }, [nodes, scaleMultiplier]);

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContentRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Mempersiapkan PDF Denah A4 Landscape (True WYSIWYG)...');
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = printContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // 200 DPI Retina crisp
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

      const pdfWidth = 297;
      const pdfHeight = 210;
      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = pdfWidth / pdfHeight;

      let renderW = pdfWidth;
      let renderH = pdfHeight;
      let posX = 0;
      let posY = 0;

      if (canvasAspect > pageAspect) {
        renderH = pdfWidth / canvasAspect;
        posY = (pdfHeight - renderH) / 2;
      } else {
        renderW = pdfHeight * canvasAspect;
        posX = (pdfWidth - renderW) / 2;
      }

      pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
      pdf.save(`Denah_${denah.nama_denah.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Denah True WYSIWYG berhasil diunduh', { id: toastId });
    } catch (err: any) {
      console.error('Gagal ekspor PDF:', err);
      toast.error('Gagal membuat PDF denah', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Aturan CSS Cetak Fisik Browser (@media print): Hanya cetak lembar A4 murni */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #absenta-denah-print-sheet, #absenta-denah-print-sheet * {
            visibility: visible !important;
          }
          #absenta-denah-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Pratinjau Cetak Denah Lokasi ({denah.nama_denah})
            </h3>
            <p className="text-xs text-slate-500">
              Format Standar A4 Landscape • True WYSIWYG (1:1 Skala Proporsional)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Stepper for Fine-tuning Print Fit */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 mr-2">
              <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Skala:</span>
              <button
                type="button"
                onClick={() => setScaleMultiplier((prev) => Math.max(0.6, prev - 0.1))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Perkecil Skala Denah"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 min-w-[38px] text-center">
                {Math.round(scaleMultiplier * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScaleMultiplier((prev) => Math.min(1.5, prev + 0.1))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Perbesar Skala Denah"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {scaleMultiplier !== 1.0 && (
                <button
                  type="button"
                  onClick={() => setScaleMultiplier(1.0)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 cursor-pointer ml-0.5"
                  title="Reset Skala Pas A4"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

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
            id="absenta-denah-print-sheet"
            ref={printContentRef}
            className="bg-white text-slate-900 shadow-xl border border-slate-300 print:shadow-none print:border-none flex flex-col justify-between"
            style={{
              width: '297mm',
              height: '210mm',
              padding: '10mm 14mm',
              boxSizing: 'border-box',
            }}
          >
            <div>
              {/* Kop Resmi Surat */}
              <PrintHeader orientation="landscape" />

              {/* Denah Title & Meta */}
              <div className="text-center my-2 border-b-2 border-slate-800 pb-1.5">
                <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 leading-tight">
                  PETA &amp; DENAH SPASIAL RUANG UJIAN ASESMEN
                </h1>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  {denah.nama_denah} • Lantai {denah.lantai} {denah.gedung ? `• Gedung ${denah.gedung}` : ''}
                </div>
              </div>

              {/* Scaled Visual Map Surface (True WYSIWYG) */}
              <div
                className="relative border-2 border-slate-800 rounded-xl bg-slate-50/70 my-1 overflow-hidden"
                style={{
                  width: '980px',
                  height: '440px',
                  margin: '0 auto',
                }}
              >
                {nodes.map((node) => {
                  const { uniformScale, offsetX, offsetY } = layout;
                  const left = node.x * uniformScale + offsetX;
                  const top = node.y * uniformScale + offsetY;
                  const width = node.width * uniformScale;
                  const height = node.height * uniformScale;
                  const flipX = node.flip_h ? -1 : 1;
                  const flipY = node.flip_v ? -1 : 1;

                  const style = KATEGORI_PRINT_STYLES[node.kategori_ruang] || KATEGORI_PRINT_STYLES.LAINNYA;

                  // Proporsional Font Size: Menyesuaikan persis tinggi kotak agar tidak bertabrakan/overflow
                  const mainFontSize = Math.max(8, Math.min(18, Math.round(height * 0.40)));
                  const subFontSize = Math.max(6.5, Math.min(12, Math.round(height * 0.24)));

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: `rotate(${node.rotation}deg) scale(${flipX}, ${flipY})`,
                        transformOrigin: 'center center',
                        backgroundColor: node.warna_bg || style.bg,
                        borderColor: node.warna_border || style.border,
                        borderWidth: '2px',
                        borderStyle: node.kategori_ruang === 'KORIDOR' ? 'dashed' : 'solid',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                      }}
                      className="flex flex-col items-center justify-center shadow-xs overflow-hidden"
                    >
                      <div
                        className="flex flex-col items-center justify-center w-full h-full px-1 text-center select-none"
                        style={{ transform: `scale(${flipX}, ${flipY})` }}
                      >
                        {/* Nomor Ruang: R.01 (Bongsor & Jelas) */}
                        <div
                          className="font-black font-mono tracking-tight leading-none truncate max-w-full"
                          style={{
                            fontSize: `${mainFontSize}px`,
                            color: node.warna_teks || style.text,
                          }}
                        >
                          {node.label_utama}
                        </div>

                        {/* Nama Kelas: X AKL 1 (Terbaca Sempurna di Bawah Nomor Ruang) */}
                        {node.label_sub && (
                          <div
                            className="font-extrabold text-slate-800 truncate max-w-full leading-tight mt-0.5"
                            style={{ fontSize: `${subFontSize}px` }}
                          >
                            {node.label_sub}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend & Signatures */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold uppercase text-slate-800">Keterangan:</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 bg-white border-2 border-indigo-700 rounded-xs inline-block" />
                  Ruang Ujian
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 bg-cyan-100 border-2 border-cyan-600 rounded-xs inline-block" />
                  Laboratorium
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 bg-rose-100 border-2 border-rose-600 rounded-xs inline-block" />
                  Toilet
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 bg-purple-100 border-2 border-purple-600 rounded-xs inline-block" />
                  Kantor / Panitia
                </span>
              </div>

              <div className="font-mono text-slate-500 font-semibold">
                Dicetak otomatis via Sistem Absenta Spasial (A4 True WYSIWYG)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
