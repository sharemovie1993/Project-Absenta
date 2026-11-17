import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { ScoreRow } from './types';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { Button, Input, Label, DigitalSignaturePadModal, DigitalSignatureField } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  Check,
  AlertCircle,
  FileText,
  UserCheck,
  Award,
  PenTool,
  RotateCcw,
  Download,
  Settings,
  Printer,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PklDudiDocType = 'REKAP_DUDI' | 'BLANKO_PENILAIAN';

export interface PklDudiCetakModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRow[];
  jurusanId?: string;
  jurusanNama?: string;
  selectedTpNama?: string;
  selectedSemesterNama?: string;
  activePembimbingNama?: string;
  isKaprog?: boolean;
  initialDocType?: PklDudiDocType;
}

export const PklDudiCetakModal: React.FC<PklDudiCetakModalProps> = ({
  isOpen,
  onClose,
  scores,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  selectedTpNama = '',
  selectedSemesterNama = '',
  activePembimbingNama = '',
  isKaprog = false,
  initialDocType = 'REKAP_DUDI',
}) => {
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const { rawList: allJurusanListRaw } = useJurusanOptions();
  const allJurusanList = useMemo(() => allJurusanListRaw || [], [allJurusanListRaw]);
  const { rawList: rawGuruList } = useGuruOptions({ jenisPtk: 'ALL', onlyActive: false });
  const guruList = useMemo(() => rawGuruList || [], [rawGuruList]);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Sanitasi label TP dan Semester (hapus emoji bintang aktif ⭐/★/* agar dokumen resmi bersih)
  const cleanTpNama = useMemo(() => {
    return (selectedTpNama || '').replace(/[⭐★*✨]/g, '').trim();
  }, [selectedTpNama]);

  const cleanSemesterNama = useMemo(() => {
    return (selectedSemesterNama || '').replace(/[⭐★*✨]/g, '').trim();
  }, [selectedSemesterNama]);

  const [docType, setDocType] = useState<PklDudiDocType>(initialDocType);

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [initialDocType]);

  // Resolusi Jurusan Aktif
  const activeJurusanNama = useMemo(() => {
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian' && propJurusanNama !== 'ALL') {
      return propJurusanNama;
    }
    if (propJurusanId && propJurusanId !== 'ALL') {
      const found = allJurusanList.find((j) => j.id === propJurusanId);
      if (found) return found.nama || (found as any).nama_jurusan;
    }
    return 'Semua Program Keahlian';
  }, [propJurusanId, propJurusanNama, allJurusanList]);

  // Tanggal Dokumen
  const [tanggalCetak, setTanggalCetak] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  const [kotaCetak, setKotaCetak] = useState<string>(() => {
    return tenantInfo?.alamat_kota || rawSekolah?.kabupaten_kota || 'Bandung';
  });

  // Tanda Tangan: Guru Pembimbing, Kaprog, dan Waka Hubin
  const { signers, updateSigner } = useDocumentSigners({
    roles: ['PEMBINTING_PKL', 'KAPROG', 'WAKA_HUBIN'],
    jurusanId: propJurusanId !== 'ALL' ? propJurusanId : undefined,
  });

  const pembimbingSigner = signers.find((s) => s.role === 'PEMBINTING_PKL') || {
    name: activePembimbingNama || 'Guru Pembimbing PKL',
    nip: '-',
    title: 'Guru Pembimbing PKL',
  };

  const kaprogSigner = signers.find((s) => s.role === 'KAPROG') || {
    name: 'Ketua Program Keahlian',
    nip: '-',
    title: `Ketua Program Keahlian ${activeJurusanNama !== 'Semua Program Keahlian' ? activeJurusanNama : ''}`,
  };

  const hubinSigner = signers.find((s) => s.role === 'WAKA_HUBIN') || {
    name: 'Wakasek Hubungan Industri',
    nip: '-',
    title: 'Wakasek Bidang Hubungan Industri',
  };

  // Handler PDF Export
  const handleExportPdf = async () => {
    if (!printSheetRef.current) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Menyiapkan file PDF resmi...');
    try {
      const blob = await capturePrintSheetsToPdfBlob(printSheetRef.current, {
        orientation: 'landscape',
        format: 'a4',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Nilai_PKL_DUDI_${activePembimbingNama ? activePembimbingNama.replace(/\s+/g, '_') : 'Sekolah'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('File PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      toast.error('Gagal membuat PDF', { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Rekapitulasi Nilai PKL Industri (DU/DI)"
      subtitle={`Tahun Ajaran ${cleanTpNama || 'Aktif'} • ${activeJurusanNama}`}
      onExportPdf={handleExportPdf}
      isExportingPdf={isGeneratingPdf}
      actions={
        <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setDocType('REKAP_DUDI')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer',
              docType === 'REKAP_DUDI'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Rekap Nilai DU/DI
          </button>
          <button
            type="button"
            onClick={() => setDocType('BLANKO_PENILAIAN')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer',
              docType === 'BLANKO_PENILAIAN'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Blanko Instrumen
          </button>
        </div>
      }
    >
      <div ref={printSheetRef} className="space-y-6">
        <PrintDocumentSheet
          orientation="landscape"
          className="bg-white text-black p-8 font-serif leading-normal"
        >
          {/* KOP SURAT RESMI */}
          <PrintHeader />

          {/* JUDUL DOKUMEN */}
          <div className="text-center my-4 pb-2 border-b-2 border-black">
            <h2 className="text-base font-bold uppercase tracking-wider">
              {docType === 'BLANKO_PENILAIAN'
                ? 'INSTRUMEN PENILAIAN PRAKTIK KERJA LAPANGAN (PKL) OLEH DU/DI'
                : 'REKAPITULASI NILAI PRAKTIK KERJA LAPANGAN (PKL) DU/DI'}
            </h2>
            <p className="text-xs font-semibold mt-1">
              TAHUN PELAJARAN {cleanTpNama || '2026/2027'} {cleanSemesterNama ? `• SEMESTER ${cleanSemesterNama.toUpperCase()}` : ''}
            </p>
          </div>

          {/* META DATA SCOPE */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <div>
              <div className="flex">
                <span className="w-36 font-semibold">Program Keahlian</span>
                <span>: {activeJurusanNama}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold">Guru Pembimbing</span>
                <span>: {activePembimbingNama || 'Semua Pembimbing'}</span>
              </div>
            </div>
            <div>
              <div className="flex">
                <span className="w-36 font-semibold">Jumlah Siswa</span>
                <span>: {scores.length} Orang</span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold">Waktu Pelaksanaan</span>
                <span>: Semester {cleanSemesterNama || 'Ganjil'}</span>
              </div>
            </div>
          </div>

          {/* TABEL DATA NILAI DUDI */}
          <table className="w-full text-[11px] border-collapse border border-black text-center mb-6">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black">
                <th rowSpan={2} className="border border-black p-1 w-8">No</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[130px] text-left">Nama Siswa</th>
                <th rowSpan={2} className="border border-black p-1 w-20">NIS / Kelas</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[120px] text-left">Mitra Industri (DU/DI)</th>
                <th colSpan={3} className="border border-black p-1">Hard Skill (Kompetensi Teknis)</th>
                <th colSpan={5} className="border border-black p-1">Soft Skill (Karakter & Etika Kerja)</th>
                <th rowSpan={2} className="border border-black p-1 w-12">Rata2</th>
                <th rowSpan={2} className="border border-black p-1 w-12">Predikat</th>
              </tr>
              <tr className="bg-slate-50 font-bold border-b border-black text-[10px]">
                <th className="border border-black p-1 w-10" title="Kompetensi Teknis">Teknis</th>
                <th className="border border-black p-1 w-10" title="SOP & K3LH">K3LH</th>
                <th className="border border-black p-1 w-10" title="Alur Bisnis">Bisnis</th>
                <th className="border border-black p-1 w-9" title="Disiplin">Dis</th>
                <th className="border border-black p-1 w-9" title="Kerajinan & Inisiatif">Ini</th>
                <th className="border border-black p-1 w-9" title="Kerjasama">K.Sm</th>
                <th className="border border-black p-1 w-9" title="Kejujuran">Juj</th>
                <th className="border border-black p-1 w-9" title="Tanggung Jawab">T.Jwb</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, idx) => {
                const isBlank = docType === 'BLANKO_PENILAIAN';
                const aspects = [
                  s.hard_kompetensi_teknis, s.hard_sop_k3lh, s.hard_alur_bisnis,
                  s.soft_kedisiplinan, s.soft_kerajinan_inisiatif, s.soft_kerjasama,
                  s.soft_kejujuran, s.soft_tanggung_jawab
                ].filter((v): v is number => typeof v === 'number' && v !== null);

                const avg = aspects.length > 0 ? (aspects.reduce((a, b) => a + b, 0) / aspects.length).toFixed(1) : '-';

                return (
                  <tr key={s.siswa_pkl_id || idx} className="border-b border-black">
                    <td className="border border-black p-1">{idx + 1}</td>
                    <td className="border border-black p-1 text-left font-semibold">{s.nama_siswa}</td>
                    <td className="border border-black p-1 font-mono text-[10px]">{s.nis}<br/>{s.nama_kelas}</td>
                    <td className="border border-black p-1 text-left truncate max-w-[120px]">{s.mitra_nama}</td>
                    
                    {/* Hard Skill */}
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.hard_kompetensi_teknis ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.hard_sop_k3lh ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.hard_alur_bisnis ?? '-')}</td>

                    {/* Soft Skill */}
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.soft_kedisiplinan ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.soft_kerajinan_inisiatif ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.soft_kerjasama ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.soft_kejujuran ?? '-')}</td>
                    <td className="border border-black p-1 font-mono">{isBlank ? '' : (s.soft_tanggung_jawab ?? '-')}</td>

                    {/* Nilai Akhir & Predikat */}
                    <td className="border border-black p-1 font-bold font-mono bg-slate-50">{isBlank ? '' : avg}</td>
                    <td className="border border-black p-1 font-bold text-[10px]">{isBlank ? '' : (s.predikat_pkl || '-')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TANDA TANGAN RESMI (PEMBIMBING, KAPROG, WAKA HUBIN) */}
          <div className="mt-8 pt-4 break-inside-avoid">
            <div className="text-right text-xs mb-4">
              <span>{kotaCetak}, {tanggalCetak}</span>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              {/* Pembimbing */}
              <div className="space-y-16">
                <div>
                  <p className="font-semibold">Guru Pembimbing PKL,</p>
                </div>
                <div>
                  <p className="font-bold underline uppercase">{pembimbingSigner.name}</p>
                  <p className="text-[10px] text-slate-600">NIP. {pembimbingSigner.nip || '-'}</p>
                </div>
              </div>

              {/* Ketua Program Keahlian */}
              <div className="space-y-16">
                <div>
                  <p className="font-semibold">Mengetahui,</p>
                  <p className="font-semibold">Ketua Program Keahlian,</p>
                </div>
                <div>
                  <p className="font-bold underline uppercase">{kaprogSigner.name}</p>
                  <p className="text-[10px] text-slate-600">NIP. {kaprogSigner.nip || '-'}</p>
                </div>
              </div>

              {/* Waka Hubin */}
              <div className="space-y-16">
                <div>
                  <p className="font-semibold">Mengetahui,</p>
                  <p className="font-semibold">Wakasek Hubungan Industri,</p>
                </div>
                <div>
                  <p className="font-bold underline uppercase">{hubinSigner.name}</p>
                  <p className="text-[10px] text-slate-600">NIP. {hubinSigner.nip || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
