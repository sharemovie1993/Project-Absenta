import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  usePrintHeaderData,
  normalizeStudentIdentity,
} from '@/components/ui/PrintHeader';
import { siswaApi } from '@/api/academic.api';
import { raporApi } from '@/api/rapor.api';
import { generateP5RaporPdf } from '@/utils/print/rapor/renderRaporP5';
import { formatIndoDate } from '@/utils/print/rapor/raporShared';
import { Loader2 } from 'lucide-react';
import type { LegerStudent } from './LegerStudentTable';

export interface P5PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  students?: LegerStudent[];
  onSelectStudent?: (student: LegerStudent) => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
}

// Fallback P5 metadata & dimensions matching official reference format
const DEFAULT_P5_PROJECT = {
  tema: 'Kewirausahaan',
  judul: 'Berwirausaha Dari Hasil Kebun Ibu',
  deskripsi: 'Mengembangkan Impian Peserta Didik SMK',
};

const DEFAULT_P5_DIMENSI = [
  {
    dimensi: 'Mandiri',
    sub_elements: [
      'Mengenali kualitas dan minat diri serta tantangan yang dihadapi & Mengembangkan refleksi diri',
      'Regulasi emosi, penetapan tujuan dan rencana strategis pengembangan diri dan prestasi serta memiliki inisiatif dan bekerja secara mandiri, mengembangkan kendali dan disiplin diri, percaya diri, resilien dan adaptif',
    ],
  },
  {
    dimensi: 'Kreatif',
    sub_elements: [
      'Menghasilkan gagasan yang beragam dan tepat sesuai dengan kebutuhan masyarakat terhadap sebuah permasalahan yang ada.',
      'Mengeksplorasi dan mengekspresikan pikiran dan perasaannya kedalam sebuah karya.',
      'Mampu mengevaluasi tindakan dan gagasan yang sudah dimiliki serta mengetahui kesesuaian dengan kebutuhan masyarakat umum',
    ],
  },
  {
    dimensi: 'Bergotong Royong',
    sub_elements: [
      'Kerjasama, komunikasi untuk mencapai tujuan Bersama, saling ketergantungan positif dan koordinasi sosial',
      'Tanggap terhadap lingkungan, persepsi sosial',
      'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.',
    ],
  },
];

const formatKualifikasi = (k?: string | null): string => {
  if (!k || k === 'FALSE') return '-';
  const upper = k.toUpperCase().trim();
  if (upper === 'SB') return 'Sangat Berkembang (SB)';
  if (upper === 'BSH') return 'Berkembang Sesuai Harapan (BSH)';
  if (upper === 'MB') return 'Mulai Berkembang (MB)';
  if (upper === 'BB') return 'Belum Berkembang (BB)';
  return k;
};

export const P5PrintModal: React.FC<P5PrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  tahunPelajaranId = '',
  semesterId = '',
  tahunPelajaranNama = '',
  semesterNama = '',
  kelasNama = '',
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Ambil data kop resmi sekolah & tenant
  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  const siswaId = selectedStudent?.id;

  // 1. Fetch Nilai P5 Siswa
  const { data: p5Res, isLoading: isLoadingP5 } = useQuery({
    queryKey: ['rapor-p5-nilai', siswaId],
    queryFn: () => raporApi.getP5Nilai({ siswa_id: siswaId }),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Projek P5 Rombel
  const { data: projekRes } = useQuery({
    queryKey: ['rapor-p5-projek', tahunPelajaranId, semesterId],
    queryFn: () => raporApi.getP5Projek({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    enabled: isOpen && Boolean(tahunPelajaranId && semesterId),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Detail Siswa
  const { data: siswaDetailRes, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['siswa-detail-p5', siswaId],
    queryFn: () => siswaApi.getById(siswaId!),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  // 4. Fetch Rapor Settings (untuk tanggal rapor P5)
  const { data: settingsRes } = useQuery({
    queryKey: ['rapor-settings-p5', tahunPelajaranId, semesterId],
    queryFn: () => raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    enabled: isOpen && Boolean(tahunPelajaranId && semesterId),
    staleTime: 5 * 60 * 1000,
  });

  const detailSiswa = siswaDetailRes?.data || null;
  const siswa = useMemo(() => {
    return {
      ...(selectedStudent || {}),
      ...(detailSiswa || {}),
    };
  }, [selectedStudent, detailSiswa]);

  const allP5: any[] = useMemo(() => {
    const raw = (p5Res as any)?.data || p5Res || [];
    return Array.isArray(raw) ? raw : [];
  }, [p5Res]);

  const projekList: any[] = useMemo(() => {
    const raw = (projekRes as any)?.data || projekRes || [];
    return Array.isArray(raw) ? raw : [];
  }, [projekRes]);

  const activeProjek = projekList.length > 0 ? projekList[0] : null;
  const settingsData = (settingsRes as any)?.data || settingsRes || null;

  // Index siswa untuk navigasi batch di header modal
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
    if (!siswaId || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { blobUrl, filename } = await generateP5RaporPdf({
        siswaId,
        tahunPelajaranId,
        semesterId,
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
      console.error('[P5PrintModal] Gagal mengunduh PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama, semesterNama, isExportingPdf]);

  // Metadata Format (Universal Academic Identity Engine) - Diposisikan sebelum early return mematuhi Rules of Hooks
  const normalizedStudent = useMemo(
    () => normalizeStudentIdentity(siswa || {}),
    [siswa]
  );

  if (!isOpen || !selectedStudent) return null;
  const namaSiswa = (normalizedStudent.nama || '-').toUpperCase();
  const nis = normalizedStudent.nis || '-';
  const nisn = normalizedStudent.nisn || '-';
  const klsText = normalizedStudent.namaKelas || siswa.kelas || siswa.nama_kelas || siswa.kelas_nama || kelasNama || '-';
  const semText = semesterNama || 'Ganjil';
  const tingkatNum = Number(normalizedStudent.tingkat || 10);
  const faseText = (siswa as any)?.fase || (tingkatNum === 10 ? 'E' : 'F');
  const namaSekolah = (rawSekolah?.nama || tenantInfo?.name || 'SMKN 1 PLERED').toUpperCase();

  const programKeahlian = normalizedStudent.programKeahlian || tenantInfo?.program_keahlian || '-';
  const konsentrasiKeahlian = normalizedStudent.konsentrasiKeahlian || normalizedStudent.namaJurusan || programKeahlian;

  const firstP5 = allP5?.[0];
  const temaProjek = activeProjek?.tema || firstP5?.Projek?.tema || firstP5?.projek_tema || DEFAULT_P5_PROJECT.tema;
  const judulProjek = activeProjek?.judul || firstP5?.Projek?.judul || firstP5?.projek_judul || DEFAULT_P5_PROJECT.judul;
  const deskripsiProjek = activeProjek?.deskripsi || firstP5?.Projek?.deskripsi || DEFAULT_P5_PROJECT.deskripsi;

  // Grouping Dimensi & Sub Elemen
  const dimensimap = new Map<string, { subElements: string[]; kualifikasi?: string; catatan?: string }>();

  if (allP5 && allP5.length > 0) {
    allP5.forEach((p: any) => {
      const dimName = (p.dimensi || 'Dimensi').trim();
      if (!dimensimap.has(dimName)) {
        dimensimap.set(dimName, {
          subElements: [],
          kualifikasi: p.kualifikasi,
          catatan: p.catatan_proses,
        });
      }
      const existing = dimensimap.get(dimName)!;
      if (p.sub_elemen && !existing.subElements.includes(p.sub_elemen)) {
        existing.subElements.push(p.sub_elemen);
      }
      if (!existing.kualifikasi && p.kualifikasi) existing.kualifikasi = p.kualifikasi;
      if (!existing.catatan && p.catatan_proses) existing.catatan = p.catatan_proses;
    });
  }

  // Data Tabel Siap Render
  const renderedDimensions = dimensimap.size > 0
    ? Array.from(dimensimap.entries()).map(([dimName, data]) => ({
        dimensi: dimName,
        subElements: data.subElements.length > 0 ? data.subElements : ['Telah melaksanakan rangkaian projek profil pelajar Pancasila.'],
        kualifikasi: formatKualifikasi(data.kualifikasi),
        catatan: data.catatan && data.catatan !== 'FALSE' ? data.catatan : '-',
      }))
    : DEFAULT_P5_DIMENSI.map((d) => ({
        dimensi: d.dimensi,
        subElements: d.sub_elements,
        kualifikasi: '-',
        catatan: '-',
      }));

  // Signatures Data
  const effectiveKota = (rawSekolah as any)?.kota || tenantInfo?.city || 'Purwakarta';
  const isGenap = Boolean(semText.toLowerCase().includes('genap') || semText.includes('2'));
  let effectiveDateVal = settingsData?.tanggal_rapor_p5 || settingsData?.tanggal_rapor;
  if (!effectiveDateVal) {
    const matchYear = String(tahunPelajaranNama || '').match(/^(\d{4})/);
    const parsedStartYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    effectiveDateVal = isGenap ? `${parsedStartYear + 1}-06-24` : `${parsedStartYear}-12-22`;
  }
  const dateParts = String(effectiveDateVal).split('-');
  let dateStr = '';
  if (dateParts.length === 3) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    dateStr = `${parseInt(dateParts[2], 10)} ${months[parseInt(dateParts[1], 10) - 1]} ${dateParts[0]}`;
  } else {
    dateStr = formatIndoDate(new Date());
  }

  const kepalaSekolahNama = (rawSekolah as any)?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = (rawSekolah as any)?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const walasNama = siswa?.walas_nama || siswa?.walas?.nama || (siswa.kelas_detail?.wali_kelas?.nama) || tenantInfo?.walas_nama || 'HERI JUNAEDI, S.E.';
  const walasNip = siswa?.walas_nip || siswa?.walas?.nip || (siswa.kelas_detail?.wali_kelas?.nip) || tenantInfo?.walas_nip || '196907222025211018';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Rapor Projek Penguatan Profil Pelajar Pancasila (P5)"
      subtitle={`${siswa.nama_siswa || 'Siswa'} (NIS: ${siswa.nis || '-'}) • ${klsText}`}
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
        {(isLoadingP5 || isLoadingSiswa) && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 w-full max-w-[210mm]">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Memuat data penilaian projek P5 siswa...</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR RAPOR PROJEK P5 RESMI (A4 PORTRAIT)                   */}
        {/* Format & Tipografi Persis Sesuai renderOfficialP5Page         */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '17mm 14mm 14mm 14mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* 1. Header Judul (Helvetica 11.5pt Bold) */}
              <div className="text-center mb-[4mm]">
                <h1 className="font-bold text-[11.5pt] text-black tracking-[0.2px] uppercase">
                  PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)
                </h1>
              </div>

              {/* 2. Metadata Grid (Sesuai autoTable metadata) */}
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
                      <td className="py-[0.8mm] text-left">Nama Peserta Didik</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left font-bold truncate">{namaSiswa}</td>
                      <td className="py-[0.8mm] text-left">Fase</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">{faseText}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">NIS/NISN</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">{nis} / {nisn}</td>
                      <td className="py-[0.8mm] text-left">Satuan Pendidikan</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left truncate">{namaSekolah}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Kelas</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">{klsText}</td>
                      <td className="py-[0.8mm] text-left">Program Keahlian</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left truncate">{programKeahlian}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Semester</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left">{semText}</td>
                      <td className="py-[0.8mm] text-left">Konsentrasi Keahlian</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td className="py-[0.8mm] text-left truncate">{konsentrasiKeahlian}</td>
                    </tr>
                    {/* Spasi Pemisah */}
                    <tr>
                      <td colSpan={6} className="py-[1mm]" />
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Tema Projek</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left">{temaProjek}</td>
                    </tr>
                    <tr>
                      <td className="py-[0.8mm] text-left">Judul Projek</td>
                      <td className="py-[0.8mm] text-center">:</td>
                      <td colSpan={4} className="py-[0.8mm] text-left font-bold">{judulProjek}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Tabel Matriks Penilaian Capaian Projek P5 */}
              <div className="w-full">
                <table className="w-full table-fixed border-collapse border border-black text-[7.5pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[110mm]" />
                    <col className="w-[36mm]" />
                    <col className="w-[36mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#d9d9d9] border-b border-black font-bold">
                      <th className="py-[2mm] px-[2.5mm] text-left border-r border-black align-middle font-bold text-black">
                        {deskripsiProjek}
                      </th>
                      <th colSpan={2} className="py-[2mm] px-[2mm] text-center align-middle font-bold text-black">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderedDimensions.map((dim, dIdx) => (
                      <React.Fragment key={`dim-${dIdx}`}>
                        {/* Baris Judul Dimensi */}
                        <tr className="border-t border-b border-black bg-white">
                          <td colSpan={3} className="py-[1.8mm] px-[2.5mm] font-bold text-left text-black">
                            {dim.dimensi}
                          </td>
                        </tr>

                        {/* Baris Sub Elemen */}
                        {dim.subElements.map((sub, sIdx) => {
                          const letter = String.fromCharCode(97 + sIdx);
                          const isFirst = sIdx === 0;

                          return (
                            <tr key={`dim-${dIdx}-sub-${sIdx}`} className="border-b border-black">
                              {/* Kolom Sub Elemen */}
                              <td className="py-[2mm] px-[2.5mm] text-left align-top border-r border-black">
                                <div className="flex items-start gap-1.5">
                                  <span className="font-bold min-w-[3mm]">{letter}.</span>
                                  <span className="text-justify">{sub}</span>
                                </div>
                              </td>

                              {/* Kolom Kualifikasi (RowSpan) */}
                              {isFirst && (
                                <td
                                  rowSpan={dim.subElements.length}
                                  className="py-[2mm] px-[2mm] text-center align-middle border-r border-black font-normal"
                                >
                                  {dim.kualifikasi}
                                </td>
                              )}

                              {/* Kolom Catatan Proses (RowSpan) */}
                              {isFirst && (
                                <td
                                  rowSpan={dim.subElements.length}
                                  className="py-[2mm] px-[2.5mm] text-center align-middle font-normal"
                                >
                                  {dim.catatan}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Blok Tanda Tangan 3 Pihak Menggunakan Universal Signature Engine */}
            <div className="mt-[6mm] pt-[2mm] w-full">
              <UniversalDocumentSignatures
                layout="triangle_rapor"
                tahunPelajaranId={tahunPelajaranId}
                semesterId={semesterId}
                kelasId={(siswa as any)?.kelas_id}
                titimangsaCity={effectiveKota}
                titimangsaDate={dateStr}
                parentName={siswa?.nama_ayah || siswa?.nama_wali || '....................................................'}
                overrideSignerRight={{
                  personName: walasNama,
                  nip: walasNip,
                }}
                overrideSignerCenter={{
                  personName: kepalaSekolahNama,
                  nip: kepalaSekolahNip,
                }}
                fontFamilyClass="font-cambria"
                spacingHeightMm={20}
              />
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

P5PrintModal.displayName = 'P5PrintModal';
