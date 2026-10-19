import React, { useMemo, useCallback } from 'react';
import { Phone } from 'lucide-react';
import { Table, type Column } from '@/components/ui/Table';
import { Button, Badge } from '@/components/ui';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import {
  type TeacherComplianceItem,
  formatLastLogin,
  getComplianceBadge
} from './complianceHelpers';

interface TeacherComplianceListProps {
  data: TeacherComplianceItem[];
  loading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string, order: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onNudge: (item: TeacherComplianceItem) => void;
}

export const TeacherComplianceList: React.FC<TeacherComplianceListProps> = ({
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
  onNudge
}) => {
  const isMobile = useIsMobile();

  const columns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Guru & Identitas',
      sortable: true,
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.nama}</p>
          <p className="text-[10px] text-slate-400">NIP/NIK: {row.nip} • {row.mapel}</p>
        </div>
      )
    },
    {
      key: 'noWa',
      label: 'Kontak WhatsApp',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
          {String(value) && String(value).length >= 8 ? String(value) : <span className="text-rose-500 font-sans italic text-[11px]">Belum Ada</span>}
        </span>
      )
    },
    {
      key: 'rfidEnrolled',
      label: 'Kartu RFID Presensi',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum Ada'}
        </Badge>
      )
    },
    {
      key: 'hasUserAccount',
      label: 'Akun Portal',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'outline'} className="text-[9px] font-bold">
          {value ? 'Aktif' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      label: 'Login Terakhir',
      sortable: true,
      render: (value: unknown) => {
        const { text, isRecent } = formatLastLogin(value as string);
        if (text === 'Belum Pernah') {
          return <span className="text-amber-600 dark:text-amber-400 font-sans italic text-[11px]">Belum Pernah</span>;
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
      label: 'Kelengkapan Data',
      sortable: true,
      render: (value: unknown) => {
        const score = Number(value || 0);
        const badge = getComplianceBadge(score);
        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.grade} ({score}%)
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi Follow-Up',
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={() => onNudge(row)}
            className="text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
          >
            <Phone size={11} />
            Nudge WA
          </Button>
        </div>
      )
    }
  ], [onNudge]);

  const renderMobileTeacherComplianceCard = useCallback((guru: TeacherComplianceItem) => {
    const badge = getComplianceBadge(guru.complianceScore);
    const loginInfo = formatLastLogin(guru.lastLogin);
    return (
      <div
        key={guru.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full min-w-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{guru.nama}</h4>
            <p className="text-[10px] text-slate-400 font-mono font-medium">NIP: {guru.nip || '-'}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.grade} ({guru.complianceScore}%)
          </span>
        </div>

        {/* Responsive Grid Pilar 30 */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Jabatan / Mapel</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{guru.jabatan || guru.mapel || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">No. WhatsApp</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{guru.noWa || 'Belum Terdaftar'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Kartu RFID</span>
            <span className={`font-semibold ${guru.rfidEnrolled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {guru.rfidEnrolled ? 'Terpasang' : 'Belum Enrolled'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Login Terakhir</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{loginInfo.text}</span>
          </div>
          {guru.issues && guru.issues.length > 0 && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[10px] text-rose-500 block font-bold mb-1">Catatan Kepatuhan:</span>
              <ul className="text-[10px] text-rose-600 dark:text-rose-400 space-y-0.5 list-disc pl-4">
                {(guru.issues ?? [])?.map((issue, idx) => (
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
            onClick={() => onNudge(guru)}
            className="text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs"
          >
            <Phone size={12} />
            Nudge WA
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
        <MobileAcademicList
          title="Kelengkapan Data Guru"
          data={data}
          loading={loading}
          totalItems={totalItems}
          emptyMessage="Tidak ada data guru yang sesuai filter."
          pagination={{
            currentPage,
            totalPages: Math.max(1, Math.ceil(totalItems / itemsPerPage)),
            totalItems,
            itemsPerPage,
            onPageChange,
            onLimitChange
          }}
          renderCard={renderMobileTeacherComplianceCard}
        />
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      data={data}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="Tidak ada data guru yang sesuai filter."
      toolbarLeft={
        <div className="flex items-center gap-2 w-full max-w-full min-w-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Daftar Guru ({totalItems})
          </span>
        </div>
      }
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
export default TeacherComplianceList;
