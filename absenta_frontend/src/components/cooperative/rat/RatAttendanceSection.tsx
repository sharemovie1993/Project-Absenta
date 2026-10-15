import React, { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { Table, type Column } from '../../ui/Table';
import { SectionCard, Badge, Input } from '../../ui';
import { formatDate } from '../../../utils/layoutUtils';
import { RatAttendanceTerminal } from './RatAttendanceTerminal';
import type { CoopAttendanceItem } from '../../../pages/cooperative/RatMeetingPage';

const ratFilterSchema = z.object({
  search: z.string().optional(),
});

export interface RatAttendanceSectionProps {
  meetingId: string;
  meetingStatus: string;
  attendances: CoopAttendanceItem[];
  quorumStats?: any;
  canManage: boolean;
  onAttendanceRecorded: () => void;
}

export const RatAttendanceSection: React.FC<RatAttendanceSectionProps> = React.memo(({
  meetingId,
  meetingStatus,
  attendances,
  quorumStats,
  canManage,
  onAttendanceRecorded,
}) => {
  const [attendanceSearch, setAttendanceSearch] = useState<string>('');
  const [attendancePage, setAttendancePage] = useState<number>(1);
  const [attendanceLimit, setAttendanceLimit] = useState<number>(10);
  const [attendanceSortKey, setAttendanceSortKey] = useState<string>('checkInTime');
  const [attendanceSortDirection, setAttendanceSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSearchChange = useCallback((val: string) => {
    const parsed = ratFilterSchema.safeParse({ search: val });
    setAttendanceSearch(parsed.success ? parsed.data.search || '' : '');
    setAttendancePage(1);
  }, []);

  const filteredAttendances = useMemo(() => {
    const searchLower = attendanceSearch.toLowerCase().trim();
    const list = (attendances || []).filter((att: any) => {
      const name =
        att.Member?.name ||
        att.Member?.User?.full_name ||
        att.Member?.Guru?.nama_guru ||
        att.Member?.Siswa?.nama_siswa ||
        '';
      const no = att.Member?.memberNo || '';
      return name.toLowerCase().includes(searchLower) || no.toLowerCase().includes(searchLower);
    });

    list.sort((a: any, b: any) => {
      const timeA = new Date(a.checkInTime || a.attendedAt || 0).getTime();
      const timeB = new Date(b.checkInTime || b.attendedAt || 0).getTime();
      let valA: string | number = timeA;
      let valB: string | number = timeB;
      if (attendanceSortKey === 'name') {
        valA = a.Member?.name || a.Member?.User?.full_name || '';
        valB = b.Member?.name || b.Member?.User?.full_name || '';
      } else if (attendanceSortKey === 'memberNo') {
        valA = a.Member?.memberNo || '';
        valB = b.Member?.memberNo || '';
      }
      if (valA < valB) return attendanceSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return attendanceSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [attendances, attendanceSearch, attendanceSortKey, attendanceSortDirection]);

  const paginatedAttendances = useMemo(() => {
    const start = (attendancePage - 1) * attendanceLimit;
    return (filteredAttendances || []).slice(start, start + attendanceLimit);
  }, [filteredAttendances, attendancePage, attendanceLimit]);

  const attendanceTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((filteredAttendances?.length || 0) / attendanceLimit));
  }, [filteredAttendances?.length, attendanceLimit]);

  const attendanceColumns: Column[] = useMemo(() => [
    {
      key: 'memberNo',
      label: 'No. Anggota',
      sortable: true,
      render: (_val: unknown, item: any) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.Member?.memberNo || '-'}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nama Peserta Rapat',
      sortable: true,
      render: (_val: unknown, item: any) => {
        const name =
          item.Member?.name ||
          item.Member?.User?.full_name ||
          item.Member?.Guru?.nama_guru ||
          item.Member?.Siswa?.nama_siswa ||
          'Anggota Koperasi';
        return (
          <div>
            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              {name}
            </p>
            {item.Member?.type && (
              <span className="text-[10px] text-slate-400 font-medium">
                {item.Member.type === 'STUDENT'
                  ? 'Siswa'
                  : item.Member.type === 'TEACHER'
                  ? 'Guru / Karyawan'
                  : item.Member.type}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'checkInTime',
      label: 'Waktu Presensi',
      sortable: true,
      render: (_val: unknown, item: any) => {
        const time = item.checkInTime || item.attendedAt;
        return (
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {time ? formatDate(time, 'dd/MM/yyyy HH:mm:ss') : '-'}
          </span>
        );
      },
    },
    {
      key: 'method',
      label: 'Metode',
      render: (_val: unknown, item: any) => {
        const rawMethod = item.method || 'MANUAL';
        const method = rawMethod === 'ONLINE_SELF' ? 'ONLINE' : rawMethod;
        return (
          <Badge
            variant={
              method === 'RFID'
                ? 'primary'
                : method === 'ONLINE'
                ? 'success'
                : 'default'
            }
          >
            {method}
          </Badge>
        );
      },
    },
    {
      key: 'isQuorumCounted',
      label: 'Status Kuorum',
      render: (_val: unknown, item: any) => (
        <Badge variant={item.isQuorumCounted !== false ? 'success' : 'warning'}>
          {item.isQuorumCounted !== false ? 'Sah Menghitung' : 'Tinjauan'}
        </Badge>
      ),
    },
  ], []);

  const handleAttendanceSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setAttendanceSortKey(key);
    setAttendanceSortDirection(direction);
  }, []);

  const handleAttendancePageChange = useCallback((page: number) => {
    setAttendancePage(page);
  }, []);

  const handleAttendanceLimitChange = useCallback((limit: number) => {
    setAttendanceLimit(limit);
    setAttendancePage(1);
  }, []);

  return (
    <div className="space-y-4">
      {canManage && meetingId && (
        <RatAttendanceTerminal
          meetingId={meetingId}
          meetingStatus={meetingStatus}
          quorumStats={quorumStats}
          onAttendanceRecorded={onAttendanceRecorded}
        />
      )}

      <SectionCard title="Daftar Hadir Resmi Peserta Sidang RAT">
        <Table
          columns={attendanceColumns}
          data={paginatedAttendances}
          toolbarLeft={
            <div className="flex items-center gap-2 w-full max-w-xs">
              <Input
                aria-label="Cari Peserta"
                placeholder="Cari nama atau no anggota..."
                value={attendanceSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          }
          pagination={{
            currentPage: attendancePage,
            totalPages: attendanceTotalPages,
            totalItems: filteredAttendances?.length || 0,
            itemsPerPage: attendanceLimit,
            onPageChange: handleAttendancePageChange,
            onLimitChange: handleAttendanceLimitChange,
          }}
          onSort={handleAttendanceSort}
          sortBy={attendanceSortKey}
          sortOrder={attendanceSortDirection}
          emptyMessage="Belum ada data presensi peserta pada sidang ini."
        />
      </SectionCard>
    </div>
  );
});

RatAttendanceSection.displayName = 'RatAttendanceSection';
