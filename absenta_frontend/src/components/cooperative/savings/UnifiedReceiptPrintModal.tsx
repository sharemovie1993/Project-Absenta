import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';
import {
  formatIndonesianDateTime,
  formatTerbilangIndonesian,
} from '../../../utils/cooperative/coopDocUtils';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
import type { PrintUnifiedThermalSlipData } from './savingsExportUtils';

export interface UnifiedReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: PrintUnifiedThermalSlipData | null;
}

export const UnifiedReceiptPrintModal: React.FC<UnifiedReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const signers = useDocumentSigners();

  if (!receiptData) return null;

  const isWithdrawal = receiptData.transactionType === 'WITHDRAWAL';
  const docTitle = isWithdrawal
    ? 'BUKTI PENGELUARAN KAS / PENARIKAN SIMPANAN'
    : 'KUITANSI / BUKTI PENERIMAAN KAS KOPERASI';
  const subtitle = isWithdrawal
    ? 'Dokumen Resmi Penarikan Simpanan Anggota Koperasi'
    : 'Dokumen Resmi Transaksi Setoran & Pembayaran Anggota Koperasi';

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
      toast.error('Tidak ada lembar dokumen untuk diekspor');
      return;
    }

    const toastId = toast.loading('Mempersiapkan PDF Struk / Kuitansi Kasir...');
    try {
      setIsExportingPdf(true);
      const safeNo = (receiptData.receiptNumber || 'KUITANSI').replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportPrintSheetsToPdf(container, `KUITANSI_KASIR_${safeNo}.pdf`, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[UnifiedReceipt True WYSIWYG PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kuitansi / Bukti Transaksi Kasir (A4 Portrait)"
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
          footerText={`Dokumen Sah Bukti Transaksi Kasir Koperasi • No. ${receiptData.receiptNumber}`}
        >
          {/* 1. Kop Resmi Koperasi */}
          <CoopDocumentKop
            title={docTitle}
            subtitle={subtitle}
            docNumber={receiptData.receiptNumber}
          />

          {/* 2. Metadata Transaksi & Anggota */}
          <div className="mb-5 p-3.5 border border-slate-300 rounded-md bg-slate-50/70">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">No. Kuitansi</span>
                <span className="font-bold font-mono text-slate-900">: {receiptData.receiptNumber}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">Tanggal & Waktu</span>
                <span className="font-semibold text-slate-900">
                  : {formatIndonesianDateTime(receiptData.date)}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">Nama Anggota</span>
                <span className="font-bold text-slate-900">: {receiptData.memberName}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">Jenis Transaksi</span>
                <span className="font-bold text-slate-900">
                  : {isWithdrawal ? 'PENARIKAN TUNAI' : 'SETORAN / PEMBAYARAN TERPADU'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">No. Anggota</span>
                <span className="font-semibold text-slate-900">: {receiptData.memberNo || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600 shrink-0">Petugas / Kasir</span>
                <span className="font-semibold text-slate-900">: {receiptData.operatorName || '-'}</span>
              </div>
            </div>
          </div>

          {/* 3. Tabel Rincian Item Transaksi */}
          <div className="mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2">
              Rincian Transaksi
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-400 px-2.5 py-2 text-center w-10">No</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-left">Uraian Transaksi</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-left">Keterangan</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-right w-36">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-400 px-2.5 py-1.5 font-semibold text-slate-900">
                      {item.title}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-slate-600">
                      {item.subtext || '-'}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono font-semibold text-slate-900">
                      Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={3} className="border border-slate-400 px-2.5 py-2 text-right uppercase">
                    {isWithdrawal ? 'Total Diserahkan ke Anggota' : 'Total Pembayaran Diterima'}
                  </td>
                  <td className="border border-slate-400 px-2.5 py-2 text-right font-mono text-[12px]">
                    Rp {Number(receiptData.totalAmount || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
                {!isWithdrawal && receiptData.cashReceived !== undefined && (
                  <>
                    <tr>
                      <td colSpan={3} className="border border-slate-400 px-2.5 py-1.5 text-right text-slate-700">
                        Uang Tunai Diterima
                      </td>
                      <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono text-slate-900">
                        Rp {Number(receiptData.cashReceived || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="border border-slate-400 px-2.5 py-1.5 text-right text-slate-700">
                        Kembalian
                      </td>
                      <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono text-slate-900">
                        Rp {Number(receiptData.change || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>

          {/* 4. Terbilang */}
          <div className="mb-8 px-3.5 py-2.5 border border-slate-300 rounded bg-slate-50 text-[11px] italic text-slate-800">
            <span className="font-bold not-italic">Terbilang: </span>
            {formatTerbilangIndonesian(receiptData.totalAmount)}
          </div>

          {/* 5. Tanda Tangan Standar UniversalDocumentSignatures */}
          <div className="mt-8 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="dual_custom"
              fontFamilyClass="font-sans"
              spacingHeightMm={18}
              signerLeft={{
                roleTitle: isWithdrawal ? 'Penerima Dana' : 'Penyetor / Anggota',
                personName: receiptData.memberName,
                isAssigned: true,
              }}
              signerRight={signers.bendaharaKoperasi}
              overrideSignerLeft={{
                headerPrefix: isWithdrawal ? 'Diterima oleh,' : 'Disetorkan oleh,',
              }}
              overrideSignerRight={{
                headerPrefix: isWithdrawal ? 'Dibayarkan oleh,' : 'Diterima oleh,',
                topDate: signers.titimangsa,
              }}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
