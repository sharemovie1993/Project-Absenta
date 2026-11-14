import React, { useState, useMemo, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { ScoreRow } from './types';
import { Check, AlertCircle, FileText, UserCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PklSidangCetakModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRow[];
  jurusanNama?: string;
  selectedTpNama?: string;
  selectedSemesterNama?: string;
  activePengujiNama?: string;
  isKaprog?: boolean;
}

export const PklSidangCetakModal: React.FC<PklSidangCetakModalProps> = ({
  isOpen,
  onClose,
  scores,
  jurusanNama = 'Semua Program Keahlian',
  selectedTpNama = '',
  selectedSemesterNama = '',
  activePengujiNama = '',
  isKaprog = false,
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Mode Dokumen: 'PENGUJI' (Berita Acara Penguji) | 'JURUSAN' (Rekap Hasil Sidang Jurusan)
  const [docType, setDocType] = useState<'PENGUJI' | 'JURUSAN'>(() => {
    return isKaprog ? 'JURUSAN' : 'PENGUJI';
  });

  // Filter Penguji & Kelas dalam Modal
  const pengujiList = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s) => {
      if (s.penguji_nama) set.add(s.penguji_nama);
    });
    return Array.from(set).sort();
  }, [scores]);

  const [selectedPengujiFilter, setSelectedPengujiFilter] = useState<string>(() => {
    if (activePengujiNama && pengujiList.includes(activePengujiNama)) {
      return activePengujiNama;
    }
    return pengujiList[0] || 'ALL';
  });

  const kelasList = useMemo(() => {
    const set = new Set<string>();
    scores.forEach((s) => {
      if (s.nama_kelas) set.add(s.nama_kelas);
    });
    return Array.from(set).sort();
  }, [scores]);

  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');

  // Filter Siswa yang tampil di dokumen cetak
  const filteredScores = useMemo(() => {
    return scores.filter((s) => {
      if (docType === 'PENGUJI' && selectedPengujiFilter !== 'ALL') {
        if (s.penguji_nama !== selectedPengujiFilter) return false;
      }
      if (selectedKelasFilter !== 'ALL' && s.nama_kelas !== selectedKelasFilter) {
        return false;
      }
      return true;
    });
  }, [scores, docType, selectedPengujiFilter, selectedKelasFilter]);

  // Statistik Hasil Sidang
  const stats = useMemo(() => {
    const total = filteredScores.length;
    let lulus = 0;
    let revisi = 0;
    let belum = 0;
    let totalScore = 0;
    let countScored = 0;

    filteredScores.forEach((s) => {
      if (s.nilai_sidang !== null && s.nilai_sidang !== undefined && s.nilai_sidang !== '') {
        const num = Number(s.nilai_sidang);
        totalScore += num;
        countScored++;
        if (num >= 70) lulus++;
        else revisi++;
      } else {
        belum++;
      }
    });

    const avg = countScored > 0 ? (totalScore / countScored).toFixed(1) : '-';
    return { total, lulus, revisi, belum, avg, countScored };
  }, [filteredScores]);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const documentTitle = docType === 'PENGUJI'
    ? 'BERITA ACARA & LEMBAR PENILAIAN UJIAN SIDANG PKL'
    : 'REKAPITULASI HASIL UJIAN SIDANG PRAKTIK KERJA LAPANGAN (PKL)';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Berkas Hasil Sidang PKL"
      defaultVariant="landscape"
      allowLogoToggles={true}
      pdfFileName={
        docType === 'PENGUJI'
          ? `Berita_Acara_Sidang_PKL_${selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter.replace(/\s+/g, '_') : 'Penguji'}`
          : `Rekap_Hasil_Sidang_PKL_${jurusanNama.replace(/\s+/g, '_')}`
      }
      customToolbarContent={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Jenis Dokumen */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setDocType('PENGUJI')}
              className={cn(
                'px-2.5 py-1 rounded-md font-bold transition-all',
                docType === 'PENGUJI'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Format Penguji (Berita Acara)
            </button>
            <button
              type="button"
              onClick={() => setDocType('JURUSAN')}
              className={cn(
                'px-2.5 py-1 rounded-md font-bold transition-all',
                docType === 'JURUSAN'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Format Jurusan (Rekap Hasil)
            </button>
          </div>

          {/* Filter Penguji (Jika Format Penguji) */}
          {docType === 'PENGUJI' && pengujiList.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Penguji:</span>
              <select
                value={selectedPengujiFilter}
                onChange={(e) => setSelectedPengujiFilter(e.target.value)}
                className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">Semua Guru Penguji</option>
                {pengujiList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Kelas */}
          {kelasList.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Kelas:</span>
              <select
                value={selectedKelasFilter}
                onChange={(e) => setSelectedKelasFilter(e.target.value)}
                className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      }
    >
      <div ref={printSheetRef} className="space-y-6">
        <PrintDocumentSheet variant="landscape" className="p-8 text-black bg-white">
          {/* KOP RESMI SEKOLAH */}
          <PrintHeader
            variant="landscape"
            tenantInfo={tenantInfo}
            showLogoDaerah={true}
            showLogoSekolah={true}
            showDivider={true}
            className="mb-3"
          />

          {/* JUDUL DOKUMEN & SUB-METADATA */}
          <div className="text-center my-3 space-y-1">
            <h1 className="text-sm font-bold tracking-wide uppercase underline">
              {documentTitle}
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              Tahun Ajaran {selectedTpNama || '-'} {selectedSemesterNama ? `• Semester ${selectedSemesterNama}` : ''}
            </p>
          </div>

          {/* METADATA INFO TABLE */}
          <div className="grid grid-cols-2 gap-4 text-[11px] mb-3 border-b border-black/20 pb-2">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-semibold">Program Keahlian</span>
                <span className="w-3">:</span>
                <span className="font-bold uppercase">{jurusanNama}</span>
              </div>
              {docType === 'PENGUJI' && (
                <div className="flex">
                  <span className="w-32 font-semibold">Guru Penguji</span>
                  <span className="w-3">:</span>
                  <span className="font-bold">{selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua Penguji'}</span>
                </div>
              )}
              {selectedKelasFilter !== 'ALL' && (
                <div className="flex">
                  <span className="w-32 font-semibold">Rombel / Kelas</span>
                  <span className="w-3">:</span>
                  <span>{selectedKelasFilter}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-end gap-1">
                <span className="font-semibold">Jumlah Peserta Terdata:</span>
                <span className="font-bold font-mono">{stats.total} Siswa</span>
              </div>
              <div className="flex justify-end gap-3 text-[10px]">
                <span className="text-emerald-700 font-bold">Lulus: {stats.lulus}</span>
                <span className="text-amber-700 font-bold">Revisi: {stats.revisi}</span>
                <span className="text-slate-500 font-medium">Belum Diuji: {stats.belum}</span>
                <span className="text-indigo-700 font-bold font-mono">Rata-rata: {stats.avg}</span>
              </div>
            </div>
          </div>

          {/* TABEL DATA HASIL SIDANG DENGAN 4 ASPEK */}
          <table className="w-full text-[10px] border-collapse border border-black mb-4">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-7">No</th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 w-20">NIS / NISN</th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[130px]">Nama Lengkap Siswa</th>
                <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-16">Kelas</th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[120px]">Tempat PKL (DUDI)</th>
                {docType === 'JURUSAN' && (
                  <th rowSpan={2} className="border border-black px-2 py-1.5 text-left w-28">Guru Penguji</th>
                )}
                <th colSpan={4} className="border border-black px-1 py-1">
                  Komponen Penilaian Aspek Sidang PKL
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-12 bg-indigo-50/80">
                  Nilai Sidang
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-14">Status</th>
                <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[110px]">
                  Catatan Penguji / Revisi
                </th>
              </tr>
              <tr className="bg-slate-50 text-center font-semibold text-[9px]">
                <th className="border border-black px-1 py-1 w-12" title="Penguasaan Materi & Problem Solving">
                  Materi<br/>(40%)
                </th>
                <th className="border border-black px-1 py-1 w-12" title="Penyampaian & Komunikasi Lisan">
                  Komunikasi<br/>(25%)
                </th>
                <th className="border border-black px-1 py-1 w-12" title="Kualitas Laporan & Media Paparan">
                  Portofolio<br/>(20%)
                </th>
                <th className="border border-black px-1 py-1 w-12" title="Etika, Sikap & Karakter Kerja">
                  Sikap<br/>(15%)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={docType === 'JURUSAN' ? 12 : 11} className="border border-black p-4 text-center italic text-slate-500">
                    Tidak ada data sidang siswa yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredScores.map((row, idx) => {
                  const hasExamined = row.nilai_sidang !== null && row.nilai_sidang !== undefined && row.nilai_sidang !== '';
                  const isLulus = hasExamined && Number(row.nilai_sidang) >= 70;

                  return (
                    <tr key={row.siswa_pkl_id || idx} className="hover:bg-slate-50/50">
                      <td className="border border-black px-1 py-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black px-1.5 py-1 font-mono text-center">{row.nis || '-'}</td>
                      <td className="border border-black px-2 py-1 font-semibold">{row.nama_siswa}</td>
                      <td className="border border-black px-1.5 py-1 text-center">{row.nama_kelas || '-'}</td>
                      <td className="border border-black px-2 py-1 truncate max-w-[130px]">{row.mitra_nama || '-'}</td>
                      {docType === 'JURUSAN' && (
                        <td className="border border-black px-2 py-1 truncate max-w-[110px]">{row.penguji_nama || '-'}</td>
                      )}
                      {/* 4 Komponen Aspek */}
                      <td className="border border-black px-1 py-1 text-center font-mono">
                        {row.sidang_materi ?? '-'}
                      </td>
                      <td className="border border-black px-1 py-1 text-center font-mono">
                        {row.sidang_komunikasi ?? '-'}
                      </td>
                      <td className="border border-black px-1 py-1 text-center font-mono">
                        {row.sidang_portofolio ?? '-'}
                      </td>
                      <td className="border border-black px-1 py-1 text-center font-mono">
                        {row.sidang_sikap ?? '-'}
                      </td>
                      {/* Nilai Sidang */}
                      <td className="border border-black px-1 py-1 text-center font-mono font-bold bg-indigo-50/40">
                        {row.nilai_sidang ?? '-'}
                      </td>
                      {/* Status */}
                      <td className="border border-black px-1 py-1 text-center font-bold text-[9px]">
                        {!hasExamined ? (
                          <span className="text-slate-400">Belum</span>
                        ) : isLulus ? (
                          <span className="text-emerald-700">LULUS</span>
                        ) : (
                          <span className="text-amber-700">REVISI</span>
                        )}
                      </td>
                      {/* Catatan Revisi */}
                      <td className="border border-black px-2 py-1 text-[9px] italic text-slate-700">
                        {row.catatan_sidang || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* CATATAN & AMBANG KELULUSAN */}
          <div className="text-[9px] text-slate-600 mb-6 space-y-0.5">
            <p className="font-semibold">* Kriteria Ketuntasan Minimal (KKM) Sidang PKL: 70,00.</p>
            <p>* Siswa dengan status REVISI wajib menyelesaikan perbaikan laporan/portofolio paling lambat 7 hari kerja setelah tanggal ujian sidang.</p>
          </div>

          {/* TANDA TANGAN RESMI (2-TIER) */}
          <div className="grid grid-cols-2 gap-8 text-[11px] pt-2 break-inside-avoid">
            {docType === 'PENGUJI' ? (
              <>
                <div className="space-y-16">
                  <div>
                    <p className="font-semibold">Mengetahui,</p>
                    <p className="font-bold">Ketua Program Keahlian</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">( ............................................................ )</p>
                    <p className="text-[10px] text-slate-600 font-mono">NIP. .....................................................</p>
                  </div>
                </div>

                <div className="space-y-16 text-right">
                  <div>
                    <p>{tenantInfo.address ? tenantInfo.address.split(',')[0] : 'Tempat'}, {currentDateFormatted}</p>
                    <p className="font-bold">Guru Penguji Sidang PKL</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">
                      {selectedPengujiFilter !== 'ALL' ? `( ${selectedPengujiFilter} )` : '( ............................................................ )'}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">NIP. .....................................................</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-16">
                  <div>
                    <p className="font-semibold">Mengetahui / Menyetujui,</p>
                    <p className="font-bold">Wakil Kepala Sekolah Bidang Hubin</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">( ............................................................ )</p>
                    <p className="text-[10px] text-slate-600 font-mono">NIP. .....................................................</p>
                  </div>
                </div>

                <div className="space-y-16 text-right">
                  <div>
                    <p>{tenantInfo.address ? tenantInfo.address.split(',')[0] : 'Tempat'}, {currentDateFormatted}</p>
                    <p className="font-bold">Ketua Program Keahlian ({jurusanNama})</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">( ............................................................ )</p>
                    <p className="text-[10px] text-slate-600 font-mono">NIP. .....................................................</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};

export default PklSidangCetakModal;
