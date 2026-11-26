import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';
import type { Saving, Transaction } from './types';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../../utils/cooperative/coopDocUtils';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
import { cleanMemoDescription, exportAllSavingsPdf, exportSingleSavingPdf } from './savingsExportUtils';

export interface SavingsPassbookPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  member: any;
  effectiveSavings: Saving[];
  selectedSaving: Saving | null;
  displayedTransactions: Array<Transaction & { savingCategoryName?: string; savingCode?: string }>;
  grandTotalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  logoUrl?: string;
}

export const SavingsPassbookPrintModal: React.FC<SavingsPassbookPrintModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  member,
  effectiveSavings,
  selectedSaving,
  displayedTransactions,
  grandTotalBalance,
  totalDeposits,
  totalWithdrawals,
  logoUrl,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const signers = useDocumentSigners();
  const todayLabel = formatIndonesianDate(new Date());

  const isAll = activeTab === 'ALL';
  const activeBalance = isAll
    ? grandTotalBalance
    : parseFloat(String(selectedSaving?.amount || 0)) || 0;
  const docTitle = isAll
    ? 'REKAPITULASI BUKU TABUNGAN ANGGOTA'
    : `MUTASI REKENING ${(selectedSaving?.category?.name || selectedSaving?.type || 'SIMPANAN').toUpperCase()}`;

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

    const toastId = toast.loading('Mempersiapkan PDF Rekap Buku Tabungan...');
    try {
      setIsExportingPdf(true);
      const safeNo = (member?.memberNo || 'ANGGOTA').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = isAll
        ? `REKAP_BUKU_TABUNGAN_${safeNo}.pdf`
        : `MUTASI_${(selectedSaving?.category?.code || 'SIMPANAN').toUpperCase()}_${safeNo}.pdf`;

      await exportPrintSheetsToPdf(container, fileName, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[Passbook True WYSIWYG PDF Error, falling back to Vector Engine]', err);
      toast.dismiss(toastId);
      const primary = selectedSaving || effectiveSavings[0];
      if (primary) {
        const normalizedPrimary = primary.member ? primary : ({ ...primary, member } as Saving);
        const normalizedList = effectiveSavings.map((s) => (s.member ? s : ({ ...s, member } as Saving)));
        if (isAll) {
          await exportAllSavingsPdf(normalizedPrimary, normalizedList, logoUrl);
        } else {
          await exportSingleSavingPdf(normalizedPrimary, logoUrl);
        }
      } else {
        toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAll ? 'Cetak Rekap Buku Tabungan (A4 Portrait)' : 'Cetak Mutasi Rekening (A4 Portrait)'}
      subtitle="Standar Dokumen Resmi Koperasi • True WYSIWYG A4"
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Dokumen"
      size="5xl"
    >
      <div ref={sheetContainerRef} className="space-y-6 flex flex-col items-center">
        <PrintDocumentSheet orientation="portrait" className="flex flex-col justify-between text-slate-900">
          <div>
            {/* 1. Kop Resmi Koperasi */}
            <CoopDocumentKop
              subtitle={docTitle}
              subtext="Dokumen Rekapitulasi Simpanan Anggota Koperasi"
            />

            {/* 3. Identitas Anggota & Ringkasan Saldo */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-300 bg-slate-50/70 text-[11px] mb-4">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-600">Nama Anggota</span>
                  <span className="font-bold text-slate-900 uppercase">: {member?.name || 'Anggota Koperasi'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-600">No. Anggota</span>
                  <span className="font-mono font-bold text-slate-900">: {member?.memberNo || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-600">Status</span>
                  <span className="font-semibold text-slate-900">
                    : {member?.siswaId ? 'Siswa' : member?.guruId ? 'Guru / Pegawai' : 'Umum'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Tanggal Cetak</span>
                  <span className="font-semibold text-slate-900">: {todayLabel}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Jumlah Rekening</span>
                  <span className="font-semibold text-slate-900">: {effectiveSavings.length} Rekening</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600">Total Saldo</span>
                  <span className="font-mono font-black text-slate-900">: Rp {activeBalance.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* 4. Ringkasan Saldo Per Rekening (sesuai urutan kategori) */}
            {isAll && effectiveSavings.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ringkasan Rekening Simpanan
                </p>
                <table className="w-full border-collapse border border-slate-400 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                      <th className="border border-slate-400 py-1.5 px-2 w-8 text-center">No</th>
                      <th className="border border-slate-400 py-1.5 px-2 text-left">Jenis Simpanan</th>
                      <th className="border border-slate-400 py-1.5 px-2 text-center w-24">Kode</th>
                      <th className="border border-slate-400 py-1.5 px-2 text-right w-36">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveSavings.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="border border-slate-400 py-1 px-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-400 py-1 px-2 font-semibold">
                          {s.category?.name || s.type || 'Simpanan'}
                        </td>
                        <td className="border border-slate-400 py-1 px-2 text-center font-mono">
                          {s.category?.code || s.type || '-'}
                        </td>
                        <td className="border border-slate-400 py-1 px-2 text-right font-mono font-bold">
                          Rp {(parseFloat(String(s.amount)) || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Tabel Rincian Mutasi */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                <span>Rincian Mutasi ({displayedTransactions.length} Transaksi)</span>
                <span>
                  Setoran: +Rp {totalDeposits.toLocaleString('id-ID')} | Penarikan: -Rp {totalWithdrawals.toLocaleString('id-ID')}
                </span>
              </div>
              <table className="w-full border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold">
                    <th className="border border-slate-400 py-1.5 px-2 w-8 text-center">No</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Tanggal &amp; Waktu</th>
                    {isAll && <th className="border border-slate-400 py-1.5 px-2 text-left">Rekening</th>}
                    <th className="border border-slate-400 py-1.5 px-2 text-center">Jenis</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-right">Nominal</th>
                    <th className="border border-slate-400 py-1.5 px-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAll ? 6 : 5}
                        className="border border-slate-400 py-4 text-center text-slate-500 italic"
                      >
                        Belum ada riwayat mutasi transaksi.
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx, idx) => {
                      const isDep = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                      const amt = parseFloat(String(tx.amount)) || 0;
                      return (
                        <tr key={tx.id || idx}>
                          <td className="border border-slate-400 py-1 px-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-400 py-1 px-2 whitespace-nowrap">
                            {formatIndonesianDateTime(tx.date)}
                          </td>
                          {isAll && (
                            <td className="border border-slate-400 py-1 px-2">
                              {tx.savingCategoryName || 'Simpanan'}
                            </td>
                          )}
                          <td className="border border-slate-400 py-1 px-2 text-center font-semibold">
                            {isDep ? 'SETORAN' : 'PENARIKAN'}
                          </td>
                          <td className="border border-slate-400 py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                            {isDep ? '+' : '-'}Rp {amt.toLocaleString('id-ID')}
                          </td>
                          <td className="border border-slate-400 py-1 px-2">
                            {cleanMemoDescription(tx.description)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Tanda Tangan Standar UniversalDocumentSignatures */}
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
