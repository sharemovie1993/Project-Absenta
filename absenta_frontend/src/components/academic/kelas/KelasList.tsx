import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useConfirm from '../../../hooks/useConfirm';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Download, 
  Trash2, 
  School, 
  Eye, 
  FileSpreadsheet, 
  Upload, 
  Users,
  AlertCircle 
} from 'lucide-react';
import { 
  Table, 
  Button, 
  Badge, 
  Input,
  Modal,
  Loader
} from '../../ui';
import { getKelasList, deleteKelas, updateKelas } from '../../../api/academic/kelas.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import type { Kelas, Jurusan } from '../../../types/academic';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { useDebounce } from '../../../hooks/useDebounce';

interface KelasListProps {
  onEdit?: (kelas: Kelas) => void;
  onView?: (kelas: Kelas) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  refreshTrigger?: number;
  guruId?: string;
}

const KelasList = React.memo<KelasListProps>(({ 
  onEdit, 
  onView, 
  onAdd,
  onImport,
  onExport,
  isExporting = false,
  refreshTrigger = 0,
  guruId = ''
}) => {
  const confirm = useConfirm();
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [deleting, setDeleting] = useState(false);
  
  // Bulk delete states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);

  // Filter states
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);

  const { user, can } = useAuth();
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return can('academic.structures.update') || can('academic.structures.delete');
  }, [can]);

  const isFiltered = useMemo(() => {
    return searchTerm !== '' || filterTingkat !== '' || filterJurusan !== '' || filterStatus !== '' || guruId !== '';
  }, [searchTerm, filterTingkat, filterJurusan, filterStatus, guruId]);

  const handleResetFilter = useCallback(() => {
    setSearchTerm('');
    setFilterTingkat('');
    setFilterJurusan('');
    setFilterStatus('');
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, []);

  const allVisibleSelected = useMemo(() => {
    if (kelasList.length === 0) return false;
    return kelasList.every(k => selectedIds.has(k.id));
  }, [kelasList, selectedIds]);

  const mappedKelasList = useMemo(() => {
    return kelasList.map(k => ({
      ...k,
      jumlah_siswa: k._count?.Siswa || 0
    }));
  }, [kelasList]);

  // Fetch jurusan list for filter
  useEffect(() => {
    const fetchJurusan = async () => {
      try {
        const res = await getJurusanList(1, 100);
        if (res.success) {
          setJurusanList(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch jurusan list', err);
      }
    };
    fetchJurusan();
  }, []);

  // Fetch kelas with debounced search
  const fetchKelas = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getKelasList(page, itemsPerPage, search, filterTingkat, filterJurusan, guruId, filterStatus);
      
      if (response.success) {
        setKelasList(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      } else {
        toast.error('Gagal memuat data kelas');
      }
    } catch (error) {
      console.error('Error fetching kelas:', error);
      toast.error('Terjadi kesalahan saat memuat data kelas');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, filterTingkat, filterJurusan, filterStatus]);

  // Toggle active status handler
  const handleToggleActive = async (kelas: Kelas) => {
    try {
      setTogglingId(kelas.id);
      const targetState = !kelas.is_active;
      const response = await updateKelas(kelas.id, { is_active: targetState });
      if (response.success) {
        toast.success(`Kelas ${kelas.nama_kelas} berhasil ${targetState ? 'diaktifkan' : 'dinonaktifkan'}.`);
        // Optimistic UI update
        setKelasList(prev => prev.map(k => k.id === kelas.id ? { ...k, is_active: targetState } : k));
      } else {
        toast.error(response.message || 'Gagal mengubah status kelas');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat mengubah status kelas';
      toast.error(errMsg);
    } finally {
      setTogglingId(null);
    }
  };

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Fetch data
  useEffect(() => {
    fetchKelas(currentPage, debouncedSearchTerm);
  }, [fetchKelas, currentPage, debouncedSearchTerm, filterTingkat, filterJurusan, filterStatus, itemsPerPage, refreshTrigger, guruId]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    const n = parseInt(value, 10) || 10;
    setItemsPerPage(n);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handlePageJump = useCallback(() => {
    let p = parseInt(pageInput, 10) || 1;
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    handlePageChange(p);
  }, [pageInput, totalPages, handlePageChange]);

  // Handle delete
  const handleDelete = useCallback(async (kelas: Kelas) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Kelas',
        description: (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">Tindakan Tidak Dapat Dibatalkan</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Menghapus kelas <strong>{kelas.nama_kelas}</strong> akan menghapus seluruh keterkaitan data siswa, jadwal, dan absensi di kelas tersebut.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tingkat</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Kelas {kelas.tingkat}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jurusan</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{kelas.Jurusan?.nama || 'Umum'}</p>
              </div>
            </div>
          </div>
        ),
        confirmText: 'Ya, Hapus Kelas',
        cancelText: 'Batal',
        style: 'danger',
      });

      if (!ok) return;

      setDeleting(true);
      const response = await deleteKelas(kelas.id);
      
      if (response.success) {
        toast.success(response.message || 'Kelas berhasil dihapus');
        fetchKelas(currentPage, debouncedSearchTerm);
      } else {
        toast.error(response.message || 'Gagal menghapus kelas');
      }
    } catch (error: any) {
      console.error('Error deleting kelas:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat menghapus kelas';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }, [fetchKelas, currentPage, debouncedSearchTerm, confirm]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(ids.map(async (id) => {
        const res = await deleteKelas(id);
        if (!res.success) throw new Error(res.message || 'Gagal menghapus');
        return id;
      }));
      
      const succeeded: string[] = [];
      const failed: string[] = [];
      
      results.forEach((r, idx) => {
        const id = ids[idx];
        if (r.status === 'fulfilled') {
          succeeded.push(id);
        } else {
          failed.push(id);
        }
      });

      if (failed.length > 0) {
        toast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, { icon: '⚠️' });
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} kelas`);
      }
      
      const next = new Set<string>(selectedIds);
      succeeded.forEach(id => next.delete(id));
      setSelectedIds(next);
      fetchKelas(currentPage, searchTerm);
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat bulk delete';
      toast.error(msg);
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds, fetchKelas, currentPage, searchTerm]);

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'nama_kelas', 
      label: 'Nama Kelas',
      sortable: true,
      render: (value: string, kelas: Kelas) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Tingkat {kelas.tingkat}</div>
        </div>
      )
    },
    { 
      key: 'Jurusan', 
      label: 'Jurusan',
      render: (jurusan: any) => (
        <Badge variant="info">
          {jurusan?.nama || 'Umum'}
        </Badge>
      )
    },

    { 
      key: 'WaliKelas', 
      label: 'Wali Kelas',
      render: (waliKelas: any) => (
        <div className="text-xs text-gray-700 dark:text-gray-300">
          {waliKelas?.[0]?.Guru?.nama_guru || (
            <span className="text-gray-400">Belum ditentukan</span>
          )}
        </div>
      )
    },
    { 
      key: 'jumlah_siswa', 
      label: 'Jumlah Siswa',
      sortable: true,
      render: (jumlahSiswa: number) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{jumlahSiswa || 0} siswa</span>
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (isActive: boolean, kelas: Kelas) => {
        const isToggling = togglingId === kelas.id;
        return (
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Badge variant={isActive ? 'success' : 'error'} className="text-[10px] py-0.5 px-2.5 rounded-full font-bold">
              {isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {canManage && (
              <button
                type="button"
                onClick={() => handleToggleActive(kelas)}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-750'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ transition: 'background-color 0.2s' }}
                aria-label={`Toggle status ${kelas.nama_kelas}`}
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
      render: (_: any, kelas: Kelas) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView?.(kelas)}
            aria-label="Lihat Detail Kelas"
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
                onClick={() => onEdit?.(kelas)}
                aria-label="Edit Data Kelas"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(kelas)}
                aria-label="Hapus Data Kelas"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ].filter(Boolean) as any, [canManage, onEdit, onView, confirm, handleDelete, allVisibleSelected, selectedIds, kelasList, togglingId]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari kelas..."
            aria-label="Cari Kelas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect 
            value={filterTingkat}
            onValueChange={setFilterTingkat}
            options={[
              { label: "Semua Tingkat", value: "" },
              { label: "Tingkat 10", value: "10" },
              { label: "Tingkat 11", value: "11" },
              { label: "Tingkat 12", value: "12" }
            ]}
            placeholder="Pilih Tingkat"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect 
            value={filterJurusan}
            onValueChange={setFilterJurusan}
            options={[
              { label: "Semua Jurusan", value: "" },
              ...(jurusanList || [])?.map(j => ({ label: j.nama, value: j.id }))
            ]}
            placeholder="Pilih Jurusan"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect 
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={[
              { label: "Semua Status", value: "" },
              { label: "Aktif", value: "true" },
              { label: "Nonaktif", value: "false" }
            ]}
            placeholder="Pilih Status"
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        <Table
          columns={columns}
          data={mappedKelasList}
          loading={loading}
          emptyMessage="Tidak ada data kelas ditemukan"
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
                    Tambah Kelas
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
                 onClick={() => fetchKelas(currentPage, debouncedSearchTerm)}
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
                     title: 'Hapus Kelas Terpilih',
                     description: `Anda yakin ingin menghapus ${selectedIds.size} kelas terpilih?`,
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

      <Modal
        isOpen={bulkErrorModalOpen}
        onClose={() => { setBulkErrorModalOpen(false); setBulkErrorDetails([]); }}
        title="Gagal Menghapus Beberapa Kelas"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ada {bulkErrorDetails.length} data gagal dihapus karena keterkaitan relasi database (misal: kelas sudah memiliki riwayat absensi atau nilai).
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

KelasList.displayName = 'KelasList';

export default KelasList;
