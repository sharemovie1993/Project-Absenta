import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useConfirm from '../../../hooks/useConfirm';
import { Edit, Trash2, Eye, Plus, Search, RefreshCw, CheckCircle, Circle, FileSpreadsheet, Download, Calendar } from 'lucide-react';
import { 
  Table, 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  SectionCard
} from '../../ui';
import { 
  getSemesterList, 
  deleteSemester, 
  setActiveSemester, 
  getSemesterDetail
} from '../../../api/academic/semester.api';
import type { Semester } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';

interface SemesterListProps {
  onEdit?: (semester: Semester) => void;
  onView?: (semester: Semester) => void;
  onAdd?: () => void;
  refreshTrigger?: number;
  tahunPelajaranId?: string;
  toolbarRight?: React.ReactNode;
}

const SemesterList: React.FC<SemesterListProps> = React.memo(({ 
  onEdit, 
  onView, 
  onAdd,
  refreshTrigger = 0,
  tahunPelajaranId,
  toolbarRight
}) => {
  const confirm = useConfirm();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);
  

  const { user, isLoading: isAuthLoading } = useAuthStore();
  
  if (isAuthLoading) {
    return <Loader size="lg" />;
  }
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return user?.capabilities?.includes('academic.semesters.update') || user?.capabilities?.includes('academic.semesters.delete');
  }, [user]);

  // Fetch semesters with debounced search
  const fetchSemesters = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getSemesterList(page, itemsPerPage, search, tahunPelajaranId);
      
      if (response.success && response.data) {
        setSemesters(response.data || []);
        // Add null safety check for pagination
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalItems(response.pagination.total || 0);
          setCurrentPage(response.pagination.page || 1);
        } else {
          // Fallback values if pagination is undefined
          setTotalPages(1);
          setTotalItems(0);
          setCurrentPage(1);
        }
      } else {
        toast.error('Gagal memuat data semester');
        // Reset to default values on error
        setSemesters([]);
        setTotalPages(1);
        setTotalItems(0);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching semesters:', error);
      toast.error('Terjadi kesalahan saat memuat data semester');
      // Reset to default values on error
      setSemesters([]);
      setTotalPages(1);
      setTotalItems(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  }, [tahunPelajaranId, itemsPerPage]);

  // Debounced search effect
  useEffect(() => {
    fetchSemesters(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchSemesters]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSemesters(currentPage, searchTerm);
    }
  }, [refreshTrigger, fetchSemesters, currentPage, searchTerm]);

  // Initial load
  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    fetchSemesters(page, searchTerm);
  }, [fetchSemesters, searchTerm]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(semesters || [], [
        { header: 'Nama Semester', accessor: (row) => row.nama_semester, width: 25 },
        { header: 'Tahun Pelajaran', accessor: (row) => row.TahunPelajaran?.tahun || '', width: 20 },
        { header: 'Status', accessor: (row) => row.is_active ? 'Aktif' : 'Tidak Aktif', width: 15 }
      ], 'Laporan_Semester', 'DATA SEMESTER AKADEMIK');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', { icon: '⚠️' });
    }
  }, [semesters]);

  // Handle delete
  const handleDelete = useCallback(async (semester: Semester) => {
    // Check related data first
    try {
      setLoading(true);
      const detail = await getSemesterDetail(semester.id);
      const typedDetail = detail as Semester & {
        _count?: {
          SesiAbsensi?: number;
          Siswa?: number;
        };
      };
      const sesiCount = Number(typedDetail?._count?.SesiAbsensi || 0);
      const siswaCount = Number(typedDetail?._count?.Siswa || 0);
      const tp = String(typedDetail?.TahunPelajaran?.tahun || semester.TahunPelajaran?.tahun || '');
      
      const hasRelated = sesiCount > 0 || siswaCount > 0;

      const ok = await confirm({
        title: 'Konfirmasi Hapus Semester',
        description: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tahun Pelajaran</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{tp}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Semester</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{semester.nama_semester}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sesi Absensi</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{sesiCount}</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Siswa Terdaftar</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{siswaCount}</div>
              </div>
            </div>

            {hasRelated ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 font-bold leading-relaxed">
                  Semester ini tidak dapat dihapus karena masih memiliki keterkaitan dengan data Sesi Absensi atau Siswa.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus semester ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            )}
          </div>
        ),
        confirmText: hasRelated ? undefined : 'Hapus Semester',
        cancelText: 'Tutup',
        style: 'danger',
      });

      if (!ok || hasRelated) return;

      setDeleting(true);
      const response = await deleteSemester(semester.id);
      
      if (response.success) {
        toast.success(response.message || 'Semester berhasil dihapus');
        fetchSemesters(currentPage, searchTerm);
      } else {
        toast.error(response.message || 'Gagal menghapus semester');
      }
    } catch (error: any) {
      console.error('Error deleting semester:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus semester');
    } finally {
      setDeleting(false);
      setLoading(false);
    }
  }, [confirm, fetchSemesters, currentPage, searchTerm]);

  // Handle set active
  const handleSetActive = useCallback(async (semester: Semester) => {
    const ok = await confirm({
      title: 'Konfirmasi Aktivasi Semester',
      description: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin mengaktifkan semester <strong>{semester.nama_semester}</strong>?
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
              Tindakan ini juga akan otomatis mengaktifkan Tahun Pelajaran "{semester.TahunPelajaran?.tahun}" dan mensinkronisasi status siswa menjadi AKTIF.
            </p>
          </div>
        </div>
      ),
      confirmText: 'Aktifkan',
      cancelText: 'Batal',
      style: 'success',
    });

    if (!ok) return;

    try {
      setActivating(true);
      const response = await setActiveSemester(semester.id);
      
      if (response.success) {
        toast.success(`Semester "${semester.nama_semester}" berhasil diaktifkan`);
        fetchSemesters(currentPage, searchTerm);
      } else {
        toast.error('Gagal mengaktifkan semester');
      }
    } catch (error: any) {
      console.error('Error activating semester:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat mengaktifkan semester');
    } finally {
      setActivating(false);
    }
  }, [confirm, fetchSemesters, currentPage, searchTerm]);

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'nama_semester', 
      label: 'Nama Semester',
      sortable: true,
      render: (value: string, semester: Semester) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {semester.TahunPelajaran?.tahun || 'N/A'}
            </div>
          </div>
          {semester.is_active && (
            <Badge variant="success" className="ml-1">
              Aktif
            </Badge>
          )}
        </div>
      )
    },
    { 
      key: 'TahunPelajaran', 
      label: 'Tahun Pelajaran',
      render: (tahunPelajaran: Semester['TahunPelajaran']) => tahunPelajaran?.tahun || '-'
    },
    { 
      key: 'is_active', 
      label: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? "success" : "secondary"}>
          {value ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: unknown, semester: Semester) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView?.(semester)}
            aria-label="Lihat Detail Semester"
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
                onClick={() => onEdit?.(semester)}
                aria-label="Edit Data Semester"
              >
                <Edit className="w-4 h-4" />
              </Button>
              {!semester.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Konfirmasi Aktivasi Semester',
                        description: `Apakah Anda yakin ingin mengaktifkan semester "${semester.nama_semester}"?`,
                        confirmText: 'Aktifkan',
                        cancelText: 'Batal',
                        style: 'success',
                      });
                      if (ok) {
                        await handleSetActive(semester);
                      }
                    }}
                    aria-label="Aktifkan Semester"
                    className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(semester)}
                aria-label="Hapus Data Semester"
                disabled={semester.is_active}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ], [canManage, onEdit, onView, confirm, handleDelete, handleSetActive]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari semester..."
            aria-label="Cari Semester"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 text-[13px] rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        <Table
          columns={columns}
          data={semesters}
          loading={loading}
          emptyMessage="Tidak ada data semester ditemukan"
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
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-2">
               {canManage && onAdd && (
                  <Button 
                    onClick={onAdd}
                    variant="toolbarPrimary"
                    size="toolbar"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Semester
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
                  onClick={() => fetchSemesters(currentPage, searchTerm)}
                  aria-label="Refresh Data"
                  className="rounded-xl"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
          }
          toolbarRight={toolbarRight}
        />
      </div>
    </div>
  );
});

SemesterList.displayName = 'SemesterList';
export default SemesterList;
