import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { usePklMatriksSigners } from './usePklMatriksSigners';
import { ChevronDown, ChevronUp, RefreshCw, Users, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface PklMatriksTpPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaran?: string;
  mitraList: Array<{
    mitra_id: string;
    nama_mitra: string;
    bidang_usaha?: string;
    alamat?: string;
    siswa_count: number;
    rombel_list?: string[];
    has_tp: boolean;
    deskripsi_tp?: string;
  }>;
  kaprogNama?: string;
  kaprogNip?: string;
  wakasekHubinNama?: string;
  wakasekHubinNip?: string;
  kepsekNama?: string;
  kepsekNip?: string;
}

interface PageChunk {
  pageIndex: number;
  items: PklMatriksTpPrintModalProps['mitraList'];
  startIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasSignatures: boolean;
}

/**
 * Membagi daftar mitra ke dalam lembar fisik A4 yang presisi
 * mencegah pemaksaan konten dan teks gepeng/bertumpuk saat cetak / ekspor PDF
 */
function chunkMitraList(
  items: PklMatriksTpPrintModalProps['mitraList'],
  orientation: 'portrait' | 'landscape'
): PageChunk[] {
  if (items.length === 0) {
    return [
      {
        pageIndex: 0,
        items: [],
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
        hasSignatures: true,
      },
    ];
  }

  const isPortrait = orientation === 'portrait';
  // Batas item per lembar fisik A4.
  // Landscape = 794px tinggi (sangat pendek), maka kapasitas baris sangat terbatas.
  // Portrait  = 1123px tinggi, lebih lega vertikal.
  const singlePageMax   = isPortrait ? 5  : 2;
  const firstPageMax    = isPortrait ? 7  : 3;   // Landscape page-1: ada kop surat besar + metadata
  const normalPageMax   = isPortrait ? 10 : 5;
  const lastPageMaxWithSig = isPortrait ? 6 : 3; // Landscape last: ada blok TTD 3-tier

  if (items.length <= singlePageMax) {
    return [
      {
        pageIndex: 0,
        items,
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
        hasSignatures: true,
      },
    ];
  }

  const pages: PageChunk[] = [];
  let currentIndex = 0;
  let pageIndex = 0;

  while (currentIndex < items.length) {
    const isFirst = pageIndex === 0;
    const remaining = items.length - currentIndex;

    if (isFirst) {
      const take = Math.min(firstPageMax, remaining);
      pages.push({
        pageIndex,
        items: items.slice(currentIndex, currentIndex + take),
        startIndex: currentIndex,
        isFirstPage: true,
        isLastPage: false,
        hasSignatures: false,
      });
      currentIndex += take;
    } else {
      if (remaining <= lastPageMaxWithSig) {
        pages.push({
          pageIndex,
          items: items.slice(currentIndex, currentIndex + remaining),
          startIndex: currentIndex,
          isFirstPage: false,
          isLastPage: true,
          hasSignatures: true,
        });
        currentIndex += remaining;
      } else if (remaining <= normalPageMax) {
        // Bagi dua secara seimbang agar halaman terakhir memuat sisa tabel + tanda tangan
        const half = Math.ceil(remaining / 2);
        pages.push({
          pageIndex,
          items: items.slice(currentIndex, currentIndex + half),
          startIndex: currentIndex,
          isFirstPage: false,
          isLastPage: false,
          hasSignatures: false,
        });
        currentIndex += half;
      } else {
        pages.push({
          pageIndex,
          items: items.slice(currentIndex, currentIndex + normalPageMax),
          startIndex: currentIndex,
          isFirstPage: false,
          isLastPage: false,
          hasSignatures: false,
        });
        currentIndex += normalPageMax;
      }
    }
    pageIndex++;
  }

  if (pages.length > 0) {
    const last = pages[pages.length - 1];
    last.isLastPage = true;
    last.hasSignatures = true;
  }

  return pages;
}

export const PklMatriksTpPrintModal: React.FC<PklMatriksTpPrintModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaran,
  mitraList = [],
  kaprogNama: propKaprogNama,
  kaprogNip: propKaprogNip,
  wakasekHubinNama: propHubinNama,
  wakasekHubinNip: propHubinNip,
  kepsekNama: propKepsekNama,
  kepsekNip: propKepsekNip,
}) => {
  // 1. Orientasi Fleksibel (Default: Portrait sesuai standar dokumen kedinasan banyak DUDI)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [showSignerConfig, setShowSignerConfig] = useState<boolean>(false);

  // Hook Resolving Active Organizational Structure (Kaprog, Waka Hubin, Kepsek)
  const autoSigners = usePklMatriksSigners(jurusanId, jurusanNama);

  // Penandatangan yang dapat disesuaikan
  const [kaprogNama, setKaprogNama] = useState<string>('');
  const [kaprogNip, setKaprogNip] = useState<string>('');
  const [wakasekHubinNama, setWakasekHubinNama] = useState<string>('');
  const [wakasekHubinNip, setWakasekHubinNip] = useState<string>('');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState<string>('');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState<string>('');

  const printSheetRef = useRef<HTMLDivElement>(null);

  const { tenantInfo, rawSekolah, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();
  const sekolahData = rawSekolah;

  // Sinkronisasi otomatis dari Organizational Structure (Struktur Organisasi)
  useEffect(() => {
    if (autoSigners) {
      setKaprogNama(
        propKaprogNama ||
        (autoSigners.kaprog.isAssigned ? autoSigners.kaprog.nama : 'Ketua Program Keahlian')
      );
      setKaprogNip(
        propKaprogNip ||
        (autoSigners.kaprog.isAssigned ? autoSigners.kaprog.nip : '-')
      );
      setWakasekHubinNama(
        propHubinNama ||
        (autoSigners.wakasekHubin.isAssigned ? autoSigners.wakasekHubin.nama : 'Wakil Kepala Sekolah Bidang Hubinmas')
      );
      setWakasekHubinNip(
        propHubinNip ||
        (autoSigners.wakasekHubin.isAssigned ? autoSigners.wakasekHubin.nip : '-')
      );
      setKepalaSekolahNama(
        propKepsekNama ||
        autoSigners.kepsek.nama ||
        (rawSekolah as any)?.kepala_sekolah ||
        'Kepala Sekolah'
      );
      setKepalaSekolahNip(
        propKepsekNip ||
        autoSigners.kepsek.nip ||
        (rawSekolah as any)?.nip_kepala ||
        '-'
      );
    }
  }, [autoSigners, propKaprogNama, propKaprogNip, propHubinNama, propHubinNip, propKepsekNama, propKepsekNip, rawSekolah]);

  const handleResetToStruktur = () => {
    setKaprogNama(autoSigners.kaprog.nama);
    setKaprogNip(autoSigners.kaprog.nip);
    setWakasekHubinNama(autoSigners.wakasekHubin.nama);
    setWakasekHubinNip(autoSigners.wakasekHubin.nip);
    setKepalaSekolahNama(autoSigners.kepsek.nama || (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah');
    setKepalaSekolahNip(autoSigners.kepsek.nip || (rawSekolah as any)?.nip_kepala || '-');
    toast.success('Penandatangan disinkronkan kembali dari Struktur Organisasi');
  };

  // Kalkulasi lembar fisik A4 berdasarkan orientasi aktif
  const pageChunks = useMemo(() => {
    return chunkMitraList(mitraList, orientation);
  }, [mitraList, orientation]);

  // Tanggal pengesahan akreditasi: 1 Juli awal tahun pelajaran
  const tanggalPengesahan = useMemo(() => {
    const raw = tahunPelajaran || '';
    const split = raw.split('/')[0];
    const parsed = parseInt(split?.trim() || String(new Date().getFullYear()), 10);
    const validYear = isNaN(parsed) ? new Date().getFullYear() : parsed;
    const d = new Date(validYear, 6, 1);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [tahunPelajaran]);

  if (!isOpen) return null;

  const totalSiswa = mitraList.reduce((acc, curr) => acc + (curr.siswa_count || 0), 0);
  const totalMitra = mitraList.length;
  const filledMitra = mitraList.filter((m) => m.has_tp).length;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      toast.loading('Membuat PDF vektor…', { id: 'pdf-tp-export' });

      const { generatePdfMatriksTP } = await import('@/utils/print/modules/pdfMatriksTP');

      const sekolahPayload = {
        nama: (rawSekolah as any)?.nama || (tenantInfo as any)?.nama || '',
        alamat: (rawSekolah as any)?.alamat,
        kota: (rawSekolah as any)?.kota,
        telepon: (rawSekolah as any)?.telepon,
        email: (rawSekolah as any)?.email,
        website: (rawSekolah as any)?.website,
        kepala_sekolah: (rawSekolah as any)?.kepala_sekolah,
        nip_kepala: (rawSekolah as any)?.nip_kepala,
        nama_dinas_atas: (rawSekolah as any)?.nama_dinas_atas,
        nama_dinas_bawah: (rawSekolah as any)?.nama_dinas_bawah,
        nama_cabang_dinas: (rawSekolah as any)?.nama_cabang_dinas,
        print_header_lines: (rawSekolah as any)?.print_header_lines,
      };

      const { blobUrl } = generatePdfMatriksTP({
        orientation,
        jurusanNama,
        tahunPelajaran,
        mitraList,
        sekolah: sekolahPayload,
        options: {
          logoDaerahBase64: showLogoDaerah ? (logoDaerahBase64 ?? null) : null,
          logoSekolahBase64: showLogoSekolah ? (logoSekolahBase64 ?? null) : null,
        },
        kaprog: { nama: kaprogNama, nip: kaprogNip },
        wakasekHubin: { nama: wakasekHubinNama, nip: wakasekHubinNip },
        kepsek: { nama: kepalaSekolahNama, nip: kepalaSekolahNip },
      });

      const filename = `MATRIKS_TP_PKL_${jurusanNama.replace(/\s+/g, '_')}_TA_${(tahunPelajaran || 'TA').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();

      toast.success('PDF vektor berhasil diunduh!', { id: 'pdf-tp-export' });
    } catch (err) {
      console.error('Vector PDF export error:', err);
      toast.error('Gagal membuat PDF vektor', { id: 'pdf-tp-export' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Matriks Rumusan Tujuan Pembelajaran (TP) PKL"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Konsentrasi Keahlian:</span>
          <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
            {jurusanNama}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • {totalMitra} DUDI ({pageChunks.length} Lembar A4 {orientation === 'portrait' ? 'Portrait' : 'Landscape'})
          </span>
        </div>
      }
      orientation={orientation}
      allowOrientationToggle={true}
      onOrientationChange={(newOrient) => setOrientation(newOrient)}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Mengunduh...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
      extraActions={
        <button
          type="button"
          onClick={() => setShowSignerConfig(!showSignerConfig)}
          className={cn(
            "text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer font-medium transition-colors",
            showSignerConfig
              ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
          title="Sesuaikan nama dan NIP penandatangan"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Penandatangan</span>
          {showSignerConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      }
    >
      {/* Dynamic CSS untuk Browser Print Page Break Presisi */}
      <style>{`
        @media print {
          @page {
            size: a4 ${orientation};
            margin: 0;
          }
          body {
            background: white !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-sheet:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* PANEL KONFIGURASI PENANDATANGAN ORGANIZATIONAL ASSIGNMENT */}
      <div className="mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Penandatangan Resmi (Struktur Organisasi Terhubung)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetToStruktur}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
              title="Reset ke data awal struktur organisasi"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Struktur
            </button>
          </div>
        </div>

        {/* Ringkasan status koneksi saat panel form diminimalkan */}
        {!showSignerConfig && (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <strong>Kaprog:</strong> {kaprogNama} {kaprogNip !== '-' && `(${kaprogNip})`}
              {autoSigners.kaprog.isAssigned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Terhubung
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <strong>Waka Hubin:</strong> {wakasekHubinNama} {wakasekHubinNip !== '-' && `(${wakasekHubinNip})`}
              {autoSigners.wakasekHubin.isAssigned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Terhubung
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <strong>Kepsek:</strong> {kepalaSekolahNama}
            </span>
          </div>
        )}

        {/* Form input pengeditan saat panel dibuka */}
        {showSignerConfig && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Kaprog */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Ketua Program Keahlian</span>
                {autoSigners.kaprog.isAssigned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama Kaprog"
                value={kaprogNama}
                onChange={(e) => setKaprogNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Kaprog (atau -)"
                value={kaprogNip}
                onChange={(e) => setKaprogNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Wakasek Hubin */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Waka Bidang Hubinmas</span>
                {autoSigners.wakasekHubin.isAssigned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama Wakasek Hubin"
                value={wakasekHubinNama}
                onChange={(e) => setWakasekHubinNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Wakasek Hubin (atau -)"
                value={wakasekHubinNip}
                onChange={(e) => setWakasekHubinNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Kepala Sekolah */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Kepala Sekolah</span>
                {autoSigners.kepsek.isAssigned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama Kepala Sekolah"
                value={kepalaSekolahNama}
                onChange={(e) => setKepalaSekolahNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Kepala Sekolah"
                value={kepalaSekolahNip}
                onChange={(e) => setKepalaSekolahNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      <div ref={printSheetRef} className="w-full flex flex-col items-center gap-6">
        {pageChunks.map((chunk) => (
          <PrintDocumentSheet
            key={`sheet-page-${chunk.pageIndex}`}
            orientation={orientation}
            pageNumber={chunk.pageIndex + 1}
            totalPages={pageChunks.length}
            footerText={`Matriks Capaian & Tujuan Pembelajaran PKL — ${jurusanNama} (${tahunPelajaran || '-'})`}
            style={orientation === 'landscape' ? { padding: '24px 32px' } : undefined}
          >
            {/* 1. HEADER HALAMAN PERTAMA (KOP SURAT LENGKAP & JUDUL UTAMA) */}
            {chunk.isFirstPage ? (
              <>
                {/* KOP SURAT RESMI SEKOLAH */}
                <PrintHeader
                  variant="portrait"
                  tenantInfo={tenantInfo}
                  showLogoDaerah={showLogoDaerah}
                  showLogoSekolah={showLogoSekolah}
                />

                {/* JUDUL DOKUMEN RESMI — Ringkas & elegan */}
                <div className={cn("text-center space-y-0", orientation === 'landscape' ? 'my-1.5' : 'my-2.5')}>
                  <h3 className={cn("font-bold uppercase tracking-wider text-black", orientation === 'landscape' ? 'text-xs' : 'text-sm')}>
                    MATRIKS RUMUSAN TP — PRAKTIK KERJA LAPANGAN (PKL)
                  </h3>
                  <p className="text-[10px] font-medium text-slate-700">
                    Tahun Pelajaran {tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`} • Fase F (Kelas XII)
                  </p>
                </div>

                {/* METADATA DOKUMEN — disederhanakan & selaras dengan PDF */}
                <div className={cn("p-1.5 bg-slate-50 border border-slate-300 rounded text-[10px]", orientation === 'landscape' ? 'my-1' : 'my-2.5 p-2')}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-36 font-semibold text-slate-700 py-0.5">Program Keahlian</td>
                        <td className="font-bold text-slate-900 py-0.5">: {jurusanNama}</td>
                        <td className="w-36 font-semibold text-slate-700 py-0.5">Total DUDI</td>
                        <td className="font-bold text-slate-900 py-0.5">: {totalMitra} DUDI ({filledMitra} Terisi TP)</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-slate-700 py-0.5">Mata Pelajaran</td>
                        <td className="font-bold text-slate-900 py-0.5">: Praktik Kerja Lapangan (PKL)</td>
                        <td className="font-semibold text-slate-700 py-0.5">Total Siswa PKL</td>
                        <td className="font-bold text-slate-900 py-0.5">: {totalSiswa} Siswa</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              /* RUNNING HEADER UNTUK HALAMAN LANJUTAN */
              <div className="pb-1.5 mb-2 border-b border-black flex justify-between items-center text-[10px] text-slate-700">
                <span className="font-bold uppercase tracking-wider text-black">
                  Matriks Rumusan TP PKL — {jurusanNama} ({tahunPelajaran || '-'})
                </span>
                <span className="italic font-medium">
                  Lanjutan (Halaman {chunk.pageIndex + 1} dari {pageChunks.length})
                </span>
              </div>
            )}

            {/* 2. TABEL MATRIKS TP DUDI (3 KOLOM ELEGAN & LEGA TANPA TERPOTONG) */}
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-left border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-black font-bold border-b border-black text-center">
                    <th className="border-r border-black p-1.5 w-8">No</th>
                    <th className={cn("border-r border-black p-1.5 text-left", orientation === 'portrait' ? "w-64" : "w-80")}>
                      Mitra Industri (DUDI) & Lokasi
                    </th>
                    <th className="p-1.5 text-left">
                      Rumusan Capaian & Tujuan Pembelajaran (TP) Khusus DUDI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500 italic">
                        Belum ada mitra penempatan PKL pada tahun pelajaran ini.
                      </td>
                    </tr>
                  ) : (
                    chunk.items.map((mitra, idx) => (
                      <tr key={mitra.mitra_id} className="border-b border-black/70 align-top">
                        <td className="border-r border-black p-1.5 text-center font-medium">
                          {chunk.startIndex + idx + 1}
                        </td>
                        <td className="border-r border-black p-1.5">
                          <div className="font-bold text-black text-[10.5px]">{mitra.nama_mitra}</div>
                          {mitra.alamat && (
                            <div className="text-[9px] text-slate-700 leading-tight mt-0.5 whitespace-normal break-words">
                              {mitra.alamat}
                            </div>
                          )}
                          <div className="text-[8.5px] text-slate-500 mt-1 flex flex-wrap items-center gap-1">
                            <span className="font-semibold text-slate-700">{mitra.siswa_count} Siswa PKL</span>
                            {mitra.rombel_list && mitra.rombel_list.length > 0 && (
                              <span>• {mitra.rombel_list.join(', ')}</span>
                            )}
                            {mitra.bidang_usaha && mitra.bidang_usaha !== '-' && (
                              <span>• ({mitra.bidang_usaha})</span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 text-black leading-relaxed">
                          {mitra.has_tp && mitra.deskripsi_tp ? (
                            <div className="font-normal italic whitespace-normal break-words">
                              "{mitra.deskripsi_tp}"
                            </div>
                          ) : (
                            <div className="text-slate-400 italic font-normal">
                              Belum ada rumusan deskripsi capaian pembelajaran khusus yang ditetapkan.
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 3. CATATAN & BLOK TANDA TANGAN 3-TIER SIMETRIS SEMPURNA (HANYA DI LEMBAR TERAKHIR) */}
            {chunk.hasSignatures && (
              <div className="mt-auto pt-2">
                {/* CATATAN RESMI */}
                <div className="my-2 p-1.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] text-slate-600">
                  <strong>Catatan Kepatuhan Kurikulum:</strong> Rumusan Tujuan Pembelajaran (TP) di atas diselaraskan berdasarkan Standard Operating Procedure (SOP) mitra dunia usaha/industri dan disahkan untuk dicetak pada buku Rapor PKL serta Sertifikat Praktik Kerja Lapangan siswa.
                </div>

                {/* TANDA TANGAN RESMI 3-TIER SIMETRIS */}
                <div className="mt-3">
                  {/* Baris Tanggal di Kanan (Tepat di atas kolom Kaprog) */}
                  <div className="flex justify-end mb-1 text-[10px] text-black">
                    <div className="w-1/2 text-center">
                      {(sekolahData as any)?.kota || 'Purwakarta'}, {tanggalPengesahan}
                    </div>
                  </div>

                  {/* Grid 2 Kolom Sejajar Sempurna */}
                  <div className="grid grid-cols-2 gap-8 text-[10px]">
                    {/* Kolom Kiri: Verifikator (Wakasek Hubin) */}
                    <div className="flex flex-col justify-between h-[130px] text-center">
                      <div>
                        <p className="text-slate-800">Diverifikasi oleh,</p>
                        <p className="font-bold text-black min-h-[28px] flex items-center justify-center leading-snug">
                          Wakil Kepala Sekolah Bidang Hubinmas
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline text-black text-[10.5px]">{wakasekHubinNama}</p>
                        <p className="text-[9px] text-slate-700">NIP. {wakasekHubinNip}</p>
                      </div>
                    </div>

                    {/* Kolom Kanan: Penyusun (Kaprog) */}
                    <div className="flex flex-col justify-between h-[130px] text-center">
                      <div>
                        <p className="text-slate-800">Dibuat oleh,</p>
                        <p className="font-bold text-black min-h-[28px] flex items-center justify-center leading-snug">
                          Ketua Program Keahlian {jurusanNama}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline text-black text-[10.5px]">{kaprogNama}</p>
                        <p className="text-[9px] text-slate-700">NIP. {kaprogNip}</p>
                      </div>
                    </div>
                  </div>

                  {/* Baris 2: Pengesahan Kepala Sekolah (Di Tengah Bawah) */}
                  <div className="mt-3 flex justify-center text-center text-[10px]">
                    <div className="w-80 flex flex-col justify-between h-[115px]">
                      <div>
                        <p className="text-slate-800">Mengetahui / Mengesahkan,</p>
                        <p className="font-bold text-black">Kepala Sekolah</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-black text-[10.5px]">
                          {kepalaSekolahNama || (sekolahData as any)?.kepala_sekolah || 'Kepala Sekolah'}
                        </p>
                        <p className="text-[9px] text-slate-700">
                          NIP. {kepalaSekolahNip || (sekolahData as any)?.nip_kepala || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </PrintDocumentSheet>
        ))}
      </div>
    </UniversalDocumentModal>
  );
};
