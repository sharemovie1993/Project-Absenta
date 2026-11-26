import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { CoopSignatureToggleBar, useCoopSignatureToggles, type CoopSignatureToggleItem } from '../shared/CoopSignatureToggleBar';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
import { formatTerbilangIndonesian } from '../../../utils/cooperative/coopDocUtils';
import type { LoanDetailData, Installment, CooperativeSettings } from './types';

export interface PrintLoanRepaymentProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanDetailData;
  installment: Installment;
  installmentNo: number;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanRepayment: React.FC<PrintLoanRepaymentProps> = ({
  isOpen,
  onClose,
  loan,
  installment,
  installmentNo,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signers = useDocumentSigners();
  const signerToggles: CoopSignatureToggleItem[] = [
    { slot: 'left', label: 'Bendahara Penerima' },
    { slot: 'right', label: 'Penyetor (Anggota)' },
  ];
  const { visibility: sigVis, toggle: toggleSig } = useCoopSignatureToggles(signerToggles);

  const amountNumber = parseFloat(installment.amount) || 0;
  const paidYear = installment.paidDate
    ? new Date(installment.paidDate).getFullYear()
    : new Date().getFullYear();
  const receiptNo = `BSR/${loan.id.substring(0, 8).toUpperCase()}/${installmentNo}/${paidYear}`;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }
    const toastId = toast.loading('Mempersiapkan PDF Bukti Setor Angsuran...');
    try {
      setIsExportingPdf(true);
      const safeNo = receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportPrintSheetsToPdf(container, `SLIP_SETOR_${safeNo}.pdf`, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[PrintLoanRepayment PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Slip Setor Angsuran #${installmentNo} (A4 Portrait)`}
      subtitle="Standar Dokumen Resmi Koperasi • True WYSIWYG A4"
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Dokumen"
      subHeader={<CoopSignatureToggleBar items={signerToggles} visibility={sigVis} onToggle={toggleSig} />}
    >
      <div ref={sheetContainerRef} className="w-full flex flex-col items-center">
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={`Dokumen Sah Bukti Setor Angsuran Pinjaman • No. ${receiptNo}`}
        >
          {/* 1. Kop Resmi Koperasi */}
          <CoopDocumentKop
            title="BUKTI SETOR ANGSURAN PINJAMAN"
            subtitle="Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah"
            docNumber={receiptNo}
          />

          {/* 2. Detail Bukti Setor */}
          <div className="space-y-3.5 text-[11px] leading-relaxed mb-6">
            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-slate-600 font-semibold">Telah Diterima Dari</span>
              <span className="col-span-9 font-bold uppercase text-slate-900">
                : {loan.member?.name || '-'} ({loan.member?.memberNo || '-'})
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-slate-600 font-semibold">Uang Sejumlah</span>
              <span className="col-span-9 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded italic text-slate-900 text-[12px] font-bold">
                # {formatTerbilangIndonesian(amountNumber)} #
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 items-start">
              <span className="col-span-3 text-slate-600 font-semibold">Untuk Pembayaran</span>
              <span className="col-span-9 text-slate-800">
                : Penyetoran angsuran pinjaman KSP ke-<strong>{installmentNo}</strong> dari total tenor{' '}
                <strong>{loan.duration} bulan</strong>.
              </span>
            </div>

            {installment.paidDate && (
              <div className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-3 text-slate-600 font-semibold">Tanggal Transaksi</span>
                <span className="col-span-9 text-slate-800 font-medium">
                  :{' '}
                  {new Date(installment.paidDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* 3. Info Status Pinjaman */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2 mb-6 max-w-md ml-auto text-[11px]">
            <h4 className="font-bold text-[10px] uppercase text-slate-600 border-b border-dashed border-slate-300 pb-1">
              Informasi Status Pinjaman
            </h4>
            <div className="space-y-1.5 font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Plafon Pinjaman:</span>
                <span className="font-bold font-mono text-slate-900">
                  Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Angsuran Terbayar:</span>
                <span className="font-bold font-mono text-emerald-700">
                  Rp {Math.round(amountNumber).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 text-slate-900 border-t border-dashed border-slate-300 font-extrabold">
                <span>Status Cicilan:</span>
                <span className="uppercase text-indigo-700">
                  LUNAS (Angsuran {installmentNo}/{loan.duration})
                </span>
              </div>
            </div>
          </div>

          {/* 4. Nominal Box */}
          <div className="mb-8">
            <p className="text-[10px] text-slate-600 italic mb-1">Jumlah Uang Setoran:</p>
            <div className="border-2 border-double border-slate-900 bg-slate-50 px-4 py-2 font-mono text-[15px] font-black text-slate-900 rounded-lg inline-block">
              RP {Math.round(amountNumber).toLocaleString('id-ID')},-
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
                roleTitle: 'Penyetor (Anggota)',
                personName: loan.member?.name || '-',
                nip: loan.member?.memberNo ? `No. Anggota: ${loan.member.memberNo}` : undefined,
                isAssigned: Boolean(loan.member?.name),
              }}
              overrideSignerLeft={{
                headerPrefix: 'Diterima oleh,',
                roleTitle: 'Bendahara Penerima',
              }}
              overrideSignerRight={{
                headerPrefix: 'Disetorkan oleh,',
                topDate: signers.titimangsa,
              }}
              showSignerLeft={sigVis.left}
              showSignerRight={sigVis.right}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default PrintLoanRepayment;
