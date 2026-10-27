import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { SlidersHorizontal, UserCheck, RotateCcw, X } from 'lucide-react';
import type { RekapBulananPklRow } from '@/api/hubin.api';
import { guruApi } from '@/api/academic.api';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { usePklMatriksSigners } from '../nilai-pkl/usePklMatriksSigners';
import type { ViewMode } from './rekapPklColumns';

export interface RekapPresensiPklPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulan?: string;
  tahunPelajaran?: string;
  pembimbingId?: string;
  pembimbingNama?: string;
  pembimbingNip?: string;
  jurusanNama?: string;
  kelasNama?: string;
  mitraNama?: string;
  viewMode?: ViewMode;
  rows: RekapBulananPklRow[];
  dayNumbers?: number[];
}

export const RekapPresensiPklPrintModal: React.FC<RekapPresensiPklPrintModalProps> = ({
  isOpen,
  onClose,
  bulan,
  tahunPelajaran,
  pembimbingId,
  pembimbingNama: propPembimbingNama,
  pembimbingNip: propPembimbingNip,
  jurusanNama,
  kelasNama,
  mitraNama,
  viewMode = 'MATRIX',
  rows = [],
  dayNumbers = [],
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

  // 1. Hook SSOT Kop Surat Dinas & Sekolah
  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  // 2. Hook SSOT Struktur Organisasi (Waka Hubin & Kepala Sekolah)
  const autoSigners = usePklMatriksSigners(undefined, jurusanNama);

  // 3. Hook SSOT Master Tahun Pelajaran (Resolving UUID ke Human-Readable Label)
  const { rawList: tpList, activeYear } = useTahunPelajaranOptions();

  // 4. Query Live Guru List untuk sinkronisasi NIP Guru Pembimbing
  const { data: guruListRes } = useQuery({
    queryKey: ['guru-list-for-ttd-print'],
    queryFn: () => guruApi.getAll({ limit: 200 }).catch(() => null),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  const guruList: any[] = useMemo(() => {
    return guruListRes?.data || [];
  }, [guruListRes]);

  // Resolving Penandatangan Otomatis dari Database Riil (Tanpa Mock/Fallback Dummy)
  const resolvedSigners = useMemo(() => {
    // A. Waka Hubin (Struktur Organisasi kode: HUBIN)
    let resolvedHubinTitle = 'Waka. Bidang Hubungan Industri';
    let resolvedHubinNama = '';
    let resolvedHubinNip = '';

    if (autoSigners?.wakasekHubin?.isAssigned) {
      resolvedHubinNama = autoSigners.wakasekHubin.nama;
      resolvedHubinNip =
        autoSigners.wakasekHubin.nip && autoSigners.wakasekHubin.nip !== '-'
          ? autoSigners.wakasekHubin.nip
          : '';
      if (autoSigners.wakasekHubin.jabatan) {
        resolvedHubinTitle =
          autoSigners.wakasekHubin.jabatan.replace(/\s*&\s*Staf/i, '').trim() ||
          'Waka. Bidang Hubungan Industri';
      }
    }

    // B. Guru Pembimbing PKL
    let resolvedPembimbingNama = propPembimbingNama || '';
    let resolvedPembimbingNip = propPembimbingNip || '';

    // Cek dari rows jika belum ada dari props
    if (!resolvedPembimbingNama && rows.length > 0) {
      const firstWithTeacher = rows.find((r) => r.nama_pembimbing && r.nama_pembimbing !== '-');
      if (firstWithTeacher) {
        resolvedPembimbingNama = firstWithTeacher.nama_pembimbing || '';
      }
    }

    // Cari NIP guru pembimbing dari guruList
    const targetGuruId = pembimbingId || rows.find((r) => r.pembimbing_id)?.pembimbing_id;
    if (targetGuruId) {
      const matchGuru = guruList.find((g) => g.id === targetGuruId);
      if (matchGuru) {
        if (!resolvedPembimbingNama) resolvedPembimbingNama = matchGuru.nama_guru || matchGuru.nama || '';
        if (!resolvedPembimbingNip) resolvedPembimbingNip = matchGuru.nip || '';
      }
    } else if (resolvedPembimbingNama && !resolvedPembimbingNip) {
      const matchByName = guruList.find(
        (g) => (g.nama_guru || g.nama || '').toLowerCase() === resolvedPembimbingNama.toLowerCase()
      );
      if (matchByName?.nip) {
        resolvedPembimbingNip = matchByName.nip;
      }
    }

    // C. Kepala Sekolah
    let resolvedKepsekNama = '';
    let resolvedKepsekNip = '';

    if (autoSigners?.kepsek?.isAssigned) {
      resolvedKepsekNama = autoSigners.kepsek.nama;
      resolvedKepsekNip =
        autoSigners.kepsek.nip && autoSigners.kepsek.nip !== '-'
          ? autoSigners.kepsek.nip
          : '';
    } else if (rawSekolah?.kepala_sekolah) {
      resolvedKepsekNama = rawSekolah.kepala_sekolah;
      resolvedKepsekNip = (rawSekolah as any).nip_kepala || (rawSekolah as any).nip_kepala_sekolah || '';
    } else if ((tenantInfo as any)?.nama_kepsek || (tenantInfo as any)?.kepala_sekolah) {
      resolvedKepsekNama = (tenantInfo as any).nama_kepsek || (tenantInfo as any).kepala_sekolah || '';
      resolvedKepsekNip = (tenantInfo as any).nip_kepsek || '';
    }

    // D. Kota Sekolah
    const resolvedKota =
      rawSekolah?.kota ||
      (rawSekolah as any)?.kabupaten_kota ||
      (tenantInfo as any)?.kota ||
      (tenantInfo as any)?.kabupaten ||
      '';

    const resolvedTanggal = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return {
      kepsekNama: resolvedKepsekNama,
      kepsekNip: resolvedKepsekNip,
      hubinTitle: resolvedHubinTitle,
      hubinNama: resolvedHubinNama,
      hubinNip: resolvedHubinNip,
      pembimbingNama: resolvedPembimbingNama,
      pembimbingNip: resolvedPembimbingNip,
      kota: resolvedKota,
      tanggal: resolvedTanggal,
    };
  }, [autoSigners, guruList, rawSekolah, tenantInfo, propPembimbingNama, propPembimbingNip, pembimbingId, rows]);

  // Form State Penandatangan (Dapat disesuaikan sementara oleh pengguna via drawer)
  const [hubinTitle, setHubinTitle] = useState('');
  const [activeHubinNama, setActiveHubinNama] = useState('');
  const [activeHubinNip, setActiveHubinNip] = useState('');

  const [pembimbingTitle, setPembimbingTitle] = useState('Guru Pembimbing PKL');
  const [activePembimbingNama, setActivePembimbingNama] = useState('');
  const [activePembimbingNip, setActivePembimbingNip] = useState('');

  const [activeKepsekNama, setActiveKepsekNama] = useState('');
  const [activeKepsekNip, setActiveKepsekNip] = useState('');
  const [activeKota, setActiveKota] = useState('');
  const [activeTanggal, setActiveTanggal] = useState('');

  // Sinkronisasi otomatis saat resolvedSigners siap
  useEffect(() => {
    setHubinTitle(resolvedSigners.hubinTitle);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActivePembimbingNip(resolvedSigners.pembimbingNip);
    setActiveKepsekNama(resolvedSigners.kepsekNama);
    setActiveKepsekNip(resolvedSigners.kepsekNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
  }, [resolvedSigners]);

  const handleResetStruktur = useCallback(() => {
    setHubinTitle(resolvedSigners.hubinTitle);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActivePembimbingNip(resolvedSigners.pembimbingNip);
    setActiveKepsekNama(resolvedSigners.kepsekNama);
    setActiveKepsekNip(resolvedSigners.kepsekNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
    toast.success('Penandatangan berhasil direset sesuai hierarki struktur riil database.');
  }, [resolvedSigners]);

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

  // Resolving Tahun Pelajaran dari UUID ke Label Human-Readable (e.g. 2025/2026)
  const resolvedTahunPelajaran = useMemo(() => {
    if (!tahunPelajaran) return activeYear?.tahun || '';
    if (/^[0-9a-f-]{36}$/i.test(tahunPelajaran)) {
      const match = tpList.find((tp) => tp.id === tahunPelajaran);
      if (match?.tahun) return match.tahun;
      return activeYear?.tahun || '';
    }
    return tahunPelajaran;
  }, [tahunPelajaran, tpList, activeYear]);

  const resolvedDays = useMemo(() => {
    if (dayNumbers && dayNumbers.length > 0) return dayNumbers;
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, [dayNumbers]);

  // Pagination chunking: Max 24 baris per lembar landscape
  const pages = useMemo(() => {
    const chunkSize = orientation === 'landscape' ? 24 : 30;
    if (rows.length <= chunkSize) return [rows];
    const chunks: RekapBulananPklRow[][] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push(rows.slice(i, i + chunkSize));
    }
    return chunks;
  }, [rows, orientation]);

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.loading('Sedang merender PDF True WYSIWYG...', { id: 'pdf-render' });

    // 1. Simpan nilai zoom asli & matikan zoom sementara pada DOM sebelum capture
    // Menghilangkan anomali html2canvas di mana CSS zoom membuat teks/karakter saling bertumpuk (kerning collapse)
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
    }

    try {
      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        window.print();
        toast.dismiss('pdf-render');
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

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        }

        const sheet = sheetElements[i] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 1250,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              (clonedDesk.style as any).transform = 'none';
            }
            const allSheets = clonedDoc.querySelectorAll('.print-sheet');
            allSheets.forEach((s: any) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
            });
          },
        });

        // Optimasi True WYSIWYG: JPEG 0.90 tajam dengan ukuran berkas ringan (~250KB)
        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const safeTitle = `Rekap_Presensi_PKL_${bulanFormatted.replace(/\s+/g, '_')}`;
      pdf.save(`${safeTitle}.pdf`);
      toast.success('PDF Rekap Presensi PKL berhasil diunduh (True WYSIWYG)!', { id: 'pdf-render' });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal mengekspor canvas, membuka dialog cetak browser...', { id: 'pdf-render' });
      window.print();
    } finally {
      // 2. Kembalikan zoom asli setelah proses render selesai
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
      title="Pratinjau Cetak & PDF Rekapitulasi Presensi PKL"
      size="5xl"
      orientation={orientation}
      allowOrientationToggle={true}
      onOrientationChange={(newOrient) => setOrientation(newOrient)}
      allowLogoToggles={true}
      showLogoSekolah={showLogoSekolah}
      showLogoDaerah={showLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Mengunduh...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      extraActions={
        <button
          type="button"
          onClick={() => setShowTtdConfig(!showTtdConfig)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
            showTtdConfig
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title="Atur Pejabat Penandatangan Dokumen"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Atur TTD</span>
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
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="space-y-6">
        {/* Drawer Konfigurasi TTD */}
        {showTtdConfig && (
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b pb-2">
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Konfigurasi Penandatangan Terhubung Riil (2-Tier Signatures)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetStruktur}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Struktur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTtdConfig(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {hubinTitle || 'Waka Hubin'} (Sisi Kiri - HUBIN)
                </label>
                <input
                  type="text"
                  value={activeHubinNama}
                  onChange={(e) => setActiveHubinNama(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-slate-900"
                  placeholder="Nama Lengkap & Gelar"
                />
                <input
                  type="text"
                  value={activeHubinNip}
                  onChange={(e) => setActiveHubinNip(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1 dark:bg-slate-900"
                  placeholder="NIP (kosongkan jika belum ada)"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Guru Pembimbing (Sisi Kanan)
                </label>
                <input
                  type="text"
                  value={activePembimbingNama}
                  onChange={(e) => setActivePembimbingNama(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-slate-900"
                  placeholder="Nama Lengkap & Gelar"
                />
                <input
                  type="text"
                  value={activePembimbingNip}
                  onChange={(e) => setActivePembimbingNip(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1 dark:bg-slate-900"
                  placeholder="NIP"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Kepala Sekolah (Tengah Bawah)
                </label>
                <input
                  type="text"
                  value={activeKepsekNama}
                  onChange={(e) => setActiveKepsekNama(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-slate-900"
                  placeholder="Nama Kepala Sekolah"
                />
                <input
                  type="text"
                  value={activeKepsekNip}
                  onChange={(e) => setActiveKepsekNip(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1 dark:bg-slate-900"
                  placeholder="NIP Kepala Sekolah"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lembar Cetak Dokumen Resmi */}
        {pages.map((pageRows, pageIdx) => (
          <PrintDocumentSheet
            key={`page-${pageIdx}`}
            orientation={orientation}
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
            className="print-sheet !p-6 sm:!p-8 !font-sans tracking-normal"
          >
            {/* Kop Surat Resmi */}
            <PrintHeader
              showLogoSekolah={showLogoSekolah}
              showLogoDaerah={showLogoDaerah}
              variant="double-line"
              className="mb-4"
            />

            {/* Judul & Metadata */}
            <div className="text-center mb-4">
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-normal text-black">
                LAPORAN REKAPITULASI PRESENSI PRAKTIK KERJA LAPANGAN (PKL)
              </h2>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                Periode: {bulanFormatted} {resolvedTahunPelajaran ? `• Tahun Pelajaran ${resolvedTahunPelajaran}` : ''}
              </p>
              {activePembimbingNama && (
                <p className="text-[11px] text-slate-700 mt-0.5">
                  Guru Pembimbing: <span className="font-bold">{activePembimbingNama}</span>
                  {activePembimbingNip ? ` (NIP. ${activePembimbingNip})` : ''}
                </p>
              )}
            </div>

            {/* Matriks Tabel Kehadiran */}
            <div className="w-full overflow-hidden mb-6">
              <table className="w-full border-collapse border border-black text-[9px] text-black">
                <thead>
                  <tr className="bg-slate-100 font-extrabold text-center border-b border-black">
                    <th className="border border-black px-1.5 py-1 w-7">No</th>
                    <th className="border border-black px-2 py-1 text-left min-w-[120px]">Nama Siswa</th>
                    <th className="border border-black px-1 py-1 w-14">NIS</th>
                    <th className="border border-black px-1.5 py-1 text-left min-w-[100px]">Mitra DUDI</th>
                    {viewMode === 'MATRIX' &&
                      resolvedDays.map((d) => (
                        <th key={`th-day-${d}`} className="border border-black px-0.5 py-1 w-4 text-[8px]">
                          {d}
                        </th>
                      ))}
                    <th className="border border-black px-1 py-1 w-6 bg-emerald-50">H</th>
                    <th className="border border-black px-1 py-1 w-6 bg-amber-50">S</th>
                    <th className="border border-black px-1 py-1 w-6 bg-blue-50">I</th>
                    <th className="border border-black px-1 py-1 w-6 bg-rose-50">A</th>
                    <th className="border border-black px-1 py-1 w-6 bg-purple-50">T</th>
                    <th className="border border-black px-1.5 py-1 w-10">%</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, rIdx) => {
                    const no = pageIdx * (orientation === 'landscape' ? 24 : 30) + rIdx + 1;
                    return (
                      <tr key={row.siswa_pkl_id || `row-${rIdx}`} className="border-b border-black hover:bg-slate-50">
                        <td className="border border-black px-1 py-0.5 text-center">{no}</td>
                        <td className="border border-black px-2 py-0.5 font-bold truncate max-w-[140px]">
                          {row.nama_siswa}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono text-[8px]">
                          {row.nis || '-'}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 truncate max-w-[110px]">
                          {row.nama_mitra || '-'}
                        </td>
                        {viewMode === 'MATRIX' &&
                          resolvedDays.map((d) => {
                            const code = row.dailyMap?.[String(d)];
                            return (
                              <td
                                key={`td-${row.siswa_pkl_id}-${d}`}
                                className={`border border-black px-0.5 py-0.5 text-center font-bold text-[8px] ${
                                  code === 'H'
                                    ? 'text-emerald-700'
                                    : code === 'S'
                                    ? 'text-amber-700 bg-amber-50/50'
                                    : code === 'I'
                                    ? 'text-blue-700 bg-blue-50/50'
                                    : code === 'A'
                                    ? 'text-rose-700 bg-rose-50/50'
                                    : code === 'T'
                                    ? 'text-purple-700'
                                    : code === 'D'
                                    ? 'text-cyan-700'
                                    : 'text-slate-300'
                                }`}
                              >
                                {code || '·'}
                              </td>
                            );
                          })}
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.HADIR || 0}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.SAKIT || 0}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.IZIN || 0}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.ALPA || 0}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.TERLAMBAT || 0}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-bold">{row.persentase || 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Standar Penandatangan Dokumen (2-Tier Signatures - Simetris Sempurna) */}
            {pageIdx === pages.length - 1 && (
              <div className="pt-2 text-[10px] text-black break-inside-avoid">
                {/* Baris Titimangsa di Kanan (Tepat di atas kolom Guru Pembimbing) */}
                <div className="flex justify-end mb-1 text-[10px] text-black">
                  <div className="w-1/2 text-center">
                    {activeKota ? `${activeKota}, ` : ''}{activeTanggal}
                  </div>
                </div>

                {/* Baris 1: Grid 2 Kolom Sejajar & Simetris Sempurna */}
                <div className="grid grid-cols-2 gap-8 text-[10px]">
                  {/* Kolom Kiri: Waka Hubin (HUBIN) */}
                  <div className="flex flex-col justify-between h-[125px] text-center">
                    <div>
                      <p className="font-semibold text-slate-800">Mengetahui,</p>
                      <p className="font-bold text-black min-h-[24px] flex items-center justify-center leading-snug">
                        {hubinTitle || 'Waka. Bidang Hubungan Industri'}
                      </p>
                    </div>
                    <div>
                      {activeHubinNama ? (
                        <>
                          <p className="font-bold underline uppercase text-black text-[10px]">{activeHubinNama}</p>
                          <p className="text-[9px] text-slate-700">
                            {activeHubinNip ? `NIP. ${activeHubinNip}` : 'NIP. -'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold underline uppercase tracking-widest text-black text-[10px]">( ............................................................ )</p>
                          <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Guru Pembimbing PKL */}
                  <div className="flex flex-col justify-between h-[125px] text-center">
                    <div>
                      <p className="font-semibold text-slate-800">Mengetahui,</p>
                      <p className="font-bold text-black min-h-[24px] flex items-center justify-center leading-snug">
                        {pembimbingTitle || 'Guru Pembimbing PKL'}
                      </p>
                    </div>
                    <div>
                      {activePembimbingNama ? (
                        <>
                          <p className="font-bold underline uppercase text-black text-[10px]">{activePembimbingNama}</p>
                          <p className="text-[9px] text-slate-700">
                            {activePembimbingNip ? `NIP. ${activePembimbingNip}` : 'NIP. -'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold underline uppercase tracking-widest text-black text-[10px]">( ............................................................ )</p>
                          <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Baris 2: Pengesahan Kepala Sekolah (Tengah Bawah) */}
                <div className="mt-4 flex justify-center text-center text-[10px]">
                  <div className="w-80 flex flex-col justify-between h-[115px] text-center">
                    <div>
                      <p className="font-semibold text-slate-800">Menyetujui,</p>
                      <p className="font-bold text-black min-h-[24px] flex items-center justify-center leading-snug">
                        Kepala Sekolah
                      </p>
                    </div>
                    <div>
                      {activeKepsekNama ? (
                        <>
                          <p className="font-bold underline uppercase text-black text-[10px]">{activeKepsekNama}</p>
                          <p className="text-[9px] text-slate-700">
                            {activeKepsekNip ? `NIP. ${activeKepsekNip}` : 'NIP. -'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold underline uppercase tracking-widest text-black text-[10px]">( ............................................................ )</p>
                          <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                        </>
                      )}
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

export default RekapPresensiPklPrintModal;
