import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
import { formatTerbilangIndonesian } from '../../../utils/cooperative/coopDocUtils';
import type { LoanDetailData, CooperativeSettings } from './types';

export interface PrintLoanReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanDetailData;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanReceipt: React.FC<PrintLoanReceiptProps> = ({
  isOpen,
  onClose,
  loan,
  coopSettings,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signers = useDocumentSigners();

  const coopName = coopSettings?.cooperative_name || 'KOPERASI SEKOLAH';
  const amountNumber = parseFloat(loan.amount) || 0;
  const adminFee = Math.round(amountNumber * 0.015);
  const netAmount = amountNumber - adminFee;

  const receiptNo = `KPT/${loan.id.substring(0, 8).toUpperCase()}/${new Date(loan.createdAt).getFullYear()}`;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }
    const toastId = toast.loading('Mempersiapkan PDF Kuitansi Pencairan Dana...');
    try {
      setIsExportingPdf(true);
      const safeNo = receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportPrintSheetsToPdf(container, `KUITANSI_PENCAIRAN_${safeNo}.pdf`, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[PrintLoanReceipt PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kuitansi Pencairan Dana (A4 Portrait)"
      subtitle="Standar Dokumen Resmi Koperasi • True WYSIWYG A4"
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Dokumen"
    >
      <div ref={sheetContainerRef} className="w-full flex flex-col items-center">
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={`Dokumen Sah Kuitansi Pencairan Dana Pinjaman • No. ${receiptNo}`}
        >
          {/* 1. Kop Resmi Koperasi */}
          <CoopDocumentKop
            title="KUITANSI PENCAIRAN DANA"
            subtitle="Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah"
            docNumber={receiptNo}
          />

          {/* 2. Detail Kuitansi */}
          <div className="space-y-3.5 text-[11px] leading-relaxed mb-6">
            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-slate-600 font-semibold">Telah Diterima Dari</span>
              <span className="col-span-9 font-bold uppercase text-slate-900">
                : BENDAHARA {coopName}
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-slate-600 font-semibold">Uang Sejumlah</span>
              <span className="col-span-9 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded italic text-slate-900 text-[12px] font-bold">
                # {formatTerbilangIndonesian(netAmount)} #
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 items-start">
              <span className="col-span-3 text-slate-600 font-semibold">Untuk Pembayaran</span>
              <span className="col-span-9 text-slate-800">
                : Pencairan bersih fasilitas kredit/pinjaman koperasi sekolah atas nama anggota{' '}
                <strong>
                  {loan.member?.name || '-'} ({loan.member?.memberNo || '-'})
                </strong>{' '}
                dengan rincian pemotongan administrasi terlampir.
              </span>
            </div>
          </div>

          {/* 3. Rincian Potongan Slip */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2 mb-6 max-w-md ml-auto text-[11px]">
            <h4 className="font-bold text-[10px] uppercase text-slate-600 border-b border-dashed border-slate-300 pb-1">
              Rincian Transaksi Pencairan (USP)
            </h4>
            <div className="space-y-1.5 font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Plafon Pinjaman:</span>
                <span className="font-bold font-mono text-slate-900">
                  Rp {Math.round(amountNumber).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-rose-700 border-b border-dashed border-slate-300 pb-1.5">
                <span>Biaya Administrasi & Provisi (1.5%):</span>
                <span className="font-bold font-mono">- Rp {adminFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 text-slate-900 text-[12px] font-extrabold">
                <span>Jumlah Diterima Bersih (Net):</span>
                <span className="font-mono text-indigo-700">
                  Rp {Math.round(netAmount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Nominal Box */}
          <div className="mb-8">
            <p className="text-[10px] text-slate-600 italic mb-1">Jumlah Uang Bersih Terbayar:</p>
            <div className="border-2 border-double border-slate-900 bg-slate-50 px-4 py-2 font-mono text-[15px] font-black text-slate-900 rounded-lg inline-block">
              RP {Math.round(netAmount).toLocaleString('id-ID')},-
            </div>
          </div>

          {/* 5. Tanda Tangan Standar UniversalDocumentSignatures */}
          <div className="mt-6 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="dual_custom"
              fontFamilyClass="font-sans"
              spacingHeightMm={18}
              signerLeft={signers.bendaharaKoperasi}
              signerRight={{
                roleTitle: 'Penerima Uang (Anggota)',
                personName: loan.member?.name || '-',
                nip: loan.member?.memberNo ? `No. Anggota: ${loan.member.memberNo}` : undefined,
                isAssigned: Boolean(loan.member?.name),
              }}
              overrideSignerLeft={{
                headerPrefix: 'Dibayarkan oleh,',
              }}
              overrideSignerRight={{
                headerPrefix: 'Diterima oleh,',
                topDate: signers.titimangsa,
              }}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default PrintLoanReceipt;
