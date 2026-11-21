import React, { useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { SlidersHorizontal, UserCheck, RotateCcw, X } from 'lucide-react';
import type { MapelMatrixData, DayMatrixRecord } from './MapelMultiChannelMatrixTable';
import { TrackingSiswaDocumentSheet } from './TrackingSiswaDocumentSheet';

export interface TrackingSiswaPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaNama: string;
  siswaNis: string;
  kelasNama?: string;
  jurusanNama?: string;
  tahunPelajaran?: string;
  bulan: string; // YYYY-MM
  matrixData?: MapelMatrixData;
  channelSummary?: {
    gerbang?: {
      total_hadir: number;
      total_terlambat: number;
      total_tap_gantung: number;
    };
    pembiasaan?: {
      total_hadir: number;
      total_alpa: number;
    };
    kbm?: {
      persentase: number;
      total_sesi: number;
      hadir_sesi: number;
      alpa_sesi: number;
    };
    pkl?: {
      is_active: boolean;
      total_hadir: number;
      mitra_nama?: string | null;
    };
    anomali_count?: number;
  };
  waliKelasNama?: string;
  waliKelasNip?: string;
}

export const TrackingSiswaPrintModal: React.FC<TrackingSiswaPrintModalProps> = ({
  isOpen,
  onClose,
  siswaNama,
  siswaNis,
  kelasNama = 'Kelas',
  jurusanNama,
  tahunPelajaran = '2026/2027',
  bulan,
  matrixData,
  channelSummary,
  waliKelasNama = 'Wali Kelas',
  waliKelasNip = '',
}) => {
  // Modal & Print Preferences (Standar Universal Document Printing)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

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

  // State Penandatangan (Dapat disesuaikan lewat Drawer TTD)
  const [customWalasNama, setCustomWalasNama] = useState<string>(waliKelasNama);
  const [customWalasNip, setCustomWalasNip] = useState<string>(waliKelasNip);
  const [customOrtuNama, setCustomOrtuNama] = useState<string>('Orang Tua / Wali Siswa');
  const [customKepsekNama, setCustomKepsekNama] = useState<string>(rawKepsekNama);
  const [customKepsekNip, setCustomKepsekNip] = useState<string>(rawNipKepsek);
  const [customTitimangsa, setCustomTitimangsa] = useState<string>(
    `${rawKotaSekolah}, ${rawTanggal}`
  );

  // Sync saat data dari tenant/prop berubah
  React.useEffect(() => {
    if (waliKelasNama && waliKelasNama !== 'Wali Kelas') setCustomWalasNama(waliKelasNama);
    if (waliKelasNip) setCustomWalasNip(waliKelasNip);
  }, [waliKelasNama, waliKelasNip]);

  React.useEffect(() => {
    if (rawKepsekNama && rawKepsekNama !== 'Kepala Sekolah') setCustomKepsekNama(rawKepsekNama);
    if (rawNipKepsek) setCustomKepsekNip(rawNipKepsek);
  }, [rawKepsekNama, rawNipKepsek]);

  const handleResetTtd = () => {
    setCustomWalasNama(waliKelasNama);
    setCustomWalasNip(waliKelasNip);
    setCustomOrtuNama('Orang Tua / Wali Siswa');
    setCustomKepsekNama(rawKepsekNama);
    setCustomKepsekNip(rawNipKepsek);
    setCustomTitimangsa(`${rawKotaSekolah}, ${rawTanggal}`);
    toast.success('Pengaturan penandatangan dikembalikan ke profil resmi.');
  };

  // Format Bulan Bahasa Indonesia
  const bulanFormatted = useMemo(() => {
    if (!bulan) return 'Bulan Berjalan';
    if (/^\d{4}-\d{2}/.test(bulan)) {
      const [y, m] = bulan.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    return bulan;
  }, [bulan]);

  const records = matrixData?.records || [];
  const mapelList = matrixData?.mapel_list || [];
  const summaryPerMapel = matrixData?.summary_per_mapel || {};

  if (!isOpen) return null;

  // Handler Browser Print
  const handleBrowserPrint = () => {
    window.print();
  };

  // Handler Dual-Engine PDF Download (html2canvas-pro + jsPDF)
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Matriks Tracking Presensi True WYSIWYG...');
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
      deskCanvas.style.transform = 'none';
      void deskCanvas.offsetHeight;
    }

    try {
      const sheet = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheet) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      const safeSiswa = siswaNama.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Tracking_Presensi_${safeSiswa}_${bulan || 'Bulan'}.pdf`);
      toast.success('PDF Tracking Presensi berhasil diunduh!', { id: toastId });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal merender canvas, membuka dialog cetak browser...', { id: toastId });
      window.print();
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Laporan Tracking Presensi — ${siswaNama}`}
      subtitle={`Rekapitulasi multi-channel individual bulan ${bulanFormatted} (TP. ${tahunPelajaran})`}
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
        <button
          type="button"
          onClick={() => setShowTtdConfig(!showTtdConfig)}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Atur Nama & NIP Penandatangan"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Penandatangan</span>
        </button>
      }
    >
      {/* ── DRAWER KONFIGURASI PENANDATANGAN ── */}
      {showTtdConfig && (
        <div className="mb-4 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Konfigurasi Penandatangan Dokumen</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTtd}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Default
              </button>
              <button
                type="button"
                onClick={() => setShowTtdConfig(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Titimangsa Dokumen
              </label>
              <input
                type="text"
                value={customTitimangsa}
                onChange={(e) => setCustomTitimangsa(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Wali Kelas
              </label>
              <input
                type="text"
                value={customWalasNama}
                onChange={(e) => setCustomWalasNama(e.target.value)}
                placeholder="Nama Wali Kelas"
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-1"
              />
              <input
                type="text"
                value={customWalasNip}
                onChange={(e) => setCustomWalasNip(e.target.value)}
                placeholder="NIP Wali Kelas"
                className="w-full text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Kepala Sekolah
              </label>
              <input
                type="text"
                value={customKepsekNama}
                onChange={(e) => setCustomKepsekNama(e.target.value)}
                placeholder="Nama Kepala Sekolah"
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-1"
              />
              <input
                type="text"
                value={customKepsekNip}
                onChange={(e) => setCustomKepsekNip(e.target.value)}
                placeholder="NIP Kepala Sekolah"
                className="w-full text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── KERTAS FISIK A4 (WYSIWYG PRINT SHEET) ── */}
      <TrackingSiswaDocumentSheet
        siswaNama={siswaNama}
        siswaNis={siswaNis}
        kelasNama={kelasNama}
        jurusanNama={jurusanNama}
        tahunPelajaran={tahunPelajaran}
        bulan={bulan}
        matrixData={matrixData}
        channelSummary={channelSummary}
        orientation={orientation}
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        customWalasNama={customWalasNama}
        customWalasNip={customWalasNip}
        customOrtuNama={customOrtuNama}
        customKepsekNama={customKepsekNama}
        customKepsekNip={customKepsekNip}
        customTitimangsa={customTitimangsa}
        waliKelasNama={waliKelasNama}
        waliKelasNip={waliKelasNip}
      />
    </UniversalDocumentModal>
  );
};

export default TrackingSiswaPrintModal;
