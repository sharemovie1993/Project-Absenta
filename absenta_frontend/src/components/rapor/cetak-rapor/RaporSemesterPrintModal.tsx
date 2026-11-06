import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  usePrintHeaderData,
  normalizeStudentIdentity,
} from '@/components/ui/PrintHeader';
import { raporApi } from '@/api/rapor.api';
import { generateRaporPdf } from '@/utils/print/rapor/renderRaporCk';
import { getMapelCanonicalPriority } from '@/utils/print/rapor/raporShared';
import { Loader2 } from 'lucide-react';
import type { LegerStudent, SemesterDocumentOption } from './LegerStudentTable';

export interface RaporSemesterPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  students?: LegerStudent[];
  onSelectStudent?: (student: LegerStudent) => void;
  initialTahunPelajaranId?: string;
  initialSemesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  isJenjangSmk?: boolean;
}

export const RaporSemesterPrintModal: React.FC<RaporSemesterPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  initialTahunPelajaranId = '',
  initialSemesterId = '',
  tahunPelajaranNama = '',
  semesterNama = '',
  isJenjangSmk = true,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Active Semester & TP selector state (Mendukung pemilihan Semester 1 - 6)
  const [activeTpId, setActiveTpId] = useState<string>(initialTahunPelajaranId);
  const [activeSemId, setActiveSemId] = useState<string>(initialSemesterId);

  // Sinkronisasi saat modal dibuka atau student berubah
  useEffect(() => {
    if (isOpen) {
      setActiveTpId(initialTahunPelajaranId);
      setActiveSemId(initialSemesterId);
    }
  }, [isOpen, initialTahunPelajaranId, initialSemesterId]);

  // Data Sekolah & Tenant Header
  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  const siswaId = selectedStudent?.id;

  // 1. Fetch Detail Rapor Semester Aktif
  const { data: raporRes, isLoading: isLoadingRapor } = useQuery({
    queryKey: ['rapor-detail-semester', siswaId, activeTpId, activeSemId],
    queryFn: () =>
      raporApi.getRaporDetail({
        siswa_id: siswaId!,
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemId,
      }),
    enabled: isOpen && Boolean(siswaId && activeTpId && activeSemId),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Rapor Settings (Tempat terbit, tanggal rapor, nama kepsek)
  const { data: settingsRes } = useQuery({
    queryKey: ['rapor-settings-semester', activeTpId, activeSemId],
    queryFn: () =>
      raporApi.getRaporSettings({
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemId,
      }),
    enabled: isOpen && Boolean(activeTpId && activeSemId),
    staleTime: 5 * 60 * 1000,
  });

  const raporData = useMemo(() => {
    return (raporRes as any)?.data || raporRes || null;
  }, [raporRes]);

  const settingsData = useMemo(() => {
    return (settingsRes as any)?.data || settingsRes || null;
  }, [settingsRes]);

  // Riwayat semester yang tersedia untuk siswa ini (Semester 1 - 6)
  const semesterOptions: SemesterDocumentOption[] = useMemo(() => {
    if (!selectedStudent?.riwayat_semester || selectedStudent.riwayat_semester.length === 0) {
      return [];
    }
    return selectedStudent.riwayat_semester;
  }, [selectedStudent]);

  // Index siswa untuk navigasi batch
  const currentIndex = useMemo(() => {
    if (!selectedStudent || students.length === 0) return 0;
    const idx = students.findIndex((s) => s.id === selectedStudent.id);
    return idx >= 0 ? idx : 0;
  }, [students, selectedStudent]);

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

  // Handler Download PDF Resmi True WYSIWYG
  const handleDownloadPdf = useCallback(async () => {
    if (!siswaId || !activeTpId || !activeSemId || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { blobUrl, filename } = await generateRaporPdf({
        siswaId,
        tahunPelajaranId: activeTpId,
        semesterId: activeSemId,
        tahunPelajaranNama,
        semesterNama,
      });
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('[RaporSemesterPrintModal] Gagal mengunduh PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [siswaId, activeTpId, activeSemId, tahunPelajaranNama, semesterNama, isExportingPdf]);

  // Metadata Siswa (Universal Academic Identity Engine) - Diposisikan sebelum early return mematuhi Rules of Hooks
  const normalizedStudent = useMemo(
    () => normalizeStudentIdentity(raporData?.siswa || selectedStudent || {}),
    [raporData?.siswa, selectedStudent]
  );

  if (!isOpen || !selectedStudent) return null;
  const siswa = raporData?.siswa || selectedStudent || {};
  const namaSiswa = (normalizedStudent.nama || '-').toUpperCase();
  const nis = normalizedStudent.nis || '-';
  const nisn = normalizedStudent.nisn || '-';
  const namaSekolah = (rawSekolah?.nama || tenantInfo?.name || 'SEKOLAH').toUpperCase();
  const alamatSekolah = rawSekolah?.alamat || tenantInfo?.address || '-';

  const resolveNonDash = (...values: Array<string | undefined | null>): string => {
    for (const v of values) {
      if (v && v.trim() !== '' && v.trim() !== '-') return v.trim();
    }
    return '-';
  };

  const rawSiswa = raporData?.siswa || selectedStudent || {};

  const bidangKeahlian = resolveNonDash(
    normalizedStudent.bidangKeahlian,
    (rawSiswa as any)?.bidang_keahlian,
    tenantInfo?.bidang_keahlian,
    'Teknologi Manufaktur dan Rekayasa'
  );
  const programKeahlian = resolveNonDash(
    normalizedStudent.programKeahlian,
    (rawSiswa as any)?.program_keahlian,
    tenantInfo?.program_keahlian,
    'Teknik Elektronika'
  );
  const konsentrasiKeahlian = resolveNonDash(
    normalizedStudent.konsentrasiKeahlian,
    normalizedStudent.namaJurusan,
    (rawSiswa as any)?.konsentrasi_keahlian,
    programKeahlian
  );

  const kelas = resolveNonDash(
    normalizedStudent.namaKelas,
    (rawSiswa as any)?.kelas,
    (rawSiswa as any)?.nama_kelas,
    selectedStudent?.nama_kelas
  );
  const tingkatNum = Number(normalizedStudent.tingkat || 10);
  const fase = tingkatNum <= 10 ? 'E' : 'F';

  // Semester & Tahun Pelajaran Info
  const effectiveSemesterNama =
    (raporData?.semester?.nama_semester || '').trim() ||
    semesterNama ||
    (raporData?.is_genap ? 'Genap' : 'Ganjil');

  const effectiveTahunPelajaranNama =
    (raporData?.tahun_pelajaran?.tahun || '').trim() ||
    tahunPelajaranNama ||
    '2025 / 2026';

  const isGenap = Boolean(
    raporData?.is_genap ||
    raporData?.semester?.is_genap ||
    effectiveSemesterNama.toLowerCase().includes('genap') ||
    effectiveSemesterNama.includes('2')
  );

  // Kokurikuler & Kenaikan Kelas Rule
  const matchYear = String(effectiveTahunPelajaranNama || '').match(/^(\d{4})/);
  const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
  const isLegacyEra = startYear < 2025;

  const showKokurikuler = settingsData?.tampilkan_kokurikuler !== undefined
    ? Boolean(settingsData.tampilkan_kokurikuler)
    : (raporData?.tampilkan_kokurikuler !== undefined ? Boolean(raporData.tampilkan_kokurikuler) : startYear >= 2025);

  // Grouping Mata Pelajaran Sesuai Standar Kurikulum Merdeka
  const listNilai: any[] = raporData?.nilai_akademik || [];
  const groupedMapel = new Map<string, any[]>();

  listNilai.forEach((m: any) => {
    const rawGrp = (m.kelompok_mapel || '').toLowerCase();
    const mapelNameLower = (m.mapel_name || '').toLowerCase();
    let groupCategory = 'Kelompok Umum';

    if (isLegacyEra) {
      const isKejuruanLegacy =
        rawGrp.includes('kejuruan') ||
        rawGrp.includes('pilihan') ||
        rawGrp.includes('lokal') ||
        rawGrp.includes('mulok') ||
        (isJenjangSmk && (
          mapelNameLower.includes('matematika') ||
          mapelNameLower.includes('inggris') ||
          mapelNameLower.includes('informatika') ||
          mapelNameLower.includes('ipas') ||
          mapelNameLower.includes('dasar') ||
          mapelNameLower.includes('konsentrasi') ||
          mapelNameLower.includes('kejuruan') ||
          mapelNameLower.includes('pkk') ||
          mapelNameLower.includes('kewirausahaan') ||
          mapelNameLower.includes('pkl') ||
          mapelNameLower.includes('sunda') ||
          mapelNameLower.includes('daerah')
        ));
      groupCategory = isKejuruanLegacy ? 'Kelompok Kejuruan' : 'Kelompok Umum';
    } else {
      if (rawGrp.includes('muatan lokal') || rawGrp.includes('mulok') || mapelNameLower.includes('sunda') || mapelNameLower.includes('daerah')) {
        groupCategory = 'Muatan Lokal';
      } else if (rawGrp.includes('pilihan') || rawGrp.includes('peminatan') || mapelNameLower.includes('pilihan')) {
        groupCategory = 'Mata Pelajaran Pilihan';
      } else if (rawGrp.includes('kejuruan') || (isJenjangSmk && (
        mapelNameLower.includes('matematika') ||
        mapelNameLower.includes('inggris') ||
        mapelNameLower.includes('informatika') ||
        mapelNameLower.includes('ipas') ||
        mapelNameLower.includes('dasar') ||
        mapelNameLower.includes('konsentrasi') ||
        mapelNameLower.includes('kejuruan') ||
        mapelNameLower.includes('pkk') ||
        mapelNameLower.includes('kewirausahaan') ||
        mapelNameLower.includes('pkl')
      ))) {
        groupCategory = 'Mata Pelajaran Kejuruan';
      } else {
        groupCategory = 'Mata Pelajaran Umum';
      }
    }

    if (!groupedMapel.has(groupCategory)) {
      groupedMapel.set(groupCategory, []);
    }
    groupedMapel.get(groupCategory)!.push(m);
  });

  const standardOrder = isLegacyEra
    ? ['Kelompok Umum', 'Kelompok Kejuruan']
    : ['Mata Pelajaran Umum', 'Mata Pelajaran Kejuruan', 'Mata Pelajaran Pilihan', 'Muatan Lokal'];

  const activeGroups = standardOrder.filter((grp) => (groupedMapel.get(grp) || []).length > 0);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Data Ekstrakurikuler
  const ekskulList: any[] = raporData?.ekskul || [];
  const absensi = raporData?.absensi || {};
  const catatanWali = raporData?.catatan_wali || 'Pertahankan prestasi akademik dan terus kembangkan potensi diri dengan penuh disiplin serta semangat pantang menyerah.';
  const catatanKokurikuler = raporData?.catatan_kokurikuler ||
    'Peserta didik menunjukkan sikap disiplin dan tanggung jawab (Mandiri), mampu bekerja sama dan saling menghargai (Gotong Royong), serta menerapkan nilai-nilai akhlak mulia dalam kegiatan sekolah (Beriman dan Bertakwa kepada Tuhan YME serta Berakhlak Mulia).';

  // Keputusan Kenaikan Kelas (Semester Genap)
  const rawKeputusan = (raporData?.keputusan_transisi || '').trim().toUpperCase();
  const isMenetap = rawKeputusan === 'MENETAP' || rawKeputusan === 'TINGGAL';
  const targetNext = tingkatNum === 10 ? 'XI (Sebelas)' : tingkatNum === 11 ? 'XII (Dua Belas)' : 'Lulus';
  const curKelas = tingkatNum === 10 ? 'X (Sepuluh)' : tingkatNum === 11 ? 'XI (Sebelas)' : String(tingkatNum);
  const textNaik = tingkatNum >= 12 ? 'Lulus' : `Naik ke kelas ${targetNext}`;
  const textTinggal = tingkatNum >= 12 ? 'Tidak Lulus' : `Tinggal di kelas ${curKelas}`;

  // Pejabat & Tanggal Cetak
  const kota = settingsData?.tempat_terbit || (rawSekolah as any)?.kota || tenantInfo?.city || 'Purwakarta';
  let effectiveDateVal = isGenap ? settingsData?.tanggal_rapor_genap : settingsData?.tanggal_rapor_ganjil;
  if (!effectiveDateVal) effectiveDateVal = settingsData?.tanggal_rapor;
  if (!effectiveDateVal) effectiveDateVal = isGenap ? `${startYear + 1}-06-24` : `${startYear}-12-22`;

  const dateParts = String(effectiveDateVal).split('-');
  let dateStr = '';
  if (dateParts.length === 3) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    dateStr = `${parseInt(dateParts[2], 10)} ${months[parseInt(dateParts[1], 10) - 1]} ${dateParts[0]}`;
  } else {
    dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const kepalaSekolahNama = settingsData?.kepsek_nama || (rawSekolah as any)?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = settingsData?.kepsek_nip || (rawSekolah as any)?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const waliKelasNama = raporData?.wali_kelas_nama || (siswa as any)?.walas_nama || 'Wali Kelas';
  const rawWalasNip = raporData?.wali_kelas_nip || (siswa as any)?.walas_nip;
  const waliKelasNip = rawWalasNip && rawWalasNip !== '-' ? (rawWalasNip.startsWith('NIP.') ? rawWalasNip : `NIP. ${rawWalasNip}`) : 'NIP. -';

  // Subtitle Modal
  const modalSubtitle = `${namaSiswa} (NIS: ${nis}) • ${kelas} • ${effectiveSemesterNama} ${effectiveTahunPelajaranNama}`;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Rapor Semester (Laporan Hasil Belajar CK1 & CK2)"
      subtitle={modalSubtitle}
      orientation="portrait"
      allowLogoToggles={false}
      batchTotal={students.length}
      batchCurrentIndex={currentIndex}
      onPrevBatch={currentIndex > 0 ? handlePrevBatch : undefined}
      onNextBatch={currentIndex < students.length - 1 ? handleNextBatch : undefined}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Menyusun PDF...' : 'Unduh PDF'}
      size="5xl"
    >
      <div className="flex flex-col gap-10 items-center w-full py-4 print:py-0 print:gap-0">
        {/* Toolbar Cepat: Pemilih Semester 1 - 6 */}
        {semesterOptions.length > 0 && (
          <div className="w-full max-w-[210mm] flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pilih Semester:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {semesterOptions.map((opt) => {
                  const isActive = opt.tahunPelajaranId === activeTpId && opt.semesterId === activeSemId;
                  return (
                    <button
                      key={`opt-sem-${opt.semesterId}`}
                      type="button"
                      onClick={() => {
                        setActiveTpId(opt.tahunPelajaranId);
                        setActiveSemId(opt.semesterId);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>Smt {opt.semesterNumber}</span>
                      <span className="text-[10px] ml-1 opacity-75 font-normal">({opt.kelasTingkat})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              {effectiveSemesterNama} • {effectiveTahunPelajaranNama}
            </div>
          </div>
        )}

        {isLoadingRapor && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 w-full max-w-[210mm]">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Memuat rincian nilai capaian pembelajaran semester dari database...</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 1: LAPORAN HASIL BELAJAR (NILAI AKADEMIK CK1)          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '14mm 15mm 14mm 15mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Header Title */}
              <div className="text-center mb-[4mm]">
                <h1 className="font-bold text-[12pt] leading-tight text-black tracking-[0.2px] uppercase">
                  LAPORAN HASIL BELAJAR
                </h1>
                <h2 className="font-bold text-[12pt] leading-tight text-black uppercase">
                  (RAPOR)
                </h2>
              </div>

              {/* 2-Column Metadata Grid */}
              <div className="w-full mb-[3.5mm] text-[8.5pt] leading-tight text-black">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[32mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[64mm]" />
                    <col className="w-[34mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[44mm]" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="py-[0.7mm] text-left">Nama Peserta Didik</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left font-bold truncate">{namaSiswa}</td>
                      <td className="py-[0.7mm] text-left">Kelas</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left font-bold">{kelas}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left">NIS/NISN</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{nis} / {nisn}</td>
                      <td className="py-[0.7mm] text-left">Fase</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{fase}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left">Nama Sekolah</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left truncate">{namaSekolah}</td>
                      <td className="py-[0.7mm] text-left">Semester</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{effectiveSemesterNama}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left align-top">Alamat</td>
                      <td className="py-[0.7mm] text-center align-top">:</td>
                      <td className="py-[0.7mm] text-left align-top">{alamatSekolah}</td>
                      <td className="py-[0.7mm] text-left align-top">Tahun Pelajaran</td>
                      <td className="py-[0.7mm] text-center align-top">:</td>
                      <td className="py-[0.7mm] text-left align-top">{effectiveTahunPelajaranNama}</td>
                    </tr>
                    {isJenjangSmk && (
                      <>
                        <tr>
                          <td colSpan={6} className="py-[0.5mm]" />
                        </tr>
                        <tr>
                          <td className="py-[0.7mm] text-left">Bidang Keahlian</td>
                          <td className="py-[0.7mm] text-center">:</td>
                          <td colSpan={4} className="py-[0.7mm] text-left truncate">{bidangKeahlian}</td>
                        </tr>
                        <tr>
                          <td className="py-[0.7mm] text-left">Program Keahlian</td>
                          <td className="py-[0.7mm] text-center">:</td>
                          <td colSpan={4} className="py-[0.7mm] text-left truncate">{programKeahlian}</td>
                        </tr>
                        <tr>
                          <td className="py-[0.7mm] text-left">Konsentrasi Keahlian</td>
                          <td className="py-[0.7mm] text-center">:</td>
                          <td colSpan={4} className="py-[0.7mm] text-left truncate">{konsentrasiKeahlian}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section I: INTRA KURIKULER */}
              <div className="font-bold text-[10pt] text-black mb-[2mm]">
                I. INTRA KURIKULER
              </div>

              {/* Table Nilai Akademik */}
              <div className="w-full">
                <table className="w-full table-fixed border-collapse border border-black text-[7.8pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[10mm]" />
                    <col className="w-[56mm]" />
                    <col className="w-[16mm]" />
                    <col className="w-[98mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#cdcdcd] border-b border-black font-bold">
                      <th className="py-[2mm] text-center border-r border-black align-middle text-black font-bold">No</th>
                      <th className="py-[2mm] px-[2.5mm] text-center border-r border-black align-middle text-black font-bold">Mata Pelajaran</th>
                      <th className="py-[2mm] text-center border-r border-black align-middle text-black font-bold">Nilai</th>
                      <th className="py-[2mm] px-[2.5mm] text-center align-middle text-black font-bold">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroups.map((grpName, grpIdx) => {
                      const items = groupedMapel.get(grpName) || [];
                      items.sort((a, b) => {
                        const pA = getMapelCanonicalPriority(a.mapel_name || '', grpName, isJenjangSmk ? 'SMK' : 'SMA', a.urutan);
                        const pB = getMapelCanonicalPriority(b.mapel_name || '', grpName, isJenjangSmk ? 'SMK' : 'SMA', b.urutan);
                        if (pA !== pB) return pA - pB;
                        return (a.mapel_name || '').localeCompare(b.mapel_name || '');
                      });

                      const letterPrefix = letters[grpIdx] ? `${letters[grpIdx]}. ` : '';

                      return (
                        <React.Fragment key={`grp-${grpIdx}`}>
                          {/* Sub Header Kelompok Mapel */}
                          <tr className="bg-white border-t border-b border-black">
                            <td colSpan={4} className="py-[1.5mm] px-[2.5mm] font-bold text-left text-black text-[8.5pt]">
                              {letterPrefix}{grpName}
                            </td>
                          </tr>

                          {/* Baris Mapel */}
                          {items.map((m: any, mIdx: number) => {
                            const hasScore = (m.nilai_akhir && m.nilai_akhir > 0) || (m.nilai_components && m.nilai_components.length > 0);
                            const score = hasScore ? m.nilai_akhir : '-';
                            const cap = m.capaian_kompetensi ||
                              (m.capaian_tercapai ? `Menunjukkan penguasaan yang baik dalam ${m.capaian_tercapai}` : 'Siswa mampu memahami materi dan mencapai kompetensi mata pelajaran ini dengan baik.');

                            return (
                              <tr key={`mapel-${mIdx}`} className="border-b border-black">
                                <td className="py-[1.8mm] text-center align-middle border-r border-black">
                                  {mIdx + 1}
                                </td>
                                <td className="py-[1.8mm] px-[2.5mm] text-left align-middle border-r border-black font-normal">
                                  {m.mapel_name || '-'}
                                </td>
                                <td className={`py-[1.8mm] text-center align-middle border-r border-black font-bold ${!hasScore ? 'text-red-600' : ''}`}>
                                  {score}
                                </td>
                                <td className="py-[1.8mm] px-[2.5mm] text-left align-middle font-normal text-justify">
                                  {cap}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: EKSTRAKURIKULER, PRESENSI & TTD (CK2)               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '14mm 15mm 14mm 15mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Identitas Ringkas Header Lembar 2 */}
              <div className="w-full mb-[3.5mm] text-[8.5pt] leading-tight text-black">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[32mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[64mm]" />
                    <col className="w-[34mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[44mm]" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="py-[0.7mm] text-left">Nama Peserta Didik</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left font-bold truncate">{namaSiswa}</td>
                      <td className="py-[0.7mm] text-left">Kelas</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left font-bold">{kelas}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left">NIS/NISN</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{nis} / {nisn}</td>
                      <td className="py-[0.7mm] text-left">Fase</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{fase}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left">Nama Sekolah</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left truncate">{namaSekolah}</td>
                      <td className="py-[0.7mm] text-left">Semester</td>
                      <td className="py-[0.7mm] text-center">:</td>
                      <td className="py-[0.7mm] text-left">{effectiveSemesterNama}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.7mm] text-left align-top">Alamat</td>
                      <td className="py-[0.7mm] text-center align-top">:</td>
                      <td className="py-[0.7mm] text-left align-top">{alamatSekolah}</td>
                      <td className="py-[0.7mm] text-left align-top">Tahun Pelajaran</td>
                      <td className="py-[0.7mm] text-center align-top">:</td>
                      <td className="py-[0.7mm] text-left align-top">{effectiveTahunPelajaranNama}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section II: KOKURIKULER (Hanya jika tampilkan_kokurikuler aktif) */}
              {showKokurikuler && (
                <div className="mb-[4mm]">
                  <div className="font-bold text-[10pt] text-black mb-[1.5mm]">
                    II. KOKURIKULER
                  </div>
                  <div className="border border-black p-2.5 text-[8.5pt] leading-normal text-justify">
                    {catatanKokurikuler}
                  </div>
                </div>
              )}

              {/* Section: EKSTRAKURIKULER */}
              <div className="mb-[4mm]">
                <div className="font-bold text-[10pt] text-black mb-[1.5mm]">
                  {showKokurikuler ? 'III' : 'II'}. EKSTRA KURIKULER
                </div>
                <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[12mm]" />
                    <col className="w-[55mm]" />
                    <col className="w-[113mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#cdcdcd] border-b border-black font-bold">
                      <th className="py-[1.8mm] text-center border-r border-black font-bold text-black">No</th>
                      <th className="py-[1.8mm] px-[2.5mm] text-center border-r border-black font-bold text-black">Ekstrakurikuler</th>
                      <th className="py-[1.8mm] px-[2.5mm] text-center font-bold text-black">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ekskulList.length > 0 ? (
                      ekskulList.map((e: any, idx: number) => (
                        <tr key={`ekskul-${idx}`} className="border-b border-black">
                          <td className="py-[1.8mm] text-center border-r border-black">{idx + 1}</td>
                          <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black font-medium">{e.nama_ekskul || e.nama || '-'}</td>
                          <td className="py-[1.8mm] px-[2.5mm] text-left">{e.keterangan || (e.predikat ? `Melaksanakan kegiatan ekstrakurikuler dengan predikat ${e.predikat}.` : '-')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-black">
                        <td className="py-[1.8mm] text-center border-r border-black">1</td>
                        <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">-</td>
                        <td className="py-[1.8mm] px-[2.5mm] text-left">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section: KETIDAKHADIRAN & CATATAN WALI KELAS */}
              <div className="mb-[4mm]">
                <div className="font-bold text-[10pt] text-black mb-[1.5mm]">
                  {showKokurikuler ? 'IV' : 'III'}. KETIDAKHADIRAN
                </div>
                <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[38mm]" />
                    <col className="w-[25mm]" />
                    <col className="w-[117mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#cdcdcd] border-b border-black font-bold">
                      <th colSpan={2} className="py-[1.8mm] text-center border-r border-black font-bold text-black">Ketidakhadiran</th>
                      <th className="py-[1.8mm] text-center font-bold text-black">Catatan Wali Kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Sakit</td>
                      <td className="py-[1.8mm] text-center border-r border-black font-bold">{absensi.sakit ?? 0} Hari</td>
                      <td rowSpan={3} className="py-[2mm] px-[3mm] text-left align-middle text-justify leading-relaxed">
                        {catatanWali}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Izin</td>
                      <td className="py-[1.8mm] text-center border-r border-black font-bold">{absensi.izin ?? 0} Hari</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Tanpa Keterangan</td>
                      <td className="py-[1.8mm] text-center border-r border-black font-bold">{absensi.alpa ?? 0} Hari</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section: KENAIKAN KELAS (Khusus Semester Genap) */}
              {isGenap && (
                <div className="mb-[5mm] text-[8.5pt] text-black">
                  <div className="font-bold text-[10pt] mb-[1.5mm]">
                    {showKokurikuler ? 'V' : 'IV'}. KENAIKAN KELAS
                  </div>
                  <div className="font-bold mb-[1mm]">Keputusan :</div>
                  <div className="mb-[1.5mm]">
                    Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ditetapkan
                  </div>
                  <div className="space-y-1">
                    <div className={isMenetap ? 'line-through text-slate-500' : 'font-bold'}>
                      {textNaik}
                    </div>
                    <div className={!isMenetap ? 'line-through text-slate-500' : 'font-bold'}>
                      {textTinggal}  *)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Blok Tanda Tangan 3 Pihak Menggunakan Universal Signature Engine */}
            <div className="mt-[4mm] pt-[2mm] w-full">
              <UniversalDocumentSignatures
                layout="triangle_rapor"
                tahunPelajaranId={activeTpId}
                semesterId={activeSemId}
                kelasId={(siswa as any)?.kelas_id}
                titimangsaCity={kota}
                titimangsaDate={dateStr}
                parentName={siswa?.nama_ayah || siswa?.nama_wali || '......................................................'}
                overrideSignerRight={{
                  personName: waliKelasNama,
                  nip: waliKelasNip,
                }}
                overrideSignerCenter={{
                  personName: kepalaSekolahNama,
                  nip: kepalaSekolahNip,
                }}
                fontFamilyClass="font-cambria"
                spacingHeightMm={18}
              />
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

RaporSemesterPrintModal.displayName = 'RaporSemesterPrintModal';
