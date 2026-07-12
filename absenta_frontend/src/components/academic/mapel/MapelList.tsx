import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useConfirm from '../../../hooks/useConfirm';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  AlertCircle,
  Layers,
  GraduationCap
} from 'lucide-react';
import { 
  Table, 
  Button, 
  Input, 
  Modal, 
  Badge, 
  Loader,
  SearchableSelect
} from '../../ui';
import { BookOpen } from 'lucide-react';
import { getMapelList, deleteMapel, initializeMapelPreset } from '../../../api/academic/mapel.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import type { Mapel } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { useDebounce } from '../../../hooks/useDebounce';
import { useJenjang } from '../../../hooks/useJenjang';
import { PresetWizardModal } from './PresetWizardModal';

interface MapelListProps {
  onEdit?: (mapel: Mapel) => void;
  onView?: (mapel: Mapel) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  refreshTrigger?: number;
}

const MapelList = React.memo<MapelListProps>(({ 
  onEdit, 
  onView, 
  onAdd,
  onImport,
  onExport,
  isExporting = false,
  refreshTrigger = 0 
}) => {
  const confirm = useConfirm();
  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [filterTingkat, setFilterTingkat] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMapel, setSelectedMapel] = useState<Mapel | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Bulk delete states
  const [bulkErrorDetails, setBulkErrorDetails] = useState<{ id: string; name: string; message: string }[]>([]);
  const [bulkErrorModalOpen, setBulkErrorModalOpen] = useState(false);
  
  const { user, can } = useAuth();
  const { jenjang, config, tingkatList } = useJenjang();
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [initializingPreset, setInitializingPreset] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UMUM' | 'KEJURUAN'>('ALL');
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  useEffect(() => {
    if (jenjang === 'SMK' || jenjang === 'MAK') {
      getJurusanList(1, 100).then(res => {
        if (res.success) {
          setJurusans(res.data);
        }
      }).catch(err => console.error('Error fetching jurusans:', err));
    }
  }, [jenjang]);
  
  // Check if user can perform CRUD operations
  const canManage = useMemo(() => {
    return user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'ADMIN';
  }, [user]);

  const allVisibleSelected = useMemo(() => {
    if (mapels.length === 0) return false;
    return mapels.every(m => selectedIds.has(m.id));
  }, [mapels, selectedIds]);

  // Fetch mapels with debounced search
  const fetchMapels = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await getMapelList(page, itemsPerPage, search, filterTingkat);
      
      if (response.success) {
        setMapels(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      } else {
        toast.error('Gagal memuat data mata pelajaran');
      }
    } catch (error) {
      console.error('Error fetching mapels:', error);
      toast.error('Terjadi kesalahan saat memuat data mata pelajaran');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, filterTingkat]);

  useEffect(() => {
    fetchMapels(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, filterTingkat, fetchMapels]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchMapels(currentPage, debouncedSearchTerm);
    }
  }, [refreshTrigger, fetchMapels, currentPage, debouncedSearchTerm]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    fetchMapels(page, debouncedSearchTerm);
  }, [fetchMapels, debouncedSearchTerm]);

  const handleItemsPerPageChange = (value: string) => {
    const newVal = parseInt(value, 10);
    if (!isNaN(newVal)) {
      setItemsPerPage(newVal);
      setCurrentPage(1); // Reset to first page
    }
  };

  // Handle delete
  const handleDelete = useCallback(async (mapel: Mapel) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Mata Pelajaran',
        description: (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">Tindakan Tidak Dapat Dibatalkan</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Menghapus mata pelajaran <strong>{mapel.nama_mapel}</strong> akan menghapus seluruh data kurikulum dan riwayat absensi terkait mata pelajaran ini.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kode Mapel</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{mapel.kode_mapel || '-'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tingkat</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{mapel.tingkat ? `Kelas ${mapel.tingkat}` : 'Semua'}</p>
              </div>
            </div>
          </div>
        ),
        confirmText: 'Ya, Hapus Mapel',
        cancelText: 'Batal',
        style: 'danger',
        withProgress: true,
        progressLabel: 'Menghapus mata pelajaran...',
      });

      if (!ok) return;

      setDeleting(true);
      const response = await deleteMapel(mapel.id);
      
      if (response.success) {
        toast.success(response.message || 'Mata pelajaran berhasil dihapus');
        fetchMapels(currentPage, debouncedSearchTerm);
      } else {
        toast.error(response.message || 'Gagal menghapus mata pelajaran');
      }
    } catch (error: any) {
      console.error('Error deleting mapel:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan saat menghapus mata pelajaran';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      confirm.setLoading(false);
    }
  }, [fetchMapels, currentPage, debouncedSearchTerm, confirm]);



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
        const mapelItem = mapels.find(m => m.id === id);
        try {
          const res = await deleteMapel(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          succeeded.push(id);
        } catch (e: any) {
          failed.push({ id, name: mapelItem?.nama_mapel || id, message: e?.message || 'Gagal menghapus' });
        }
        confirm.setLoading(true, Math.round(((i + 1) / total) * 100));
      }

      if (failed.length > 0) {
        setBulkErrorDetails(failed);
        setBulkErrorModalOpen(true);
        if (succeeded.length > 0) {
          toast(`Berhasil menghapus ${succeeded.length} mata pelajaran, ${failed.length} gagal.`, { icon: '⚠️' });
        }
      } else {
        toast.success(`Berhasil menghapus ${succeeded.length} mata pelajaran`);
      }

      const next = new Set<string>(selectedIds);
      succeeded.forEach(id => next.delete(id));
      setSelectedIds(next);
      
      fetchMapels(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      console.error('Error bulk deleting mapel:', err);
      toast.error('Terjadi kesalahan saat menghapus data terpilih');
    } finally {
      setBulkDeleting(false);
      confirm.setLoading(false);
    }
  }, [selectedIds, fetchMapels, currentPage, debouncedSearchTerm, confirm]);

  const handleInitializePreset = useCallback(async (jurusanId?: string) => {
    try {
      setInitializingPreset(true);
      const res = await initializeMapelPreset(jurusanId);
      if (res.success) {
        toast.success(res.message || `Berhasil menginisialisasi ${res.count || 0} mata pelajaran preset!`);
        setPresetModalOpen(false);
        fetchMapels(1, debouncedSearchTerm);
      } else {
        toast.error(res.message || 'Gagal menginisialisasi preset');
      }
    } catch (err: any) {
      console.error('Preset init error:', err);
      toast.error(err.message || 'Gagal menginisialisasi preset');
    } finally {
      setInitializingPreset(false);
    }
  }, [fetchMapels, debouncedSearchTerm]);

  // Table columns configuration
  const columns = useMemo(() => [
    { 
      key: 'nama_mapel', 
      label: 'Nama Mata Pelajaran',
      sortable: true,
      render: (value: string, mapel: Mapel) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
          {mapel.kode_mapel && (
            <div className="text-xs text-gray-500 dark:text-gray-400">Kode: {mapel.kode_mapel}</div>
          )}
        </div>
      )
    },
    { 
      key: 'tingkat', 
      label: 'Tingkat',
      sortable: true,
      render: (value: number | null) => (
        <Badge variant="info">
          {value ? `Kelas ${value}` : 'Semua Tingkat'}
        </Badge>
      )
    },
    { 
      key: '_count', 
      label: 'Guru Pengampu',
      render: (count: any) => (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {count?.GuruMapel || 0} guru
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'Aksi', 
      render: (_: any, mapel: Mapel) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView?.(mapel)}
            aria-label="Lihat Detail Mata Pelajaran"
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
                onClick={() => onEdit?.(mapel)}
                aria-label="Edit Data Mata Pelajaran"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(mapel)}
                aria-label="Hapus Data Mata Pelajaran"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ].filter(Boolean) as any, [canManage, onEdit, onView, confirm, handleDelete, allVisibleSelected, selectedIds, mapels]);

  const isSmkMak = jenjang === 'SMK' || jenjang === 'MAK';

  return (
    <div className="flex flex-col">
      {/* Tab Filter + Search Bar */}
      <div className="flex flex-col gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
          {[
            { key: 'ALL', label: 'Semua', icon: null },
            { key: 'UMUM', label: 'Umum / Wajib', icon: <BookOpen size={12} /> },
            { key: 'KEJURUAN', label: 'Kejuruan', icon: <GraduationCap size={12} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Filter Row */}
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari mata pelajaran..."
              aria-label="Cari Mata Pelajaran"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
            />
          </div>
          <div className="w-full md:w-48">
            <SearchableSelect
              value={filterTingkat}
              onValueChange={(val) => setFilterTingkat(val)}
              options={[
                { label: 'Semua Tingkat', value: 'ALL' },
                ...tingkatList.map((t) => ({ label: `Kelas ${t}`, value: t.toString() }))
              ]}
              placeholder="Pilih Tingkat"
              triggerClassName="h-9 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>
          {/* Dropdown Jurusan - hanya muncul bila tab Kejuruan aktif & SMK/MAK */}
          {activeTab === 'KEJURUAN' && isSmkMak && jurusans.length > 0 && (
            <div className="w-full md:w-52">
              <SearchableSelect
                value={selectedJurusanId}
                onValueChange={(val) => setSelectedJurusanId(val)}
                options={[
                  { label: 'Semua Jurusan', value: '' },
                  ...jurusans.map((j) => ({ label: j.nama, value: j.id }))
                ]}
                placeholder="Filter Jurusan"
                triggerClassName="h-9 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Preset Banner */}
      {totalItems === 0 && !loading && searchTerm === '' && filterTingkat === 'ALL' && canManage && (
        <div className="mx-4 my-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white p-2.5 rounded-xl mt-0.5 shadow-md shadow-blue-500/20">
              <BookOpen size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">Mulai Cepat dengan Preset Kurikulum</h4>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed max-w-xl">
                Sekolah Anda berjenjang <strong className="text-blue-950 dark:text-white">{config.label} ({jenjang})</strong>.
                {isSmkMak
                  ? ' Muat preset mapel wajib, atau pilih jurusan untuk memuat mapel kejuruan.'
                  : ' Klik tombol untuk memuat daftar mapel standar Kurikulum Merdeka.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:self-center flex-shrink-0">
            <Button
              onClick={() => setPresetModalOpen(true)}
              variant="primary"
              className="h-10 px-5 rounded-xl text-[11px] font-black tracking-wider uppercase bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <Layers size={14} />Gunakan Preset
            </Button>
          </div>
        </div>
      )}
      
      <div className="bg-transparent overflow-hidden">
        <Table
          columns={columns}
          data={mapels}
          loading={loading}
          emptyMessage="Tidak ada data mata pelajaran ditemukan"
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
                    Tambah Mapel
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
                 onClick={() => fetchMapels(currentPage, debouncedSearchTerm)}
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
                     title: 'Hapus Mapel Terpilih',
                     description: `Anda yakin ingin menghapus ${selectedIds.size} mata pelajaran terpilih?`,
                     confirmText: 'Hapus',
                     cancelText: 'Batal',
                     style: 'danger',
                     withProgress: true,
                     progressLabel: `Menghapus ${selectedIds.size} mata pelajaran...`,
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
        title="Gagal Menghapus Beberapa Mapel"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Ada {bulkErrorDetails.length} data gagal dihapus karena keterkaitan relasi database (misal: mapel sudah digunakan dalam jadwal atau absensi).
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

      {/* Wizard Multi-Step Preset Mapel */}
      <PresetWizardModal
        isOpen={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        jenjang={jenjang}
        onSuccess={() => fetchMapels(1, debouncedSearchTerm)}
      />
    </div>
  );
});

MapelList.displayName = 'MapelList';

export default MapelList;
