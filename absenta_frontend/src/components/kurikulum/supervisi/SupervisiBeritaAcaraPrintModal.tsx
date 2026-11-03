import React, { useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { Supervisi } from '@/api/kurikulum.api';
import { formatDate } from '@/utils/layoutUtils';

export interface SupervisiBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisi: Supervisi | null;
  tahunPelajaranNama?: string;
  semesterNama?: string;
}

export const SupervisiBeritaAcaraPrintModal: React.FC<SupervisiBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  supervisi,
  tahunPelajaranNama,
  semesterNama,
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();

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

  const titimangsa = useMemo(() => {
    const kota = (rawSekolah as any)?.kota || tenantInfo?.kabupaten || tenantInfo?.kota || 'Bandung';
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${kota}, ${today}`;
  }, [rawSekolah, tenantInfo]);

  const kepsekNama = useMemo(() => {
    return (rawSekolah as any)?.kepala_sekolah || (tenantInfo as any)?.kepala_sekolah || 'Dra. Hj. Siti Rahma, M.Pd';
  }, [rawSekolah, tenantInfo]);

  const kepsekNip = useMemo(() => {
    return (rawSekolah as any)?.nip_kepala || (tenantInfo as any)?.nip_kepala || '197001011995032001';
  }, [rawSekolah, tenantInfo]);

  if (!supervisi) return null;

  const scoreTier = useMemo(() => {
    const n = supervisi.nilai;
    if (n == null) return { label: 'Belum Dinilai', grade: '-' };
    if (n >= 91) return { label: 'Amat Baik / Sangat Memuaskan', grade: 'A' };
    if (n >= 81) return { label: 'Baik / Memenuhi Standar', grade: 'B' };
    if (n >= 71) return { label: 'Cukup / Perlu Bimbingan', grade: 'C' };
    return { label: 'Kurang / Perlu Pembinaan Khusus', grade: 'D' };
  }, [supervisi.nilai]);

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Berita Acara & Instrumen Supervisi"
      subtitle={`Dokumen Hasil Observasi Pembelajaran: ${supervisi.Guru?.nama_guru || 'Guru'}`}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        <PrintDocumentSheet pageNumber={1} totalPages={1} orientation="portrait">
          {/* 1. KOP SURAT RESMI */}
          <PrintHeader
            sekolah={rawSekolah as any}
            tenantInfo={tenantInfo}
            logoDaerahBase64={logoDaerahBase64}
            logoSekolahBase64={logoSekolahBase64}
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
                  <td className="font-bold text-black">{supervisi.Guru?.nama_guru || '-'}</td>
                  <td className="w-32 font-semibold text-black">Mata Pelajaran</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-black">{supervisi.mapel || '-'}</td>
                </tr>
                <tr className="leading-5">
                  <td className="font-semibold text-black">NIP / NUPTK</td>
                  <td>:</td>
                  <td className="text-black">{supervisi.Guru?.nip || '-'}</td>
                  <td className="font-semibold text-black">Kelas / Jam Ke</td>
                  <td>:</td>
                  <td className="text-black">{supervisi.kelas || '-'} / Jam ke-{supervisi.jam_ke || '-'}</td>
                </tr>
                <tr className="leading-5">
                  <td className="font-semibold text-black">Supervisor / Penilai</td>
                  <td>:</td>
                  <td className="font-bold text-black">{supervisi.Supervisor?.nama_guru || 'Tim Pengembang Kurikulum'}</td>
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

          {/* 8. TANDA TANGAN 3-PIHAK RESMI */}
          <div className="mt-5 pt-2 text-[10.5px]">
            <div className="text-right mb-2">{titimangsa}</div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-slate-800">Guru yang Disupervisi,</p>
                <div className="h-16" />
                <p className="font-bold text-black uppercase underline">
                  {supervisi.Guru?.nama_guru || '........................................'}
                </p>
                <p className="text-[9.5px] text-slate-700">NIP. {supervisi.Guru?.nip || '-'}</p>
              </div>

              <div>
                <p className="text-slate-800">Supervisor / Penilai,</p>
                <div className="h-16" />
                <p className="font-bold text-black uppercase underline">
                  {supervisi.Supervisor?.nama_guru || '........................................'}
                </p>
                <p className="text-[9.5px] text-slate-700">NIP. {supervisi.Supervisor?.nip || '-'}</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-slate-800">Mengetahui,</p>
              <p className="font-semibold text-slate-900">Kepala Sekolah</p>
              <div className="h-16" />
              <p className="font-bold text-black uppercase underline">{kepsekNama}</p>
              <p className="text-[9.5px] text-slate-700">NIP. {kepsekNip}</p>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
