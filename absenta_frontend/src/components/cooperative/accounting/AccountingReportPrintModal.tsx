import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const signers = useDocumentSigners();

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
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Laporan"
      size="5xl"
    >
      <div ref={sheetContainerRef} className="space-y-6 flex flex-col items-center">
        <PrintDocumentSheet orientation="portrait" className="flex flex-col justify-between text-slate-900">
          <div>
            {/* 1. Kop Resmi Koperasi */}
            <CoopDocumentKop
              subtitle={reportTitle}
              subtext={`${periodLabel} • (Dinyatakan dalam Rupiah Indonesia - IDR)`}
            />

            {/* 3. Konten Laporan */}
            <div className="text-slate-900">{children}</div>
          </div>

          {/* 4. Tanda Tangan Standar UniversalDocumentSignatures */}
          <div className="mt-8 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="triangle_2tier"
              fontFamilyClass="font-sans"
              spacingHeightMm={16}
              signerLeft={signers.ketuaKoperasi}
              signerRight={signers.bendaharaKoperasi}
              signerBottom={signers.kepsek}
              verifierLabel="Diperiksa & Disetujui,"
              makerLabel="Disiapkan Oleh,"
              notesOrApprovalLabel="Mengetahui / Menyetujui,"
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
