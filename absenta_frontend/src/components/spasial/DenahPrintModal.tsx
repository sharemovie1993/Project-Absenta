import React, { useRef, useState, useMemo } from 'react';
import { X, Printer, Download, Loader2, ZoomIn, ZoomOut, RotateCcw, Globe } from 'lucide-react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui';
import { DenahMapGuideLayer } from './DenahMapGuideLayer';
import toast from 'react-hot-toast';
import type { DenahElementNode, DenahSpasial, DenahMapGuideConfig } from '../../types/spasial.types';
import { detectNodeTingkat, PRINT_TINGKAT_STYLES, getNodeTranslucentBg } from './denahTingkatHelper';

interface DenahPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  denah: DenahSpasial;
  nodes: DenahElementNode[];
  mapGuideConfig?: DenahMapGuideConfig;
}

const KATEGORI_PRINT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  RUANG_UJIAN: { bg: '#ffffff', border: '#4338ca', text: '#1e1b4b' },
  LAB: { bg: '#ecfeff', border: '#0891b2', text: '#164e63' },
  TOILET: { bg: '#fff1f2', border: '#e11d48', text: '#881337' },
  KANTOR: { bg: '#faf5ff', border: '#7e22ce', text: '#581c87' },
  PERPUSTAKAAN: { bg: '#fffbeb', border: '#b45309', text: '#78350f' },
  LAPANGAN: { bg: '#ecfdf5', border: '#047857', text: '#064e3b' },
  KORIDOR: { bg: '#f8fafc', border: '#64748b', text: '#334155' },
  LAINNYA: { bg: '#ffffff', border: '#475569', text: '#0f172a' },
};

const EVENT_TITLE_PRESETS = [
  'DENAH PENEMPATAN RUANG UJIAN',
  'DENAH RUANG UJIAN',
  'DENAH LOKASI RUANG UJIAN',
  'DENAH RUANG ASESMEN SUMATIF',
];
const SARPRAS_TITLE_PRESETS = ['DENAH TATA RUANG & FASILITAS KAMPUS', 'PETA LOKASI SARANA PRASARANA'];

export const DenahPrintModal: React.FC<DenahPrintModalProps> = ({
  isOpen,
  onClose,
  denah,
  nodes,
  mapGuideConfig,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const [showSatelliteLayer, setShowSatelliteLayer] = useState(mapGuideConfig?.enabled ?? true);
  const [satelliteOpacity, setSatelliteOpacity] = useState(mapGuideConfig?.opacity ?? 0.85);

  // Standar Judul Dokumen Kedinasan & Penyelenggaraan Ujian Sekolah
  const defaultDocTitle = useMemo(() => {
    if (denah.tipe === 'MASTER_SARPRAS') {
      return 'DENAH TATA RUANG & FASILITAS KAMPUS';
    }
    return 'DENAH PENEMPATAN RUANG UJIAN';
  }, [denah.tipe]);

  const [documentTitle, setDocumentTitle] = useState(defaultDocTitle);
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

    // Ruang kanvas denah pada lembar cetak A4 Landscape (1050px × 515px)
    const mapCanvasWidth = 1050;
    const mapCanvasHeight = 515;
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

      const sheetElement =
        (printContentRef.current.querySelector('.print-sheet') as HTMLElement) ||
        printContentRef.current;

      // Tunggu render tile satelit selesai sempurna
      await new Promise((r) => setTimeout(r, 600));

      const canvas = await html2canvas(sheetElement, {
        scale: 2, // Wajib: 2.0 (setara ~200 DPI Retina, tajam dan hemat RAM). DILARANG > 2.5
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Wajib: Bersihkan border dan shadow lembar agar tepi dokumen PDF bersih
          const sheets = clonedDoc.querySelectorAll('.print-sheet');
          sheets.forEach((s: any) => {
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
          });
          // Pastikan form input & toolbar tersembunyi, teks heading murni ditampilkan
          const hiddenElements = clonedDoc.querySelectorAll('.export-pdf-hidden, .print\\:hidden');
          hiddenElements.forEach((el: any) => {
            el.style.display = 'none';
          });
          const showElements = clonedDoc.querySelectorAll('.export-pdf-show');
          showElements.forEach((el: any) => {
            el.style.display = 'block';
          });
        },
      });

      // Anti-Bloat Guard & Aspect Ratio Preservation (Pilar SKILL universal-document-printing-pdf)
      const imgData = canvas.toDataURL('image/jpeg', 0.88);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true, // Wajib: Mengaktifkan kompresi stream PDF
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      // Preservasi Rasio Aspek 100% True WYSIWYG
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      if (imgHeight <= pdfHeight + 1) {
        // Pas 1 lembar utuh tanpa distorsi ataupun gepeng
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', 'landscape');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

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
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          #absenta-denah-print-sheet, #absenta-denah-print-sheet * { visibility: visible !important; }
          #absenta-denah-print-sheet {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 297mm !important; height: 210mm !important; margin: 0 !important;
            padding: 8mm 12mm !important; background: white !important;
            box-shadow: none !important; border: none !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
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
            {/* Toggle Real Satellite Map Layer */}
            {mapGuideConfig && (
              <button
                type="button"
                onClick={() => setShowSatelliteLayer((prev) => !prev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all cursor-pointer ${
                  showSatelliteLayer
                    ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title="Sertakan atau sembunyikan foto udara satelit asli pada lembar cetak"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{showSatelliteLayer ? 'Peta Satelit: Aktif' : 'Peta: Polos'}</span>
              </button>
            )}

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
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-200/70 dark:bg-slate-950" ref={printContentRef}>
          <PrintDocumentSheet
            id="absenta-denah-print-sheet"
            orientation="landscape"
            className="p-4 sm:p-5 flex flex-col justify-between overflow-hidden"
            style={{
              width: '1123px',
              minWidth: '1123px',
              maxWidth: '1123px',
              height: '794px',
              minHeight: '794px',
              maxHeight: '794px',
              boxSizing: 'border-box',
            }}
          >
            <div>
              {/* Kop Resmi Surat Sesuai Standar Kedinasan (variant="landscape") */}
              <PrintHeader variant="landscape" />

              {/* Denah Title & Meta (Standar Kedinasan & Penyelenggara Ujian, Editable In-Place) */}
              <div className="text-center my-1.5 border-b-2 border-slate-800 pb-1.5 group/title relative">
                {/* Preset Cepat Event Ujian (Screen Only, Tersembunyi Saat Cetak/PDF) */}
                <div className="print:hidden export-pdf-hidden flex items-center justify-center gap-1 mb-1 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-0.5">Preset:</span>
                  {(denah.tipe === 'MASTER_SARPRAS' ? SARPRAS_TITLE_PRESETS : EVENT_TITLE_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDocumentTitle(preset)}
                      className={`text-[9.5px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-medium ${
                        documentTitle === preset
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Input interaktif pada layar preview */}
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value.toUpperCase())}
                  className="w-full text-center text-lg font-black uppercase tracking-wider text-slate-900 leading-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden transition-colors py-0.5 print:hidden export-pdf-hidden cursor-text"
                  title="Klik untuk mengubah judul dokumen denah ini sesuai kebutuhan"
                  aria-label="Judul Dokumen Denah"
                />
                {/* Heading murni saat Cetak & Ekspor PDF untuk mencegah font baseline clipping pada html2canvas */}
                <h1 className="hidden print:block export-pdf-show text-lg font-black uppercase tracking-wider text-slate-900 leading-tight py-0.5 m-0 text-center">
                  {documentTitle}
                </h1>

                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  {denah.nama_denah} • Lantai {denah.lantai} {denah.gedung ? `• Gedung ${denah.gedung}` : ''}
                </div>
              </div>

              {/* Scaled Visual Map Surface (True WYSIWYG) */}
              <div
                className="relative border-2 border-slate-800 rounded-xl bg-slate-100 my-1 overflow-hidden"
                style={{
                  width: '1050px',
                  height: '515px',
                  margin: '0 auto',
                }}
              >
                {/* Realtime Satellite Google Maps Aerial Guide Layer */}
                {showSatelliteLayer && mapGuideConfig && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${layout.offsetX}px`,
                      top: `${layout.offsetY}px`,
                      width: `${denah.canvas_width || 2400}px`,
                      height: `${denah.canvas_height || 1600}px`,
                      transform: `scale(${layout.uniformScale})`,
                      transformOrigin: '0 0',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    <DenahMapGuideLayer
                      config={{
                        ...mapGuideConfig,
                        is_locked: true,
                        opacity: satelliteOpacity,
                      }}
                      width={denah.canvas_width || 2400}
                      height={denah.canvas_height || 1600}
                      onMapChange={() => {}}
                    />
                  </div>
                )}

                {nodes.map((node) => {
                  const { uniformScale, offsetX, offsetY } = layout;
                  const left = node.x * uniformScale + offsetX;
                  const top = node.y * uniformScale + offsetY;
                  const width = node.width * uniformScale;
                  const height = node.height * uniformScale;
                  const flipX = node.flip_h ? -1 : 1;
                  const flipY = node.flip_v ? -1 : 1;
                  const isRotated90or270 = node.rotation === 90 || node.rotation === 270;
                  const isTextUpright = node.kunci_teks_tegak !== false;
                  const textRotation = isTextUpright ? -node.rotation : 0;

                  const style = KATEGORI_PRINT_STYLES[node.kategori_ruang] || KATEGORI_PRINT_STYLES.LAINNYA;

                  // Deteksi tingkat kelas agar dokumen cetak & PDF otomatis membedakan warna kelompok tingkat
                  const detectedTingkat = detectNodeTingkat(node);
                  const tingkatPrintStyle =
                    (node.kategori_ruang === 'RUANG_UJIAN' || !node.kategori_ruang) && detectedTingkat
                      ? PRINT_TINGKAT_STYLES[detectedTingkat]
                      : null;

                  const effectiveBg =
                    node.warna_bg ||
                    (showSatelliteLayer
                      ? getNodeTranslucentBg(detectedTingkat, false, 0.35, node.kategori_ruang)
                      : tingkatPrintStyle?.bg || style.bg);
                  const effectiveBorder = node.warna_border || tingkatPrintStyle?.border || style.border;
                  const effectiveText = node.warna_teks || tingkatPrintStyle?.text || style.text;
                  const effectiveSubtext = node.warna_teks || tingkatPrintStyle?.subtext || style.text;

                  // Proporsional Font Size: Menyesuaikan persis tinggi visual kotak agar tidak bertabrakan/overflow
                  const effectiveH = isRotated90or270 ? width : height;
                  const mainFontSize = Math.max(9, Math.min(16, Math.round(effectiveH * 0.38)));
                  const subFontSize = Math.max(7, Math.min(11, Math.round(effectiveH * 0.24)));

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
                        backgroundColor: effectiveBg,
                        borderColor: effectiveBorder,
                        borderWidth: '2px',
                        borderStyle: node.kategori_ruang === 'KORIDOR' ? 'dashed' : 'solid',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        backdropFilter: showSatelliteLayer ? 'blur(2px)' : undefined,
                        WebkitBackdropFilter: showSatelliteLayer ? 'blur(2px)' : undefined,
                        zIndex: 10,
                      }}
                      className="flex flex-col items-center justify-center shadow-md overflow-hidden"
                    >
                      <div
                        className="flex flex-col items-center justify-center px-0.5 text-center select-none overflow-hidden"
                        style={{
                          width: isRotated90or270 && isTextUpright ? `${height}px` : '100%',
                          height: isRotated90or270 && isTextUpright ? `${width}px` : '100%',
                          transform: `rotate(${textRotation}deg) scale(${flipX}, ${flipY})`,
                          transformOrigin: 'center center',
                        }}
                      >
                        {/* Nomor Ruang: R.01 (Bongsor, Bebas Truncate Ellipsis) */}
                        <div
                          className="font-black font-sans tracking-tight leading-none whitespace-nowrap overflow-hidden select-none"
                          style={{
                            fontSize: `${mainFontSize}px`,
                            color: effectiveText,
                          }}
                        >
                          {node.label_utama}
                        </div>

                        {/* Nama Kelas: X AKL 1 (Terbaca Sempurna di Bawah Nomor Ruang) */}
                        {node.label_sub && (
                          <div
                            className="font-bold font-sans tracking-tight leading-tight whitespace-nowrap overflow-hidden select-none mt-0.5"
                            style={{
                              fontSize: `${subFontSize}px`,
                              color: effectiveSubtext,
                            }}
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
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-white border-2 border-indigo-700 rounded-xs inline-block" />Ruang Ujian</span>
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-cyan-100 border-2 border-cyan-600 rounded-xs inline-block" />Laboratorium</span>
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-rose-100 border-2 border-rose-600 rounded-xs inline-block" />Toilet</span>
                <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 bg-purple-100 border-2 border-purple-600 rounded-xs inline-block" />Kantor / Panitia</span>
              </div>

              <div className="font-mono text-slate-500 font-semibold">
                Dicetak otomatis via Sistem Absenta Spasial (A4 True WYSIWYG)
              </div>
            </div>
          </PrintDocumentSheet>
        </div>
      </div>
    </div>
  );
};
