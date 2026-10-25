import React, { useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { SlidersHorizontal, UserCheck, RotateCcw, X } from 'lucide-react';
import type { MapelMatrixData, DayMatrixRecord } from './MapelMultiChannelMatrixTable';

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
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      const canvas = await html2canvas(sheet, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const safeSiswa = siswaNama.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Tracking_Presensi_${safeSiswa}_${bulan || 'Bulan'}.pdf`);
      toast.success('PDF Tracking Presensi berhasil diunduh!', { id: toastId });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal merender canvas, membuka dialog cetak browser...', { id: toastId });
      window.print();
    } finally {
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
      <PrintDocumentSheet
        pageNumber={1}
        totalPages={1}
        orientation={orientation}
        footerText={`Laporan Presensi Multi-Channel Siswa: ${siswaNama} (${siswaNis}) — Dicetak otomatis via Absenta.ID Super Smart School`}
      >
        <div className="space-y-2 text-slate-900 print:text-black">
          {/* 1. KOP SURAT DINAS & SEKOLAH */}
          <PrintHeader
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
          />

          {/* 2. JUDUL DOKUMEN & SUBJUDUL */}
          <div className="text-center py-1">
            <h3 className="text-[13px] font-black uppercase tracking-wider underline">
              LEMBAR PELACAKAN PRESENSI MULTI-CHANNEL SISWA
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-tight text-slate-600 print:text-black">
              Periode: {bulanFormatted} | Tahun Pelajaran: {tahunPelajaran}
            </p>
          </div>

          {/* 3. IDENTITAS SISWA & RINGKASAN METRIK */}
          <div className="grid grid-cols-[1.2fr_1.8fr] gap-2 p-1.5 bg-slate-50/80 print:bg-transparent border border-slate-300 print:border-black rounded-lg text-[9px]">
            {/* Profil */}
            <div className="space-y-0.5">
              <div className="flex">
                <span className="w-24 font-bold">Nama Siswa</span>
                <span className="font-black uppercase">: {siswaNama}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold">NIS / NISN</span>
                <span className="font-mono">: {siswaNis || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-bold">Kelas / Rombel</span>
                <span>: {kelasNama} {jurusanNama ? `(${jurusanNama})` : ''}</span>
              </div>
            </div>

            {/* Rekap Multi-Channel KPI */}
            <div className="grid grid-cols-4 gap-1 text-center border-l border-slate-300 print:border-black pl-2">
              <div className="p-1 bg-white print:bg-transparent border border-slate-200 print:border-black rounded">
                <div className="text-[7.5px] font-bold text-slate-500 uppercase">Gerbang</div>
                <div className="text-[9.5px] font-black">{channelSummary?.gerbang?.total_hadir ?? 0} H</div>
                <div className="text-[7px] text-slate-500">{channelSummary?.gerbang?.total_terlambat ?? 0} Telat</div>
              </div>
              <div className="p-1 bg-white print:bg-transparent border border-slate-200 print:border-black rounded">
                <div className="text-[7.5px] font-bold text-slate-500 uppercase">Pembiasaan</div>
                <div className="text-[9.5px] font-black">{channelSummary?.pembiasaan?.total_hadir ?? 0} Sesi</div>
                <div className="text-[7px] text-slate-500">{channelSummary?.pembiasaan?.total_alpa ?? 0} Alpa</div>
              </div>
              <div className="p-1 bg-white print:bg-transparent border border-slate-200 print:border-black rounded">
                <div className="text-[7.5px] font-bold text-slate-500 uppercase">Sesi KBM</div>
                <div className="text-[9.5px] font-black">{channelSummary?.kbm?.persentase ?? 100}%</div>
                <div className="text-[7px] text-slate-500">{channelSummary?.kbm?.hadir_sesi ?? 0}/{channelSummary?.kbm?.total_sesi ?? 0} JP</div>
              </div>
              <div className="p-1 bg-white print:bg-transparent border border-slate-200 print:border-black rounded">
                <div className="text-[7.5px] font-bold text-slate-500 uppercase">DU/DI PKL</div>
                <div className="text-[9.5px] font-black">
                  {channelSummary?.pkl?.is_active ? `${channelSummary.pkl.total_hadir} H` : 'Non-PKL'}
                </div>
                <div className="text-[7px] text-slate-500 truncate">
                  {channelSummary?.pkl?.is_active ? (channelSummary.pkl.mitra_nama || 'DU/DI') : 'Normal'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. TABEL MATRIKS MULTI-CHANNEL 31 HARI */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 print:border-black text-[7.5px] leading-tight">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 font-bold text-center">
                  <th className="border border-slate-400 print:border-black px-1 py-1 text-left w-36 uppercase">
                    Channel / Mata Pelajaran
                  </th>
                  {records.map((r) => (
                    <th
                      key={r.date}
                      className={`border border-slate-400 print:border-black w-[18px] py-0.5 ${
                        r.is_weekend ? 'bg-rose-50 text-rose-600 print:bg-slate-100 print:text-black' : ''
                      }`}
                    >
                      <div>{String(r.day).padStart(2, '0')}</div>
                      <div className="text-[6px] font-normal uppercase text-slate-500 print:text-black">
                        {r.day_name.slice(0, 3)}
                      </div>
                    </th>
                  ))}
                  <th className="border border-slate-400 print:border-black px-1 py-1 w-14">
                    Rekap
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ── KATEGORI 1: GERBANG ── */}
                <tr className="bg-slate-50/90 print:bg-slate-100 font-bold">
                  <td
                    colSpan={records.length + 2}
                    className="border border-slate-400 print:border-black px-1.5 py-0.5 text-indigo-700 print:text-black text-[7px] uppercase tracking-wider"
                  >
                    1. Pintu Gerbang Sekolah
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 print:border-black px-1.5 py-0.5 font-medium pl-3">
                    Tap Masuk
                  </td>
                  {records.map((r) => {
                    const status = r.gerbang?.datang_status;
                    const waktu = r.gerbang?.datang_waktu;
                    return (
                      <td
                        key={r.date}
                        className={`border border-slate-400 print:border-black text-center font-mono text-[6.5px] ${
                          r.is_weekend ? 'bg-slate-50 print:bg-transparent' : ''
                        }`}
                      >
                        {status === 'HADIR' ? (
                          <span className="text-emerald-700 print:text-black font-semibold">
                            {waktu ? waktu.slice(0, 5) : 'H'}
                          </span>
                        ) : status === 'TERLAMBAT' ? (
                          <span className="text-amber-700 print:text-black font-bold">
                            {waktu ? waktu.slice(0, 5) : 'T'}
                          </span>
                        ) : (
                          <span className="text-slate-300 print:text-slate-400">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-slate-400 print:border-black text-center font-semibold">
                    {channelSummary?.gerbang?.total_hadir ?? 0} Hadir
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 print:border-black px-1.5 py-0.5 font-medium pl-3">
                    Tap Pulang
                  </td>
                  {records.map((r) => {
                    const status = r.gerbang?.pulang_status;
                    const waktu = r.gerbang?.pulang_waktu;
                    const isGantung = r.gerbang?.is_tap_gantung;
                    return (
                      <td
                        key={r.date}
                        className={`border border-slate-400 print:border-black text-center font-mono text-[6.5px] ${
                          r.is_weekend ? 'bg-slate-50 print:bg-transparent' : ''
                        }`}
                      >
                        {status === 'HADIR' ? (
                          <span className="text-emerald-700 print:text-black font-semibold">
                            {waktu ? waktu.slice(0, 5) : 'H'}
                          </span>
                        ) : isGantung ? (
                          <span className="text-amber-700 print:text-black font-bold" title="Tap Gantung">
                            !
                          </span>
                        ) : (
                          <span className="text-slate-300 print:text-slate-400">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-slate-400 print:border-black text-center text-[7px] text-slate-500">
                    {channelSummary?.gerbang?.total_tap_gantung ?? 0} Gantung
                  </td>
                </tr>

                {/* ── KATEGORI 2: PEMBIASAAN ── */}
                <tr className="bg-slate-50/90 print:bg-slate-100 font-bold">
                  <td
                    colSpan={records.length + 2}
                    className="border border-slate-400 print:border-black px-1.5 py-0.5 text-emerald-700 print:text-black text-[7px] uppercase tracking-wider"
                  >
                    2. Pembiasaan Pagi (Dhuha / Upacara / Apel)
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 print:border-black px-1.5 py-0.5 font-medium pl-3">
                    Presensi Pembiasaan
                  </td>
                  {records.map((r) => {
                    const st = r.pembiasaan?.status;
                    return (
                      <td
                        key={r.date}
                        className={`border border-slate-400 print:border-black text-center font-bold text-[7px] ${
                          r.is_weekend ? 'bg-slate-50 print:bg-transparent' : ''
                        }`}
                      >
                        {st === 'HADIR' ? (
                          <span className="text-emerald-700 print:text-black">H</span>
                        ) : st === 'ALPA' ? (
                          <span className="text-rose-600 print:text-black">A</span>
                        ) : (
                          <span className="text-slate-300 print:text-slate-400 font-normal">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-slate-400 print:border-black text-center font-semibold">
                    {channelSummary?.pembiasaan?.total_hadir ?? 0} Sesi
                  </td>
                </tr>

                {/* ── KATEGORI 3: SESI KBM PER MATA PELAJARAN ── */}
                <tr className="bg-slate-50/90 print:bg-slate-100 font-bold">
                  <td
                    colSpan={records.length + 2}
                    className="border border-slate-400 print:border-black px-1.5 py-0.5 text-amber-700 print:text-black text-[7px] uppercase tracking-wider"
                  >
                    3. Sesi Belajar KBM per Mata Pelajaran
                  </td>
                </tr>
                {mapelList.map((mapel) => {
                  const stat = summaryPerMapel[mapel.id];
                  return (
                    <tr key={mapel.id}>
                      <td className="border border-slate-400 print:border-black px-1.5 py-0.5 pl-3 truncate font-medium">
                        {mapel.nama_mapel}
                      </td>
                      {records.map((r) => {
                        const sess = r.mapel_sessions[mapel.id];
                        if (!sess) {
                          return (
                            <td
                              key={r.date}
                              className={`border border-slate-400 print:border-black text-center text-slate-300 print:text-slate-400 font-mono text-[7px] ${
                                r.is_weekend ? 'bg-slate-50 print:bg-transparent' : ''
                              }`}
                            >
                              ·
                            </td>
                          );
                        }
                        const st = sess.status?.toUpperCase() || 'H';
                        const isHadir = st === 'HADIR' || st === 'H';
                        const isTelat = st === 'TERLAMBAT' || st === 'T';
                        const isSakit = st === 'SAKIT' || st === 'S';
                        const isIzin = st === 'IZIN' || st === 'I';
                        const isAlpa = st === 'ALPA' || st === 'A';

                        return (
                          <td
                            key={r.date}
                            className={`border border-slate-400 print:border-black text-center font-bold text-[7px] ${
                              r.is_weekend ? 'bg-slate-50 print:bg-transparent' : ''
                            }`}
                          >
                            {isHadir ? (
                              <span className="text-emerald-700 print:text-black">H</span>
                            ) : isTelat ? (
                              <span className="text-amber-700 print:text-black">T</span>
                            ) : isSakit ? (
                              <span className="text-blue-700 print:text-black">S</span>
                            ) : isIzin ? (
                              <span className="text-sky-700 print:text-black">I</span>
                            ) : isAlpa ? (
                              <span className="text-rose-600 print:text-black">A</span>
                            ) : (
                              <span>{st.slice(0, 1)}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-slate-400 print:border-black text-center font-semibold text-[7px]">
                        {stat ? `${stat.persentase}%` : '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* ── KATEGORI 4: STATUS HARIAN & ANOMALI ── */}
                <tr className="bg-slate-50/90 print:bg-slate-100 font-bold">
                  <td
                    colSpan={records.length + 2}
                    className="border border-slate-400 print:border-black px-1.5 py-0.5 text-rose-700 print:text-black text-[7px] uppercase tracking-wider"
                  >
                    4. Status Akhir Harian & Indikasi Anomali
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 print:border-black px-1.5 py-0.5 font-medium pl-3">
                    Status Akhir
                  </td>
                  {records.map((r) => {
                    const st = r.final_status;
                    const isLibur = r.is_weekend || st === 'LIBUR';
                    return (
                      <td
                        key={r.date}
                        className={`border border-slate-400 print:border-black text-center font-bold text-[7px] ${
                          isLibur ? 'bg-slate-100 text-slate-400 print:text-black' : ''
                        }`}
                      >
                        {st === 'HADIR' ? (
                          <span className="text-emerald-700 print:text-black">H</span>
                        ) : st === 'TERLAMBAT' ? (
                          <span className="text-amber-700 print:text-black">T</span>
                        ) : st === 'SAKIT' ? (
                          <span className="text-blue-700 print:text-black">S</span>
                        ) : st === 'IZIN' ? (
                          <span className="text-sky-700 print:text-black">I</span>
                        ) : st === 'ALPA' ? (
                          <span className="text-rose-600 print:text-black">A</span>
                        ) : isLibur ? (
                          <span className="text-slate-300 print:text-slate-400">·</span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-slate-400 print:border-black text-center font-bold">
                    {channelSummary?.kbm?.persentase ?? 100}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. LEGENDA SIMBOL KECIL */}
          <div className="flex items-center gap-3 text-[7px] text-slate-600 print:text-black font-semibold pt-0.5">
            <span className="font-bold uppercase tracking-wider">Keterangan Simbol:</span>
            <span><strong className="text-emerald-700 print:text-black">H</strong>: Hadir</span>
            <span><strong className="text-amber-700 print:text-black">T</strong>: Terlambat</span>
            <span><strong className="text-blue-700 print:text-black">S</strong>: Sakit</span>
            <span><strong className="text-sky-700 print:text-black">I</strong>: Izin</span>
            <span><strong className="text-rose-600 print:text-black">A</strong>: Alpa</span>
            <span><strong className="text-slate-400 print:text-black">·</strong>: Tidak Ada Jadwal/Non-Aktif</span>
          </div>

          {/* 6. TANDA TANGAN 2-TIER RESMI (Wali Kelas, Orang Tua & Kepala Sekolah) */}
          <div className="pt-2 text-[9px] print:text-[8.5px]">
            {/* Baris 1: Wali Kelas & Orang Tua */}
            <div className="flex justify-between items-start">
              <div className="text-center w-56">
                <p className="font-semibold text-slate-600 print:text-black">Mengetahui,</p>
                <p className="font-bold">Wali Kelas {kelasNama}</p>
                <div className="h-10 print:h-9" />
                <p className="font-bold underline uppercase">{customWalasNama}</p>
                <p className="text-[7.5px] font-mono text-slate-600 print:text-black">
                  {customWalasNip ? `NIP. ${customWalasNip}` : 'NIP. .....................................'}
                </p>
              </div>

              <div className="text-center w-56">
                <p className="text-slate-600 print:text-black">{customTitimangsa}</p>
                <p className="font-bold">Orang Tua / Wali Siswa</p>
                <div className="h-10 print:h-9" />
                <p className="font-bold underline uppercase">( .................................................... )</p>
                <p className="text-[7.5px] text-slate-500 print:text-black">Tanda Tangan & Nama Terang</p>
              </div>
            </div>

            {/* Baris 2: Kepala Sekolah (Tengah Bawah) */}
            <div className="text-center w-64 mx-auto -mt-2">
              <p className="font-semibold text-slate-600 print:text-black">Mengesahkan,</p>
              <p className="font-bold">Kepala Sekolah</p>
              <div className="h-10 print:h-9" />
              <p className="font-bold underline uppercase">{customKepsekNama}</p>
              <p className="text-[7.5px] font-mono text-slate-600 print:text-black">
                {customKepsekNip ? `NIP. ${customKepsekNip}` : 'NIP. .....................................'}
              </p>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

export default TrackingSiswaPrintModal;
