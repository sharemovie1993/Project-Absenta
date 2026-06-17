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
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';
import { useBulkAction } from '../../../hooks/useBulkAction';

interface TahunPelajaranListProps {
  onEdit?: (tahunPelajaran: TahunPelajaran) => void;
  onView?: (tahunPelajaran: TahunPelajaran) => void;
  onAdd?: () => void;
}

const TahunPelajaranList: React.FC<TahunPelajaranListProps> = ({ 
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
  const { showToast } = useToast();
  const { user } = useAuth();

  // Queries
  const { data: listRes, isLoading: loading } = useQuery({
    queryKey: academicQueryKeys.tahunPelajaran.list({ page: currentPage, limit: itemsPerPage, search: debouncedSearchTerm, status: filterStatus }),
    queryFn: () => getTahunPelajaranList(currentPage, itemsPerPage, debouncedSearchTerm, filterStatus),
    staleTime: 60 * 1000,
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
    return tahunPelajarans.every(tp => selectedIds.has(tp.id));
  }, [tahunPelajarans, selectedIds]);

  // Mutations
  const activateMutation = useMutation({
    mutationFn: activateTahunPelajaran,
    onSuccess: () => {
      showToast('Tahun pelajaran berhasil diaktifkan', 'success');
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.active });
    },
    onError: (error: any) => {
      showToast(error.message || 'Gagal mengaktifkan tahun pelajaran', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTahunPelajaran,
    onSuccess: (res) => {
      if (res.success) {
        showToast(res.message || 'Tahun pelajaran berhasil dihapus', 'success');
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
        queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
      } else {
        showToast(res.message || 'Gagal menghapus tahun pelajaran', 'error');
      }
    },
    onError: (error: any) => {
      showToast(error.message || 'Gagal menghapus tahun pelajaran', 'error');
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
      exportDataToExcel(tahunPelajarans, [
        { header: 'Tahun Pelajaran', accessor: (row) => row.tahun, width: 20 },
        { header: 'Status', accessor: (row) => row.is_active ? 'Aktif' : 'Tidak Aktif', width: 15 },
        { header: 'Jumlah Siswa', accessor: (row) => row._count?.Siswa || 0, width: 15 },
        { header: 'Jumlah Semester', accessor: (row) => row._count?.Semester || 0, width: 20 }
      ], 'Laporan_Tahun_Pelajaran', 'DATA TAHUN PELAJARAN');
    } catch (error: any) {
      showToast(error.message || 'Gagal mengekspor data', 'warning');
    }
  }, [tahunPelajarans, showToast]);

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
      render: (value: boolean) => (
        <Badge variant={value ? "success" : "secondary"}>
          {value ? 'Aktif' : 'Nonaktif'}
        </Badge>
      )
    },
    { 
      key: '_count', 
      label: 'Siswa',
      render: (count: any) => (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {count?.SiswaAkademik || count?.Siswa || 0}
        </span>
      )
    },
    { 
      key: '_count', 
      label: 'Semester',
      render: (count: any) => (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {count?.Semester || 0}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: any, tahunPelajaran: TahunPelajaran) => (
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
              {!tahunPelajaran.is_active && (
                <Tooltip content="Set Aktif">
                    <Button
                    size="sm"
                    variant="primary"
                    className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Konfirmasi Aktivasi Tahun Pelajaran',
                          description: `Apakah Anda yakin ingin mengaktifkan tahun pelajaran "${tahunPelajaran.tahun}"?\nTindakan ini akan:\n• Menonaktifkan tahun pelajaran aktif sebelumnya\n• Mengubah konteks seluruh data akademik (absensi, nilai, laporan)`,
                          confirmText: 'Aktifkan',
                          cancelText: 'Batal',
                          style: 'success',
                        });
                        if (ok) {
                          await handleActivate(tahunPelajaran.id);
                        }
                      }}
                      aria-label="Set Aktif Tahun Pelajaran"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                </Tooltip>
              )}
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
  ], [canManage, onEdit, onView]);


  if (!canManage && !onView) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Search & Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
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
      
      <div className="bg-transparent overflow-hidden">
        {/* Table */}
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
      </div>
    </div>
  );
};

export default TahunPelajaranList;

