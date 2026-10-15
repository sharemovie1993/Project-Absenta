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
  Clock,
  Sparkles,
  Radio,
  Eye,
  Settings,
  AlertCircle,
  QrCode
} from 'lucide-react';
import type {
  CoopMeetingItem,
  CoopVotingSessionItem,
  CoopResolutionItem,
  CoopAttendanceItem
} from '../../../pages/cooperative/RatMeetingPage';
import { RatTvQuorumStage, type LocalAttendee } from './RatTvQuorumStage';
import { RatTvVotingStage } from './RatTvVotingStage';
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

  return (
    <div className="space-y-5 max-w-full min-w-0">
      {/* 1. OPERATOR PREVIEW BAR (IF LOGGED IN AS OPERATOR/ADMIN) */}
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
                Anda sedang melihat antarmuka panggung siaran & surat suara digital yang dilihat oleh anggota di aula/gadget.
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
              Kembali ke Konsol Pengurus
            </Button>
          )}
        </div>
      )}

      {/* 2. MEMBER STATUS & RECEPTION BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {user?.name || 'Anggota Koperasi'}
              </h2>
              <Badge variant="primary" className="text-[10px] uppercase font-bold">
                {user?.role || 'Peserta RAT'}
              </Badge>
              {hasAttended && (
                <Badge variant="success" className="text-[10px] gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Presensi Sah Terverifikasi
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hasAttended
                ? 'Presensi Anda telah sah memperkuat kuorum persidangan. Anda berhak menggunakan 1 suara sah pada e-Voting.'
                : 'Silakan konfirmasi kehadiran Anda untuk mencatatkan hak suara dan memperkuat kuorum sah RAT.'}
            </p>
          </div>
        </div>

        {/* Action Button: Presensi Mandiri */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasAttended ? (
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={onSelfCheckIn}
              isLoading={isCheckingIn}
              disabled={!isMeetingOpenForCheckIn || isCheckingIn}
              className="gap-2 shadow-md shadow-indigo-600/20 w-full sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Konfirmasi Presensi Mandiri</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>1 Hak Suara Sah Aktif</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. HERO CALL-TO-ACTION: LIVE E-VOTING BALLOT BANNER */}
      {activeVotingSession && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl shadow-indigo-900/20 border border-indigo-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-indigo-200 shrink-0 mt-0.5">
              <Vote className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/80 text-white border border-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Bilik Suara Terbuka
                </span>
                <span className="text-[11px] text-indigo-200 font-mono">
                  Kategori: {activeVotingSession.votingType || 'RESOLUTION'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight truncate">
                {activeVotingSession.title}
              </h3>
              <p className="text-xs text-indigo-200 mt-1">
                {hasVoted
                  ? '✅ Suara Anda telah sah diberikan dan tercatat dalam ledger kriptografis persidangan.'
                  : hasAttended
                  ? 'Silakan tentukan pilihan Anda sekarang. Setiap anggota berhak atas 1 suara sah.'
                  : '⚠️ Konfirmasi presensi kehadiran terlebih dahulu sebelum dapat menggunakan surat suara.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:self-center">
            {hasVoted ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Suara Sah Telah Masuk</span>
              </div>
            ) : (
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => onOpenCastVote(activeVotingSession)}
                disabled={!hasAttended}
                className="gap-2 bg-white text-indigo-900 hover:bg-indigo-50 font-black shadow-lg shadow-black/20 w-full sm:w-auto text-xs"
              >
                <Vote className="w-4 h-4 text-indigo-700" />
                <span>Buka Surat Suara Digital</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 4. DIGITAL STAGE NAVIGATION PILLS */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveStage('quorum')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeStage === 'quorum'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Panggung Kuorum & Hadir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStage('voting')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeStage === 'voting'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>e-Voting Live Board</span>
            {activeVotingSession && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStage('tap')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeStage === 'tap'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Naskah TAP RAT</span>
            {(meeting.resolutions?.length || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-mono font-bold">
                {meeting.resolutions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStage('rules')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeStage === 'rules'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Tata Tertib & Ketentuan</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-2 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Siaran Langsung Terhubung</span>
        </div>
      </div>

      {/* 5. STAGE DISPLAY VIEWPORT */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden min-h-[480px] flex flex-col shadow-sm">
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
          <RatTvVotingStage
            session={activeVotingSession as any}
            totalPresentMembers={actualAttended}
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
  );
});

RatMemberPortal.displayName = 'RatMemberPortal';
