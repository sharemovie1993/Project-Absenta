import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
  UniversalDocumentSignatures,
  UniversalStudentIdentity,
  normalizeStudentIdentity,
} from '@/components/ui/PrintHeader';
import { Button } from '@/components/ui/Button';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import {
  generateSertifikatKetarunaanPdf,
  formatTanggalIndonesia,
  getPredikatHuruf,
  getPredikatLabel,
  SertifikatKetarunaanPrintData,
} from '@/utils/print/modules/pdfSertifikatKetarunaan';
import { KetarunaanNilaiStudent, KetarunaanSkema } from '@/api/kesiswaan/programKetarunaan.api';
import { toast } from 'sonner';

export interface SertifikatKetarunaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: KetarunaanNilaiStudent | null;
  students?: KetarunaanNilaiStudent[];
  onSelectStudent?: (student: KetarunaanNilaiStudent) => void;
  skema: KetarunaanSkema | null;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaran?: string;
  tahunPelajaranNama?: string;
  semester?: string;
  semesterNama?: string;
}

export const SertifikatKetarunaanModal: React.FC<SertifikatKetarunaanModalProps> = React.memo(({
  isOpen,
  onClose,
  student,
  students = [],
  onSelectStudent,
  skema,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
  tahunPelajaran,
  tahunPelajaranNama,
  semester,
  semesterNama,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'ALL' | 'FRONT' | 'BACK'>('ALL');
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isSignerDrawerOpen, setIsSignerDrawerOpen] = useState<boolean>(false);

  // Ref container untuk Engine 1: Primary True WYSIWYG DOM Capture (.print-sheet)
  const sheetsContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Universal Kop Surat Hook (SSOT Dinas & Sekolah)
  const { tenantInfo, rawSekolah, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();

  // 2. Universal Organizational Structure Signers Hook (Auto-Resolving dari Struktur Organisasi)
  const signers = useDocumentSigners({
    tahunPelajaranId: tahunPelajaran,
    semesterId: semester,
    kelasId,
    jurusanId,
  });

  // State override penandatangan & nomor sertifikat (dengan tombol Reset Struktur)
  const [customOverrides, setCustomOverrides] = useState<{
    nomorSertifikat?: string;
    titimangsa?: string;
    instrukturNama?: string;
    instrukturNip?: string;
    instrukturJabatan?: string;
    pembinaNama?: string;
    pembinaNip?: string;
    wakaNama?: string;
    wakaNip?: string;
    kepsekNama?: string;
    kepsekNip?: string;
  }>({});

  const handleResetSigners = useCallback(() => {
    setCustomOverrides({});
    toast.success('Penandatangan dikembalikan ke Struktur Organisasi resmi sistem.');
  }, []);

  // Navigasi Batch Antar Taruna Satu Rombel
  const currentIndex = useMemo(() => {
    if (!student || students.length === 0) return 0;
    const idx = students.findIndex((s) => s.siswa_id === student.siswa_id);
    return idx >= 0 ? idx : 0;
  }, [student, students]);

  const handlePrevBatch = useCallback(() => {
    if (currentIndex > 0 && onSelectStudent) {
      onSelectStudent(students[currentIndex - 1]);
    }
  }, [currentIndex, students, onSelectStudent]);

  const handleNextBatch = useCallback(() => {
    if (currentIndex < students.length - 1 && onSelectStudent) {
      onSelectStudent(students[currentIndex + 1]);
    }
  }, [currentIndex, students, onSelectStudent]);

  // Normalisasi Identitas Taruna
  const studentIdentity = useMemo(() => {
    return normalizeStudentIdentity({
      ...(student || {}),
      nama_kelas: kelasNama || student?.nama_kelas,
      jurusan_nama: jurusanNama || student?.jurusan_nama,
    });
  }, [student, kelasNama, jurusanNama]);

  // Resolusi Pejabat Penandatangan dari Struktur Organisasi + Override Drawer
  const resolvedSigners = useMemo(() => {
    const pembinaName =
      customOverrides.pembinaNama ??
      (signers.pembinaTaruna?.isAssigned
        ? signers.pembinaTaruna.personName
        : signers.wakaKesiswaan?.personName || 'Pembina Ketarunaan');
    const pembinaNip =
      customOverrides.pembinaNip ??
      (signers.pembinaTaruna?.isAssigned
        ? signers.pembinaTaruna.nip
        : signers.wakaKesiswaan?.nip || '');

    const wakaName =
      customOverrides.wakaNama ??
      (signers.wakaKesiswaan?.personName || 'Wakasek Bidang Kesiswaan');
    const wakaNip = customOverrides.wakaNip ?? (signers.wakaKesiswaan?.nip || '');

    const kepsekName = customOverrides.kepsekNama ?? (signers.kepsek?.personName || 'Kepala Sekolah');
    const kepsekNip = customOverrides.kepsekNip ?? (signers.kepsek?.nip || '');

    const instrukturName =
      customOverrides.instrukturNama ??
      (signers.pembinaTaruna?.isAssigned ? signers.pembinaTaruna.personName : 'Instruktur Ketarunaan');
    const instrukturNip =
      customOverrides.instrukturNip ??
      (signers.pembinaTaruna?.isAssigned ? signers.pembinaTaruna.nip || '' : '');
    const instrukturJabatan = customOverrides.instrukturJabatan || 'Instruktur / Pelatih Lapangan';

    return {
      instrukturName,
      instrukturNip,
      instrukturJabatan,
      pembinaName,
      pembinaNip,
      wakaName,
      wakaNip,
      kepsekName,
      kepsekNip,
    };
  }, [customOverrides, signers]);

  const effectiveTpLabel = useMemo(() => {
    if (tahunPelajaranNama) return tahunPelajaranNama;
    if (tahunPelajaran && /^\d{4}\/\d{4}$/.test(tahunPelajaran)) return tahunPelajaran;
    return '2026/2027';
  }, [tahunPelajaranNama, tahunPelajaran]);

  const effectiveSemLabel = useMemo(() => {
    if (semesterNama) return semesterNama;
    if (semester && !semester.includes('-')) return semester;
    return 'Ganjil';
  }, [semesterNama, semester]);

  // Susun Data Sertifikat Terstruktur (untuk tampilan & Engine 2 Fallback Vector PDF)
  const certData: SertifikatKetarunaanPrintData = useMemo(() => {
    const s = student;
    const samapta = s?.nilai_samapta ?? 0;
    const pbb = s?.nilai_pbb ?? 0;
    const disiplin = s?.nilai_disiplin ?? s?.presensi?.rekomendasi_disiplin ?? 0;
    const mental = s?.nilai_mental ?? s?.presensi?.rekomendasi_mental ?? 0;

    const bSamapta = skema?.bobot_samapta ?? 25;
    const bPbb = skema?.bobot_pbb ?? 20;
    const bDisiplin = skema?.bobot_disiplin ?? 30;
    const bMental = skema?.bobot_mental ?? 25;

    const rawFinal =
      (samapta * bSamapta + pbb * bPbb + disiplin * bDisiplin + mental * bMental) / 100;
    const finalScore = s?.nilai_akhir || Math.round(rawFinal * 10) / 10;
    const finalPredikat =
      s?.predikat && s.predikat !== '-' ? s.predikat : getPredikatHuruf(finalScore);

    const tempat = signers.city || (rawSekolah as any)?.kota || 'Purwakarta';
    const tanggalTerbit = customOverrides.titimangsa || signers.titimangsa || `${tempat}, ${formatTanggalIndonesia(new Date())}`;
    const defaultNomor = `421.5/KETARUNAAN/${new Date().getFullYear()}/${s?.nis || '001'}`;

    return {
      nomor_sertifikat: customOverrides.nomorSertifikat || defaultNomor,
      tanggal_terbit: tanggalTerbit,
      tempat_terbit: tempat,
      mode_pelatihan: skema?.mode_pelatihan || 'SEMI_TARUNA',
      tahun_pelajaran: effectiveTpLabel,
      semester: effectiveSemLabel,
      sekolah: {
        nama: tenantInfo?.name || rawSekolah?.nama || 'SMK NEGERI 1 PLERED',
        alamat: tenantInfo?.address || rawSekolah?.alamat || '',
        kota: tempat,
        kode_pos: tenantInfo?.kode_pos || (rawSekolah as any)?.kode_pos || '',
        telepon: tenantInfo?.phone || rawSekolah?.telepon || '',
        email: tenantInfo?.email || rawSekolah?.email || '',
        website: tenantInfo?.website || rawSekolah?.website || '',
        kepala_sekolah: resolvedSigners.kepsekName,
        nip_kepala: resolvedSigners.kepsekNip,
        logo_url: tenantInfo?.logo_url || undefined,
        logo_daerah: tenantInfo?.logo_daerah_url || undefined,
        nama_dinas_atas: tenantInfo?.nama_dinas_atas,
        nama_dinas_bawah: tenantInfo?.nama_dinas_bawah,
        nama_cabang_dinas: tenantInfo?.nama_cabang_dinas,
        print_header_lines: tenantInfo?.print_header_lines as any,
      },
      siswa: {
        id: s?.siswa_id || '',
        nama_siswa: s?.nama_siswa || studentIdentity.nama || 'TARUNA',
        nis: s?.nis || studentIdentity.nis || '-',
        nisn: s?.nisn || studentIdentity.nisn || '-',
        jenis_kelamin: s?.jenis_kelamin || 'L',
        nama_kelas: kelasNama || s?.nama_kelas || studentIdentity.namaKelas || '-',
        jurusan_nama: jurusanNama || s?.jurusan_nama || studentIdentity.jurusanNama || '-',
      },
      penilaian: {
        nilai_samapta: samapta,
        nilai_pbb: pbb,
        nilai_disiplin: disiplin,
        nilai_mental: mental,
        nilai_akhir: finalScore,
        predikat: finalPredikat,
        deskripsi_rapor:
          s?.deskripsi_rapor ||
          'Menunjukkan komitmen kedisiplinan, kesamaptaan jasmani, dan penguasaan baris-berbaris sesuai standar ketarunaan sekolah.',
        bobot_samapta: bSamapta,
        bobot_pbb: bPbb,
        bobot_disiplin: bDisiplin,
        bobot_mental: bMental,
      },
      presensi_summary: s?.presensi
        ? {
            total_sesi_terlaksana:
              (s.presensi.total_sesi_disiplin || 0) + (s.presensi.total_sesi_duha || 0),
            hadir_disiplin: s.presensi.hadir_disiplin,
            total_sesi_disiplin: s.presensi.total_sesi_disiplin,
            persen_disiplin: s.presensi.persen_disiplin,
            hadir_duha: s.presensi.hadir_duha,
            total_sesi_duha: s.presensi.total_sesi_duha,
            persen_duha: s.presensi.persen_duha,
            terlambat_count: s.presensi.terlambat_count,
          }
        : undefined,
      signatories: {
        master_training_nama: resolvedSigners.instrukturName,
        master_training_nip: resolvedSigners.instrukturNip,
        pembina_nama: resolvedSigners.pembinaName,
        pembina_nip: resolvedSigners.pembinaNip,
        ketua_pelaksana_nama: resolvedSigners.wakaName,
        ketua_pelaksana_nip: resolvedSigners.wakaNip,
        kepsek_nama: resolvedSigners.kepsekName,
        kepsek_nip: resolvedSigners.kepsekNip,
      },
    };
  }, [
    student,
    skema,
    signers,
    rawSekolah,
    customOverrides,
    effectiveTpLabel,
    effectiveSemLabel,
    tenantInfo,
    resolvedSigners,
    studentIdentity,
    kelasNama,
    jurusanNama,
  ]);

  // Dual-Engine PDF Export Strategy:
  // Engine 1 (Primary): True WYSIWYG DOM Capture (html2canvas-pro scale 2.5 + jsPDF A4 Landscape)
  // Engine 2 (Fallback): Programmatic Vector Generator (generateSertifikatKetarunaanPdf)
  const handleDownloadPdf = useCallback(async () => {
    if (isDownloadingPdf || !student) return;
    setIsDownloadingPdf(true);
    const filename = `Sertifikat_Ketarunaan_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`;

    try {
      if (sheetsContainerRef.current) {
        const captured = await capturePrintSheetsToPdfBlob(sheetsContainerRef.current, {
          orientation: 'landscape',
          fileName: filename,
          scale: 2.5,
        });
        const url = URL.createObjectURL(captured.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = captured.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Sertifikat PDF (True WYSIWYG) berhasil diunduh!');
        return;
      }
      throw new Error('Container lembar cetak belum siap');
    } catch (domErr) {
      try {
        const pdfMode =
          selectedTemplate === 'FRONT'
            ? 'front_only'
            : selectedTemplate === 'BACK'
            ? 'back_only'
            : 'all';
        const doc = await generateSertifikatKetarunaanPdf(certData, {
          mode: pdfMode,
          logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
          logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
        });
        doc.save(filename);
        toast.success('Sertifikat PDF berhasil diunduh!');
      } catch (vecErr: any) {
        toast.error('Gagal mengunduh PDF: ' + (vecErr?.message || 'Terjadi kendala'));
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [
    isDownloadingPdf,
    student,
    certData,
    selectedTemplate,
    showLogoDaerah,
    showLogoSekolah,
    logoDaerahBase64,
    logoSekolahBase64,
  ]);

  if (!isOpen || !student) return null;

  const totalPages = selectedTemplate === 'ALL' ? 2 : 1;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sertifikat & Transkrip Program Ketarunaan"
      subtitle={`${certData.siswa.nama_siswa} (NIS: ${certData.siswa.nis}) • ${certData.siswa.nama_kelas} • TP ${certData.tahun_pelajaran}`}
      orientation="landscape"
      size="5xl"
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      templateOptions={[
        { id: 'ALL', label: 'Semua Halaman (Piagam + Transkrip 2 Hal)' },
        { id: 'FRONT', label: 'Halaman 1: Piagam Sertifikat (Depan)' },
        { id: 'BACK', label: 'Halaman 2: Transkrip Nilai 4 Pilar (Belakang)' },
      ]}
      selectedTemplate={selectedTemplate}
      onTemplateChange={(id) => setSelectedTemplate(id as 'ALL' | 'FRONT' | 'BACK')}
      templateLabel="Tampilan:"
      batchTotal={students.length}
      batchCurrentIndex={currentIndex}
      onPrevBatch={currentIndex > 0 ? handlePrevBatch : undefined}
      onNextBatch={currentIndex < students.length - 1 ? handleNextBatch : undefined}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isDownloadingPdf ? 'Menyusun PDF...' : 'Unduh PDF'}
      defaultWaFilename={`Sertifikat_Ketarunaan_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`}
      defaultWaCaption={`Selamat, terlampir Sertifikat & Transkrip Program Ketarunaan atas nama ${certData.siswa.nama_siswa} (${certData.siswa.nama_kelas}).`}
      extraActions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSignerDrawerOpen((prev) => !prev)}
          className="text-xs gap-1.5 h-8 px-2.5 font-semibold"
          title="Sesuaikan nomor sertifikat, titimangsa, atau pejabat penandatangan sementara"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
          <span>Atur Penandatangan</span>
        </Button>
      }
      subHeader={
        isSignerDrawerOpen ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Pengaturan Nomor Sertifikat &amp; Pejabat Penandatangan
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  (Otomatis terhubung ke Struktur Organisasi Sekolah)
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSigners}
                className="h-7 px-2.5 text-[11px] gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Struktur</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Nomor Sertifikat &amp; Titimangsa
                </label>
                <input
                  type="text"
                  value={customOverrides.nomorSertifikat ?? certData.nomor_sertifikat}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, nomorSertifikat: e.target.value }))
                  }
                  placeholder="Nomor Sertifikat"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-1"
                />
                <input
                  type="text"
                  value={customOverrides.titimangsa ?? certData.tanggal_terbit}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, titimangsa: e.target.value }))
                  }
                  placeholder="Kota, Tanggal Terbit"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Instruktur / Pelatih Lapangan
                </label>
                <input
                  type="text"
                  value={customOverrides.instrukturNama ?? resolvedSigners.instrukturName}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, instrukturNama: e.target.value }))
                  }
                  placeholder="Nama Instruktur"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-1"
                />
                <input
                  type="text"
                  value={customOverrides.instrukturNip ?? resolvedSigners.instrukturNip}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, instrukturNip: e.target.value }))
                  }
                  placeholder="NIP / NRP Instruktur"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Pembina Ketarunaan
                </label>
                <input
                  type="text"
                  value={customOverrides.pembinaNama ?? resolvedSigners.pembinaName}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, pembinaNama: e.target.value }))
                  }
                  placeholder="Nama Pembina"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-1"
                />
                <input
                  type="text"
                  value={customOverrides.pembinaNip ?? resolvedSigners.pembinaNip}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, pembinaNip: e.target.value }))
                  }
                  placeholder="NIP Pembina"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Wakasek Bidang Kesiswaan
                </label>
                <input
                  type="text"
                  value={customOverrides.wakaNama ?? resolvedSigners.wakaName}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, wakaNama: e.target.value }))
                  }
                  placeholder="Nama Wakasek Kesiswaan"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-1"
                />
                <input
                  type="text"
                  value={customOverrides.wakaNip ?? resolvedSigners.wakaNip}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, wakaNip: e.target.value }))
                  }
                  placeholder="NIP Wakasek"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={customOverrides.kepsekNama ?? resolvedSigners.kepsekName}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, kepsekNama: e.target.value }))
                  }
                  placeholder="Nama Kepala Sekolah"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-1"
                />
                <input
                  type="text"
                  value={customOverrides.kepsekNip ?? resolvedSigners.kepsekNip}
                  onChange={(e) =>
                    setCustomOverrides((p) => ({ ...p, kepsekNip: e.target.value }))
                  }
                  placeholder="NIP Kepala Sekolah"
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      <div
        ref={sheetsContainerRef}
        className="flex flex-col gap-10 items-center w-full py-4 print:py-0 print:gap-0"
      >
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 1: PIAGAM SERTIFIKAT KETARUNAAN MUKA DEPAN (A4 LANDSCAPE)      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {(selectedTemplate === 'ALL' || selectedTemplate === 'FRONT') && (
          <PrintDocumentSheet
            orientation="landscape"
            pageNumber={1}
            totalPages={totalPages}
            footerText={`Sertifikat Program Ketarunaan • ${certData.sekolah.nama} • TP ${certData.tahun_pelajaran}`}
            style={{ padding: '11mm 16mm 10mm 16mm' }}
            className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
          >
            <div className="w-full h-full flex flex-col justify-between text-black font-sans">
              <div>
                {/* Kop Surat Resmi Dinas & Sekolah */}
                <PrintHeader
                  variant="landscape"
                  tenantInfo={tenantInfo}
                  showLogoDaerah={showLogoDaerah}
                  showLogoSekolah={showLogoSekolah}
                  className="mb-1"
                />

                {/* Judul Piagam & Nomor */}
                <div className="text-center my-[2.5mm]">
                  <div className="text-[8pt] font-bold uppercase tracking-[1.5px] text-slate-700 mb-0.5">
                    PROGRAM PENDIDIKAN KARAKTER &amp; KESAMAPTAAN TARUNA
                  </div>
                  <h1 className="font-bold text-[15pt] text-black tracking-[1px] uppercase underline decoration-black decoration-[1.5px] underline-offset-4 inline-block">
                    SERTIFIKAT KELULUSAN KETARUNAAN
                  </h1>
                  <div className="text-[9pt] font-normal text-black mt-1">
                    Nomor : {certData.nomor_sertifikat}
                  </div>
                </div>

                {/* Kalimat Pembuka */}
                <div className="text-[9.5pt] text-left text-black mt-1.5 mb-1.5">
                  Kepala {certData.sekolah.nama} menerangkan bahwa :
                </div>

                {/* Biodata Taruna Menggunakan UniversalStudentIdentity */}
                <div className="w-full pl-[6mm] mb-[2.5mm]">
                  <UniversalStudentIdentity
                    identityOverride={{
                      ...studentIdentity,
                      nama: certData.siswa.nama_siswa,
                      nis: certData.siswa.nis,
                      nisn: certData.siswa.nisn,
                      namaKelas: certData.siswa.nama_kelas,
                      jurusanNama: certData.siswa.jurusan_nama,
                      sekolahAsal: certData.sekolah.nama,
                    }}
                    mode="print"
                    variant="print_kv"
                    fields={['nama', 'nis_nisn', 'kelas', 'konsentrasi_keahlian', 'sekolah_asal']}
                  />
                </div>

                {/* Paragraf Pernyataan Kelulusan */}
                <div className="text-[9.5pt] leading-relaxed text-justify text-black mb-[3mm]">
                  Telah mengikuti serta dinyatakan <span className="font-bold">LULUS</span> dalam seluruh rangkaian{' '}
                  <span className="font-bold">
                    {certData.mode_pelatihan === 'FULL_TARUNA'
                      ? 'Pendidikan & Pembinaan Murni Ketarunaan (Kesamaptaan Jasmani, Peraturan Baris-Berbaris, Kedisiplinan 5 Siklus, dan Pembinaan Mental Karakter)'
                      : 'Pendidikan Karakter & Pembinaan Ketarunaan (Kesamaptaan Jasmani, Peraturan Baris-Berbaris, Kedisiplinan 5 Siklus, dan Pembiasaan Etos Kerja)'}
                  </span>{' '}
                  pada Tahun Pelajaran <span className="font-bold">{certData.tahun_pelajaran}</span> Semester{' '}
                  <span className="font-bold">{certData.semester}</span> dengan Nilai Akhir{' '}
                  <span className="font-bold">{certData.penilaian.nilai_akhir}</span> dan Predikat{' '}
                  <span className="font-bold uppercase tracking-wider">
                    "{getPredikatLabel(certData.penilaian.predikat)} ({certData.penilaian.predikat})"
                  </span>
                  .
                </div>
              </div>

              {/* Blok Tanda Tangan Standar UniversalDocumentSignatures */}
              <div className="w-full px-[2mm]">
                <UniversalDocumentSignatures
                  layout="tri_party_row"
                  tahunPelajaranId={tahunPelajaran}
                  semesterId={semester}
                  kelasId={kelasId}
                  jurusanId={jurusanId}
                  spacingHeightMm={17}
                  fontFamilyClass="font-sans"
                  overrideSignerLeft={{
                    headerPrefix: 'Diverifikasi oleh,',
                    roleTitle: 'Wakasek Bidang Kesiswaan,',
                    personName: resolvedSigners.wakaName,
                    nip: resolvedSigners.wakaNip,
                  }}
                  overrideSignerCenter={{
                    headerPrefix: 'Mengetahui / Menyetujui,',
                    roleTitle: 'Kepala Sekolah,',
                    personName: resolvedSigners.kepsekName,
                    nip: resolvedSigners.kepsekNip,
                  }}
                  overrideSignerRight={{
                    topDate: certData.tanggal_terbit,
                    headerPrefix: 'Dibuat oleh,',
                    roleTitle: 'Pembina Ketarunaan,',
                    personName: resolvedSigners.pembinaName,
                    nip: resolvedSigners.pembinaNip,
                  }}
                />
              </div>
            </div>
          </PrintDocumentSheet>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: TRANSKRIP CAPAIAN 4 PILAR KETARUNAAN (A4 LANDSCAPE)         */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {(selectedTemplate === 'ALL' || selectedTemplate === 'BACK') && (
          <PrintDocumentSheet
            orientation="landscape"
            pageNumber={selectedTemplate === 'ALL' ? 2 : 1}
            totalPages={totalPages}
            footerText={`Transkrip Nilai Ketarunaan • ${certData.siswa.nama_siswa} (${certData.siswa.nis})`}
            style={{ padding: '12mm 18mm 11mm 18mm' }}
            className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
          >
            <div className="w-full h-full flex flex-col justify-between text-black font-sans">
              <div>
                {/* Judul Halaman Belakang */}
                <div className="text-center mb-[3.5mm]">
                  <h1 className="font-bold text-[13pt] text-black tracking-[0.5px] uppercase underline decoration-black decoration-[1.2px] underline-offset-4">
                    TRANSKRIP CAPAIAN DAN DAFTAR NILAI KETARUNAAN
                  </h1>
                  <div className="text-[8.5pt] text-slate-700 mt-0.5">
                    Lampiran Sertifikat Nomor : {certData.nomor_sertifikat}
                  </div>
                </div>

                {/* Identitas Singkat Taruna */}
                <div className="w-full text-[9pt] leading-tight text-black mb-[3mm] grid grid-cols-2 gap-x-8 border border-black p-[2.5mm] bg-slate-50/40">
                  <table className="table-fixed border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[34mm] py-0.5">Nama Taruna</td>
                        <td className="w-[4mm] py-0.5 text-center">:</td>
                        <td className="py-0.5 font-bold uppercase">{certData.siswa.nama_siswa}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5">NIS / NISN</td>
                        <td className="py-0.5 text-center">:</td>
                        <td className="py-0.5 font-mono">
                          {certData.siswa.nis} / {certData.siswa.nisn}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="table-fixed border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-[36mm] py-0.5">Kelas / Kompetensi</td>
                        <td className="w-[4mm] py-0.5 text-center">:</td>
                        <td className="py-0.5 font-semibold">
                          {certData.siswa.nama_kelas} — {certData.siswa.jurusan_nama}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5">Tahun Pelajaran</td>
                        <td className="py-0.5 text-center">:</td>
                        <td className="py-0.5">
                          {certData.tahun_pelajaran} (Semester {certData.semester})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tabel Penilaian 4 Pilar Ketarunaan (Format Tabel Resmi Dinas: Header Abu Terang #f1f5f9, Border Hitam Tipis) */}
                <div className="w-full mb-[3mm]">
                  <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.35] text-black">
                    <colgroup>
                      <col className="w-[10mm]" />
                      <col className="w-[140mm]" />
                      <col className="w-[22mm]" />
                      <col className="w-[24mm]" />
                      <col className="w-[22mm]" />
                      <col className="w-[36mm]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#f1f5f9] border-b border-black font-bold text-black">
                        <th className="py-[1.8mm] text-center border-r border-black">NO</th>
                        <th className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">
                          ASPEK PENILAIAN &amp; KOMPONEN UJI KETARUNAAN
                        </th>
                        <th className="py-[1.8mm] text-center border-r border-black">BOBOT</th>
                        <th className="py-[1.8mm] text-center border-r border-black">NILAI</th>
                        <th className="py-[1.8mm] text-center border-r border-black">HURUF</th>
                        <th className="py-[1.8mm] text-center">KUALIFIKASI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">1</td>
                        <td className="py-[1.6mm] px-[2.5mm] border-r border-black">
                          <div className="font-bold">KESAMAPTAAN JASMANI (SAMAPTA)</div>
                          <div className="text-[7.5pt] text-slate-700">
                            Uji Ketahanan Lari 12 Menit, Push-up, Sit-up, &amp; Shuttle Run
                          </div>
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-semibold">
                          {certData.penilaian.bobot_samapta}%
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold font-mono">
                          {certData.penilaian.nilai_samapta}
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">
                          {getPredikatHuruf(certData.penilaian.nilai_samapta)}
                        </td>
                        <td className="py-[1.6mm] text-center font-semibold">
                          {getPredikatLabel(certData.penilaian.nilai_samapta)}
                        </td>
                      </tr>

                      <tr className="border-b border-black">
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">2</td>
                        <td className="py-[1.6mm] px-[2.5mm] border-r border-black">
                          <div className="font-bold">PERATURAN BARIS-BERBARIS (PBB)</div>
                          <div className="text-[7.5pt] text-slate-700">
                            Gerakan di Tempat, Langkah Tegap, Defile, &amp; Tata Penghormatan
                          </div>
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-semibold">
                          {certData.penilaian.bobot_pbb}%
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold font-mono">
                          {certData.penilaian.nilai_pbb}
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">
                          {getPredikatHuruf(certData.penilaian.nilai_pbb)}
                        </td>
                        <td className="py-[1.6mm] text-center font-semibold">
                          {getPredikatLabel(certData.penilaian.nilai_pbb)}
                        </td>
                      </tr>

                      <tr className="border-b border-black">
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">3</td>
                        <td className="py-[1.6mm] px-[2.5mm] border-r border-black">
                          <div className="font-bold">KEDISIPLINAN TARUNA (PRESENSI 5 SIKLUS)</div>
                          <div className="text-[7.5pt] text-slate-700">
                            Upacara Bendera, Ketarunaan Pagi, Apel Sore, &amp; Ketertiban Atribut
                            {certData.presensi_summary &&
                              certData.presensi_summary.total_sesi_disiplin > 0 && (
                                <span className="font-semibold">
                                  {' '}
                                  • Kehadiran: {certData.presensi_summary.hadir_disiplin}/
                                  {certData.presensi_summary.total_sesi_disiplin} Sesi (
                                  {certData.presensi_summary.persen_disiplin}%)
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-semibold">
                          {certData.penilaian.bobot_disiplin}%
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold font-mono">
                          {certData.penilaian.nilai_disiplin}
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">
                          {getPredikatHuruf(certData.penilaian.nilai_disiplin)}
                        </td>
                        <td className="py-[1.6mm] text-center font-semibold">
                          {getPredikatLabel(certData.penilaian.nilai_disiplin)}
                        </td>
                      </tr>

                      <tr className="border-b border-black">
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">4</td>
                        <td className="py-[1.6mm] px-[2.5mm] border-r border-black">
                          <div className="font-bold">MENTAL, KARAKTER &amp; SPIRITUAL</div>
                          <div className="text-[7.5pt] text-slate-700">
                            Pembiasaan Ibadah Dhuha, Jiwa Korsa, Loyalitas, &amp; Budaya Kerja 5R
                            {certData.presensi_summary &&
                              certData.presensi_summary.total_sesi_duha > 0 && (
                                <span className="font-semibold">
                                  {' '}
                                  • Dhuha: {certData.presensi_summary.hadir_duha}/
                                  {certData.presensi_summary.total_sesi_duha} Sesi (
                                  {certData.presensi_summary.persen_duha}%)
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-semibold">
                          {certData.penilaian.bobot_mental}%
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold font-mono">
                          {certData.penilaian.nilai_mental}
                        </td>
                        <td className="py-[1.6mm] text-center border-r border-black font-bold">
                          {getPredikatHuruf(certData.penilaian.nilai_mental)}
                        </td>
                        <td className="py-[1.6mm] text-center font-semibold">
                          {getPredikatLabel(certData.penilaian.nilai_mental)}
                        </td>
                      </tr>

                      {/* Nilai Akhir Komposit */}
                      <tr className="bg-[#f1f5f9] border-t-2 border-black font-bold">
                        <td colSpan={2} className="py-[2mm] px-[2.5mm] text-center border-r border-black">
                          NILAI AKHIR KOMPOSIT (RATA-RATA TERBOBOT)
                        </td>
                        <td className="py-[2mm] text-center border-r border-black">100%</td>
                        <td className="py-[2mm] text-center border-r border-black font-mono text-[9.5pt]">
                          {certData.penilaian.nilai_akhir}
                        </td>
                        <td className="py-[2mm] text-center border-r border-black text-[9.5pt]">
                          {certData.penilaian.predikat}
                        </td>
                        <td className="py-[2mm] text-center uppercase">
                          {getPredikatLabel(certData.penilaian.predikat)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Kotak Deskripsi Capaian Kokurikuler Rapor */}
                <div className="border border-black p-[2.5mm] text-[8.5pt] leading-snug bg-white">
                  <div className="font-bold text-black mb-0.5">
                    Deskripsi Capaian Kokurikuler Rapor:
                  </div>
                  <div className="italic text-slate-900">"{certData.penilaian.deskripsi_rapor}"</div>
                </div>
              </div>

              {/* Tanda Tangan Halaman Belakang Menggunakan UniversalDocumentSignatures */}
              <div className="w-full px-[6mm] mt-[3mm]">
                <UniversalDocumentSignatures
                  layout="dual_custom"
                  tahunPelajaranId={tahunPelajaran}
                  semesterId={semester}
                  kelasId={kelasId}
                  jurusanId={jurusanId}
                  spacingHeightMm={16}
                  fontFamilyClass="font-sans"
                  overrideSignerLeft={{
                    roleTitle: `${resolvedSigners.instrukturJabatan},`,
                    personName: resolvedSigners.instrukturName,
                    nip: resolvedSigners.instrukturNip,
                  }}
                  overrideSignerRight={{
                    topDate: certData.tanggal_terbit,
                    roleTitle: 'Pembina Ketarunaan,',
                    personName: resolvedSigners.pembinaName,
                    nip: resolvedSigners.pembinaNip,
                  }}
                />
              </div>
            </div>
          </PrintDocumentSheet>
        )}
      </div>
    </UniversalDocumentModal>
  );
});

SertifikatKetarunaanModal.displayName = 'SertifikatKetarunaanModal';
