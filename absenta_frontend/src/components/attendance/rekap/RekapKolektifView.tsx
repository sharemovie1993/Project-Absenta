import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  Inbox, 
  RotateCcw, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Printer,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { getRekapBulananKelas } from '@/api/attendanceGerbang.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getTenantById } from '@/api/tenants.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { exportDataToExcel } from '@/utils/export.utils';
import { generateGenericPdf } from '@/utils/print/pdfGeneric';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { ViewModeSwitcher } from './RekapBulananKelasToolbar';
import { RekapBulananKelasPdfModal } from './RekapBulananKelasPdfModal';
import { RekapPresensiPrintModal } from './RekapPresensiPrintModal';
import type { RekapBulananKelasRow, ViewMode } from './types';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = {
  H: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold',
  T: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold',
  S: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold',
  I: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold',
  D: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-bold',
  A: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold',
};

export interface UniversalRekapKolektifViewProps {
  // Universal Scoping Props (Role-Ready)
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  initialKelasId?: string;
  kelasKehadiranList?: Array<{
    id: string;
    namaKelas?: string;
    nama_kelas?: string;
    totalSiswa?: number;
    hadirToday?: number;
    pctHadir?: number;
  }>;

  // Period & Academic Context
  tahunPelajaranId?: string;
  semesterId?: string;
  initialBulan?: string;

  // Display & Mode Options
  isModal?: boolean;
  hideLayout?: boolean;
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  readOnly?: boolean;

  // Callbacks
  onClose?: () => void;
}

export const RekapKolektifView: React.FC<UniversalRekapKolektifViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  kelasNama: propKelasNama,
  initialKelasId,
  kelasKehadiranList = [],
  tahunPelajaranId: propTahunPelajaranId,
  semesterId: propSemesterId,
  initialBulan,
  isModal = false,
  hideLayout = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  readOnly = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, isAdmin } = useCapabilities();

  // Role Scope Resolution (Explicit prop overrides Session Capability)
  const effectiveJurusanId = propJurusanId || (isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined);
  const effectiveJurusanNama = propJurusanNama || kaprogJurusan?.nama || 'Kejuruan';
  const effectiveKelasId = propKelasId || initialKelasId || (isWaliKelas && walikelasKelas?.id ? walikelasKelas.id : undefined);
  const effectiveKelasNama = propKelasNama || walikelasKelas?.nama_kelas || '';

  const isMobile = useIsMobile(768);
  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Laporan_Rekap_Presensi.pdf');

  // Unified Academic Filter Engine
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableTingkat: true,
    enableKelas: true,
    enableBulan: true,
    enableSearch: true,
    enableCohort: true,
    jurusanId: effectiveJurusanId,
    initialTpId: propTahunPelajaranId || '',
    initialKelasId: effectiveKelasId || '',
    initialBulan: initialBulan || undefined,
    isKelasDisabled: Boolean(effectiveKelasId && isWaliKelas && !isKaprog && !isAdmin),
  });

  const {
    values: { kelasId, tahunPelajaranId, bulan, searchQuery },
    cohortStages,
    suggestedStage,
    handleJumpCohortStage,
    handleTpChange: handleTahunPelajaranChange,
    selectedKelasLabel,
    activeTpYear,
    kelasOptions,
    tpOptions: tahunOptions,
  } = academicFilter;

  // Query Profil Sekolah & Kop Surat untuk Cetak PDF
  const kopQuery = useQuery({
    queryKey: ['rekap-kolektif-kop', (user as { tenant_id?: string })?.tenant_id],
    queryFn: async () => {
      const sek = await sekolahApi.getProfile().catch(() => null);
      let tenantData = null;
      const tenantId = (user as { tenant_id?: string })?.tenant_id;
      if (tenantId) {
        const res = await getTenantById(tenantId).catch(() => null);
        if (res?.success) tenantData = res.data;
      }
      const resStruktur = await getStrukturList({ is_active: true }).catch(() => null);
      const strList = resStruktur?.success ? resStruktur.data : [];
      return { sekolah: sek, tenantInfo: tenantData, strukturList: strList };
    },
    staleTime: 5 * 60 * 1000,
  });

  const sekolah = kopQuery.data?.sekolah || null;
  const tenantInfo = kopQuery.data?.tenantInfo || null;
  const strukturList = kopQuery.data?.strukturList || [];

  // Fetch Hasil Rekapitulasi Kolektif Kelas Terpilih
  const { data: rekapData, isLoading } = useQuery({
    queryKey: ['rekap-bulanan-kelas-data', kelasId, bulan, tahunPelajaranId],
    queryFn: async () => {
      if (!kelasId) return { rows: [], waliKelasName: '', waliKelasNip: '' };
      const res = await getRekapBulananKelas(kelasId, {
        bulan,
        tahun_pelajaran_id: tahunPelajaranId || undefined,
      });
      return {
        rows: Array.isArray(res?.data) ? (res.data as RekapBulananKelasRow[]) : [],
        waliKelasName: res?.wali_kelas?.nama_guru || '',
        waliKelasNip: res?.wali_kelas?.nip || '',
      };
    },
    enabled: !!kelasId,
    staleTime: 60 * 1000,
  });

  const rows = rekapData?.rows || [];

  // Hitung jumlah hari dalam bulan untuk mode Matriks
  const daysInMonth = useMemo(() => {
    if (!bulan || !/^\d{4}-\d{2}$/.test(bulan)) return 31;
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }, [bulan]);

  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Filter baris berdasarkan pencarian nama siswa / NIS
  const filteredRows = useMemo(() => {
    if (!searchQuery?.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) => 
      (r.nama_siswa && r.nama_siswa.toLowerCase().includes(q)) ||
      (r.nis && String(r.nis).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  // Reset page ke 1 saat kelas, bulan, atau pencarian berubah
  useEffect(() => {
    setPage(1);
  }, [kelasId, bulan, searchQuery]);

  // Statistik Ringkas Kehadiran Kelas Terpilih
  const stats = useMemo(() => {
    const totalSiswa = rows.length;
    if (totalSiswa === 0) return { avgHadir: 0, totalHadir: 0, totalSakit: 0, totalIzin: 0, totalAlpa: 0 };

    let sumHadir = 0;
    let sumSakit = 0;
    let sumIzin = 0;
    let sumAlpa = 0;
    let sumTerlambat = 0;

    rows.forEach(r => {
      sumHadir += r.HADIR || 0;
      sumSakit += r.SAKIT || 0;
      sumIzin += r.IZIN || 0;
      sumAlpa += r.ALPA || 0;
      sumTerlambat += r.TERLAMBAT || 0;
    });

    const totalDays = sumHadir + sumSakit + sumIzin + sumAlpa + sumTerlambat;
    const avgHadir = totalDays > 0 ? Math.round(((sumHadir + sumTerlambat) / totalDays) * 100) : 0;

    return { avgHadir, totalHadir: sumHadir, totalSakit: sumSakit, totalIzin: sumIzin, totalAlpa: sumAlpa };
  }, [rows]);

  // Handler Export Excel
  const handleExportExcel = useCallback(() => {
    const targetRows = filteredRows.length > 0 ? filteredRows : rows;
    if (!targetRows || targetRows.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    try {
      const namaKelas = selectedKelasLabel;
      const title = `Hasil Rekapitulasi Presensi - ${namaKelas} (${bulan})${searchQuery ? ` - Filter '${searchQuery}'` : ''}`;
      const filename = `Rekap_Kolektif_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}`;
      const excelCols = [
        { header: 'No', accessor: (_: unknown, i?: number) => (i ?? 0) + 1, width: 6 },
        { header: 'Nama Siswa', accessor: (r: RekapBulananKelasRow) => r.nama_siswa, width: 28 },
        { header: 'NIS', accessor: (r: RekapBulananKelasRow) => r.nis ?? '-', width: 14 },
        { header: 'Hadir (H)', accessor: (r: RekapBulananKelasRow) => r.HADIR ?? 0, width: 10 },
        { header: 'Sakit (S)', accessor: (r: RekapBulananKelasRow) => r.SAKIT ?? 0, width: 10 },
        { header: 'Izin (I)', accessor: (r: RekapBulananKelasRow) => r.IZIN ?? 0, width: 10 },
        { header: 'Alpa (A)', accessor: (r: RekapBulananKelasRow) => r.ALPA ?? 0, width: 10 },
        { header: 'Terlambat (T)', accessor: (r: RekapBulananKelasRow) => r.TERLAMBAT ?? 0, width: 12 },
        { header: 'Total Poin', accessor: (r: RekapBulananKelasRow) => r.total_poin ?? 0, width: 12 },
      ];
      exportDataToExcel<RekapBulananKelasRow>(targetRows, excelCols, filename, title);
      toast.success(`Berhasil mengunduh ${filename}.xlsx`);
    } catch {
      toast.error('Gagal mengekspor data ke Excel');
    }
  }, [filteredRows, rows, selectedKelasLabel, bulan, searchQuery]);

  // Selected Tahun Label untuk Header Dokumen
  const selectedTahunLabel = useMemo(() => {
    return (
      tahunOptions.find((t) => t.value === tahunPelajaranId)?.label ||
      activeTpYear?.tahun ||
      '2026/2027'
    );
  }, [tahunOptions, tahunPelajaranId, activeTpYear]);

  // Handler Export / Cetak PDF Standar Universal Document (True WYSIWYG)
  const handleExportPdf = useCallback(() => {
    if (!rows || rows.length === 0) {
      toast.error('Tidak ada data presensi untuk dicetak');
      return;
    }
    setIsPrintModalOpen(true);
  }, [rows]);

  // Metrik Shopee-Grade Hairline Bento Grid (Maksimal 2 Baris Teks per Sel)
  const bentoCells: HubBentoCell[] = useMemo(() => [
    {
      id: 'total_siswa',
      title: 'Total Siswa',
      value: `${rows.length} Siswa`,
      icon: Users,
      iconColorClass: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      id: 'kehadiran',
      title: 'Rata-rata Hadir',
      value: `${stats.avgHadir}%`,
      icon: CheckCircle2,
      iconColorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      id: 'sakit_izin',
      title: 'Sakit & Izin',
      value: `${stats.totalSakit + stats.totalIzin} Siswa`,
      icon: Clock,
      iconColorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: 'alpa',
      title: 'Total Alpa',
      value: `${stats.totalAlpa} Siswa`,
      icon: AlertCircle,
      iconColorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60',
    },
  ], [rows.length, stats.avgHadir, stats.totalSakit, stats.totalIzin, stats.totalAlpa]);

  const content = (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Scope Mode Banner */}
      {!hideScopeBanner && (effectiveJurusanId || effectiveKelasId) && (
        <div className="flex items-center gap-2.5 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs">
          <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-bold">Mode Terfokus:</span>{' '}
            <span>
              Menampilkan hasil rekapitulasi kehadiran peserta didik untuk{' '}
              <strong>
                {effectiveKelasId 
                  ? `Kelas ${effectiveKelasNama}` 
                  : `Program Keahlian ${effectiveJurusanNama}`}
              </strong>.
            </span>
          </div>
        </div>
      )}

      {/* Ringkasan Metrik (Shopee-Grade HubBentoGrid di HP, Compact-Premium di Desktop) */}
      {!hideHeaderStats && (
        isMobile ? (
          <HubCard noPadding className="mb-2 shadow-2xs">
            <HubBentoGrid cells={bentoCells} columns={2} />
          </HubCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <AnalyticsCard
              title="Total Siswa Kelas"
              value={`${rows.length} Siswa`}
              icon={<Users className="w-4 h-4" />}
              gradient="from-slate-700 to-slate-900"
              variant="compact-premium"
              compact={true}
            />
            <AnalyticsCard
              title="Rata-rata Hadir"
              value={`${stats.avgHadir}%`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              gradient="from-emerald-500 to-emerald-600"
              variant="compact-premium"
              compact={true}
            />
            <AnalyticsCard
              title="Sakit & Izin"
              value={`${stats.totalSakit + stats.totalIzin} Siswa`}
              icon={<Clock className="w-4 h-4" />}
              gradient="from-blue-500 to-blue-600"
              variant="compact-premium"
              compact={true}
            />
            <AnalyticsCard
              title="Total Alpa"
              value={`${stats.totalAlpa} Siswa`}
              icon={<AlertCircle className="w-4 h-4" />}
              gradient="from-rose-500 to-rose-600"
              variant="compact-premium"
              compact={true}
            />
          </div>
        )
      )}

      {/* Toolbar Filter Terstandar (Engine Terpusat AcademicFilterToolbar) */}
      <AcademicFilterToolbar
        {...academicFilter.toolbarProps}
        variant={isMobile ? 'mini' : 'card'}
        searchPlaceholder="Cari siswa / NIS..."
        actionsLeft={
          !isMobile ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Tampilan
              </span>
              <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />
            </div>
          ) : undefined
        }
        onExportExcel={!isMobile ? handleExportExcel : undefined}
        onExportPdf={!isMobile ? handleExportPdf : undefined}
      />

      {/* Mode HP: Action Strip di LUAR Kotak Filter (Bebas Tumpang Tindih / 2 Baris Bersih) */}
      {isMobile && (
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          {/* Baris 1: Mode Tampilan & Tombol Excel (Bersebelahan Lega, Zero-Overlap) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">
                Mode:
              </span>
              <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />
            </div>

            <Button
              type="button"
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs shrink-0"
              title="Unduh file spreadsheet Excel"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              <span>Excel</span>
            </Button>
          </div>

          {/* Baris 2: Tombol Cetak PDF Penuh & Mencolok (Mudah Ditekan Jempol, 100% Anti-Tabrakan) */}
          <Button
            type="button"
            onClick={handleExportPdf}
            className="w-full h-9 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white cursor-pointer shadow-xs flex items-center justify-center gap-2 transition-transform"
            title="Buka pratinjau cetak dan unduh PDF 1 atau 2 lembar"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Rekap Presensi (PDF)</span>
          </Button>
        </div>
      )}

      {/* High-Density Zero-Scroll Table Viewport */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto max-h-[55vh] overflow-y-auto bg-white dark:bg-slate-900 shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader size="lg" />
            <span className="text-xs text-slate-500">Memuat rekapitulasi kehadiran kelas...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <Inbox className="w-8 h-8 text-slate-400/80" />
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm block">
                Tidak Ada Data Presensi Siswa
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                {kelasId
                  ? 'Tidak ada data siswa atau catatan presensi pada kelas ini untuk periode Tahun Pelajaran dan bulan yang dipilih.'
                  : 'Silakan pilih kelas di atas.'}
              </p>
            </div>

            {/* Smart Fallback: Rekomendasi Rombel dari Angkatan yang Sama */}
            {suggestedStage && (
              <div className="mt-2 p-3.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 max-w-lg w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Rombel Angkatan Ditemukan
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Siswa angkatan ini di tahun pelajaran yang dipilih tercatat berada di rombel <span className="font-bold text-indigo-600 dark:text-indigo-400">{suggestedStage.nama_kelas}</span>.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleJumpCohortStage(suggestedStage)}
                  className="w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-3.5 py-2 shadow-2xs cursor-pointer"
                >
                  Beralih ke {suggestedStage.nama_kelas}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            )}

            {/* Fallback: Kembali ke Tapel Aktif jika tapel yang dipilih bukan tapel aktif */}
            {activeTpYear?.id && activeTpYear.id !== tahunPelajaranId && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTahunPelajaranChange(activeTpYear.id)}
                  className="text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  Kembali ke Tahun Pelajaran Aktif ({activeTpYear.tahun})
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'SUMMARY' ? (
          <>
            {/* TABEL SUMMARY DESKTOP (9 Kolom Proporsional) */}
            <table className="hidden sm:table w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Nama Siswa</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">NIS</th>
                  <th className="py-2.5 px-3 text-center">Hadir</th>
                  <th className="py-2.5 px-3 text-center">Izin</th>
                  <th className="py-2.5 px-3 text-center">Sakit</th>
                  <th className="py-2.5 px-3 text-center">Alpa</th>
                  <th className="py-2.5 px-3 text-center">Terlambat</th>
                  <th className="py-2.5 px-3 text-center">% Kehadiran</th>
                  <th className="py-2.5 px-3 text-center font-bold">Total Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      {searchQuery ? `Tidak ditemukan siswa yang cocok dengan "${searchQuery}"` : 'Tidak ada data siswa'}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((r, idx) => {
                    const rowNum = (page - 1) * limit + idx + 1;
                    const totalDays = (r.HADIR ?? 0) + (r.IZIN ?? 0) + (r.SAKIT ?? 0) + (r.ALPA ?? 0) + (r.TERLAMBAT ?? 0);
                    const pct = totalDays === 0 ? 0 : Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / totalDays) * 100);
                    return (
                      <tr key={r.siswa_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {rowNum}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          <button
                            type="button"
                            onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${r.siswa_id}`)}
                            className="text-left font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate max-w-[240px] block"
                            title={r.nama_siswa}
                          >
                            {r.nama_siswa}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                          {r.nis || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 font-mono">
                          {r.HADIR || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-600 font-mono">
                          {r.IZIN || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600 font-mono">
                          {r.SAKIT || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600 font-mono">
                          {r.ALPA || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-600 font-mono">
                          {r.TERLAMBAT || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span className={pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600'}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-100 font-mono">
                          {r.total_poin || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* DAFTAR KARTU MOBILE (Shopee-Grade High-Density, 0 Horiz Scroll) */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {searchQuery ? `Tidak ditemukan siswa yang cocok dengan "${searchQuery}"` : 'Tidak ada data siswa'}
                </div>
              ) : (
                pagedRows.map((r, idx) => {
                  const rowNum = (page - 1) * limit + idx + 1;
                  const totalDays = (r.HADIR ?? 0) + (r.IZIN ?? 0) + (r.SAKIT ?? 0) + (r.ALPA ?? 0) + (r.TERLAMBAT ?? 0);
                  const pct = totalDays === 0 ? 0 : Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / totalDays) * 100);
                  return (
                    <div
                      key={r.siswa_id}
                      className="p-3 space-y-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Baris 1: No, Nama Siswa, NIS & % Kehadiran */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="w-5 text-[11px] font-mono text-slate-400 font-bold shrink-0 mt-0.5">
                            {rowNum}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${r.siswa_id}`)}
                              className="text-left font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block truncate"
                            >
                              {r.nama_siswa}
                            </button>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                              NIS: {r.nis || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold',
                              pct >= 85
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : pct >= 75
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Baris 2: Strip Kehadiran H, I, S, A, T & Poin */}
                      <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-mono pt-0.5">
                        <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                          <span className="text-[8.5px] text-emerald-600/70 block">H</span>
                          {r.HADIR || 0}
                        </div>
                        <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
                          <span className="text-[8.5px] text-blue-600/70 block">I</span>
                          {r.IZIN || 0}
                        </div>
                        <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                          <span className="text-[8.5px] text-amber-600/70 block">S</span>
                          {r.SAKIT || 0}
                        </div>
                        <div className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold">
                          <span className="text-[8.5px] text-rose-600/70 block">A</span>
                          {r.ALPA || 0}
                        </div>
                        <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold">
                          <span className="text-[8.5px] text-purple-600/70 block">T</span>
                          {r.TERLAMBAT || 0}
                        </div>
                        <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                          <span className="text-[8.5px] text-slate-500 block">POIN</span>
                          {r.total_poin || 0}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* TABEL MATRIX / PER HARI (Ultra-Dense Zero Scroll: 1..31 + H, S, I, A, T, POIN Pas di Layar) */
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2 px-2 whitespace-nowrap min-w-[110px] max-w-[150px] sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.06)]">Nama Siswa</th>
                <th className="py-2 px-1 text-center whitespace-nowrap font-mono text-[10px] w-14">NIS</th>
                {dayNumbers.map((d) => (
                  <th
                    key={d}
                    className="py-1.5 px-0.5 text-center font-mono text-[9px] sm:text-[10px] min-w-[19px] max-w-[25px]"
                    title={`Tanggal ${d}`}
                  >
                    {d}
                  </th>
                ))}
                <th className="py-2 px-1 text-center font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 text-[10px] sm:text-[11px] w-7">H</th>
                <th className="py-2 px-1 text-center font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-[10px] sm:text-[11px] w-7">S</th>
                <th className="py-2 px-1 text-center font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 text-[10px] sm:text-[11px] w-7">I</th>
                <th className="py-2 px-1 text-center font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-[10px] sm:text-[11px] w-7">A</th>
                <th className="py-2 px-1 text-center font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-950/30 text-[10px] sm:text-[11px] w-7">T</th>
                <th className="py-2 px-1.5 text-center font-black text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-800/80 text-[10px] sm:text-[11px] min-w-[36px]">POIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dayNumbers.length + 8} className="py-8 text-center text-slate-400">
                    {searchQuery ? `Tidak ditemukan siswa yang cocok dengan "${searchQuery}"` : 'Tidak ada data siswa'}
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.siswa_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-1 px-2 font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px] sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[1px_0_3px_rgba(0,0,0,0.06)]" title={r.nama_siswa}>
                      <button
                        type="button"
                        onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${r.siswa_id}`)}
                        className="text-left font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate max-w-[140px] block"
                      >
                        {r.nama_siswa}
                      </button>
                    </td>
                    <td className="py-1 px-1 text-center font-mono text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {r.nis || '-'}
                    </td>
                    {dayNumbers.map((d) => {
                      const code = r.dailyMap?.[String(d)];
                      return (
                        <td key={d} className="py-0.5 px-0.5 text-center">
                          {code ? (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-4 h-4 sm:w-4.5 sm:h-4.5 rounded text-[8px] sm:text-[9px] font-bold leading-none',
                                STATUS_BADGE[code] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              )}
                              title={`Tanggal ${d}: ${code}`}
                            >
                              {code}
                            </span>
                          ) : (
                            <span className="text-slate-200 dark:text-slate-700 text-[8px]">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1 px-1 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10 font-mono text-[10px] sm:text-[11px]">
                      {r.HADIR || 0}
                    </td>
                    <td className="py-1 px-1 text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10 font-mono text-[10px] sm:text-[11px]">
                      {r.SAKIT || 0}
                    </td>
                    <td className="py-1 px-1 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10 font-mono text-[10px] sm:text-[11px]">
                      {r.IZIN || 0}
                    </td>
                    <td className="py-1 px-1 text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10 font-mono text-[10px] sm:text-[11px]">
                      {r.ALPA || 0}
                    </td>
                    <td className="py-1 px-1 text-center font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/10 font-mono text-[10px] sm:text-[11px]">
                      {r.TERLAMBAT || 0}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-800/50 text-[10px] sm:text-[11px]">
                      {r.total_poin || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Compact Pagination Bar */}
      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Menampilkan {filteredRows.length === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, filteredRows.length)} dari {filteredRows.length} siswa
            {searchQuery && rows.length !== filteredRows.length ? ` (disaring dari ${rows.length})` : ''}
          </span>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-7 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0"
            >
              <option value={15}>15 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>
          </div>
        </div>
      )}

      {/* Modal Preview & Cetak Dokumen PDF Standar Universal Document (True WYSIWYG) */}
      {isPrintModalOpen && (
        <RekapPresensiPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          kelasId={kelasId}
          kelasNama={selectedKelasLabel}
          tahunPelajaran={selectedTahunLabel}
          bulan={bulan}
          waliKelasNama={rekapData?.waliKelasName}
          waliKelasNip={rekapData?.waliKelasNip}
          viewMode={viewMode}
          rows={filteredRows.length > 0 ? filteredRows : rows}
          dayNumbers={dayNumbers}
        />
      )}
    </div>
  );

  // If in Modal mode or hideLayout, render clean inline view without AcademicPageLayout
  if (isModal || hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title={effectiveJurusanId ? `Rekap Presensi ${effectiveJurusanNama}` : "Hasil Rekapitulasi Kolektif"}
      description={effectiveJurusanId 
        ? `Laporan presensi bulanan kolektif siswa kelas kejuruan ${effectiveJurusanNama}.` 
        : "Laporan kehadiran akumulatif seluruh siswa per kelas dalam satu bulan."}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Presensi', path: '/attendance' },
        { label: 'Rekap Kolektif', path: '/attendance/rekap/bulanan-kelas' }
      ]}
      instruction={{
        title: "Panduan Rekapitulasi Kolektif",
        description: "Laporan kehadiran akumulatif seluruh siswa kelas dalam satu bulan kalender.",
        items: [
          { text: "Pilih kelas dan bulan untuk melihat rekap kehadiran kolektif." },
          { text: "Gunakan sakelar Tampilan untuk beralih antara Matriks Harian dan Total Akumulasi." },
          { text: "Gunakan tombol Cetak PDF atau Ekspor Excel untuk mengunduh rekap resmi." }
        ]
      }}
      canView={true}
      hardeningModuleKey="attendance_rekap_bulanan_kelas"
    >
      {content}
    </AcademicPageLayout>
  );
});

export default RekapKolektifView;
