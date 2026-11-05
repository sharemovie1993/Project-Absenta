import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { siswaApi } from '@/api/academic.api';
import { raporApi } from '@/api/rapor.api';
import { generateBiodataSiswaPdf } from '@/utils/print/rapor/renderBiodata';
import {
  resolveJenjangLines,
  formatAlamatDuaBaris,
  formatAnakKe,
  formatIndoDate,
} from '@/utils/print/rapor/raporShared';
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

export const BiodataPrintModal: React.FC<BiodataPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  tahunPelajaranId,
  semesterId,
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

  // Query Pengaturan Titimangsa & Pejabat Rapor Resmi
  const { data: raporSettingsRes } = useQuery({
    queryKey: ['rapor-settings-biodata', tahunPelajaranId, semesterId],
    queryFn: () =>
      raporApi.getRaporSettings({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const raporSettings = useMemo(() => {
    return (raporSettingsRes as any)?.data || raporSettingsRes || null;
  }, [raporSettingsRes]);

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

  // Handler Download PDF resmi (True WYSIWYG via engine awal)
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

  // Resolusi Jenjang Judul Sampul (e.g. SEKOLAH MENENGAH KEJURUAN / (SMK))
  const { jenjangLine1, jenjangLine2 } = useMemo(() => {
    return resolveJenjangLines(rawSekolah, tenantInfo, siswa);
  }, [rawSekolah, tenantInfo, siswa]);

  if (!isOpen || !selectedStudent) return null;

  // Data Pejabat & Titimangsa Sesuai Pengaturan Rapor Resmi
  const kota =
    raporSettings?.tempat_terbit ||
    (rawSekolah as any)?.kota ||
    tenantInfo.city ||
    'Purwakarta';

  const rawTanggalRapor =
    raporSettings?.tanggal_rapor_ganjil ||
    raporSettings?.tanggal_rapor ||
    raporSettings?.tanggal_rapor_genap;

  const titimangsaDate = rawTanggalRapor
    ? formatIndoDate(rawTanggalRapor)
    : formatIndoDate(new Date());

  const titimangsa = `${kota}, ${titimangsaDate}`;

  const kepalaSekolahNama =
    raporSettings?.kepsek_nama ||
    (rawSekolah as any)?.kepala_sekolah ||
    tenantInfo.kepala_sekolah ||
    'Kepala Sekolah';

  const rawKepsekNip =
    raporSettings?.kepsek_nip ||
    (rawSekolah as any)?.nip_kepala_sekolah ||
    tenantInfo.nip_kepala_sekolah ||
    '-';
  const cleanKepsekNip = rawKepsekNip ? String(rawKepsekNip).replace(/^NIP\.?\s*/i, '').trim() : '-';
  const kepalaSekolahNip = cleanKepsekNip || '-';

  // Formulasi data 17 Butir Resmi
  const jk = (siswa.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan';
  const ttl = `${siswa.tempat_lahir || '-'} , ${formatIndoDate(siswa.tanggal_lahir)}`;
  const tglMasuk = formatIndoDate(siswa.tanggal_masuk);

  const alamatSiswaDuaBaris = formatAlamatDuaBaris(
    siswa.alamat,
    siswa.dusun,
    siswa.rt,
    siswa.rw,
    siswa.kelurahan,
    siswa.kecamatan,
    siswa.kabupaten
  );

  const alamatOrtuDuaBaris = formatAlamatDuaBaris(
    siswa.alamat_ortu || siswa.alamat,
    siswa.dusun_ortu || siswa.dusun,
    siswa.rt_ortu || siswa.rt,
    siswa.rw_ortu || siswa.rw,
    siswa.kelurahan_ortu || siswa.kelurahan,
    siswa.kecamatan_ortu || siswa.kecamatan,
    siswa.kabupaten_ortu || siswa.kabupaten
  );

  const alamatWaliDuaBaris = formatAlamatDuaBaris(
    siswa.alamat_wali || siswa.alamat,
    siswa.dusun_wali,
    siswa.rt_wali,
    siswa.rw_wali,
    siswa.kelurahan_wali,
    siswa.kecamatan_wali,
    siswa.kabupaten_wali
  );

  // Tabel 17 Butir (Identik dengan renderBiodata.ts)
  const butirItems: Array<{ no: string; label: string; titik: string; val: string; isIndent?: boolean; isHeader?: boolean; isBold?: boolean }> = [
    { no: '1.', label: 'Nama Peserta Didik Lengkap', titik: ':', val: (siswa.nama_siswa || siswa.nama || '-').toUpperCase(), isBold: true },
    { no: '2.', label: 'Nomor Induk Siswa / NISN', titik: ':', val: `${siswa.nis || '-'} / ${siswa.nisn || '-'}` },
    { no: '3.', label: 'Tempat Tanggal Lahir', titik: ':', val: ttl },
    { no: '4.', label: 'Jenis Kelamin', titik: ':', val: jk },
    { no: '5.', label: 'Agama / Kepercayaan', titik: ':', val: siswa.agama || '-' },
    { no: '6.', label: 'Status dalam Keluarga', titik: ':', val: siswa.status_dalam_keluarga || 'Anak Kandung' },
    { no: '7.', label: 'Anak ke', titik: ':', val: formatAnakKe(siswa.anak_ke) },
    { no: '8.', label: 'Alamat Peserta Didik', titik: ':', val: alamatSiswaDuaBaris },
    { no: '9.', label: 'Nomor Telepon Rumah', titik: ':', val: siswa.no_telepon || siswa.no_hp || '-' },
    { no: '10.', label: 'Sekolah Asal', titik: ':', val: siswa.sekolah_asal || '-' },
    { no: '11.', label: 'Diterima di sekolah ini', titik: '', val: '', isHeader: true },
    { no: '', label: 'Di kelas', titik: ':', val: siswa.kelas_awal || siswa.nama_kelas || siswa.kelas || '-', isIndent: true },
    { no: '', label: 'Pada tanggal', titik: ':', val: tglMasuk, isIndent: true },
    { no: '12.', label: 'Nama Orang Tua', titik: '', val: '', isHeader: true },
    { no: '', label: 'a. Ayah', titik: ':', val: siswa.nama_ayah || '-', isIndent: true },
    { no: '', label: 'b. Ibu', titik: ':', val: siswa.nama_ibu || '-', isIndent: true },
    { no: '13.', label: 'Alamat Orang Tua', titik: ':', val: alamatOrtuDuaBaris },
    { no: '', label: 'Nomor Telepon Rumah', titik: ':', val: siswa.no_telepon_ortu || siswa.no_hp_ortu || siswa.no_hp_ayah || '-', isIndent: true },
    { no: '14.', label: 'Pekerjaan Orang Tua', titik: '', val: '', isHeader: true },
    { no: '', label: 'a. Ayah', titik: ':', val: siswa.pekerjaan_ayah || '-', isIndent: true },
    { no: '', label: 'b. Ibu', titik: ':', val: siswa.pekerjaan_ibu || '-', isIndent: true },
    { no: '15.', label: 'Nama Wali Peserta Didik', titik: ':', val: siswa.nama_wali || '-' },
    { no: '16.', label: 'Alamat Wali Peserta Didik', titik: ':', val: alamatWaliDuaBaris },
    { no: '', label: 'Nomor Telepon Rumah', titik: ':', val: siswa.no_telepon_wali || siswa.no_hp_wali || '-', isIndent: true },
    { no: '17.', label: 'Pekerjaan Wali Peserta Didik', titik: ':', val: siswa.pekerjaan_wali || '-' },
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
        {/* LEMBAR 1: COVER / SAMPUL LUAR RAPOR RESMI                     */}
        {/* Desain & Font Ukuran Sesuai dengan renderOfficialCoverRaporPage*/}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '24mm 20mm 20mm 20mm' }}
          className="bg-white text-black font-cambria select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between items-center text-center">
            {/* Bagian Atas: Logo Daerah & Jenjang Title */}
            <div className="w-full flex flex-col items-center">
              {/* 1. Top Logo (Logo Daerah Kop Surat) */}
              <div className="w-[32mm] h-[38mm] flex items-center justify-center">
                {showLogoDaerah && logoDaerahBase64 ? (
                  <img
                    src={logoDaerahBase64}
                    alt="Logo Daerah"
                    className="max-h-[38mm] max-w-[32mm] w-auto h-auto object-contain"
                  />
                ) : (
                  <div className="w-full h-full border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    Logo Daerah
                  </div>
                )}
              </div>

              {/* 2. Jenjang Title (Cambria 16pt Bold) */}
              <div className="mt-[12mm] text-black font-bold text-[16pt] leading-[1.3] uppercase tracking-[0.5px]">
                <div>{jenjangLine1}</div>
                <div>{jenjangLine2}</div>
              </div>
            </div>

            {/* Bagian Tengah: Logo Sekolah (46mm x 46mm) */}
            <div className="my-[12mm] flex flex-col items-center justify-center">
              <div className="w-[46mm] h-[46mm] flex items-center justify-center">
                {showLogoSekolah && logoSekolahBase64 ? (
                  <img
                    src={logoSekolahBase64}
                    alt="Logo Sekolah"
                    className="max-h-[46mm] max-w-[46mm] w-auto h-auto object-contain"
                  />
                ) : (
                  <div className="w-[44mm] h-[44mm] rounded-full border-[1.5px] border-slate-500 flex flex-col items-center justify-center text-[9pt] text-slate-600 font-normal leading-tight">
                    <span>LOGO</span>
                    <span>SEKOLAH</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian Bawah: Kotak Identitas Siswa (Lebar 145mm) */}
            <div className="w-[145mm] mx-auto flex flex-col items-center">
              {/* Nama Peserta Didik */}
              <div className="w-full">
                <div className="font-bold text-[14pt] text-black text-center mb-[2.5mm]">
                  Nama Peserta Didik :
                </div>
                <div className="w-full h-[14mm] border-[2px] border-black bg-white flex items-center justify-center px-4">
                  <span className="font-bold text-[16pt] text-black uppercase tracking-[0.5px] text-center truncate">
                    {siswa.nama_siswa || siswa.nama || '-'}
                  </span>
                </div>
              </div>

              {/* Jarak ke NIS */}
              <div className="w-full mt-[5.5mm]">
                <div className="font-bold text-[14pt] text-black text-center mb-[2.5mm]">
                  NIS / NISN :
                </div>
                <div className="w-full h-[14mm] border-[2px] border-black bg-white flex items-center justify-center px-4">
                  <span className="font-bold text-[16pt] text-black tracking-[1px] text-center">
                    {siswa.nis || '-'} / {siswa.nisn || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bagian Paling Bawah: Footer Kementerian (Cambria 16pt Bold) */}
            <div className="mt-auto pt-[16mm] w-full text-center font-bold text-[16pt] leading-[1.35] text-black uppercase tracking-[0.5px]">
              <div>KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</div>
              <div>REPUBLIK INDONESIA</div>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: KETERANGAN TENTANG DIRI PESERTA DIDIK (17 BUTIR)   */}
        {/* Desain, Kolom & Ukuran Sesuai renderOfficialBiodataPage       */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          style={{ padding: '15mm 16mm 12mm 16mm' }}
          className="bg-white text-black font-cambria select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black">
            {/* Header Title (Cambria 16pt Bold) */}
            <div className="text-center mb-[4mm]">
              <h1 className="font-bold text-[16pt] text-black uppercase tracking-[0.5px]">
                KETERANGAN TENTANG DIRI PESERTA DIDIK
              </h1>
            </div>

            {/* Tabel 17 Butir Resmi (Cambria 12pt) */}
            <div className="flex-1 w-full">
              <table className="w-full table-fixed border-collapse text-[12pt] leading-[1.4] text-black">
                <colgroup>
                  <col className="w-[8mm]" />
                  <col className="w-[69mm]" />
                  <col className="w-[4mm]" />
                  <col className="w-[97mm]" />
                </colgroup>
                <tbody>
                  {butirItems.map((item, idx) => (
                    <tr key={`biodata-row-${idx}`} className="align-top">
                      {/* Kolom 1: No */}
                      <td className="py-[1.2mm] text-left font-normal">
                        {item.no}
                      </td>

                      {/* Kolom 2: Label */}
                      <td className={`py-[1.2mm] text-left font-normal pr-1 ${item.isIndent ? 'pl-[5mm]' : ''}`}>
                        {item.label}
                      </td>

                      {/* Kolom 3: Titik Dua */}
                      <td className="py-[1.2mm] text-center font-normal">
                        {item.titik}
                      </td>

                      {/* Kolom 4: Nilai / Isian */}
                      <td
                        className={`py-[1.2mm] text-left pl-[2mm] whitespace-pre-line ${
                          item.isBold ? 'font-bold' : 'font-normal'
                        }`}
                      >
                        {item.isHeader ? '' : item.val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Blok Bawah: Pas Foto 3x4 & Tanda Tangan Kepala Sekolah */}
            <div className="mt-[5mm] flex items-end justify-between w-full">
              {/* Kotak Pas Foto 3x4 (28mm x 36mm) - Terletak di area kiri sejajar X=62mm */}
              <div className="ml-[46mm] w-[28mm] h-[36mm] border-[1.5px] border-black bg-white flex flex-col items-center justify-center text-center text-black shrink-0">
                <span className="text-[10pt] font-normal leading-tight">Pas Foto</span>
                <span className="text-[10pt] font-normal leading-tight">3x4</span>
              </div>

              {/* Blok Tanda Tangan Kepala Sekolah (Sisi Kanan) */}
              <div className="w-[75mm] text-left text-black text-[10pt] leading-[1.3]">
                <div>{titimangsa}</div>
                <div>Kepala Sekolah</div>

                {/* Ruang Tanda Tangan (~20mm) */}
                <div className="h-[20mm]" />

                {/* Nama Kepala Sekolah (Bold + Underline) */}
                <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2 inline-block">
                  {kepalaSekolahNama}
                </div>

                {/* NIP Kepala Sekolah */}
                <div className="text-[9.5pt] font-normal">
                  NIP. {kepalaSekolahNip.replace(/^NIP\.?\s*/i, '')}
                </div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

BiodataPrintModal.displayName = 'BiodataPrintModal';
