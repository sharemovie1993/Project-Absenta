import React, { useMemo, useCallback } from 'react';
import { Phone } from 'lucide-react';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import {
  type StudentComplianceItem,
  formatLastLogin,
  getComplianceBadge
} from './complianceHelpers';

interface StudentComplianceListProps {
  data: StudentComplianceItem[];
  loading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string, order: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onNudge: (item: StudentComplianceItem) => void;
  toolbarLeft?: React.ReactNode;
  selectedRowKeys?: Set<string>;
  onSelectedRowKeysChange?: (keys: Set<string>) => void;
}

export const StudentComplianceList: React.FC<StudentComplianceListProps> = ({
  data,
  loading,
  totalItems,
  currentPage,
  itemsPerPage,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onLimitChange,
  onNudge,
  toolbarLeft,
  selectedRowKeys,
  onSelectedRowKeysChange
}) => {
  const isMobile = useIsMobile();

  const columns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Nama Siswa & Identitas',
      sortable: true,
      render: (_: unknown, row: StudentComplianceItem) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{row.nama}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">NISN: {row.nisn || '-'} • Kelas {row.kelas}</div>
        </div>
      )
    },
    {
      key: 'noWaOrtu',
      label: 'Kontak WhatsApp Ortu',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
          {String(value) && String(value).length >= 8 ? String(value) : <span className="text-rose-500 font-sans italic text-xs">Belum Ada</span>}
        </span>
      )
    },
    {
      key: 'rfidEnrolled',
      label: 'Kartu RFID Siswa',
      sortable: true,
      render: (value: unknown) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
          value 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
            : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        )}>
          {value ? 'Terdaftar' : 'Belum Ada'}
        </span>
      )
    },
    {
      key: 'hasUserAccount',
      label: 'Akun Portal',
      sortable: true,
      render: (value: unknown) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
          value 
            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60"
            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
        )}>
          {value ? 'Aktif' : 'Belum'}
        </span>
      )
    },
    {
      key: 'lastLogin',
      label: 'Login Terakhir',
      sortable: true,
      render: (value: unknown) => {
        const { text, isRecent } = formatLastLogin(value as string);
        if (text === 'Belum Pernah') {
          return <span className="text-slate-400 font-sans italic text-xs">Belum Pernah</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{text}</span>
          </div>
        );
      }
    },
    {
      key: 'complianceScore',
      label: 'Status Kepatuhan',
      sortable: true,
      render: (value: unknown) => {
        const score = Number(value || 0);
        const badge = getComplianceBadge(score);
        return (
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
            badge.bg, badge.color, badge.border
          )}>
            {badge.grade} ({score}%)
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_: unknown, row: StudentComplianceItem) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onNudge(row)}
            className="rounded-xl px-2.5 py-1 font-bold text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer flex items-center gap-1"
          >
            <Phone size={12} />
            WA Ortu
          </Button>
        </div>
      )
    }
  ], [onNudge]);

  const renderMobileStudentComplianceCard = useCallback((siswa: StudentComplianceItem) => {
    const badge = getComplianceBadge(siswa.complianceScore);
    const loginInfo = formatLastLogin(siswa.lastLogin);
    return (
      <div
        key={siswa.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full min-w-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{siswa.nama}</h4>
            <p className="text-[10px] text-slate-400 font-mono font-medium">NISN: {siswa.nisn || '-'}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.grade} ({siswa.complianceScore}%)
          </span>
        </div>

        {/* Responsive Grid Pilar 30 */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Kelas</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{siswa.kelas || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">WA Orang Tua</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{siswa.noWaOrtu || 'Belum Terdaftar'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Kartu RFID</span>
            <span className={`font-semibold ${siswa.rfidEnrolled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {siswa.rfidEnrolled ? 'Terpasang' : 'Belum Enrolled'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Login Terakhir</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{loginInfo.text}</span>
          </div>
          {siswa.issues && siswa.issues.length > 0 && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[10px] text-rose-500 block font-bold mb-1">Catatan Kepatuhan:</span>
              <ul className="text-[10px] text-rose-600 dark:text-rose-400 space-y-0.5 list-disc pl-4">
                {(siswa.issues ?? [])?.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            size="sm"
            variant="toolbarPrimary"
            onClick={() => onNudge(siswa)}
            className="text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs"
          >
            <Phone size={12} />
            WA Ortu
          </Button>
        </div>
      </div>
    );
  }, [onNudge]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 w-full">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-4 space-y-4 w-full max-w-full min-w-0">
        {toolbarLeft && (
          <div className="w-full">
            {toolbarLeft}
          </div>
        )}
        <MobileAcademicList
          title="Kelengkapan Data Siswa"
          data={data}
          loading={loading}
          totalItems={totalItems}
          emptyMessage="Tidak ada data siswa yang sesuai filter."
          pagination={{
            currentPage,
            totalPages: Math.max(1, Math.ceil(totalItems / itemsPerPage)),
            totalItems,
            itemsPerPage,
            onPageChange,
            onLimitChange
          }}
          renderCard={renderMobileStudentComplianceCard}
        />
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      data={data}
      compact={true}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="Tidak ada data siswa yang sesuai filter."
      toolbarLeft={toolbarLeft}
      selectedRowKeys={selectedRowKeys}
      onSelectedRowKeysChange={onSelectedRowKeysChange}
      pagination={{
        currentPage,
        totalPages: Math.max(1, Math.ceil(totalItems / itemsPerPage)),
        totalItems,
        itemsPerPage,
        onPageChange,
        onLimitChange
      }}
    />
  );
};
export default StudentComplianceList;
