/**
 * DapodikBeritaAcaraPrintModal.tsx
 * Modal Cetak Dokumen & Ekspor PDF Berita Acara Rekonsiliasi Data Siswa Dapodik.
 * Standar Industri: Universal Document Printing & True WYSIWYG PDF Export.
 */

import React, { useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import {
  type ReconciledStudent,
  type ReconciliationSummary,
} from '@/api/dapodik.api';

export interface DapodikBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: ReconciliationSummary;
  students: ReconciledStudent[];
  templateName?: string;
  dapodikHost: string;
  npsn: string;
  lastCheckAt?: string;
}

export const DapodikBeritaAcaraPrintModal: React.FC<DapodikBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  summary,
  students,
  templateName = 'Audit Standar',
  dapodikHost,
  npsn,
  lastCheckAt,
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);

  // Hook Resolves Tenant & Sekolah Header Data
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  // Filter 15 sampel siswa yang mengalami selisih untuk lampiran lembar 1
  const mismatchSample = useMemo(() => {
    return students.filter((s) => s.status === 'MISMATCH').slice(0, 10);
  }, [students]);

  const auditDate = useMemo(() => {
    const d = lastCheckAt ? new Date(lastCheckAt) : new Date();
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [lastCheckAt]);

  const auditTime = useMemo(() => {
    const d = lastCheckAt ? new Date(lastCheckAt) : new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }, [lastCheckAt]);

  const handleBrowserPrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Berita Acara Rekonsiliasi Dapodik"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Skenario:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            {templateName}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Dokumen Resmi Tata Usaha (A4 Portrait)
          </span>
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      printButtonText="Cetak Dokumen"
      size="5xl"
    >
      {/* ─── LEMBAR 1: NASKAH BERITA ACARA UTAMA & STATISTIK REKONSILIASI ─── */}
      <PrintDocumentSheet
        orientation="portrait"
        pageNumber={1}
        totalPages={1}
        footerText={`Berita Acara Rekonsiliasi Data Dapodik — ${sekolahData?.nama || tenantInfo?.name || 'SMK'} (NPSN: ${npsn})`}
      >
        {/* KOP SURAT RESMI */}
        <PrintHeader
          variant="portrait"
          tenantInfo={tenantInfo}
          showLogoDaerah={showLogoDaerah}
          showLogoSekolah={showLogoSekolah}
        />

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-3 space-y-0.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            BERITA ACARA REKONSILIASI DATA PESERTA DIDIK
          </h3>
          <h4 className="text-xs font-bold uppercase tracking-wider text-black">
            INTEGRASI WEB SERVICE DAPODIK &amp; DATABASE SEKOLAH (ABSENTA)
          </h4>
          <p className="text-[11px] font-normal italic text-slate-700">
            Nomor: 421.5/BA-REKON/{new Date().getFullYear()}/TU
          </p>
        </div>

        {/* PARAGRAF PENGANTAR */}
        <p className="text-justify indent-6 my-3 text-[11px] leading-relaxed text-black">
          Pada hari ini, <strong>{auditDate}</strong> pukul {auditTime}, telah diselenggarakan proses audit, verifikasi silang, dan komparasi data peserta didik secara langsung (*real-time synchronization*) antara Web Service Aplikasi Dapodik (Port 5774) dengan sistem database terpadu {tenantInfo.name || 'sekolah'}.
        </p>

        {/* IDENTITAS AUDIT */}
        <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold text-slate-600">Nama Sekolah :</span>{' '}
              <strong className="text-black">{sekolahData?.nama || tenantInfo.name}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-600">NPSN Nasional :</span>{' '}
              <strong className="text-black font-mono">{npsn}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Host Dapodik :</span>{' '}
              <span className="font-mono text-black">{dapodikHost}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Skenario Audit :</span>{' '}
              <strong className="text-black">{templateName}</strong>
            </div>
          </div>
        </div>

        {/* TABEL REKAPITULASI HASIL KOMPARASI */}
        <div className="my-3 space-y-1">
          <p className="font-bold text-[11px] text-black">I. Ringkasan Rekonsiliasi Data Siswa</p>
          <table className="w-full text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-center">
                <th className="p-1.5 border-r border-slate-300 w-10">No</th>
                <th className="p-1.5 border-r border-slate-300 text-left">Indikator Komparasi</th>
                <th className="p-1.5 border-r border-slate-300 w-28">Jumlah Siswa</th>
                <th className="p-1.5 text-left">Keterangan / Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 text-center border-r border-slate-300">1</td>
                <td className="p-1.5 border-r border-slate-300">Total Siswa Aktif di Dapodik</td>
                <td className="p-1.5 text-center font-bold border-r border-slate-300">
                  {summary?.totalDapodik.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-slate-600">Tercatat pada Web Service Dapodik lokal</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 text-center border-r border-slate-300">2</td>
                <td className="p-1.5 border-r border-slate-300">Total Siswa Terdaftar di Absenta</td>
                <td className="p-1.5 text-center font-bold border-r border-slate-300">
                  {summary?.totalAbsenta.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-slate-600">Database buku induk &amp; akademik sekolah</td>
              </tr>
              <tr className="border-b border-slate-200 bg-emerald-50/40">
                <td className="p-1.5 text-center border-r border-slate-300 font-bold">3</td>
                <td className="p-1.5 border-r border-slate-300 font-bold text-emerald-900">
                  Data Selaras Identik (100% Match)
                </td>
                <td className="p-1.5 text-center font-bold text-emerald-900 border-r border-slate-300">
                  {summary?.matchCount.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-emerald-800">Biodata dan rombel telah valid sepenuhnya</td>
              </tr>
              <tr className="border-b border-slate-200 bg-amber-50/40">
                <td className="p-1.5 text-center border-r border-slate-300 font-bold">4</td>
                <td className="p-1.5 border-r border-slate-300 font-bold text-amber-900">
                  Selisih Data (Perlu Rekonsiliasi)
                </td>
                <td className="p-1.5 text-center font-bold text-amber-900 border-r border-slate-300">
                  {summary?.mismatchCount.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-amber-800">Terdapat selisih atribut (Nama/NISN/NIK/Rombel)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 text-center border-r border-slate-300">5</td>
                <td className="p-1.5 border-r border-slate-300">Hanya Ada di Dapodik (Belum Terdaftar)</td>
                <td className="p-1.5 text-center font-bold border-r border-slate-300">
                  {summary?.dapodikOnlyCount.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-slate-600">Siap di-import ke database sekolah</td>
              </tr>
              <tr>
                <td className="p-1.5 text-center border-r border-slate-300">6</td>
                <td className="p-1.5 border-r border-slate-300">Hanya Ada di Absenta (Residu Sekolah)</td>
                <td className="p-1.5 text-center font-bold border-r border-slate-300">
                  {summary?.absentaOnlyCount.toLocaleString('id-ID') || 0}
                </td>
                <td className="p-1.5 text-slate-600">Belum terdaftar di Dapodik atau siswa non-aktif</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SAMPEL TEMUAN SELISIH DATA JIKA ADA */}
        {mismatchSample.length > 0 && (
          <div className="my-2 space-y-1">
            <p className="font-bold text-[10px] text-black">
              II. Sampel Temuan Selisih Atribut Siswa (Daftar Terlampir Singkat)
            </p>
            <table className="w-full text-[9.5px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="p-1 border-r border-slate-300 w-7 text-center">No</th>
                  <th className="p-1 border-r border-slate-300 w-24">NISN</th>
                  <th className="p-1 border-r border-slate-300">Nama di Dapodik</th>
                  <th className="p-1 border-r border-slate-300">Nama di Absenta</th>
                  <th className="p-1 border-r border-slate-300 w-24">Rombel Dapodik</th>
                  <th className="p-1">Atribut Selisih</th>
                </tr>
              </thead>
              <tbody>
                {mismatchSample.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-200">
                    <td className="p-1 text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="p-1 font-mono border-r border-slate-300">{s.nisn || '-'}</td>
                    <td className="p-1 font-medium border-r border-slate-300">{s.dapodikRaw?.nama || s.nama}</td>
                    <td className="p-1 border-r border-slate-300">{s.absentaRaw?.nama_siswa || '-'}</td>
                    <td className="p-1 border-r border-slate-300">{s.dapodikRaw?.nama_rombel || '-'}</td>
                    <td className="p-1 text-amber-800 font-semibold">
                      {s.diffs.map((d) => d.label).join(', ') || 'Identitas'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CATATAN TINDAK LANJUT */}
        <p className="my-2 text-[10.5px] leading-relaxed text-black">
          Berdasarkan hasil rekonsiliasi ini, tim Tata Usaha dan Operator Dapodik telah menjadwalkan sinkronisasi massal untuk menyelaraskan data biodata siswa di platform internal sekolah sesuai dengan data induk Dapodik nasional.
        </p>

        {/* TANDA TANGAN 3 PIHAK MENGGUNAKAN UNIVERSAL SIGNATURE ENGINE */}
        <div className="mt-4 pt-1 w-full">
          <UniversalDocumentSignatures
            layout="triangle_rapor"
            titimangsaCity={sekolahData?.kota || 'Purwakarta'}
            titimangsaDate={auditDate}
            overrideSignerLeft={{
              roleTitle: 'Petugas Operator Dapodik,\nUnit Kerja Tata Usaha',
              personName: 'OPERATOR DAPODIK SEKOLAH',
            }}
            overrideSignerRight={{
              roleTitle: 'Kepala Urusan Tata Usaha,',
              personName: 'KEPALA TATA USAHA',
              nip: '199401352010011134',
            }}
            overrideSignerCenter={{
              roleTitle: `Mengetahui,\nKepala ${sekolahData?.nama || tenantInfo.name}`,
              personName: sekolahData?.kepala_sekolah || 'KEPALA SEKOLAH',
              nip: sekolahData?.nip_kepala,
            }}
            spacingHeightMm={14}
          />
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

export default DapodikBeritaAcaraPrintModal;
