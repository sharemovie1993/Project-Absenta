import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import { Printer, Download, Eye, Layers, Filter } from 'lucide-react';
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
  const [showKop, setShowKop] = useState<boolean>(true);
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
            • Siap ditempel di pintu ruang ujian
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

          {/* Toggle Tampilkan Kop */}
          <button
            type="button"
            onClick={() => setShowKop((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              showKop
                ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200'
            }`}
          >
            {showKop ? '✓ Kop Resmi Aktif' : 'Kop Minimalis'}
          </button>
        </div>
      }
    >
      <div ref={sheetContainerRef} className="space-y-8 flex flex-col items-center">
        {targetRooms.map((room, idx) => {
          const slot = room.slot_ruang || `R.${String(idx + 1).padStart(2, '0')}`;
          const namaKelas = room.nama_kelas || 'KELAS UJIAN';
          const namaRuang = room.nama_ruang || `Ruang ${String(idx + 1).padStart(2, '0')}`;
          const jurusan = room.nama_jurusan || room.kode_jurusan || '';

          return (
            <PrintDocumentSheet
              key={room.kelas_id}
              orientation="landscape"
              pageNumber={idx + 1}
              totalPages={targetRooms.length}
              footerText={`${sekolah?.nama_sekolah || 'Absenta School'} • Panitia Pelaksana Asesmen CBT`}
              className="flex flex-col justify-between"
            >
              {/* ── 1. HEADER KOP RESMI (JIKA DIAKTIFKAN) ── */}
              {showKop ? (
                <div className="shrink-0 mb-4">
                  <PrintHeader
                    title={eventName.toUpperCase()}
                    subtitle={`TAHUN AJARAN ${tenantInfo?.tahun_ajaran || '2026/2027'}`}
                    nomorSurat="PANITIA PELAKSANA ASESMEN CBT"
                    showLogoDaerah={showLogoDaerah}
                    showLogoSekolah={showLogoSekolah}
                  />
                </div>
              ) : (
                <div className="shrink-0 pb-3 mb-4 border-b-2 border-slate-900 text-center">
                  <h3 className="text-sm font-black tracking-widest uppercase text-slate-800">
                    {sekolah?.nama_sekolah || 'PANITIA CBT SEKOLAH'}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-600 tracking-wider">
                    {eventName} • TAHUN AJARAN {tenantInfo?.tahun_ajaran || '2026/2027'}
                  </p>
                </div>
              )}

              {/* ── 2. MAIN CENTER HERO BANNER (A4 LANDSCAPE TRUE WYSIWYG) ── */}
              <div className="flex-1 flex flex-col justify-center my-2">
                <div className="border-4 border-slate-900 rounded-3xl p-6 sm:p-8 bg-white text-center flex flex-col justify-center items-center relative overflow-hidden shadow-sm">
                  {/* Decorative Header Pill */}
                  <div className="inline-block px-6 py-1.5 rounded-full bg-slate-900 text-white text-xs sm:text-sm font-black tracking-widest uppercase mb-4">
                    RUANG UJIAN / EXAMINATION ROOM
                  </div>

                  {/* KODE RUANG (R.01) - TYPOGRAPHY RAKSASA */}
                  <div className="my-1 sm:my-2">
                    <span className="text-8xl sm:text-9xl font-black text-slate-900 tracking-tight font-mono leading-none select-all">
                      {slot}
                    </span>
                  </div>

                  {/* Double Divider Line */}
                  <div className="w-48 sm:w-64 h-1.5 bg-slate-900 rounded-full my-3 sm:my-4" />

                  {/* NAMA KELAS (X TKJ 1) - TYPOGRAPHY BESAR */}
                  <div className="mt-1">
                    <span className="text-4xl sm:text-6xl font-black text-slate-800 tracking-wider uppercase leading-tight select-all">
                      {namaKelas}
                    </span>
                  </div>

                  {/* Subtitle / Lokasi Fisik */}
                  <div className="mt-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold text-slate-600 flex-wrap">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg">
                      Lokasi: {namaRuang}
                    </span>
                    {jurusan && (
                      <span className="px-3 py-1 bg-slate-100 rounded-lg">
                        {jurusan}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-slate-100 rounded-lg">
                      Tingkat {formatTingkatRomawi(room.tingkat)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 3. FOOTER INFORMASI TEMPEL ── */}
              <div className="shrink-0 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Dokumen Resmi Panitia CBT • Tempelkan di bagian tengah luar pintu ruang ujian</span>
                <span>Slot: {slot} / {namaKelas}</span>
              </div>
            </PrintDocumentSheet>
          );
        })}
      </div>
    </UniversalDocumentModal>
  );
};
