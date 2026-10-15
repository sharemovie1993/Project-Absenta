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
    const list = (attendances || []).filter((att) => {
      const name = att.Member?.name?.toLowerCase() || '';
      const no = att.Member?.memberNo?.toLowerCase() || '';
      return name.includes(searchLower) || no.includes(searchLower);
    });

    list.sort((a, b) => {
      let valA: string | number = a.checkInTime;
      let valB: string | number = b.checkInTime;
      if (attendanceSortKey === 'name') {
        valA = a.Member?.name || '';
        valB = b.Member?.name || '';
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

  const attendanceColumns: Column<CoopAttendanceItem>[] = useMemo(() => [
    {
      header: 'No. Anggota',
      accessor: (item) => item.Member?.memberNo || '-',
      sortable: true,
      sortKey: 'memberNo',
    },
    {
      header: 'Nama Peserta Rapat',
      accessor: (item) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {item.Member?.name || 'Anggota Koperasi'}
          </p>
        </div>
      ),
      sortable: true,
      sortKey: 'name',
    },
    {
      header: 'Waktu Presensi',
      accessor: (item) => formatDate(item.checkInTime, 'dd/MM/yyyy HH:mm'),
      sortable: true,
      sortKey: 'checkInTime',
    },
    {
      header: 'Metode',
      accessor: (item) => (
        <Badge variant={item.method === 'RFID' ? 'primary' : item.method === 'ONLINE' ? 'success' : 'default'}>
          {item.method}
        </Badge>
      ),
    },
    {
      header: 'Status Kuorum',
      accessor: (item) => (
        <Badge variant={item.isQuorumCounted ? 'success' : 'warning'}>
          {item.isQuorumCounted ? 'Sah Menghitung' : 'Tinjauan'}
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
            onPageChange: handleAttendancePageChange,
            onLimitChange: handleAttendanceLimitChange,
          }}
          onSort={handleAttendanceSort}
          sortKey={attendanceSortKey}
          sortDirection={attendanceSortDirection}
          emptyMessage="Tidak ada data presensi yang ditemukan."
        />
      </SectionCard>
    </div>
  );
});

RatAttendanceSection.displayName = 'RatAttendanceSection';
