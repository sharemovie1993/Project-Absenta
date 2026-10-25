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
import type { PiketDaySlot } from './strukturTypes';
import type { Siswa } from '@/types/academic';

export interface JadwalPiketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasId?: string;
  kelasNama?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
  tahunPelajaran?: string;
  slots: PiketDaySlot[];
  studentsList?: Siswa[];
}

export const JadwalPiketPrintModal: React.FC<JadwalPiketPrintModalProps> = ({
  isOpen,
  onClose,
  kelasId,
  kelasNama = 'Kelas',
  waliKelasNama = 'Wali Kelas',
  waliKelasNip = '',
  tahunPelajaran,
  slots,
  studentsList = [],
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
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

  // ── RESOLVE INITIAL KOORDINATOR KEBERSIHAN SECARA PINTAR ──
  const resolvedKoordinatorNama = useMemo(() => {
    try {
      if (kelasId) {
        const savedStruktur = localStorage.getItem(`absenta_walas_struktur_${kelasId}`);
        if (savedStruktur) {
          const parsed = JSON.parse(savedStruktur);
          if (Array.isArray(parsed)) {
            // Prioritas 1: Seksi Kebersihan (5R) dari Bagan Struktur Kelas
            const seksiBersih = parsed.find((p: any) => p.id === 'seksi_kebersihan');
            if (seksiBersih && seksiBersih.assignedStudentNames?.length > 0) {
              const name = seksiBersih.assignedStudentNames[0];
              if (name && !name.includes('Belum Ditentukan') && name.trim() !== '') {
                return name;
              }
            }
            // Prioritas 2: Ketua Murid (KM)
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

    // Prioritas 3: Koordinator regu piket dari slot yang ada
    for (const slot of slots) {
      const koord = slot.members.find((m) => m.isKoordinator);
      if (koord && koord.nama) return koord.nama;
    }

    // Prioritas 4: Siswa pertama dari rombel
    if (studentsList && studentsList.length > 0 && studentsList[0]?.nama_siswa) {
      return studentsList[0].nama_siswa;
    }

    return '';
  }, [kelasId, slots, studentsList]);

  // ── LIVE EDITABLE STATE UNTUK PENANDATANGAN (TTD) ──
  const [koordinatorTitle, setKoordinatorTitle] = useState<string>('Koordinator Seksi Kebersihan');
  const [koordinatorNama, setKoordinatorNama] = useState<string>(resolvedKoordinatorNama);
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
    if (resolvedKoordinatorNama && !koordinatorNama) {
      setKoordinatorNama(resolvedKoordinatorNama);
    }
  }, [resolvedKoordinatorNama]);

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
    setKoordinatorTitle('Koordinator Seksi Kebersihan');
    setKoordinatorNama(resolvedKoordinatorNama);
    setActiveWaliKelasNama(waliKelasNama || 'Wali Kelas');
    setActiveWaliKelasNip(waliKelasNip || '');
    setActiveKepsekNama(rawKepsekNama);
    setActiveKepsekNip(rawNipKepsek && rawNipKepsek !== '-' ? rawNipKepsek : '');
    setActiveKota(rawKotaSekolah);
    setActiveTanggal(rawTanggal);
    toast.info('Data penandatangan direset ke nilai default otomatis.');
  };

  if (!isOpen) return null;

  const totalSiswaTerbagi = slots.reduce((acc, s) => acc + s.members.length, 0);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Jadwal Piket...');
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
      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Jadwal_Piket_${kelasNama.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Jadwal Piket berhasil diunduh!', { id: toastId });
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
      title={`Cetak Jadwal Piket — ${kelasNama}`}
      subtitle="Dokumen resmi pembagian regu kerja kebersihan ruang kelas"
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
            {/* Kolom 1: Koordinator Kebersihan */}
            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10.5px]">
                1. Koordinator Siswa (Kiri)
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block">Jabatan / Judul TTD:</label>
                <input
                  type="text"
                  value={koordinatorTitle}
                  onChange={(e) => setKoordinatorTitle(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Koordinator Seksi Kebersihan"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Nama Siswa Koordinator:</label>
                <input
                  type="text"
                  value={koordinatorNama}
                  onChange={(e) => setKoordinatorNama(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  placeholder="Nama Siswa..."
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
        orientation={orientation}
        pageNumber={1}
        totalPages={1}
        footerText={`Jadwal Piket Kebersihan — ${kelasNama} — TP. ${tahunPelajaran || '2025/2026'}`}
      >
        {/* KOP SURAT RESMI */}
        <PrintHeader
          variant={orientation}
          tenantInfo={tenantInfo}
          showLogoDaerah={showLogoDaerah}
          showLogoSekolah={showLogoSekolah}
        />

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-3 space-y-0.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            JADWAL REGU PIKET KEBERSIHAN KELAS
          </h3>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            ROMBEL {kelasNama.toUpperCase()}
          </h4>
          <p className="text-[10px] italic text-slate-600">
            Tahun Pelajaran {tahunPelajaran || '2025/2026'}
          </p>
        </div>

        {/* TABEL INFORMASI KELAS */}
        <div className="border border-black/80 rounded-sm p-2 my-2 bg-slate-50/50 text-[10.5px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="font-semibold text-slate-600">Rombel: </span>
              <span className="font-bold text-black">{kelasNama}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Wali Kelas: </span>
              <span className="font-bold text-black">{activeWaliKelasNama}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Total Siswa Terbagi: </span>
              <span className="font-bold text-black">{totalSiswaTerbagi} Siswa</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Regu Operasional: </span>
              <span className="font-bold text-black">5 Regu (Senin - Jumat)</span>
            </div>
          </div>
        </div>

        {/* ── TABEL MATRIKS 5 KOLOM HARI PIKET (SENIN - JUMAT) ── */}
        <div className="my-3">
          <table className="w-full border-collapse border-2 border-black text-left text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-black">
                {slots.map((s) => (
                  <th
                    key={s.dayIndex}
                    className="p-2 border-r border-black text-center last:border-r-0"
                  >
                    <p className="font-black text-black uppercase text-[11px] leading-tight">
                      {s.dayName}
                    </p>
                    <p className="text-[9px] font-bold text-slate-600">
                      {s.reguName} ({s.members.length} Siswa)
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="align-top">
              <tr>
                {slots.map((slot) => {
                  const koord = slot.members.find((m) => m.isKoordinator);

                  return (
                    <td
                      key={slot.dayIndex}
                      className="p-2 border-r border-black last:border-r-0 min-w-[90px]"
                    >
                      {/* Koordinator */}
                      {koord && (
                        <div className="mb-2 p-1.5 border border-black/80 rounded bg-slate-50 text-[10px]">
                          <span className="text-[8.5px] font-black uppercase text-slate-700 block">
                            Koordinator Regu:
                          </span>
                          <span className="font-bold text-black block leading-tight">
                            {koord.nama}
                          </span>
                          {koord.nis && (
                            <span className="text-[8px] text-slate-500 font-mono">
                              NIS: {koord.nis}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Anggota */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] font-black uppercase text-slate-600 block">
                          Anggota Regu:
                        </span>
                        {slot.members.length === 0 ? (
                          <p className="text-[9px] italic text-slate-400">-</p>
                        ) : (
                          slot.members.map((member, idx) => (
                            <div
                              key={member.siswaId || idx}
                              className="text-[9.5px] leading-tight flex items-start gap-1 pb-0.5 border-b border-slate-100 last:border-b-0"
                            >
                              <span className="font-bold text-slate-600 w-3 text-right shrink-0">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-black block truncate" title={member.nama}>
                                  {member.nama}
                                </span>
                                <span className="text-[8px] text-slate-500 font-mono">
                                  {member.nis || '-'} ({member.gender || 'S'})
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* STANDAR OPERASIONAL PROSEDUR (SOP) 5R KEBERSIHAN */}
        <div className="my-2 p-2 border border-black/70 rounded bg-slate-50/60 text-[9.5px] leading-relaxed">
          <p className="font-bold uppercase tracking-wider text-black mb-0.5">
            Tata Tertib & SOP Kebersihan Ruang Kelas (5R):
          </p>
          <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
            <li>Regu piket wajib hadir di sekolah 15 menit sebelum bel masuk dimulai dan pulang setelah kelas rapi.</li>
            <li>Membersihkan, menyapu, dan mengepel lantai ruang kelas sebelum dan sesudah KBM selesai.</li>
            <li>Membersihkan papan tulis, merapikan spidol, penghapus, dan taplak meja guru.</li>
            <li>Memastikan seluruh sampah di dalam laci meja dan bak sampah kelas dibuang ke tempat penampungan luar.</li>
            <li>Mematikan lampu, kipas angin/AC, serta mengunci pintu dan jendela sebelum meninggalkan ruangan.</li>
          </ol>
        </div>

        {/* ── TANDA TANGAN RESMI 2-TIER (TERHUBUNG LENGKAP & EDITABLE) ── */}
        <div className="mt-4 pt-1">
          {/* Tier 1: Wali Kelas (Kanan) & Koordinator Kebersihan (Kiri) */}
          <div className="flex justify-between items-start text-center">
            <div className="w-60 font-serif">
              <p className="text-[10.5px] mb-1">Mengetahui,</p>
              <p className="text-[10.5px] font-bold mb-12">{koordinatorTitle}</p>
              <p className="text-[11px] font-bold underline uppercase">
                {koordinatorNama ? koordinatorNama : '( ........................................ )'}
              </p>
              <p className="text-[9.5px] text-slate-600">Perwakilan Siswa</p>
            </div>

            <div className="w-60 font-serif">
              <p className="text-[10.5px] mb-1">
                {activeKota}, {activeTanggal}
              </p>
              <p className="text-[10.5px] font-bold mb-12">Wali Kelas {kelasNama}</p>
              <p className="text-[11px] font-bold underline uppercase">
                {activeWaliKelasNama}
              </p>
              <p className="text-[9.5px] text-slate-700 font-mono">
                {activeWaliKelasNip ? `NIP. ${activeWaliKelasNip}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>

          {/* Tier 2: Kepala Sekolah (Tengah Bawah) */}
          <div className="flex justify-center mt-3 text-center">
            <div className="w-64 font-serif">
              <p className="text-[10.5px] mb-1">Mengesahkan,</p>
              <p className="text-[10.5px] font-bold mb-12">Kepala Sekolah</p>
              <p className="text-[11px] font-bold underline uppercase">
                {activeKepsekNama}
              </p>
              <p className="text-[9.5px] text-slate-700 font-mono">
                {activeKepsekNip ? `NIP. ${activeKepsekNip}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

JadwalPiketPrintModal.displayName = 'JadwalPiketPrintModal';
