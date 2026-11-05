import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import { Printer, Download, Filter } from 'lucide-react';
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
  eventName = 'PENILAIAN AKHIR SEMESTER (PAS) / SUMATIF AKHIR SEMESTER (SAS)',
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Filter mode: 'ALL' or a specific kelas_id
  const [filterKelasId, setFilterKelasId] = useState<string>(selectedKelasId || 'ALL');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [showFullKop, setShowFullKop] = useState<boolean>(false); // Default: Minimalist/Zero-noise
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolah = (rawSekolah || {}) as any;

  // Sync selectedKelasId if changed from parent
  React.useEffect(() => {
    if (selectedKelasId) {
      setFilterKelasId(selectedKelasId);
    } else {
      setFilterKelasId('ALL');
    }
  }, [selectedKelasId, isOpen]);

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
                  {r.slot_ruang || 'Slot'} - {r.nama_kelas} ({r.nama_ruang || 'Ruang'})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Kop Dinas / Minimalis */}
          <button
            type="button"
            onClick={() => setShowFullKop((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              showFullKop
                ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300'
                : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
            }`}
          >
            {showFullKop ? '✓ Kop Dinas Aktif' : 'Kop Minimalis (Rekomendasi)'}
          </button>
        </div>
      }
    >
      <div ref={sheetContainerRef} className="space-y-8 flex flex-col items-center">
        {targetRooms.map((room, idx) => {
          const slot = room.slot_ruang || `R.${String(idx + 1).padStart(2, '0')}`;
          const namaKelas = room.nama_kelas || 'KELAS UJIAN';
          const namaRuang = room.nama_ruang || '';

          return (
            <PrintDocumentSheet
              key={room.kelas_id}
              orientation="landscape"
              className="flex flex-col justify-between"
            >
              {/* ── 1. HEADER (KOP DINAS ATAU KOP BERSIH MINIMALIS) ── */}
              {showFullKop ? (
                <div className="shrink-0 mb-3">
                  <PrintHeader
                    title={eventName.toUpperCase()}
                    subtitle={`TAHUN AJARAN ${tenantInfo?.tahun_ajaran || '2026/2027'}`}
                    nomorSurat="PANITIA PELAKSANA ASESMEN CBT"
                    showLogoDaerah={showLogoDaerah}
                    showLogoSekolah={showLogoSekolah}
                  />
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-between pb-3 border-b-2 border-slate-900 mb-3">
                  <div className="flex items-center gap-3">
                    {showLogoSekolah && sekolah?.logo_url && (
                      <img
                        src={sekolah.logo_url}
                        alt="Logo Sekolah"
                        className="w-11 h-11 object-contain shrink-0"
                      />
                    )}
                    <div className="text-left">
                      <h3 className="text-base font-black tracking-wider uppercase text-slate-900 leading-tight">
                        {sekolah?.nama_sekolah || 'PANITIA PELAKSANA CBT'}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-600 tracking-wide mt-0.5">
                        {eventName} • TAHUN AJARAN {tenantInfo?.tahun_ajaran || '2026/2027'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black px-3 py-1 rounded-lg bg-slate-100 text-slate-900 border border-slate-300">
                      SLOT {slot}
                    </span>
                  </div>
                </div>
              )}

              {/* ── 2. MAIN CENTER HERO BANNER (MAKSIMAL & BEBAS NOISE) ── */}
              <div className="flex-1 flex flex-col justify-center items-center my-auto w-full">
                <div className="w-full border-4 border-slate-900 rounded-3xl p-6 sm:p-10 bg-white text-center flex flex-col justify-center items-center">
                  {/* Judul: RUANG UJIAN (Cukup judul tegas, tanpa noise) */}
                  <h2 className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-slate-900 mb-2">
                    RUANG UJIAN
                  </h2>

                  {/* KODE RUANG (R.05 / R.01) - TYPOGRAPHY RAKSASA & FOKUS */}
                  <div className="my-1 sm:my-2">
                    <span className="text-8xl sm:text-[135px] font-black text-slate-900 tracking-tight font-mono leading-none select-all">
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

                  {/* NAMA RUANG FISIK (Ruang 05 / Lab Komputer) */}
                  {namaRuang && (
                    <div className="mt-3 text-lg sm:text-2xl font-bold text-slate-600">
                      ({namaRuang})
                    </div>
                  )}
                </div>
              </div>
            </PrintDocumentSheet>
          );
        })}
      </div>
    </UniversalDocumentModal>
  );
};
