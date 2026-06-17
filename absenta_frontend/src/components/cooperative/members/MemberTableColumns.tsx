import React from 'react';
import { Button } from '../../ui';
import { Eye, Power, PowerOff } from 'lucide-react';
import type { Member } from './types';
import { formatIndonesianDate } from '../../../utils/cooperative/coopDocUtils';

interface GetMemberColumnsParams {
  handleOpenDetail: (record: Member) => void;
  handleToggleStatus: (record: Member) => void;
  statusLoadingId: string | null;
  canUpdate?: boolean;
}

export const getMemberColumns = ({
  handleOpenDetail,
  handleToggleStatus,
  statusLoadingId,
  canUpdate = false,
}: GetMemberColumnsParams) => [
  { label: 'No Anggota', key: 'memberNo', sortable: true },
  { label: 'Nama', key: 'name', className: 'font-medium', sortable: true },
  { label: 'Email', key: 'email', sortable: true },
  { label: 'Telepon', key: 'phone', sortable: true },
  { 
    label: 'Status', 
    key: 'status',
    sortable: true,
    render: (v: string) => (
      <span
        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
          v === 'ACTIVE'
            ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm'
            : 'bg-rose-100 text-rose-800 border border-rose-200'
        }`}
      >
        {v === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF'}
      </span>
    )
  },
  { 
    label: 'Bergabung', 
    key: 'createdAt',
    sortable: true,
    render: (v: string) => formatIndonesianDate(v) 
  },
  {
    label: 'Aksi',
    key: 'id',
    render: (_: string | undefined, record: Member) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenDetail(record)}
          className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-[11px]"
        >
          <Eye size={12} className="mr-1.5" />
          Detail
        </Button>
        {canUpdate && (
          <Button
            variant={record.status === 'ACTIVE' ? 'outline' : 'primary'}
            size="sm"
            disabled={statusLoadingId === record.id}
            onClick={() => handleToggleStatus(record)}
            className={`h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all duration-300 ${
              record.status === 'ACTIVE'
                ? 'border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 bg-rose-50/20 hover:bg-rose-50/50'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {statusLoadingId === record.id ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              record.status === 'ACTIVE' ? (
                <>
                  <PowerOff size={11} className="mr-1.5" />
                  Nonaktifkan
                </>
              ) : (
                <>
                  <Power size={11} className="mr-1.5" />
                  Aktifkan
                </>
              )
            )}
          </Button>
        )}
      </div>
    )
  }
];
