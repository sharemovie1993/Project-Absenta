

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
        role="button"
        tabIndex={0}
        onClick={() => onView(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView(item);
          }
        }}
        aria-label={`Detail jenis kegiatan ${item.nama}`}
        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {item.nama}
            </h4>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md">
              {item.tipe}
            </span>
            {!item.aktif && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
                Nonaktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Urutan: {item.urutan ?? '-'}
          </p>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView(item);
          }}
          aria-label={`Detail ${item.nama}`}
          className="rounded-xl px-3.5 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          Detail
        </Button>
      </div>
    );
  }, [onView]);

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

