import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  FileSpreadsheet,
  DownloadCloud,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle,
  Calendar,
  X,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import { toast } from 'react-hot-toast';
import {
  attendanceStagingApi,
  type AttendanceStagingItem,
} from '@/api/attendance-staging.api';

const AttendanceStagingDetailModal = lazy(() =>
  import('./AttendanceStagingDetailModal').then((m) => ({ default: m.AttendanceStagingDetailModal }))
);
const AttendanceStagingPreSyncModal = lazy(() =>
  import('./AttendanceStagingPreSyncModal').then((m) => ({ default: m.AttendanceStagingPreSyncModal }))
);
const AttendanceStagingClassMappingModal = lazy(() =>
  import('./AttendanceStagingClassMappingModal').then((m) => ({ default: m.AttendanceStagingClassMappingModal }))
);
const AttendanceStagingManualBackfillModal = lazy(() =>
  import('./AttendanceStagingManualBackfillModal').then((m) => ({ default: m.AttendanceStagingManualBackfillModal }))
);

export interface UniversalAttendanceStagingViewProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  kelasId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
  onSyncSuccess?: () => void;
}

export const AttendanceStagingView: React.FC<UniversalAttendanceStagingViewProps> = React.memo(({
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
  onSyncSuccess,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [stagingSheets, setStagingSheets] = useState<AttendanceStagingItem[]>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'SYNCED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal detail
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<AttendanceStagingItem | null>(null);

  // Pre-Sync Confirmation Modal
  const [preSyncModalOpen, setPreSyncModalOpen] = useState(false);
  const [itemsToSync, setItemsToSync] = useState<AttendanceStagingItem[]>([]);
  const [isExecutingSync, setIsExecutingSync] = useState(false);

  // Class Mapping Modal & Inline state
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [manualBackfillOpen, setManualBackfillOpen] = useState(false);
  const [isRemappingInline, setIsRemappingInline] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingGuard, setIsTogglingGuard] = useState(false);

  const queryClient = useQueryClient();
  const { isAdmin } = useCapabilities();

  const { data: guardRes, isLoading: isGuardLoading, refetch: refetchStagingGuard } = useQuery({
    queryKey: ['attendance-staging-guard'],
    queryFn: () => attendanceStagingApi.getGuardStatus(),
    staleTime: 30_000,
  });

  const guardStatus = guardRes?.data;
  const isGuardEnabled = Boolean(guardStatus?.enabled);

  const handleToggleGuard = async (nextEnabled: boolean) => {
    setIsTogglingGuard(true);
    try {
      const res = await attendanceStagingApi.updateGuardStatus({
        enabled: nextEnabled,
      });
      if (res.success) {
        toast.success(res.message);
        await refetchStagingGuard();
        queryClient.invalidateQueries({ queryKey: ['attendance-staging-guard'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-info'] });
      } else {
        toast.error(res.message || 'Gagal memperbarui status Guard.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui status Guard.');
    } finally {
      setIsTogglingGuard(false);
    }
  };

  // Fetch list sheets from API
  const loadSheets = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await attendanceStagingApi.listSheets({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      if (res.success) {
        setStagingSheets(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load staging sheets:', err);
      toast.error('Gagal memuat data penampung presensi.');
    } finally {
      setIsLoadingList(false);
    }
  }, [statusFilter, searchQuery]);

  // Fetch master class options
  const loadClassOptions = useCallback(async () => {
    try {
      const res = await attendanceStagingApi.getClassOptions();
      if (res.success) {
        setClassOptions(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load class options:', err);
    }
  }, []);

  useEffect(() => {
    loadClassOptions();
  }, [loadClassOptions]);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  // Handle inline remap class
  const handleInlineRemap = async (sheetId: string, kelasId: string) => {
    if (!kelasId) return;
    setIsRemappingInline(sheetId);
    try {
      const res = await attendanceStagingApi.remapClass(sheetId, kelasId);
      if (res.success) {
        toast.success(res.message || 'Pemetaan rombel berhasil diperbarui.');
        loadSheets();
      } else {
        toast.error(res.message || 'Gagal memetakan rombel.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memetakan rombel.');
    } finally {
      setIsRemappingInline(null);
    }
  };

  // Handle URL fetch
  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      toast.error('Mohon masukkan tautan Google Spreadsheet yang valid.');
      return;
    }

    setIsFetching(true);
    try {
      const res = await attendanceStagingApi.fetchSheet(urlInput.trim());
      if (res.success) {
        toast.success(res.message || 'Berhasil menampung data seluruh sheet rombel!');
        setUrlInput('');
        loadSheets();
      } else {
        toast.error(res.message || 'Gagal mengekstrak data spreadsheet.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses URL.';
      toast.error(msg);
    } finally {
      setIsFetching(false);
    }
  };

  // Buka Pre-Sync Modal untuk 1 rombel
  const openSinglePreSync = (item: AttendanceStagingItem) => {
    setItemsToSync([item]);
    setPreSyncModalOpen(true);
  };

  // Buka Pre-Sync Modal untuk bulk rombel
  const openBulkPreSync = () => {
    const selectedItems = stagingSheets.filter((s) => selectedIds.includes(s.id));
    if (selectedItems.length === 0) return;
    setItemsToSync(selectedItems);
    setPreSyncModalOpen(true);
  };

  // Eksekusi Sinkronisasi setelah user mengonfirmasi di Modal
  const handleExecuteSync = async (ids: string[]) => {
    setIsExecutingSync(true);
    try {
      if (ids.length === 1) {
        const res = await attendanceStagingApi.syncSheet(ids[0]);
        if (res.success) {
          toast.success(res.message || 'Berhasil menyinkronkan data presensi.');
          loadSheets();
          onSyncSuccess?.();
          if (selectedSheet?.id === ids[0]) {
            const updatedDetail = await attendanceStagingApi.getSheetDetail(ids[0]);
            if (updatedDetail.success) setSelectedSheet(updatedDetail.data);
          }
        } else {
          toast.error(res.message || 'Gagal menyinkronkan data.');
        }
      } else {
        const res = await attendanceStagingApi.bulkSync(ids);
        if (res.success) {
          toast.success(res.message || `Berhasil menyinkronkan ${ids.length} rombel.`);
          setSelectedIds([]);
          loadSheets();
          onSyncSuccess?.();
        } else {
          toast.error(res.message || 'Gagal melakukan sinkronisasi massal.');
        }
      }
      setPreSyncModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal melakukan sinkronisasi.';
      toast.error(msg);
    } finally {
      setIsExecutingSync(false);
    }
  };

  // Delete single sheet
  const handleDeleteSingle = async (id: string, name: string) => {
    if (!window.confirm(`Hapus data penampung untuk kelas "${name}"? Data di sistem presensi utama tidak akan terhapus.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await attendanceStagingApi.deleteSheet(id);
      if (res.success) {
        toast.success(res.message || 'Data lembar berhasil dihapus.');
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        loadSheets();
        if (selectedSheet?.id === id) setDetailModalOpen(false);
      }
    } catch (err: any) {
      toast.error('Gagal menghapus lembar penampung.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.length} data lembar rombel terpilih dari penampung staging?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await attendanceStagingApi.bulkDelete(selectedIds);
      if (res.success) {
        toast.success(res.message || 'Data lembar terpilih berhasil dihapus.');
        setSelectedIds([]);
        loadSheets();
      }
    } catch (err: any) {
      toast.error('Gagal menghapus lembar terpilih.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((item) => item.id));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filter list
  const filteredList = useMemo(() => {
    return stagingSheets.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.nama_kelas.toLowerCase().includes(q) ||
          item.sheet_name.toLowerCase().includes(q) ||
          (item.rentang_tanggal && item.rentang_tanggal.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [stagingSheets, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = stagingSheets.length;
    const ready = stagingSheets.filter((s) => s.status === 'READY').length;
    const synced = stagingSheets.filter((s) => s.status === 'SYNCED').length;
    const totalStudents = stagingSheets.reduce((acc, curr) => acc + (curr.total_siswa || 0), 0);
    return { total, ready, synced, totalStudents };
  }, [stagingSheets]);

  // Shopee-Grade Mobile Hub Bento Cells (Strictly Max 2 Lines, Hairline 1px Dividers)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalSheets',
        title: 'Total Lembar Rombel',
        value: `${stats.total} Rombel`,
        icon: Layers,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => setStatusFilter('ALL'),
      },
      {
        id: 'readySheets',
        title: 'Siap Sinkron',
        value: `${stats.ready} Rombel`,
        icon: Clock,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        onClick: () => setStatusFilter('READY'),
      },
      {
        id: 'syncedSheets',
        title: 'Tersinkronkan',
        value: `${stats.synced} Rombel`,
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => setStatusFilter('SYNCED'),
      },
      {
        id: 'totalStudents',
        title: 'Total Baris Siswa',
        value: `${stats.totalStudents.toLocaleString()} Siswa`,
        icon: FileSpreadsheet,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
      },
    ],
    [stats]
  );

  return (
    <div className={cn('space-y-3 w-full max-w-full min-w-0', isModal && 'p-1 sm:p-2')}>
      {/* Top Banner & Info (Compact Mode when inside Modal/Tab) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-2xl p-3.5 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                Smart Dispatcher 5 Siklus Presensi
              </span>
              {stagingSheets[0]?.tahun_pelajaran_nama && (
                <span className="inline-flex items-center gap-1 bg-black/30 border border-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-300">
                  <Calendar className="w-3 h-3 text-amber-400" /> TP {stagingSheets[0].tahun_pelajaran_nama}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-xl font-black tracking-tight">
              Wadah Penampung Presensi (Attendance Staging Hub)
            </h1>
            {!hideLayout && (
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Penampung data presensi multi-sheet mingguan dari Google Spreadsheet atau input manual untuk didistribusikan ke Upacara, Ketarunaan, Dhuha, dan Apel Sore.
              </p>
            )}
          </div>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="self-end sm:self-start p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold"
              title="Tutup Modal Staging Presensi"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* Shopee-Grade Hairline Bento Grid Metrics (1 Card Container, 2 Lines Max) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <HubBentoGrid cells={bentoCells} columns={4} />
      </div>

      {/* ── OFFICIAL EVENT GUARD BANNER (ANTI-MANIPULATION GUARD) ── */}
      {isGuardEnabled ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Unlock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                  Mode Event Resmi Aktif • Guard Staging &amp; Backfill Terbuka
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                  DISETUJUI ADMIN
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                Administrator telah membuka akses <strong>Event Resmi Rekonsiliasi Presensi</strong>. Anda dapat menarik spreadsheet, membuat backfill manual, dan menyinkronkan data ke presensi utama.
                {guardStatus?.updated_by && (
                  <span className="opacity-80"> (Diaktifkan oleh: {guardStatus.updated_by})</span>
                )}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isTogglingGuard}
              onClick={() => handleToggleGuard(false)}
              className="shrink-0 h-8 px-3 text-xs font-bold border-rose-300 bg-white hover:bg-rose-50 text-rose-700 dark:bg-slate-900 dark:border-rose-800 dark:text-rose-300 rounded-xl gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isTogglingGuard ? 'Mengunci...' : 'Kunci Kembali Guard (Tutup Event)'}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100">
                  Guard Keamanan Aktif: Fitur Staging &amp; Backfill Presensi Sedang Dikunci
                </h3>
                <Badge className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5">
                  DI LUAR EVENT RESMI
                </Badge>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed max-w-3xl">
                Untuk menghindari manipulasi data presensi ke belakang, eksekusi penarikan spreadsheet, backfill manual, dan sinkronisasi presensi <strong>hanya dapat dilakukan saat diaktifkan oleh Administrator Sekolah</strong> pada Event Resmi Rekonsiliasi. Anda tetap dapat melihat dan memeriksa daftar lembar penampung di bawah ini dalam mode baca.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <Button
              type="button"
              size="sm"
              disabled={isTogglingGuard || isGuardLoading}
              onClick={() => handleToggleGuard(true)}
              className="shrink-0 h-9 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isTogglingGuard ? 'Mengaktifkan...' : 'Aktifkan Event Resmi (Buka Guard)'}</span>
            </Button>
          ) : (
            <div className="shrink-0 px-3 py-2 rounded-xl bg-amber-100/80 dark:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>Hubungi Admin untuk Membuka Guard</span>
            </div>
          )}
        </div>
      )}

      {/* URL Ingestion Form Card (Compact) */}
      {!readOnly && (
        <Card className={cn(
          'p-3.5 sm:p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl transition-opacity',
          !isGuardEnabled && 'opacity-70'
        )}>
          <form onSubmit={handleFetchUrl} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Tarik Data dari Google Spreadsheet atau Input Backfill
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pastikan tautan Google Spreadsheet berstatus <strong>&quot;Siapa saja yang memiliki link dapat melihat (Viewer)&quot;</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!isGuardEnabled}
                  onClick={() => {
                    if (!isGuardEnabled) {
                      toast.error('Guard Keamanan sedang terkunci. Hubungi Admin untuk mengaktifkan Event Resmi.');
                      return;
                    }
                    setManualBackfillOpen(true);
                  }}
                  className="h-8 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-3 rounded-xl shadow-2xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  Input Backfill Cepat (Manual UI)
                </Button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1FHKzAAVEEcRz3uzEptsgRk09z7mqmQ1ZwFCIwF1Iwe0/edit?gid=1255049954#gid=1255049954"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Sampel Sheet
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1FHKzAAVEEcRz3uzEptsgRk09z7mqmQ1ZwFCIwF1Iwe0/edit#gid=0"
                  className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-100 transition-all font-mono disabled:opacity-60"
                  disabled={isFetching || !isGuardEnabled}
                />
                <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <Button
                type="submit"
                disabled={isFetching || !urlInput.trim() || !isGuardEnabled}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Mengekstrak Sheet...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Tarik Data Lembar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table Toolbar & Search */}
      <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Semua ({stagingSheets.length})
            </button>
            <button
              onClick={() => setStatusFilter('READY')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                statusFilter === 'READY'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Siap Sinkron ({stats.ready})
            </button>
            <button
              onClick={() => setStatusFilter('SYNCED')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                statusFilter === 'SYNCED'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Tersinkronkan ({stats.synced})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas (contoh: TE1, TM 2)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMappingModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              title="Petakan seluruh lembar sheet spreadsheet ke data master rombel sekolah"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Petakan Rombel Master</span>
            </Button>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadSheets}
              disabled={isLoadingList}
              className="flex items-center gap-1.5 rounded-lg text-xs"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoadingList && 'animate-spin')} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar (when selected) */}
        {selectedIds.length > 0 && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-wrap items-center justify-between gap-2 transition-all">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                {selectedIds.length}
              </span>
              Rombel Terpilih
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={openBulkPreSync}
                disabled={isExecutingSync || !isGuardEnabled}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs flex items-center gap-1.5 rounded-lg shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sinkronkan Semua Terpilih
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-300 text-xs flex items-center gap-1.5 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terpilih
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main Table Card */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-indigo-600 focus:outline-none"
                    title={selectedIds.length === filteredList.length ? 'Batal pilih semua' : 'Pilih semua'}
                  >
                    {filteredList.length > 0 && selectedIds.length === filteredList.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Nama Rombel / Sheet</th>
                <th className="py-3.5 px-4">Rentang Tanggal</th>
                <th className="py-3.5 px-4 text-center">Jumlah Siswa</th>
                <th className="py-3.5 px-4 text-center">Kecocokan DB</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingList ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data lembar penampung...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada lembar presensi yang ditampung.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Masukkan tautan Google Spreadsheet di formulir atas dan klik "Tarik Data Lembar" untuk memulai.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isReady = item.status === 'READY';
                  const isSynced = item.status === 'SYNCED';

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors',
                        isSelected && 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectItem(item.id)}
                          className="text-slate-500 hover:text-indigo-600 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Sheet Name & Class with Inline Master Mapping Selector */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.nama_kelas}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                            Sheet: {item.sheet_name}
                          </span>
                        </div>

                        {/* Inline Class Mapping Selector */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <select
                            value={item.kelas_id || ''}
                            onChange={(e) => handleInlineRemap(item.id, e.target.value)}
                            disabled={isRemappingInline === item.id}
                            className={cn(
                              'text-[11px] py-1 px-2 rounded-lg border font-medium transition-all max-w-[210px] truncate cursor-pointer',
                              item.total_matched_siswa === 0
                                ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                                : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                            )}
                            title="Ganti pemetaan rombel master untuk sheet ini"
                          >
                            <option value="">-- Pilih Kelas Master --</option>
                            {classOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nama_kelas} {c.jurusan_nama ? `(${c.jurusan_nama})` : ''}
                              </option>
                            ))}
                          </select>

                          {isRemappingInline === item.id ? (
                            <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin shrink-0" />
                          ) : item.kelas_id && item.total_matched_siswa > 0 ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-semibold shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Terhubung
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMappingModalOpen(true)}
                              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-bold shrink-0"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-500" /> Petakan Rombel
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Rentang Tanggal & Konteks TP */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        <div>{item.rentang_tanggal || '-'}</div>
                        <div className="text-[10px] font-sans font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                          TP: {item.tahun_pelajaran_nama || 'TP Aktif'}
                        </div>
                      </td>

                      {/* Total Siswa */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {item.total_siswa} Siswa
                      </td>

                      {/* Matched Siswa */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-bold font-mono',
                            item.total_matched_siswa === item.total_siswa && item.total_siswa > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          )}
                        >
                          {item.total_matched_siswa} / {item.total_siswa} Cocok
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isSynced ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="w-3 h-3" /> TERSINKRON
                          </Badge>
                        ) : isReady ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1">
                            <Clock className="w-3 h-3" /> SIAP SINKRON
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 text-[10px] font-semibold gap-1">
                            <AlertCircle className="w-3 h-3" /> ERROR
                          </Badge>
                        )}
                        {item.last_synced_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(item.last_synced_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSheet(item);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
                            title="Pratinjau Matriks Presensi & Smart Dispatcher"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pratinjau</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => openSinglePreSync(item)}
                            disabled={isExecutingSync || !isGuardEnabled}
                            className={cn(
                              'h-8 px-2.5 text-xs rounded-lg flex items-center gap-1 disabled:opacity-50',
                              isSynced
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            )}
                            title={!isGuardEnabled ? 'Dikunci oleh Guard Keamanan (Di Luar Event Resmi)' : isSynced ? 'Sinkronkan Ulang Data' : 'Sinkronkan Sekarang'}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isSynced ? 'Ulang' : 'Sinkron'}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSingle(item.id, item.nama_kelas)}
                            disabled={isDeleting}
                            className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Hapus Lembar Penampung"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {detailModalOpen && (
        <Suspense fallback={null}>
          <AttendanceStagingDetailModal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedSheet(null);
            }}
            item={selectedSheet}
            onSync={(id) => {
              const target = stagingSheets.find((s) => s.id === id) || selectedSheet;
              if (target) openSinglePreSync(target);
            }}
            isSyncing={isExecutingSync}
            onMappingSaved={loadSheets}
          />
        </Suspense>
      )}

      {/* Pre-Sync Confirmation Modal */}
      {preSyncModalOpen && (
        <Suspense fallback={null}>
          <AttendanceStagingPreSyncModal
            isOpen={preSyncModalOpen}
            onClose={() => {
              setPreSyncModalOpen(false);
              setItemsToSync([]);
            }}
            items={itemsToSync}
            onConfirmSync={handleExecuteSync}
            isSyncing={isExecutingSync}
          />
        </Suspense>
      )}

      {/* Class Mapping Modal */}
      {mappingModalOpen && (
        <Suspense fallback={null}>
          <AttendanceStagingClassMappingModal
            isOpen={mappingModalOpen}
            onClose={() => setMappingModalOpen(false)}
            sheets={stagingSheets}
            classOptions={classOptions}
            onMappingSaved={loadSheets}
          />
        </Suspense>
      )}

      {/* Manual Multi-Date Backfill Modal */}
      {manualBackfillOpen && (
        <Suspense fallback={null}>
          <AttendanceStagingManualBackfillModal
            isOpen={manualBackfillOpen}
            onClose={() => setManualBackfillOpen(false)}
            classOptions={classOptions}
            onSuccess={() => {
              loadSheets();
              onSyncSuccess?.();
            }}
          />
        </Suspense>
      )}
    </div>
  );
});

AttendanceStagingView.displayName = 'AttendanceStagingView';
