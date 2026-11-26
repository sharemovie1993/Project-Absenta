import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import toast from 'react-hot-toast';
import { formatIndonesianDate } from '../../../utils/cooperative/coopDocUtils';

export interface AccountingReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalTitle: string;
  reportTitle: string;
  periodLabel: string;
  fileName: string;
  children: React.ReactNode;
}

export const AccountingReportPrintModal: React.FC<AccountingReportPrintModalProps> = ({
  isOpen,
  onClose,
  modalTitle,
  reportTitle,
  periodLabel,
  fileName,
  children,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { rawSekolah, tenantInfo } = usePrintHeaderData();
  const sekolah = (rawSekolah || {}) as any;
  const kota = sekolah?.kabupaten_kota || sekolah?.kota || tenantInfo?.kota || 'Purwakarta';
  const kepalaSekolah =
    sekolah?.kepala_sekolah ||
    sekolah?.nama_kepala_sekolah ||
    '........................................';
  const nipKepalaSekolah = sekolah?.nip_kepala_sekolah || '........................................';
  const todayLabel = formatIndonesianDate(new Date());

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }

    const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
    if (sheets.length === 0) {
      toast.error('Tidak ada lembar laporan untuk diekspor');
      return;
    }

    const toastId = toast.loading('Mempersiapkan PDF Laporan Keuangan...');
    try {
      setIsExportingPdf(true);
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        if (i > 0) pdf.addPage('a4', 'portrait');

        const canvas = await html2canvas(sheet, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll<HTMLElement>('.print-sheet').forEach((s) => {
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = pdfWidth * canvasRatio;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      }

      pdf.save(fileName);
      toast.success('File PDF Laporan berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[AccountingReportPrintModal PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle="Standar Universal Document Printing • True WYSIWYG A4 Portrait"
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Laporan"
      size="5xl"
    >
      <div ref={sheetContainerRef} className="space-y-6 flex flex-col items-center">
        <PrintDocumentSheet orientation="portrait" className="flex flex-col justify-between text-slate-900">
          <div>
            {/* 1. Kop Surat Resmi */}
            <div className="mb-4">
              <PrintHeader
                variant="portrait"
                showLogoDaerah={showLogoDaerah}
                showLogoSekolah={showLogoSekolah}
              />
            </div>

            {/* 2. Judul Laporan */}
            <div className="text-center mb-5 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 underline underline-offset-4">
                {reportTitle}
              </h2>
              <p className="text-[11px] font-semibold text-slate-600">{periodLabel}</p>
              <p className="text-[10px] text-slate-500 italic">(Dinyatakan dalam Rupiah Indonesia - IDR)</p>
            </div>

            {/* 3. Konten Laporan */}
            <div className="text-slate-900">{children}</div>
          </div>

          {/* 4. Tanda Tangan 2-Tier Standar Resmi */}
          <div className="mt-8 pt-2 text-[11px] leading-snug break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 text-center mb-5">
              <div>
                <p className="text-slate-600">Diperiksa &amp; Disetujui,</p>
                <p className="font-bold text-slate-900">Ketua Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( ........................................ )</p>
              </div>
              <div>
                <p className="text-slate-600">{kota}, {todayLabel}</p>
                <p className="font-bold text-slate-900">Disiapkan Oleh, Bendahara Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( ........................................ )</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-600">Mengetahui / Menyetujui,</p>
              <p className="font-bold text-slate-900">Kepala Sekolah / Pembina Koperasi</p>
              <div className="h-14" />
              <p className="font-bold underline">{kepalaSekolah}</p>
              <p className="text-[10px] text-slate-600">NIP. {nipKepalaSekolah}</p>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
