import React, { useRef, useState, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import { Printer, Download, Filter, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { KelasRoomMapping } from './cbtOrchestratorHelper';

interface CbtLabelRuangPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: KelasRoomMapping[];
  selectedKelasId?: string | null;
  eventName?: string;
}

export const CbtLabelRuangPrintModal: React.FC<CbtLabelRuangPrintModalProps> = ({
  isOpen,
  onClose,
  items,
  selectedKelasId,
  eventName = 'PENILAIAN AKHIR SEMESTER (PAS) GANJIL',
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Filter mode: 'ALL' or a specific kelas_id
  const [filterKelasId, setFilterKelasId] = useState<string>(selectedKelasId || 'ALL');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [showFullKop, setShowFullKop] = useState<boolean>(true); // Header Kop Resmi Tetap Aktif Sesuai Persetujuan
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // State nama event yang dapat diedit langsung oleh panitia
  const [customEventName, setCustomEventName] = useState<string>(
    eventName || 'PENILAIAN AKHIR SEMESTER (PAS) GANJIL'
  );

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolah = (rawSekolah || {}) as any;

  // Sync state when props change
  useEffect(() => {
    if (selectedKelasId) {
      setFilterKelasId(selectedKelasId);
    } else {
      setFilterKelasId('ALL');
    }
  }, [selectedKelasId, isOpen]);

  useEffect(() => {
    if (eventName) {
      setCustomEventName(eventName);
    }
  }, [eventName]);

  // Filtered rooms to render
  const targetRooms = React.useMemo(() => {
    let list = items;
    if (filterKelasId !== 'ALL') {
      list = list.filter((r) => r.kelas_id === filterKelasId);
    }
    if (filterTingkat !== 'ALL') {
      list = list.filter((r) => r.tingkat === filterTingkat);
    }
    return list;
  }, [items, filterKelasId, filterTingkat]);

  // ── 1. True WYSIWYG Print Handler ──
  const handleBrowserPrint = () => {
    window.print();
  };

  // ── 2. True WYSIWYG PDF Export via Dual-Engine (html2canvas-pro + jsPDF) ──
  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }

    const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
    if (sheets.length === 0) {
      toast.error('Tidak ada lembar label ruang yang dipilih');
      return;
    }

    const toastId = toast.loading(`Mempersiapkan PDF ${sheets.length} Lembar Label Ruang...`);

    try {
      setIsExportingPdf(true);

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        const canvas = await html2canvas(sheet, {
          scale: 2, // 200 DPI Retina
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
            clonedSheets.forEach((s) => {
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = pdfWidth * canvasRatio;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      }

      const fileName =
        filterKelasId !== 'ALL'
          ? `LABEL_RUANG_${targetRooms[0]?.slot_ruang || 'CBT'}_${targetRooms[0]?.nama_kelas || 'KELAS'}.pdf`
          : `LABEL_RUANG_CBT_SEMUA_ROMBEL.pdf`;

      pdf.save(fileName);
      toast.success('File PDF Label Ruang A4 Landscape berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[CBT Room Label PDF Export Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Label Pintu Ruang Ujian (A4 Landscape)"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Format:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            Kertas A4 Landscape (297 × 210 mm)
          </span>
          <span className="text-[11px] text-muted-foreground">
            • Desain fokus &amp; bebas noise
          </span>
        </div>
      }
      orientation="landscape"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4 Landscape)'}
      printButtonText="Cetak Label Ruang"
      size="5xl"
      extraActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Input Edit Nama Event Asesmen */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
            <Edit3 size={12} className="text-violet-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Event:</span>
            <input
              type="text"
              value={customEventName}
              onChange={(e) => setCustomEventName(e.target.value)}
              placeholder="Nama Event Asesmen..."
              aria-label="Edit nama event asesmen pada label ruang"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden w-52 sm:w-64"
            />
          </div>

          {/* Filter Ruang Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
            <Filter size={12} className="text-slate-400" />
            <select
              value={filterKelasId}
              onChange={(e) => setFilterKelasId(e.target.value)}
              aria-label="Filter ruang yang dicetak"
              className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">Cetak Semua Ruang ({items.length} Rombel)</option>
              {items.map((r) => (
                <option key={r.kelas_id} value={r.kelas_id}>
                  {r.slot_ruang || 'Slot'} - {r.nama_kelas}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div ref={sheetContainerRef} className="space-y-8 flex flex-col items-center">
        {targetRooms.map((room, idx) => {
          const slot = room.slot_ruang || `R.${String(idx + 1).padStart(2, '0')}`;
          const namaKelas = room.nama_kelas || 'KELAS UJIAN';

          return (
            <PrintDocumentSheet
              key={room.kelas_id}
              orientation="landscape"
              className="flex flex-col justify-between"
            >
              {/* ── 1. HEADER KOP RESMI (DIPERTAHANKAN SESUAI PERSETUJUAN) ── */}
              {showFullKop && (
                <div className="shrink-0 mb-3">
                  <PrintHeader
                    variant="landscape"
                    showLogoDaerah={showLogoDaerah}
                    showLogoSekolah={showLogoSekolah}
                  />
                </div>
              )}

              {/* ── 2. MAIN CENTER HERO BANNER (BEBAS NOISE & FOKUS MAKSIMAL) ── */}
              <div className="flex-1 flex flex-col justify-center items-center my-auto w-full">
                <div className="w-full border-4 border-slate-900 rounded-3xl p-6 sm:p-10 bg-white text-center flex flex-col justify-center items-center shadow-xs">
                  {/* Nama Event Asesmen (Dapat diedit dari toolbar) */}
                  {customEventName && (
                    <div className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-slate-700 mb-1">
                      {customEventName}
                    </div>
                  )}

                  {/* Judul: RUANG UJIAN (Cukup judul tegas) */}
                  <h2 className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-slate-900 mb-2">
                    RUANG UJIAN
                  </h2>

                  {/* KODE RUANG (R.05 / R.01) - TYPOGRAPHY RAKSASA & FOKUS */}
                  <div className="my-1 sm:my-2">
                    <span className="text-8xl sm:text-[140px] font-black text-slate-900 tracking-tight font-mono leading-none select-all">
                      {slot}
                    </span>
                  </div>

                  {/* Solid Divider Line */}
                  <div className="w-48 sm:w-64 h-2 bg-slate-900 rounded-full my-3 sm:my-4" />

                  {/* NAMA KELAS (X PHT 1 / X TKJ 1) - BESAR & JELAS */}
                  <div className="mt-1">
                    <span className="text-5xl sm:text-7xl font-black text-slate-900 tracking-wider uppercase leading-tight select-all">
                      {namaKelas}
                    </span>
                  </div>
                  {/* Di bawah kelas TIDAK ADA nama ruang sesuai instruksi (bersih & bebas noise) */}
                </div>
              </div>
            </PrintDocumentSheet>
          );
        })}
      </div>
    </UniversalDocumentModal>
  );
};
