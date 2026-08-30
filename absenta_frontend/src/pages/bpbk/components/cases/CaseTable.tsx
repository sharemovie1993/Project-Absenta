import React, { useMemo } from 'react';
import { Eye, Edit2, RotateCcw, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { Table, Button, Badge } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { type KasusBK } from '@/api/bpbk.api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';

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

  const isMobile = useIsMobile();

  const renderMobileCard = (item: KasusBK) => {
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {new Date(item.tanggal_kasus).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {item.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 font-mono">
              Kelas: {item.Siswa?.Kelas?.nama_kelas || '-'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getStatusColor(item.status)}`}>
              {item.status}
            </Badge>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getPrioritasColor(item.prioritas)}`}>
              {item.prioritas}
            </Badge>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {item.judul}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`text-[8px] font-black uppercase px-1.5 border ${getKategoriColor(item.kategori)}`}>
              {item.kategori}
            </Badge>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${getVisibilityColor(item.visibility)}`}>
              {item.visibility}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(item)}
            className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-[11px] font-bold"
          >
            <Eye size={13} className="mr-1" /> Detail
          </Button>

          {showDeleted ? (
            canRestore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(item.id)}
                className="h-8 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold"
              >
                <RotateCcw size={13} className="mr-1" /> Pulihkan
              </Button>
            )
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                className="h-8 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold"
              >
                <Edit2 size={13} className="mr-1" /> Edit
              </Button>
              {item.status === 'SELESAI' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReopen(item.id)}
                  className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-[11px] font-bold"
                >
                  <RefreshCw size={13} className="mr-1" /> Buka
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCloseCase(item.id)}
                  className="h-8 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold"
                >
                  <CheckCircle size={13} className="mr-1" /> Selesai
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
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        <MobileAcademicList
          title="Daftar Kasus Siswa"
          data={data}
          loading={loading}
          totalItems={totalItems}
          emptyMessage="Tidak ada catatan kasus BK yang ditemukan."
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems,
            totalPages,
            onPageChange,
            onLimitChange
          }}
          renderCard={renderMobileCard}
        />
      </div>
    );
  }

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
