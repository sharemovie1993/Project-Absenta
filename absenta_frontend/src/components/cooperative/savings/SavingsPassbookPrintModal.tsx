import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import toast from 'react-hot-toast';
import type { Saving, Transaction } from './types';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../../utils/cooperative/coopDocUtils';
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
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { rawSekolah, tenantInfo } = usePrintHeaderData();
  const sekolah = (rawSekolah || {}) as any;
  const kota = sekolah?.kabupaten_kota || sekolah?.kota || tenantInfo?.kota || 'Purwakarta';
  const kepalaSekolah = sekolah?.kepala_sekolah || sekolah?.nama_kepala_sekolah || '........................................';
  const nipKepalaSekolah = sekolah?.nip_kepala_sekolah || '........................................';
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

      const safeNo = (member?.memberNo || 'ANGGOTA').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = isAll
        ? `REKAP_BUKU_TABUNGAN_${safeNo}.pdf`
        : `MUTASI_${(selectedSaving?.category?.code || 'SIMPANAN').toUpperCase()}_${safeNo}.pdf`;

      pdf.save(fileName);
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
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Dokumen"
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

            {/* 2. Judul Dokumen */}
            <div className="text-center mb-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 underline underline-offset-4">
                {docTitle}
              </h2>
            </div>

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

          {/* 6. Tanda Tangan 2-Tier Standar Resmi */}
          <div className="mt-6 pt-2 text-[11px] leading-snug break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 text-center mb-5">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900">Ketua Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( ........................................ )</p>
              </div>
              <div>
                <p className="text-slate-600">{kota}, {todayLabel}</p>
                <p className="font-bold text-slate-900">Bendahara / Petugas Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( ........................................ )</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-600">Menyetujui / Pembina Koperasi,</p>
              <p className="font-bold text-slate-900">Kepala Sekolah</p>
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
