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
import { SlidersHorizontal, UserCheck, RotateCcw, X } from 'lucide-react';
import type { PengurusPosition } from './strukturTypes';
import type { Siswa } from '@/types/academic';

export interface StrukturOrganisasiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasId?: string;
  kelasNama?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
  tahunPelajaran?: string;
  positions: PengurusPosition[];
  studentsList?: Siswa[];
}

export const StrukturOrganisasiPrintModal: React.FC<StrukturOrganisasiPrintModalProps> = ({
  isOpen,
  onClose,
  kelasNama = 'Kelas',
  waliKelasNama = 'Wali Kelas',
  waliKelasNip = '',
  tahunPelajaran,
  positions,
  studentsList = [],
}) => {
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

  // Getters jabatan
  const km = positions.find((p) => p.id === 'km');
  const wkm = positions.find((p) => p.id === 'wkm');
  const sekretaris = positions.find((p) => p.id === 'sekretaris');
  const bendahara = positions.find((p) => p.id === 'bendahara');
  const seksiList = positions.filter((p) => p.category === 'SEKSI');

  // ── RESOLVE INITIAL KM SECARA PINTAR ──
  const resolvedKmNama = useMemo(() => {
    const rawKm = km?.assignedStudentNames?.[0];
    if (rawKm && !rawKm.includes('Belum Ditentukan') && rawKm.trim() !== '') {
      return rawKm;
    }
    const rawWkm = wkm?.assignedStudentNames?.[0];
    if (rawWkm && !rawWkm.includes('Belum Ditentukan') && rawWkm.trim() !== '') {
      return rawWkm;
    }
    if (studentsList && studentsList.length > 0 && studentsList[0]?.nama_siswa) {
      return studentsList[0].nama_siswa;
    }
    return '';
  }, [km, wkm, studentsList]);

  // ── LIVE EDITABLE STATE UNTUK PENANDATANGAN (TTD) ──
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

  // Sinkronisasi saat data profil atau props berubah
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

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Struktur Organisasi...');
    try {
      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const canvas = await html2canvas(sheetElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Struktur_Organisasi_${kelasNama.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Struktur Organisasi berhasil diunduh!', { id: toastId });
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
      title={`Cetak Struktur Organisasi — ${kelasNama}`}
      subtitle="Dokumen resmi bagan kepengurusan rombel peserta didik"
      orientation="portrait"
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
          onClick={() => setShowTtdConfig((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
            showTtdConfig
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title="Sesuaikan nama penandatangan (TTD) sebelum cetak"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showTtdConfig ? 'Tutup Pengaturan TTD' : 'Pengaturan TTD'}</span>
        </button>
      }
      size="5xl"
    >
      {/* ── PANEL KONTROL PENGATURAN TTD (PRINT:HIDDEN) ── */}
      {showTtdConfig && (
        <div className="print:hidden mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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

      <PrintDocumentSheet
        orientation="portrait"
        pageNumber={1}
        totalPages={1}
        footerText={`Struktur Organisasi Kelas — ${kelasNama} — TP. ${tahunPelajaran || '2025/2026'}`}
      >
        {/* KOP SURAT RESMI */}
        <PrintHeader
          variant="portrait"
          tenantInfo={tenantInfo}
          showLogoDaerah={showLogoDaerah}
          showLogoSekolah={showLogoSekolah}
        />

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-3 space-y-0.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            STRUKTUR ORGANISASI KELAS
          </h3>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            ROMBEL {kelasNama.toUpperCase()}
          </h4>
          <p className="text-[10px] italic text-slate-600">
            Tahun Pelajaran {tahunPelajaran || '2025/2026'}
          </p>
        </div>

        {/* ── BAGAN STRUKTUR POHON WYSIWYG ── */}
        <div className="my-4 flex flex-col items-center select-none">
          {/* LEVEL 1: WALI KELAS */}
          <div className="w-64 border-2 border-black rounded-lg p-2 text-center bg-slate-50">
            <span className="text-[9px] font-bold uppercase text-slate-600 block">
              Pembina / Wali Kelas
            </span>
            <p className="text-xs font-bold text-black mt-0.5">{activeWaliKelasNama}</p>
            {activeWaliKelasNip && (
              <p className="text-[9px] font-mono text-slate-700">NIP. {activeWaliKelasNip}</p>
            )}
          </div>

          {/* Garis Penghubung Level 1 -> 2 */}
          <div className="w-0.5 h-4 bg-black" />

          {/* LEVEL 2: KETUA MURID (KM) */}
          <div className="w-64 border-2 border-black rounded-lg p-2 text-center bg-slate-50">
            <span className="text-[9px] font-bold uppercase text-slate-600 block">
              Ketua Murid (KM)
            </span>
            <p className="text-xs font-bold text-black mt-0.5">
              {activeKmNama || km?.assignedStudentNames[0] || '(Belum Ditentukan)'}
            </p>
          </div>

          {/* Garis Penghubung Level 2 -> 3 */}
          <div className="w-0.5 h-4 bg-black" />

          {/* LEVEL 3: WAKIL KETUA MURID */}
          <div className="w-60 border border-black rounded-lg p-1.5 text-center bg-white">
            <span className="text-[8.5px] font-bold uppercase text-slate-600 block">
              Wakil Ketua Murid
            </span>
            <p className="text-[11px] font-bold text-black mt-0.5">
              {wkm?.assignedStudentNames[0] || '(Belum Ditentukan)'}
            </p>
          </div>

          {/* Garis Penghubung Level 3 -> 4 */}
          <div className="w-0.5 h-4 bg-black" />

          {/* LEVEL 4: SEKRETARIS & BENDAHARA */}
          <div className="w-full max-w-[480px]">
            <div className="grid grid-cols-2 gap-4">
              {/* Sekretaris */}
              <div className="border border-black rounded-lg p-2 text-center bg-white">
                <span className="text-[9px] font-bold uppercase text-slate-600 block border-b border-slate-300 pb-1 mb-1">
                  Sekretaris Kelas
                </span>
                <div className="text-[10px] space-y-0.5 text-black font-semibold">
                  {sekretaris?.assignedStudentNames.map((name, i) => (
                    <p key={i}>
                      {i + 1}. {name}
                    </p>
                  ))}
                </div>
              </div>

              {/* Bendahara */}
              <div className="border border-black rounded-lg p-2 text-center bg-white">
                <span className="text-[9px] font-bold uppercase text-slate-600 block border-b border-slate-300 pb-1 mb-1">
                  Bendahara Kelas
                </span>
                <div className="text-[10px] space-y-0.5 text-black font-semibold">
                  {bendahara?.assignedStudentNames.map((name, i) => (
                    <p key={i}>
                      {i + 1}. {name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-0.5 h-3 bg-black mx-auto" />
          </div>

          {/* LEVEL 5: SEKSI-SEKSI BIDANG */}
          <div className="w-full max-w-[560px] pt-1">
            <div className="grid grid-cols-4 gap-2">
              {seksiList.map((seksi) => (
                <div
                  key={seksi.id}
                  className="border border-black rounded-lg p-1.5 text-center bg-white"
                >
                  <span className="text-[8.5px] font-bold uppercase text-slate-600 block border-b border-slate-300 pb-0.5 mb-0.5">
                    {seksi.roleTitle}
                  </span>
                  <p className="text-[9.5px] font-bold text-black truncate mt-1">
                    {seksi.assignedStudentNames[0] || '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TANDA TANGAN RESMI 2-TIER (Kemenag/Kemdikbud Standard) ── */}
        <div className="mt-8 pt-2">
          {/* Tier 1: Wali Kelas (Kanan) & Ketua Murid (Kiri) */}
          <div className="flex justify-between items-start text-center">
            <div className="w-56 font-serif">
              <p className="text-[11px] mb-1">Mengetahui,</p>
              <p className="text-[11px] font-bold mb-16">{kmTitle}</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {activeKmNama ? activeKmNama : '( ........................................ )'}
              </p>
              <p className="text-[10px] text-slate-600">Perwakilan Siswa</p>
            </div>

            <div className="w-56 font-serif">
              <p className="text-[11px] mb-1">
                {activeKota}, {activeTanggal}
              </p>
              <p className="text-[11px] font-bold mb-16">Wali Kelas {kelasNama}</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {activeWaliKelasNama}
              </p>
              <p className="text-[10px] text-slate-700 font-mono">
                {activeWaliKelasNip ? `NIP. ${activeWaliKelasNip}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>

          {/* Tier 2: Kepala Sekolah (Tengah Bawah) */}
          <div className="flex justify-center mt-6 text-center">
            <div className="w-64 font-serif">
              <p className="text-[11px] mb-1">Mengesahkan,</p>
              <p className="text-[11px] font-bold mb-16">Kepala Sekolah</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {activeKepsekNama}
              </p>
              <p className="text-[10px] text-slate-700 font-mono">
                {activeKepsekNip ? `NIP. ${activeKepsekNip}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

StrukturOrganisasiPrintModal.displayName = 'StrukturOrganisasiPrintModal';
