import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
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
  AlertCircle 
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
      render: (value: string | null) => value || '-'
    },
    { 
      key: 'no_hp', 
      label: 'No. HP',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'jenis_ptk',
      label: 'Jenis PTK',
      render: (value: string | null) => {
        const isTu = value === 'TENAGA_KEPENDIDIKAN';
        return (
          <Badge variant={isTu ? 'warning' : 'info'} className="text-[10px] py-0.5 px-2.5 rounded-full font-bold">
            {isTu ? 'Tenaga Kependidikan (TU)' : 'Pendidik (Guru)'}
          </Badge>
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
  ].filter(Boolean) as any, [canManage, onEdit, onView, selectedIds, gurus, allVisibleSelected, confirm, handleDelete]);

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
                   size="toolbarIcon"
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
    </div>
  );
});

GuruList.displayName = 'GuruList';

export default GuruList;
