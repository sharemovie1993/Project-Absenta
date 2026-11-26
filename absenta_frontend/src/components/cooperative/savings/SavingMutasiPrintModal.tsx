import React, { useRef, useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import toast from 'react-hot-toast';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../../utils/cooperative/coopDocUtils';
import { cleanMemoDescription, exportTransactions, type FlatTransaction } from './savingsExportUtils';

export interface SavingMutasiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: FlatTransaction[];
  startDate: string;
  endDate: string;
  signatures?: {
    ketua?: string;
    bendahara?: string;
    kepsek?: string;
  };
  logoUrl?: string;
}

export const SavingMutasiPrintModal: React.FC<SavingMutasiPrintModalProps> = ({
  isOpen,
  onClose,
  transactions,
  startDate,
  endDate,
  signatures,
  logoUrl,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { rawSekolah, tenantInfo } = usePrintHeaderData();
  const sekolah = (rawSekolah || {}) as any;
  const kota = sekolah?.kabupaten_kota || sekolah?.kota || tenantInfo?.kota || 'Purwakarta';
  const kepalaSekolah =
    signatures?.kepsek ||
    sekolah?.kepala_sekolah ||
    sekolah?.nama_kepala_sekolah ||
    '........................................';
  const nipKepalaSekolah = sekolah?.nip_kepala_sekolah || '........................................';
  const ketuaName = signatures?.ketua || '........................................';
  const bendaharaName = signatures?.bendahara || '........................................';
  const todayLabel = formatIndonesianDate(new Date());
  const periodStr = `${formatIndonesianDate(startDate)} s/d ${formatIndonesianDate(endDate)}`;

  const { totalDeposit, totalWithdrawal, netMutasi } = useMemo(() => {
    let dep = 0;
    let wdr = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'DEPOSIT' || t.type === 'INTEREST') dep += amt;
      else wdr += amt;
    });
    return { totalDeposit: dep, totalWithdrawal: wdr, netMutasi: dep - wdr };
  }, [transactions]);

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

    const toastId = toast.loading('Mempersiapkan PDF Rekap Mutasi Kas...');
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

      pdf.save(`REKAP_MUTASI_KAS_KOPERASI_${startDate}_sd_${endDate}.pdf`);
      toast.success('File PDF Rekap Mutasi Kas berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[SavingMutasi True WYSIWYG Error, fallback to Vector Engine]', err);
      toast.dismiss(toastId);
      await exportTransactions('PDF', startDate, endDate, logoUrl);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rekap Mutasi Kas Koperasi (A4 Portrait)"
      subtitle={`Periode: ${periodStr} • Standar Universal Document Printing`}
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

            {/* 2. Judul Laporan */}
            <div className="text-center mb-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 underline underline-offset-4">
                LAPORAN REKAPITULASI MUTASI KAS SIMPANAN KOPERASI
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                Periode: {periodStr}
              </p>
            </div>

            {/* 3. Ringkasan Rekapitulasi */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-lg border border-slate-300 bg-slate-50/70 text-[10px] mb-4">
              <div>
                <span className="block text-slate-500 font-semibold uppercase">Total Transaksi</span>
                <span className="font-mono font-black text-slate-900 text-xs">{transactions.length} Data</span>
              </div>
              <div>
                <span className="block text-slate-500 font-semibold uppercase">Total Setoran (+)</span>
                <span className="font-mono font-black text-emerald-700 text-xs">
                  +Rp {totalDeposit.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 font-semibold uppercase">Total Penarikan (-)</span>
                <span className="font-mono font-black text-rose-700 text-xs">
                  -Rp {totalWithdrawal.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 font-semibold uppercase">Mutasi Netto</span>
                <span className="font-mono font-black text-slate-900 text-xs">
                  Rp {netMutasi.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* 4. Tabel Mutasi Kas */}
            <table className="w-full border-collapse border border-slate-400 text-[9.5px] mb-4">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  <th className="border border-slate-400 py-1.5 px-1.5 w-7 text-center">No</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-left">Tanggal &amp; Waktu</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-left">Anggota</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-left">Rekening</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-center">Jenis</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-right">Nominal</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isDep = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                  const amt = Number(tx.amount) || 0;
                  return (
                    <tr key={`${tx.memberNo}-${tx.date}-${idx}`}>
                      <td className="border border-slate-400 py-1 px-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 py-1 px-1.5 whitespace-nowrap">
                        {formatIndonesianDateTime(tx.date)}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5">
                        <span className="font-semibold">{tx.memberName}</span>
                        <span className="block text-[8.5px] text-slate-500 font-mono">No. {tx.memberNo}</span>
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5">{tx.savingType || '-'}</td>
                      <td className="border border-slate-400 py-1 px-1.5 text-center font-semibold">
                        {isDep ? 'SETORAN' : 'PENARIKAN'}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 text-right font-mono font-bold whitespace-nowrap">
                        {isDep ? '+' : '-'}Rp {amt.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5">
                        {cleanMemoDescription(tx.description)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Tanda Tangan 2-Tier Standar Resmi */}
          <div className="mt-6 pt-2 text-[11px] leading-snug break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 text-center mb-5">
              <div>
                <p className="text-slate-600">Diverifikasi oleh,</p>
                <p className="font-bold text-slate-900">Ketua Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( {ketuaName} )</p>
              </div>
              <div>
                <p className="text-slate-600">{kota}, {todayLabel}</p>
                <p className="font-bold text-slate-900">Bendahara Koperasi</p>
                <div className="h-14" />
                <p className="font-bold underline">( {bendaharaName} )</p>
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
