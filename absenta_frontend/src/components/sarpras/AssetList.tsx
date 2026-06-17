import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Tag,
  FileText,
  Printer
} from 'lucide-react';
import { Table } from '../ui/Table';
import type { Column } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { sarprasApi } from '../../api/sarpras.api';
import type { Asset } from '../../api/sarpras.api';
import { Loader, ConfirmDialog } from '../ui';
import Tooltip from '../ui/Tooltip';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetPrintLabelModal } from './AssetPrintLabelModal';
import { SearchableSelect } from '../ui/SearchableSelect';

import { useAuthStore } from '../../store/authStore';

interface AssetListProps {
  onEdit?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
  onAdd?: () => void;
  refreshTrigger?: number;
}

const AssetList: React.FC<AssetListProps> = ({ onEdit, onView, onAdd, refreshTrigger }) => {
  const { subscription } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Gating Logic
  const isLocked = subscription?.plan?.name === 'CORE_PLATFORM' || subscription?.Plan?.name === 'CORE_PLATFORM';
  const isEnabled = subscription !== undefined && !isLocked;
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, assetId: string | null}>({ isOpen: false, assetId: null });
  const [detailModal, setDetailModal] = useState<{isOpen: boolean, assetId: string | null}>({ isOpen: false, assetId: null });
  const [printModal, setPrintModal] = useState<{isOpen: boolean, assets: Asset[]}>({ isOpen: false, assets: [] });

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const { data: categories } = useQuery({ 
    queryKey: ['sarpras-categories'], 
    queryFn: sarprasApi.getCategories,
    enabled: isEnabled
  });
  const { data: locations } = useQuery({ 
    queryKey: ['sarpras-locations'], 
    queryFn: sarprasApi.getLocations,
    enabled: isEnabled
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['sarpras-assets', page, debouncedSearch, filterCategory, filterLocation, filterCondition, refreshTrigger],
    queryFn: () => sarprasApi.getAssets({ 
      page, 
      limit, 
      search: debouncedSearch,
      category_id: filterCategory || undefined,
      location_id: filterLocation || undefined,
      kondisi: filterCondition || undefined
    }),
    enabled: isEnabled
  });

  const assets: Asset[] = data?.data?.list || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sarprasApi.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
    }
  });

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'BAIK': return 'bg-green-100 text-green-700';
      case 'RUSAK': return 'bg-red-100 text-red-700';
      case 'PERBAIKAN': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const columns: Column[] = [
    {
      key: 'nama',
      label: 'Aset',
      render: (_, asset: Asset) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Package size={20} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{asset.nama}</p>
            <p className="text-xs text-slate-500">S/N: {asset.serial_number || '-'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'kode',
      label: 'Kode & Brand',
      render: (_, asset: Asset) => (
        <div>
          <Badge variant="outline" className="text-[10px] font-mono mb-1">
            {asset.kode || 'NO_CODE'}
          </Badge>
          <p className="text-sm text-slate-600 dark:text-slate-400">{asset.brand || '-'}</p>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (_, asset: Asset) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Tag size={12} className="text-indigo-500" />
          <span className="text-sm">{asset.Category?.nama || 'Uncategorized'}</span>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Lokasi',
      render: (_, asset: Asset) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <MapPin size={12} className="text-rose-500" />
          <span className="text-sm">{asset.Location?.nama || 'Gudang'}</span>
        </div>
      )
    },
    {
      key: 'kondisi',
      label: 'Kondisi',
      render: (cond: string) => (
        <Badge className={getConditionColor(cond)}>
          {cond}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_, asset: Asset) => (
        <div className="flex justify-end gap-1">
          <Tooltip content="Detail & Riwayat">
            <Button variant="ghost" size="sm" onClick={() => {
              if (onView) onView(asset);
              else setDetailModal({ isOpen: true, assetId: asset.id });
            }} aria-label={`Lihat Detail Aset ${asset.nama}`}>
              <FileText size={16} className="text-slate-400 hover:text-indigo-500" />
            </Button>
          </Tooltip>
          <Tooltip content="Cetak Label">
            <Button variant="ghost" size="sm" onClick={() => setPrintModal({ isOpen: true, assets: [asset] })} aria-label={`Cetak Label Aset ${asset.nama}`}>
              <Printer className="text-slate-400 hover:text-emerald-500" size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Edit">
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(asset)} aria-label={`Edit Data Aset ${asset.nama}`}>
              <Edit size={16} className="text-slate-400 hover:text-blue-500" />
            </Button>
          </Tooltip>
          <Tooltip content="Hapus">
            <Button variant="ghost" size="sm" className="hover:bg-red-50 group/del" onClick={() => {
               setDeleteModal({ isOpen: true, assetId: asset.id });
            }} aria-label={`Hapus Data Aset ${asset.nama}`}>
              <Trash2 size={16} className="text-slate-400 group-hover/del:text-red-500" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari aset, kode, atau brand..."
            className="pl-10 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari Aset"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant={showFilters ? 'primary' : 'outline'} className="flex-1 sm:flex-none" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none hover:bg-slate-50" onClick={() => {
             if (assets.length > 0) setPrintModal({ isOpen: true, assets });
          }}>
            <Printer className="h-4 w-4 mr-2" /> Cetak (Halaman Ini)
          </Button>
          <Button onClick={onAdd} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200 hover:translate-y-[-2px]">
            <Plus className="h-4 w-4 mr-2" /> Tambah Aset
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Kategori</label>
            <SearchableSelect 
               options={[{value: '', label: 'Semua Kategori'}, ...(categories?.data?.map((c:any) => ({value: c.id, label: c.nama})) || [])]} 
               value={filterCategory} 
               onValueChange={setFilterCategory} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Lokasi</label>
            <SearchableSelect 
               options={[{value: '', label: 'Semua Lokasi'}, ...(locations?.data?.map((l:any) => ({value: l.id, label: l.nama})) || [])]} 
               value={filterLocation} 
               onValueChange={setFilterLocation} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Kondisi</label>
            <SearchableSelect 
               options={[
                  {value: '', label: 'Semua Kondisi'},
                  {value: 'BAIK', label: 'Baik'},
                  {value: 'RUSAK', label: 'Rusak'},
                  {value: 'PERBAIKAN', label: 'Perbaikan'},
                  {value: 'HILANG', label: 'Hilang'}
               ]} 
               value={filterCondition} 
               onValueChange={setFilterCondition} 
            />
          </div>
        </div>
      )}

      {/* Table Content */}
      <Table 
        columns={columns} 
        data={assets} 
        loading={isLoading}
        emptyMessage="Belum ada data aset. Klik 'Tambah Aset' untuk mulai mengisi inventaris."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            Menampilkan {assets.length} dari {total} aset
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(prev => prev - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        title="Hapus Aset"
        description="Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan jika aset sudah memiliki riwayat peminjaman."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={() => {
           if (deleteModal.assetId) {
              deleteMutation.mutate(deleteModal.assetId);
           }
           setDeleteModal({ isOpen: false, assetId: null });
        }}
        onCancel={() => setDeleteModal({ isOpen: false, assetId: null })}
      />

      <AssetDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, assetId: null })}
        assetId={detailModal.assetId}
      />

      <AssetPrintLabelModal
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal({ isOpen: false, assets: [] })}
        assetsToPrint={printModal.assets}
      />
    </div>
  );
};

export default AssetList;
