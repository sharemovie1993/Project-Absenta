import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  UniversalStudentIdentity,
  normalizeStudentIdentity,
} from '@/components/ui/PrintHeader';
import { hubinApi } from '@/api/hubin.api';
import { siswaApi } from '@/api/academic.api';
import { generateSertifikatSinglePdf, type SertifikatPklPrintData, formatTanggalIndonesia, getPredikatLabel, getPredikatHuruf } from '@/utils/print/modules/pdfSertifikatPkl';
import { getStoredSertifikatSettings } from '@/components/hubin/PengaturanCetakSertifikatModal';
import { Loader2, AlertCircle } from 'lucide-react';
import type { LegerStudent } from './LegerStudentTable';

export interface SertifikatPklPrintModalProps {
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
  showLogoKananInitial?: boolean;
}

export const SertifikatPklPrintModal: React.FC<SertifikatPklPrintModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedStudent,
  students = [],
  onSelectStudent,
  selectedKelas = '',
  tahunPelajaranId = '',
  showLogoKananInitial = true,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(showLogoKananInitial);

  const { tenantInfo, rawSekolah, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();

  const siswaId = selectedStudent?.id;

  // 1. Fetch Data Penempatan Siswa
  const { data: penempatanRes, isLoading: isLoadingPenempatan } = useQuery({
    queryKey: ['hubin-penempatan-cert-pkl', siswaId, selectedKelas, tahunPelajaranId],
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

  // 2. Fetch Detail Siswa (Tempat/Tgl Lahir & Foto)
  const { data: siswaDetailRes } = useQuery({
    queryKey: ['siswa-detail-cert-pkl', siswaId],
    queryFn: () => siswaApi.getById(siswaId!),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  const detailSiswa = siswaDetailRes?.data || null;

  const placement = useMemo(() => {
    const raw = (penempatanRes as any)?.list || (Array.isArray((penempatanRes as any)?.data) ? (penempatanRes as any).data : (penempatanRes as any)?.data?.list) || [];
    const list: any[] = Array.isArray(raw) ? raw : [];
    const matchingPlacements = list.filter(
      (p: any) =>
        p.siswa_id === siswaId ||
        p.Siswa?.id === siswaId ||
        p.Siswa?.nis === selectedStudent?.nis
    );
    if (matchingPlacements.length === 0) return null;

    // Prioritaskan status != 'BATAL', memiliki nilai_akhir_pkl, dan paling mutakhir
    return [...matchingPlacements].sort((a, b) => {
      const aNotBatal = a.status !== 'BATAL' ? 1 : 0;
      const bNotBatal = b.status !== 'BATAL' ? 1 : 0;
      if (bNotBatal !== aNotBatal) return bNotBatal - aNotBatal;

      const aHasScore = a.nilai_akhir_pkl != null ? 1 : 0;
      const bHasScore = b.nilai_akhir_pkl != null ? 1 : 0;
      if (bHasScore !== aHasScore) return bHasScore - aHasScore;

      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    })[0];
  }, [penempatanRes, siswaId, selectedStudent]);

  // 3. Fetch Detail Data Sertifikat PKL Resmi (Single Source of Truth dari Pengaturan Hubin & Akademik)
  const placementId = placement?.id;
  const { data: certDetailRes, isLoading: isLoadingCertDetail } = useQuery({
    queryKey: ['hubin-sertifikat-data', placementId],
    queryFn: () => hubinApi.getSertifikatPklData(placementId!),
    enabled: isOpen && Boolean(placementId),
    staleTime: 60 * 1000,
  });

  const certDetail = certDetailRes?.data || certDetailRes || null;

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

  // SSoT Universal Academic Identity Siswa
  const studentIdentity = useMemo(() => {
    return normalizeStudentIdentity({
      ...(selectedStudent || {}),
      ...(detailSiswa || {}),
      ...(placement?.Siswa || {}),
      ...(certDetail?.Siswa || {}),
    });
  }, [selectedStudent, detailSiswa, placement, certDetail]);

  // Susun data cetak sertifikat
  const certData: SertifikatPklPrintData | null = useMemo(() => {
    if (!selectedStudent) return null;

    const storedSettings = getStoredSertifikatSettings();
    const kotaSekolah = (rawSekolah as any)?.kota || tenantInfo?.city || 'Purwakarta';

    // Resolusi Titimangsa sesuai Pengaturan Hubin (Tahun Pelajaran spesifik atau global)
    const rawTglTerbit =
      certDetail?.referensi_sertifikat?.tanggal_terbit ||
      storedSettings.tanggal_terbit;

    let formattedTglTerbit = '';
    if (rawTglTerbit) {
      const parts = String(rawTglTerbit).split('-');
      if (parts.length === 3) {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        formattedTglTerbit = `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
      } else {
        formattedTglTerbit = formatTanggalIndonesia(rawTglTerbit);
      }
    } else {
      formattedTglTerbit = formatTanggalIndonesia(new Date());
    }

    const tempatTerbit =
      certDetail?.referensi_sertifikat?.tempat_terbit ||
      kotaSekolah;

    const tglTerbit = `${tempatTerbit}, ${formattedTglTerbit}`;

    const nomorSertifikat =
      certDetail?.referensi_sertifikat?.nomor_surat ||
      placement?.nomor_sertifikat ||
      certDetail?.nomor_sertifikat ||
      storedSettings.nomor_sertifikat ||
      '-';

    const durasiJp =
      certDetail?.referensi_sertifikat?.durasi_jp ||
      placement?.durasi_jp ||
      certDetail?.durasi_jp ||
      storedSettings.durasi_jp ||
      '792';

    const assessmentMode =
      certDetail?.assessment_mode ||
      storedSettings.assessment_mode ||
      'DUDI_ONLY';

    const kepsekNama =
      certDetail?.referensi_sertifikat?.penandatangan_nama ||
      certDetail?.sekolah?.kepala_sekolah ||
      tenantInfo?.kepala_sekolah ||
      rawSekolah?.kepala_sekolah ||
      '';

    const kepsekNip =
      certDetail?.referensi_sertifikat?.penandatangan_nip ||
      certDetail?.sekolah?.nip_kepala ||
      tenantInfo?.nip_kepala ||
      (rawSekolah as any)?.nip_kepala_sekolah ||
      '';

    return {
      nomor_sertifikat: nomorSertifikat,
      durasi_jp: durasiJp,
      tanggal_terbit: tglTerbit,
      assessment_mode: assessmentMode,
      weight_dudi: certDetail?.weight_dudi ?? 70,
      weight_laporan: certDetail?.weight_laporan ?? 15,
      weight_sidang: certDetail?.weight_sidang ?? 15,
      sekolah: {
        nama: certDetail?.sekolah?.nama || rawSekolah?.nama || tenantInfo?.name || 'SMK NEGERI 1 PLERED',
        alamat: certDetail?.sekolah?.alamat || rawSekolah?.alamat || tenantInfo?.address || '',
        kota: tempatTerbit,
        kode_pos: (rawSekolah as any)?.kode_pos || '',
        telepon: (rawSekolah as any)?.telepon || '',
        email: (rawSekolah as any)?.email || '',
        website: (rawSekolah as any)?.website || '',
        kepala_sekolah: kepsekNama,
        nip_kepala: kepsekNip,
        print_header_lines: tenantInfo?.print_header_lines,
      },
      siswa: {
        nama_siswa: studentIdentity.nama,
        nis: studentIdentity.nis,
        nisn: studentIdentity.nisn,
        tempat_lahir: studentIdentity.tempatLahir,
        tanggal_lahir: studentIdentity.tanggalLahir,
        foto: studentIdentity.fotoUrl,
        program_keahlian: studentIdentity.programKeahlian,
        konsentrasi_keahlian: studentIdentity.jurusanNama,
        nama_kelas: studentIdentity.namaKelas,
      },
      mitra: {
        nama: certDetail?.Mitra?.nama || placement?.Mitra?.nama || placement?.mitra_nama || 'DU/DI Mitra',
        alamat: certDetail?.Mitra?.alamat || placement?.alamat_dudi || placement?.Mitra?.alamat || '',
        penanggung_jawab_nama: certDetail?.Mitra?.pimpinan_nama || placement?.Mitra?.pimpinan_nama || placement?.penanggung_jawab_nama || certDetail?.Mitra?.nama || 'Pimpinan Perusahaan',
        penanggung_jawab_jabatan: placement?.penanggung_jawab_jabatan || certDetail?.Mitra?.pimpinan_jabatan || 'Pimpinan Perusahaan',
        instruktur_nama: certDetail?.Mitra?.pic_nama || placement?.instruktur_nama || placement?.Mitra?.pic_nama || certDetail?.Mitra?.pimpinan_nama || '-',
      },
      pembimbing: {
        nama: certDetail?.pembimbing_nama || certDetail?.Pembimbing?.nama_guru || placement?.Pembimbing?.nama_guru || null,
        nip: certDetail?.pembimbing_nip || certDetail?.Pembimbing?.nip || placement?.Pembimbing?.nip || null,
      },
      penilaian: {
        hard_kompetensi_teknis: certDetail?.hard_kompetensi_teknis ?? placement?.hard_kompetensi_teknis ?? 0,
        hard_sop_k3lh: certDetail?.hard_sop_k3lh ?? placement?.hard_sop_k3lh ?? 0,
        hard_alur_bisnis: certDetail?.hard_alur_bisnis ?? placement?.hard_alur_bisnis ?? 0,
        soft_kedisiplinan: certDetail?.soft_kedisiplinan ?? placement?.soft_kedisiplinan ?? 0,
        soft_kerajinan_inisiatif: certDetail?.soft_kerajinan_inisiatif ?? placement?.soft_kerajinan_inisiatif ?? 0,
        soft_kerjasama: certDetail?.soft_kerjasama ?? placement?.soft_kerjasama ?? 0,
        soft_kejujuran: certDetail?.soft_kejujuran ?? placement?.soft_kejujuran ?? 0,
        soft_tanggung_jawab: certDetail?.soft_tanggung_jawab ?? placement?.soft_tanggung_jawab ?? 0,
        nilai_akhir_pkl: certDetail?.nilai_akhir_pkl ?? placement?.nilai_akhir_pkl ?? null,
        predikat_pkl: certDetail?.predikat_pkl || placement?.predikat_pkl || null,
        nilai_laporan: certDetail?.nilai_laporan ?? null,
        nilai_sidang: certDetail?.nilai_sidang ?? null,
      },
    };
  }, [selectedStudent, placement, certDetail, detailSiswa, rawSekolah, tenantInfo]);

  // Handler Download PDF Resmi True WYSIWYG
  const handleDownloadPdf = useCallback(async () => {
    if (!certData || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { blobUrl, filename } = await generateSertifikatSinglePdf(certData, {
        logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
        logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
      });
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('[SertifikatPklPrintModal] Gagal mengunduh PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [certData, showLogoDaerah, showLogoSekolah, logoDaerahBase64, logoSekolahBase64, isExportingPdf]);

  if (!isOpen || !selectedStudent) return null;

  // Nilai & Predikat Rata-rata
  const p = certData?.penilaian;
  const hardScores = [p?.hard_kompetensi_teknis ?? 88, p?.hard_sop_k3lh ?? 89, p?.hard_alur_bisnis ?? 87];
  const softScores = [p?.soft_kedisiplinan ?? 83, p?.soft_kerajinan_inisiatif ?? 84, p?.soft_kerjasama ?? 86, p?.soft_kejujuran ?? 88, p?.soft_tanggung_jawab ?? 85];
  const allScores = [...hardScores, ...softScores];
  const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const finalNilai = p?.nilai_akhir_pkl ?? avgScore;
  const finalPredikat = p?.predikat_pkl ? p.predikat_pkl.toUpperCase() : getPredikatLabel(finalNilai);

  const tglLahirStr = certData?.siswa.tanggal_lahir ? formatTanggalIndonesia(certData.siswa.tanggal_lahir) : '';
  const tempatLahirStr = certData?.siswa.tempat_lahir || '';
  const ttl = tempatLahirStr && tglLahirStr
    ? `${tempatLahirStr}, ${tglLahirStr}`
    : (tempatLahirStr || tglLahirStr || '-');

  const rawMulai = placement?.tanggal_mulai || certDetail?.tanggal_mulai;
  const rawSelesai = placement?.tanggal_selesai || certDetail?.tanggal_selesai;
  const tglMulaiStr = rawMulai ? formatTanggalIndonesia(rawMulai) : '-';
  const tglSelesaiStr = rawSelesai ? formatTanggalIndonesia(rawSelesai) : '-';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Sertifikat Praktik Kerja Lapangan (PKL)"
      subtitle={`${selectedStudent.nama_siswa} (NIS: ${selectedStudent.nis || '-'}) • ${selectedStudent.nama_kelas || '-'}`}
      orientation="landscape"
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
        {isLoadingPenempatan && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-indigo-700 dark:text-indigo-300 w-full max-w-[297mm]">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Memuat data penempatan dan nilai sertifikat PKL...</span>
          </div>
        )}

        {!isLoadingPenempatan && !placement && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 w-full max-w-[297mm]">
            <AlertCircle size={16} className="shrink-0" />
            <span>Siswa belum memiliki data penempatan PKL resmi di modul Hubin. Menampilkan estimasi sertifikat standar.</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 1: PIAGAM SERTIFIKAT PKL MUKA DEPAN (A4 LANDSCAPE)     */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="landscape"
          style={{ padding: '12mm 16mm 10mm 16mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Kop Surat Resmi */}
              <PrintHeader
                showLogoDaerah={showLogoDaerah}
                showLogoSekolah={showLogoSekolah}
                className="mb-1"
              />

              {/* Judul Piagam & Nomor */}
              <div className="text-center my-[3mm]">
                <h1 className="font-bold text-[13pt] text-black tracking-[0.5px] uppercase underline decoration-black decoration-[1.5px] underline-offset-4 inline-block">
                  SERTIFIKAT PRAKTIK KERJA LAPANGAN
                </h1>
                <div className="text-[9pt] font-normal text-black mt-1">
                  Nomor : {certData?.nomor_sertifikat}
                </div>
              </div>

              {/* Kalimat Pembuka */}
              <div className="text-[9.5pt] text-left text-black mt-2 mb-2">
                Kepala {certData?.sekolah?.nama} menerangkan bahwa :
              </div>

              {/* Biodata Siswa Menggunakan UniversalStudentIdentity */}
              <div className="w-full pl-[6mm] mb-[3mm]">
                <UniversalStudentIdentity
                  identityOverride={{
                    ...studentIdentity,
                    sekolahAsal: certData?.sekolah?.nama || studentIdentity.sekolahAsal,
                  }}
                  mode="print"
                  variant="print_kv"
                  fields={['nama', 'ttl', 'nis_nisn', 'program_keahlian', 'konsentrasi_keahlian', 'sekolah_asal']}
                />
              </div>

              {/* Paragraf Keterangan Pelaksanaan */}
              <div className="text-[9.5pt] leading-relaxed text-justify text-black mb-[4mm]">
                Telah melaksanakan Praktik Kerja Lapangan (PKL) selama{' '}
                <span className="font-bold">{certData?.durasi_jp}</span> jam pada tanggal{' '}
                <span className="font-bold">{tglMulaiStr}</span> s.d{' '}
                <span className="font-bold">{tglSelesaiStr}</span> di{' '}
                <span className="font-bold uppercase">{certData?.mitra.nama}</span> dengan predikat{' '}
                <span className="font-bold uppercase tracking-wider">"{finalPredikat}"</span>.
              </div>
            </div>

            {/* Blok Bawah: Pas Foto & Tanda Tangan Bipartit */}
            <div className="flex justify-between items-end w-full text-[9pt] leading-tight text-black px-[4mm]">
              {/* Tanda Tangan Pimpinan Industri (Kiri) */}
              <div className="w-[70mm] text-center">
                <div>Mengetahui,</div>
                <div className="font-medium">{certData?.mitra.penanggung_jawab_jabatan || 'Pimpinan Perusahaan'}</div>
                <div className="font-bold uppercase text-[8.5pt] mt-0.5 truncate">{certData?.mitra.nama}</div>
                <div className="h-[20mm]" />
                <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2">
                  {certData?.mitra.penanggung_jawab_nama}
                </div>
              </div>

              {/* Kotak Pas Foto Siswa (Tengah) Menggunakan Universal Photo Subsystem */}
              <div className="mx-auto shrink-0">
                <UniversalStudentIdentity
                  identityOverride={studentIdentity}
                  mode="print"
                  showPhoto={true}
                  photoSizeMm={{ width: 28, height: 36 }}
                  variant="print_kv"
                  fields={[]}
                />
              </div>

              {/* Tanda Tangan Kepala Sekolah (Kanan) Menggunakan Universal Signature Engine */}
              <div className="w-[70mm] text-center">
                <UniversalDocumentSignatures
                  layout="single_kepsek"
                  tahunPelajaranId={tahunPelajaranId}
                  overrideSignerRight={{
                    topDate: certData?.tanggal_terbit,
                    personName: certData?.sekolah?.kepala_sekolah,
                    nip: certData?.sekolah?.nip_kepala,
                  }}
                  spacingHeightMm={23}
                />
              </div>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* LEMBAR 2: TRANSKRIP DAFTAR NILAI PKL (A4 LANDSCAPE)           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="landscape"
          style={{ padding: '14mm 18mm 12mm 18mm' }}
          className="bg-white text-black font-sans select-none border-none shadow-2xl print:shadow-none print:m-0"
        >
          <div className="w-full h-full flex flex-col justify-between text-black font-sans">
            <div>
              {/* Judul Halaman Belakang */}
              <div className="text-center mb-[4mm]">
                <h1 className="font-bold text-[13pt] text-black tracking-[0.5px] uppercase">
                  DAFTAR NILAI PRAKTIK KERJA LAPANGAN
                </h1>
              </div>

              {/* Identitas Singkat Siswa & Industri Menggunakan UniversalStudentIdentity */}
              <div className="w-full text-[9pt] leading-tight text-black mb-[3.5mm]">
                <UniversalStudentIdentity
                  identityOverride={studentIdentity}
                  mode="print"
                  variant="print_kv"
                  fields={['nama', 'nis', 'konsentrasi_keahlian']}
                />
                <table className="table-fixed border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-[45mm] py-0.5">Nama Perusahaan/Instansi</td>
                      <td className="w-[4mm] py-0.5 text-center">:</td>
                      <td className="py-0.5 font-bold uppercase">{certData?.mitra.nama}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Penilaian Kompetensi PKL */}
              <div className="w-full">
                <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.3] text-black">
                  <colgroup>
                    <col className="w-[12mm]" />
                    <col className="w-[185mm]" />
                    <col className="w-[28mm]" />
                    <col className="w-[28mm]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#d2d2d2] border-b border-black font-bold">
                      <th className="py-[1.8mm] text-center border-r border-black font-bold text-black">No</th>
                      <th className="py-[1.8mm] px-[2.5mm] text-center border-r border-black font-bold text-black">Aspek Penilaian</th>
                      <th className="py-[1.8mm] text-center border-r border-black font-bold text-black">Nilai</th>
                      <th className="py-[1.8mm] text-center font-bold text-black">Predikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* HARD SKILL */}
                    <tr className="bg-white border-t border-b border-black font-bold">
                      <td className="py-[1.5mm] text-center border-r border-black">A</td>
                      <td colSpan={3} className="py-[1.5mm] px-[2.5mm] text-left">HARD SKILL</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">1</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Kompetensi Teknis</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{hardScores[0]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(hardScores[0])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">2</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Penerapan SOP dan K3LH</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{hardScores[1]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(hardScores[1])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">3</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Memahami Alur Bisnis</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{hardScores[2]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(hardScores[2])}</td>
                    </tr>

                    {/* SOFT SKILL */}
                    <tr className="bg-white border-t border-b border-black font-bold">
                      <td className="py-[1.5mm] text-center border-r border-black">B</td>
                      <td colSpan={3} className="py-[1.5mm] px-[2.5mm] text-left">SOFT SKILL</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">1</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Kedisiplinan</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{softScores[0]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(softScores[0])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">2</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Kerajinan, Inisiatif & Kreatifitas</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{softScores[1]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(softScores[1])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">3</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Kerjasama (Team Work)</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{softScores[2]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(softScores[2])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">4</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Kejujuran</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{softScores[3]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(softScores[3])}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="py-[1.5mm] text-center border-r border-black">5</td>
                      <td className="py-[1.5mm] px-[2.5mm] text-left border-r border-black">Tanggung Jawab</td>
                      <td className="py-[1.5mm] text-center border-r border-black font-bold">{softScores[4]}</td>
                      <td className="py-[1.5mm] text-center font-bold">{getPredikatHuruf(softScores[4])}</td>
                    </tr>

                    {/* NILAI AKHIR */}
                    <tr className="bg-[#f0f0f0] border-t-2 border-black font-bold">
                      <td colSpan={2} className="py-[2mm] px-[2.5mm] text-center border-r border-black font-bold">
                        NILAI RATA - RATA AKHIR
                      </td>
                      <td className="py-[2mm] text-center border-r border-black font-bold text-[9pt]">
                        {finalNilai.toFixed(1)}
                      </td>
                      <td className="py-[2mm] text-center font-bold text-[9pt]">
                        {finalPredikat}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tanda Tangan Halaman Belakang Menggunakan Universal Signature Engine */}
            <div className="w-full px-[6mm] mt-[6mm]">
              <UniversalDocumentSignatures
                layout="dual_unit_kepsek"
                tahunPelajaranId={tahunPelajaranId}
                overrideSignerLeft={{
                  roleTitle: 'Instruktur Industri,',
                  personName: certData?.mitra.instruktur_nama || certData?.mitra.penanggung_jawab_nama || 'Instruktur Industri',
                }}
                overrideSignerRight={{
                  topDate: certData?.tanggal_terbit,
                  personName: certData?.sekolah?.kepala_sekolah,
                  nip: certData?.sekolah?.nip_kepala,
                }}
                spacingHeightMm={20}
              />
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
});

SertifikatPklPrintModal.displayName = 'SertifikatPklPrintModal';
