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
import { getStrukturTree } from '@/api/academic/strukturOrganisasi.api';
import { guruApi } from '@/api/academic.api';
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

  // 2. Query Live Struktur Organisasi Tree
  const { data: treeRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-print-live'],
    queryFn: () => getStrukturTree().catch(() => null),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  // 3. Query Live Guru List untuk sinkronisasi NIP
  const { data: guruListRes } = useQuery({
    queryKey: ['guru-list-for-ttd-print'],
    queryFn: () => guruApi.getAll({ limit: 200 }).catch(() => null),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  const rawPositions: any[] = useMemo(() => {
    const d = treeRes?.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') {
      const all: any[] = [];
      Object.values(d).forEach((v) => {
        if (Array.isArray(v)) all.push(...v);
      });
      return all;
    }
    return [];
  }, [treeRes]);

  const guruList: any[] = useMemo(() => {
    return guruListRes?.data || [];
  }, [guruListRes]);

  // Resolving Penandatangan Otomatis dari Database Riil (Tanpa Mock/Fallback Dummy)
  const resolvedSigners = useMemo(() => {
    // A. Kepala Sekolah
    let resolvedKepsekNama = '';
    let resolvedKepsekNip = '';

    const kepsekPos = rawPositions.find(
      (p) => p.code === 'KEPALA_SEKOLAH' || p.name?.toLowerCase().includes('kepala sekolah')
    );
    const activeKepsekAssign = kepsekPos?.organizationalAssigns?.find((a: any) => a.is_active);
    if (activeKepsekAssign?.User) {
      resolvedKepsekNama = activeKepsekAssign.User.Guru?.nama_guru || activeKepsekAssign.User.name || '';
      resolvedKepsekNip = activeKepsekAssign.User.Guru?.nip || '';
    } else if (rawSekolah?.kepala_sekolah) {
      resolvedKepsekNama = rawSekolah.kepala_sekolah;
      resolvedKepsekNip = (rawSekolah as any).nip_kepala || (rawSekolah as any).nip_kepala_sekolah || '';
    } else if ((tenantInfo as any)?.nama_kepsek || (tenantInfo as any)?.kepala_sekolah) {
      resolvedKepsekNama = (tenantInfo as any).nama_kepsek || (tenantInfo as any).kepala_sekolah || '';
      resolvedKepsekNip = (tenantInfo as any).nip_kepsek || '';
    }

    // B. Koordinator Hubin / Pokja PKL
    let resolvedHubinTitle = 'Koordinator Hubin / Pokja PKL';
    let resolvedHubinNama = '';
    let resolvedHubinNip = '';

    const hubinPos = rawPositions.find(
      (p) =>
        p.code === 'HUBIN' ||
        p.code === 'WAKA_HUBIN' ||
        p.code === 'KOORDINATOR_HUBIN' ||
        p.code === 'POKJA_PKL' ||
        p.code?.includes('HUBIN') ||
        p.name?.toLowerCase().includes('hubin')
    );
    if (hubinPos) {
      resolvedHubinTitle = hubinPos.name || 'Koordinator Hubin';
      const activeHubinAssign = hubinPos.organizationalAssigns?.find((a: any) => a.is_active);
      if (activeHubinAssign?.User) {
        resolvedHubinNama = activeHubinAssign.User.Guru?.nama_guru || activeHubinAssign.User.name || '';
        resolvedHubinNip = activeHubinAssign.User.Guru?.nip || '';
      }
    }

    // C. Guru Pembimbing PKL
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
  }, [rawPositions, guruList, rawSekolah, tenantInfo, propPembimbingNama, propPembimbingNip, pembimbingId, rows]);

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

      const safeTitle = `Rekap_Presensi_PKL_${bulanFormatted.replace(/\s+/g, '_')}`;
      pdf.save(`${safeTitle}.pdf`);
      toast.success('PDF Rekap Presensi PKL berhasil diunduh!', { id: 'pdf-render' });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal mengekspor canvas, membuka dialog cetak browser...', { id: 'pdf-render' });
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak & PDF Rekapitulasi Presensi PKL"
      size="5xl"
      allowLogoToggles={true}
      showLogoSekolah={showLogoSekolah}
      showLogoDaerah={showLogoDaerah}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      orientation={orientation}
      onToggleOrientation={() => setOrientation(orientation === 'landscape' ? 'portrait' : 'landscape')}
      onPrint={handleBrowserPrint}
      onDownload={handleDownloadPdf}
      isDownloading={isExporting}
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
                  Koordinator Hubin (Sisi Kiri)
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
            className="print-sheet !p-6 sm:!p-8 font-serif"
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
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-black">
                LAPORAN REKAPITULASI PRESENSI PRAKTIK KERJA LAPANGAN (PKL)
              </h2>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                Periode: {bulanFormatted} {tahunPelajaran ? `• Tahun Pelajaran ${tahunPelajaran}` : ''}
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

            {/* Standar Penandatangan Dokumen (2-Tier Signatures - Live Connected) */}
            {pageIdx === pages.length - 1 && (
              <div className="pt-2 text-[10px] text-black break-inside-avoid">
                {/* Baris 1: Kiri Koordinator Hubin, Kanan Titimangsa & Guru Pembimbing */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <p className="font-semibold mb-12">Mengetahui,</p>
                    {activeHubinNama ? (
                      <>
                        <p className="font-bold underline uppercase">{activeHubinNama}</p>
                        <p className="text-[9px] text-slate-700">{hubinTitle}</p>
                        <p className="text-[9px] text-slate-700">
                          {activeHubinNip ? `NIP. ${activeHubinNip}` : 'NIP. -'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold underline uppercase tracking-widest">( ............................................................ )</p>
                        <p className="text-[9px] text-slate-700">{hubinTitle}</p>
                        <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5">
                      {activeKota ? `${activeKota}, ` : ''}{activeTanggal}
                    </p>
                    <p className="font-semibold mb-12">{pembimbingTitle}</p>
                    {activePembimbingNama ? (
                      <>
                        <p className="font-bold underline uppercase">{activePembimbingNama}</p>
                        <p className="text-[9px] text-slate-700">
                          {activePembimbingNip ? `NIP. ${activePembimbingNip}` : 'NIP. -'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold underline uppercase tracking-widest">( ............................................................ )</p>
                        <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Baris 2: Tengah Kepala Sekolah */}
                <div className="text-center">
                  <p className="font-semibold mb-12">Menyetujui,</p>
                  {activeKepsekNama ? (
                    <>
                      <p className="font-bold underline uppercase">{activeKepsekNama}</p>
                      <p className="text-[9px] text-slate-700">Kepala Sekolah</p>
                      <p className="text-[9px] text-slate-700">
                        {activeKepsekNip ? `NIP. ${activeKepsekNip}` : 'NIP. -'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold underline uppercase tracking-widest">( ............................................................ )</p>
                      <p className="text-[9px] text-slate-700">Kepala Sekolah</p>
                      <p className="text-[9px] text-slate-700">NIP. ........................................</p>
                    </>
                  )}
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
