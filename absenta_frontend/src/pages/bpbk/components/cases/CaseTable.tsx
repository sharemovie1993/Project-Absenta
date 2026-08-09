import React, { useMemo } from 'react';
import { Eye, Edit2, RotateCcw, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { Table, Button, Badge } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { type KasusBK } from '@/api/bpbk.api';

interface CaseTableProps {
  data: KasusBK[];
  loading: boolean;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  showDeleted: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSort: (key: string, order: 'asc' | 'desc') => void;
  onViewDetail: (item: KasusBK) => void;
  onEdit: (item: KasusBK) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onReopen: (id: string) => void;
  onCloseCase: (id: string) => void;
  canRestore: boolean;
  getKategoriColor: (kat: string) => string;
  getStatusColor: (status: string) => string;
  getPrioritasColor: (prio: string) => string;
  getVisibilityColor: (vis: string) => string;
}

export const CaseTable: React.FC<CaseTableProps> = React.memo(({
  data,
  loading,
  page,
  limit,
  totalItems,
  totalPages,
  sortBy,
  sortOrder,
  showDeleted,
  onPageChange,
  onLimitChange,
  onSort,
  onViewDetail,
  onEdit,
  onDelete,
  onRestore,
  onReopen,
  onCloseCase,
  canRestore,
  getKategoriColor,
  getStatusColor,
  getPrioritasColor,
  getVisibilityColor
}) => {
  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal_kasus',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Siswa',
      render: (_, item: KasusBK) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'judul',
      label: 'Kasus BK',
      render: (_, item: KasusBK) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs line-clamp-1 max-w-[200px]">{item.judul}</div>
          <Badge className={`text-[8px] font-black uppercase mt-1 px-1.5 border ${getKategoriColor(item.kategori)}`}>
            {item.kategori}
          </Badge>
        </div>
      )
    },
    {
      key: 'prioritas',
      label: 'Prioritas',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getPrioritasColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getStatusColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'visibility',
      label: 'Privasi',
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getVisibilityColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: KasusBK) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewDetail(item)}
            className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Lihat Rincian & Modul Terhubung"
          >
            <Eye size={13} />
          </Button>
          {showDeleted ? (
            canRestore && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRestore(item.id)}
                className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title="Pulihkan Kasus"
              >
                <RotateCcw size={13} />
              </Button>
            )
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(item)}
                className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                title="Edit Kasus"
              >
                <Edit2 size={13} />
              </Button>
              {item.status === 'SELESAI' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReopen(item.id)}
                  className="w-8 h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Buka Kembali Kasus"
                >
                  <RefreshCw size={13} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCloseCase(item.id)}
                  className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Tutup Kasus (Selesaikan)"
                >
                  <CheckCircle size={13} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                title="Hapus Kasus"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      )
    }
  ], [showDeleted, canRestore, onViewDetail, onRestore, onEdit, onReopen, onDelete, onCloseCase, getKategoriColor, getStatusColor, getPrioritasColor, getVisibilityColor]);

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      pagination={{
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages,
        onPageChange,
        onLimitChange
      }}
    />
  );
});
