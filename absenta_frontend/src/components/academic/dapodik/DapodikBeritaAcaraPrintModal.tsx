/**
 * DapodikBeritaAcaraPrintModal.tsx
 * Modal Cetak & Ekspor PDF True WYSIWYG Berita Acara Dapodik:
 * 1. Berita Acara Verifikasi & Validasi Data Siswa Menurut Usia (LPPD - Sumber Dapodik)
 * 2. Berita Acara Rekonsiliasi Dapodik <-> Absenta
 * Standar Industri: Universal Document Printing, Dual-Engine PDF Export, & Universal Signature Engine.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import type { ReconciledStudent, ReconciliationSummary } from '@/api/dapodik.api';
import {
  computeDapodikAgeDistribution,
  getTodayIsoDate,
} from '@/utils/dapodik/dapodikAgeStats';
import { generatePdfDapodikBeritaAcara } from '@/utils/print/modules/pdfDapodikBeritaAcara';
import {
  DapodikBeritaAcaraSignersDrawer,
  type DapodikEditableSignerState,
} from './DapodikBeritaAcaraSignersDrawer';

export type DapodikPrintTemplateId = 'lppd_usia' | 'rekon_absenta';

export interface DapodikBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: ReconciliationSummary;
  students: ReconciledStudent[];
  templateName?: string;
  initialTemplate?: DapodikPrintTemplateId;
  initialReferenceDate?: string;
  dapodikHost: string;
  npsn: string;
  lastCheckAt?: string;
  sourceMode?: 'LIVE' | 'STAGING';
}

const TEMPLATE_OPTIONS = [
  {
    id: 'lppd_usia',
    label: 'Verval Usia Siswa LPPD (Dapodik)',
    badge: 'LPPD',
  },
  {
    id: 'rekon_absenta',
    label: 'Rekonsiliasi Dapodik–Absenta',
    badge: 'Audit',
  },
];

function formatIndoLongDate(isoDateStr?: string): string {
  const safe = isoDateStr ? new Date(`${isoDateStr.split('T')[0]}T00:00:00`) : new Date();
  if (Number.isNaN(safe.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return safe.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatIndoWeekdayDate(isoDateStr?: string): string {
  const safe = isoDateStr ? new Date(`${isoDateStr.split('T')[0]}T00:00:00`) : new Date();
  if (Number.isNaN(safe.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return safe.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const DapodikBeritaAcaraPrintModal: React.FC<DapodikBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  summary,
  students,
  templateName = 'Audit Standar',
  initialTemplate = 'lppd_usia',
  initialReferenceDate,
  dapodikHost,
  npsn,
  lastCheckAt,
  sourceMode = 'STAGING',
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DapodikPrintTemplateId>(initialTemplate);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Parameter Verval LPPD & Naskah
  const [referenceDate, setReferenceDate] = useState<string>(
    initialReferenceDate || getTodayIsoDate()
  );
  const [showGenderAndGradeBreakdown, setShowGenderAndGradeBreakdown] = useState<boolean>(true);
  const [includeKepsekTier, setIncludeKepsekTier] = useState<boolean>(true);
  const [documentNumber, setDocumentNumber] = useState<string>(
    `421.5/BA-LPPD/${new Date().getFullYear()}/TU`
  );

  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  // SSOT Organizational Signers Resolver
  const autoSigners = useDocumentSigners();

  const [cabangDinasWilayah, setCabangDinasWilayah] = useState<string>('');
  const [kabupatenKota, setKabupatenKota] = useState<string>('');
  const [titimangsaCity, setTitimangsaCity] = useState<string>('');
  const [titimangsaDate, setTitimangsaDate] = useState<string>('');

  const [operatorSigner, setOperatorSigner] = useState<DapodikEditableSignerState>({
    roleTitle: 'Yang Menyerahkan Data,\nOperator Dapodik',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });
  const [verifikatorSigner, setVerifikatorSigner] = useState<DapodikEditableSignerState>({
    roleTitle: 'Verifikator Data,',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });
  const [kepsekSigner, setKepsekSigner] = useState<DapodikEditableSignerState>({
    roleTitle: 'Kepala Sekolah',
    personName: '........................................',
    nip: '',
    signatureImage: null,
  });

  // Sync template & reference date when modal opens from specific entry point
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(initialTemplate);
      if (initialReferenceDate) {
        setReferenceDate(initialReferenceDate);
      }
    }
  }, [isOpen, initialTemplate, initialReferenceDate]);

  const applyResolvedSigners = useCallback(() => {
    const resolvedCity = sekolahData?.kota || autoSigners.city || 'Purwakarta';
    const resolvedCabang =
      tenantInfo?.nama_cabang_dinas ||
      sekolahData?.nama_cabang_dinas ||
      'Cabang Dinas Pendidikan Wilayah IV';

    setCabangDinasWilayah(resolvedCabang);
    setKabupatenKota(resolvedCity);
    setTitimangsaCity(resolvedCity);
    setTitimangsaDate(formatIndoLongDate(getTodayIsoDate()));

    setOperatorSigner((prev) => ({
      roleTitle: 'Yang Menyerahkan Data,\nOperator Dapodik',
      personName: autoSigners.tuKepegawaian.isAssigned
        ? autoSigners.tuKepegawaian.personName
        : '........................................',
      nip: autoSigners.tuKepegawaian.nip || '',
      signatureImage: prev.signatureImage,
    }));

    setVerifikatorSigner((prev) => ({
      roleTitle:
        selectedTemplate === 'lppd_usia'
          ? 'Verifikator Data,'
          : autoSigners.kepalaTu.roleTitle || 'Kepala Urusan Tata Usaha,',
      personName:
        selectedTemplate === 'rekon_absenta' && autoSigners.kepalaTu.isAssigned
          ? autoSigners.kepalaTu.personName
          : '........................................',
      nip:
        selectedTemplate === 'rekon_absenta' && autoSigners.kepalaTu.isAssigned
          ? autoSigners.kepalaTu.nip || ''
          : '',
      signatureImage: prev.signatureImage,
    }));

    setKepsekSigner((prev) => ({
      roleTitle: `Kepala ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'}`,
      personName:
        autoSigners.kepsek.personName ||
        sekolahData?.kepala_sekolah ||
        '........................................',
      nip: autoSigners.kepsek.nip || sekolahData?.nip_kepala || '',
      signatureImage: prev.signatureImage,
    }));
  }, [autoSigners, sekolahData, tenantInfo, selectedTemplate]);

  // Auto-resolve once organizational structure finishes loading
  const [hasInitializedSigners, setHasInitializedSigners] = useState(false);
  useEffect(() => {
    if (isOpen && !autoSigners.isLoading && !hasInitializedSigners) {
      applyResolvedSigners();
      setHasInitializedSigners(true);
    }
  }, [isOpen, autoSigners.isLoading, hasInitializedSigners, applyResolvedSigners]);

  // Re-adjust default document number prefix when switching template mode
  useEffect(() => {
    const year = new Date().getFullYear();
    setDocumentNumber((prev) => {
      if (selectedTemplate === 'lppd_usia' && prev.includes('BA-REKON')) {
        return `421.5/BA-LPPD/${year}/TU`;
      }
      if (selectedTemplate === 'rekon_absenta' && prev.includes('BA-LPPD')) {
        return `421.5/BA-REKON/${year}/TU`;
      }
      return prev;
    });
  }, [selectedTemplate]);

  // Hitung distribusi usia siswa KHUSUS sumber Dapodik
  const ageStats = useMemo(
    () => computeDapodikAgeDistribution(students, referenceDate),
    [students, referenceDate]
  );

  const mismatchSample = useMemo(
    () => students.filter((s) => s.status === 'MISMATCH').slice(0, 10),
    [students]
  );

  const sourceLabel =
    sourceMode === 'STAGING'
      ? 'Dapodik Lokal (Staging Snapshot)'
      : 'Web Service Dapodik (Live Port 5774)';

  const auditDateText = useMemo(() => {
    const d = lastCheckAt ? new Date(lastCheckAt) : new Date();
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [lastCheckAt]);

  const auditTime = useMemo(() => {
    const d = lastCheckAt ? new Date(lastCheckAt) : new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }, [lastCheckAt]);

  const cutoffDateText = useMemo(() => formatIndoLongDate(referenceDate), [referenceDate]);

  // Dual-Engine PDF Export (Engine 1: html2canvas-pro WYSIWYG, Engine 2: jsPDF+autoTable fallback)
  const handleDownloadPdf = async () => {
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    const filePrefix =
      selectedTemplate === 'lppd_usia'
        ? `BA_VERVAL_USIA_LPPD_DAPODIK_${npsn || 'SEKOLAH'}`
        : `BA_REKONSILIASI_DAPODIK_${npsn || 'SEKOLAH'}`;

    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan PDF True WYSIWYG...', { id: 'dapodik-pdf-toast' });

      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        void deskCanvas.offsetHeight;
      }
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));

      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        throw new Error('Lembar dokumen tidak ditemukan');
      }

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

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) pdf.addPage('a4', 'portrait');
        const sheet = sheetElements[i] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              (clonedDesk.style as any).transform = 'none';
            }
            clonedDoc.querySelectorAll('.print-sheet').forEach((s: any) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgHeight = Math.min(pdfHeight, (pdfWidth * canvas.height) / canvas.width);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      }

      pdf.save(`${filePrefix}.pdf`);
      toast.success('Dokumen PDF berhasil diunduh.', { id: 'dapodik-pdf-toast' });
    } catch {
      // Engine 2 Fallback Programmatic Vector Generator (jsPDF + autoTable)
      try {
        const { blobUrl } = generatePdfDapodikBeritaAcara({
          mode: selectedTemplate,
          documentNumber,
          auditDateText: formatIndoWeekdayDate(getTodayIsoDate()),
          cutoffDateText,
          sourceLabel,
          cabangDinasWilayah,
          kabupatenKota,
          npsn,
          dapodikHost,
          templateName,
          showGenderAndGradeBreakdown,
          includeKepsekTier,
          ageStats,
          reconciliationSummary: summary,
          sekolah: {
            nama: sekolahData?.nama || tenantInfo.name || 'SATUAN PENDIDIKAN',
            alamat: tenantInfo.address,
            kota: kabupatenKota || sekolahData?.kota || 'Purwakarta',
            telepon: tenantInfo.phone,
            email: tenantInfo.email,
            website: tenantInfo.website,
            nama_dinas_atas: tenantInfo.nama_dinas_atas,
            nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
            nama_cabang_dinas: cabangDinasWilayah || tenantInfo.nama_cabang_dinas,
            print_header_lines: tenantInfo.print_header_lines,
          },
          options: {
            logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
            logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
          },
          signers: {
            operatorDapodik: {
              ...operatorSigner,
              isAssigned: Boolean(operatorSigner.personName),
            },
            verifikatorData: {
              ...verifikatorSigner,
              isAssigned: Boolean(verifikatorSigner.personName),
            },
            kepsek: {
              ...kepsekSigner,
              isAssigned: Boolean(kepsekSigner.personName),
            },
            titimangsaCity: titimangsaCity || kabupatenKota || 'Purwakarta',
            titimangsaDate: titimangsaDate || formatIndoLongDate(getTodayIsoDate()),
          },
        });
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${filePrefix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Dokumen PDF (Vector Fallback) berhasil diunduh.', { id: 'dapodik-pdf-toast' });
      } catch {
        toast.error('Gagal mengekspor dokumen PDF.', { id: 'dapodik-pdf-toast' });
      }
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  const bucketByKey = new Map(ageStats.buckets.map((b) => [b.key, b]));

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedTemplate === 'lppd_usia'
          ? 'Berita Acara Verval Data Siswa Menurut Usia (LPPD 2026)'
          : 'Pratinjau Cetak Berita Acara Rekonsiliasi Dapodik'
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 px-2.5 py-0.5 rounded-md">
            Sumber: Dapodik ({ageStats.totalDapodikStudents.toLocaleString('id-ID')} Siswa)
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Standar A4 Portrait &amp; Universal Signature
          </span>
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      templateOptions={TEMPLATE_OPTIONS}
      selectedTemplate={selectedTemplate}
      onTemplateChange={(id) => setSelectedTemplate(id as DapodikPrintTemplateId)}
      templateLabel="Format Dokumen:"
      extraActions={
        <button
          type="button"
          onClick={() => setIsDrawerOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isDrawerOpen
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title="Atur Tanggal Cut-Off Usia, Nomor Dokumen, & Tanda Tangan Digital"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Atur TTD &amp; Parameter</span>
        </button>
      }
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses...' : 'Unduh PDF'}
      defaultWaFilename={
        selectedTemplate === 'lppd_usia'
          ? `BA_VERVAL_USIA_LPPD_DAPODIK_${npsn || 'SEKOLAH'}.pdf`
          : `BA_REKONSILIASI_DAPODIK_${npsn || 'SEKOLAH'}.pdf`
      }
      defaultWaCaption={
        selectedTemplate === 'lppd_usia'
          ? `Yth. Bapak/Ibu, terlampir Berita Acara Verval Data Usia Siswa Dapodik (LPPD) ${sekolahData?.nama || tenantInfo.name || ''} per tanggal ${cutoffDateText}.`
          : `Yth. Bapak/Ibu, terlampir Berita Acara Rekonsiliasi Data Dapodik – Absenta ${sekolahData?.nama || tenantInfo.name || ''}.`
      }
      onPrint={() => window.print()}
      printButtonText="Cetak"
      size="5xl"
    >
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full">
        {/* PANEL PENGATURAN & UNIVERSAL DIGITAL SIGNATURE DRAWER */}
        <DapodikBeritaAcaraSignersDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          templateMode={selectedTemplate}
          documentNumber={documentNumber}
          setDocumentNumber={setDocumentNumber}
          referenceDate={referenceDate}
          setReferenceDate={setReferenceDate}
          cabangDinasWilayah={cabangDinasWilayah}
          setCabangDinasWilayah={setCabangDinasWilayah}
          kabupatenKota={kabupatenKota}
          setKabupatenKota={setKabupatenKota}
          titimangsaCity={titimangsaCity}
          setTitimangsaCity={setTitimangsaCity}
          titimangsaDate={titimangsaDate}
          setTitimangsaDate={setTitimangsaDate}
          showGenderAndGradeBreakdown={showGenderAndGradeBreakdown}
          setShowGenderAndGradeBreakdown={setShowGenderAndGradeBreakdown}
          includeKepsekTier={includeKepsekTier}
          setIncludeKepsekTier={setIncludeKepsekTier}
          operatorSigner={operatorSigner}
          setOperatorSigner={setOperatorSigner}
          verifikatorSigner={verifikatorSigner}
          setVerifikatorSigner={setVerifikatorSigner}
          kepsekSigner={kepsekSigner}
          setKepsekSigner={setKepsekSigner}
          onResetStruktur={applyResolvedSigners}
        />

        {/* LEMBAR DOKUMEN A4 PORTRAIT */}
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={
            selectedTemplate === 'lppd_usia'
              ? `Berita Acara Verval Data IKK Outcome LPPD (Usia Siswa Dapodik) — ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'} (NPSN: ${npsn})`
              : `Berita Acara Rekonsiliasi Data Dapodik — ${sekolahData?.nama || tenantInfo?.name || 'Sekolah'} (NPSN: ${npsn})`
          }
        >
          {/* KOP SURAT RESMI */}
          <PrintHeader
            variant="portrait"
            tenantInfo={tenantInfo}
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
          />

          {selectedTemplate === 'lppd_usia' ? (
            <>
              {/* JUDUL BERITA ACARA LPPD */}
              <div className="text-center my-3 space-y-0.5 font-serif">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-black">
                  BERITA ACARA VERIFIKASI DAN VALIDASI DATA IKK OUTCOME LPPD TAHUN {new Date().getFullYear()}
                </h3>
                <p className="text-[11px] font-bold uppercase text-black">
                  REKAPITULASI PESERTA DIDIK MENURUT USIA (SUMBER DATA: DAPODIK)
                </p>
                <p className="text-[10.5px] font-normal italic text-slate-700">
                  Nomor: {documentNumber}
                </p>
              </div>

              {/* NARASI VERVAL */}
              <p className="text-justify my-3 text-[11px] leading-relaxed text-black font-serif">
                Pada hari ini, <strong>{formatIndoWeekdayDate(getTodayIsoDate())}</strong>, bertempat di{' '}
                <strong>{cabangDinasWilayah || 'Cabang Dinas Pendidikan'}</strong>, telah dilaksanakan verifikasi
                dan validasi data peserta didik menurut usia untuk capaian IKK Outcome LPPD berdasarkan sumber
                data <strong>{sourceLabel}</strong> dengan batas tanggal acuan usia{' '}
                <strong>{cutoffDateText}</strong> pada satuan pendidikan berikut:
              </p>

              {/* IDENTITAS SATUAN PENDIDIKAN */}
              <table className="w-full my-2.5 text-[11px] font-serif text-black">
                <tbody>
                  <tr>
                    <td className="w-40 py-0.5 font-semibold">Nama Sekolah</td>
                    <td className="w-3 py-0.5">:</td>
                    <td className="py-0.5 font-bold uppercase">{sekolahData?.nama || tenantInfo.name || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">NPSN</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5 font-mono font-bold">{npsn || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Kabupaten / Kota</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{kabupatenKota || sekolahData?.kota || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Sumber Data Dapodik</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">
                      {sourceLabel} • Total{' '}
                      <strong>{ageStats.totalDapodikStudents.toLocaleString('id-ID')}</strong> peserta didik
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TABEL UTAMA: DATA SISWA MENURUT USIA (6 KOLOM SESUAI FORMAT LPPD) */}
              <div className="my-3 space-y-1.5 font-serif">
                <p className="font-bold text-[11px] text-black">
                  I. Data Siswa Menurut Usia (Sumber Data: Dapodik, Cut-Off {cutoffDateText})
                </p>
                <table className="w-full text-[11px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="p-2 border border-black">Dibawah 15 Tahun</th>
                      <th className="p-2 border border-black">15 Tahun</th>
                      <th className="p-2 border border-black">16 Tahun</th>
                      <th className="p-2 border border-black">17 Tahun</th>
                      <th className="p-2 border border-black">18 Tahun</th>
                      <th className="p-2 border border-black">Diatas 18 Tahun</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center font-bold text-[13px]">
                      {(['under15', 'age15', 'age16', 'age17', 'age18', 'over18'] as const).map((k) => (
                        <td key={k} className="p-2.5 border border-black">
                          {(bucketByKey.get(k)?.total ?? 0).toLocaleString('id-ID')}
                        </td>
                      ))}
                    </tr>
                    {showGenderAndGradeBreakdown && (
                      <tr className="text-center text-[9.5px] text-slate-700 bg-slate-50/70">
                        {(['under15', 'age15', 'age16', 'age17', 'age18', 'over18'] as const).map((k) => {
                          const stat = bucketByKey.get(k);
                          return (
                            <td key={k} className="p-1.5 border border-black">
                              L: {(stat?.male ?? 0).toLocaleString('id-ID')} | P:{' '}
                              {(stat?.female ?? 0).toLocaleString('id-ID')}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-700">
                  Total Terklasifikasi: <strong>{ageStats.validBirthDateCount.toLocaleString('id-ID')}</strong> dari{' '}
                  <strong>{ageStats.totalDapodikStudents.toLocaleString('id-ID')}</strong> siswa Dapodik
                  (Laki-laki: {ageStats.totalMale.toLocaleString('id-ID')}, Perempuan:{' '}
                  {ageStats.totalFemale.toLocaleString('id-ID')}
                  {ageStats.missingBirthDateCount > 0
                    ? `, Tanggal Lahir Kosong/Tidak Valid: ${ageStats.missingBirthDateCount}`
                    : ''}
                  ).
                </p>
              </div>

              {/* TABEL RINCIAN PER TINGKAT (OPSIONAL) */}
              {showGenderAndGradeBreakdown && ageStats.byTingkat.length > 0 && (
                <div className="my-3 space-y-1 font-serif">
                  <p className="font-bold text-[10.5px] text-black">
                    II. Rincian Distribusi Usia Per Tingkat Pendidikan
                  </p>
                  <table className="w-full text-[10px] border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="p-1.5 border border-black text-left">Tingkat</th>
                        <th className="p-1.5 border border-black">&lt; 15 Th</th>
                        <th className="p-1.5 border border-black">15 Th</th>
                        <th className="p-1.5 border border-black">16 Th</th>
                        <th className="p-1.5 border border-black">17 Th</th>
                        <th className="p-1.5 border border-black">18 Th</th>
                        <th className="p-1.5 border border-black">&gt; 18 Th</th>
                        <th className="p-1.5 border border-black">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ageStats.byTingkat.map((row) => (
                        <tr key={row.tingkat} className="text-center">
                          <td className="p-1.5 border border-black text-left font-semibold">{row.tingkat}</td>
                          <td className="p-1.5 border border-black">{row.under15.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black">{row.age15.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black">{row.age16.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black">{row.age17.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black">{row.age18.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black">{row.over18.toLocaleString('id-ID')}</td>
                          <td className="p-1.5 border border-black font-bold">{row.total.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="my-3 text-[11px] leading-relaxed text-black font-serif text-justify">
                Berita acara ini dibuat sebagai bukti pelaksanaan verifikasi dan validasi data peserta didik
                menurut usia (IKK Outcome LPPD Tahun {new Date().getFullYear()}) sesuai data induk Dapodik satuan
                pendidikan dan dapat dipergunakan sebagaimana mestinya.
              </p>
            </>
          ) : (
            <>
              {/* FORMAT 2: BERITA ACARA REKONSILIASI DAPODIK - ABSENTA */}
              <div className="text-center my-3 space-y-0.5 font-serif">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  BERITA ACARA REKONSILIASI DATA PESERTA DIDIK
                </h3>
                <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                  INTEGRASI WEB SERVICE DAPODIK &amp; DATABASE SEKOLAH (ABSENTA)
                </h4>
                <p className="text-[11px] font-normal italic text-slate-700">
                  Nomor: {documentNumber}
                </p>
              </div>

              <p className="text-justify indent-6 my-3 text-[11px] leading-relaxed text-black font-serif">
                Pada hari ini, <strong>{auditDateText}</strong> pukul {auditTime}, telah diselenggarakan
                proses audit, verifikasi silang, dan komparasi data peserta didik antara sumber{' '}
                <strong>{sourceLabel}</strong> dengan sistem database terpadu {tenantInfo.name || 'sekolah'}.
              </p>

              <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1 font-serif">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-slate-600">Nama Sekolah :</span>{' '}
                    <strong className="text-black">{sekolahData?.nama || tenantInfo.name}</strong>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">NPSN Nasional :</span>{' '}
                    <strong className="text-black font-mono">{npsn}</strong>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Host Dapodik :</span>{' '}
                    <span className="font-mono text-black">{dapodikHost}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Skenario Audit :</span>{' '}
                    <strong className="text-black">{templateName}</strong>
                  </div>
                </div>
              </div>

              <div className="my-3 space-y-1 font-serif">
                <p className="font-bold text-[11px] text-black">I. Ringkasan Rekonsiliasi Data Siswa</p>
                <table className="w-full text-[11px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold text-center">
                      <th className="p-1.5 border border-black w-10">No</th>
                      <th className="p-1.5 border border-black text-left">Indikator Komparasi</th>
                      <th className="p-1.5 border border-black w-28">Jumlah Siswa</th>
                      <th className="p-1.5 border border-black text-left">Keterangan / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1.5 text-center border border-black">1</td>
                      <td className="p-1.5 border border-black">Total Siswa Aktif di Dapodik</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.totalDapodik.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black text-slate-700">{sourceLabel}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center border border-black">2</td>
                      <td className="p-1.5 border border-black">Total Siswa Terdaftar di Absenta</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.totalAbsenta.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black text-slate-700">Database buku induk &amp; akademik</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center border border-black font-bold">3</td>
                      <td className="p-1.5 border border-black font-bold">Data Selaras Identik (100% Match)</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.matchCount.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black">Biodata dan rombel telah valid sepenuhnya</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center border border-black font-bold">4</td>
                      <td className="p-1.5 border border-black font-bold">Selisih Data (Perlu Rekonsiliasi)</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.mismatchCount.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black">Terdapat selisih atribut (Nama/NISN/NIK/Rombel)</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center border border-black">5</td>
                      <td className="p-1.5 border border-black">Hanya Ada di Dapodik (Belum Terdaftar)</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.dapodikOnlyCount.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black text-slate-700">Siap di-import ke database sekolah</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-center border border-black">6</td>
                      <td className="p-1.5 border border-black">Hanya Ada di Absenta (Residu Sekolah)</td>
                      <td className="p-1.5 text-center font-bold border border-black">
                        {summary?.absentaOnlyCount.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="p-1.5 border border-black text-slate-700">Belum terdaftar di Dapodik / non-aktif</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {mismatchSample.length > 0 && (
                <div className="my-2 space-y-1 font-serif">
                  <p className="font-bold text-[10px] text-black">
                    II. Sampel Temuan Selisih Atribut Siswa (10 Baris Pertama)
                  </p>
                  <table className="w-full text-[9.5px] border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="p-1 border border-black w-7 text-center">No</th>
                        <th className="p-1 border border-black w-24">NISN</th>
                        <th className="p-1 border border-black">Nama di Dapodik</th>
                        <th className="p-1 border border-black">Nama di Absenta</th>
                        <th className="p-1 border border-black w-24">Rombel</th>
                        <th className="p-1 border border-black">Atribut Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mismatchSample.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="p-1 text-center border border-black">{idx + 1}</td>
                          <td className="p-1 font-mono border border-black">{s.nisn || '-'}</td>
                          <td className="p-1 font-medium border border-black">{s.dapodikRaw?.nama || s.nama}</td>
                          <td className="p-1 border border-black">{s.absentaRaw?.nama_siswa || '-'}</td>
                          <td className="p-1 border border-black">{s.dapodikRaw?.nama_rombel || '-'}</td>
                          <td className="p-1 font-semibold border border-black">
                            {s.diffs.map((d) => d.label).join(', ') || 'Identitas'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="my-2 text-[10.5px] leading-relaxed text-black font-serif">
                Berdasarkan hasil rekonsiliasi ini, tim Tata Usaha dan Operator Dapodik telah menjadwalkan
                sinkronisasi untuk menyelaraskan data peserta didik sesuai data induk Dapodik.
              </p>
            </>
          )}

          {/* BLOK TANDA TANGAN TERINTEGRASI UNIVERSAL SIGNATURE ENGINE */}
          <div className="mt-4 pt-1 w-full">
            <UniversalDocumentSignatures
              layout={includeKepsekTier ? 'triangle_2tier' : 'dual_custom'}
              titimangsaCity={titimangsaCity || kabupatenKota || 'Purwakarta'}
              titimangsaDate={titimangsaDate || formatIndoLongDate(getTodayIsoDate())}
              verifierLabel=""
              makerLabel=""
              notesOrApprovalLabel="Mengetahui / Menyetujui,"
              signerLeft={{
                roleTitle: verifikatorSigner.roleTitle || 'Verifikator Data,',
                personName: verifikatorSigner.personName || '........................................',
                nip: verifikatorSigner.nip || undefined,
                isAssigned: Boolean(verifikatorSigner.personName),
                signatureImage: verifikatorSigner.signatureImage || undefined,
              }}
              signerRight={{
                roleTitle: operatorSigner.roleTitle || 'Yang Menyerahkan Data,\nOperator Dapodik',
                personName: operatorSigner.personName || '........................................',
                nip: operatorSigner.nip || undefined,
                isAssigned: Boolean(operatorSigner.personName),
                signatureImage: operatorSigner.signatureImage || undefined,
              }}
              signerCenter={{
                roleTitle: kepsekSigner.roleTitle || `Kepala ${sekolahData?.nama || tenantInfo.name}`,
                personName: kepsekSigner.personName || '........................................',
                nip: kepsekSigner.nip || undefined,
                isAssigned: Boolean(kepsekSigner.personName),
                signatureImage: kepsekSigner.signatureImage || undefined,
              }}
              spacingHeightMm={15}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default DapodikBeritaAcaraPrintModal;
