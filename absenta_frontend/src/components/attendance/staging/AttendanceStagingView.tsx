import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  DownloadCloud,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import {
  attendanceStagingApi,
  type AttendanceStagingItem,
} from '@/api/attendance-staging.api';
import { AttendanceStagingDetailModal } from './AttendanceStagingDetailModal';

export const AttendanceStagingView: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [stagingSheets, setStagingSheets] = useState<AttendanceStagingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'SYNCED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal detail
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<AttendanceStagingItem | null>(null);
  const [isSyncingSingle, setIsSyncingSingle] = useState(false);
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

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

  // Sync single sheet
  const handleSyncSingle = async (id: string) => {
    setIsSyncingSingle(true);
    try {
      const res = await attendanceStagingApi.syncSheet(id);
      if (res.success) {
        toast.success(res.message || 'Berhasil menyinkronkan data presensi.');
        loadSheets();
        if (selectedSheet?.id === id) {
          // Refresh sheet detail if open
          const updatedDetail = await attendanceStagingApi.getSheetDetail(id);
          if (updatedDetail.success) setSelectedSheet(updatedDetail.data);
        }
      } else {
        toast.error(res.message || 'Gagal menyinkronkan data.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal melakukan sinkronisasi.';
      toast.error(msg);
    } finally {
      setIsSyncingSingle(false);
    }
  };

  // Bulk Sync
  const handleBulkSync = async () => {
    if (selectedIds.length === 0) return;
    setIsSyncingBulk(true);
    try {
      const res = await attendanceStagingApi.bulkSync(selectedIds);
      if (res.success) {
        toast.success(res.message || `Berhasil menyinkronkan ${selectedIds.length} rombel.`);
        setSelectedIds([]);
        loadSheets();
      } else {
        toast.error(res.message || 'Gagal melakukan sinkronisasi massal.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal sinkronisasi massal.';
      toast.error(msg);
    } finally {
      setIsSyncingBulk(false);
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            Superadmin & Kesiswaan Staging Protocol
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Wadah Penampung Presensi (Attendance Staging Hub)
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Modul penampung data presensi multi-sheet mingguan dari Google Spreadsheet. Seluruh rombel diinspeksi secara terisolasi sebelum didistribusikan secara presisi (Smart Dispatcher) ke modul Upacara, Ketarunaan, Duha, dan Apel Pulang.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs text-white/80">
            <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Smart Agenda Dispatcher
            </span>
            <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Validasi NIS/NISN Otomatis
            </span>
            <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg">
              <Layers className="w-3.5 h-3.5 text-cyan-300" /> Multi-Sheet 20+ Rombel
            </span>
          </div>
        </div>
      </div>

      {/* URL Ingestion Form Card */}
      <Card className="p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
        <form onSubmit={handleFetchUrl} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Tarik Data dari Google Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pastikan tautan Google Spreadsheet berstatus <strong>"Siapa saja yang memiliki link dapat melihat (Viewer)"</strong>.
              </p>
            </div>
            <a
              href="https://docs.google.com/spreadsheets/d/1FHKzAAVEEcRz3uzEptsgRk09z7mqmQ1ZwFCIwF1Iwe0/edit?gid=1255049954#gid=1255049954"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Sampel Google Sheet
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1FHKzAAVEEcRz3uzEptsgRk09z7mqmQ1ZwFCIwF1Iwe0/edit#gid=0"
                className="w-full px-4 py-2.5 pl-10 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-100 transition-all font-mono"
                disabled={isFetching}
              />
              <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <Button
              type="submit"
              disabled={isFetching || !urlInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengekstrak 20+ Sheet...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  Tarik Data Lembar
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Lembar Rombel</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.total}</p>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Seluruh kelas tertampung di staging</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Siap Sinkron</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.ready}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Menunggu eksekusi dispatcher</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Tersinkronkan</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.synced}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Telah masuk database presensi</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Baris Siswa</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.totalStudents}</p>
            </div>
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Total siswa terdata di lembar</p>
        </Card>
      </div>

      {/* Table Toolbar & Search */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
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
                onClick={handleBulkSync}
                disabled={isSyncingBulk}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 rounded-lg shadow-sm"
              >
                {isSyncingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyinkronkan {selectedIds.length} Rombel...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Sinkronkan Semua Terpilih
                  </>
                )}
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

                      {/* Sheet Name & Class */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.nama_kelas}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                            Sheet: {item.sheet_name}
                          </span>
                        </div>
                        {item.kelas_id ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Terhubung ke Rombel Resmi Sistem
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" /> Nama rombel akan dicocokkan otomatis
                          </span>
                        )}
                      </td>

                      {/* Rentang Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {item.rentang_tanggal || '-'}
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
                            onClick={() => handleSyncSingle(item.id)}
                            disabled={isSyncingSingle}
                            className={cn(
                              'h-8 px-2.5 text-xs rounded-lg flex items-center gap-1',
                              isSynced
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            )}
                            title={isSynced ? 'Sinkronkan Ulang Data' : 'Sinkronkan Sekarang'}
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
      <AttendanceStagingDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSheet(null);
        }}
        item={selectedSheet}
        onSync={(id) => handleSyncSingle(id)}
        isSyncing={isSyncingSingle}
      />
    </div>
  );
};
