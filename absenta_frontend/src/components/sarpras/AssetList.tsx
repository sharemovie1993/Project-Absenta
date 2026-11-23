import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Tag,
  FileText,
  Printer,
  RotateCcw
} from 'lucide-react';
import { Table } from '../ui/Table';
import type { Column } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Label } from '../ui/Label';
import { sarprasApi } from '../../api/sarpras.api';
import type { Asset } from '../../api/sarpras.api';
import { Loader, ConfirmDialog, DebouncedSearchInput } from '../ui';
import Tooltip from '../ui/Tooltip';
import { AssetDetailModal } from './AssetDetailModal';
import { cn } from '../../lib/utils';
import { AssetPrintLabelModal } from './AssetPrintLabelModal';
import { SearchableSelect } from '../ui/SearchableSelect';

import { useAuthStore } from '../../store/authStore';
import { isModuleUnlocked } from '../../utils/subscriptionUtils';
import { useSarprasKategoriOptions } from '../../hooks/useSarprasKategoriOptions';
import { useRuanganOptions } from '../../hooks/useRuanganOptions';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../academic/shared/MobileAcademicList';

interface AssetListProps {
  onEdit?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
  onAdd?: () => void;
  refreshTrigger?: number;
}

const AssetList: React.FC<AssetListProps> = React.memo(({ onEdit, onView, onAdd, refreshTrigger }) => {
  const { subscription } = useAuthStore();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Gating Logic
  const isLocked = !isModuleUnlocked(subscription, 'SARPRAS');
  const isEnabled = subscription !== undefined;
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, assetId: string | null}>({ isOpen: false, assetId: null });
  const [detailModal, setDetailModal] = useState<{isOpen: boolean, assetId: string | null}>({ isOpen: false, assetId: null });
  const [printModal, setPrintModal] = useState<{isOpen: boolean, assets: Asset[]}>({ isOpen: false, assets: [] });

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const { options: categoryOptions } = useSarprasKategoriOptions();
  const { options: locationOptions } = useRuanganOptions();

  // Reset page saat debouncedSearch berubah
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['sarpras-assets', page, limit, debouncedSearch, filterCategory, filterLocation, filterCondition, refreshTrigger],
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

  const assets: Asset[] = useMemo(() => data?.data?.list || [], [data]);
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sarprasApi.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
    }
  });

  const getConditionColor = useCallback((cond: string) => {
    switch (cond) {
      case 'BAIK': return 'bg-green-100 text-green-700';
      case 'RUSAK': return 'bg-red-100 text-red-700';
      case 'PERBAIKAN': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }, []);

  const columns: Column[] = useMemo(() => [
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
  ], [onView, onEdit, getConditionColor]);

  const renderMobileCard = useCallback((asset: Asset) => {
    const handleDetail = () => {
      if (onView) onView(asset);
      else setDetailModal({ isOpen: true, assetId: asset.id });
    };

    return (
      <div
        key={asset.id}
        role="button"
        tabIndex={0}
        onClick={handleDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDetail();
          }
        }}
        aria-label={`Detail aset ${asset.nama}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {asset.nama}
            </h4>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", getConditionColor(asset.kondisi))}>
              {asset.kondisi}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            {asset.kode || 'NO_CODE'} • {asset.Category?.nama || 'Uncategorized'} • {asset.Location?.nama || 'Gudang'}
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleDetail();
          }}
          aria-label={`Detail ${asset.nama}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, [getConditionColor, onView]);

  const categoriesOptions = useMemo(() => {
    return [{ value: '', label: 'Semua Kategori' }, ...(categoryOptions || [])];
  }, [categoryOptions]);

  const locationsOptions = useMemo(() => {
    return [{ value: '', label: 'Semua Lokasi' }, ...(locationOptions || [])];
  }, [locationOptions]);

  const conditionOptions = useMemo(() => [
    { value: '', label: 'Semua Kondisi' },
    { value: 'BAIK', label: 'Baik' },
    { value: 'RUSAK', label: 'Rusak' },
    { value: 'PERBAIKAN', label: 'Perbaikan' },
    { value: 'HILANG', label: 'Hilang' }
  ], []);

  const handleConfirmDelete = useCallback(() => {
     if (deleteModal.assetId) {
        deleteMutation.mutate(deleteModal.assetId);
     }
     setDeleteModal({ isOpen: false, assetId: null });
  }, [deleteModal.assetId, deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModal({ isOpen: false, assetId: null });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModal({ isOpen: false, assetId: null });
  }, []);

  const handleClosePrint = useCallback(() => {
    setPrintModal({ isOpen: false, assets: [] });
  }, []);

  const handlePrintAll = useCallback(() => {
     if (assets?.length > 0) setPrintModal({ isOpen: true, assets });
  }, [assets]);

  const hasActiveFilters = Boolean(debouncedSearch || filterCategory || filterLocation || filterCondition);

  const handleResetFilters = useCallback(() => {
    setDebouncedSearch('');
    setFilterCategory('');
    setFilterLocation('');
    setFilterCondition('');
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Standar Filter & Action Toolbar (Consistent with Data Siswa & Academic Toolbar) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Row 1: Search & Inline Filter Selects */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="flex-1 min-w-[240px]">
            <DebouncedSearchInput
              placeholder="Cari aset, kode, atau brand..."
              className="w-full"
              inputClassName="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm"
              value={debouncedSearch}
              onChange={setDebouncedSearch}
              aria-label="Cari Aset"
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
            <div className="w-full sm:w-44">
              <SearchableSelect 
                id="filterCategory"
                options={categoriesOptions} 
                value={filterCategory} 
                onValueChange={(val) => { setFilterCategory(val); setPage(1); }}
                placeholder="Semua Kategori"
                searchPlaceholder="Cari Kategori..."
                className="w-full"
                triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
              />
            </div>
            <div className="w-full sm:w-44">
              <SearchableSelect 
                id="filterLocation"
                options={locationsOptions} 
                value={filterLocation} 
                onValueChange={(val) => { setFilterLocation(val); setPage(1); }}
                placeholder="Semua Lokasi"
                searchPlaceholder="Cari Lokasi..."
                className="w-full"
                triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
              />
            </div>
            <div className="w-full sm:w-40">
              <SearchableSelect 
                id="filterCondition"
                options={conditionOptions} 
                value={filterCondition} 
                onValueChange={(val) => { setFilterCondition(val); setPage(1); }}
                placeholder="Semua Kondisi"
                searchPlaceholder="Cari Kondisi..."
                className="w-full"
                triggerClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Secondary / Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset Filter
              </Button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total <strong className="text-slate-800 dark:text-slate-200">{total}</strong> item aset
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 sm:flex-none h-8.5 text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800" 
              onClick={handlePrintAll}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Cetak (Halaman Ini)
            </Button>
            {onAdd && (
              <Button 
                onClick={onAdd} 
                size="sm"
                className="flex-1 sm:flex-none h-8.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-xs shadow-indigo-200 dark:shadow-none transition-all duration-200 hover:translate-y-[-1px]"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Aset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {isMobile ? (
          <div className="p-4">
            <MobileAcademicList
              title="Daftar Inventaris Aset"
              data={assets}
              loading={isLoading}
              totalItems={total}
              emptyMessage="Belum ada data aset. Klik 'Tambah Aset' untuk mulai mengisi inventaris."
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
                onPageChange: (newPage) => setPage(newPage),
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }
              }}
              renderCard={renderMobileCard}
            />
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={assets} 
            loading={isLoading}
            emptyMessage="Belum ada data aset. Klik 'Tambah Aset' untuk mulai mengisi inventaris."
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: total,
              itemsPerPage: limit,
              onPageChange: (newPage) => setPage(newPage),
              onLimitChange: (newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }
            }}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        title="Hapus Aset"
        description="Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan jika aset sudah memiliki riwayat peminjaman."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <AssetDetailModal
        isOpen={detailModal.isOpen}
        onClose={handleCloseDetail}
        assetId={detailModal.assetId}
      />

      <AssetPrintLabelModal
        isOpen={printModal.isOpen}
        onClose={handleClosePrint}
        assetsToPrint={printModal.assets}
      />
    </div>
  );
});

export default AssetList;
