import React, { useMemo, useState } from 'react';
import { JadwalPiketGuru } from '@/api/piketGuru.api';
import { Table, type Column } from '@/components/ui/Table';
import { Button, Badge } from '@/components/ui';
import { Edit, Trash2 } from 'lucide-react';

interface PiketTableViewProps {
  schedules: JadwalPiketGuru[];
  currentGuruId?: string;
  isKurikulumAdmin: boolean;
  onEdit: (item: JadwalPiketGuru) => void;
  onDelete: (id: string) => void;
}

export const PiketTableView: React.FC<PiketTableViewProps> = React.memo(({
  schedules,
  currentGuruId,
  isKurikulumAdmin,
  onEdit,
  onDelete,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('hari');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const columns: Column[] = useMemo(() => [
    {
      key: 'hari',
      label: 'Hari',
      sortable: true,
      render: (value: unknown) => <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{String(value || '')}</span>
    },
    {
      key: 'Guru',
      label: 'Guru Bertugas',
      sortable: true,
      render: (_: unknown, row: JadwalPiketGuru) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.Guru?.nama_guru || '-'}</p>
          <p className="text-[10px] text-slate-400">NIP: {row.Guru?.nip || '-'}</p>
        </div>
      )
    },
    {
      key: 'waktu',
      label: 'Waktu & Slot Jam',
      render: (_: unknown, row: JadwalPiketGuru) => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">Slot Jam Ke-{row.slot_mulai || 1} s/d {row.slot_selesai || 10}</p>
          <p className="text-[10px] text-slate-400">({row.jam_mulai} - {row.jam_selesai} WIB)</p>
        </div>
      )
    },
    {
      key: 'pos_piket',
      label: 'Pos Piket',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="secondary" className="text-[10px] font-bold">
          {String(value || 'Piket Umum')}
        </Badge>
      )
    },
    {
      key: 'catatan',
      label: 'Catatan',
      render: (value: unknown) => <span className="text-xs italic text-slate-500">{String(value || '-')}</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: JadwalPiketGuru) => (
        isKurikulumAdmin ? (
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => onEdit(row)} className="w-7 h-7 text-indigo-600">
              <Edit size={13} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)} className="w-7 h-7 text-rose-600">
              <Trash2 size={13} />
            </Button>
          </div>
        ) : (
          <span className="text-[10px] text-emerald-600 font-bold">Terjadwal</span>
        )
      )
    }
  ], [isKurikulumAdmin, onEdit, onDelete]);

  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (schedules ?? []).slice(start, start + itemsPerPage);
  }, [schedules, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil((schedules ?? []).length / itemsPerPage));

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <Table
        columns={columns}
        data={paginatedSchedules}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(col, dir) => { setSortBy(col); setSortOrder(dir); }}
        emptyMessage="Belum ada jadwal piket guru yang tercatat."
        pagination={{
          currentPage,
          totalPages,
          totalItems: schedules.length,
          itemsPerPage,
          onPageChange: setCurrentPage,
          onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); }
        }}
      />
    </div>
  );
});

export default PiketTableView;
