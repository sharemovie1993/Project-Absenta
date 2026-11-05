import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { hubinApi } from '@/api/hubin.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getMyTenant } from '@/api/tenants.api';
import { generateRaporPklSinglePdf, type RaporPklItemData } from '@/utils/print/modules/pdfRaporPkl';
import { formatTanggalIndonesia } from '@/utils/print/modules/pdfSertifikatPkl';
import { useAuthStore } from '@/store/authStore';
import { useWaliKelasOptions } from '@/hooks/useWaliKelasOptions';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LegerStudent } from './LegerStudentTable';

export interface RaporPklPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  students?: LegerStudent[];
  onSelectStudent?: (student: LegerStudent) => void;
  selectedKelas?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
}

export const RaporPklPrintModal: React.FC<RaporPklPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  selectedKelas = '',
  tahunPelajaranId = '',
  semesterId = '',
  tahunPelajaranNama = '',
  semesterNama = '',
  waliKelasNama: propWaliKelasNama,
  waliKelasNip: propWaliKelasNip,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const { rawList: allWaliKelas } = useWaliKelasOptions({ onlyActive: true });

  const siswaId = selectedStudent?.id;

  // 1. Fetch Data Penempatan Siswa dari Hubin
  const { data: penempatanRes, isLoading: isLoadingPenempatan } = useQuery({
    queryKey: ['hubin-penempatan-student-pkl', siswaId, selectedKelas, tahunPelajaranId],
    queryFn: () =>
      hubinApi.getPenempatan({
        search: selectedStudent?.nis || selectedStudent?.nama_siswa,
        kelas_id: selectedKelas,
        tahun_pelajaran_id: tahunPelajaranId,
        limit: 10,
      }),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  // Ambil record placement siswa yang sesuai
  const placement = useMemo(() => {
    const raw = (penempatanRes as any)?.list || (Array.isArray((penempatanRes as any)?.data) ? (penempatanRes as any).data : (penempatanRes as any)?.data?.list) || [];
    const list = Array.isArray(raw) ? raw : [];
    return list.find(
      (p: any) =>
        p.siswa_id === siswaId ||
        p.Siswa?.id === siswaId ||
        p.Siswa?.nis === selectedStudent?.nis
    ) || null;
  }, [penempatanRes, siswaId, selectedStudent]);

  // Resolusi Wali Kelas Siswa Terkait
  const targetKelasId = selectedKelas || (placement as any)?.Siswa?.kelas_id || (selectedStudent as any)?.kelas_id;
  const matchedWalas = useMemo(() => {
    if (!targetKelasId || !allWaliKelas?.length) return null;
    return allWaliKelas.find((w) => w.kelas_id === targetKelasId);
  }, [targetKelasId, allWaliKelas]);

  const cleanNip = useCallback((nip?: string | null) => {
    if (!nip || nip === '-' || nip.trim() === '') return '-';
    return nip.replace(/^NIP\.?\s*/i, '').trim();
  }, []);

  const resolvedWalas = useMemo(() => {
    // Priority 1: Prop passed from parent (mis. dari Leger backend)
    if (propWaliKelasNama && propWaliKelasNama !== 'Wali Kelas') {
      return {
        nama: propWaliKelasNama,
        nip: cleanNip(propWaliKelasNip),
      };
    }

    // Priority 2: Dari master struktur penugasan Wali Kelas
    if (matchedWalas) {
      const nama = matchedWalas.Guru?.nama_guru || (matchedWalas as any)?.User?.Guru?.nama_guru || (matchedWalas as any)?.User?.full_name;
      const nip = matchedWalas.Guru?.nip || (matchedWalas as any)?.User?.Guru?.nip || '-';
      if (nama) {
        return {
          nama,
          nip: cleanNip(nip),
        };
      }
    }

    // Priority 3: Dari current logged in user (jika yang membuka adalah walas rombel ini)
    const userRole = (currentUser as any)?.role;
    const userKelas = (currentUser as any)?.walikelas_kelas || (currentUser as any)?.kelas_id;
    if (userRole === 'wali_kelas' || userKelas === targetKelasId) {
      const nama = (currentUser as any)?.guru_profile?.nama_guru || (currentUser as any)?.nama || (currentUser as any)?.name || (currentUser as any)?.full_name;
      const nip = (currentUser as any)?.guru_profile?.nip || (currentUser as any)?.nip || '-';
      if (nama && nama !== 'Wali Kelas') {
        return {
          nama,
          nip: cleanNip(nip),
        };
      }
    }

    // Priority 4: Fallback
    return {
      nama: (currentUser as any)?.nama || (currentUser as any)?.name || 'Wali Kelas',
      nip: cleanNip((currentUser as any)?.nip),
    };
  }, [propWaliKelasNama, propWaliKelasNip, matchedWalas, currentUser, targetKelasId, cleanNip]);

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

  // Susun data item rapor PKL
  const raporItem: RaporPklItemData | null = useMemo(() => {
    if (!selectedStudent) return null;

    const tMulai = placement?.tanggal_mulai;
    const tSelesai = placement?.tanggal_selesai;

    return {
      siswa: {
        id: selectedStudent.id,
        nama_siswa: selectedStudent.nama_siswa,
        nis: selectedStudent.nis || placement?.Siswa?.nis || '-',
        nisn: placement?.Siswa?.nisn || '-',
        nama_kelas: selectedStudent.nama_kelas || placement?.Siswa?.Kelas?.nama_kelas || '-',
        program_keahlian: placement?.Siswa?.Jurusan?.ProgramKeahlian?.nama || 'Teknik Kejuruan',
        konsentrasi_keahlian: placement?.Siswa?.Jurusan?.nama || selectedStudent.nama_kelas || '-',
      },
      pkl: {
        mitra_nama: placement?.Mitra?.nama || placement?.mitra_nama || 'DUDI MITRA',
        mitra_alamat: placement?.alamat_dudi || placement?.Mitra?.alamat || '',
        tanggal_mulai: tMulai,
        tanggal_selesai: tSelesai,
        instruktur_nama: placement?.instruktur_nama || placement?.Mitra?.pic_nama || placement?.penanggung_jawab_nama || '-',
        pembimbing_nama: placement?.Pembimbing?.nama_guru || placement?.Pembimbing?.nama || 'Guru Pembimbing',
        pembimbing_nip: placement?.Pembimbing?.nip || '-',
        catatan_pkl: placement?.catatan_pkl || 'Rajin dan bertanggung jawab dalam praktek',
        deskripsi_tp: placement?.deskripsi_tp || '',
        sakit_pkl: placement?.sakit_pkl ?? (selectedStudent.sakit ?? 0),
        izin_pkl: placement?.izin_pkl ?? (selectedStudent.izin ?? 0),
        alpa_pkl: placement?.alpa_pkl ?? (selectedStudent.alpa ?? 0),
      },
      penilaian: {
        hard_kompetensi_teknis: placement?.hard_kompetensi_teknis ?? 88,
        hard_sop_k3lh: placement?.hard_sop_k3lh ?? 89,
        hard_alur_bisnis: placement?.hard_alur_bisnis ?? 87,
        soft_kedisiplinan: placement?.soft_kedisiplinan ?? 83,
        soft_kerajinan_inisiatif: placement?.soft_kerajinan_inisiatif ?? 84,
        soft_kerjasama: placement?.soft_kerjasama ?? 86,
        soft_kejujuran: placement?.soft_kejujuran ?? 88,
        soft_tanggung_jawab: placement?.soft_tanggung_jawab ?? 85,
        nilai_akhir_pkl: placement?.nilai_akhir_pkl ?? null,
        predikat_pkl: placement?.predikat_pkl || null,
      },
      sekolah: {
        nama: rawSekolah?.nama || tenantInfo?.name || 'SMK NEGERI 1 PLERED',
        kota: (rawSekolah as any)?.kota || tenantInfo?.city || 'Purwakarta',
        kepala_sekolah: (rawSekolah as any)?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.',
        nip_kepala: (rawSekolah as any)?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001',
      },
      wali_kelas: {
        nama: resolvedWalas.nama,
        nip: resolvedWalas.nip,
      },
      tahun_pelajaran: tahunPelajaranNama || '2025 / 2026',
      semester: semesterNama || 'Ganjil',
      tanggal_terbit: formatTanggalIndonesia(new Date()),
    };
  }, [selectedStudent, placement, rawSekolah, tenantInfo, resolvedWalas, tahunPelajaranNama, semesterNama]);

  // Handler Download PDF Resmi
  const handleDownloadPdf = useCallback(async () => {
    if (!raporItem || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { blobUrl, filename } = await generateRaporPklSinglePdf(raporItem);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('[RaporPklPrintModal] Gagal mengunduh PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [raporItem, isExportingPdf]);

  if (!isOpen || !selectedStudent) return null;

  // Skor & Deskripsi Capaian
  const p = raporItem?.penilaian;
  const softScores = [
    p?.soft_kedisiplinan,
    p?.soft_kerajinan_inisiatif,
    p?.soft_kerjasama,
    p?.soft_kejujuran,
    p?.soft_tanggung_jawab,
  ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const avgSoftSkill = softScores.length > 0
    ? Math.round(softScores.reduce((a, b) => a + b, 0) / softScores.length)
    : 85;

  const skorK3lh = Math.round(p?.hard_sop_k3lh ?? 89);
  const skorTeknis = Math.round(p?.hard_kompetensi_teknis ?? 88);
  const skorAlurBisnis = Math.round(p?.hard_alur_bisnis ?? 87);

  const tglMulaiStr = raporItem?.pkl.tanggal_mulai ? formatTanggalIndonesia(raporItem.pkl.tanggal_mulai) : '-';
  const tglSelesaiStr = raporItem?.pkl.tanggal_selesai ? formatTanggalIndonesia(raporItem.pkl.tanggal_selesai) : '-';

  const deskripsiSoftSkill =
    'Peserta didik sudah memiliki soft skill sesuai harapan dalam melaksanakan komunikasi telepon sesuai kaidah, memiliki etos kerja, menunjukan kemandirian, menunjukan kerjasama namun masih perlu di tingkatkan dalam hal, menunjukan integritas (antara lain jujur, disiplin,komitmen dan tanggung jawab), menunjukan kepedulian sosial dan lingkungan';

  const deskripsiK3lh =
    'Peserta didik sudah memiliki soft skill sesuai harapan dalam melaksanakan pekerjaan sesuai POS namun masih perlu ditingkatkan dalam hal, menggunakan APD dengan tertib dan benar';

  const hasCustomTp = Boolean(raporItem?.pkl.deskripsi_tp?.trim());
  const deskripsiTeknis = hasCustomTp
    ? raporItem!.pkl.deskripsi_tp!.trim()
    : '[Tujuan Pembelajaran belum dirumuskan oleh Ketua Program Keahlian untuk tahun ajaran aktif]';

  const deskripsiAlurBisnis =
    'Peserta didik telah mampu membekali kemandiriannya dengan menguasai dan menjelaskan rencana usaha yang akan dilaksanakan namun masih perlu bimbingan dalam mengidentifikasi kegiatan usaha di tempat kerja';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Rapor Praktik Kerja Lapangan (PKL)"
      subtitle={`${selectedStudent.nama_siswa} (NIS: ${selectedStudent.nis || '-'}) • ${selectedStudent.nama_kelas || '-'}`}
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
        {isLoadingPenempatan && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 w-full max-w-[210mm]">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Memuat data penempatan dan penilaian PKL dari modul Hubin...</span>
          </div>
        )}

        {!isLoadingPenempatan && !placement && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 w-full max-w-[210mm]">
            <AlertCircle size={16} className="shrink-0" />
            <span>Siswa belum memiliki data penempatan PKL resmi di modul Hubin. Pratinjau menampilkan estimasi format standar.</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 1: CAPAIAN KOMPETENSI PKL (A4 PORTRAIT)                */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '18mm 16mm 14mm 16mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Header Judul Rapor */}
              <div className="text-center mb-[4mm]">
                <h1 className="font-bold text-[11pt] text-black tracking-[0.2px] uppercase">
                  {raporItem?.sekolah.nama || 'SMK NEGERI 1 PLERED'}
                </h1>
                <h2 className="font-bold text-[11pt] text-black tracking-[0.2px] uppercase">
                  TAHUN AJARAN {raporItem?.tahun_pelajaran?.toUpperCase() || '2025 / 2026'}
                </h2>
              </div>

              {/* Identitas Siswa & PKL */}
              <div className="w-full mb-[3.5mm] text-[8.5pt] leading-tight text-black">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[36mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[60mm]" />
                    <col className="w-[30mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[44mm]" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="py-[0.8mm] text-left">Nama Peserta Didik</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left font-bold uppercase truncate">
                        {raporItem?.siswa.nama_siswa}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">NISN</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.siswa.nisn || raporItem?.siswa.nis || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Kelas</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.siswa.nama_kelas || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Program Keahlian</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.siswa.program_keahlian || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Konsentrasi Keahlian</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.siswa.konsentrasi_keahlian || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Tempat PKL</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left font-bold uppercase truncate">
                        {raporItem?.pkl.mitra_nama}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Tanggal PKL</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">
                        Mulai : {tglMulaiStr}
                      </td>
                      <td colSpan={3} className="py-[0.8mm] text-left">
                        Selesai : {tglSelesaiStr}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Nama Instruktur</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.pkl.instruktur_nama || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Nama Pembimbing</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">
                        {raporItem?.pkl.pembimbing_nama || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Capaian Penilaian */}
              <div className="w-full mb-[3.5mm]">
                <table className="w-full table-fixed border-collapse border border-black text-[8pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[55mm]" />
                    <col className="w-[14mm]" />
                    <col className="w-[109mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#d2d2d2] border-b border-black font-bold">
                      <th className="py-[2mm] px-[2.5mm] text-center border-r border-black align-middle font-bold text-black">
                        Tujuan Pembelajaran
                      </th>
                      <th className="py-[2mm] text-center border-r border-black align-middle font-bold text-black">
                        Skor
                      </th>
                      <th className="py-[2mm] px-[2.5mm] text-center align-middle font-bold text-black">
                        Deskripsi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="py-[2.5mm] px-[2.5mm] text-left align-middle border-r border-black">
                        Menerapkan soft skill yang dibutuhkan dalam dunia kerja (tempat PKL)
                      </td>
                      <td className="py-[2.5mm] text-center align-middle border-r border-black font-bold">
                        {avgSoftSkill}
                      </td>
                      <td className="py-[2.5mm] px-[2.5mm] text-justify align-middle leading-normal">
                        {deskripsiSoftSkill}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[2.5mm] px-[2.5mm] text-left align-middle border-r border-black">
                        Menerapkan norma, POS dan K3LH yang ada pada dunia Kerja (Tempat PKL)
                      </td>
                      <td className="py-[2.5mm] text-center align-middle border-r border-black font-bold">
                        {skorK3lh}
                      </td>
                      <td className="py-[2.5mm] px-[2.5mm] text-justify align-middle leading-normal">
                        {deskripsiK3lh}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[2.5mm] px-[2.5mm] text-left align-middle border-r border-black">
                        Menerapkan Kompetensi teknis yang sudah dipelajari di sekolah dan/atau baru di pelajari pada dunia kerja (tempat PKL)
                      </td>
                      <td className="py-[2.5mm] text-center align-middle border-r border-black font-bold">
                        {skorTeknis}
                      </td>
                      <td
                        className={cn(
                          'py-[2.5mm] px-[2.5mm] align-middle leading-normal',
                          hasCustomTp
                            ? 'text-justify text-black'
                            : 'text-left text-[#dc2626] italic font-medium'
                        )}
                      >
                        {deskripsiTeknis}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[2.5mm] px-[2.5mm] text-left align-middle border-r border-black">
                        Memahami alur bisnis dunia kerja tempat PKL
                      </td>
                      <td className="py-[2.5mm] text-center align-middle border-r border-black font-bold">
                        {skorAlurBisnis}
                      </td>
                      <td className="py-[2.5mm] px-[2.5mm] text-justify align-middle leading-normal">
                        {deskripsiAlurBisnis}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Kotak Catatan Pembimbing */}
              <div className="w-full border border-black p-2.5 text-[8.5pt] leading-normal mb-[4mm]">
                <div className="font-bold mb-1">Catatan :</div>
                <div className="text-justify">{raporItem?.pkl.catatan_pkl}</div>
              </div>
            </div>

            {/* Tanda Tangan Guru Pembimbing (Kiri Bawah) */}
            <div className="w-full text-[8.5pt] leading-[1.3] text-black">
              <div className="w-[60mm] text-left">
                <div>Guru Pembimbing,</div>
                <div className="h-[20mm]" />
                <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2 inline-block">
                  {raporItem?.pkl.pembimbing_nama || 'Guru Pembimbing'}
                </div>
                <div>NIP. {raporItem?.pkl.pembimbing_nip || '-'}</div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: REKAP PRESENSI & PENGESAHAN 3 PIHAK (A4 PORTRAIT)   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '18mm 16mm 14mm 16mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Identitas Singkat Siswa */}
              <div className="w-full mb-[5mm] text-[8.5pt] leading-tight text-black">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[36mm]" />
                    <col className="w-[4mm]" />
                    <col className="w-[138mm]" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="py-[0.8mm] text-left">Nama Peserta Didik</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left font-bold uppercase truncate">
                        {raporItem?.siswa.nama_siswa}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">NISN</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">
                        {raporItem?.siswa.nisn || raporItem?.siswa.nis || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Kelas</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">
                        {raporItem?.siswa.nama_kelas || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Tahun Pelajaran</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">
                        {raporItem?.tahun_pelajaran || '2025 / 2026'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Semester</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">
                        {raporItem?.semester || 'Ganjil'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Ketidakhadiran */}
              <div className="w-[67mm] mb-[6mm]">
                <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[35mm]" />
                    <col className="w-[6mm]" />
                    <col className="w-[26mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#d2d2d2] border-b border-black font-bold">
                      <th colSpan={3} className="py-[1.8mm] text-center font-bold text-black">
                        Ketidakhadiran
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Sakit</td>
                      <td className="py-[1.8mm] text-center border-r border-black">:</td>
                      <td className="py-[1.8mm] text-center font-bold">
                        {raporItem?.pkl.sakit_pkl ? `${raporItem.pkl.sakit_pkl} hari` : '- hari'}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Izin</td>
                      <td className="py-[1.8mm] text-center border-r border-black">:</td>
                      <td className="py-[1.8mm] text-center font-bold">
                        {raporItem?.pkl.izin_pkl ? `${raporItem.pkl.izin_pkl} hari` : '- hari'}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.8mm] px-[2.5mm] text-left border-r border-black">Tanpa Keterangan</td>
                      <td className="py-[1.8mm] text-center border-r border-black">:</td>
                      <td className="py-[1.8mm] text-center font-bold">
                        {raporItem?.pkl.alpa_pkl ? `${raporItem.pkl.alpa_pkl} hari` : '- hari'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pengesahan 3 Pihak */}
            <div className="w-full text-[8.5pt] leading-[1.3] text-black">
              {/* Baris Atas: Orang Tua & Wali Kelas */}
              <div className="flex justify-between items-start px-[2mm]">
                <div className="w-[50mm] text-left">
                  <div>Orang Tua/Wali</div>
                  <div className="h-[20mm]" />
                  <div className="tracking-widest">..................................................</div>
                </div>

                <div className="w-[60mm] text-left">
                  <div>{raporItem?.sekolah.kota}, {raporItem?.tanggal_terbit}</div>
                  <div>Wali Kelas,</div>
                  <div className="h-[20mm]" />
                  <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2 inline-block">
                    {raporItem?.wali_kelas?.nama || 'Wali Kelas'}
                  </div>
                  <div>
                    {raporItem?.wali_kelas?.nip && raporItem?.wali_kelas?.nip !== '-'
                      ? `NIP. ${raporItem.wali_kelas.nip}`
                      : 'NIP. -'}
                  </div>
                </div>
              </div>

              {/* Baris Bawah: Mengetahui Kepala Sekolah (Tengah) */}
              <div className="mt-[6mm] flex flex-col items-center justify-center text-center">
                <div>Mengetahui</div>
                <div>Kepala Sekolah,</div>
                <div className="h-[20mm]" />
                <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2 inline-block">
                  {raporItem?.sekolah.kepala_sekolah}
                </div>
                <div>NIP. {raporItem?.sekolah.nip_kepala}</div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

RaporPklPrintModal.displayName = 'RaporPklPrintModal';
