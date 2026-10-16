import React, { useState, useEffect } from 'react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { formatDate } from '../../../utils/layoutUtils';
import { useSocket } from '../../../hooks/useSocket';
import api from '../../../lib/axiosInstance';
import {
  Users, ShieldCheck, CheckCircle2, Clock, Maximize2, Minimize2,
  X, Sparkles, TrendingUp, UserCheck, Radio, CreditCard,
  ScanLine, ListOrdered, ChevronRight, Gavel, BookOpen, Vote
} from 'lucide-react';
import type {
  CoopMeetingItem,
  CoopVotingSessionItem,
  CoopResolutionItem,
} from '../../../pages/cooperative/RatMeetingPage';
import { RatTvQuorumStage, type LocalAttendee } from './RatTvQuorumStage';
import { RatTvVotingStage } from './RatTvVotingStage';
import { RatTvResolutionStage } from './RatTvResolutionStage';
import { cleanAgendaTitle } from './ratAgendaClassifier';

export interface RatTvDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: CoopMeetingItem;
  quorumStats?: {
    totalEligibleMembers: number;
    quorumTarget: number;
    actualAttendance: number;
    percentage: number;
    isQuorumReached: boolean;
  } | null;
}

interface NewArrivalEvent {
  name: string;
  memberNo: string;
  type: string;
  time: string;
}

export const RatTvDisplayModal: React.FC<RatTvDisplayModalProps> = ({
  isOpen,
  onClose,
  meeting,
  quorumStats,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newArrival, setNewArrival] = useState<NewArrivalEvent | null>(null);

  // Active Stage: 'quorum' (Kuorum & Kehadiran) | 'voting' (e-Voting Live Board) | 'tap' (Naskah TAP Teleprompter)
  const [activeStage, setActiveStage] = useState<'quorum' | 'voting' | 'tap'>('quorum');

  // Helper to extract attendee name from various schema shapes
  const extractName = (att: any): string =>
    att.name || att.Member?.name || att.Member?.Siswa?.nama_siswa || att.Member?.Guru?.nama_guru || att.Member?.User?.full_name || att.displayName || 'Anggota Terverifikasi';

  const extractMemberNo = (att: any): string => att.memberNo || att.Member?.memberNo || 'ANG';

  const extractTime = (att: any): string => {
    if (att.time) return att.time;
    const raw = att.attendedAt || att.checkInTime || att.createdAt;
    if (!raw) return '--:--';
    try {
      return new Date(raw).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Live attendees list state
  const [attendeesList, setAttendeesList] = useState<LocalAttendee[]>(() => {
    if (!meeting.attendances) return [];
    return meeting.attendances.map((att: any) => ({
      id: att.id || Math.random().toString(),
      name: extractName(att),
      memberNo: extractMemberNo(att),
      type: att.Member?.type || 'ANGGOTA',
      time: extractTime(att),
      method: att.method || 'RFID',
    }));
  });

  // Live state for projector screen (strictly isolated to current meeting)
  const [tvAgendas, setTvAgendas] = useState<any[]>(meeting.agendas || []);
  const [liveQuorum, setLiveQuorum] = useState<any>(quorumStats || null);
  const [tvVotingSessions, setTvVotingSessions] = useState<CoopVotingSessionItem[]>(meeting.votingSessions || []);
  const [tvResolutions, setTvResolutions] = useState<CoopResolutionItem[]>(meeting.resolutions || []);

  // Sync when meeting changes
  useEffect(() => {
    setAttendeesList(
      (meeting.attendances || []).map((att: any) => ({
        id: att.id || Math.random().toString(),
        name: extractName(att),
        memberNo: extractMemberNo(att),
        type: att.Member?.type || 'ANGGOTA',
        time: extractTime(att),
        method: att.method || 'RFID',
      }))
    );
    setTvAgendas(meeting.agendas || []);
    setLiveQuorum(quorumStats || null);
    setTvVotingSessions(meeting.votingSessions || []);
    setTvResolutions(meeting.resolutions || []);
    setNewArrival(null);
  }, [meeting.id, meeting.attendances, meeting.agendas, meeting.votingSessions, meeting.resolutions, quorumStats]);

  const { subscribe, unsubscribe } = useSocket();

  // Clock ticker (1s)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to WebSocket for live attendee arrivals, agendas, voting sessions, and TAP resolutions
  useEffect(() => {
    if (!isOpen || !meeting.id) return;

    // Initial fetch of freshest meeting data when modal opens
    api.get(`/cooperative/rat/${meeting.id}`)
      .then((res) => {
        if (res.data?.data) {
          setTvAgendas(res.data.data.agendas || []);
          if (res.data.data.quorumStats) {
            setLiveQuorum(res.data.data.quorumStats);
          }
          if (res.data.data.votingSessions) {
            setTvVotingSessions(res.data.data.votingSessions);
            if (res.data.data.votingSessions.some((s: any) => s.status === 'ACTIVE')) {
              setActiveStage('voting');
            }
          }
          if (res.data.data.resolutions) {
            setTvResolutions(res.data.data.resolutions);
          }
        }
      })
      .catch(() => {});

    const handleRatUpdate = (payload: any) => {
      // 1. Live Attendee Check-In
      if (
        payload?.type === 'RAT_ATTENDANCE_RECORDED' &&
        payload?.meetingId === meeting.id
      ) {
        const member = payload?.member;
        const displayName =
          member?.displayName ||
          member?.Siswa?.nama_siswa ||
          member?.Guru?.nama_guru ||
          member?.User?.full_name ||
          'Peserta Sidang';

        const memberNo = member?.memberNo || 'ANG';
        const type = member?.type || 'ANGGOTA';
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const newAttendeeItem: LocalAttendee = {
          id: payload?.attendanceId || `temp-${Date.now()}`,
          name: displayName,
          memberNo,
          type,
          time: timeStr,
          method: payload?.method || 'RFID',
          isNew: true,
        };

        setAttendeesList((prev) => [newAttendeeItem, ...prev.filter((p) => p.memberNo !== memberNo)]);

        setNewArrival({
          name: displayName,
          memberNo,
          type,
          time: timeStr,
        });

        // Auto dismiss arrival toast after 7s
        setTimeout(() => {
          setNewArrival((prev) => (prev?.name === displayName ? null : prev));
        }, 7000);

        // Fetch pre-calculated live quorum metrics from backend
        api.get(`/cooperative/rat/${meeting.id}/quorum`)
          .then((res) => {
            if (res.data?.data) {
              setLiveQuorum(res.data.data);
            }
          })
          .catch(() => {});
      }

      // 2. Live Agenda Status Update
      if (
        payload?.type === 'RAT_AGENDA_UPDATED' &&
        payload?.meetingId === meeting.id
      ) {
        api.get(`/cooperative/rat/${meeting.id}`)
          .then((res) => {
            if (res.data?.data) {
              setTvAgendas(res.data.data.agendas || []);
              if (res.data.data.quorumStats) {
                setLiveQuorum(res.data.data.quorumStats);
              }
            }
          })
          .catch(() => {});
      }

      // 3. Live Voting Session Opened or Updated -> Auto-switch to Voting Stage
      if (
        (payload?.type === 'RAT_VOTING_OPENED' || payload?.type === 'RAT_VOTING_STATUS_CHANGED' || payload?.type === 'RAT_BALLOT_CAST') &&
        payload?.meetingId === meeting.id
      ) {
        api.get(`/cooperative/rat/${meeting.id}`)
          .then((res) => {
            if (res.data?.data?.votingSessions) {
              setTvVotingSessions(res.data.data.votingSessions);
              const hasActive = res.data.data.votingSessions.some((s: any) => s.status === 'ACTIVE');
              if (hasActive) {
                setActiveStage('voting');
              }
            }
          })
          .catch(() => {});
      }

      // 4. TAP Resolution Adopted / Created -> Auto-switch to TAP Teleprompter
      if (
        (payload?.type === 'RAT_RESOLUTION_ADOPTED' || payload?.type === 'RAT_RESOLUTION_CREATED') &&
        payload?.meetingId === meeting.id
      ) {
        api.get(`/cooperative/rat/${meeting.id}`)
          .then((res) => {
            if (res.data?.data?.resolutions) {
              setTvResolutions(res.data.data.resolutions);
              setActiveStage('tap');
            }
          })
          .catch(() => {});
      }
    };

    subscribe('coop_rat_update', handleRatUpdate);
    return () => {
      unsubscribe('coop_rat_update', handleRatUpdate);
    };
  }, [subscribe, unsubscribe, isOpen, meeting.id]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isOpen) return null;

  // Pre-calculated backend metrics (all calculation is delegated to backend)
  const activeStats = liveQuorum || quorumStats || (meeting as any).quorumStats;
  const totalEligible = activeStats?.totalEligibleMembers ?? meeting.totalEligibleMembers;
  const quorumTarget = activeStats?.quorumTarget ?? meeting.quorumTarget;
  const actualAttended = activeStats?.actualAttendance ?? meeting.actualAttendance;
  const percentage = activeStats?.percentage ?? 0;
  const isQuorumReached = activeStats?.isQuorumReached ?? false;
  const remainingNeeded = activeStats?.remainingNeeded ?? Math.max(0, quorumTarget - actualAttended);
  const statusHeadline = activeStats?.statusHeadline ?? (isQuorumReached ? 'Kuorum Sidang Sah Terpenuhi' : 'Menunggu Kuorum Kehadiran Peserta');
  const statusText = activeStats?.statusText ?? (isQuorumReached ? 'MEMENUHI SYARAT' : 'BELUM KUORUM');

  // SVG Gauge calculations
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Real statutory agendas strictly isolated to this specific meeting
  const agendas = tvAgendas || [];
  const activeAgenda = activeStats?.activeAgenda || agendas.find((ag: any) => ag.status === 'IN_PROGRESS') || null;
  const activeIdx = activeAgenda ? agendas.findIndex((a: any) => a.id === activeAgenda.id) : -1;
  const nextAgenda = activeIdx >= 0 && activeIdx < agendas.length - 1 ? agendas[activeIdx + 1] : null;

  // Active voting session
  const activeVotingSession = tvVotingSessions.find((s) => s.status === 'ACTIVE') || tvVotingSessions[0] || null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none transition-colors duration-300">
      {/* AMBIENT BACKGROUND GLOW EFFECTS */}
      <div className="absolute -top-24 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[40rem] h-[40rem] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BROADCAST HEADER BAR */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-md shadow-indigo-600/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                SIARAN LANGSUNG SIDANG
              </span>
            </div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight truncate">
              {cleanAgendaTitle(meeting.title)?.replace(new RegExp(`\\(Tahun Buku ${meeting.year}\\)`, 'gi'), '').trim()}
              {!meeting.title?.toLowerCase().includes('tahun buku') && (
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold ml-2">
                  (Tahun Buku {meeting.year})
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* STAGE SWITCHER CONTROLS */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveStage('quorum')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeStage === 'quorum'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kuorum & Hadir</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStage('voting')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeStage === 'voting'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>e-Voting</span>
            {activeVotingSession?.status === 'ACTIVE' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveStage('tap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeStage === 'tap'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Naskah TAP RAT</span>
            {tvResolutions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-mono font-bold">
                {tvResolutions.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Realtime Clock & Date */}
          <div className="text-right hidden sm:block border-r border-slate-200 dark:border-slate-800 pr-4">
            <div className="text-base font-black font-mono tracking-wider text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{currentTime.toLocaleTimeString('id-ID')}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {formatDate(currentTime.toISOString(), 'EEEE, dd MMMM yyyy')}
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <ThemeToggle />
          </div>

          {/* Fullscreen Button */}
          <Button
            type="button"
            size="toolbar"
            variant="toolbarOutline"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 mr-1 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-1 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="hidden md:inline">{isFullscreen ? 'Kecilkan' : 'Layar Penuh'}</span>
          </Button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Mode Layar TV"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* NEW ARRIVAL FLOATING TOAST ALERT */}
      {newArrival && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-indigo-500/30 border border-indigo-400/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">
                  Anggota Baru Saja Masuk Aula Sidang:
                </span>
                <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                  <span className="truncate">{newArrival.name}</span>
                  <Badge variant="outline" className="bg-white/20 text-white border-white/40 text-[10px]">
                    {newArrival.memberNo}
                  </Badge>
                  <span className="text-xs text-indigo-200 font-normal">({newArrival.type})</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                {newArrival.time}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STAGE SWITCHER PILLS */}
      <div className="flex lg:hidden items-center justify-around p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
        <button
          type="button"
          onClick={() => setActiveStage('quorum')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            activeStage === 'quorum' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kuorum</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStage('voting')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            activeStage === 'voting' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>e-Voting</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStage('tap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            activeStage === 'tap' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>TAP RAT</span>
        </button>
      </div>

      {/* DYNAMIC STAGE CONTAINER */}
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
          resolutions={tvResolutions}
          coopName={meeting.title}
          meetingLocation="Aula Pertemuan Utama"
          meetingDate={meeting.meetingDate}
        />
      )}

      {/* FOOTER TICKER */}
      <footer className="px-6 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Sistem Sidang RAT & Pemantauan Kuorum Real-Time Berstandar UU Perkoperasian No. 25/1992</span>
        </div>
        <div className="font-bold text-slate-700 dark:text-slate-300">
          Absenta Cooperative Enterprise System · Sidang Paripurna
        </div>
      </footer>
    </div>
  );
};
