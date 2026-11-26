/**
 * RekapSesiKbmPrintModal.tsx
 * 
 * Modal Cetak & Ekspor Dokumen Resmi: Berita Acara & Rekapitulasi Sesi KBM Harian
 * Mengikuti Standar Industri: Universal Document Printing (True WYSIWYG & Print Sheets)
 * Kepatuhan:
 * 1. UniversalDocumentModal (A4 Landscape, Toggle Logo Daerah & Sekolah, Cetak Browser & PDF)
 * 2. PrintDocumentSheet (Multi-page Chunking A4 Landscape)
 * 3. PrintHeader (Kop Resmi Dinas & Sekolah terpadu via usePrintHeaderData)
 * 4. UniversalDocumentSignatures (2-Tier: Waka Kurikulum & Kepala Sekolah via useDocumentSigners)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Users,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { getSesiAbsensiList } from '@/api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi, KbmItem } from '@/utils/kbm-normalizer';
import { useKelasOptions, useGuruOptions } from '@/components/common';
import { toLocalDate } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

export interface RekapSesiKbmPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  initialKelasId?: string;
  initialGuruId?: string;
}

function formatIndoDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(`${dateStr.split('T')[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Konfigurasi baris per lembar untuk A4 Landscape
const ROWS_FIRST_PAGE = 11; // Halaman 1 memuat Kop, Judul, Info Box Realisasi
const ROWS_SUBSEQUENT_PAGE = 18; // Halaman berikutnya memuat tabel penuh
const ROWS_LAST_PAGE_WITH_SIGNATURE = 12; // Jika halaman terakhir ada tanda tangan

export const RekapSesiKbmPrintModal: React.FC<RekapSesiKbmPrintModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  tahunPelajaranId,
  semesterId,
  tahunPelajaranNama = '2026/2027',
  semesterNama = 'Ganjil',
  initialKelasId = 'ALL',
  initialGuruId = 'ALL',
}) => {
  const [targetDate, setTargetDate] = useState<string>(initialDate || toLocalDate());
  const [selectedKelasId, setSelectedKelasId] = useState<string>(initialKelasId);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialGuruId);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HADIR' | 'INVAL' | 'TERLAMBAT' | 'IZIN_SAKIT' | 'KOSONG'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const autoSigners = useDocumentSigners({
    tahunPelajaranId,
    semesterId,
  });

  const { options: kelasOptions } = useKelasOptions();
  const { options: guruOptions } = useGuruOptions({ jenisPtk: 'PENDIDIK' });

  // Update targetDate jika initialDate berubah saat modal dibuka
  React.useEffect(() => {
    if (isOpen && initialDate) {
      setTargetDate(initialDate);
    }
  }, [isOpen, initialDate]);

  // Query Data Sesi KBM Terpadu (Fisik + Virtual dari JadwalKBM)
  const {
    data: sesiData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['rekap-sesi-kbm-print', targetDate, tahunPelajaranId, semesterId],
    queryFn: () =>
      getSesiAbsensiList({
        tanggal: targetDate,
        include_scheduled: true,
        summary: true,
        limit: 500,
        tahun_pelajaran_id: tahunPelajaranId || undefined,
        semester_id: semesterId || undefined,
      } as any),
    enabled: isOpen && Boolean(targetDate),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Normalisasi seluruh item sesi
  const rawItems: KbmItem[] = useMemo(() => {
    const raw = (sesiData as any)?.data;
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray((sesiData as any)?.items)
      ? (sesiData as any).items
      : [];
    if (!Array.isArray(items)) return [];
    return items.map((s: any) => normalizeFromSesiAbsensi(s));
  }, [sesiData]);

  // Filter Sesi Berdasarkan Pilihan Toolbar
  const filteredSessions = useMemo(() => {
    return rawItems.filter((s) => {
      // 1. Filter Kelas
      if (selectedKelasId !== 'ALL') {
        const kId = String(s.kelas_id || s.Kelas?.id || '');
        if (kId !== selectedKelasId) return false;
      }

      // 2. Filter Guru (baik guru pengampu asli atau guru pelaksana inval)
      if (selectedGuruId !== 'ALL') {
        const gId = String(s.guru_id || s.Guru?.id || '');
        const gPelaksanaId = String(s.guru_pelaksana_id || '');
        if (gId !== selectedGuruId && gPelaksanaId !== selectedGuruId) return false;
      }

      // 3. Filter Status Realisasi Guru
      if (statusFilter !== 'ALL') {
        const ts = (s.guru_status || s.status.teacherStatus || '').toUpperCase();
        if (statusFilter === 'HADIR' && !(ts === 'HADIR' || ts === 'TEPAT_WAKTU')) return false;
        if (statusFilter === 'TERLAMBAT' && ts !== 'TERLAMBAT') return false;
        if (statusFilter === 'INVAL' && !(s.is_delegasi || ts.includes('INVAL') || ts.includes('GANTI'))) return false;
        if (statusFilter === 'IZIN_SAKIT' && !(ts === 'IZIN' || ts === 'SAKIT' || ts === 'DINAS_LUAR')) return false;
        if (statusFilter === 'KOSONG' && !(ts === 'ALPA' || ts === 'BELUM_TAP' || s.status.isOverdue)) return false;
      }

      // 4. Filter Search Text
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText = [
          s.kelas_nama,
          s.mapel_nama,
          s.guru_nama,
          s.guru_pengganti_nama,
          s.jamLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [rawItems, selectedKelasId, selectedGuruId, statusFilter, searchTerm]);

  // Urutkan Sesi: Jam Slot -> Kelas
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const slotA = a.slot_mulai || 0;
      const slotB = b.slot_mulai || 0;
      if (slotA !== slotB) return slotA - slotB;
      return (a.kelas_nama || '').localeCompare(b.kelas_nama || '');
    });
  }, [filteredSessions]);

  // Statistik Realisasi Dokumen (Executive Summary)
  const stats = useMemo(() => {
    const total = sortedSessions.length;
    let terlaksana = 0;
    let inval = 0;
    let terlambat = 0;
    let izinSakit = 0;
    let kosong = 0;
    let live = 0;
    let withJournal = 0;

    sortedSessions.forEach((s) => {
      const ts = (s.guru_status || s.status.teacherStatus || '').toUpperCase();
      const isFin = s.status.isFinished;
      const isLiv = s.status.isLive;

      if (s.is_delegasi || ts.includes('INVAL') || ts.includes('GANTI')) inval++;
      if (ts === 'TERLAMBAT') terlambat++;
      if (ts === 'IZIN' || ts === 'SAKIT' || ts === 'DINAS_LUAR') izinSakit++;
      if (ts === 'ALPA' || ts === 'BELUM_TAP' || s.status.isOverdue) kosong++;

      if (isFin || ts === 'HADIR' || ts === 'TEPAT_WAKTU' || isLiv) {
        terlaksana++;
      }
      if (isLiv) live++;
      if (s.session?.ProgresMateri || s.session?.materi || s.session?.catatan) {
        withJournal++;
      }
    });

    const keterlaksanaanPct = total > 0 ? Math.round((terlaksana / total) * 100) : 0;

    return {
      total,
      terlaksana,
      inval,
      terlambat,
      izinSakit,
      kosong,
      live,
      withJournal,
      keterlaksanaanPct,
    };
  }, [sortedSessions]);

  // Chunking Multi-page untuk Lembar A4 Landscape
  const pages = useMemo(() => {
    if (sortedSessions.length === 0) return [[]];

    const result: KbmItem[][] = [];
    let currentIdx = 0;
    let isFirstPage = true;

    while (currentIdx < sortedSessions.length) {
      const remaining = sortedSessions.length - currentIdx;
      let chunkSize: number;

      if (isFirstPage) {
        // Jika total data muat di halaman pertama bersama tanda tangan
        if (remaining <= ROWS_FIRST_PAGE) {
          chunkSize = remaining;
        } else {
          chunkSize = ROWS_FIRST_PAGE;
        }
        isFirstPage = false;
      } else {
        // Halaman berikutnya
        if (remaining <= ROWS_LAST_PAGE_WITH_SIGNATURE) {
          chunkSize = remaining;
        } else {
          chunkSize = ROWS_SUBSEQUENT_PAGE;
        }
      }

      result.push(sortedSessions.slice(currentIdx, currentIdx + chunkSize));
      currentIdx += chunkSize;
    }

    return result;
  }, [sortedSessions]);

  const totalPages = pages.length;

  const titimangsaDate = useMemo(() => {
    return formatIndoDateLong(targetDate);
  }, [targetDate]);

  const titimangsaCity = useMemo(() => {
    return (rawSekolah as any)?.kota || autoSigners.city || 'Bandung';
  }, [rawSekolah, autoSigners.city]);

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rekapitulasi Sesi & Realisasi KBM Harian"
      subtitle={`Laporan resmi keterlaksanaan pembelajaran kelas per tanggal ${formatIndoDateLong(targetDate)}`}
      orientation="landscape"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      size="5xl"
    >
      {/* ── TOOLBAR FILTER DOKUMEN CETAK (INTERAKTIF & FLEKSIBEL) ── */}
      <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Date Picker Target */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-600 dark:text-slate-300">Tanggal:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-800 dark:text-slate-200 cursor-pointer"
            />
          </div>

          {/* 2. Filter Kelas */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Guru */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-800 dark:text-slate-200 cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">Semua Guru</option>
              {guruOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter Status Guru */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">Hadir / Selesai</option>
              <option value="INVAL">Guru Inval / Pengganti</option>
              <option value="TERLAMBAT">Guru Terlambat</option>
              <option value="IZIN_SAKIT">Izin / Sakit / Dinas</option>
              <option value="KOSONG">Jam Kosong / Alpa</option>
            </select>
          </div>

          {/* 5. Search Bar */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari mapel / kelas / guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
        </div>

        {/* Tombol Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold"
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
          <span>Segarkan</span>
        </Button>
      </div>

      {/* ── AREA LEMBAR KERTAS FISIK A4 LANDSCAPE (PRINT SHEETS) ── */}
      <div className="flex flex-col gap-8 items-center w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[500px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Menghimpun Rekapitulasi Realisasi KBM...
            </p>
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-slate-400 text-sm">
            <Calendar className="w-12 h-12 mb-2 text-slate-300" />
            <p className="font-bold text-slate-600 dark:text-slate-300">
              Tidak Ada Data Sesi KBM pada Tanggal Terpilih
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Silakan pilih tanggal lain atau pastikan jadwal KBM aktif pada hari tersebut.
            </p>
          </div>
        ) : (
          pages.map((sessionChunk, pageIdx) => {
            const isFirst = pageIdx === 0;
            const isLast = pageIdx === totalPages - 1;

            return (
              <PrintDocumentSheet
                key={pageIdx}
                orientation="landscape"
                pageNumber={pageIdx + 1}
                totalPages={totalPages}
                footerText={`Berita Acara Realisasi KBM • ${formatIndoDateLong(targetDate)}`}
              >
                {/* Kop Surat Dinas & Sekolah (Khusus Halaman 1) */}
                {isFirst && (
                  <>
                    <PrintHeader
                      variant="landscape"
                      tenantInfo={tenantInfo}
                      documentTitle="BERITA ACARA & REKAPITULASI SESI PEMBELAJARAN (KBM)"
                    />

                    {/* Metadata Berita Acara */}
                    <div className="my-2.5 text-[10pt] font-serif border-b border-black pb-2 flex justify-between items-end leading-tight">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Hari / Tanggal :</span>
                          <span className="font-bold uppercase">{formatIndoDateLong(targetDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9.5pt]">
                          <span>Tahun Pelajaran / Semester :</span>
                          <span className="font-semibold">{tahunPelajaranNama} / {semesterNama}</span>
                        </div>
                      </div>
                      <div className="text-right text-[9pt]">
                        <div>Dicetak otomatis oleh Sistem Absenta</div>
                        <div className="text-[8.5pt] text-slate-600">Dokumen Sah Administrasi Kurikulum</div>
                      </div>
                    </div>

                    {/* KPI Ringkasan Keterlaksanaan (Summary Box Resmi) */}
                    <div className="grid grid-cols-6 gap-2 my-2.5 p-2 border border-black bg-slate-50/70 text-[9pt] font-serif">
                      <div className="text-center border-r border-slate-300 last:border-r-0">
                        <div className="text-[8pt] text-slate-600">Total Sesi Terjadwal</div>
                        <div className="font-bold text-[11pt] text-black">{stats.total}</div>
                      </div>
                      <div className="text-center border-r border-slate-300 last:border-r-0">
                        <div className="text-[8pt] text-slate-600">Terlaksana / Hadir</div>
                        <div className="font-bold text-[11pt] text-emerald-800">{stats.terlaksana}</div>
                      </div>
                      <div className="text-center border-r border-slate-300 last:border-r-0">
                        <div className="text-[8pt] text-slate-600">Guru Inval / Pengganti</div>
                        <div className="font-bold text-[11pt] text-purple-800">{stats.inval}</div>
                      </div>
                      <div className="text-center border-r border-slate-300 last:border-r-0">
                        <div className="text-[8pt] text-slate-600">Guru Terlambat</div>
                        <div className="font-bold text-[11pt] text-amber-800">{stats.terlambat}</div>
                      </div>
                      <div className="text-center border-r border-slate-300 last:border-r-0">
                        <div className="text-[8pt] text-slate-600">Jam Kosong / Alpa</div>
                        <div className="font-bold text-[11pt] text-rose-800">{stats.kosong}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8pt] text-slate-600">Keterlaksanaan KBM</div>
                        <div className="font-bold text-[11pt] text-indigo-900">{stats.keterlaksanaanPct}%</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Header Sambungan pada Halaman 2 dan seterusnya */}
                {!isFirst && (
                  <div className="mb-2 text-[9pt] font-serif flex justify-between items-center border-b border-black pb-1">
                    <span className="font-bold">
                      Lanjutan Rekapitulasi Sesi KBM — {formatIndoDateLong(targetDate)}
                    </span>
                    <span className="text-[8pt] italic text-slate-600">
                      Halaman {pageIdx + 1} dari {totalPages}
                    </span>
                  </div>
                )}

                {/* ── TABEL RINCIAN REKAPITULASI SESI KBM ── */}
                <table className="w-full border-collapse border border-black text-[8.5pt] font-serif my-1 leading-tight">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black text-center font-bold">
                      <th className="border border-black p-1 w-7">No</th>
                      <th className="border border-black p-1 w-28">Jam / Slot</th>
                      <th className="border border-black p-1 w-16">Kelas</th>
                      <th className="border border-black p-1 w-36">Mata Pelajaran</th>
                      <th className="border border-black p-1">Guru Pengampu</th>
                      <th className="border border-black p-1 w-36">Guru Realisasi / Inval</th>
                      <th className="border border-black p-1 w-20">Kehadiran Guru</th>
                      <th className="border border-black p-1 w-16">Status Sesi</th>
                      <th className="border border-black p-1 w-16">Siswa Hadir</th>
                      <th className="border border-black p-1 w-32">Topik / Jurnal Materi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionChunk.map((sesi, idx) => {
                      const absoluteIndex =
                        (isFirst ? 0 : ROWS_FIRST_PAGE + (pageIdx - 1) * ROWS_SUBSEQUENT_PAGE) +
                        idx +
                        1;

                      const isDelegasi = sesi.is_delegasi || Boolean(sesi.guru_pengganti_nama);
                      const teacherStatusRaw = (sesi.guru_status || sesi.status.teacherStatus || '').toUpperCase();
                      
                      let teacherStatusText = 'Belum Hadir';
                      let statusBadgeStyle = 'text-slate-800';

                      if (teacherStatusRaw === 'HADIR' || teacherStatusRaw === 'TEPAT_WAKTU') {
                        teacherStatusText = 'Hadir';
                        statusBadgeStyle = 'font-bold text-emerald-900';
                      } else if (teacherStatusRaw === 'TERLAMBAT') {
                        teacherStatusText = 'Terlambat';
                        statusBadgeStyle = 'font-bold text-amber-900';
                      } else if (isDelegasi) {
                        teacherStatusText = 'Inval';
                        statusBadgeStyle = 'font-bold text-purple-900';
                      } else if (teacherStatusRaw === 'IZIN') {
                        teacherStatusText = 'Izin';
                        statusBadgeStyle = 'text-blue-900';
                      } else if (teacherStatusRaw === 'SAKIT') {
                        teacherStatusText = 'Sakit';
                        statusBadgeStyle = 'text-orange-900';
                      } else if (teacherStatusRaw === 'DINAS_LUAR') {
                        teacherStatusText = 'Dinas Luar';
                        statusBadgeStyle = 'text-purple-900';
                      } else if (teacherStatusRaw === 'ALPA' || sesi.status.isOverdue) {
                        teacherStatusText = 'Alpa / Kosong';
                        statusBadgeStyle = 'font-bold text-rose-800';
                      }

                      const sessionStatusText = sesi.status.isFinished
                        ? 'Selesai'
                        : sesi.status.isLive
                        ? 'Live'
                        : sesi.status.isOverdue
                        ? 'Terlewat'
                        : 'Mendatang';

                      const totalSiswa = sesi.summary?.total || 0;
                      const hadirSiswa = sesi.summary?.hadir || 0;
                      const siswaRatioText =
                        totalSiswa > 0 ? `${hadirSiswa}/${totalSiswa}` : '-';

                      const pm = sesi.ProgresMateri || sesi.session?.ProgresMateri || null;
                      const isDaring = Boolean(
                        sesi.is_pjj_daring ||
                        pm?.mode_pelaksanaan === 'DARING_LIVE' ||
                        pm?.mode_pelaksanaan === 'DARING_TUGAS'
                      );
                      const jurnalMateriText =
                        pm?.judul_materi ||
                        pm?.judul_bab ||
                        pm?.topik ||
                        sesi.instruksi_tugas ||
                        sesi.session?.materi ||
                        sesi.session?.catatan ||
                        (sesi.status.isFinished ? 'KBM Selesai' : '-');
                      const displayJurnalWithMode = isDaring && jurnalMateriText !== '-'
                        ? `[PJJ/Daring] ${jurnalMateriText}`
                        : jurnalMateriText;

                      return (
                        <tr
                          key={sesi.id || idx}
                          className={cn(
                            'border-b border-black/80',
                            idx % 2 === 1 && 'bg-slate-50/40'
                          )}
                        >
                          <td className="border border-black p-1 text-center font-bold">
                            {absoluteIndex}
                          </td>
                          <td className="border border-black p-1 text-center font-mono text-[8pt]">
                            <div>{sesi.jamLabel || `Jam ${sesi.slot_mulai || '?'}`}</div>
                            <div className="text-[7.5pt] text-slate-600">
                              {sesi.jam_mulai} - {sesi.jam_selesai}
                            </div>
                          </td>
                          <td className="border border-black p-1 text-center font-bold text-[8.5pt]">
                            {sesi.kelas_nama}
                          </td>
                          <td className="border border-black p-1 text-left font-medium">
                            {sesi.mapel_nama}
                          </td>
                          <td className="border border-black p-1 text-left">
                            <div className="font-semibold">{sesi.guru_nama}</div>
                            {sesi.Guru?.nip && (
                              <div className="text-[7pt] text-slate-600 font-mono">
                                NIP. {sesi.Guru.nip}
                              </div>
                            )}
                          </td>
                          <td className="border border-black p-1 text-left">
                            {isDelegasi ? (
                              <div className="text-purple-900 font-semibold">
                                {sesi.guru_pengganti_nama || 'Guru Pengganti'}
                                <span className="text-[7pt] block text-purple-700 italic">
                                  (Petugas Inval)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[7.5pt]">Sesuai Pengampu</span>
                            )}
                          </td>
                          <td className={cn('border border-black p-1 text-center', statusBadgeStyle)}>
                            {teacherStatusText}
                          </td>
                          <td className="border border-black p-1 text-center font-semibold text-[8pt]">
                            {sessionStatusText}
                          </td>
                          <td className="border border-black p-1 text-center font-mono text-[8pt]">
                            {siswaRatioText}
                          </td>
                          <td className="border border-black p-1 text-left text-[7.5pt] truncate max-w-[130px]" title={String(displayJurnalWithMode)}>
                            {displayJurnalWithMode}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* ── TANDA TANGAN RESMI 2-TIER (HANYA PADA HALAMAN TERAKHIR) ── */}
                {isLast && (
                  <div className="mt-6 w-full page-break-inside-avoid">
                    <UniversalDocumentSignatures
                      layout="dual_custom"
                      showTitimangsa={true}
                      titimangsaCity={titimangsaCity}
                      titimangsaDate={titimangsaDate}
                      overrideSignerLeft={{
                        headerPrefix: 'Mengetahui / Menyetujui,',
                        roleTitle: `Kepala ${(rawSekolah as any)?.nama || tenantInfo?.name || 'Sekolah'}`,
                        personName: autoSigners.kepsek.personName || (rawSekolah as any)?.kepala_sekolah || '........................................',
                        nip: autoSigners.kepsek.nip || (rawSekolah as any)?.nip_kepala || '',
                      }}
                      overrideSignerRight={{
                        headerPrefix: 'Disahkan oleh,',
                        roleTitle: 'Wakasek Bidang Kurikulum',
                        personName: autoSigners.wakaKurikulum.personName || (rawSekolah as any)?.waka_kurikulum_nama || '........................................',
                        nip: autoSigners.wakaKurikulum.nip || (rawSekolah as any)?.waka_kurikulum_nip || '',
                      }}
                      spacingHeightMm={18}
                    />
                  </div>
                )}
              </PrintDocumentSheet>
            );
          })
        )}
      </div>
    </UniversalDocumentModal>
  );
};
