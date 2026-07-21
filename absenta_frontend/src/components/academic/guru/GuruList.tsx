import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import useConfirm from '../../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  SectionCard,
  Checkbox,
  Skeleton
} from '../../ui';

// Lazy load Table to improve mobile performance (TBT)
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table })));
import { SearchableSelect } from '../../ui/SearchableSelect';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { QuickEditCell } from '../shared/QuickEditCell';
import { getGuruList, deleteGuru, updateGuru } from '../../../api/academic/guru.api';
import type { Guru } from '../../../types/academic';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface GuruListProps {
  onEdit?: (guru: Guru) => void;
  onView?: (guru: Guru) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  refreshTrigger?: number;
  onRefresh?: () => void;
}

const GuruList: React.FC<GuruListProps> = React.memo(({ 
  onEdit, 
  onView, 
  onAdd,
  onImport,
  onExport,
  isExporting = false,
  refreshTrigger = 0,
  onRefresh
}) => {
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatusKepegawaian, setFilterStatusKepegawaian] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterJenisPtk, setFilterJenisPtk] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Use debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);
  
  // States untuk Analitis & Validasi Data NIP Guru
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepText, setAnalysisStepText] = useState('');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'missingNip' | 'duplicateNip'>('missingNip');
  const [analysisResults, setAnalysisResults] = useState<{
    totalChecked: number;
    missingNip: Guru[];
    duplicateNip: { nip: string; gurus: Guru[] }[];
  }>({
    totalChecked: 0,
    missingNip: [],
    duplicateNip: [],
  });

  const handleRunAnalysis = async () => {
    setIsAnalysing(true);
    setAnalysisProgress(0);
    setShowAnalysisModal(true);
    setAnalysisStepText('Menghubungkan ke server dan mengambil data guru...');

    try {
      setAnalysisProgress(20);
      const res = await getGuruList(1, 5000);
      setAnalysisProgress(50);
      const allGurus = res.data || [];
      const totalCount = allGurus.length;

      // 1. Cek NIP Kosong / NIP Sementara (9999xxxxxx)
      setAnalysisStepText('Memeriksa guru yang belum memiliki NIP atau NIP sementara (9999)...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(75);
      const missingNip = allGurus.filter(g => !g.nip || g.nip.trim() === '' || g.nip === '-' || g.nip.startsWith('9999'));

      // 2. Cek NIP Duplikat
      setAnalysisStepText('Mendeteksi duplikasi NIP di dalam sistem...');
      await new Promise(r => setTimeout(r, 200));
      setAnalysisProgress(90);
      const nipGroups: Record<string, Guru[]> = {};
      allGurus.forEach(g => {
        const nip = g.nip ? g.nip.trim() : '';
        if (nip && nip !== '-' && !nip.startsWith('9999')) {
          if (!nipGroups[nip]) nipGroups[nip] = [];
          nipGroups[nip].push(g);
        }
      });
      const duplicateNip = Object.entries(nipGroups)
        .filter(([_, gurus]) => gurus.length > 1)
        .map(([nip, gurus]) => ({ nip, gurus }));

      setAnalysisStepText('Menyusun hasil laporan kualitas data guru...');
      await new Promise(r => setTimeout(r, 150));
      setAnalysisProgress(100);

      setAnalysisResults({
        totalChecked: totalCount,
        missingNip,
        duplicateNip,
      });

      if (missingNip.length > 0) setActiveAnalysisTab('missingNip');
      else if (duplicateNip.length > 0) setActiveAnalysisTab('duplicateNip');
      else setActiveAnalysisTab('missingNip');

      setIsAnalysing(false);
      toast.success('Pemeriksaan kualitas NIP guru selesai!');
    } catch (err) {
      console.error('Failed to run guru data analysis:', err);
      toast.error('Gagal memvalidasi data guru.');
      setIsAnalysing(false);
      setShowAnalysisModal(false);
    }
  };
  
  const { user, can } = useAuth();
  
  const isFiltered = useMemo(() => {
    return searchTerm !== '' || filterStatusKepegawaian !== 'ALL' || filterGender !== 'ALL' || filterJenisPtk !== 'ALL';
  }, [searchTerm, filterStatusKepegawaian, filterGender, filterJenisPtk]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setFilterStatusKepegawaian('ALL');
    setFilterGender('ALL');
    setFilterJenisPtk('ALL');
  };
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return can('academic.teachers.update') || can('academic.teachers.delete');
  }, [can]);

  const allVisibleSelected = useMemo(() => {
    if (gurus.length === 0) return false;
    return gurus.every(g => selectedIds.has(g.id));
  }, [gurus, selectedIds]);

  // Fetch gurus with debounced search
  const fetchGurus = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getGuruList(page, itemsPerPage, search, filterStatusKepegawaian, filterGender, filterJenisPtk);
      
      if (response.success) {
        setGurus(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      } else {
        toast.error('Gagal memuat data guru');
      }
    } catch (error) {
      console.error('Error fetching gurus:', error);
      toast.error('Terjadi kesalahan saat memuat data guru');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, filterStatusKepegawaian, filterGender, filterJenisPtk]);

  // Debounced search effect
  useEffect(() => {
    fetchGurus(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchGurus, filterStatusKepegawaian, filterGender, filterJenisPtk]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchGurus(currentPage, debouncedSearchTerm);
    }
  }, [refreshTrigger, fetchGurus, currentPage, debouncedSearchTerm]);

  // Initial load
  useEffect(() => {
    fetchGurus();
  }, [fetchGurus]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    fetchGurus(page, debouncedSearchTerm);
  }, [fetchGurus, debouncedSearchTerm]);

  const handleItemsPerPageChange = useCallback((value: string) => {
    const n = parseInt(value, 10) || 10;
    setItemsPerPage(n);
    fetchGurus(1, debouncedSearchTerm);
  }, [fetchGurus, debouncedSearchTerm]);

  const handlePageJump = useCallback(() => {
    let p = parseInt(pageInput, 10) || 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    handlePageChange(p);
  }, [pageInput, totalPages, handlePageChange]);

  // Handle delete
  const handleDelete = useCallback(async (guru: Guru) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Guru',
        description: (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">Tindakan Tidak Dapat Dibatalkan</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Menghapus guru <strong>{guru.nama_guru}</strong> akan berdampak pada jadwal mengajar, absensi, dan data akademik lainnya yang terkait.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">NIP / NUPTK</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{guru.nip || '-'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Akun</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{guru.User?.email || '-'}</p>
              </div>
            </div>
          </div>
        ),
        confirmText: 'Ya, Hapus Data',
        cancelText: 'Batal',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus data guru...',
      });

      if (!ok) return;

      setDeleting(true);
      const response = await deleteGuru(guru.id);
      
      if (response.success) {
        toast.success(response.message || 'Guru berhasil dihapus');
        fetchGurus(currentPage, debouncedSearchTerm);
        onRefresh?.();
      } else {
        toast.error(response.message || 'Gagal menghapus guru');
      }
    } catch (error: any) {
      console.error('Error deleting guru:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat menghapus guru';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      confirm.setLoading(false);
    }
  }, [fetchGurus, currentPage, debouncedSearchTerm, confirm, onRefresh]);

  const [togglingJenisPtkId, setTogglingJenisPtkId] = useState<string | null>(null);

  const handleToggleActive = useCallback(async (guru: Guru) => {
    try {
      setTogglingId(guru.id);
      const currentStatus = guru.User?.status || 'ACTIVE';
      const targetState = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await updateGuru(guru.id, { status: targetState });
      if (response.success) {
        toast.success(`Status ${guru.nama_guru} berhasil diubah.`);
        fetchGurus(currentPage, debouncedSearchTerm);
        onRefresh?.();
      } else {
        toast.error(response.message || 'Gagal mengubah status');
      }
    } catch (error: any) {
      console.error('Error toggling guru status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat mengubah status';
      toast.error(errorMessage);
    } finally {
      setTogglingId(null);
    }
  }, [fetchGurus, currentPage, debouncedSearchTerm, onRefresh]);

  const handleToggleJenisPtk = useCallback(async (guru: Guru) => {
    try {
      setTogglingJenisPtkId(guru.id);
      const currentJenis = guru.jenis_ptk || 'PENDIDIK';
      const targetState = currentJenis === 'PENDIDIK' ? 'TENAGA_KEPENDIDIKAN' : 'PENDIDIK';
      const response = await updateGuru(guru.id, { jenis_ptk: targetState });
      if (response.success) {
        toast.success(`Fungsi kerja ${guru.nama_guru} berhasil diubah.`);
        fetchGurus(currentPage, debouncedSearchTerm);
        onRefresh?.();
      } else {
        toast.error(response.message || 'Gagal mengubah jenis PTK');
      }
    } catch (error: any) {
      console.error('Error toggling jenis PTK:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat mengubah jenis PTK';
      toast.error(errorMessage);
    } finally {
      setTogglingJenisPtkId(null);
    }
  }, [fetchGurus, currentPage, debouncedSearchTerm, onRefresh]);

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'nama_guru', 
      label: 'Nama Guru',
      sortable: true,
      render: (value: string, guru: Guru) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{guru.User?.email || '-'}</div>
        </div>
      )
    },
    { 
      key: 'nip', 
      label: 'NIP',
      sortable: true,
      render: (value: string | null, guru: Guru) => (
        <QuickEditCell
          value={value}
          placeholder="Tanpa NIP"
          canEdit={canManage}
          tempBadgePrefix="9999"
          onSave={async (newVal) => {
            const res = await updateGuru(guru.id, { nip: newVal || null });
            if (res.success) {
              toast.success(`NIP ${guru.nama_guru} berhasil diperbarui`);
              fetchGurus(currentPage, debouncedSearchTerm);
              onRefresh?.();
            } else {
              toast.error(res.message || 'Gagal memperbarui NIP');
              throw new Error(res.message);
            }
          }}
        />
      )
    },
    { 
      key: 'no_hp', 
      label: 'No. HP',
      render: (value: string | null, guru: Guru) => (
        <QuickEditCell
          value={value}
          placeholder="Tanpa No. HP"
          canEdit={canManage}
          type="tel"
          isMonospace={false}
          onSave={async (newVal) => {
            const res = await updateGuru(guru.id, { no_hp: newVal || null });
            if (res.success) {
              toast.success(`No. HP ${guru.nama_guru} berhasil diperbarui`);
              fetchGurus(currentPage, debouncedSearchTerm);
              onRefresh?.();
            } else {
              toast.error(res.message || 'Gagal memperbarui No. HP');
              throw new Error(res.message);
            }
          }}
        />
      )
    },
    {
      key: 'jenis_ptk',
      label: 'Jenis PTK',
      render: (value: string | null, guru: Guru) => {
        const isPendidik = (value || 'PENDIDIK') === 'PENDIDIK';
        const isToggling = togglingJenisPtkId === guru.id;
        
        return (
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50 items-center select-none" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isToggling || (isPendidik && !canManage)}
              onClick={() => canManage && !isPendidik && handleToggleJenisPtk(guru)}
              className={cn(
                "px-3 py-1 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all duration-200",
                isPendidik 
                  ? "bg-blue-600 text-white shadow-sm font-black" 
                  : cn(
                      "text-slate-400 dark:text-slate-500 font-bold",
                      canManage ? "hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer" : "cursor-default"
                    )
              )}
            >
              Guru
            </button>
            <button
              type="button"
              disabled={isToggling || (!isPendidik && !canManage)}
              onClick={() => canManage && isPendidik && handleToggleJenisPtk(guru)}
              className={cn(
                "px-3 py-1 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all duration-200",
                !isPendidik 
                  ? "bg-amber-600 text-white shadow-sm font-black" 
                  : cn(
                      "text-slate-400 dark:text-slate-500 font-bold",
                      canManage ? "hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer" : "cursor-default"
                    )
              )}
            >
              Staf/TU
            </button>
            {isToggling && (
              <Loader className="w-3.5 h-3.5 ml-1 animate-spin text-slate-400" />
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, guru: Guru) => {
        const isActive = (guru.User?.status || 'ACTIVE') === 'ACTIVE';
        const isToggling = togglingId === guru.id;
        return (
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Badge variant={isActive ? 'success' : 'error'} className="text-[10px] py-0.5 px-2.5 rounded-full font-bold">
              {isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {canManage && (
              <button
                type="button"
                onClick={() => handleToggleActive(guru)}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-750'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ transition: 'background-color 0.2s' }}
                aria-label={`Toggle status ${guru.nama_guru}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`}
                  style={{ transition: 'transform 0.2s' }}
                />
              </button>
            )}
          </div>
        );
      }
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: any, guru: Guru) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView?.(guru)}
            aria-label="Lihat Detail Guru"
            className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => onEdit?.(guru)}
                aria-label="Edit Data Guru"
              >
                <Edit className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(guru)}
                aria-label="Hapus Data Guru"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ].filter(Boolean) as any, [canManage, onEdit, onView, selectedIds, gurus, allVisibleSelected, confirm, handleDelete, handleToggleJenisPtk, togglingJenisPtkId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      const total = ids.length;
      const succeeded: string[] = [];
      const failed: { id: string; name: string; message: string }[] = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const guru = gurus.find(g => g.id === id);
        try {
          const res = await deleteGuru(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          succeeded.push(id);
        } catch (e: any) {
          failed.push({ id, name: guru?.nama_guru || id, message: e?.message || 'Gagal menghapus' });
        }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed.length > 0) {
        setBulkErrorDetails(failed);
        setBulkErrorModalOpen(true);
        toast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, { icon: '⚠️' });
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} guru`);
      }
      const next = new Set<string>(selectedIds);
      succeeded.forEach(id => next.delete(id));
      setSelectedIds(next);
      fetchGurus(currentPage, searchTerm);
      onRefresh?.();
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat bulk delete';
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, gurus, fetchGurus, currentPage, searchTerm, confirm, onRefresh]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Cari guru (NIP, Nama, RFID)..."
            aria-label="Cari Guru"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={filterStatusKepegawaian}
            onValueChange={setFilterStatusKepegawaian}
            options={[
              { label: 'Semua Status', value: 'ALL' },
              { label: 'PNS', value: 'PNS' },
              { label: 'GTT', value: 'GTT' },
              { label: 'GTY', value: 'GTY' },
              { label: 'Honorer', value: 'HONORER' }
            ]}
            placeholder="Filter Status"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={filterGender}
            onValueChange={setFilterGender}
            options={[
              { label: 'Semua Gender', value: 'ALL' },
              { label: 'Laki-laki', value: 'L' },
              { label: 'Perempuan', value: 'P' }
            ]}
            placeholder="Filter Gender"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={filterJenisPtk}
            onValueChange={setFilterJenisPtk}
            options={[
              { label: 'Semua Jenis PTK', value: 'ALL' },
              { label: 'Pendidik (Guru)', value: 'PENDIDIK' },
              { label: 'Tenaga Kependidikan', value: 'TENAGA_KEPENDIDIKAN' }
            ]}
            placeholder="Filter Jenis PTK"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>
      
      {/* Guru List Content - Hybrid View */}
      <div className="bg-transparent overflow-hidden">
        {isMobile ? (
          <MobileAcademicList
            title="Direktori Guru"
            data={gurus}
            loading={loading}
            totalItems={totalItems}
            onRefresh={() => fetchGurus(currentPage, debouncedSearchTerm)}
            onAdd={onAdd}
            canManage={canManage}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: handlePageChange
            }}
            renderCard={useCallback((guru: Guru) => (
              <div 
                key={guru.id}
                onClick={() => onView?.(guru)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight text-base">{guru.nama_guru}</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium uppercase tracking-tight mt-0.5">
                      {guru.nip || 'Tanpa NIP'} • {guru.status_kepegawaian || 'Guru'}
                    </p>
                  </div>
                  <Badge variant="info" className="text-[9px] px-2 py-0.5 rounded-full">
                    {guru.User?.role?.name || 'N/A'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">RFID</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter">
                        {guru.no_rfid || '-'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Email</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {guru.User?.email || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView?.(guru);
                    }}
                    aria-label={`Lihat detail ${guru.nama_guru}`}
                    className="h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 font-bold text-[11px] uppercase tracking-wider active:bg-slate-200 dark:active:bg-slate-700"
                  >
                    Detail
                  </Button>
                </div>
              </div>
            ), [onView])}
          />
        ) : (
          <div className="hidden md:block">
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
              <Table
            columns={columns}
            data={gurus}
            loading={loading}
            emptyMessage="Tidak ada data guru ditemukan"
            compact={true}
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              itemsPerPage,
              onPageChange: handlePageChange,
              onLimitChange: (limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }
            }}
            selectedRowKeys={selectedIds}
            onSelectedRowKeysChange={setSelectedIds}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-2">
                 {canManage && onAdd && (
                    <Button 
                      onClick={onAdd}
                      variant="toolbarPrimary"
                      size="toolbar"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Tambah Guru
                    </Button>
                 )}
    
                 {canManage && onImport && (
                    <Button
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={onImport}
                      className="rounded-xl"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                      Import
                    </Button>
                 )}
                 
                 {canManage && (
                    <Button
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={handleRunAnalysis}
                      className="rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500 animate-pulse" />
                      Analisis Data NIP
                    </Button>
                  )}
                 
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={onExport}
                   disabled={isExporting}
                   className="rounded-xl"
                 >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export
                      </>
                    )}
                 </Button>
     
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={() => fetchGurus(currentPage, debouncedSearchTerm)}
                   aria-label="Refresh Data"
                   className="rounded-xl"
                   disabled={loading}
                 >
                   <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                 </Button>
              </div>
            }
            toolbarRight={
              selectedIds.size > 0 && canManage && (
                 <Button
                   variant="toolbarDanger"
                   size="toolbar"
                   onClick={async () => {
                     const ok = await confirm({
                       title: 'Hapus Guru Terpilih',
                       description: `Anda yakin ingin menghapus ${selectedIds.size} guru terpilih?`,
                       confirmText: 'Hapus',
                       cancelText: 'Batal',
                       style: 'danger',
                       withProgress: true,
                       progressLabel: `Menghapus ${selectedIds.size} guru...`,
                     });
                     if (ok) await handleBulkDelete();
                   }}
                 >
                   <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                   Hapus Terpilih ({selectedIds.size})
                 </Button>
              )
            }
              />
            </Suspense>
          </div>
        )}
      </div>

      <Modal
        isOpen={bulkErrorModalOpen}
        onClose={() => { setBulkErrorModalOpen(false); setBulkErrorDetails([]); }}
        title="Gagal Menghapus Beberapa Guru"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ada {bulkErrorDetails.length} data gagal dihapus karena keterkaitan relasi database (misal: sudah memiliki riwayat absensi).
            </p>
          </div>
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {bulkErrorDetails?.map((e) => (
                <div key={e.id} className="p-4 flex flex-col gap-1 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{e.name}</span>
                  <span className="text-[10px] text-rose-500 font-medium">{e.message}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" className="rounded-xl px-6" onClick={() => setBulkErrorModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Analisis Kualitas Data NIP Guru */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => !isAnalysing && setShowAnalysisModal(false)}
        title="Laporan Validasi & Kualitas Data NIP Guru"
        size="3xl"
      >
        <div className="p-6 space-y-6">
          {isAnalysing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
                <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Memeriksa Data Guru...</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed animate-pulse">{analysisStepText}</p>
              </div>
              <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{analysisProgress}% Selesai</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab('missingNip')}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    activeAnalysisTab === 'missingNip'
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">NIP Kosong / Sementara (9999)</span>
                    <AlertCircle size={16} className={analysisResults.missingNip.length > 0 ? 'text-red-500' : 'text-slate-400'} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${analysisResults.missingNip.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600'}`}>
                      {analysisResults.missingNip.length}
                    </span>
                    {analysisResults.missingNip.length > 0 && <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">Guru</span>}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab('duplicateNip')}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    activeAnalysisTab === 'duplicateNip'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Duplikasi NIP</span>
                    <AlertTriangle size={16} className={analysisResults.duplicateNip.length > 0 ? 'text-rose-500' : 'text-slate-400'} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${analysisResults.duplicateNip.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'}`}>
                      {analysisResults.duplicateNip.length}
                    </span>
                    {analysisResults.duplicateNip.length > 0 && <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Grup Duplikat</span>}
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/50 min-h-[260px] max-h-[360px] overflow-y-auto">
                {activeAnalysisTab === 'missingNip' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Daftar Guru Tanpa NIP / NIP Sementara (9999)</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Guru yang tidak memiliki NIP resmi atau berawalan 9999xxxxxx</p>
                      </div>
                      <Badge variant={analysisResults.missingNip.length > 0 ? 'error' : 'success'}>
                        {analysisResults.missingNip.length} Guru
                      </Badge>
                    </div>

                    {analysisResults.missingNip.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Semua Guru Sudah Punya NIP Resmi!</p>
                        <p className="text-[10px] text-slate-400">Tidak ada guru dengan NIP kosong atau NIP sementara 9999.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {analysisResults.missingNip.map(guru => (
                          <div key={guru.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{guru.nama_guru}</p>
                              <p className="text-[10px] text-slate-400">
                                NIP Saat ini: <span className="font-mono font-bold text-red-500">{guru.nip ? (guru.nip.startsWith('9999') ? 'NIP SEMENTARA (9999)' : `"${guru.nip}"`) : 'KOSONG'}</span>
                                {guru.status_kepegawaian ? ` • ${guru.status_kepegawaian}` : ''}
                              </p>
                            </div>
                            {onEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => {
                                  setShowAnalysisModal(false);
                                  onEdit(guru);
                                }}
                              >
                                Edit NIP
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeAnalysisTab === 'duplicateNip' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Deteksi Duplikasi NIP Guru</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Daftar NIP yang digunakan oleh lebih dari 1 guru</p>
                      </div>
                      <Badge variant={analysisResults.duplicateNip.length > 0 ? 'error' : 'success'}>
                        {analysisResults.duplicateNip.length} Grup Duplikat
                      </Badge>
                    </div>

                    {analysisResults.duplicateNip.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Tidak Ada NIP Duplikat!</p>
                        <p className="text-[10px] text-slate-400">Seluruh NIP guru bersifat unik di dalam sistem sekolah Anda.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analysisResults.duplicateNip.map((group, index) => (
                          <div key={index} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black font-mono text-rose-600 dark:text-rose-400">NIP: {group.nip}</span>
                              <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">{group.gurus.length} Guru Memakai NIP Ini</span>
                            </div>
                            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                              {group.gurus.map(guru => (
                                <div key={guru.id} className="flex justify-between items-center text-[11px] text-slate-700 dark:text-slate-300">
                                  <span>{guru.nama_guru} ({guru.status_kepegawaian || 'Guru'})</span>
                                  {onEdit && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowAnalysisModal(false);
                                        onEdit(guru);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer info & Actions */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Total Data Diperiksa: {analysisResults.totalChecked} Guru</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalysisModal(false)}
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
});

GuruList.displayName = 'GuruList';

export default GuruList;
