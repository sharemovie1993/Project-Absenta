import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  FileSpreadsheet,
  Link as LinkIcon,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  BookOpen,
  ExternalLink,
  Search,
  Check,
  FolderTree,
  ChevronDown,
  Layers,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { TabSwitcher, TabOption } from '@/components/ui/TabSwitcher';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/date.utils';
import { raporApi, RaporStagingItem, RaporStagingDetail, RaporPreSyncReport } from '@/api/rapor.api';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { useConfirm } from '@/providers/ConfirmProvider';

// ── Lazy Loading Komponen Berat (Pilar 11 / Hardening Guard) ──
const RaporStagingFetchModal = lazy(() =>
  import('@/components/rapor/staging/RaporStagingFetchModal').then((m) => ({
    default: m.RaporStagingFetchModal,
  }))
);

const RaporStagingDetailModal = lazy(() =>
  import('@/components/rapor/staging/RaporStagingDetailModal').then((m) => ({
    default: m.RaporStagingDetailModal,
  }))
);

const RaporStagingPreSyncModal = lazy(() =>
  import('@/components/rapor/staging/RaporStagingPreSyncModal').then((m) => ({
    default: m.RaporStagingPreSyncModal,
  }))
);

// ── Zod Schema Validation Guard (Pilar 25 / Form Security) ──
const fetchUrlsSchema = z.object({
  urls: z.array(z.string().min(10, 'Tautan tidak valid')).min(1, 'Minimal satu tautan diperlukan'),
});

// Helper penentu Tingkat Kelas dari nama rombel (X, XI, XII)
function extractTingkatKelas(namaKelas: string): string {
  const upper = (namaKelas || '').trim().toUpperCase();
  if (upper.startsWith('XII') || upper.includes('KELAS 12') || upper.includes('KELAS XII')) return 'Kelas XII';
  if (upper.startsWith('XI') || upper.includes('KELAS 11') || upper.includes('KELAS XI')) return 'Kelas XI';
  if (upper.startsWith('X') || upper.includes('KELAS 10') || upper.includes('KELAS X')) return 'Kelas X';
  return 'Lainnya';
}

export default React.memo(function RaporStagingPage() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const {
    selectedTahunPelajaran,
    selectedSemester,
    handleTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
  } = useAcademicContext();

  // Search & Navigation Hierarchy State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTahunAjaranTab, setSelectedTahunAjaranTab] = useState<string>('ALL');
  const [selectedTingkatTab, setSelectedTingkatTab] = useState<string>('ALL');
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<string>('ALL');

  // Modals State
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [preSyncTargetId, setPreSyncTargetId] = useState<string | null>(null);

  // ── Query: Daftar Staging Sheets ──
  const { data: sheets = [], isLoading } = useQuery<RaporStagingItem[]>({
    queryKey: ['rapor-staging-sheets'],
    queryFn: async () => {
      const res = await raporApi.getStagedSheets();
      return (res?.data || []) as RaporStagingItem[];
    },
  });

  // ── Query: Detail Preview Staging Sheet ──
  const { data: previewData, isLoading: isLoadingPreview } = useQuery<RaporStagingDetail>({
    queryKey: ['rapor-staging-detail', previewId],
    queryFn: async () => {
      if (!previewId) throw new Error('ID lembar staging belum dipilih');
      const res = await raporApi.getStagedSheetDetail(previewId);
      return res?.data as RaporStagingDetail;
    },
    enabled: !!previewId,
  });

  // ── Query: Laporan Kesiapan Pre-Sync Slot ──
  const { data: preSyncReport, isLoading: isLoadingPreSync } = useQuery<RaporPreSyncReport>({
    queryKey: ['rapor-staging-pre-sync', preSyncTargetId],
    queryFn: async () => {
      if (!preSyncTargetId) throw new Error('Target pre-sync belum dipilih');
      const res = await raporApi.checkPreSyncReadiness(preSyncTargetId);
      return res?.data as RaporPreSyncReport;
    },
    enabled: !!preSyncTargetId,
  });

  // ── Mutation: Fetch & Stage Sheets ──
  const fetchMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const validation = fetchUrlsSchema.safeParse({ urls });
      if (!validation.success) {
        throw new Error(validation.error.errors[0]?.message || 'Validasi tautan gagal');
      }
      return await raporApi.fetchAndStageGoogleSheets(urls);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      const results = res?.data?.results || [];
      const errors = res?.data?.errors || [];

      if (results.length > 0) {
        setIsFetchModalOpen(false);
        toast.success(`Berhasil memproses ${results.length} Google Sheet kelas!`);
      }

      if (errors.length > 0) {
        errors?.map((errItem: { url: string; error: string }) => {
          toast.error(errItem.error, { duration: 9000 });
          return null;
        });
      }
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Gagal memproses tautan Google Sheet';
      toast.error(errorMsg);
    },
  });

  // ── Mutation: Sync Staging ke e-Rapor ──
  const syncMutation = useMutation({
    mutationFn: async ({
      id,
      autoProvisionStudents,
      customMapelMapping,
      sumberNilaiRapor,
      customKelasId,
    }: {
      id: string;
      autoProvisionStudents?: boolean;
      customMapelMapping?: Record<string, string>;
      sumberNilaiRapor?: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL';
      customKelasId?: string;
    }) => {
      return await raporApi.syncStagingToRapor(id, {
        autoProvisionStudents,
        customMapelMapping,
        sumberNilaiRapor,
        customKelasId,
      });
    },
    onSuccess: (res) => {
      // Invalidate staging sheets
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      // Invalidate Leger & Cetak Rapor
      queryClient.invalidateQueries({ queryKey: ['leger'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress'] });
      // Invalidate Lembar Input Nilai & Monitoring
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['class-subject-progress-input'] });
      queryClient.invalidateQueries({ queryKey: ['school-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['school-teacher-monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['kelas-options-list'] });
      setPreSyncTargetId(null);
      const { totalNilaiSynced, totalRaporSynced, autoProvisionedCount, unmappedStudents } = res?.data || {};

      let msg = `Sinkronisasi berhasil! ${totalNilaiSynced || 0} nilai & ${totalRaporSynced || 0} rapor diperbarui.`;
      if ((autoProvisionedCount || 0) > 0) {
        msg += ` (${autoProvisionedCount} siswa baru otomatis didaftarkan)`;
      }
      if ((unmappedStudents?.length || 0) > 0) {
        msg += ` (${unmappedStudents.length} siswa dilewati)`;
      }
      toast.success(msg, { duration: 6000 });
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Gagal menyinkronkan data ke e-Rapor';
      toast.error(errorMsg);
    },
  });

  // ── Mutation: Delete Staged Sheet ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await raporApi.deleteStagedSheet(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      toast.success('Lembar staging berhasil dihapus dari penampung');
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Gagal menghapus data staging';
      toast.error(errorMsg);
    },
  });

  // ── Event Handlers dengan useCallback (Pilar 3) ──
  const handleOpenFetchModal = useCallback(() => {
    setIsFetchModalOpen(true);
  }, []);

  const handleCloseFetchModal = useCallback(() => {
    setIsFetchModalOpen(false);
  }, []);

  const handleFetchSubmit = useCallback(
    (urls: string[]) => {
      fetchMutation.mutate(urls);
    },
    [fetchMutation]
  );

  const handleOpenPreview = useCallback((id: string) => {
    setPreviewId(id);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewId(null);
  }, []);

  const handleTriggerSync = useCallback((id: string) => {
    setPreSyncTargetId(id);
  }, []);

  const handleClosePreSync = useCallback(() => {
    setPreSyncTargetId(null);
  }, []);

  const handleConfirmPreSync = useCallback(
    (
      autoProvision: boolean,
      customMapping?: Record<string, string>,
      sumberNilaiRapor?: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL',
      customKelasId?: string
    ) => {
      if (!preSyncTargetId) return;
      syncMutation.mutate({
        id: preSyncTargetId,
        autoProvisionStudents: autoProvision,
        customMapelMapping: customMapping,
        sumberNilaiRapor,
        customKelasId,
      });
    },
    [preSyncTargetId, syncMutation]
  );

  const handleDeleteSheet = useCallback(
    async (item: RaporStagingItem) => {
      const confirmed = await confirm({
        title: 'Hapus Lembar Staging',
        message: `Yakin ingin menghapus lembar penampung kelas ${item.nama_kelas} (${item.tahun_pelajaran_nama} - ${item.semester})?`,
        confirmText: 'Hapus Lembar',
        cancelText: 'Batal',
        variant: 'danger',
      });

      if (confirmed) {
        deleteMutation.mutate(item.id);
      }
    },
    [confirm, deleteMutation]
  );

  // ── Ekstraksi Pilihan Hirarki Tab (Tahun Ajaran, Tingkat, Semester) ──
  const tahunAjaranOptions: TabOption[] = useMemo(() => {
    const rawSet = new Set<string>();
    sheets?.forEach((s) => {
      if (s.tahun_pelajaran_nama) rawSet.add(s.tahun_pelajaran_nama.trim());
    });
    const sorted = Array.from(rawSet).sort();
    return [
      { id: 'ALL', label: `Semua Tahun (${sheets.length})` },
      ...(sorted?.map((tp) => {
        const count = sheets.filter((s) => s.tahun_pelajaran_nama?.trim() === tp).length;
        return { id: tp, label: `${tp} (${count})` };
      }) || []),
    ];
  }, [sheets]);

  const tingkatOptions: TabOption[] = useMemo(() => {
    const counts: Record<string, number> = { 'Kelas X': 0, 'Kelas XI': 0, 'Kelas XII': 0, Lainnya: 0 };
    sheets?.forEach((s) => {
      const t = extractTingkatKelas(s.nama_kelas);
      counts[t] = (counts[t] || 0) + 1;
    });

    const items: TabOption[] = [
      { id: 'ALL', label: 'Semua Tingkat' },
      { id: 'Kelas X', label: `Kelas X (${counts['Kelas X'] || 0})` },
      { id: 'Kelas XI', label: `Kelas XI (${counts['Kelas XI'] || 0})` },
      { id: 'Kelas XII', label: `Kelas XII (${counts['Kelas XII'] || 0})` },
    ];
    if (counts['Lainnya'] > 0) {
      items.push({ id: 'Lainnya', label: `Lainnya (${counts['Lainnya']})` });
    }
    return items;
  }, [sheets]);

  const semesterFilterOptions: TabOption[] = useMemo(() => {
    const ganjilCount = sheets.filter((s) => s.semester?.toLowerCase().includes('ganjil')).length;
    const genapCount = sheets.filter((s) => s.semester?.toLowerCase().includes('genap')).length;
    return [
      { id: 'ALL', label: 'Semua Semester' },
      { id: 'Ganjil', label: `Semester Ganjil (${ganjilCount})` },
      { id: 'Genap', label: `Semester Genap (${genapCount})` },
    ];
  }, [sheets]);

  // ── Memoized Filtered List & Metrics (Pilar 3) ──
  const filteredSheets = useMemo(() => {
    return (sheets || []).filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        s.nama_kelas?.toLowerCase()?.includes(q) ||
        s.tahun_pelajaran_nama?.toLowerCase()?.includes(q) ||
        s.wali_kelas_nama?.toLowerCase()?.includes(q) ||
        s.jurusan_nama?.toLowerCase()?.includes(q);

      const matchTahun =
        selectedTahunAjaranTab === 'ALL' || s.tahun_pelajaran_nama?.trim() === selectedTahunAjaranTab;

      const matchTingkat =
        selectedTingkatTab === 'ALL' || extractTingkatKelas(s.nama_kelas) === selectedTingkatTab;

      const matchSemester =
        selectedSemesterTab === 'ALL' ||
        s.semester?.toLowerCase().includes(selectedSemesterTab.toLowerCase());

      return matchSearch && matchTahun && matchTingkat && matchSemester;
    });
  }, [sheets, searchQuery, selectedTahunAjaranTab, selectedTingkatTab, selectedSemesterTab]);

  // Pengelompokan Hirarkis Otomatis (Tingkat Kelas -> Rombel)
  const groupedByTingkat = useMemo(() => {
    const groups: Record<string, RaporStagingItem[]> = {};
    filteredSheets?.forEach((item) => {
      const tingkat = extractTingkatKelas(item.nama_kelas);
      if (!groups[tingkat]) groups[tingkat] = [];
      groups[tingkat].push(item);
    });
    return groups;
  }, [filteredSheets]);

  const metrics = useMemo(() => {
    const list = filteredSheets || [];
    const totalSheets = list.length;
    const syncedSheets = list.filter((s) => s.status === 'SYNCED').length;
    const readySheets = list.filter((s) => s.status === 'READY').length;
    const totalStudents = list.reduce((acc, curr) => acc + (curr.total_siswa || 0), 0);
    return { totalSheets, syncedSheets, readySheets, totalStudents };
  }, [filteredSheets]);

  return (
    <AcademicPageLayout
      title="Wadah Penampung Nilai Rapor"
      subtitle="Hubungkan dan sinkronkan tautan Google Sheet per kelas langsung ke e-Rapor resmi"
      hardeningModuleKey="rapor-staging"
      instruction={{
        title: 'Panduan Wadah Penampung Google Sheet',
        items: [
          'Salin dan tempel tautan berkas Google Sheet kelas atau tautan Folder Google Drive induk.',
          'Penyajian data otomatis diorganisir berjenjang: Tahun Ajaran → Tingkat Kelas (X, XI, XII) → Semester (Ganjil / Genap).',
          'Pada tautan Folder Google Drive, sistem cerdas memfilter hanya berkas Google Sheets (mengabaikan PDF & dokumen lain).',
          'Gunakan tombol Pratinjau Data untuk memeriksa kelengkapan siswa dan nilai sebelum melakukan 1-Click Sync.',
        ],
      }}
    >
      <div className="space-y-6 w-full max-w-full min-w-0">
        {/* ── Kontainer Utama (Pilar 16 / SectionCard Standard) ── */}
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 shadow-2xs">
          {/* Header Action Bar Terpadu */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <AcademicContextBar
                id="staging-rapor-context"
                tahunPelajaranId={selectedTahunPelajaran}
                semesterId={selectedSemester}
                onTahunPelajaranChange={handleTpChange}
                onSemesterChange={handleSemesterChange}
                tpOptions={tpOptions}
                semesterOptions={semesterOptions}
                isLoadingTp={isLoadingTp}
                isLoadingSem={isLoadingSem}
                variant="toolbar"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handleOpenFetchModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 h-9 w-full sm:w-auto"
                size="sm"
                aria-label="Buka dialog hubungkan Google Sheet baru"
              >
                <LinkIcon size={14} aria-hidden="true" />
                <span>+ Hubungkan Google Sheet</span>
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* ── 4 Metrics Cards (Pilar 30 / Responsive Compact Premium) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
              <AnalyticsCard
                title="Sheet Terfilter"
                value={`${metrics.totalSheets} Rombel`}
                icon={<FileSpreadsheet size={18} aria-hidden="true" />}
                gradient="from-sky-500 to-sky-700 text-white"
                subtitle={`${metrics.totalStudents} Siswa Terdaftar`}
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Siap Disinkronkan"
                value={`${metrics.readySheets} Rombel`}
                icon={<Clock size={18} aria-hidden="true" />}
                gradient="from-amber-500 to-amber-700 text-white"
                subtitle="Menunggu 1-Click Sync"
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Tersinkron ke e-Rapor"
                value={`${metrics.syncedSheets} Rombel`}
                icon={<CheckCircle2 size={18} aria-hidden="true" />}
                gradient="from-emerald-500 to-emerald-700 text-white"
                subtitle="Masuk ke Nilai & Leger"
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Rata-rata Mapel"
                value="17 Mapel"
                icon={<BookOpen size={18} aria-hidden="true" />}
                gradient="from-purple-500 to-purple-700 text-white"
                subtitle="Kurikulum Merdeka SMK"
                mobileCompact={true}
              />
            </div>

            {/* ── STRUKTUR HIRARKI ORGANISIR FOLDER GOOGLE DRIVE (Pilar 27 & Responsif) ── */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <FolderTree size={16} className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Pengorganisasian Struktur Berkas Google Drive:</span>
              </div>

              {/* Tingkat 1: Tahun Pelajaran Folder */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Calendar size={13} aria-hidden="true" />
                  <span>1. Folder Tahun Pelajaran:</span>
                </div>
                <div className="w-full overflow-x-auto no-scrollbar flex-nowrap">
                  <TabSwitcher
                    options={tahunAjaranOptions}
                    activeTab={selectedTahunAjaranTab}
                    onChange={setSelectedTahunAjaranTab}
                  />
                </div>
              </div>

              {/* Tingkat 2 & 3: Tingkat Kelas & Semester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                {/* Tingkat Kelas (X, XI, XII) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <GraduationCap size={13} aria-hidden="true" />
                    <span>2. Sub-Folder Tingkat Kelas:</span>
                  </div>
                  <div className="w-full overflow-x-auto no-scrollbar flex-nowrap">
                    <TabSwitcher
                      options={tingkatOptions}
                      activeTab={selectedTingkatTab}
                      onChange={setSelectedTingkatTab}
                    />
                  </div>
                </div>

                {/* Semester (Ganjil / Genap) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Layers size={13} aria-hidden="true" />
                    <span>3. Sub-Folder Semester:</span>
                  </div>
                  <div className="w-full overflow-x-auto no-scrollbar flex-nowrap">
                    <TabSwitcher
                      options={semesterFilterOptions}
                      activeTab={selectedSemesterTab}
                      onChange={setSelectedSemesterTab}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Search & Counter Bar (Pilar 10 / A11y Form Guard) ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs w-full">
              <div className="relative w-full sm:w-80 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <label htmlFor="search-staging-kelas" className="sr-only">
                  Cari kelas, tahun ajaran, atau wali kelas
                </label>
                <Input
                  id="search-staging-kelas"
                  placeholder="Cari kelas, jurusan, walas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl w-full"
                  aria-label="Cari kelas, tahun ajaran, atau wali kelas"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto shrink-0">
                <span className="hidden sm:inline">Status Tampilan:</span>
                <span>
                  Menampilkan <strong>{filteredSheets?.length || 0}</strong> dari <strong>{sheets?.length || 0}</strong> rombel terdaftar
                </span>
              </div>
            </div>

            {/* ── Daftar Berkas Rombel Menurut Hirarki Tingkat ── */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-500" size={24} aria-hidden="true" />
                <p className="text-sm font-medium">Memuat wadah penampung nilai rapor...</p>
              </div>
            ) : (filteredSheets?.length || 0) === 0 ? (
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <FileSpreadsheet size={28} aria-hidden="true" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Tidak Ditemukan Lembar Rapor pada Filter Ini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ubah filter tahun ajaran, tingkat kelas, atau semester di atas, atau klik tombol di bawah untuk menghubungkan Google Sheet baru.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleOpenFetchModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                  aria-label="Hubungkan Google Sheet sekarang"
                >
                  <LinkIcon size={14} aria-hidden="true" />
                  <span>Hubungkan Google Sheet Sekarang</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByTingkat)?.map(([tingkatLabel, classItems]) => (
                  <div key={tingkatLabel} className="space-y-3">
                    {/* Header Kelompok Tingkat Kelas */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          {tingkatLabel}
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-semibold text-slate-500">
                          {classItems.length} Rombel
                        </Badge>
                      </div>
                    </div>

                    {/* Grid Kartu Rombel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                      {classItems?.map((item) => {
                        const isSyncing = syncMutation.isPending && syncMutation.variables === item.id;
                        const isDeleting = deleteMutation.isPending && deleteMutation.variables === item.id;

                        return (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 min-w-0"
                          >
                            <div className="space-y-3 min-w-0">
                              {/* Header Card */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight truncate">
                                      {item.nama_kelas}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                        item.status === 'SYNCED'
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60'
                                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60'
                                      )}
                                    >
                                      {item.status === 'SYNCED' ? 'Tersinkron' : 'Siap Sinkron'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {item.tahun_pelajaran_nama} • Semester {item.semester}
                                  </p>
                                </div>

                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Buka Google Sheet asli di tab baru"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                  aria-label={`Buka Google Sheet kelas ${item.nama_kelas}`}
                                >
                                  <ExternalLink size={16} aria-hidden="true" />
                                </a>
                              </div>

                              {/* Metadata Specs - Grid Responsive */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-medium text-slate-400 block uppercase">Wali Kelas</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                                    {item.wali_kelas_nama || 'Belum terisi'}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] font-medium text-slate-400 block uppercase">Konsentrasi</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                                    {item.jurusan_nama || 'Umum'}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[10px] font-medium text-slate-400 block uppercase">Daftar Siswa</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    {item.total_siswa} Siswa
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[10px] font-medium text-slate-400 block uppercase">Mata Pelajaran</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    {item.total_mapel} Mapel
                                  </span>
                                </div>
                              </div>

                              {/* Status Sync Timestamp Menggunakan Timezone & Date Standard */}
                              {item.last_synced_at && (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                  <Check size={12} aria-hidden="true" />
                                  <span className="truncate">
                                    Terakhir disinkronkan: {formatDateTime(item.last_synced_at)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => handleOpenPreview(item.id)}
                                className="text-xs h-8 gap-1.5 rounded-xl text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                aria-label={`Pratinjau data kelas ${item.nama_kelas}`}
                              >
                                <Eye size={13} aria-hidden="true" />
                                <span>Pratinjau Data</span>
                              </Button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  type="button"
                                  disabled={isSyncing}
                                  onClick={() => handleTriggerSync(item.id)}
                                  className={cn(
                                    'text-xs h-8 gap-1.5 rounded-xl font-semibold shadow-2xs',
                                    item.status === 'SYNCED'
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  )}
                                  aria-label={`Sinkronkan data kelas ${item.nama_kelas} ke e-Rapor`}
                                >
                                  <RefreshCw size={12} className={cn(isSyncing && 'animate-spin')} aria-hidden="true" />
                                  <span>{item.status === 'SYNCED' ? 'Sinkron Ulang' : '1-Click Sync'}</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteSheet(item)}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-xl"
                                  aria-label={`Hapus lembar penampung kelas ${item.nama_kelas}`}
                                  title="Hapus dari Hub"
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── MODAL 1: HUBUNGKAN GOOGLE SHEET (Suspense & Lazy Loaded) ── */}
      <Suspense fallback={<div className="p-4 text-center"><Loader /></div>}>
        {isFetchModalOpen && (
          <RaporStagingFetchModal
            isOpen={isFetchModalOpen}
            onClose={handleCloseFetchModal}
            onSubmit={handleFetchSubmit}
            isPending={fetchMutation.isPending}
          />
        )}
      </Suspense>

      {/* ── MODAL 2: PRATINJAU INTERAKTIF (Suspense & Lazy Loaded) ── */}
      <Suspense fallback={<div className="p-4 text-center"><Loader /></div>}>
        {previewId && (
          <RaporStagingDetailModal
            isOpen={!!previewId}
            onClose={handleClosePreview}
            previewData={previewData}
            isLoading={isLoadingPreview}
            onSync={handleTriggerSync}
          />
        )}
      </Suspense>

      {/* ── MODAL 3: PEMERIKSAAN KESIAPAN SLOT (PRE-SYNC) ── */}
      <Suspense fallback={<div className="p-4 text-center"><Loader /></div>}>
        {preSyncTargetId && (
          <RaporStagingPreSyncModal
            isOpen={!!preSyncTargetId}
            onClose={handleClosePreSync}
            report={preSyncReport || null}
            isLoading={isLoadingPreSync}
            onConfirmSync={handleConfirmPreSync}
            isSyncing={syncMutation.isPending}
          />
        )}
      </Suspense>
    </AcademicPageLayout>
  );
});
