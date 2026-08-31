import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useConfirm from '../../../hooks/useConfirm';
import { Edit, Trash2, Eye, Plus, Search, RefreshCw, Calendar, CheckCircle, FileSpreadsheet, Download } from 'lucide-react';
import { 
  Table, 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Checkbox,
  Loader,
  Tooltip,
  SearchableSelect,
  SectionCard
} from '../../ui';
import { 
  getTahunPelajaranList, 
  deleteTahunPelajaran, 
  activateTahunPelajaran,
  academicQueryKeys
} from '../../../api/academic/tahunPelajaran.api';
import type { TahunPelajaran } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { exportDataToExcel } from '../../../utils/export.utils';
import { useBulkAction } from '../../../hooks/useBulkAction';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { cn } from '@/lib/utils';

interface TahunPelajaranListProps {
  onEdit?: (tahunPelajaran: TahunPelajaran) => void;
  onView?: (tahunPelajaran: TahunPelajaran) => void;
  onAdd?: () => void;
}

const TahunPelajaranList: React.FC<TahunPelajaranListProps> = React.memo(({ 
  onEdit, 
  onView, 
  onAdd
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  // Queries
  const { data: listRes, isLoading: loading } = useQuery({
    queryKey: academicQueryKeys.tahunPelajaran.list({ page: currentPage, limit: itemsPerPage, search: debouncedSearchTerm, status: filterStatus }),
    queryFn: () => getTahunPelajaranList(currentPage, itemsPerPage, debouncedSearchTerm, filterStatus),
    staleTime: 5 * 60 * 1000,
  });

  const tahunPelajarans = listRes?.data || [];
  const totalPages = listRes?.pagination?.totalPages || 1;
  const totalItems = listRes?.pagination?.total || 0;
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return user?.capabilities?.includes('academic.years.update') || user?.capabilities?.includes('academic.years.delete');
  }, [user]);

  const allVisibleSelected = useMemo(() => {
    if (tahunPelajarans.length === 0) return false;
    return (tahunPelajarans || []).every(tp => selectedIds.has(tp.id));
  }, [tahunPelajarans, selectedIds]);

  // Mutations
  const activateMutation = useMutation({
    mutationFn: activateTahunPelajaran,
    onSuccess: () => {
      toast.success('Tahun pelajaran berhasil diaktifkan');
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.active });
      queryClient.invalidateQueries({ queryKey: ['tahun-pelajaran-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['semester-aktif'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal mengaktifkan tahun pelajaran');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTahunPelajaran,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || 'Tahun pelajaran berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
        queryClient.invalidateQueries({ queryKey: ['tahun-pelajaran-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['semester-aktif'] });
      } else {
        toast.error(res.message || 'Gagal menghapus tahun pelajaran');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal menghapus tahun pelajaran');
    }
  });

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
  }, [queryClient]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(tahunPelajarans || [], [
        { header: 'Tahun Pelajaran', accessor: (row) => row.tahun, width: 20 },
        { header: 'Status', accessor: (row) => row.is_active ? 'Aktif' : 'Tidak Aktif', width: 15 },
        { header: 'Jumlah Siswa', accessor: (row) => row._count?.Siswa || 0, width: 15 },
        { header: 'Jumlah Semester', accessor: (row) => row._count?.Semester || 0, width: 20 }
      ], 'Laporan_Tahun_Pelajaran', 'DATA TAHUN PELAJARAN');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', { icon: '⚠️' });
    }
  }, [tahunPelajarans]);

  const { executeBulk, isExecuting: isBulkDeleting } = useBulkAction();

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    executeBulk(Array.from(selectedIds), deleteTahunPelajaran, {
      successMessage: `Berhasil menghapus tahun pelajaran terpilih`,
      onSuccess: (succeededIds) => {
        const next = new Set(selectedIds);
        succeededIds.forEach(id => next.delete(id));
        setSelectedIds(next);
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
      }
    });
  }, [selectedIds, executeBulk, queryClient]);

  const handleActivate = useCallback(async (id: string) => {
    activateMutation.mutate(id);
  }, [activateMutation]);

  const handleDelete = useCallback(async (id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'tahun',  
      label: 'Tahun Pelajaran',
      sortable: true,
      render: (value: string, tahunPelajaran: TahunPelajaran) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <div className="flex items-center gap-1.5">
            <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
            {tahunPelajaran.is_active && (
              <Badge variant="success" className="px-1.5 py-0 text-[10px] font-bold">
                AKTIF
              </Badge>
            )}
          </div>
        </div>
      )
    },
    { 
      key: 'is_active', 
      label: 'Status',
      render: (isActive: boolean, tp: TahunPelajaran) => (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
          {canManage && (
            <button
              type="button"
              onClick={async () => {
                if (isActive) {
                  toast.error('Tahun pelajaran aktif tidak dapat dinonaktifkan secara langsung. Silakan aktifkan tahun pelajaran lainnya.');
                  return;
                }
                const ok = await confirm({
                  title: 'Konfirmasi Aktivasi Tahun Pelajaran',
                  description: `Apakah Anda yakin ingin mengaktifkan tahun pelajaran "${tp.tahun}"?\nTindakan ini akan:\n• Menonaktifkan tahun pelajaran aktif sebelumnya\n• Mengubah konteks seluruh data akademik (absensi, nilai, laporan)`,
                  confirmText: 'Aktifkan',
                  cancelText: 'Batal',
                  style: 'success',
                });
                if (ok) {
                  await handleActivate(tp.id);
                }
              }}
              disabled={activateMutation.isPending}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-750'} ${activateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ transition: 'background-color 0.2s' }}
              aria-label={`Toggle status ${tp.tahun}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`}
                style={{ transition: 'transform 0.2s' }}
              />
            </button>
          )}
        </div>
      )
    },
    { 
      key: '_count_siswa_aktif', 
      label: 'Siswa Aktif',
      render: (_: unknown, row: any) => (
        <span className={`text-xs font-black ${row.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {row._count?.SiswaAktif ?? (row.is_active ? (row._count?.Siswa || 0) : 0)}
        </span>
      )
    },
    { 
      key: '_count_histori_siswa', 
      label: 'Histori Siswa',
      render: (_: unknown, row: any) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {row._count?.HistoriSiswa ?? row._count?.SiswaAkademik ?? row._count?.Siswa ?? 0}
        </span>
      )
    },
    { 
      key: '_count_semester', 
      label: 'Semester',
      render: (_: unknown, row: any) => (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {row._count?.Semester || 0}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: unknown, tahunPelajaran: TahunPelajaran) => (
        <div className="flex items-center gap-1">
          <Tooltip content="Lihat Detail">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView?.(tahunPelajaran)}
              aria-label="Lihat Detail Tahun Pelajaran"
              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </Tooltip>
          {canManage && (
            <>
              <Tooltip content={tahunPelajaran.is_active ? "Tahun pelajaran aktif tidak dapat diedit" : "Edit"}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit?.(tahunPelajaran)}
                  aria-label="Edit Data Tahun Pelajaran"
                  disabled={tahunPelajaran.is_active}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </Tooltip>
              <Tooltip content={
                tahunPelajaran.is_active
                  ? "Tahun pelajaran aktif tidak dapat dihapus"
                  : (tahunPelajaran._count?.Siswa || 0) > 0 || (tahunPelajaran._count?.Semester || 0) > 0
                    ? "Tahun pelajaran ini tidak dapat dihapus karena memiliki data akademik."
                    : "Hapus"
              }>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={
                    tahunPelajaran.is_active ||
                    (tahunPelajaran._count?.Siswa || 0) > 0 ||
                    (tahunPelajaran._count?.Semester || 0) > 0
                  }
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Konfirmasi Hapus Tahun Pelajaran',
                      description: `Apakah Anda yakin ingin menghapus tahun pelajaran "${tahunPelajaran.tahun}"? Tindakan ini tidak dapat dibatalkan.`,
                      confirmText: 'Hapus',
                      cancelText: 'Batal',
                      style: 'danger',
                    });
                    if (ok) {
                      await handleDelete(tahunPelajaran.id);
                    }
                  }}
                  aria-label="Hapus Data Tahun Pelajaran"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      )
    }
  ], [canManage, onEdit, onView, confirm, handleActivate, handleDelete]);


  const renderMobileCard = useCallback((tp: TahunPelajaran) => {
    const isActive = tp.is_active;
    const semesterCount = tp._count?.Semester ?? 0;
    const siswaAktif = (tp as any)._count?.SiswaAktif ?? (isActive ? (tp._count?.Siswa || 0) : 0);

    return (
      <div
        key={tp.id}
        role="button"
        tabIndex={0}
        onClick={() => onView?.(tp)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView?.(tp);
          }
        }}
        aria-label={`Detail tahun pelajaran ${tp.tahun}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {tp.tahun}
            </h4>
            {isActive ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                Sistem Berjalan
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                Nonaktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {semesterCount} Semester • {Number(siswaAktif).toLocaleString('id-ID')} Siswa
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(tp);
          }}
          aria-label={`Detail ${tp.tahun}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, [onView]);

  if (!canManage && !onView) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Search & Filter Section (Desktop Only) */}
      <div className="hidden md:flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        {/* Search Box */}
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari tahun pelajaran (misal: 2023/2024)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Cari Tahun Pelajaran"
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-52">
          <SearchableSelect
            value={filterStatus}
            onValueChange={(val) => setFilterStatus(val)}
            options={[
              { label: 'Semua Status', value: 'ALL' },
              { label: 'Aktif', value: 'active' },
              { label: 'Tidak Aktif', value: 'inactive' }
            ]}
            placeholder="Pilih Status"
            searchPlaceholder="Cari Status..."
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>
      
      {/* List Content - Hybrid View */}
      <div className="bg-transparent overflow-hidden">
        {isMobile ? (
          <div className="p-4 space-y-4">
            {/* Mobile Search & Filter Section */}
            <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari tahun pelajaran (misal: 2024/2025)..."
                  aria-label="Cari tahun pelajaran"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <SearchableSelect
                  value={filterStatus}
                  onValueChange={(val) => setFilterStatus(val)}
                  options={[
                    { label: 'Semua Status', value: 'ALL' },
                    { label: 'Aktif', value: 'active' },
                    { label: 'Tidak Aktif', value: 'inactive' }
                  ]}
                  placeholder="Status"
                  searchPlaceholder="Cari Status..."
                  triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Action Buttons on Mobile */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {canManage && onAdd && (
                  <Button 
                    onClick={onAdd}
                    variant="toolbarPrimary"
                    size="toolbar"
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Tahun
                  </Button>
                )}
                <Button
                  onClick={handleRefresh}
                  variant="toolbarGhost"
                  size="toolbar"
                  className="p-2"
                  aria-label="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <MobileAcademicList
              title="Daftar Tahun Pelajaran"
              data={tahunPelajarans}
              loading={loading}
              totalItems={totalItems}
              onRefresh={handleRefresh}
              onAdd={onAdd}
              canManage={canManage}
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
              renderCard={renderMobileCard}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={tahunPelajarans}
            loading={loading}
            emptyMessage="Tidak ada data tahun pelajaran"
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
                      Tambah
                    </Button>
                 )}
                 
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={handleExport}
                   className="rounded-xl"
                 >
                   <Download className="w-3.5 h-3.5 mr-1.5" />
                   Export
                 </Button>
    
                 <Button
                    variant="toolbarOutline"
                    size="toolbarIcon"
                    onClick={handleRefresh}
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
                       title: 'Hapus Tahun Pelajaran Terpilih',
                       description: `Anda yakin ingin menghapus ${selectedIds.size} tahun pelajaran terpilih?`,
                       confirmText: 'Hapus',
                       cancelText: 'Batal',
                       style: 'danger',
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
        )}
      </div>
    </div>
  );
});

TahunPelajaranList.displayName = 'TahunPelajaranList';
export default TahunPelajaranList;
