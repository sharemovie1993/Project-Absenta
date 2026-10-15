import React, { useState, useEffect } from 'react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { formatDate } from '../../../utils/layoutUtils';
import { useSocket } from '../../../hooks/useSocket';
import api from '../../../lib/axiosInstance';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  TrendingUp,
  UserCheck,
  Radio,
  CreditCard,
  ScanLine,
  ListOrdered,
  ChevronRight,
  Gavel,
  BookOpen,
  Vote,
} from 'lucide-react';
import type { CoopMeetingItem } from '../../../pages/cooperative/RatMeetingPage';

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

interface LocalAttendee {
  id: string;
  name: string;
  memberNo: string;
  type: string;
  time: string;
  method: string;
  isNew?: boolean;
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

  // Helper to extract attendee name from various schema shapes
  const extractName = (att: any): string => {
    if (att.name) return att.name;
    if (att.Member?.name) return att.Member.name;
    if (att.Member?.Siswa?.nama_siswa) return att.Member.Siswa.nama_siswa;
    if (att.Member?.Guru?.nama_guru) return att.Member.Guru.nama_guru;
    if (att.Member?.User?.full_name) return att.Member.User.full_name;
    if (att.displayName) return att.displayName;
    return 'Anggota Terverifikasi';
  };

  const extractMemberNo = (att: any): string => {
    return att.memberNo || att.Member?.memberNo || 'ANG';
  };

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

  // Live agendas & quorum state for projector screen (strictly isolated to current meeting)
  const [tvAgendas, setTvAgendas] = useState<any[]>(meeting.agendas || []);
  const [liveQuorum, setLiveQuorum] = useState<any>(quorumStats || null);

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
    setNewArrival(null);
  }, [meeting.id, meeting.attendances, meeting.agendas, quorumStats]);

  const { subscribe, unsubscribe } = useSocket();

  // Clock ticker (1s)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to WebSocket for live attendee arrivals & live agenda updates on TV screen
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
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Real statutory agendas strictly isolated to this specific meeting
  const agendas = tvAgendas || [];

  const activeAgenda = activeStats?.activeAgenda || agendas.find((ag: any) => ag.status === 'IN_PROGRESS') || null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none transition-colors duration-300">
      {/* AMBIENT BACKGROUND GLOW EFFECTS */}
      <div className="absolute -top-24 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[40rem] h-[40rem] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BROADCAST HEADER BAR (NO TRUNCATION) */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-md shadow-indigo-600/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                Sidang Paripurna Rapat Anggota Tahunan (RAT)
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                SIARAN LANGSUNG AULA
              </span>
            </div>
            {/* FULL TITLE WITHOUT TRUNCATION */}
            <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
              {meeting.title} <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">(Tahun Buku {meeting.year})</span>
            </h1>
          </div>
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

      {/* MAIN BROADCAST CONTENT (BALANCED GRID, NO EMPTY VOID) */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 overflow-hidden z-10">
        {/* LEFT COLUMN: HERO QUORUM & 4 EXECUTIVE METRICS (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* HERO QUORUM RADAR CARD */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-black/50 p-5 sm:p-6 relative overflow-hidden">
            {/* Top Badge & Legal Citations */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status Keabsahan Kuorum:
                </span>
                <Badge
                  variant={isQuorumReached ? 'success' : 'warning'}
                  className="text-xs px-3 py-1 font-black uppercase tracking-wider shadow-sm"
                >
                  {isQuorumReached ? 'KUORUM SAH TERCAPAI' : 'MENUNGGU KUORUM'}
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                Landasan Hukum: UU No. 25/1992 Pasal 26
              </span>
            </div>

            {/* Split Gauge & Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* CIRCULAR RADIAL METER (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 148 148">
                    {/* Background Track */}
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="14"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Animated Progress Ring */}
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      className={
                        isQuorumReached
                          ? 'text-emerald-500 transition-all duration-1000'
                          : 'text-indigo-600 transition-all duration-1000'
                      }
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  {/* Center percentage & status pill */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none">
                      {percentage}%
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-2 ${
                        isQuorumReached
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* HEADLINE & STATUS DETAILS (7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-3.5 text-left">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    {isQuorumReached ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    )}
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                      {isQuorumReached
                        ? 'KEPUTUSAN SIDANG SAH MENGIKAT'
                        : `MENUNGGU ${remainingNeeded} ANGGOTA LAGI`}
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-10">
                    {isQuorumReached
                      ? 'Syarat kehadiran minimal 50% + 1 anggota telah terpenuhi. Seluruh ketetapan dan hasil pemungutan suara sah mengikat bagi seluruh anggota koperasi.'
                      : `Sesuai aturan AD/ART, sidang memerlukan kehadiran fisik minimal ${quorumTarget} anggota untuk sah mengambil keputusan rapat anggota tahunan.`}
                  </p>
                </div>

                {/* Progress Bar with Milestone Markers */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Kemajuan Kehadiran:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                      {actualAttended} dari {quorumTarget} Suara Diperlukan
                    </span>
                  </div>
                  <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-5 rounded-full overflow-hidden p-1 border border-slate-200 dark:border-slate-700 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isQuorumReached
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50'
                          : 'bg-gradient-to-r from-amber-500 to-indigo-600 shadow-md shadow-indigo-500/50'
                      }`}
                      style={{ width: `${clampedPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>0 Anggota</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      Target Sah (50% + 1) = {quorumTarget} Orang
                    </span>
                    <span>Total: {totalEligible}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 HIGH-IMPACT EXECUTIVE STAT METRICS (2X2 COMPACT GRID) */}
          <div className="grid grid-cols-2 gap-4">
            {/* CARD 1: TOTAL ANGGOTA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-black/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Anggota Berhak
                </span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {totalEligible}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Pemilik Hak Suara Sah</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">100% Terdaftar</span>
              </div>
            </div>

            {/* CARD 2: TARGET KUORUM */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-black/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Kuorum Sah
                </span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {quorumTarget}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Aturan 50% + 1 UU</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">Syarat Minimal</span>
              </div>
            </div>

            {/* CARD 3: HADIR TERVERIFIKASI */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-black/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Hadir Terverifikasi
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {actualAttended}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Presensi Pintu Masuk</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{percentage}% Tercapai</span>
              </div>
            </div>

            {/* CARD 4: STATUS SIDANG / KEKURANGAN */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-black/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status Sidang
                </span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono truncate">
                {remainingNeeded === 0 ? 'TERPENUHI' : `${remainingNeeded} Orang`}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{remainingNeeded === 0 ? 'Kuorum Pleno' : 'Menunggu Peserta'}</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {remainingNeeded === 0 ? 'SAH HUKUM' : 'REGISTRASI'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AGENDA SIDANG REAL-TIME & LIVE PRESENSI (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
          {/* MODUL 1: AGENDA SIDANG REAL-TIME (SOLVES THE EMPTY RELEVANCE VOID) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 p-4 sm:p-5 shadow-md shadow-slate-200/50 dark:shadow-black/50 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Tahapan Agenda Sidang RAT
                </h3>
              </div>
              <Badge variant={activeAgenda ? 'primary' : 'outline'} className="text-[10px] font-bold">
                {activeAgenda ? 'Sedang Berlangsung' : isQuorumReached ? 'Sidang Siap Dimulai' : 'Tahap Registrasi'}
              </Badge>
            </div>

            {/* LIVE ACTIVE AGENDA HIGHLIGHT BANNER */}
            {activeAgenda && (
              <div className="mt-3 p-3.5 rounded-2xl bg-indigo-600 dark:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-black tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Sedang Berlangsung di Panggung
                  </span>
                  <span className="text-[10px] font-bold text-indigo-100">
                    Acara Ke-{(agendas.findIndex((a: any) => a.id === activeAgenda.id) + 1)}
                  </span>
                </div>
                <h4 className="font-black text-sm sm:text-base leading-snug">
                  {activeAgenda.title}
                </h4>
                {(activeAgenda.durationMinutes || activeAgenda.durationMin) && (
                  <div className="text-[11px] text-indigo-200 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Alokasi Waktu: {activeAgenda.durationMinutes || activeAgenda.durationMin} menit</span>
                  </div>
                )}
              </div>
            )}

            {agendas.length === 0 ? (
              <div className="py-7 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2 mt-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Belum Ada Susunan Acara
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Susunan acara untuk sidang {meeting.title} ({meeting.year}) belum diatur atau belum dimuat preset oleh panitia.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-3 max-h-48 overflow-y-auto pr-1">
                {agendas.map((ag: any, idx: number) => (
                  <div
                    key={ag.id || idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                      ag.status === 'IN_PROGRESS'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-600/60 shadow-sm ring-1 ring-indigo-400'
                        : ag.status === 'COMPLETED'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700/50 text-slate-700 dark:text-slate-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          ag.status === 'COMPLETED'
                            ? 'bg-emerald-500 text-white'
                            : ag.status === 'IN_PROGRESS'
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {ag.status === 'COMPLETED' ? '✓' : idx + 1}
                      </span>
                      <span className="font-bold truncate text-slate-900 dark:text-white">
                        {ag.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 ${
                        ag.status === 'IN_PROGRESS'
                          ? 'bg-indigo-600 text-white'
                          : ag.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ag.status === 'IN_PROGRESS' ? 'AKTIF' : ag.status === 'COMPLETED' ? 'SELESAI' : 'NANTI'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MODUL 2: LIVE STREAM PRESENSI PINTU MASUK (BALANCED HEIGHT) */}
          <div className="flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 p-4 sm:p-5 shadow-md shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Presensi Masuk Aula
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                {attendeesList.length} Hadir Terverifikasi
              </Badge>
            </div>

            {/* Attendees Stream List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2.5 pr-1 text-left">
              {attendeesList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <ScanLine className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Menunggu Presensi di Pintu Masuk
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Peserta yang melakukan tap RFID atau presensi manual akan muncul otomatis di layar ini.
                    </p>
                  </div>
                </div>
              ) : (
                attendeesList.map((att, idx) => (
                  <div
                    key={att.id || `${att.memberNo}-${idx}`}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600/50 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {att.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {att.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{att.memberNo}</span>
                          <span>•</span>
                          <span className="uppercase">{att.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                        {att.time}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                        {att.method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Terminal status ticker */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                Terminal Kiosk Pintu Masuk Aktif
              </span>
              <span className="font-mono">Auto-Sync WebSocket</span>
            </div>
          </div>
        </div>
      </main>

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
