import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useConfirm from '../../../hooks/useConfirm';
import { Edit, Trash2, Eye, Plus, Search, RefreshCw, CheckCircle, Circle, FileSpreadsheet, Download, Calendar, Clock } from 'lucide-react';
import { Table, Button, Input, Modal, Badge, Loader, SectionCard } from '../../ui';
import { getSemesterList, deleteSemester, setActiveSemester, getSemesterDetail, semesterQueryKeys } from '../../../api/academic/semester.api';
import type { Semester } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { cn } from '@/lib/utils';
import { exportDataToExcel } from '../../../utils/export.utils';
interface SemesterListProps {
  onEdit?: (semester: Semester) => void;
  onView?: (semester: Semester) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
  tahunPelajaranId?: string;
  toolbarRight?: React.ReactNode;
}
const SemesterList: React.FC<SemesterListProps> = React.memo(({
  onEdit,
  onView,
  onAdd,
  onRefresh,
  refreshTrigger = 0,
  tahunPelajaranId,
  toolbarRight
}) => {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const invalidateSemesterCache = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['semester-aktif']
    });
    queryClient.invalidateQueries({
      queryKey: ['tahun-pelajaran-options-list']
    });
    queryClient.invalidateQueries({
      queryKey: ['academic-stats']
    });
  }, [queryClient]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);
  const {
    user,
    isLoading: isAuthLoading
  } = useAuthStore();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return user?.capabilities?.includes('academic.semesters.update') || user?.capabilities?.includes('academic.semesters.delete');
  }, [user]);

  // Queries using React Query
  const {
    data: listRes,
    isLoading: loading,
    refetch
  } = useQuery({
    queryKey: semesterQueryKeys.list({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      tahunPelajaranId
    }),
    queryFn: () => getSemesterList(currentPage, itemsPerPage, debouncedSearchTerm, tahunPelajaranId),
    staleTime: 5 * 60 * 1000
  });
  const semesters = useMemo(() => listRes?.data || [], [listRes]);
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(semesters || [], [{
        header: 'Nama Semester',
        accessor: row => row.nama_semester,
        width: 25
      }, {
        header: 'Tahun Pelajaran',
        accessor: row => row.TahunPelajaran?.tahun || '',
        width: 20
      }, {
        header: 'Status',
        accessor: row => row.is_active ? 'Aktif' : 'Tidak Aktif',
        width: 15
      }], 'Laporan_Semester', 'DATA SEMESTER AKADEMIK');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', {
        icon: '⚠️'
      });
    }
  }, [semesters]);

  // Handle delete
  const handleDelete = useCallback(async (semester: Semester) => {
    // Check related data first
    try {
      setDeleting(true);
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
        description: <div className="space-y-4">
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

            {hasRelated ? <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 font-bold leading-relaxed">
                  Semester ini tidak dapat dihapus karena masih memiliki keterkaitan dengan data Sesi Absensi atau Siswa.
                </p>
              </div> : <p className="text-sm text-slate-600 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus semester ini? Tindakan ini tidak dapat dibatalkan.
              </p>}
          </div>,
        confirmText: hasRelated ? undefined : 'Hapus Semester',
        cancelText: 'Tutup',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus semester...'
      });
      if (!ok || hasRelated) return;
      setDeleting(true);
      const response = await deleteSemester(semester.id);
      if (response.success) {
        toast.success(response.message || 'Semester berhasil dihapus');
        invalidateSemesterCache();
        queryClient.invalidateQueries({
          queryKey: semesterQueryKeys.all
        });
        refetch();
        onRefresh?.();
      } else {
        toast.error(response.message || 'Gagal menghapus semester');
      }
    } catch (error: any) {
      console.error('Error deleting semester:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus semester');
    } finally {
      setDeleting(false);
      confirm.setLoading(false);
    }
  }, [confirm, currentPage, searchTerm, onRefresh, invalidateSemesterCache, queryClient, refetch]);

  // Handle set active
  const handleSetActive = useCallback(async (semester: Semester) => {
    const ok = await confirm({
      title: 'Konfirmasi Aktivasi Semester',
      description: <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin mengaktifkan semester <strong>{semester.nama_semester}</strong>?
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
              Tindakan ini juga akan otomatis mengaktifkan Tahun Pelajaran "{semester.TahunPelajaran?.tahun}" dan mensinkronisasi status siswa menjadi AKTIF.
            </p>
          </div>
        </div>,
      confirmText: 'Aktifkan',
      cancelText: 'Batal',
      style: 'success',
      withProgress: true,
      progressLabel: 'Mengaktifkan semester...'
    });
    if (!ok) return;
    try {
      setActivating(true);
      const response = await setActiveSemester(semester.id);
      if (response.success) {
        toast.success(`Semester "${semester.nama_semester}" berhasil diaktifkan`);
        invalidateSemesterCache();
        queryClient.invalidateQueries({
          queryKey: semesterQueryKeys.all
        });
        refetch();
        onRefresh?.();
      } else {
        toast.error('Gagal mengaktifkan semester');
      }
    } catch (error: any) {
      console.error('Error activating semester:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat mengaktifkan semester');
    } finally {
      setActivating(false);
      confirm.setLoading(false);
    }
  }, [confirm, currentPage, searchTerm, onRefresh, invalidateSemesterCache, queryClient, refetch]);

  // Table columns configuration
  const columns = useMemo(() => [{
    key: 'nama_semester',
    label: 'Nama Semester',
    sortable: true,
    render: (value: string, semester: Semester) => <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {semester.TahunPelajaran?.tahun || 'N/A'}
            </div>
          </div>
          {semester.is_active && <Badge variant="success" className="ml-1">
              Aktif
            </Badge>}
        </div>
  }, {
    key: 'TahunPelajaran',
    label: 'Tahun Pelajaran',
    render: (tahunPelajaran: Semester['TahunPelajaran']) => tahunPelajaran?.tahun || '-'
  }, {
    key: 'is_active',
    label: 'Status',
    render: (isActive: boolean, sem: Semester) => <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
          {canManage && <button type="button" onClick={async () => {
        if (isActive) {
          toast.error('Semester aktif tidak dapat dinonaktifkan secara langsung. Silakan aktifkan semester lainnya.');
          return;
        }
        const ok = await confirm({
          title: 'Konfirmasi Aktivasi Semester',
          description: <div className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Apakah Anda yakin ingin mengaktifkan semester <strong>{sem.nama_semester}</strong>?
                      </p>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                          Tindakan ini juga akan otomatis mengaktifkan Tahun Pelajaran "{sem.TahunPelajaran?.tahun || sem.TahunPelajaran?.tahun || ''}" dan mensinkronisasi status siswa menjadi AKTIF.
                        </p>
                      </div>
                    </div>,
          confirmText: 'Aktifkan',
          cancelText: 'Batal',
          style: 'success',
          withProgress: true,
          progressLabel: 'Mengaktifkan semester...'
        });
        if (ok) {
          await handleSetActive(sem);
        }
      }} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-750'}`} style={{
        transition: 'background-color 0.2s'
      }} aria-label={`Toggle status ${sem.nama_semester}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`} style={{
          transition: 'transform 0.2s'
        }} />
            </button>}
        </div>
  }, {
    key: 'actions',
    label: 'Aksi',
    render: (_: unknown, semester: Semester) => (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => onView?.(semester)} aria-label="Lihat Detail Semester" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
          <Eye className="w-4 h-4" />
        </Button>
        {canManage && (
          <>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => onEdit?.(semester)} aria-label="Edit Data Semester">
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(semester)} aria-label="Hapus Data Semester" disabled={semester.is_active}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    )
  }], [canManage, onEdit, onView, confirm, handleDelete, handleSetActive]);

  const isMobile = useIsMobile();

  const renderSemesterMobileCard = useCallback((sem: Semester) => {
    const isActive = sem.is_active;
    const tp = sem.TahunPelajaran?.tahun || '-';
    const tanggalMulai = sem.tanggal_mulai ? new Date(sem.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
    const tanggalSelesai = sem.tanggal_selesai ? new Date(sem.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

    return (
      <div
        key={sem.id}
        role="button"
        tabIndex={0}
        onClick={() => onView?.(sem)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView?.(sem);
          }
        }}
        aria-label={`Detail semester ${sem.nama_semester}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              Semester {sem.nama_semester}
            </h4>
            {isActive ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                Aktif
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                Nonaktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Tahun Pelajaran: {tp}
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(sem);
          }}
          aria-label={`Detail ${sem.nama_semester}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, [onView]);

  if (isAuthLoading) {
    return <Loader size="lg" />;
  }
  const totalPages = listRes?.pagination?.totalPages || 1;
  const totalItems = listRes?.pagination?.total || 0;
  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input type="text" placeholder="Cari semester..." aria-label="Cari Semester" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-9 text-[13px] rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9" />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        {isMobile ? (
          <div className="p-4 space-y-4">
            <MobileAcademicList
              title="Daftar Semester"
              data={semesters}
              loading={loading}
              totalItems={totalItems}
              onRefresh={() => refetch()}
              onAdd={onAdd}
              canManage={canManage}
              emptyMessage="Tidak ada data semester ditemukan"
              pagination={{
                currentPage,
                totalPages,
                totalItems,
                itemsPerPage,
                onPageChange: handlePageChange,
                onLimitChange: limit => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }
              }}
              renderCard={renderSemesterMobileCard}
            />
          </div>
        ) : (
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
              onLimitChange: limit => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }
            }}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-2">
                {canManage && onAdd && (
                  <Button onClick={onAdd} variant="toolbarPrimary" size="toolbar">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Semester
                  </Button>
                )}
                
                <Button variant="toolbarOutline" size="toolbar" onClick={handleExport} className="rounded-xl">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                </Button>
    
                <Button variant="toolbarOutline" size="toolbarIcon" onClick={() => refetch()} aria-label="Refresh Data" className="rounded-xl" disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            }
            toolbarRight={toolbarRight}
          />
        )}
      </div>
    </div>
  );
});
SemesterList.displayName = 'SemesterList';
export default SemesterList;