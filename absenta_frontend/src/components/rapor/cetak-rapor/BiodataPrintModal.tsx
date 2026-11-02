import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { siswaApi } from '@/api/academic.api';
import { generateBiodataSiswaPdf } from '@/utils/print/rapor/renderBiodata';
import { Loader2 } from 'lucide-react';
import type { LegerStudent } from './LegerStudentTable';

export interface BiodataPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: LegerStudent | null;
  students?: LegerStudent[];
  onSelectStudent?: (student: LegerStudent) => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

function formatIndoDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

function formatAnakKe(val: any): string {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (!isNaN(num) && num > 0) return `${num} (satu/dua/tiga/...)`;
  return String(val);
}

export const BiodataPrintModal: React.FC<BiodataPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  tahunPelajaranId,
  semesterId,
  tahunPelajaranNama,
  semesterNama,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  // Ambil data kop resmi sekolah & tenant
  const {
    tenantInfo,
    logoDaerahBase64,
    logoSekolahBase64,
    rawSekolah,
  } = usePrintHeaderData();

  // Query detail siswa (17 butir lengkap)
  const siswaId = selectedStudent?.id;
  const { data: siswaDetailRes, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['siswa-detail-biodata', siswaId],
    queryFn: () => siswaApi.getById(siswaId!),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  const detailSiswa = siswaDetailRes?.data || null;

  // Gabungkan data ringkas student dengan detail lengkap
  const siswa = useMemo(() => {
    return {
      ...(selectedStudent || {}),
      ...(detailSiswa || {}),
    };
  }, [selectedStudent, detailSiswa]);

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

  // Handler Download PDF resmi
  const handleDownloadPdf = useCallback(async () => {
    if (!siswaId || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { blobUrl, filename } = await generateBiodataSiswaPdf({
        siswaId,
        tahunPelajaranId,
        semesterId,
      });
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('[BiodataPrintModal] Gagal mengunduh PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [siswaId, tahunPelajaranId, semesterId, isExportingPdf]);

  if (!isOpen || !selectedStudent) return null;

  // Nama Sekolah & Pejabat
  const namaSekolah = tenantInfo.name || (rawSekolah as any)?.nama_sekolah || 'SMK NEGERI 1 PLERED';
  const kota = (rawSekolah as any)?.kota || tenantInfo.city || 'Purwakarta';
  const kepalaSekolahNama = (rawSekolah as any)?.kepala_sekolah || tenantInfo.kepala_sekolah || 'Kepala Sekolah';
  const kepalaSekolahNip = (rawSekolah as any)?.nip_kepala_sekolah || tenantInfo.nip_kepala_sekolah || '-';
  const titimangsa = `${kota}, ${formatIndoDate(new Date())}`;

  // Field values 17 butir
  const jk = (siswa.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan';
  const ttl = `${siswa.tempat_lahir || '-'}, ${formatIndoDate(siswa.tanggal_lahir)}`;
  const alamatSiswa = [siswa.alamat, siswa.dusun, siswa.rt ? `RT ${siswa.rt}` : '', siswa.rw ? `RW ${siswa.rw}` : '', siswa.kelurahan, siswa.kecamatan, siswa.kabupaten]
    .filter(Boolean)
    .join(', ') || '-';
  const alamatOrtu = [siswa.alamat_ortu || siswa.alamat, siswa.dusun_ortu || siswa.dusun, siswa.kelurahan_ortu || siswa.kelurahan, siswa.kecamatan_ortu || siswa.kecamatan, siswa.kabupaten_ortu || siswa.kabupaten]
    .filter(Boolean)
    .join(', ') || alamatSiswa;

  const butirItems: Array<[string, string, string, string]> = [
    ['1.', 'Nama Peserta Didik Lengkap', ':', (siswa.nama_siswa || siswa.nama || '-').toUpperCase()],
    ['2.', 'Nomor Induk Siswa / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['3.', 'Tempat, Tanggal Lahir', ':', ttl],
    ['4.', 'Jenis Kelamin', ':', jk],
    ['5.', 'Agama / Kepercayaan', ':', siswa.agama || '-'],
    ['6.', 'Status dalam Keluarga', ':', siswa.status_dalam_keluarga || 'Anak Kandung'],
    ['7.', 'Anak ke-', ':', formatAnakKe(siswa.anak_ke)],
    ['8.', 'Alamat Peserta Didik', ':', alamatSiswa],
    ['9.', 'Nomor Telepon Rumah / HP', ':', siswa.no_hp || siswa.no_telepon || '-'],
    ['10.', 'Sekolah Asal (SMP/MTs)', ':', siswa.sekolah_asal || '-'],
    ['11.', 'Diterima di sekolah ini', '', ''],
    ['', 'a. Di kelas', ':', siswa.kelas_awal || siswa.nama_kelas || siswa.kelas || '-'],
    ['', 'b. Pada tanggal', ':', formatIndoDate(siswa.tanggal_masuk || siswa.created_at)],
    ['12.', 'Nama Orang Tua', '', ''],
    ['', 'a. Ayah', ':', siswa.nama_ayah || '-'],
    ['', 'b. Ibu', ':', siswa.nama_ibu || '-'],
    ['13.', 'Alamat Orang Tua', ':', alamatOrtu],
    ['', 'Nomor Telepon Rumah / HP', ':', siswa.no_hp_ayah || siswa.no_hp_ibu || siswa.no_hp || '-'],
    ['14.', 'Pekerjaan Orang Tua', '', ''],
    ['', 'a. Ayah', ':', siswa.pekerjaan_ayah || '-'],
    ['', 'b. Ibu', ':', siswa.pekerjaan_ibu || '-'],
    ['15.', 'Nama Wali Peserta Didik', ':', siswa.nama_wali || '-'],
    ['16.', 'Alamat Wali Peserta Didik', ':', siswa.alamat_wali || '-'],
    ['', 'Nomor Telepon Rumah / HP', ':', siswa.no_hp_wali || '-'],
    ['17.', 'Pekerjaan Wali Peserta Didik', ':', siswa.pekerjaan_wali || '-'],
  ];

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Sampul & Biodata Siswa"
      subtitle={`${siswa.nama_siswa || 'Siswa'} (NIS: ${siswa.nis || '-'}) • ${siswa.nama_kelas || 'Kelas'}`}
      orientation="portrait"
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
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
        {isLoadingDetail && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 w-full max-w-[210mm]">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Memuat rincian data diri dan keluarga dari database...</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 1: SAMPUL / COVER RESMI RAPOR (A4 PORTRAIT)           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={2}
          footerText="Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI"
          className="bg-white text-black font-serif print:shadow-none"
        >
          <div className="w-full h-full flex flex-col justify-between items-center text-center py-6 px-10 select-none">
            {/* 1. Logo Daerah / Yayasan Bagian Atas */}
            <div className="flex flex-col items-center">
              <div className="h-28 flex items-center justify-center">
                {showLogoDaerah && logoDaerahBase64 ? (
                  <img
                    src={logoDaerahBase64}
                    alt="Logo Daerah"
                    className="max-h-24 w-auto object-contain"
                  />
                ) : (
                  <div className="w-20 h-24 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    Logo Daerah
                  </div>
                )}
              </div>

              {/* Judul Dokumen & Jenjang */}
              <div className="mt-6 space-y-1">
                <h1 className="text-xl font-bold tracking-wider text-black">
                  RAPOR PESERTA DIDIK
                </h1>
                <h2 className="text-lg font-bold tracking-wide text-black uppercase">
                  {namaSekolah}
                </h2>
              </div>
            </div>

            {/* 2. Logo Sekolah Bagian Tengah */}
            <div className="my-6 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full flex items-center justify-center">
                {showLogoSekolah && logoSekolahBase64 ? (
                  <img
                    src={logoSekolahBase64}
                    alt="Logo Sekolah"
                    className="max-h-28 max-w-28 object-contain"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-sans">
                    Logo Sekolah
                  </div>
                )}
              </div>
            </div>

            {/* 3. Kotak Nama Peserta Didik & NIS/NISN */}
            <div className="w-full max-w-md space-y-6">
              <div>
                <p className="text-sm font-semibold mb-2">Nama Peserta Didik :</p>
                <div className="w-full border-2 border-black py-2.5 px-4 font-bold text-base tracking-wide uppercase bg-slate-50/30">
                  {siswa.nama_siswa || '-'}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">NIS / NISN :</p>
                <div className="w-full border-2 border-black py-2.5 px-4 font-bold text-base tracking-wider bg-slate-50/30">
                  {siswa.nis || '-'} / {siswa.nisn || '-'}
                </div>
              </div>
            </div>

            {/* 4. Footer Kementerian */}
            <div className="mt-8 pt-4 border-t border-slate-200 w-full space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide">
                KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
              </p>
              <p className="text-xs font-bold uppercase tracking-wider">
                REPUBLIK INDONESIA
              </p>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: KETERANGAN TENTANG DIRI PESERTA DIDIK (17 BUTIR)   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={2}
          totalPages={2}
          footerText={`Buku Induk & Biodata Siswa — ${namaSekolah}`}
          className="bg-white text-black font-serif print:shadow-none"
        >
          <div className="w-full h-full flex flex-col justify-between py-4 px-8 text-black">
            {/* Header Judul Naskah */}
            <div className="text-center mb-4">
              <h1 className="text-base font-bold tracking-wider uppercase border-b border-black pb-1.5 inline-block">
                KETERANGAN TENTANG DIRI PESERTA DIDIK
              </h1>
            </div>

            {/* Tabel 17 Butir Resmi */}
            <div className="flex-1">
              <table className="w-full text-[10.5pt] leading-tight border-collapse">
                <tbody>
                  {butirItems.map(([no, label, titik, val], idx) => {
                    const isSubHeader = (no === '11.' || no === '12.' || no === '14.');
                    const isBoldName = idx === 0;

                    return (
                      <tr key={`biodata-row-${idx}`} className="align-top">
                        <td className="w-6 py-0.5 text-left font-medium">{no}</td>
                        <td className="w-60 py-0.5 text-left font-medium pr-1">{label}</td>
                        <td className="w-3 py-0.5 text-center font-bold">{titik}</td>
                        <td className={`py-0.5 text-left pl-2 ${isBoldName ? 'font-bold' : ''}`}>
                          {isSubHeader ? '' : val}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Blok Bawah: Pas Foto 3x4 & Tanda Tangan Kepala Sekolah */}
            <div className="mt-6 pt-3 flex items-end justify-between px-6">
              {/* Kotak Pas Foto 3x4 */}
              <div className="w-24 h-32 border-2 border-black flex flex-col items-center justify-center text-center bg-slate-50/50">
                <span className="text-[11px] font-sans font-bold text-slate-700">Pas Foto</span>
                <span className="text-[10px] font-sans font-semibold text-slate-500">3 × 4</span>
              </div>

              {/* Blok Titimangsa & Tanda Tangan Kepala Sekolah */}
              <div className="text-left space-y-1 min-w-[220px]">
                <p className="text-[10.5pt]">{titimangsa}</p>
                <p className="text-[10.5pt] font-medium">Kepala Sekolah,</p>

                {/* Ruang TTD */}
                <div className="h-16" />

                <p className="text-[10.5pt] font-bold underline underline-offset-2">
                  {kepalaSekolahNama}
                </p>
                <p className="text-[10pt] font-mono">
                  NIP. {kepalaSekolahNip}
                </p>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

BiodataPrintModal.displayName = 'BiodataPrintModal';
