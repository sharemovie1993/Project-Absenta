import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { CoopSignatureToggleBar, useCoopSignatureToggles, type CoopSignatureToggleItem } from '../shared/CoopSignatureToggleBar';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
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
  const signerToggles: CoopSignatureToggleItem[] = [
    { slot: 'left', label: 'Ketua Koperasi' },
    { slot: 'right', label: 'Bendahara Koperasi' },
    { slot: 'bottom', label: 'Kepala Sekolah', isKepsek: true },
  ];
  const { visibility: sigVis, toggle: toggleSig } = useCoopSignatureToggles(signerToggles);

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
      await exportPrintSheetsToPdf(container, fileName, 'portrait');
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
      subHeader={<CoopSignatureToggleBar items={signerToggles} visibility={sigVis} onToggle={toggleSig} />}
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
              showSignerLeft={sigVis.left}
              showSignerRight={sigVis.right}
              showSignerBottom={sigVis.bottom}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
