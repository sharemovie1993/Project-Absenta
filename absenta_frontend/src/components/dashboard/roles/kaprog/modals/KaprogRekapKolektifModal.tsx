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
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { getRekapBulananKelas } from '@/api/attendanceGerbang.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getTenantById } from '@/api/tenants.api';
import { getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { exportDataToExcel } from '@/utils/export.utils';
import { generateGenericPdf } from '@/utils/print/pdfGeneric';
import { useAuthStore } from '@/store/authStore';
import { useAcademicFilter, AcademicFilterToolbar } from '@/components/common';
import { ViewModeSwitcher } from '@/components/attendance/rekap/RekapBulananKelasToolbar';
import { RekapBulananKelasPdfModal } from '@/components/attendance/rekap/RekapBulananKelasPdfModal';
import type { RekapBulananKelasRow, ViewMode } from '@/components/attendance/rekap/types';
import { cn } from '@/lib/utils';
import { KelasKehadiranItem } from '../types';

const STATUS_BADGE: Record<string, string> = {
  H: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold',
  T: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold',
  S: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold',
  I: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold',
  D: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-bold',
  A: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold',
};

export interface KaprogRekapKolektifModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  kelasKehadiranList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogRekapKolektifModal: React.FC<KaprogRekapKolektifModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasKehadiranList = [],
  tahunPelajaranId: propTahunPelajaranId,
  semesterId: propSemesterId,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Laporan_Rekap_Presensi.pdf');

  // Unified Academic Filter Engine Terpusat
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableTingkat: true,
    enableKelas: true,
    enableBulan: true,
    enableSearch: true,
    enableCohort: true,
    jurusanId,
    initialTpId: propTahunPelajaranId || '',
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
    queryKey: ['kaprog-rekap-kop', (user as { tenant_id?: string })?.tenant_id],
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
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const sekolah = kopQuery.data?.sekolah || null;
  const tenantInfo = kopQuery.data?.tenantInfo || null;
  const strukturList = kopQuery.data?.strukturList || [];

  // Fetch Hasil Rekapitulasi Kolektif Kelas Terpilih
  const { data: rekapData, isLoading } = useQuery({
    queryKey: ['kaprog-rekap-bulanan-data', kelasId, bulan, tahunPelajaranId],
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
    enabled: isOpen && !!kelasId,
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

  // Handler Export PDF: Menghasilkan PDF langsung di browser & menampilkan modal preview PDF
  const handleExportPdf = useCallback(async () => {
    if (!rows || rows.length === 0) {
      toast.error('Tidak ada data untuk dicetak');
      return;
    }
    try {
      toast.loading('Menyiapkan dokumen PDF...', { id: 'pdf-toast' });
      const isMatrix = viewMode === 'MATRIX';
      const namaKelas = selectedKelasLabel;
      const waliKelasName = rekapData?.waliKelasName || '';
      const waliKelasNip = rekapData?.waliKelasNip || '';
      const selectedTahunLabel = tahunOptions.find((t) => t.value === tahunPelajaranId)?.label || '';

      const blob = await generateGenericPdf({
        module: 'attendance',
        printType: isMatrix ? 'monthly_matrix' : 'monthly_recap',
        selectedClassId: kelasId,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64: null,
        logoSekolahBase64: null,
        includeSchoolLogo: true,
        checklistData: {
          current_year: { tahun: selectedTahunLabel },
        },
        eventDetails: { 
          bulanRekap: bulan,
          tahunPelajaran: selectedTahunLabel,
        },
        filterData: {
          viewMode,
          waliKelasName: waliKelasName || '________________________',
          waliKelasNip: waliKelasNip || '',
          classes: (kelasOptions ?? []).map((k) => ({
            id: k.value,
            nama_kelas: (k as any).nama_kelas || k.label?.split(' - ')[0] || k.label,
            jurusan_nama: (k as any).jurusan_nama || jurusanNama,
            Jurusan: (k as any).Jurusan || { nama: (k as any).jurusan_nama || jurusanNama || '' },
          })),
          rekapList: (rows ?? []).map((r) => ({
            id: r.siswa_id,
            nama_siswa: r.nama_siswa,
            nis: r.nis,
            dailyMap: r.dailyMap ?? {},
            HADIR: r.HADIR ?? 0,
            SAKIT: r.SAKIT ?? 0,
            IZIN: r.IZIN ?? 0,
            ALPA: r.ALPA ?? 0,
            TERLAMBAT: r.TERLAMBAT ?? 0,
            hadir: r.HADIR ?? 0,
            izin: r.IZIN ?? 0,
            sakit: r.SAKIT ?? 0,
            alpa: r.ALPA ?? 0,
            terlambat: r.TERLAMBAT ?? 0,
            total_poin: r.total_poin ?? 0,
            persentase: (() => {
              const t =
                (r.HADIR ?? 0) +
                (r.IZIN ?? 0) +
                (r.SAKIT ?? 0) +
                (r.ALPA ?? 0) +
                (r.TERLAMBAT ?? 0);
              return t === 0
                ? 0
                : Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / t) * 100);
            })(),
          })),
        },
      });

      const modeLabel = isMatrix ? 'Leger_Harian' : 'Rekap_Bulanan';
      const filename = `${modeLabel}_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}.pdf`;
      setPdfFilename(filename);
      setPdfPreviewUrl(URL.createObjectURL(blob));
      toast.success(`Preview PDF ${isMatrix ? 'Landscape' : 'Portrait'} siap`, {
        id: 'pdf-toast',
      });
    } catch (err) {
      console.error('[PDF Export Error]:', err);
      toast.error('Gagal membuat preview PDF', { id: 'pdf-toast' });
    }
  }, [rows, kelasOptions, kelasId, bulan, tahunPelajaranId, tahunOptions, viewMode, sekolah, tenantInfo, strukturList, selectedKelasLabel, rekapData, jurusanNama]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Hasil Rekapitulasi Kolektif
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                  {jurusanNama}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan kehadiran kolektif bulanan seluruh rombel pada jurusan ini.
              </p>
            </div>
          </div>
        }
      >
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Ringkasan Metrik Cepat Kelas Terpilih */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total Siswa Kelas
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                {rows.length}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Rata-rata Kehadiran
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {stats.avgHadir}%
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40">
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                Sakit & Izin
              </div>
              <div className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalSakit + stats.totalIzin}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
              <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                Total Alpa
              </div>
              <div className="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300">
                {stats.totalAlpa}
              </div>
            </div>
          </div>

          {/* Toolbar Filter Terstandar (Engine Terpusat AcademicFilterToolbar) */}
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            searchPlaceholder="Cari siswa / NIS..."
            actionsLeft={
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tampilan
                </span>
                <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />
              </div>
            }
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />

          {/* High-Density Zero-Scroll Table Viewport */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto max-h-[52vh] overflow-y-auto bg-white dark:bg-slate-900">
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
                      : 'Silakan pilih kelas jurusan di atas.'}
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

                {/* Fallback Cepat: Kembali ke Tapel Aktif jika tapel yang dipilih bukan tapel aktif */}
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
              /* TABEL SUMMARY / AKUMULASI (9 Kolom Proporsional) */
              <table className="w-full text-left text-xs border-collapse">
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
            ) : (
              /* TABEL MATRIX / PER HARI (Ultra-Dense Zero Scroll: 1..31 + H, S, I, A, T, POIN Pas di Layar) */
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2 px-2 whitespace-nowrap min-w-[110px] max-w-[150px]">Nama Siswa</th>
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
                        <td className="py-1 px-2 font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px]" title={r.nama_siswa}>
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

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/attendance/rekap/kelas-bulanan?kelasId=${kelasId}&bulan=${bulan}&tahunPelajaranId=${tahunPelajaranId}`);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 gap-1.5 cursor-pointer"
            >
              <span>Buka Halaman Rekapitulasi Penuh</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold rounded-xl cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Preview & Unduh PDF Standar */}
      {pdfPreviewUrl && (
        <RekapBulananKelasPdfModal
          pdfPreviewUrl={pdfPreviewUrl}
          pdfFilename={pdfFilename}
          onClose={() => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }}
        />
      )}
    </>
  );
};
