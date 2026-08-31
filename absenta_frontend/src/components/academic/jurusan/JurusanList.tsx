import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useConfirm from '../../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  AlertCircle 
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  Checkbox,
  Skeleton
} from '../../ui';

// Lazy load Table to improve mobile performance (TBT)
const Table = lazy(() => import('../../ui/Table').then(module => ({ default: module.Table })));
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { getJurusanList, deleteJurusan, jurusanQueryKeys } from '../../../api/academic/jurusan.api';
import type { Jurusan } from '../../../types/academic';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface JurusanListProps {
  onEdit?: (jurusan: Jurusan) => void;
  onView?: (jurusan: Jurusan) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  refreshTrigger?: number;
}

const JurusanList: React.FC<JurusanListProps> = React.memo(({ 
  onEdit, 
  onView,
  onAdd, 
  onImport, 
  onExport, 
  isExporting = false,
  refreshTrigger = 0 
}) => {
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const { can } = useCapabilities();
  const queryClient = useQueryClient();
  const invalidateJurusanCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jurusan-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['kelas-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
  }, [queryClient]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);

  // Queries using React Query
  const { data: listRes, isLoading: loading, refetch } = useQuery({
    queryKey: jurusanQueryKeys.list({ page: currentPage, limit: itemsPerPage, search: debouncedSearchTerm }),
    queryFn: () => getJurusanList(currentPage, itemsPerPage, debouncedSearchTerm),
    staleTime: 5 * 60 * 1000,
  });

  const jurusans = useMemo(() => listRes?.data || [], [listRes]);
  const totalPages = listRes?.pagination?.totalPages || 1;
  const totalItems = listRes?.pagination?.total || 0;
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return can('academic.structures.update') || can('academic.structures.delete');
  }, [can]);

  const allVisibleSelected = useMemo(() => {
    if (jurusans.length === 0) return false;
    return jurusans.every(j => selectedIds.has(j.id));
  }, [jurusans, selectedIds]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleDelete = useCallback(async (jurusan: Jurusan) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Jurusan',
        description: `Apakah Anda yakin ingin menghapus jurusan ${jurusan.nama}? Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus jurusan...',
      });

      if (!ok) return;

      setDeleting(true);
      const response = await deleteJurusan(jurusan.id);
      
      if (response.success) {
        toast.success(response.message || 'Jurusan berhasil dihapus');
        invalidateJurusanCache();
        queryClient.invalidateQueries({ queryKey: jurusanQueryKeys.all });
        refetch();
      } else {
        toast.error(response.message || 'Gagal menghapus jurusan');
      }
    } catch (error: any) {
      console.error('Error deleting jurusan:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus jurusan');
    } finally {
      setDeleting(false);
      confirm.setLoading(false);
    }
  }, [confirm, invalidateJurusanCache, queryClient, refetch]);

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
        const jurusanItem = jurusans.find(j => j.id === id);
        try {
          const res = await deleteJurusan(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          succeeded.push(id);
        } catch (e: any) {
          failed.push({ id, name: jurusanItem?.nama || id, message: e?.message || 'Gagal menghapus' });
        }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed.length > 0) {
        setBulkErrorDetails(failed);
        setBulkErrorModalOpen(true);
        if (succeeded.length > 0) {
          toast(`Berhasil menghapus ${succeeded.length} jurusan, ${failed.length} gagal.`, { icon: '⚠️' });
        }
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} jurusan`);
      }

      const next = new Set<string>(selectedIds);
      succeeded.forEach(id => next.delete(id));
      setSelectedIds(next);
      
      invalidateJurusanCache();
      queryClient.invalidateQueries({ queryKey: jurusanQueryKeys.all });
      refetch();
    } catch (err: any) {
      console.error('Error bulk deleting jurusan:', err);
      toast.error('Terjadi kesalahan saat menghapus data terpilih');
    } finally {
      setBulkDeleting(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, jurusans, confirm, invalidateJurusanCache, queryClient, refetch]);

  const columns = useMemo(() => [
    { 
      key: 'nama', 
      label: 'Nama Jurusan',
      sortable: true,
      render: (value: string) => (
        <div className="font-bold text-slate-800 dark:text-slate-200">{value}</div>
      )
    },
    { 
      key: 'kode', 
      label: 'Kode',
      sortable: true,
      render: (value: string) => (
        <Badge variant="success" className="font-mono text-[10px]">
          {value}
        </Badge>
      )
    },
    {
      key: 'warna',
      label: 'Warna Khas',
      render: (value: string | null) => {
        const colorName = value || 'indigo';
        const TAILWIND_COLOR_MAP: Record<string, string> = {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          orange: '#f97316',
          purple: '#a855f7',
          rose: '#f43f5e',
          pink: '#ec4899',
          teal: '#14b8a6',
          indigo: '#6366f1'
        };
        const hex = colorName.startsWith('#') ? colorName : (TAILWIND_COLOR_MAP[colorName] || '#6366f1');
        return (
          <div className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-full border border-slate-200/50 shadow-sm" 
              style={{ backgroundColor: hex }} 
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
              {value ? value : 'Default'}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'keterangan', 
      label: 'Keterangan',
      render: (value: string | null) => value || '-'
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: any, jurusan: Jurusan) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit?.(jurusan)}
            aria-label="Edit Jurusan"
            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => onEdit?.(jurusan)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(jurusan)}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ], [canManage, onEdit, deleting, handleDelete]);

  const handlePageJump = useCallback(() => {
    let p = parseInt(pageInput, 10) || 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    handlePageChange(p);
  }, [pageInput, totalPages, handlePageChange]);

  const paginationText = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return `Menampilkan ${start}-${end} dari ${totalItems} data`;
  }, [currentPage, totalItems, itemsPerPage]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari jurusan..."
            aria-label="Cari Jurusan"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm pl-9"
          />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        {isMobile ? (
          <MobileAcademicList
            title="Daftar Jurusan"
            data={jurusans}
            loading={loading}
            totalItems={totalItems}
            onRefresh={() => fetchJurusans(currentPage, debouncedSearchTerm)}
            onAdd={onAdd}
            canManage={canManage}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: handlePageChange
            }}
            renderCard={useCallback((jurusan: Jurusan) => (
              <div 
                key={jurusan.id}
                role="button"
                tabIndex={0}
                onClick={() => onEdit?.(jurusan)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEdit?.(jurusan);
                  }
                }}
                aria-label={`Detail jurusan ${jurusan.nama}`}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                      {jurusan.nama}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md">
                      {jurusan.kode}
                    </span>
                  </div>
                  {jurusan.keterangan && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                      {jurusan.keterangan}
                    </p>
                  )}
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(jurusan);
                  }}
                  aria-label={`Detail ${jurusan.nama}`}
                  className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  Detail
                </Button>
              </div>
            ), [onEdit])}
          />
        ) : (
          <div className="hidden md:block">
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
              <Table
              columns={columns}
              data={jurusans}
              loading={loading}
              emptyMessage="Tidak ada data jurusan ditemukan"
              className="border-none"
              selectedRowKeys={selectedIds}
              onSelectedRowKeysChange={setSelectedIds}
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
              toolbarLeft={
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && onAdd && (
                      <Button 
                        onClick={onAdd}
                        variant="toolbarPrimary"
                        size="toolbar"
                        className="rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Tambah Jurusan
                      </Button>
                  )}
      
                  {canManage && onImport && (
                      <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={onImport}
                        className="rounded-xl"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
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
                      onClick={() => refetch()}
                      aria-label="Refresh Data"
                      className="rounded-xl"
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
                        title: 'Hapus Jurusan Terpilih',
                        description: `Anda yakin ingin menghapus ${selectedIds.size} jurusan terpilih? Tindakan ini tidak dapat dibatalkan.`,
                        confirmText: 'Hapus',
                        cancelText: 'Batal',
                        style: 'danger',
                        withProgress: true,
                        progressLabel: `Menghapus ${selectedIds.size} jurusan...`,
                      });
                      if (ok) await handleBulkDelete();
                    }}
                    disabled={bulkDeleting}
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
        title="Gagal Menghapus Beberapa Jurusan"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ada {bulkErrorDetails.length} data gagal dihapus karena keterkaitan relasi database (misal: jurusan sudah digunakan dalam data kelas, guru, atau siswa).
            </p>
          </div>
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {bulkErrorDetails?.map((e) => (
                <div key={e.id} className="p-4 flex flex-col gap-1 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{e.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {e.id.substring(0, 8)}</span>
                  </div>
                  <span className="text-xs text-red-500 font-semibold">{e.message}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { setBulkErrorModalOpen(false); setBulkErrorDetails([]); }}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

JurusanList.displayName = 'JurusanList';

export default JurusanList;
