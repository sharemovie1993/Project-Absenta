import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import {
  UniversalDocumentModal,
  UniversalDocumentTab,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui';
import { raporApi } from '@/api/rapor.api';
import {
  generateSertifikatUkkSinglePdf,
  generateSertifikatUkkBatchPdf,
  formatTanggalIndonesia,
  getDefaultUnitKompetensi,
  TUT_WURI_LOGO_SVG,
  type SertifikatUkkPrintData,
  type UkkUnitKompetensi,
} from '@/utils/print/modules/pdfSertifikatUkk';
import toast from 'react-hot-toast';

export interface UkkStudentItem {
  id: string;
  nama_siswa: string;
  nis?: string;
  nisn?: string;
  kelas?: string;
  nomor_sertifikat?: string;
  predikat?: string;
  nilai_praktik?: number | string;
  nilai_teori?: number | string;
  nilai_akhir?: number | string;
  asesor_internal?: string;
  asesor_eksternal?: string;
  mitra_nama?: string;
  isCompleted?: boolean;
}

export interface UniversalUkkSertifikatViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  studentsList?: UkkStudentItem[];
  isModal?: boolean;
  hideLayout?: boolean;
  className?: string;
}

export const UkkSertifikatView: React.FC<UniversalUkkSertifikatViewProps> = ({
  isOpen = true,
  onClose = () => {},
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId: _kelasId,
  kelasNama,
  jurusanId,
  jurusanNama = 'Teknik Komputer dan Jaringan',
  studentsList = [],
  isModal = false,
  className = '',
}) => {
  // Normalize students list
  const allStudents = useMemo<UkkStudentItem[]>(() => {
    if (studentsList && studentsList.length > 0) {
      return studentsList;
    }
    if (siswaId) {
      return [
        {
          id: siswaId,
          nama_siswa: namaSiswa || 'Siswa',
          nomor_sertifikat: nomorSertifikat,
          kelas: kelasNama,
          isCompleted: true,
        },
      ];
    }
    return [];
  }, [studentsList, siswaId, namaSiswa, nomorSertifikat, kelasNama]);

  // Selected student index
  const initialIndex = useMemo(() => {
    if (!siswaId || allStudents.length === 0) return 0;
    const foundIdx = allStudents.findIndex((s) => s.id === siswaId);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [siswaId, allStudents]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);

  const [isLoadingUkk, setIsLoadingUkk] = useState<boolean>(false);
  const [ukkRecord, setUkkRecord] = useState<any>(null);
  const [jurusanSettings, setJurusanSettings] = useState<any>(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);

  // Print Header Data hook: tenant info, school details, base64 logos
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  const currentStudent = allStudents[currentIndex] || {
    id: siswaId || '',
    nama_siswa: namaSiswa || 'Siswa',
    nomor_sertifikat: nomorSertifikat,
    kelas: kelasNama,
  };

  const activeSiswaId = currentStudent.id;

  // Fetch UKK student record and jurusan settings
  useEffect(() => {
    let isCancelled = false;
    if (!activeSiswaId) return;

    const loadData = async () => {
      setIsLoadingUkk(true);
      try {
        const [ukkRes, settingsRes] = await Promise.allSettled([
          raporApi.getUkk({ siswa_id: activeSiswaId }).catch(() => null),
          raporApi.getUkkSettings(jurusanId).catch(() => null),
        ]);

        if (isCancelled) return;

        const ukkRaw = ukkRes.status === 'fulfilled' ? (ukkRes.value as any) : null;
        const record =
          Array.isArray(ukkRaw?.data) && ukkRaw.data.length > 0
            ? ukkRaw.data.find((u: any) => u.siswa_id === activeSiswaId) || ukkRaw.data[0]
            : ukkRaw?.data || null;

        const settingsRaw = settingsRes.status === 'fulfilled' ? (settingsRes.value as any) : null;
        setUkkRecord(record);
        setJurusanSettings(settingsRaw?.data || settingsRaw || null);
      } catch (err) {
        console.warn('Error loading UKK details:', err);
      } finally {
        if (!isCancelled) setIsLoadingUkk(false);
      }
    };

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [activeSiswaId, jurusanId]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentIndex < allStudents.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handleSelectStudent = (newId: string) => {
    const idx = allStudents.findIndex((s) => s.id === newId);
    if (idx !== -1 && idx !== currentIndex) setCurrentIndex(idx);
  };

  // Assembled active certificate data
  const certData: SertifikatUkkPrintData = useMemo(() => {
    const nomor =
      currentStudent.nomor_sertifikat ||
      ukkRecord?.nomor_sertifikat ||
      `UKK/${new Date().getFullYear()}/${currentStudent.nis || '0001'}`;

    const tanggalTerbit = ukkRecord?.tanggal_terbit
      ? `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(ukkRecord.tanggal_terbit)}`
      : `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`;

    const unitKompetensiList: UkkUnitKompetensi[] =
      Array.isArray(jurusanSettings?.unit_kompetensi) && jurusanSettings.unit_kompetensi.length > 0
        ? jurusanSettings.unit_kompetensi
        : getDefaultUnitKompetensi(jurusanNama);

    return {
      nomor_sertifikat: nomor,
      tanggal_terbit: tanggalTerbit,
      sekolah: {
        nama: sekolahData?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN',
        alamat: sekolahData?.alamat || tenantInfo?.address || '',
        kota: sekolahData?.kota || 'Purwakarta',
        telepon: sekolahData?.telepon || tenantInfo?.phone || '',
        email: sekolahData?.email || tenantInfo?.email || '',
        website: sekolahData?.website || tenantInfo?.website || '',
        kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
        nip_kepala: sekolahData?.nip_kepala || '-',
        nama_dinas_atas: sekolahData?.nama_dinas_atas || tenantInfo?.nama_dinas_atas,
        nama_dinas_bawah: sekolahData?.nama_dinas_bawah || tenantInfo?.nama_dinas_bawah,
        nama_cabang_dinas: sekolahData?.nama_cabang_dinas || tenantInfo?.nama_cabang_dinas,
        print_header_lines: sekolahData?.print_header_lines || tenantInfo?.print_header_lines,
      },
      siswa: {
        nama_siswa: currentStudent.nama_siswa,
        nis: currentStudent.nis || ukkRecord?.Siswa?.nis || '-',
        nisn: currentStudent.nisn || ukkRecord?.Siswa?.nisn || '-',
        nama_kelas: currentStudent.kelas || ukkRecord?.Siswa?.Kelas?.nama_kelas || kelasNama || 'Kelas XII',
        program_keahlian: jurusanNama,
        konsentrasi_keahlian: jurusanNama,
      },
      ukk: {
        skema_sertifikasi: jurusanSettings?.skema_sertifikasi || 'Sertifikasi Kompetensi Keahlian (UKK Mandiri)',
        judul_penugasan:
          jurusanSettings?.judul_penugasan_id ||
          'Implementasi Jaringan LAN dan Troubleshooting Perangkat Komputer',
        judul_penugasan_en:
          jurusanSettings?.judul_penugasan_en ||
          'Local Area Network Implementation and Hardware Troubleshooting',
        predikat: currentStudent.predikat || ukkRecord?.predikat || 'KOMPETEN',
        nilai_praktik: currentStudent.nilai_praktik ?? ukkRecord?.nilai_praktik ?? 85,
        nilai_teori: currentStudent.nilai_teori ?? ukkRecord?.nilai_teori ?? 86,
        nilai_akhir: currentStudent.nilai_akhir ?? ukkRecord?.nilai_akhir,
        asesor_internal:
          currentStudent.asesor_internal ||
          ukkRecord?.asesor_internal ||
          'Tim Asesor Sekolah',
        asesor_eksternal:
          currentStudent.asesor_eksternal ||
          ukkRecord?.asesor_eksternal ||
          'Penguji Asosiasi Industri',
        mitra_nama:
          currentStudent.mitra_nama ||
          ukkRecord?.MitraIndustri?.nama ||
          'Mitra Industri / DU-DI',
        ttd_asesor_internal: jurusanSettings?.ttd_asesor_internal,
        ttd_asesor_eksternal: jurusanSettings?.ttd_asesor_eksternal,
        ttd_kepala_sekolah: jurusanSettings?.ttd_kepala_sekolah,
        unit_kompetensi: unitKompetensiList,
      },
    };
  }, [currentStudent, ukkRecord, jurusanSettings, sekolahData, tenantInfo, jurusanNama, kelasNama]);

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Single PDF Download via jsPDF
  const handleDownloadSinglePdf = async () => {
    try {
      const { blobUrl, filename } = await generateSertifikatUkkSinglePdf(certData, {
        logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
        logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
      });

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      toast.success('Sertifikat UKK berhasil diunduh');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh sertifikat PDF');
    }
  };

  // Batch PDF Download via jsPDF
  const handleBatchDownload = async () => {
    if (allStudents.length === 0 || isBatchDownloading) return;
    setIsBatchDownloading(true);

    try {
      const certList: SertifikatUkkPrintData[] = allStudents.map((s) => ({
        nomor_sertifikat:
          s.nomor_sertifikat || `UKK/${new Date().getFullYear()}/${s.nis || '0001'}`,
        tanggal_terbit: `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`,
        sekolah: certData.sekolah,
        siswa: {
          nama_siswa: s.nama_siswa,
          nis: s.nis || '-',
          nisn: s.nisn || '-',
          nama_kelas: s.kelas || kelasNama || 'Kelas XII',
          program_keahlian: jurusanNama,
          konsentrasi_keahlian: jurusanNama,
        },
        ukk: {
          ...certData.ukk,
          predikat: s.predikat || 'KOMPETEN',
          nilai_praktik: s.nilai_praktik ?? 85,
          nilai_teori: s.nilai_teori ?? 86,
          nilai_akhir: s.nilai_akhir,
        },
      }));

      const { blobUrl, filename } = await generateSertifikatUkkBatchPdf(
        certList,
        kelasNama || 'Sekelas',
        undefined,
        {
          logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
          logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
        }
      );

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success(`Berhasil mengunduh sertifikat ${allStudents.length} siswa`);
    } catch (e) {
      console.error('Batch download failed:', e);
      toast.error('Gagal mengunduh sertifikat massal');
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Student Selector Node for Universal Toolbar
  const studentSelectorNode = allStudents.length > 1 ? (
    <div className="flex items-center gap-2">
      <select
        value={currentStudent.id}
        onChange={(e) => handleSelectStudent(e.target.value)}
        className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[200px] sm:max-w-[240px] truncate cursor-pointer focus:ring-2 focus:ring-primary shadow-xs"
      >
        {allStudents.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nama_siswa} {s.nis ? `(${s.nis})` : ''}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  // Title & Subtitle for Universal Toolbar
  const titleNode = (
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
        <Award className="w-4 h-4" />
      </div>
      <span className="font-bold text-sm sm:text-base text-foreground">
        Sertifikat Uji Kompetensi Keahlian (UKK)
      </span>
    </div>
  );

  const subtitleNode = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
        {currentStudent.nama_siswa}
      </span>
      {kelasNama && (
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          • {kelasNama}
        </span>
      )}
      {jurusanNama && (
        <span className="text-[11px] font-semibold text-primary/80 hidden sm:inline">
          • {jurusanNama}
        </span>
      )}
    </div>
  );

  // Common inner content for both Modal and Tab representations
  const renderSheetsContent = () => (
    <>
      {isLoadingUkk && (
        <div className="flex items-center justify-center p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Memuat data penilaian dan pengaturan UKK...</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEMBAR 1: MUKA DEPAN SERTIFIKAT RESMI UKK                                  */}
      {/* ========================================================================= */}
      <PrintDocumentSheet
        orientation={orientation}
        pageNumber={1}
        totalPages={2}
        footerText={`Sertifikat Uji Kompetensi Keahlian — ${certData.sekolah?.nama}`}
        className="relative overflow-hidden"
      >
        {/* Certificate Ornate Frame */}
        <div className="border-[4px] border-double border-slate-700 dark:border-slate-400 p-6 sm:p-9 h-full flex flex-col justify-between relative bg-white">
          <div>
            {/* Top Logos Row */}
            <div className="flex items-center justify-between mb-4">
              {/* Logo Kiri (Pemda) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {showLogoDaerah && logoDaerahBase64 ? (
                  <img
                    src={logoDaerahBase64}
                    alt="Logo Pemda"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-1" />
                )}
              </div>

              {/* Logo Tengah (Tut Wuri Handayani) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                <img
                  src={TUT_WURI_LOGO_SVG}
                  alt="Tut Wuri Handayani"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Logo Kanan (Sekolah) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {showLogoSekolah && logoSekolahBase64 ? (
                  <img
                    src={logoSekolahBase64}
                    alt="Logo Sekolah"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-1" />
                )}
              </div>
            </div>

            {/* Main Official Title */}
            <div className="text-center space-y-1 mb-5">
              <h2 className="text-[11px] font-bold tracking-widest text-slate-800 uppercase">
                REPUBLIK INDONESIA
              </h2>
              <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-sky-800">
                SERTIFIKAT UJI KOMPETENSI KEAHLIAN
              </h1>
              <p className="text-[11px] font-serif italic text-sky-700">
                CERTIFICATE OF COMPETENCY ASSESSMENT
              </p>
              <p className="text-[11px] font-mono text-slate-600 tracking-wide mt-1">
                Nomor : {certData.nomor_sertifikat}
              </p>
            </div>

            {/* Certification Statement */}
            <div className="text-center my-4 space-y-0.5">
              <p className="text-[11.5px] text-slate-700">Dengan ini menyatakan bahwa,</p>
              <p className="text-[10px] text-slate-500 italic">This is to certify that</p>
            </div>

            {/* Student Name & Identifiers */}
            <div className="text-center my-4">
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-300 pb-1 inline-block min-w-[280px]">
                {certData.siswa.nama_siswa}
              </h2>
              <p className="text-[11px] font-mono text-slate-600 mt-1.5">
                NISN : {certData.siswa.nisn || '-'} • NIS : {certData.siswa.nis || '-'}
              </p>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                Sekolah Asal : {certData.sekolah?.nama}
              </p>
            </div>

            {/* Qualification Assessment Text */}
            <div className="text-center my-4 space-y-2">
              <div className="text-[11px] text-slate-700">
                <p>Telah mengikuti Uji Kompetensi Keahlian pada Kompetensi Keahlian:</p>
                <p className="text-[10px] text-slate-500 italic">has taken the competency test in Competency of</p>
              </div>

              <div className="text-sm font-bold uppercase text-slate-900 tracking-wide">
                {certData.siswa.program_keahlian}
              </div>

              <div className="text-[11px] text-slate-700 pt-1">
                <p>pada Judul Penugasan / on Assignment:</p>
                <p className="font-semibold text-slate-900 italic mt-0.5">
                  "{certData.ukk.judul_penugasan}"
                </p>
                {certData.ukk.judul_penugasan_en && (
                  <p className="text-[10px] text-slate-500 italic">
                    "{certData.ukk.judul_penugasan_en}"
                  </p>
                )}
              </div>

              {/* Predikat / Achievement Level */}
              <div className="pt-2">
                <p className="text-[11px] text-slate-700">dengan predikat / with achievement level:</p>
                <div className="inline-block mt-1 px-4 py-1 rounded-full border border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold text-xs uppercase tracking-wider shadow-xs">
                  {certData.ukk.predikat}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Official Signatures */}
          <div className="pt-6 mt-4 border-t border-slate-200">
            <div className="text-right text-[11px] text-slate-700 mb-3 font-sans">
              {certData.tanggal_terbit}
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
              {/* Left Sign: Mitra Industri DU/DI */}
              <div>
                <p className="font-normal text-slate-700">Mitra Industri / DU-DI,</p>
                <p className="text-[10px] text-slate-500 italic">Industry Partner</p>
                <div className="h-14 flex items-center justify-center my-1">
                  {certData.ukk.ttd_asesor_eksternal ? (
                    <img
                      src={certData.ukk.ttd_asesor_eksternal}
                      alt="TTD Mitra Industri"
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900">
                  {certData.ukk.asesor_eksternal || 'Pimpinan / Asesor Industri'}
                </p>
                <p className="text-[10px] text-slate-600 font-sans">{certData.ukk.mitra_nama}</p>
              </div>

              {/* Right Sign: Kepala Sekolah */}
              <div>
                <p className="font-normal text-slate-700">Kepala Sekolah,</p>
                <p className="text-[10px] text-slate-500 italic">Principal</p>
                <div className="h-14 flex items-center justify-center my-1">
                  {certData.ukk.ttd_kepala_sekolah ? (
                    <img
                      src={certData.ukk.ttd_kepala_sekolah}
                      alt="TTD Kepala Sekolah"
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900">
                  {certData.sekolah?.kepala_sekolah || 'Kepala Sekolah'}
                </p>
                <p className="text-[10px] text-slate-600 font-sans">
                  NIP. {certData.sekolah?.nip_kepala || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>

      {/* Visual Sheet Divider */}
      <div className="print:hidden flex items-center gap-3 my-2 text-xs text-slate-500 font-sans">
        <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-xs border border-slate-300 dark:border-slate-700">
          Halaman 2: Transkrip Unit Kompetensi
        </span>
        <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR 2: LEMBAR BELAKANG (TRANSKRIP DAFTAR UNIT KOMPETENSI)              */}
      {/* ========================================================================= */}
      <PrintDocumentSheet
        orientation={orientation}
        pageNumber={2}
        totalPages={2}
        footerText={`Transkrip Nilai UKK — ${certData.siswa.nama_siswa} (${certData.siswa.nisn || certData.siswa.nis})`}
      >
        <div className="flex flex-col justify-between h-full">
          <div>
            {/* Header Lembar Belakang */}
            <div className="text-center pb-3 mb-4 border-b border-slate-300">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                DAFTAR UNIT KOMPETENSI
              </h3>
              <p className="text-[11px] font-serif italic text-slate-600">
                List of Competency Units
              </p>
            </div>

            {/* Student Recap Info */}
            <div className="flex flex-col sm:flex-row justify-between text-[11px] mb-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 font-sans">
              <div>
                <span>Nama Siswa: </span>
                <strong className="text-slate-900">{certData.siswa.nama_siswa}</strong>
              </div>
              <div>
                <span>NISN / NIS: </span>
                <strong className="text-slate-900 font-mono">{certData.siswa.nisn} / {certData.siswa.nis}</strong>
              </div>
              <div>
                <span>Program Keahlian: </span>
                <strong className="text-slate-900">{certData.siswa.program_keahlian}</strong>
              </div>
            </div>

            {/* Table of Competencies */}
            <div className="border border-slate-400 overflow-hidden rounded-xs my-3 font-sans">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-800">
                    <th className="w-10 py-1.5 px-2 text-center border-r border-slate-400 font-bold">No</th>
                    <th className="w-36 py-1.5 px-2 text-center border-r border-slate-400 font-bold">
                      Kode Unit <br /><span className="text-[9px] font-normal italic">Unit Code</span>
                    </th>
                    <th className="py-1.5 px-3 text-left border-r border-slate-400 font-bold">
                      Judul Unit Kompetensi <br /><span className="text-[9px] font-normal italic">Unit Title</span>
                    </th>
                    <th className="w-28 py-1.5 px-2 text-center font-bold">
                      Capaian <br /><span className="text-[9px] font-normal italic">Achievement</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certData.ukk.unit_kompetensi?.map((unit, uIdx) => (
                    <tr
                      key={uIdx}
                      className={uIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="py-1.5 px-2 text-center border-t border-r border-slate-300 font-mono text-[10.5px]">
                        {uIdx + 1}
                      </td>
                      <td className="py-1.5 px-2 text-center border-t border-r border-slate-300 font-mono text-[10.5px]">
                        {unit.kode_unit}
                      </td>
                      <td className="py-1.5 px-3 text-left border-t border-r border-slate-300 font-medium">
                        {unit.judul_unit}
                      </td>
                      <td className="py-1.5 px-2 text-center border-t border-slate-300 font-semibold text-emerald-700">
                        Kompeten
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Score Table */}
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-sm font-sans">
              <div className="text-[11px] font-bold text-slate-800 mb-1.5">
                Ringkasan Penilaian Uji Kompetensi Keahlian:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Nilai Praktik</div>
                  <div className="text-base font-bold text-slate-800">{certData.ukk.nilai_praktik ?? '-'}</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Nilai Teori</div>
                  <div className="text-base font-bold text-slate-800">{certData.ukk.nilai_teori ?? '-'}</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Nilai Akhir</div>
                  <div className="text-base font-bold text-primary">
                    {certData.ukk.nilai_akhir ??
                      Math.round(
                        (Number(certData.ukk.nilai_praktik || 85) * 0.7) +
                        (Number(certData.ukk.nilai_teori || 86) * 0.3)
                      )}
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Predikat</div>
                  <div className="text-base font-extrabold text-emerald-700 uppercase">
                    {certData.ukk.predikat}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assessor Signatures on Page 2 */}
          <div className="pt-4 border-t border-slate-300 mt-6">
            <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
              <div>
                <p className="font-normal text-slate-700">Penguji Internal,</p>
                <p className="text-[10px] text-slate-500 italic">Internal Assessor</p>
                <div className="h-14 flex items-center justify-center my-1">
                  {certData.ukk.ttd_asesor_internal ? (
                    <img
                      src={certData.ukk.ttd_asesor_internal}
                      alt="TTD Asesor Internal"
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900">
                  {certData.ukk.asesor_internal}
                </p>
                <p className="text-[10px] text-slate-600 font-sans">{certData.sekolah?.nama}</p>
              </div>

              <div>
                <p className="font-normal text-slate-700">Penguji Eksternal,</p>
                <p className="text-[10px] text-slate-500 italic">External Assessor</p>
                <div className="h-14 flex items-center justify-center my-1">
                  {certData.ukk.ttd_asesor_eksternal ? (
                    <img
                      src={certData.ukk.ttd_asesor_eksternal}
                      alt="TTD Asesor Eksternal"
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900">
                  {certData.ukk.asesor_eksternal}
                </p>
                <p className="text-[10px] text-slate-600 font-sans">{certData.ukk.mitra_nama}</p>
              </div>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </>
  );

  // If invoked as a modal dialog
  if (isModal) {
    return (
      <UniversalDocumentModal
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode}
        subtitle={subtitleNode}
        orientation={orientation}
        allowOrientationToggle={true}
        onOrientationChange={setOrientation}
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        onToggleLogoDaerah={setShowLogoDaerah}
        onToggleLogoSekolah={setShowLogoSekolah}
        allowLogoToggles={true}
        batchTotal={allStudents.length}
        batchCurrentIndex={currentIndex}
        onPrevBatch={handlePrev}
        onNextBatch={handleNext}
        batchSelector={studentSelectorNode}
        onDownloadBatchPdf={handleBatchDownload}
        isBatchDownloading={isBatchDownloading}
        batchDownloadButtonText={allStudents.length > 1 ? `Unduh Sekelas (${allStudents.length})` : undefined}
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadSinglePdf}
        downloadPdfText="PDF"
        printButtonText="Cetak"
        size="6xl"
      >
        {renderSheetsContent()}
      </UniversalDocumentModal>
    );
  }

  // If invoked as a full-page tab inside a dashboard view
  return (
    <div className={className}>
      <UniversalDocumentTab
        title={titleNode}
        subtitle={subtitleNode}
        orientation={orientation}
        allowOrientationToggle={true}
        onOrientationChange={setOrientation}
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        onToggleLogoDaerah={setShowLogoDaerah}
        onToggleLogoSekolah={setShowLogoSekolah}
        allowLogoToggles={true}
        batchTotal={allStudents.length}
        batchCurrentIndex={currentIndex}
        onPrevBatch={handlePrev}
        onNextBatch={handleNext}
        batchSelector={studentSelectorNode}
        onDownloadBatchPdf={handleBatchDownload}
        isBatchDownloading={isBatchDownloading}
        batchDownloadButtonText={allStudents.length > 1 ? `Unduh Sekelas (${allStudents.length})` : undefined}
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadSinglePdf}
        downloadPdfText="PDF"
        printButtonText="Cetak"
      >
        {renderSheetsContent()}
      </UniversalDocumentTab>
    </div>
  );
};
