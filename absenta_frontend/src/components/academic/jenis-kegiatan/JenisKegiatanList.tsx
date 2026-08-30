

import React, { useMemo, useState, useCallback } from 'react';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Plus, 
  RefreshCw, 
  FileSpreadsheet,
  ListChecks
} from 'lucide-react';
import { 
  Button, 
  Table, 
  Badge, 
  Input 
} from '../../ui';
import type { JenisKegiatanMaster } from '../../../api/academic/jenisKegiatanMaster.api';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../shared/MobileAcademicList';
import { cn } from '@/lib/utils';

interface JenisKegiatanListProps {
  items: JenisKegiatanMaster[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onAdd: () => void;
  onEdit: (item: JenisKegiatanMaster) => void;
  onDelete: (id: string) => void;
  onView: (item: JenisKegiatanMaster) => void;
  onToggleActive?: (item: JenisKegiatanMaster) => void;
  canManage: boolean;
}

export const JenisKegiatanList: React.FC<JenisKegiatanListProps> = React.memo(({
  items,
  loading,
  search,
  onSearchChange,
  onRefresh,
  onExport,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onToggleActive,
  canManage
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const columns = useMemo(() => [
    { 
      label: 'Nama Kegiatan', 
      key: 'nama', 
      sortable: true, 
      render: (v: string) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100">{v}</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Kategori Aktivitas</span>
        </div>
      ) 
    },
    { 
      label: 'Tipe', 
      key: 'tipe', 
      render: (v: string) => {
        const variants: Record<string, 'default' | 'info' | 'success' | 'destructive' | 'outline' | 'secondary'> = {
          'KBM': 'default',
          'ESKUL': 'info',
          'PEMBIASAAN': 'success'
        };
        return <Badge variant={variants[v] || 'outline'}>{v}</Badge>;
      } 
    },
    { 
      label: 'Urutan', 
      key: 'urutan', 
      render: (v: number) => (
        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
          {v ?? '-'}
        </div>
      ) 
    },
    { 
      label: 'Status', 
      key: 'aktif', 
      render: (v: boolean, item: JenisKegiatanMaster) => {
        const isToggling = togglingId === item.id;
        return (
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Badge variant={v ? 'success' : 'secondary'} className="text-[10px] py-0.5 px-2.5 rounded-full font-bold">
              {v ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {canManage && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setTogglingId(item.id);
                    await onToggleActive?.(item);
                  } finally {
                    setTogglingId(null);
                  }
                }}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${v ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-750'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ transition: 'background-color 0.2s' }}
                aria-label={`Toggle status ${item.nama}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${v ? 'translate-x-4' : 'translate-x-0'}`}
                  style={{ transition: 'transform 0.2s' }}
                />
              </button>
            )}
          </div>
        );
      } 
    },
    { 
      label: 'Aksi', 
      key: 'id', 
      render: (_: unknown, item: JenisKegiatanMaster) => (
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onView(item)}
            className="w-8 h-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            aria-label="Lihat Detail Jenis Kegiatan"
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          {canManage && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onEdit(item)}
                className="w-8 h-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                aria-label="Edit Data Jenis Kegiatan"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onDelete(item.id)}
                className="w-8 h-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Hapus Data Jenis Kegiatan"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ) 
    }
  ], [canManage, onEdit, onView, onDelete, onToggleActive, togglingId]);

  const isMobile = useIsMobile();

  const renderJenisKegiatanMobileCard = useCallback((item: JenisKegiatanMaster) => {
    const isToggling = togglingId === item.id;
    const variants: Record<string, 'default' | 'info' | 'success' | 'destructive' | 'outline' | 'secondary'> = {
      'KBM': 'default',
      'ESKUL': 'info',
      'PEMBIASAAN': 'success'
    };

    return (
      <div
        key={item.id}
        onClick={() => onView(item)}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] space-y-3",
          item.aktif 
            ? "bg-gradient-to-br from-emerald-500/5 via-white to-emerald-500/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-300/80 dark:border-emerald-700/60 ring-1 ring-emerald-500/20"
            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        )}
      >
        {/* Top Accent Strip for Active */}
        {item.aktif && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        )}

        {/* Header: Icon + Name + Type Badge + Toggle Switch */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              item.aktif 
                ? "bg-emerald-500 text-white shadow-emerald-500/30" 
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            )}>
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {item.nama}
                </h3>
                <Badge variant={variants[item.tipe] || 'outline'} className="text-[9px] px-1.5 py-0 font-bold">
                  {item.tipe}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Kategori Aktivitas Sekolah
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          {canManage && (
            <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setTogglingId(item.id);
                    await onToggleActive?.(item);
                  } finally {
                    setTogglingId(null);
                  }
                }}
                disabled={isToggling}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  item.aktif ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300 dark:bg-slate-750",
                  isToggling && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Toggle status ${item.nama}`}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    item.aktif ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* Details: Urutan & Status */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Urutan Tampilan</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {item.urutan ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Status</span>
            <Badge variant={item.aktif ? 'success' : 'secondary'} className="text-[9px] py-0.5 px-2 rounded-full font-bold inline-block">
              {item.aktif ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(item)}
            className="text-xs text-slate-700 dark:text-slate-300 font-bold"
          >
            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> Detail
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(item)}
                className="text-xs text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-bold"
              >
                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(item.id)}
                className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }, [canManage, onView, onEdit, onDelete, onToggleActive, togglingId]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
        <div className="flex-1 relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <Input
            placeholder="Cari jenis kegiatan..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari Jenis Kegiatan"
            className="w-full pl-10 h-11 text-sm rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm group-hover:shadow-md"
          />
        </div>
      </div>

      {/* Table / Mobile Cards Area */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="p-4 space-y-4">
            <MobileAcademicList
              title="Daftar Jenis Kegiatan"
              data={items || []}
              loading={loading}
              totalItems={items?.length || 0}
              onRefresh={onRefresh}
              onAdd={onAdd}
              canManage={canManage}
              emptyMessage="Tidak ada data kategori kegiatan ditemukan."
              renderCard={renderJenisKegiatanMobileCard}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={items || []}
            loading={loading}
            emptyMessage="Tidak ada data kategori kegiatan ditemukan."
            compact={true}
            hoverable={true}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-2">
                 {canManage && (
                    <Button 
                      onClick={onAdd}
                      variant="toolbarPrimary"
                      size="toolbar"
                      className="shadow-sm hover:shadow-blue-500/20"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Tambah Jenis
                    </Button>
                 )}
                 
                 <Button
                   variant="toolbarOutline"
                   size="toolbar"
                   onClick={onExport}
                   className="hidden sm:flex"
                 >
                   <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                   Export Excel
                 </Button>
    
                 <Button
                   variant="toolbarOutline"
                   size="toolbarIcon"
                   onClick={onRefresh}
                   aria-label="Refresh Data"
                   disabled={loading}
                 >
                   <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                 </Button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
});

JenisKegiatanList.displayName = 'JenisKegiatanList';

