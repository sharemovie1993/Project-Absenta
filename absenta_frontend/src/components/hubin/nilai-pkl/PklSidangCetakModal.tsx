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
import { Button, Input, Label } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Check, AlertCircle, FileText, UserCheck, Award, PenTool, RotateCcw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PklSidangCetakModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRow[];
  jurusanId?: string;
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
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  selectedTpNama = '',
  selectedSemesterNama = '',
  activePengujiNama = '',
  isKaprog = false,
}) => {
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const { rawList: allJurusanListRaw } = useJurusanOptions();
  const allJurusanList = useMemo(() => allJurusanListRaw || [], [allJurusanListRaw]);
  const { rawList: rawGuruList } = useGuruOptions({ jenisPtk: 'ALL', onlyActive: false });
  const guruList = useMemo(() => rawGuruList || [], [rawGuruList]);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Mode Dokumen: 'PENGUJI' (Berita Acara Penguji) | 'JURUSAN' (Rekap Hasil Sidang Jurusan)
  const [docType, setDocType] = useState<'PENGUJI' | 'JURUSAN'>(() => {
    return isKaprog ? 'JURUSAN' : 'PENGUJI';
  });

  // =========================================================================
  // 1. RESOLUSI PROGRAM KEAHLIAN YANG AKURAT (SSOT)
  // =========================================================================
  const availableJurusanList = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; singkatan: string }>();

    scores.forEach((s) => {
      let jId = s.jurusan_id;
      let jNama = s.nama_jurusan;
      let jSingkatan = s.singkatan_jurusan;

      // 1. Cocokkan dari allJurusanList via ID
      if (jId && !jNama) {
        const found = (allJurusanList || []).find((j) => j.id === jId);
        if (found) {
          jNama = found.nama || (found as any).nama_jurusan;
          jSingkatan = found.singkatan || (found as any).kode;
        }
      }

      // 2. Deteksi cerdas dari nama kelas siswa (contoh "XII AK 1" -> "AK")
      if (!jNama && s.nama_kelas) {
        const parts = s.nama_kelas.trim().split(/[\s-]+/);
        const codeCandidate = parts.length >= 2 ? parts[1].toUpperCase() : '';
        if (codeCandidate) {
          const found = (allJurusanList || []).find((j) => {
            const sKode = (j.singkatan || (j as any).kode || (j as any).kode_jurusan || '').toUpperCase();
            const sNama = (j.nama || (j as any).nama_jurusan || '').toUpperCase();
            return sKode === codeCandidate || sNama.includes(codeCandidate);
          });
          if (found) {
            jId = found.id;
            jNama = found.nama || (found as any).nama_jurusan;
            jSingkatan = found.singkatan || (found as any).kode;
          }
        }
      }

      if (jNama) {
        const key = jId || jNama;
        if (!map.has(key)) {
          map.set(key, {
            id: jId || key,
            nama: jNama,
            singkatan: jSingkatan || '',
          });
        }
      }
    });

    return Array.from(map.values());
  }, [scores, allJurusanList]);

  // Default filter jurusan: jika propJurusanId ada, pakai itu. Jika siswa hanya dari 1 jurusan, kunci ke jurusan tersebut.
  const [selectedJurusanFilter, setSelectedJurusanFilter] = useState<string>(() => {
    if (propJurusanId) return propJurusanId;
    if (availableJurusanList.length === 1) return availableJurusanList[0].id;
    return 'ALL';
  });

  // Sinkronisasi saat availableJurusanList berubah
  useEffect(() => {
    if (propJurusanId) {
      setSelectedJurusanFilter(propJurusanId);
    } else if (availableJurusanList.length === 1) {
      setSelectedJurusanFilter(availableJurusanList[0].id);
    }
  }, [availableJurusanList, propJurusanId]);

  // Program Keahlian Aktif yang Terpilih
  const activeJurusanObj = useMemo(() => {
    if (selectedJurusanFilter !== 'ALL') {
      const foundAvailable = (availableJurusanList || []).find((j) => j.id === selectedJurusanFilter);
      if (foundAvailable) return foundAvailable;
      const foundAll = (allJurusanList || []).find((j) => j.id === selectedJurusanFilter);
      if (foundAll) {
        return {
          id: foundAll.id,
          nama: foundAll.nama || (foundAll as any).nama_jurusan,
          singkatan: foundAll.singkatan || (foundAll as any).kode || '',
        };
      }
    }
    // Jika hanya 1 jurusan dalam data scores
    if (availableJurusanList.length === 1) {
      return availableJurusanList[0];
    }
    // Jika propJurusanNama diberikan secara eksplisit
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian' && propJurusanNama !== 'Kejuruan') {
      return { id: propJurusanId || '', nama: propJurusanNama, singkatan: '' };
    }
    return null;
  }, [selectedJurusanFilter, availableJurusanList, allJurusanList, propJurusanNama, propJurusanId]);

  const displayJurusanTitle = useMemo(() => {
    if (activeJurusanObj) {
      return `${activeJurusanObj.nama}${activeJurusanObj.singkatan ? ` (${activeJurusanObj.singkatan})` : ''}`.toUpperCase();
    }
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian') {
      return propJurusanNama.toUpperCase();
    }
    return 'SEMUA PROGRAM KEAHLIAN';
  }, [activeJurusanObj, propJurusanNama]);

  // =========================================================================
  // 2. FILTER PENGUJI & KELAS DALAM MODAL
  // =========================================================================
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
      // Filter Jurusan jika dipilih spesifik
      if (selectedJurusanFilter !== 'ALL') {
        const matchId = s.jurusan_id === selectedJurusanFilter;
        let matchClass = false;
        if (s.nama_kelas) {
          const target = (availableJurusanList || []).find((j) => j.id === selectedJurusanFilter);
          if (target?.singkatan) {
            matchClass = s.nama_kelas.toUpperCase().includes(target.singkatan.toUpperCase());
          }
        }
        if (!matchId && !matchClass) return false;
      }
      // Filter Penguji
      if (docType === 'PENGUJI' && selectedPengujiFilter !== 'ALL') {
        if (s.penguji_nama !== selectedPengujiFilter) return false;
      }
      // Filter Kelas
      if (selectedKelasFilter !== 'ALL' && s.nama_kelas !== selectedKelasFilter) {
        return false;
      }
      return true;
    });
  }, [scores, selectedJurusanFilter, availableJurusanList, docType, selectedPengujiFilter, selectedKelasFilter]);

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

  // Titimangsa & Tanggal Dokumen
  const titimangsaCity = useMemo(() => {
    if (tenantInfo.address) {
      const parts = tenantInfo.address.split(',');
      const candidate = parts[parts.length - 1]?.trim() || parts[0]?.trim();
      return candidate.replace(/^kabupaten\s+|^kab\.\s+|^kota\s+/i, '').trim();
    }
    return 'Tempat';
  }, [tenantInfo.address]);

  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // =========================================================================
  // 3. AUTO-RESOLVING STRUKTUR PENANDATANGAN 2-TIER
  // =========================================================================
  const effectiveJurusanIdForSigners = activeJurusanObj?.id || propJurusanId;
  const signersHook = useDocumentSigners({
    jurusanId: effectiveJurusanIdForSigners,
  });

  // Temukan guru penguji aktif dan NIP-nya
  const currentPengujiObj = useMemo(() => {
    const targetName = selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : activePengujiNama;
    if (!targetName) return null;
    return (guruList || []).find((g) => g.nama_guru?.trim().toLowerCase() === targetName.trim().toLowerCase()) || null;
  }, [guruList, selectedPengujiFilter, activePengujiNama]);

  // Default Signers Data
  const defaultSigners = useMemo(() => {
    // 1. Kaprog
    let kaprogNama = signersHook.kaprog?.personName || '';
    let kaprogNip = signersHook.kaprog?.nip || '-';
    if (!kaprogNama || kaprogNama === 'Ketua Program Keahlian' || !signersHook.kaprog?.isAssigned) {
      kaprogNama = 'Ketua Program Keahlian';
      kaprogNip = '-';
    }

    // 2. Guru Penguji
    const pengujiNama = selectedPengujiFilter !== 'ALL'
      ? selectedPengujiFilter
      : (activePengujiNama || 'Guru Penguji');
    const pengujiNip = currentPengujiObj?.nip || '-';

    // 3. Waka Hubin
    let wakaHubinNama = signersHook.wakaHubin?.personName || '';
    let wakaHubinNip = signersHook.wakaHubin?.nip || '-';
    if (!wakaHubinNama || wakaHubinNama === 'Wakasek Bidang Hubin' || !signersHook.wakaHubin?.isAssigned) {
      wakaHubinNama = 'Wakil Kepala Sekolah Bidang Hubin';
      wakaHubinNip = '-';
    }

    // 4. Kepala Sekolah
    const kepsekNama = tenantInfo.kepala_sekolah || rawSekolah?.kepala_sekolah || signersHook.kepsek?.personName || 'Kepala Sekolah';
    const kepsekNip = tenantInfo.nip_kepala || rawSekolah?.nip_kepala || signersHook.kepsek?.nip || '-';

    return {
      kaprog: { nama: kaprogNama, nip: kaprogNip },
      penguji: { nama: pengujiNama, nip: pengujiNip },
      wakaHubin: { nama: wakaHubinNama, nip: wakaHubinNip },
      kepsek: { nama: kepsekNama, nip: kepsekNip },
    };
  }, [signersHook, tenantInfo, rawSekolah, selectedPengujiFilter, activePengujiNama, currentPengujiObj]);

  // State Override Penandatangan (Disediakan Drawer/Modal Edit sesuai standar skill)
  const [customSigners, setCustomSigners] = useState(defaultSigners);
  const [showEditSigners, setShowEditSigners] = useState(false);

  // Perbarui saat default data berubah
  useEffect(() => {
    setCustomSigners(defaultSigners);
  }, [defaultSigners]);

  const handleResetSigners = () => {
    setCustomSigners(defaultSigners);
    toast.info('Data penandatangan dikembalikan ke konfigurasi resmi sistem.');
  };

  // =========================================================================
  // 4. TRUE WYSIWYG EXPORT PDF
  // =========================================================================
  const pdfFileName = useMemo(() => {
    const cleanJurusan = displayJurusanTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPenguji = (selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua_Penguji').replace(/[^a-zA-Z0-9]/g, '_');
    return docType === 'PENGUJI'
      ? `Berita_Acara_Sidang_PKL_${cleanJurusan}_${cleanPenguji}`
      : `Rekap_Hasil_Sidang_PKL_${cleanJurusan}`;
  }, [docType, displayJurusanTitle, selectedPengujiFilter]);

  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) {
      toast.error('Lembar dokumen tidak ditemukan.');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      toast.info('Sedang merender lembar dokumen ke berkas PDF True WYSIWYG...', { duration: 3000 });
      const res = await capturePrintSheetsToPdfBlob(printSheetRef.current, {
        orientation: 'landscape',
        fileName: pdfFileName,
        scale: 2.5,
      });

      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dokumen PDF berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membuat file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const documentTitle = docType === 'PENGUJI'
    ? 'BERITA ACARA & LEMBAR PENILAIAN UJIAN SIDANG PKL'
    : 'REKAPITULASI HASIL UJIAN SIDANG PRAKTIK KERJA LAPANGAN (PKL)';

  return (
    <>
      <UniversalDocumentModal
        isOpen={isOpen}
        onClose={onClose}
        title="Cetak Berkas Hasil Sidang PKL"
        defaultVariant="landscape"
        allowLogoToggles={true}
        onDownloadPdf={handleDownloadPdf}
        downloadPdfText={isGeneratingPdf ? 'Memproses...' : 'Unduh PDF'}
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

            {/* Filter Jurusan / Program Keahlian jika lebih dari 1 */}
            {availableJurusanList.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Program Keahlian:</span>
                <select
                  value={selectedJurusanFilter}
                  onChange={(e) => setSelectedJurusanFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Program Keahlian</option>
                  {availableJurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} {j.singkatan ? `(${j.singkatan})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

            {/* Tombol Sesuaikan Penandatangan */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditSigners(true)}
              className="text-xs gap-1.5 h-8 px-2.5 border-dashed border-slate-300 dark:border-slate-600"
              title="Sesuaikan nama dan NIP pejabat penandatangan bila ada Plt/Pengganti"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pejabat TTD</span>
            </Button>
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
                  <span className="w-36 font-semibold">Program Keahlian</span>
                  <span className="w-3">:</span>
                  <span className="font-bold uppercase tracking-tight text-slate-900">
                    {displayJurusanTitle}
                  </span>
                </div>
                {docType === 'PENGUJI' && (
                  <div className="flex">
                    <span className="w-36 font-semibold">Guru Penguji</span>
                    <span className="w-3">:</span>
                    <span className="font-bold">
                      {selectedPengujiFilter !== 'ALL' ? selectedPengujiFilter : 'Semua Guru Penguji'}
                    </span>
                  </div>
                )}
                {selectedKelasFilter !== 'ALL' && (
                  <div className="flex">
                    <span className="w-36 font-semibold">Rombel / Kelas</span>
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
                    <td colSpan={docType === 'JURUSAN' ? 11 : 10} className="border border-black p-4 text-center italic text-slate-500">
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

            {/* TANDA TANGAN RESMI 2-TIER (UNIVERSAL INDUSTRIAL STANDARD) */}
            <div className="space-y-6 pt-3 break-inside-avoid">
              {docType === 'PENGUJI' ? (
                <>
                  {/* Baris 1: Kiri (Kaprog) & Kanan (Guru Penguji + Titimangsa) */}
                  <div className="flex items-start justify-between w-full text-[11px]">
                    <div className="w-[85mm] text-left space-y-14">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Ketua Program Keahlian
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium">
                          {displayJurusanTitle}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.kaprog.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.kaprog.nip || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="w-[85mm] text-right space-y-14">
                      <div>
                        <p className="text-slate-700">
                          {titimangsaCity}, {currentDateFormatted}
                        </p>
                        <p className="font-bold uppercase tracking-tight">
                          Guru Penguji Sidang PKL
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.penguji.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.penguji.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Baris 2: Tengah Bawah (Wakil Kepala Sekolah Bidang Hubin) */}
                  <div className="flex flex-col items-center justify-center text-center w-full pt-1">
                    <div className="w-[95mm] space-y-14">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Wakil Kepala Sekolah Bidang Hubungan Industri
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.wakaHubin.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.wakaHubin.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Format Jurusan: Baris 1 Kiri (Waka Hubin) & Kanan (Kaprog + Titimangsa) */}
                  <div className="flex items-start justify-between w-full text-[11px]">
                    <div className="w-[85mm] text-left space-y-14">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Wakil Kepala Sekolah Bidang Hubungan Industri
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.wakaHubin.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.wakaHubin.nip || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="w-[85mm] text-right space-y-14">
                      <div>
                        <p className="text-slate-700">
                          {titimangsaCity}, {currentDateFormatted}
                        </p>
                        <p className="font-bold uppercase tracking-tight">
                          Ketua Program Keahlian
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium">
                          {displayJurusanTitle}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.kaprog.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.kaprog.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Format Jurusan: Baris 2 Tengah Bawah (Kepala Sekolah) */}
                  <div className="flex flex-col items-center justify-center text-center w-full pt-1">
                    <div className="w-[95mm] space-y-14">
                      <div>
                        <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                        <p className="font-bold uppercase tracking-tight">
                          Kepala Sekolah
                        </p>
                      </div>
                      <div>
                        <p className="font-bold underline uppercase text-slate-900">
                          {customSigners.kepsek.nama}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          NIP. {customSigners.kepsek.nip || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </PrintDocumentSheet>
        </div>
      </UniversalDocumentModal>

      {/* MODAL EDIT PENANDATANGAN (PLT / PENGGANTI) */}
      {showEditSigners && (
        <Modal
          isOpen={showEditSigners}
          onClose={() => setShowEditSigners(false)}
          title="Sesuaikan Pejabat Penandatangan"
          size="md"
          zIndex={200}
        >
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Gunakan formulir ini untuk mengubah nama atau NIP penandatangan sementara jika ada Plt/Pengganti.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSigners}
                className="text-xs gap-1 h-7 text-indigo-600"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Sistem
              </Button>
            </div>

            {/* Form Kaprog */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ketua Program Keahlian ({displayJurusanTitle})
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Nama Lengkap & Gelar</span>
                  <Input
                    value={customSigners.kaprog.nama}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        kaprog: { ...prev.kaprog, nama: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="Nama Kaprog..."
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">NIP / NUPTK</span>
                  <Input
                    value={customSigners.kaprog.nip}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        kaprog: { ...prev.kaprog, nip: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="NIP Kaprog..."
                  />
                </div>
              </div>
            </div>

            {/* Form Guru Penguji */}
            {docType === 'PENGUJI' && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Guru Penguji Sidang PKL
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Nama Penguji</span>
                    <Input
                      value={customSigners.penguji.nama}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          penguji: { ...prev.penguji, nama: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="Nama Penguji..."
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">NIP Penguji</span>
                    <Input
                      value={customSigners.penguji.nip}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          penguji: { ...prev.penguji, nip: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="NIP Penguji..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Waka Hubin */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Wakil Kepala Sekolah Bidang Hubin
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Nama Waka Hubin</span>
                  <Input
                    value={customSigners.wakaHubin.nama}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        wakaHubin: { ...prev.wakaHubin, nama: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="Nama Waka Hubin..."
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">NIP Waka Hubin</span>
                  <Input
                    value={customSigners.wakaHubin.nip}
                    onChange={(e) =>
                      setCustomSigners((prev) => ({
                        ...prev,
                        wakaHubin: { ...prev.wakaHubin, nip: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="NIP Waka Hubin..."
                  />
                </div>
              </div>
            </div>

            {/* Form Kepala Sekolah */}
            {docType === 'JURUSAN' && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kepala Sekolah
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Nama Kepala Sekolah</span>
                    <Input
                      value={customSigners.kepsek.nama}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          kepsek: { ...prev.kepsek, nama: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="Nama Kepala Sekolah..."
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">NIP Kepala Sekolah</span>
                    <Input
                      value={customSigners.kepsek.nip}
                      onChange={(e) =>
                        setCustomSigners((prev) => ({
                          ...prev,
                          kepsek: { ...prev.kepsek, nip: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="NIP Kepala Sekolah..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowEditSigners(false);
                  toast.success('Data penandatangan berhasil diterapkan ke berkas cetak.');
                }}
              >
                Terapkan Perubahan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PklSidangCetakModal;
