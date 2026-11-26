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
import type { LoanDetailData, CooperativeSettings } from './types';

export interface PrintLoanAgreementProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanDetailData;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanAgreement: React.FC<PrintLoanAgreementProps> = ({
  isOpen,
  onClose,
  loan,
  coopSettings,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signers = useDocumentSigners();
  const signerToggles: CoopSignatureToggleItem[] = [
    { slot: 'left', label: 'Ketua Koperasi' },
    { slot: 'center', label: 'Peminjam (Anggota)' },
    { slot: 'right', label: 'Kepala Sekolah', isKepsek: true },
  ];
  const { visibility: sigVis, toggle: toggleSig } = useCoopSignatureToggles(signerToggles);

  const coopName = coopSettings?.cooperative_name || 'KOPERASI SEKOLAH';
  const amountNumber = parseFloat(loan.amount) || 0;
  const durationMonths = loan.duration;
  const interestRateVal = parseFloat(loan.interestRate) || 0;

  const monthlyInstallment = loan.installments?.[0]
    ? Math.round(parseFloat(loan.installments[0].amount))
    : Math.round((amountNumber + amountNumber * (interestRateVal / 100)) / (durationMonths || 1));

  const spkNo = `SPK/${loan.id.substring(0, 8).toUpperCase()}/${new Date(loan.createdAt).getFullYear()}`;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }
    const toastId = toast.loading('Mempersiapkan PDF Akad Perjanjian Pinjaman...');
    try {
      setIsExportingPdf(true);
      const safeNo = spkNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportPrintSheetsToPdf(container, `AKAD_PINJAMAN_${safeNo}.pdf`, 'portrait');
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[PrintLoanAgreement PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Surat Perjanjian Pinjaman / Akad Kredit (A4 Portrait)"
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
          footerText={`Dokumen Sah Surat Perjanjian Pinjaman (Akad Kredit) • No. ${spkNo}`}
        >
          {/* 1. Kop Resmi Koperasi */}
          <CoopDocumentKop
            title="SURAT PERJANJIAN PINJAMAN (AKAD KREDIT)"
            subtitle="Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah"
            docNumber={spkNo}
          />

          <div className="space-y-3.5 text-[11px] leading-relaxed font-serif text-slate-900">
            <p className="text-justify">
              Pada hari ini,{' '}
              <strong>
                {new Date(loan.createdAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              , telah disepakati perjanjian pinjaman dana koperasi simpan pinjam antara pihak-pihak di bawah ini:
            </p>

            {/* Identitas Para Pihak */}
            <div className="space-y-3 pl-3">
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-1 font-bold">I.</span>
                <div className="col-span-11 space-y-0.5">
                  <p className="font-bold uppercase">PENGURUS {coopName}</p>
                  <p className="text-slate-700 text-justify">
                    Bertindak atas nama {coopName}, selaku penyalur fasilitas simpan pinjam, untuk selanjutnya disebut
                    sebagai <strong>PIHAK PERTAMA</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-1 font-bold">II.</span>
                <div className="col-span-11 space-y-0.5">
                  <p className="font-bold uppercase">{loan.member?.name || '-'}</p>
                  <div className="grid grid-cols-12 gap-1 text-slate-800">
                    <span className="col-span-3">No. Anggota</span>
                    <span className="col-span-9">: {loan.member?.memberNo || '-'}</span>
                    <span className="col-span-3">Status</span>
                    <span className="col-span-9">: Anggota Koperasi</span>
                  </div>
                  <p className="text-slate-700 pt-0.5">
                    Selaku penerima fasilitas pinjaman, untuk selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-justify">
              Kedua belah pihak telah bersepakat untuk mengadakan perjanjian pinjaman uang dengan syarat dan ketentuan
              yang diatur dalam pasal-pasal berikut ini:
            </p>

            {/* Pasal-Pasal Perjanjian */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h4 className="font-bold text-center uppercase tracking-wide text-[11px]">
                  Pasal 1 — JUMLAH PINJAMAN DAN JANGKA WAKTU
                </h4>
                <p className="text-justify pl-3">
                  PIHAK PERTAMA memberikan pinjaman kepada PIHAK KEDUA sebesar{' '}
                  <strong>Rp {Math.round(amountNumber).toLocaleString('id-ID')}</strong> (Terbilang:{' '}
                  <em>{formatTerbilangIndonesian(amountNumber)}</em>). Pinjaman tersebut disepakati dalam jangka waktu
                  (tenor) selama <strong>{durationMonths} bulan</strong> terhitung sejak tanggal ditandatanganinya
                  perjanjian ini.
                </p>
              </div>

              <div className="space-y-0.5">
                <h4 className="font-bold text-center uppercase tracking-wide text-[11px]">
                  Pasal 2 — SUKU BUNGA DAN ANGSURAN
                </h4>
                <p className="text-justify pl-3">
                  Atas pinjaman tersebut, PIHAK KEDUA bersedia dikenakan jasa bunga koperasi sebesar{' '}
                  <strong>{interestRateVal}%</strong> flat per bulan. PIHAK KEDUA berkewajiban melakukan pembayaran
                  angsuran setiap bulannya sebesar{' '}
                  <strong>Rp {monthlyInstallment.toLocaleString('id-ID')} / bulan</strong> selama {durationMonths} bulan
                  berturut-turut.
                </p>
              </div>

              <div className="space-y-0.5">
                <h4 className="font-bold text-center uppercase tracking-wide text-[11px]">
                  Pasal 3 — MEKANISME PEMBAYARAN DAN PELUNASAN
                </h4>
                <p className="text-justify pl-3">
                  Pembayaran angsuran wajib disetorkan paling lambat tanggal jatuh tempo setiap bulan berjalan sesuai
                  jadwal kartu kendali angsuran melalui Bendahara {coopName} atau kanal pembayaran resmi koperasi.
                </p>
              </div>

              <div className="space-y-0.5">
                <h4 className="font-bold text-center uppercase tracking-wide text-[11px]">
                  Pasal 4 — SANKSI DAN KETENTUAN KHUSUS
                </h4>
                <p className="text-justify pl-3">
                  Apabila PIHAK KEDUA terlambat atau lalai melakukan pembayaran kewajibannya, PIHAK PERTAMA berhak
                  melakukan penagihan, pembatasan hak keanggotaan sementara, atau pemotongan saldo simpanan sesuai
                  dengan AD/ART {coopName}.
                </p>
              </div>
            </div>

            <p className="text-justify pt-1">
              Demikian Surat Perjanjian ini dibuat secara sadar, tanpa paksaan dari pihak mana pun, dan ditandatangani
              oleh para pihak untuk dipergunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Tanda Tangan Standar Tri-Party Koperasi */}
          <div className="mt-6 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="tri_party_coop"
              fontFamilyClass="font-serif"
              spacingHeightMm={16}
              signerLeft={signers.ketuaKoperasi}
              signerCenter={{
                roleTitle: 'Peminjam (Anggota)',
                personName: loan.member?.name || '-',
                nip: loan.member?.memberNo ? `No. Anggota: ${loan.member.memberNo}` : undefined,
                isAssigned: Boolean(loan.member?.name),
              }}
              signerRight={signers.kepsek}
              overrideSignerLeft={{
                headerPrefix: 'PIHAK PERTAMA,',
              }}
              overrideSignerCenter={{
                headerPrefix: 'PIHAK KEDUA,',
              }}
              overrideSignerRight={{
                headerPrefix: 'MENGETAHUI,',
                roleTitle: 'Kepala Sekolah / Pembina',
                topDate: signers.titimangsa,
              }}
              showSignerLeft={sigVis.left}
              showSignerCenter={sigVis.center}
              showSignerRight={sigVis.right}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default PrintLoanAgreement;
