import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button } from '../../ui';
import { useAuthStore } from '../../../store/authStore';
import { useSocket } from '../../../hooks/useSocket';
import api from '../../../lib/axiosInstance';
import {
  Users,
  Vote,
  BookOpen,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Eye,
  Settings,
} from 'lucide-react';
import type {
  CoopMeetingItem,
  CoopVotingSessionItem,
  CoopAttendanceItem
} from '../../../pages/cooperative/RatMeetingPage';
import { RatTvQuorumStage, type LocalAttendee } from './RatTvQuorumStage';
import { RatMemberVotingPanel } from './RatMemberVotingPanel';
import { RatTvResolutionStage } from './RatTvResolutionStage';
import { RatRulesTabContent } from './RatRulesTabContent';

export interface RatMemberPortalProps {
  meeting: CoopMeetingItem;
  quorumStats?: {
    totalEligibleMembers: number;
    quorumTarget: number;
    actualAttendance: number;
    percentage: number;
    isQuorumReached: boolean;
    remainingNeeded?: number;
    statusText?: string;
  } | null;
  myAttendance?: {
    hasAttended: boolean;
    attendance: CoopAttendanceItem | null;
  } | null;
  onSelfCheckIn: () => void;
  isCheckingIn: boolean;
  onOpenCastVote: (session: CoopVotingSessionItem) => void;
  isMember: boolean;
  canManage?: boolean;
  onSwitchToOperatorView?: () => void;
}

export const RatMemberPortal: React.FC<RatMemberPortalProps> = React.memo(({
  meeting,
  quorumStats,
  myAttendance,
  onSelfCheckIn,
  isCheckingIn,
  onOpenCastVote,
  isMember,
  canManage = false,
  onSwitchToOperatorView,
}) => {
  const { user } = useAuthStore();
  const { subscribe, unsubscribe } = useSocket();

  // Active Stage: 'quorum' | 'voting' | 'tap' | 'rules'
  const [activeStage, setActiveStage] = useState<'quorum' | 'voting' | 'tap' | 'rules'>('quorum');

  // Active voting session detection
  const activeVotingSession = useMemo(() => {
    return (meeting.votingSessions || []).find((s) => s.status === 'ACTIVE') || null;
  }, [meeting.votingSessions]);

  // Query my vote status for current active session
  const myVoteQuery = useQuery({
    queryKey: ['coop_rat_my_vote', activeVotingSession?.id],
    queryFn: async () => {
      if (!activeVotingSession?.id) return { hasVoted: false };
      const res = await api.get(`/cooperative/rat/voting-sessions/${activeVotingSession.id}/my-vote`);
      return res.data as { success: boolean; hasVoted: boolean; ballot?: any };
    },
    enabled: Boolean(activeVotingSession?.id),
    staleTime: 5000,
  });

  const hasVoted = Boolean(myVoteQuery.data?.hasVoted);

  // Auto-switch stages upon live socket events
  useEffect(() => {
    if (!meeting.id) return;

    const handleRatUpdate = (payload: any) => {
      if (payload?.meetingId && payload.meetingId !== meeting.id) return;

      if (payload?.type === 'RAT_VOTING_OPENED' || payload?.type === 'RAT_BALLOT_CAST') {
        setActiveStage('voting');
      } else if (payload?.type === 'RAT_RESOLUTION_ADOPTED') {
        setActiveStage('tap');
      }
    };

    subscribe('coop_rat_update', handleRatUpdate);
    return () => {
      unsubscribe('coop_rat_update', handleRatUpdate);
    };
  }, [subscribe, unsubscribe, meeting.id]);

  // If an active voting session starts, default to voting stage if not already engaged
  useEffect(() => {
    if (activeVotingSession && !hasVoted) {
      setActiveStage('voting');
    }
  }, [activeVotingSession?.id, hasVoted]);

  // Helper calculations for RatTvQuorumStage
  const activeStats = quorumStats || (meeting as any).quorumStats;
  const totalEligible = activeStats?.totalEligibleMembers ?? meeting.totalEligibleMembers ?? 0;
  const quorumTarget = activeStats?.quorumTarget ?? meeting.quorumTarget ?? 0;
  const actualAttended = activeStats?.actualAttendance ?? meeting.actualAttendance ?? 0;
  const percentage = activeStats?.percentage ?? 0;
  const isQuorumReached = activeStats?.isQuorumReached ?? false;
  const remainingNeeded = activeStats?.remainingNeeded ?? Math.max(0, quorumTarget - actualAttended);
  const statusText = activeStats?.statusText ?? (isQuorumReached ? 'MEMENUHI SYARAT' : 'BELUM KUORUM');

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  const agendas = meeting.agendas || [];
  const activeAgenda = agendas.find((ag: any) => ag.status === 'IN_PROGRESS') || null;
  const activeIdx = activeAgenda ? agendas.findIndex((a: any) => a.id === activeAgenda.id) : -1;
  const nextAgenda = activeIdx >= 0 && activeIdx < agendas.length - 1 ? agendas[activeIdx + 1] : null;

  const attendeesList: LocalAttendee[] = useMemo(() => {
    if (!meeting.attendances) return [];
    return (meeting.attendances as any[]).map((att) => ({
      id: att.id || Math.random().toString(),
      name:
        att.Member?.name ||
        att.Member?.Siswa?.nama_siswa ||
        att.Member?.Guru?.nama_guru ||
        att.Member?.User?.full_name ||
        att.displayName ||
        'Peserta Sidang',
      memberNo: att.Member?.memberNo || 'ANG',
      type: att.Member?.type || 'ANGGOTA',
      time: att.checkInTime
        ? new Date(att.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
      method: att.method || 'ONLINE',
    }));
  }, [meeting.attendances]);

  const hasAttended = Boolean(myAttendance?.hasAttended);
  const isMeetingOpenForCheckIn = meeting.status === 'REGISTRATION_OPEN' || meeting.status === 'IN_SESSION';

  const displayName = user?.name || user?.full_name || 'Anggota Koperasi';
  const roleName = typeof user?.role === 'object' && user?.role !== null ? user.role.name : (typeof user?.role === 'string' ? user.role : 'Peserta RAT');

  const stageNavItems = [
    {
      id: 'quorum' as const,
      icon: <Users className="w-4 h-4" />,
      label: 'Kuorum & Hadir',
      labelFull: 'Panggung Kuorum & Hadir',
    },
    {
      id: 'voting' as const,
      icon: <Vote className="w-4 h-4" />,
      label: 'e-Voting',
      labelFull: 'e-Voting Live Board',
      badge: activeVotingSession ? (
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
      ) : null,
    },
    {
      id: 'tap' as const,
      icon: <BookOpen className="w-4 h-4" />,
      label: 'TAP RAT',
      labelFull: 'Naskah TAP RAT',
      badge: (meeting.resolutions?.length || 0) > 0 ? (
        <span className="text-[10px] px-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-mono font-bold">
          {meeting.resolutions.length}
        </span>
      ) : null,
    },
    {
      id: 'rules' as const,
      icon: <Scale className="w-4 h-4" />,
      label: 'Tata Tertib',
      labelFull: 'Tata Tertib & Ketentuan',
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* OPERATOR PREVIEW BAR — full width, always on top */}
      {canManage && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                Mode Pratinjau Tampilan Anggota (Peserta Sidang RAT)
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Antarmuka panggung siaran & surat suara digital seperti yang dilihat anggota di gadget mereka.
              </p>
            </div>
          </div>
          {onSwitchToOperatorView && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={onSwitchToOperatorView}
              className="gap-1.5 shrink-0"
            >
              <Settings className="w-4 h-4" />
              Konsol Pengurus
            </Button>
          )}
        </div>
      )}

      {/* ── MAIN RESPONSIVE LAYOUT ─────────────────────────────────────── */}
      {/*   Mobile / Tablet (<lg): vertical stack                          */}
      {/*   Desktop (lg+): 2-column sidebar + main stage                   */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">

        {/* ── LEFT SIDEBAR (desktop) / Top cards (mobile) ────────────── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">

          {/* Member identity card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                {displayName.charAt(0) || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {displayName}
                </h2>
                <Badge variant="primary" className="text-[10px] uppercase font-bold mt-0.5">
                  {roleName}
                </Badge>
              </div>
            </div>

            {hasAttended ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Presensi Sah Terverifikasi</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">1 Hak Suara Sah Aktif</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-200">
                    Presensi diperlukan untuk menggunakan hak suara.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={onSelfCheckIn}
                  isLoading={isCheckingIn}
                  disabled={!isMeetingOpenForCheckIn || isCheckingIn}
                  className="gap-2 w-full justify-center"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Konfirmasi Presensi Mandiri</span>
                </Button>
              </div>
            )}
          </div>

          {/* e-Voting live CTA (visible only when session active) */}
          {activeVotingSession && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-white shadow-xl border border-indigo-700/60">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/80 border border-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Bilik Suara Terbuka
                </span>
              </div>
              <p className="text-xs font-black text-white leading-snug mb-3">
                {activeVotingSession.title}
              </p>
              {hasVoted ? (
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Suara Sah Telah Masuk</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => setActiveStage('voting')}
                  disabled={!hasAttended}
                  className="gap-2 bg-white text-indigo-900 hover:bg-indigo-50 font-black w-full justify-center text-xs"
                >
                  <Vote className="w-4 h-4 text-indigo-700" />
                  <span>Buka Surat Suara</span>
                </Button>
              )}
            </div>
          )}

          {/* Stage navigation — vertical on desktop, hidden on mobile (shown as tabs below) */}
          <div className="hidden lg:flex flex-col gap-1 p-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
            {stageNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStage(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                  activeStage === item.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.labelFull}</span>
                {item.badge}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-3 text-[11px] text-slate-400 dark:text-slate-500 font-bold">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>Siaran Langsung Terhubung</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Stage area (main content) ───────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Mobile / Tablet: horizontal scroll navigation tabs */}
          <div className="flex lg:hidden items-center gap-1 overflow-x-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
            {stageNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeStage === item.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge}
              </button>
            ))}
          </div>

          {/* Stage viewport */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden min-h-[520px] lg:min-h-[640px] flex flex-col shadow-sm">
            {activeStage === 'quorum' && (
              <RatTvQuorumStage
                activeAgenda={activeAgenda}
                activeIdx={activeIdx}
                agendas={agendas}
                nextAgenda={nextAgenda}
                totalEligible={totalEligible}
                quorumTarget={quorumTarget}
                actualAttended={actualAttended}
                percentage={percentage}
                isQuorumReached={isQuorumReached}
                remainingNeeded={remainingNeeded}
                statusText={statusText}
                radius={radius}
                circumference={circumference}
                strokeDashoffset={strokeDashoffset}
                clampedPercentage={clampedPercentage}
                attendeesList={attendeesList}
              />
            )}

            {activeStage === 'voting' && (
              <RatMemberVotingPanel
                session={activeVotingSession as any || (meeting.votingSessions?.find(s => s.status === 'CLOSED' || s.status === 'TALLIED') as any || null)}
                hasVoted={hasVoted}
                hasAttended={hasAttended}
                totalPresentMembers={actualAttended}
                meetingId={meeting.id}
                onVoteSuccess={() => { /* invalidation handled inside panel */ }}
              />
            )}

            {activeStage === 'tap' && (
              <RatTvResolutionStage
                resolutions={meeting.resolutions || []}
                coopName={meeting.title}
                meetingLocation={(meeting as any).location || 'Aula Pertemuan Utama'}
                meetingDate={meeting.meetingDate}
              />
            )}

            {activeStage === 'rules' && (
              <div className="p-4 sm:p-6">
                <RatRulesTabContent meetingDescription={meeting.description} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

RatMemberPortal.displayName = 'RatMemberPortal';
