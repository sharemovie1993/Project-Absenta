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
import type { LoanDetailData, CooperativeSettings } from './types';

export interface PrintLoanCardProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanDetailData;
  remainingBalance: number;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanCard: React.FC<PrintLoanCardProps> = ({
  isOpen,
  onClose,
  loan,
  remainingBalance,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signers = useDocumentSigners();

  const cardNo = `KKP/${loan.id.substring(0, 8).toUpperCase()}/${new Date(loan.createdAt).getFullYear()}`;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }
    const toastId = toast.loading('Mempersiapkan PDF Kartu Kendali Angsuran...');
    try {
      setIsExportingPdf(true);
      const safeNo = (loan.member?.memberNo || loan.id.substring(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportPrintSheetsToPdf(container, `KARTU_KENDALI_PINJAMAN_${safeNo}.pdf`, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[PrintLoanCard PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kartu Kendali Angsuran Pinjaman (A4 Portrait)"
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
          footerText={`Dokumen Sah Kartu Kendali Pinjaman Koperasi • No. ${cardNo}`}
        >
          {/* 1. Kop Resmi Koperasi */}
          <CoopDocumentKop
            title="KARTU KENDALI ANGSURAN PINJAMAN"
            subtitle="Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah"
            docNumber={cardNo}
          />

          {/* 2. Profile and Metrics Panel */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Anggota</p>
              <h4 className="text-[11px] font-bold text-slate-900 mt-1 uppercase truncate">
                {loan.member?.name || '-'}
              </h4>
              <p className="text-[9px] text-slate-600 font-mono font-bold mt-0.5">
                No: {loan.member?.memberNo || '-'}
              </p>
              <p className="text-[9px] text-slate-700 font-bold mt-1.5">Status: {loan.status}</p>
            </div>
            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Total Nilai Pinjaman
              </p>
              <h4 className="text-[12px] font-bold font-mono text-slate-900 mt-1">
                Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}
              </h4>
              <p className="text-[9px] text-slate-600 mt-1.5">Bunga: {loan.interestRate}% / bln</p>
            </div>
            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Sisa Saldo Tagihan
              </p>
              <h4 className="text-[12px] font-bold font-mono text-rose-700 mt-1">
                Rp {Math.round(remainingBalance).toLocaleString('id-ID')}
              </h4>
              <p className="text-[9px] text-slate-600 mt-1.5">Pokok + Jasa Bunga</p>
            </div>
            <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Tenor / Jangka Waktu
              </p>
              <h4 className="text-[12px] font-bold text-slate-900 mt-1">{loan.duration} Bulan</h4>
              <p className="text-[9px] text-slate-600 mt-1.5">Cicilan bulanan</p>
            </div>
          </div>

          {/* 3. Tabel Jadwal Rincian Angsuran */}
          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2">
              Jadwal Rincian Angsuran
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-400 px-2.5 py-1.5 text-center font-bold w-16">
                    Angsuran
                  </th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-left font-bold">
                    Jatuh Tempo
                  </th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-right font-bold">
                    Jumlah Tagihan
                  </th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-center font-bold w-28">
                    Status
                  </th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-left font-bold">
                    Tanggal Bayar
                  </th>
                </tr>
              </thead>
              <tbody>
                {loan.installments?.map((ins, index) => (
                  <tr key={ins.id}>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-center font-semibold text-slate-900">
                      Ke-{index + 1}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-slate-800">
                      {new Date(ins.dueDate).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-right font-mono font-bold text-slate-900">
                      Rp {Math.round(parseFloat(ins.amount)).toLocaleString('id-ID')}
                    </td>
                    <td
                      className={`border border-slate-400 px-2.5 py-1.5 text-center font-bold ${
                        ins.status === 'PAID' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {ins.status === 'PAID' ? 'LUNAS' : 'BELUM LUNAS'}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 text-slate-700">
                      {ins.paidDate
                        ? new Date(ins.paidDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Tanda Tangan Standar 2-Tier UniversalDocumentSignatures */}
          <div className="mt-6 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="triangle_2tier"
              fontFamilyClass="font-sans"
              spacingHeightMm={16}
              signerLeft={signers.ketuaKoperasi}
              signerRight={signers.bendaharaKoperasi}
              signerBottom={signers.kepsek}
              verifierLabel="Mengetahui,"
              makerLabel="Disiapkan Oleh,"
              notesOrApprovalLabel="Menyetujui / Pembina Koperasi,"
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default PrintLoanCard;
