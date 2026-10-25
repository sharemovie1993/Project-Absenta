import React, { useState, useMemo, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { SlidersHorizontal, UserCheck, RotateCcw, X, FileText, Layers } from 'lucide-react';
import type { RekapBulananKelasRow, ViewMode } from './types';

export interface RekapPresensiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaran?: string;
  bulan?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
  mapelNama?: string;
  guruMapelNama?: string;
  guruMapelNip?: string;
  viewMode?: ViewMode;
  rows: RekapBulananKelasRow[];
  dayNumbers?: number[];
}

export const RekapPresensiPrintModal: React.FC<RekapPresensiPrintModalProps> = ({
  isOpen,
  onClose,
  kelasId,
  kelasNama = 'Kelas',
  tahunPelajaran,
  bulan,
  waliKelasNama = 'Wali Kelas',
  waliKelasNip = '',
  mapelNama,
  guruMapelNama,
  guruMapelNip,
  viewMode = 'MATRIX',
  rows = [],
  dayNumbers = [],
}) => {
  const isDefaultLandscape = viewMode === 'MATRIX';
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    isDefaultLandscape ? 'landscape' : 'portrait'
  );
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);
  const [pageLayoutMode, setPageLayoutMode] = useState<'1_page' | '2_pages'>('1_page');

  // Hook SSOT Kop Surat Dinas & Sekolah
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const rawKepsekNama =
    (rawSekolah as any)?.kepala_sekolah ||
    (rawSekolah as any)?.nama_kepala_sekolah ||
    (tenantInfo as any)?.nama_kepsek ||
    'Kepala Sekolah';
  const rawNipKepsek =
    (rawSekolah as any)?.nip_kepala || (rawSekolah as any)?.nip_kepala_sekolah || '';
  const rawKotaSekolah =
    (rawSekolah as any)?.kota || (rawSekolah as any)?.kabupaten || 'Purwakarta';
  const rawTanggal = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Format Bulan Indonesia
  const bulanFormatted = useMemo(() => {
    if (!bulan) return 'Bulan Berjalan';
    if (/^\d{4}-\d{2}/.test(bulan)) {
      const [y, m] = bulan.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    return bulan;
  }, [bulan]);

  // Resolve KM dari LocalStorage Struktur Kelas jika tersedia
  const resolvedKmNama = useMemo(() => {
    try {
      if (kelasId) {
        const savedStruktur = localStorage.getItem(`absenta_walas_struktur_${kelasId}`);
        if (savedStruktur) {
          const parsed = JSON.parse(savedStruktur);
          if (Array.isArray(parsed)) {
            const km = parsed.find((p: any) => p.id === 'km');
            if (km && km.assignedStudentNames?.length > 0) {
              const name = km.assignedStudentNames[0];
              if (name && !name.includes('Belum Ditentukan') && name.trim() !== '') {
                return name;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
    if (rows && rows.length > 0 && rows[0]?.nama_siswa) {
      return rows[0].nama_siswa;
    }
    return '';
  }, [kelasId, rows]);

  // Live editable state untuk tanda tangan
  const [kmTitle, setKmTitle] = useState<string>('Ketua Murid (KM)');
  const [activeKmNama, setActiveKmNama] = useState<string>(resolvedKmNama);
  const [activeWaliKelasNama, setActiveWaliKelasNama] = useState<string>(waliKelasNama || 'Wali Kelas');
  const [activeWaliKelasNip, setActiveWaliKelasNip] = useState<string>(waliKelasNip || '');
  const [activeKepsekNama, setActiveKepsekNama] = useState<string>(rawKepsekNama);
  const [activeKepsekNip, setActiveKepsekNip] = useState<string>(
    rawNipKepsek && rawNipKepsek !== '-' ? rawNipKepsek : ''
  );
  const [activeKota, setActiveKota] = useState<string>(rawKotaSekolah);
  const [activeTanggal, setActiveTanggal] = useState<string>(rawTanggal);

  useEffect(() => {
    if (resolvedKmNama && !activeKmNama) {
      setActiveKmNama(resolvedKmNama);
    }
  }, [resolvedKmNama]);

  useEffect(() => {
    if (waliKelasNama && waliKelasNama !== 'Wali Kelas') {
      setActiveWaliKelasNama(waliKelasNama);
    }
    if (waliKelasNip) {
      setActiveWaliKelasNip(waliKelasNip);
    }
  }, [waliKelasNama, waliKelasNip]);

  useEffect(() => {
    if (rawKepsekNama && rawKepsekNama !== 'Kepala Sekolah') {
      setActiveKepsekNama(rawKepsekNama);
    }
    if (rawNipKepsek && rawNipKepsek !== '-') {
      setActiveKepsekNip(rawNipKepsek);
    }
    if (rawKotaSekolah) {
      setActiveKota(rawKotaSekolah);
    }
  }, [rawKepsekNama, rawNipKepsek, rawKotaSekolah]);

  const handleResetTtd = () => {
    setKmTitle('Ketua Murid (KM)');
    setActiveKmNama(resolvedKmNama);
    setActiveWaliKelasNama(waliKelasNama || 'Wali Kelas');
    setActiveWaliKelasNip(waliKelasNip || '');
    setActiveKepsekNama(rawKepsekNama);
    setActiveKepsekNip(rawNipKepsek && rawNipKepsek !== '-' ? rawNipKepsek : '');
    setActiveKota(rawKotaSekolah);
    setActiveTanggal(rawTanggal);
    toast.info('Data penandatangan direset ke nilai default otomatis.');
  };

  // Resolved list of days in matrix mode
  const resolvedDays = useMemo(() => {
    if (dayNumbers && dayNumbers.length > 0) return dayNumbers;
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, [dayNumbers]);

  // Pages chunking berdasarkan mode tata letak halaman:
  // - '1_page': Seluruh siswa dimuat dalam 1 halaman A4 utuh dengan auto-density scaling
  // - '2_pages': Dibagi rata menjadi 2 halaman A4 dengan tata letak lebih lega
  const pages = useMemo(() => {
    if (pageLayoutMode === '1_page' || rows.length <= 1) {
      return [rows];
    }
    const mid = Math.ceil(rows.length / 2);
    return [rows.slice(0, mid), rows.slice(mid)];
  }, [rows, pageLayoutMode]);

  // Efektif baris per lembar untuk menentukan skala densitas otomatis
  const effectiveRowsPerSheet = pageLayoutMode === '1_page' ? rows.length : Math.ceil(rows.length / 2);
  const isUltraDense = effectiveRowsPerSheet > 34; // 35 - 50 siswa di 1 lembar
  const isDense = effectiveRowsPerSheet > 24 && effectiveRowsPerSheet <= 34; // 25 - 34 siswa di 1 lembar

  // Dynamic sheet padding to maximize printable area when student count is high
  const sheetPaddingClass = isUltraDense
    ? '!p-3 sm:!p-4'
    : isDense
    ? '!p-4 sm:!p-6'
    : orientation === 'landscape'
    ? '!p-6 sm:!p-8'
    : '!p-8 sm:!p-10';

  // Typography & Cell Padding - Matriks Harian
  const matrixTextClass = isUltraDense
    ? 'text-[7px] leading-tight'
    : isDense
    ? 'text-[8px] leading-tight'
    : 'text-[9px]';

  const matrixCellPy = isUltraDense ? 'py-[0.5px]' : isDense ? 'py-0.5' : 'py-1';
  const matrixCellPx = isUltraDense ? 'px-0.5' : 'px-1';

  // Typography & Cell Padding - Akumulasi Summary
  const summaryTextClass = isUltraDense
    ? 'text-[7.5px] leading-tight'
    : isDense
    ? 'text-[8.5px] leading-tight'
    : 'text-[10px]';

  const summaryCellPy = isUltraDense ? 'py-[1px]' : isDense ? 'py-1' : 'py-1.5';
  const summaryCellPx = isUltraDense ? 'px-1' : 'px-1.5';

  // Signature (TTD) spacing and typography
  const sigGapClass = isUltraDense ? 'h-6 sm:h-7' : isDense ? 'h-8 sm:h-9' : 'h-12 sm:h-14';
  const sigTextClass = isUltraDense ? 'text-[9px]' : isDense ? 'text-[9.5px]' : 'text-[10.5px]';
  const sigNameClass = isUltraDense ? 'text-[9.5px]' : isDense ? 'text-[10px]' : 'text-[11px]';
  const sigSubClass = isUltraDense ? 'text-[8px]' : isDense ? 'text-[8.5px]' : 'text-[9.5px]';

  if (!isOpen) return null;

  // Handler Browser Print
  const handleBrowserPrint = () => {
    window.print();
  };

  // Handler Dual-Engine PDF Download (html2canvas-pro + jsPDF) - Mendukung 1 Lembar atau 2 Lembar
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading(
      `Sedang merender PDF Rekapitulasi Presensi (${pageLayoutMode === '1_page' ? '1 Lembar' : '2 Lembar'})...`
    );
    try {
      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }

        const sheet = sheetElements[i] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const modeSlug = viewMode === 'MATRIX' ? 'Leger_Presensi' : 'Rekap_Presensi';
      const layoutSlug = pageLayoutMode === '1_page' ? '1_Lembar' : '2_Lembar';
      const safeKelas = kelasNama.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${modeSlug}_${safeKelas}_${layoutSlug}_${bulan || 'Bulan'}.pdf`);
      toast.success(
        `PDF Rekap Presensi (${pageLayoutMode === '1_page' ? '1 Lembar' : '2 Lembar'}) berhasil diunduh!`,
        { id: toastId }
      );
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal mengekspor canvas, membuka dialog cetak browser...', { id: toastId });
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Rekap Presensi — ${kelasNama}`}
      subtitle={`Laporan resmi kehadiran siswa bulan ${bulanFormatted} (TP. ${tahunPelajaran || '2026/2027'})`}
      orientation={orientation}
      allowOrientationToggle={true}
      onOrientationChange={setOrientation}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      allowLogoToggles={true}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Memproses...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      extraActions={
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Segmented Controller: 1 Halaman vs 2 Halaman */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setPageLayoutMode('1_page')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10.5px] sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                pageLayoutMode === '1_page'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Muat seluruh siswa dalam 1 halaman A4 ringkas"
            >
              <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>1 Hal<span className="hidden sm:inline">aman</span></span>
            </button>
            <button
              type="button"
              onClick={() => setPageLayoutMode('2_pages')}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10.5px] sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                pageLayoutMode === '2_pages'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Bagi rata data ke 2 halaman A4 dengan tata letak lebih lega"
            >
              <Layers className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>2 Hal<span className="hidden sm:inline">aman</span></span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTtdConfig((prev) => !prev)}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-semibold transition-all border cursor-pointer shrink-0 ${
              showTtdConfig
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Sesuaikan nama penandatangan (TTD) sebelum cetak"
          >
            <SlidersHorizontal className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{showTtdConfig ? 'Tutup TTD' : 'Pengaturan TTD'}</span>
          </button>
        </div>
      }
      size="5xl"
    >
      {/* ── PANEL KONTROL PENGATURAN TTD (PRINT:HIDDEN) ── */}
      {showTtdConfig && (
        <div className="print:hidden mb-3 p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Kustomisasi Penandatangan Dokumen (TTD)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTtd}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTtdConfig(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Kolom 1: Ketua Murid */}
            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10.5px]">
                1. Perwakilan Siswa (Kiri)
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block">Jabatan / Judul TTD:</label>
                <input
                  type="text"
                  value={kmTitle}
                  onChange={(e) => setKmTitle(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Ketua Murid (KM)"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Nama Siswa KM:</label>
                <input
                  type="text"
                  value={activeKmNama}
                  onChange={(e) => setActiveKmNama(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  placeholder="Nama Siswa KM..."
                />
              </div>
            </div>

            {/* Kolom 2: Wali Kelas */}
            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10.5px]">
                2. Wali Kelas (Kanan)
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  value={activeWaliKelasNama}
                  onChange={(e) => setActiveWaliKelasNama(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  placeholder="Nama Wali Kelas..."
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">NIP (Kosongkan jika bukan PNS):</label>
                <input
                  type="text"
                  value={activeWaliKelasNip}
                  onChange={(e) => setActiveWaliKelasNip(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  placeholder="19800101..."
                />
              </div>
            </div>

            {/* Kolom 3: Kepala Sekolah & Lokasi */}
            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10.5px]">
                3. Kepala Sekolah & Titimangsa
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block">Nama Kepala Sekolah:</label>
                <input
                  type="text"
                  value={activeKepsekNama}
                  onChange={(e) => setActiveKepsekNama(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  placeholder="Nama Kepala Sekolah..."
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-slate-500 block">Kota/Kab:</label>
                  <input
                    type="text"
                    value={activeKota}
                    onChange={(e) => setActiveKota(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Tanggal TTD:</label>
                  <input
                    type="text"
                    value={activeTanggal}
                    onChange={(e) => setActiveTanggal(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RENDERING LEMBAR DOKUMEN A4 (1 LEMBAR / 2 LEMBAR) ── */}
      {pages.map((pageRows, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === pages.length - 1;
        const startRowNum = pages.slice(0, pageIdx).reduce((acc, p) => acc + p.length, 0);

        return (
          <PrintDocumentSheet
            key={pageIdx}
            orientation={orientation}
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
            className={sheetPaddingClass}
            footerText={`Laporan Presensi — ${kelasNama} — ${bulanFormatted} — Halaman ${pageIdx + 1} dari ${pages.length}`}
          >
            {/* KOP SURAT RESMI (Halaman Pertama Lengkap) */}
            {isFirstPage ? (
              <PrintHeader
                variant={orientation}
                tenantInfo={tenantInfo}
                showLogoDaerah={showLogoDaerah}
                showLogoSekolah={showLogoSekolah}
                className={isUltraDense ? 'mb-1 pb-1' : 'mb-2 pb-1.5'}
              />
            ) : (
              <div className="border-b-2 border-black pb-1 mb-2 text-center text-[10px] font-bold text-slate-800">
                Lanjutan Rekapitulasi Presensi Siswa — Kelas {kelasNama} — {bulanFormatted} (Halaman {pageIdx + 1} dari {pages.length})
              </div>
            )}

            {/* JUDUL DOKUMEN & METADATA RESMI (Halaman Pertama) */}
            {isFirstPage && (
              <>
                <div className={isUltraDense ? 'text-center my-1 space-y-0.5' : 'text-center my-2 space-y-0.5'}>
                  <h3 className={`${isUltraDense ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wider text-black`}>
                    {mapelNama
                      ? `LAPORAN REKAPITULASI PRESENSI MAPEL ${mapelNama.toUpperCase()}`
                      : viewMode === 'MATRIX'
                      ? 'LEGER REKAPITULASI PRESENSI HARIAN SISWA'
                      : 'LAPORAN REKAPITULASI PRESENSI BULANAN SISWA'}
                  </h3>
                  {!isUltraDense && (
                    <>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                        ROMBEL {kelasNama.toUpperCase()} {mapelNama ? `• MAPEL ${mapelNama.toUpperCase()}` : ''}
                      </h4>
                      <p className="text-[10px] italic text-slate-600">
                        Bulan: {bulanFormatted} — Tahun Pelajaran {tahunPelajaran || '2026/2027'}
                      </p>
                    </>
                  )}
                </div>

                {/* TABEL INFORMASI KELAS (COMPACT BADGE STRIP) */}
                <div
                  className={`border border-black/80 rounded-xs ${
                    isUltraDense ? 'px-2 py-0.5 my-1 text-[8px]' : 'p-2 my-2 text-[10px]'
                  } bg-slate-50/50`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                    <div>
                      <span className="font-semibold text-slate-600">Rombel: </span>
                      <span className="font-bold text-black">{kelasNama}</span>
                    </div>
                    {mapelNama && (
                      <div>
                        <span className="font-semibold text-slate-600">Mata Pelajaran: </span>
                        <span className="font-bold text-black">{mapelNama}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-slate-600">{guruMapelNama ? 'Guru Pengampu: ' : 'Wali Kelas: '}</span>
                      <span className="font-bold text-black">{guruMapelNama || activeWaliKelasNama}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">Bulan: </span>
                      <span className="font-bold text-black">{bulanFormatted}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">Jumlah Siswa: </span>
                      <span className="font-bold text-black">{rows.length} Siswa</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">Tata Letak: </span>
                      <span className="font-bold text-black">
                        {pageLayoutMode === '1_page' ? '1 Lembar Ringkas' : `2 Lembar (Hal. ${pageIdx + 1})`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TABEL PRESENSI TRUE WYSIWYG ── */}
            <div className={isUltraDense ? 'my-1' : 'my-2'}>
              {viewMode === 'MATRIX' ? (
                /* TABEL MATRIKS HARIAN (Landscape Mode 1..31 + H, S, I, A, T, POIN) */
                <table className={`w-full border-collapse border-2 border-black text-left ${matrixTextClass}`}>
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black">
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center w-5 font-bold`}>No</th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black font-bold min-w-[120px] max-w-[160px]`}>
                        Nama Siswa
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-mono w-12 font-bold`}>
                        NIS
                      </th>
                      {resolvedDays.map((d) => (
                        <th
                          key={d}
                          className="p-0 border-r border-black text-center font-mono text-[7px] min-w-[13px]"
                        >
                          {d}
                        </th>
                      ))}
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold bg-emerald-50 text-emerald-800 w-5`}>
                        H
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold bg-amber-50 text-amber-800 w-5`}>
                        S
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold bg-blue-50 text-blue-800 w-5`}>
                        I
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold bg-rose-50 text-rose-800 w-5`}>
                        A
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold bg-purple-50 text-purple-800 w-5`}>
                        T
                      </th>
                      <th className={`${matrixCellPy} ${matrixCellPx} text-center font-bold bg-slate-200 text-black w-7`}>POIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, idx) => {
                      const rowNum = startRowNum + idx + 1;
                      return (
                        <tr
                          key={r.siswa_id || idx}
                          className="border-b border-black/70 hover:bg-slate-50/50"
                        >
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-mono`}>{rowNum}</td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black font-medium truncate max-w-[160px]`}>
                            {r.nama_siswa}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-mono text-[7px]`}>
                            {r.nis || '-'}
                          </td>
                          {resolvedDays.map((d) => {
                            const code = r.dailyMap?.[String(d)];
                            return (
                              <td
                                key={d}
                                className="p-0 border-r border-black text-center font-mono text-[7px] font-bold"
                              >
                                {code || '-'}
                              </td>
                            );
                          })}
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold text-emerald-700 bg-emerald-50/40`}>
                            {r.HADIR || 0}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold text-amber-700 bg-amber-50/40`}>
                            {r.SAKIT || 0}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold text-blue-700 bg-blue-50/40`}>
                            {r.IZIN || 0}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold text-rose-700 bg-rose-50/40`}>
                            {r.ALPA || 0}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} border-r border-black text-center font-bold text-purple-700 bg-purple-50/40`}>
                            {r.TERLAMBAT || 0}
                          </td>
                          <td className={`${matrixCellPy} ${matrixCellPx} text-center font-bold bg-slate-100`}>{r.total_poin || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* TABEL AKUMULASI SUMMARY (Portrait Mode 10 Kolom) */
                <table className={`w-full border-collapse border-2 border-black text-left ${summaryTextClass}`}>
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black">
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center w-8 font-bold`}>No</th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black font-bold`}>Nama Siswa</th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-mono w-20 font-bold`}>
                        NIS
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-emerald-800 bg-emerald-50 w-12`}>
                        Hadir
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-blue-800 bg-blue-50 w-12`}>
                        Izin
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-amber-800 bg-amber-50 w-12`}>
                        Sakit
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-rose-800 bg-rose-50 w-12`}>
                        Alpa
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-purple-800 bg-purple-50 w-14`}>
                        Terlambat
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold w-16`}>
                        % Hadir
                      </th>
                      <th className={`${summaryCellPy} ${summaryCellPx} text-center font-bold bg-slate-200 w-14`}>Poin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, idx) => {
                      const rowNum = startRowNum + idx + 1;
                      const totalDays =
                        (r.HADIR ?? 0) +
                        (r.IZIN ?? 0) +
                        (r.SAKIT ?? 0) +
                        (r.ALPA ?? 0) +
                        (r.TERLAMBAT ?? 0);
                      const pct =
                        totalDays === 0
                      ? 0
                      : Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / totalDays) * 100);

                      return (
                        <tr
                          key={r.siswa_id || idx}
                          className="border-b border-black/70 hover:bg-slate-50/50"
                        >
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-mono`}>{rowNum}</td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black font-medium`}>{r.nama_siswa}</td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-mono`}>
                            {r.nis || '-'}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-emerald-700 bg-emerald-50/40 font-mono`}>
                            {r.HADIR || 0}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-blue-700 bg-blue-50/40 font-mono`}>
                            {r.IZIN || 0}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-amber-700 bg-amber-50/40 font-mono`}>
                            {r.SAKIT || 0}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-rose-700 bg-rose-50/40 font-mono`}>
                            {r.ALPA || 0}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-bold text-purple-700 bg-purple-50/40 font-mono`}>
                            {r.TERLAMBAT || 0}
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} border-r border-black text-center font-mono font-bold`}>
                            {pct}%
                          </td>
                          <td className={`${summaryCellPy} ${summaryCellPx} text-center font-bold bg-slate-100 font-mono`}>
                            {r.total_poin || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── KETERANGAN & TANDA TANGAN RESMI (HANYA DI LEMBAR TERAKHIR) ── */}
            {isLastPage && (
              <div className={`mt-2 ${isUltraDense ? 'pt-1' : 'pt-2'}`}>
                {/* Keterangan Kode */}
                <div
                  className={`${
                    isUltraDense ? 'mb-1.5 text-[7.5px] pt-0.5' : 'mb-2.5 text-[8.5px] pt-1'
                  } text-slate-600 flex items-center justify-between border-t border-slate-300`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-bold">Keterangan:</span>
                    <span>H = Hadir</span>
                    <span>S = Sakit</span>
                    <span>I = Izin</span>
                    <span>A = Alpa</span>
                    <span>T = Terlambat</span>
                  </div>
                  <div className="italic text-[7.5px]">Dokumen Resmi Absenta Digital Platform</div>
                </div>

                {/* Penandatangan 3 Kolom Sejajar (Efisien Ruang Vertikal) */}
                <div className="grid grid-cols-3 gap-2 text-center font-serif">
                  {/* Kolom 1: Perwakilan Siswa / KM */}
                  <div>
                    <p className={`${sigTextClass} mb-0.5`}>Mengetahui,</p>
                    <p className={`${sigTextClass} font-bold`}>{kmTitle}</p>
                    <div className={sigGapClass} />
                    <p className={`${sigNameClass} font-bold underline uppercase`}>
                      {activeKmNama ? activeKmNama : '( ........................................ )'}
                    </p>
                    <p className={`${sigSubClass} text-slate-600`}>Perwakilan Siswa</p>
                  </div>

                  {/* Kolom 2: Kepala Sekolah */}
                  <div>
                    <p className={`${sigTextClass} mb-0.5`}>Mengesahkan,</p>
                    <p className={`${sigTextClass} font-bold`}>Kepala Sekolah</p>
                    <div className={sigGapClass} />
                    <p className={`${sigNameClass} font-bold underline uppercase`}>
                      {activeKepsekNama}
                    </p>
                    <p className={`${sigSubClass} text-slate-700 font-mono`}>
                      {activeKepsekNip ? `NIP. ${activeKepsekNip}` : 'NIP. ........................................'}
                    </p>
                  </div>

                  {/* Kolom 3: Guru Mapel atau Wali Kelas */}
                  <div>
                    <p className={`${sigTextClass} mb-0.5`}>
                      {activeKota}, {activeTanggal}
                    </p>
                    <p className={`${sigTextClass} font-bold`}>{guruMapelNama ? 'Guru Mata Pelajaran' : `Wali Kelas ${kelasNama}`}</p>
                    <div className={sigGapClass} />
                    <p className={`${sigNameClass} font-bold underline uppercase`}>
                      {guruMapelNama || activeWaliKelasNama}
                    </p>
                    <p className={`${sigSubClass} text-slate-700 font-mono`}>
                      {(guruMapelNip || activeWaliKelasNip) ? `NIP. ${guruMapelNip || activeWaliKelasNip}` : 'NIP. ........................................'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </PrintDocumentSheet>
        );
      })}
    </UniversalDocumentModal>
  );
};

RekapPresensiPrintModal.displayName = 'RekapPresensiPrintModal';
