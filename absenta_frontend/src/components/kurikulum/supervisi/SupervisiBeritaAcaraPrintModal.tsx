import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { Supervisi } from '@/api/kurikulum.api';
import { formatDate } from '@/utils/layoutUtils';
import toast from 'react-hot-toast';
import { SlidersHorizontal, RotateCcw, UserCheck, Calendar, MapPin } from 'lucide-react';

export interface SupervisiBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisi: Supervisi | null;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

// ── Resolusi Nama Kota/Kabupaten Sekolah secara Dinamis & Cerdas (SSOT Multi-Tenant) ──
function resolveDynamicCity(rawSekolah?: any, tenantInfo?: any): string {
  if (rawSekolah?.kota?.trim()) return rawSekolah.kota.trim();
  if (rawSekolah?.kabupaten?.trim()) return rawSekolah.kabupaten.trim();
  if (tenantInfo?.kabupaten?.trim()) return tenantInfo.kabupaten.trim();
  if (tenantInfo?.kota?.trim()) return tenantInfo.kota.trim();

  // Ekstraksi cerdas dari alamat sekolah (misal: "Kec. Plered, Kab. Purwakarta" -> "Purwakarta")
  const fullAddress = `${rawSekolah?.alamat || ''} ${tenantInfo?.address || ''}`;
  const kabMatch = fullAddress.match(/(?:Kab\.?|Kabupaten|Kota)\s+([A-Za-z\s]+?)(?:[0-9]|\,|$)/i);
  if (kabMatch && kabMatch[1]) {
    return kabMatch[1].trim();
  }

  // Ekstraksi cerdas dari nama sekolah (misal: "SMKN 1 PLERED - PURWAKARTA" -> "Purwakarta")
  const schoolName = `${rawSekolah?.nama || ''} ${tenantInfo?.name || ''}`;
  const nameMatch = schoolName.match(/[-–]\s*([A-Za-z\s]+)$/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }

  // Fallback jika tidak terdeteksi
  return 'Purwakarta';
}

export const SupervisiBeritaAcaraPrintModal: React.FC<SupervisiBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  supervisi,
  tahunPelajaranNama,
  semesterNama,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // 1. Toggle Kop Surat (Logo Daerah & Sekolah)
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  // 2. Panel Pengaturan TTD State
  const [showTtdConfig, setShowTtdConfig] = useState(false);

  // Resolving SSOT Tenant & School Data
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();

  // Penandatangan Default Dinamis dari Sistem & Tenant
  const defaultKota = useMemo(() => {
    return resolveDynamicCity(rawSekolah, tenantInfo);
  }, [rawSekolah, tenantInfo]);

  const defaultTanggal = useMemo(() => {
    if (supervisi?.tanggal) {
      try {
        const d = new Date(supervisi.tanggal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch {
        // fallback
      }
    }
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [supervisi?.tanggal]);

  const defaultGuruNama = supervisi?.Guru?.nama_guru || '';
  const defaultGuruNip = supervisi?.Guru?.nip || '';
  const defaultSupervisorNama = supervisi?.Supervisor?.nama_guru || 'Tim Pengembang Kurikulum';
  const defaultSupervisorNip = supervisi?.Supervisor?.nip || '';
  const defaultKepsekNama = (rawSekolah as any)?.kepala_sekolah || (tenantInfo as any)?.kepala_sekolah || 'Dra. Hj. Siti Rahma, M.Pd';
  const defaultKepsekNip = (rawSekolah as any)?.nip_kepala || (tenantInfo as any)?.nip_kepala || '197001011995032001';

  // Customizable Penandatangan State
  const [activeKota, setActiveKota] = useState(defaultKota);
  const [activeTanggal, setActiveTanggal] = useState(defaultTanggal);
  const [activeGuruNama, setActiveGuruNama] = useState(defaultGuruNama);
  const [activeGuruNip, setActiveGuruNip] = useState(defaultGuruNip);
  const [activeSupervisorNama, setActiveSupervisorNama] = useState(defaultSupervisorNama);
  const [activeSupervisorNip, setActiveSupervisorNip] = useState(defaultSupervisorNip);
  const [activeKepsekNama, setActiveKepsekNama] = useState(defaultKepsekNama);
  const [activeKepsekNip, setActiveKepsekNip] = useState(defaultKepsekNip);

  // Sinkronisasi data saat supervisi, rawSekolah, atau tenant berubah
  useEffect(() => {
    if (supervisi) {
      setActiveGuruNama(supervisi.Guru?.nama_guru || '');
      setActiveGuruNip(supervisi.Guru?.nip || '');
      setActiveSupervisorNama(supervisi.Supervisor?.nama_guru || 'Tim Pengembang Kurikulum');
      setActiveSupervisorNip(supervisi.Supervisor?.nip || '');
      setActiveKepsekNama((rawSekolah as any)?.kepala_sekolah || (tenantInfo as any)?.kepala_sekolah || 'Dra. Hj. Siti Rahma, M.Pd');
      setActiveKepsekNip((rawSekolah as any)?.nip_kepala || (tenantInfo as any)?.nip_kepala || '197001011995032001');
      setActiveKota(defaultKota);
      setActiveTanggal(defaultTanggal);
    }
  }, [supervisi, rawSekolah, tenantInfo, defaultKota, defaultTanggal]);

  const handleResetTtd = () => {
    setActiveGuruNama(defaultGuruNama);
    setActiveGuruNip(defaultGuruNip);
    setActiveSupervisorNama(defaultSupervisorNama);
    setActiveSupervisorNip(defaultSupervisorNip);
    setActiveKepsekNama(defaultKepsekNama);
    setActiveKepsekNip(defaultKepsekNip);
    setActiveKota(defaultKota);
    setActiveTanggal(defaultTanggal);
    toast.success('Pengaturan penandatangan dikembalikan ke default');
  };

  const formattedDate = useMemo(() => {
    if (!supervisi?.tanggal) return '-';
    try {
      const d = new Date(supervisi.tanggal);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return formatDate(supervisi.tanggal);
    }
  }, [supervisi?.tanggal]);

  const scoreTier = useMemo(() => {
    const n = supervisi?.nilai;
    if (n == null) return { label: 'Belum Dinilai', grade: '-' };
    if (n >= 91) return { label: 'Amat Baik / Sangat Memuaskan', grade: 'A' };
    if (n >= 81) return { label: 'Baik / Memenuhi Standar', grade: 'B' };
    if (n >= 71) return { label: 'Cukup / Perlu Bimbingan', grade: 'C' };
    return { label: 'Kurang / Perlu Pembinaan Khusus', grade: 'D' };
  }, [supervisi?.nilai]);

  if (!supervisi) return null;

  // ── Engine 1: True WYSIWYG DOM Capture (html2canvas-pro + jsPDF) ─────────────
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const toastId = toast.loading('Sedang merender PDF Berita Acara Supervisi...');
    try {
      const sheetElement = (printSheetRef.current?.querySelector('.print-sheet') as HTMLElement) || printSheetRef.current;
      if (!sheetElement) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(sheetElement, {
        scale: 2, // Setara ~200 DPI Retina
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Bersihkan border dan shadow lembar agar tepi PDF bersih
          const sheets = clonedDoc.querySelectorAll('.print-sheet');
          sheets.forEach((s: any) => {
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
          });
        },
      });

      // Anti-Bloat & Aspect Ratio Preservation
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      if (imgHeight <= pdfHeight + 1) {
        // Pas 1 lembar utuh tanpa distorsi
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing jika melebihi 1 halaman
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      const cleanGuruName = (activeGuruNama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanDate = (supervisi.tanggal || 'tanggal').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`BERITA_ACARA_SUPERVISI_${cleanGuruName}_${cleanDate}.pdf`);
      toast.success('PDF Berita Acara Supervisi berhasil diunduh (True WYSIWYG)', { id: toastId });
    } catch (err: any) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Berita Acara & Instrumen Supervisi"
      subtitle={`Dokumen Hasil Observasi Pembelajaran: ${activeGuruNama || 'Guru'}`}
      orientation="portrait"
      allowOrientationToggle={false}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      allowLogoToggles={true}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
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
    >
      {/* ── PANEL KONTROL PENGATURAN TTD (PRINT:HIDDEN) ── */}
      {showTtdConfig && (
        <div className="print:hidden mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Kustomisasi Nama & NIP Penandatangan (TTD)
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetTtd}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Guru */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Guru yang Disupervisi</label>
              <input
                type="text"
                value={activeGuruNama}
                onChange={(e) => setActiveGuruNama(e.target.value)}
                placeholder="Nama Guru"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={activeGuruNip}
                onChange={(e) => setActiveGuruNip(e.target.value)}
                placeholder="NIP Guru"
                className="w-full text-[11px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Supervisor */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Guru Supervisor / Penilai</label>
              <input
                type="text"
                value={activeSupervisorNama}
                onChange={(e) => setActiveSupervisorNama(e.target.value)}
                placeholder="Nama Supervisor"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={activeSupervisorNip}
                onChange={(e) => setActiveSupervisorNip(e.target.value)}
                placeholder="NIP Supervisor"
                className="w-full text-[11px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Kepala Sekolah */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Kepala Sekolah</label>
              <input
                type="text"
                value={activeKepsekNama}
                onChange={(e) => setActiveKepsekNama(e.target.value)}
                placeholder="Nama Kepala Sekolah"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={activeKepsekNip}
                onChange={(e) => setActiveKepsekNip(e.target.value)}
                placeholder="NIP Kepala Sekolah"
                className="w-full text-[11px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Titimangsa */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Titimangsa (Kota & Tanggal)</label>
              <div className="relative">
                <MapPin className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={activeKota}
                  onChange={(e) => setActiveKota(e.target.value)}
                  placeholder="Kota"
                  className="w-full text-xs p-1.5 pl-6 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="relative">
                <Calendar className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={activeTanggal}
                  onChange={(e) => setActiveTanggal(e.target.value)}
                  placeholder="Tanggal Titimangsa"
                  className="w-full text-[11px] p-1.5 pl-6 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT SHEET CONTAINER ── */}
      <div ref={printSheetRef} className="flex flex-col items-center justify-center p-2 sm:p-4">
        <PrintDocumentSheet pageNumber={1} totalPages={1} orientation="portrait">
          {/* 1. KOP SURAT RESMI */}
          <PrintHeader
            sekolah={rawSekolah as any}
            tenantInfo={tenantInfo}
            logoDaerahBase64={showLogoDaerah ? logoDaerahBase64 : null}
            logoSekolahBase64={showLogoSekolah ? logoSekolahBase64 : null}
          />

          {/* 2. JUDUL DOKUMEN RESMI */}
          <div className="text-center my-3 space-y-0.5">
            <h1 className="text-sm font-black uppercase tracking-wider text-black font-serif">
              BERITA ACARA & INSTRUMEN SUPERVISI AKADEMIK
            </h1>
            <p className="text-[11px] font-bold text-black uppercase">
              PEMANTAUAN KUALITAS PROSES BELAJAR MENGAJAR (KBM) TATAP MUKA
            </p>
            <p className="text-[10px] text-slate-700 font-medium">
              Tahun Pelajaran: {tahunPelajaranNama || '2026/2027'} {semesterNama ? `• Semester ${semesterNama}` : ''}
            </p>
          </div>

          {/* 3. PARAGRAF PEMBUKA */}
          <p className="text-[11px] text-justify text-black leading-relaxed mb-3">
            Pada hari ini <strong>{formattedDate}</strong>, bertempat di ruang kelas <strong>{supervisi.kelas || '-'}</strong>,
            telah dilaksanakan kegiatan Supervisi Akademik / Observasi Pembelajaran Kurikulum Merdeka terhadap pendidik di bawah ini:
          </p>

          {/* 4. IDENTITAS GURU & PELAKSANAAN OBSERVASI */}
          <div className="border border-black/60 rounded-sm p-2.5 mb-3 bg-slate-50/30 text-[10.5px]">
            <table className="w-full">
              <tbody>
                <tr className="leading-5">
                  <td className="w-36 font-semibold text-black">Nama Guru (Pendidik)</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-black">{activeGuruNama || '-'}</td>
                  <td className="w-32 font-semibold text-black">Mata Pelajaran</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-black">{supervisi.mapel || '-'}</td>
                </tr>
                <tr className="leading-5">
                  <td className="font-semibold text-black">NIP / NUPTK</td>
                  <td>:</td>
                  <td className="text-black">{activeGuruNip || '-'}</td>
                  <td className="font-semibold text-black">Kelas / Jam Ke</td>
                  <td>:</td>
                  <td className="text-black">{supervisi.kelas || '-'} / Jam ke-{supervisi.jam_ke || '-'}</td>
                </tr>
                <tr className="leading-5">
                  <td className="font-semibold text-black">Supervisor / Penilai</td>
                  <td>:</td>
                  <td className="font-bold text-black">{activeSupervisorNama || 'Tim Pengembang Kurikulum'}</td>
                  <td className="font-semibold text-black">Status Observasi</td>
                  <td>:</td>
                  <td className="text-black font-semibold">
                    {supervisi.status === 'COMPLETED' ? 'Telah Terlaksana (Selesai)' : 'Terjadwal'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. BAGIAN I: PRA-OBSERVASI & REFLEKSI GURU */}
          <div className="mb-3">
            <h2 className="text-[11px] font-bold uppercase text-black border-b border-black/40 pb-0.5 mb-1.5">
              I. Fokus & Target Pembelajaran (Pra-Observasi Guru)
            </h2>
            <div className="text-[10px] space-y-1 bg-white border border-black/30 p-2">
              <p>
                <strong>Target Kompetensi Siswa:</strong>{' '}
                {supervisi.target_pembelajaran || <span className="italic text-slate-500">Guru belum mencantumkan target pra-observasi.</span>}
              </p>
              {supervisi.catatan_self && (
                <p>
                  <strong>Catatan Refleksi Mandiri Guru:</strong> {supervisi.catatan_self}
                </p>
              )}
            </div>
          </div>

          {/* 6. BAGIAN II: HASIL OBSERVASI & PENILAIAN SUPERVISOR */}
          <div className="mb-3">
            <h2 className="text-[11px] font-bold uppercase text-black border-b border-black/40 pb-0.5 mb-1.5">
              II. Hasil Evaluasi KBM & Rekomendasi Supervisor
            </h2>
            <table className="w-full text-[10px] border-collapse border border-black/60 mb-2">
              <thead>
                <tr className="bg-slate-100 border-b border-black/60 font-bold">
                  <th className="p-1.5 text-center w-12 border-r border-black/40">No</th>
                  <th className="p-1.5 text-left border-r border-black/40">Komponen Penilaian Supervisi</th>
                  <th className="p-1.5 text-center w-24 border-r border-black/40">Skor (0-100)</th>
                  <th className="p-1.5 text-center w-28">Predikat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/20">
                  <td className="p-1.5 text-center border-r border-black/30">1</td>
                  <td className="p-1.5 border-r border-black/30">
                    Penguasaan Materi, Model Pembelajaran, & Pengelolaan Kelas
                  </td>
                  <td className="p-1.5 text-center font-bold text-xs border-r border-black/30">
                    {supervisi.nilai != null ? supervisi.nilai : '-'}
                  </td>
                  <td className="p-1.5 text-center font-bold">
                    {scoreTier.grade} ({scoreTier.label})
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Catatan / Rekomendasi Tertulis */}
            <div className="border border-black/30 p-2 bg-white text-[10px] leading-relaxed">
              <div className="font-bold mb-0.5">Catatan Pengamatan, Apresiasi, & Rencana Tindak Lanjut:</div>
              <p className="whitespace-pre-wrap">
                {supervisi.catatan || <span className="italic text-slate-500">Tidak ada catatan khusus dari supervisor.</span>}
              </p>
            </div>
          </div>

          {/* 7. DOKUMENTASI FOTO EVIDEN (JIKA ADA) */}
          {supervisi.foto_kegiatan && (
            <div className="mb-3">
              <h2 className="text-[11px] font-bold uppercase text-black border-b border-black/40 pb-0.5 mb-1.5">
                III. Eviden Dokumentasi Pelaksanaan KBM
              </h2>
              <div className="flex items-center gap-3 border border-black/30 p-2 bg-white">
                <img
                  src={supervisi.foto_kegiatan}
                  alt="Dokumentasi KBM"
                  className="w-36 h-24 object-cover border border-slate-300 rounded-xs shadow-2xs"
                />
                <div className="text-[10px] text-slate-700">
                  <p className="font-bold text-black">Foto Observasi Langsung Pembelajaran di Kelas</p>
                  <p className="text-[9.5px] mt-0.5">Terekam pada: {formattedDate} • Kelas {supervisi.kelas}</p>
                  <p className="text-[9px] text-slate-500 italic mt-1">Dokumen ini sah sebagai bukti fisik instrumen akreditasi sekolah.</p>
                </div>
              </div>
            </div>
          )}

          {/* 8. TANDA TANGAN 3-PIHAK RESMI (2-TIER BIROKRASI) */}
          <div className="mt-5 pt-2 text-[10.5px]">
            <div className="text-right mb-2 font-medium">
              {activeKota}, {activeTanggal}
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-slate-800">Guru yang Disupervisi,</p>
                <div className="h-16" />
                <p className="font-bold text-black uppercase underline">
                  {activeGuruNama || '........................................'}
                </p>
                <p className="text-[9.5px] text-slate-700">NIP. {activeGuruNip || '-'}</p>
              </div>

              <div>
                <p className="text-slate-800">Supervisor / Penilai,</p>
                <div className="h-16" />
                <p className="font-bold text-black uppercase underline">
                  {activeSupervisorNama || '........................................'}
                </p>
                <p className="text-[9.5px] text-slate-700">NIP. {activeSupervisorNip || '-'}</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-slate-800">Mengetahui,</p>
              <p className="font-semibold text-slate-900">Kepala Sekolah</p>
              <div className="h-16" />
              <p className="font-bold text-black uppercase underline">{activeKepsekNama}</p>
              <p className="text-[9.5px] text-slate-700">NIP. {activeKepsekNip}</p>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
