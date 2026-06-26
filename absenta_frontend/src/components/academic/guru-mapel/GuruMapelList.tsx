import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Table } from '../../ui/Table';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Input } from '../../ui/Input';
import { SectionCard } from '../../ui/SectionCard';
import { Trash2, Plus, Search, RefreshCw, Users, BookOpen, FileSpreadsheet, Download } from 'lucide-react';
import { listGuruMapel, removeGuruMapel } from '../../../api/academic/guru-mapel.api';
import type { GuruMapel } from '../../../types/academic';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { getGuruList } from '../../../api/academic/guru.api';
import { getMapelList } from '../../../api/academic/mapel.api';
import type { Guru, Mapel } from '../../../types/academic';
import useConfirm from '../../../hooks/useConfirm';
import { useDebounce } from '../../../hooks/useDebounce';
import { exportDataToExcel } from '../../../utils/export.utils';

interface Props {
  refreshTrigger?: number;
  onAdd?: () => void;
}

const GuruMapelList = React.memo<Props>(({ refreshTrigger = 0, onAdd }) => {

  const { user } = useAuthStore();
  const confirm = useConfirm();
  const [items, setItems] = useState<GuruMapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [guruOptions, setGuruOptions] = useState<Guru[]>([]);
  const [mapelOptions, setMapelOptions] = useState<Mapel[]>([]);
  const [isLoadingGuru, setIsLoadingGuru] = useState(false);
  const [isLoadingMapel, setIsLoadingMapel] = useState(false);

  const canManage = useMemo(() => {
    return user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'ADMIN';
  }, [user]);

  const handleSearchGuru = useCallback(async (query: string) => {
    try {
      setIsLoadingGuru(true);
      const res = await getGuruList(1, 100, query);
      setGuruOptions(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingGuru(false);
    }
  }, []);

  const handleSearchMapel = useCallback(async (query: string) => {
    try {
      setIsLoadingMapel(true);
      const res = await getMapelList(1, 100, query);
      setMapelOptions(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingMapel(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listGuruMapel({
        guru_id: selectedGuruId || undefined,
        mapel_id: selectedMapelId || undefined
      });
      if (res.success) {
        const term = debouncedSearch.toLowerCase();
        const filtered = res.data.filter((gm) => {
          const guru = gm.Guru?.nama_guru?.toLowerCase() || '';
          const mapel = gm.Mapel?.nama_mapel?.toLowerCase() || '';
          return guru.includes(term) || mapel.includes(term);
        });
        setItems(filtered);
      } else {
        toast.error(res.message || 'Gagal memuat data');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedGuruId, selectedMapelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshTrigger > 0) fetchData();
  }, [refreshTrigger, fetchData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [gurus, mapels] = await Promise.all([
          getGuruList(1, 100, ''),
          getMapelList(1, 100, ''),
        ]);
        setGuruOptions(gurus.data);
        setMapelOptions(mapels.data);
      } catch {
        // ignore
      }
    };
    loadOptions();
  }, []);

  const handleDelete = useCallback(async (gm: GuruMapel) => {
    try {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Pengampu',
        description: (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-tight">Hapus Penugasan Mengajar</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong>{gm.Guru?.nama_guru}</strong> sebagai pengampu mata pelajaran <strong>{gm.Mapel?.nama_mapel}</strong>?
                </p>
              </div>
            </div>
          </div>
        ),
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
      });
      if (!ok) return;

      const res = await removeGuruMapel(gm.id);
      if (!res.success) {
        toast.error(res.message || 'Gagal menghapus pengampu');
        return;
      }
      toast.success(res.message || 'Pengampu berhasil dihapus');
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Gagal menghapus pengampu';
      toast.error(msg);
    }
  }, [fetchData, confirm]);

  const columns = useMemo(() => [
    {
      key: 'Guru',
      label: 'Guru',
      sortable: true,
      render: (_: any, gm: GuruMapel) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{gm.Guru?.nama_guru || '-'}</span>
        </div>
      )
    },
    {
      key: 'Mapel',
      label: 'Mata Pelajaran',
      sortable: true,
      render: (_: any, gm: GuruMapel) => (
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{gm.Mapel?.nama_mapel || '-'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: any, gm: GuruMapel) => (
        <div className="flex items-center gap-1">
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(gm)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Hapus Pengampu"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [canManage, handleDelete]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    try {
      exportDataToExcel(items, [
        { header: 'Guru Pengampu', accessor: (row) => row.Guru?.nama_guru || '', width: 30 },
        { header: 'Mata Pelajaran', accessor: (row) => row.Mapel?.nama_mapel || '', width: 25 }
      ], 'Laporan_Guru_Mapel', 'DATA PENGAMPU MATA PELAJARAN');
    } catch (error: any) {
      toast(error.message || 'Gagal mengekspor data', { icon: '⚠️' });
    }
  }, [items]);

  return (
    <div className="flex flex-col">
      {/* Toolbar Baris Kedua - Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari guru atau mapel..."
            aria-label="Cari Guru atau Mata Pelajaran"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            options={[{ label: 'Semua Guru', value: '' }, ...(guruOptions || [])?.map(g => ({ label: g.nama_guru, value: g.id }))]}
            placeholder="Filter Guru"
            searchPlaceholder="Cari Guru..."
            onSearch={handleSearchGuru}
            isLoading={isLoadingGuru}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="w-full md:w-52">
          <SearchableSelect
            value={selectedMapelId}
            onValueChange={setSelectedMapelId}
            options={[{ label: 'Semua Mapel', value: '' }, ...(mapelOptions || [])?.map(m => ({ label: m.nama_mapel, value: m.id }))]}
            placeholder="Filter Mapel"
            searchPlaceholder="Cari Mapel..."
            onSearch={handleSearchMapel}
            isLoading={isLoadingMapel}
            triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>
      
      <div className="bg-transparent overflow-hidden">
        <Table 
          columns={columns} 
          data={items} 
          loading={loading}
          emptyMessage="Belum ada pengampu" 
          compact={true}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-2">
               {canManage && onAdd && (
                  <Button 
                    onClick={onAdd}
                    variant="toolbarPrimary"
                    size="toolbar"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Pengampu
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
                 onClick={() => fetchData()}
                 title="Refresh Data"
                 className="rounded-xl"
                 disabled={loading}
               >
                 <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
               </Button>
            </div>
          }
        />
      </div>
    </div>
  );
});

GuruMapelList.displayName = 'GuruMapelList';

export default GuruMapelList;

