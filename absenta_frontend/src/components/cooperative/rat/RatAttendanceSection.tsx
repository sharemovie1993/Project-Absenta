import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { SectionCard, Input } from '../../ui';
import api from '../../../lib/axiosInstance';
import { COOP_QUERY_KEYS } from '../../../lib/coopQueryKeys';
import { RatAttendanceTerminal } from './RatAttendanceTerminal';
import type { CoopAttendanceItem } from '../../../pages/cooperative/RatMeetingPage';

export interface RosterMemberItem {
  id: string;
  memberNo: string;
  name: string;
  type: string;
  isAttended: boolean;
  attendedAt?: string | null;
  method?: string | null;
}

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATTENDED' | 'UNATTENDED'>('ALL');
  const [isSubmittingQuickCheckIn, setIsSubmittingQuickCheckIn] = useState<string | null>(null);

  // Fetch full cooperative active member roster with RAT attendance status
  const rosterQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratAttendanceRoster(meetingId),
    queryFn: async () => {
      if (!meetingId) return [];
      const res = await api.get(`/cooperative/rat/${meetingId}/attendance/roster`);
      return (res.data?.data || []) as RosterMemberItem[];
    },
    enabled: Boolean(meetingId),
    staleTime: 5_000,
  });

  // Combine roster from API or fallback to attendances if roster not yet loaded
  const fullRoster: RosterMemberItem[] = useMemo(() => {
    if (rosterQuery.data && rosterQuery.data.length > 0) {
      return rosterQuery.data;
    }
    // Fallback: build roster from attendances prop
    return (attendances || []).map((att) => ({
      id: att.memberId,
      memberNo: att.Member?.memberNo || '-',
      name: att.Member?.name || 'Anggota Koperasi',
      type: 'MEMBER',
      isAttended: true,
      attendedAt: att.checkInTime,
      method: att.method,
    }));
  }, [rosterQuery.data, attendances]);

  // Status counts for badge tabs
  const counts = useMemo(() => {
    let attended = 0;
    let unattended = 0;
    fullRoster.forEach((m) => {
      if (m.isAttended) attended++;
      else unattended++;
    });
    return {
      total: fullRoster.length,
      attended,
      unattended,
    };
  }, [fullRoster]);

  // Filtered list based on status and search
  const filteredMembers = useMemo(() => {
    const searchLower = attendanceSearch.toLowerCase().trim();
    return fullRoster.filter((m) => {
      // 1. Status Filter
      if (statusFilter === 'ATTENDED' && !m.isAttended) return false;
      if (statusFilter === 'UNATTENDED' && m.isAttended) return false;

      // 2. Search query (matches memberNo or name)
      if (searchLower) {
        const no = m.memberNo?.toLowerCase() || '';
        const name = m.name?.toLowerCase() || '';
        if (!no.includes(searchLower) && !name.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [fullRoster, statusFilter, attendanceSearch]);

  const handleQuickCheckIn = useCallback(async (member: RosterMemberItem) => {
    if (!meetingId || member.isAttended) return;
    setIsSubmittingQuickCheckIn(member.id);
    try {
      await api.post(`/cooperative/rat/${meetingId}/attendance`, {
        memberId: member.id,
        method: 'MANUAL',
      });
      toast.success(`Presensi ${member.memberNo} ${member.name} berhasil dicatat.`);
      rosterQuery.refetch();
      onAttendanceRecorded();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal mencatat presensi.';
      toast.error(msg);
    } finally {
      setIsSubmittingQuickCheckIn(null);
    }
  }, [meetingId, rosterQuery, onAttendanceRecorded]);

  const isRegistrationAllowed =
    meetingStatus === 'REGISTRATION_OPEN' ||
    meetingStatus === 'QUORUM_REACHED' ||
    meetingStatus === 'IN_SESSION';

  return (
    <div className="space-y-4">
      {canManage && meetingId && (
        <RatAttendanceTerminal
          meetingId={meetingId}
          meetingStatus={meetingStatus}
          quorumStats={quorumStats}
          onAttendanceRecorded={() => {
            rosterQuery.refetch();
            onAttendanceRecorded();
          }}
        />
      )}

      <SectionCard
        title="Daftar Hadir"
        actions={
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>
              Total: <strong className="text-slate-800 dark:text-slate-200">{counts.total}</strong> | Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{counts.attended}</strong> | Belum: <strong className="text-amber-600 dark:text-amber-400">{counts.unattended}</strong>
            </span>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Controls: Filter Status Pill Tabs & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            {/* Filter Status Buttons */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl space-x-1 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ATTENDED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'ATTENDED'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                Sudah Hadir ({counts.attended})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNATTENDED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === 'UNATTENDED'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                Belum Hadir ({counts.unattended})
              </button>
            </div>

            {/* Search Box */}
            <div className="w-full sm:w-72 sm:ml-auto">
              <Input
                aria-label="Cari nama atau nomor anggota"
                placeholder="Cari nomor atau nama anggota..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Multi-Column Flowing Name List with Adaptive Auto-Fill Columns */}
          {filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-semibold">
                {attendanceSearch
                  ? 'Tidak ada anggota yang cocok dengan pencarian.'
                  : statusFilter === 'ATTENDED'
                  ? 'Belum ada anggota yang hadir.'
                  : statusFilter === 'UNATTENDED'
                  ? 'Luar biasa! Seluruh anggota telah hadir.'
                  : 'Belum ada data anggota koperasi.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredMembers.map((member) => {
                const isAttended = member.isAttended;
                return (
                  <div
                    key={member.id}
                    className={`group relative flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                      isAttended
                        ? 'bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Format: 002 Dadan Hamdan */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isAttended
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {member.memberNo}
                      </span>
                      <span
                        title={member.name}
                        className={`text-xs truncate font-semibold ${
                          isAttended
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {member.name}
                      </span>
                    </div>

                    {/* Status Indicator or Quick Check-In Action */}
                    <div className="shrink-0 flex items-center">
                      {isAttended ? (
                        <div
                          title={`Hadir (${member.method || 'RESMI'})`}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        </div>
                      ) : canManage && isRegistrationAllowed ? (
                        <button
                          type="button"
                          onClick={() => handleQuickCheckIn(member)}
                          disabled={isSubmittingQuickCheckIn === member.id}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded transition-all shadow-xs"
                          title={`Presensikan ${member.name} manual`}
                        >
                          {isSubmittingQuickCheckIn === member.id ? '...' : 'Hadirkan'}
                        </button>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
});

RatAttendanceSection.displayName = 'RatAttendanceSection';
