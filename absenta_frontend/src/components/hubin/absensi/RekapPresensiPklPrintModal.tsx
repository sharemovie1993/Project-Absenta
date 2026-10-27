import React, { useState, useMemo } from 'react';
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
import type { ViewMode } from './rekapPklColumns';

export interface RekapPresensiPklPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulan?: string;
  tahunPelajaran?: string;
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
  pembimbingNama = 'Guru Pembimbing',
  pembimbingNip = '',
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

  // Penandatangan States
  const [hubinTitle, setHubinTitle] = useState('Koordinator Hubin / Pokja PKL');
  const [activeHubinNama, setActiveHubinNama] = useState('Koordinator Hubin & PKL');
  const [activeHubinNip, setActiveHubinNip] = useState('');

  const [pembimbingTitle, setPembimbingTitle] = useState('Guru Pembimbing PKL');
  const [activePembimbingNama, setActivePembimbingNama] = useState(pembimbingNama || 'Guru Pembimbing');
  const [activePembimbingNip, setActivePembimbingNip] = useState(pembimbingNip || '');

  const [activeKepsekNama, setActiveKepsekNama] = useState(rawKepsekNama);
  const [activeKepsekNip, setActiveKepsekNip] = useState(rawNipKepsek && rawNipKepsek !== '-' ? rawNipKepsek : '');
  const [activeKota, setActiveKota] = useState(rawKotaSekolah);
  const [activeTanggal, setActiveTanggal] = useState(rawTanggal);

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

  // Pagination chunking: Max 25 rows per landscape sheet
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
                Konfigurasi Penandatangan Resmi (2-Tier Signatures)
              </span>
              <button
                type="button"
                onClick={() => setShowTtdConfig(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Koordinator Hubin</label>
                <input
                  type="text"
                  value={activeHubinNama}
                  onChange={(e) => setActiveHubinNama(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-slate-900"
                  placeholder="Nama Koordinator"
                />
                <input
                  type="text"
                  value={activeHubinNip}
                  onChange={(e) => setActiveHubinNip(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1 dark:bg-slate-900"
                  placeholder="NIP (opsional)"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Guru Pembimbing</label>
                <input
                  type="text"
                  value={activePembimbingNama}
                  onChange={(e) => setActivePembimbingNama(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-slate-900"
                  placeholder="Nama Pembimbing"
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
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Kepala Sekolah</label>
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
              {pembimbingNama && (
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

            {/* Standar Penandatangan Dokumen (2-Tier Signatures) */}
            {pageIdx === pages.length - 1 && (
              <div className="pt-2 text-[10px] text-black break-inside-avoid">
                {/* Baris 1: Kiri Verifikator / Pokja PKL, Kanan Guru Pembimbing */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <p className="font-semibold mb-12">Mengetahui,</p>
                    <p className="font-bold underline uppercase">{activeHubinNama}</p>
                    <p className="text-[9px] text-slate-700">{hubinTitle}</p>
                    {activeHubinNip && <p className="text-[9px] text-slate-700">NIP. {activeHubinNip}</p>}
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5">{activeKota}, {activeTanggal}</p>
                    <p className="font-semibold mb-12">{pembimbingTitle}</p>
                    <p className="font-bold underline uppercase">{activePembimbingNama}</p>
                    {activePembimbingNip ? (
                      <p className="text-[9px] text-slate-700">NIP. {activePembimbingNip}</p>
                    ) : (
                      <p className="text-[9px] text-slate-500">Guru Pembimbing Lapangan</p>
                    )}
                  </div>
                </div>

                {/* Baris 2: Tengah Kepala Sekolah */}
                <div className="text-center">
                  <p className="font-semibold mb-12">Menyetujui,</p>
                  <p className="font-bold underline uppercase">{activeKepsekNama}</p>
                  <p className="text-[9px] text-slate-700">Kepala Sekolah</p>
                  {activeKepsekNip && <p className="text-[9px] text-slate-700">NIP. {activeKepsekNip}</p>}
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
