import React, { useRef, useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { CoopSignatureToggleBar, useCoopSignatureToggles, type CoopSignatureToggleItem } from '../shared/CoopSignatureToggleBar';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import toast from 'react-hot-toast';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../../utils/cooperative/coopDocUtils';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signerToggles: CoopSignatureToggleItem[] = [
    { slot: 'left', label: 'Ketua Koperasi' },
    { slot: 'right', label: 'Bendahara Koperasi' },
    { slot: 'bottom', label: 'Kepala Sekolah', isKepsek: true },
  ];
  const { visibility: sigVis, toggle: toggleSig } = useCoopSignatureToggles(signerToggles);

  const signers = useDocumentSigners({
    customSigners: {
      ketuaKoperasi: signatures?.ketua ? { personName: signatures.ketua } : undefined,
      bendaharaKoperasi: signatures?.bendahara ? { personName: signatures.bendahara } : undefined,
      kepsek: signatures?.kepsek ? { personName: signatures.kepsek } : undefined,
    },
  });
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
      await exportPrintSheetsToPdf(
        container,
        `REKAP_MUTASI_KAS_KOPERASI_${startDate}_sd_${endDate}.pdf`,
        'portrait'
      );
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
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Dokumen"
      size="5xl"
      subHeader={<CoopSignatureToggleBar items={signerToggles} visibility={sigVis} onToggle={toggleSig} />}
    >
      <div ref={sheetContainerRef} className="space-y-6 flex flex-col items-center">
        <PrintDocumentSheet orientation="portrait" className="flex flex-col justify-between text-slate-900">
          <div>
            {/* 1. Kop Resmi Koperasi */}
            <CoopDocumentKop
              subtitle="LAPORAN REKAPITULASI MUTASI KAS SIMPANAN KOPERASI"
              subtext={`Periode: ${periodStr}`}
            />

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

          {/* 5. Tanda Tangan Standar UniversalDocumentSignatures */}
          <div className="mt-6 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="triangle_2tier"
              fontFamilyClass="font-sans"
              spacingHeightMm={16}
              signerLeft={signers.ketuaKoperasi}
              signerRight={signers.bendaharaKoperasi}
              signerBottom={signers.kepsek}
              verifierLabel="Diverifikasi oleh,"
              makerLabel="Disiapkan oleh,"
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
