import React from 'react';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Button, 
  Table, 
  Badge, 
  Input 
} from '../../ui';
import type { JenisKegiatanMaster } from '../../../api/academic/jenisKegiatanMaster.api';

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
  canManage: boolean;
}

export const JenisKegiatanList: React.FC<JenisKegiatanListProps> = ({
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
  canManage
}) => {
  const columns = [
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
        const variants: Record<string, any> = {
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
      render: (v: boolean) => (
        <Badge variant={v ? 'success' : 'secondary'}>
          {v ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ) 
    },
    { 
      label: 'Aksi', 
      key: 'id', 
      render: (_: any, item: JenisKegiatanMaster) => (
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
  ];

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

      {/* Table Area */}
      <div className="flex-1 overflow-hidden">
        <Table
          columns={columns}
          data={items}
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
      </div>
    </div>
  );
};
