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
  ScanLine, ListOrdered, ChevronRight, Gavel, BookOpen
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
  const activeIdx = activeAgenda ? agendas.findIndex((a: any) => a.id === activeAgenda.id) : -1;
  const nextAgenda = activeIdx >= 0 && activeIdx < agendas.length - 1 ? agendas[activeIdx + 1] : null;

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

      {/* MAIN BROADCAST CONTENT (STAGE SPOTLIGHT ON TOP, BALANCED GRID BELOW) */}
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-hidden z-10">
        {/* HERO STAGE SPOTLIGHT (CALM, BROADCAST-GRADE, ZERO-NOISE) */}
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm shadow-slate-200/40 dark:shadow-black/40 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Active Stage Topic */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                <Gavel className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    {activeAgenda ? 'Sedang Berlangsung di Panggung' : 'Tahap Registrasi & Persiapan'}
                  </span>
                  {activeAgenda && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Agenda {activeIdx + 1} dari {agendas.length}
                    </span>
                  )}
                  {(activeAgenda?.durationMinutes || activeAgenda?.durationMin) && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {activeAgenda.durationMinutes || activeAgenda.durationMin} Menit
                    </span>
                  )}
                  {activeAgenda?.presenter && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      {activeAgenda.presenter}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 truncate">
                  {activeAgenda
                    ? `${activeIdx + 1}. ${activeAgenda.title}`
                    : 'Pengesahan Kuorum & Verifikasi Kehadiran Peserta Sidang'}
                </h2>
              </div>
            </div>

            {/* Next Agenda Indicator & Clean Segmented Timeline */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 lg:pl-5 lg:border-l border-slate-100 dark:border-slate-800">
              {nextAgenda && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 max-w-xs truncate">
                  <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Berikutnya:</span>
                  <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                    {activeIdx + 2}. {nextAgenda.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    ({nextAgenda.durationMinutes || nextAgenda.durationMin || 30}m)
                  </span>
                </div>
              )}
              {agendas.length > 0 && (
                <div className="flex items-center gap-1.5 w-full sm:w-44 shrink-0" title={`Progres Sidang: ${activeIdx + 1} dari ${agendas.length}`}>
                  {agendas.map((ag: any, idx: number) => {
                    const isCompleted = ag.status === 'COMPLETED';
                    const isCurrent = ag.status === 'IN_PROGRESS';
                    return (
                      <div
                        key={ag.id || idx}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-indigo-600 ring-2 ring-indigo-400/60 dark:ring-indigo-500/80 animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                        title={`${idx + 1}. ${ag.title} (${isCompleted ? 'Selesai' : isCurrent ? 'Sedang Berlangsung' : 'Belum Mulai'})`}
                      />
                    );
                  })}
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 ml-1 shrink-0">
                    {activeIdx + 1}/{agendas.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM BALANCED GRID: QUORUM (7 COLS) & LIVE PRESENSI (5 COLS) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 overflow-hidden">
          {/* LEFT COLUMN: HERO QUORUM WITH INTEGRATED STATS (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-black/40 p-5 sm:p-6 overflow-hidden">
            {/* Top Badge & Legal Citations */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status Keabsahan Kuorum:
                </span>
                <Badge
                  variant={isQuorumReached ? 'success' : 'warning'}
                  className="text-xs px-3 py-1 font-black uppercase tracking-wider shadow-sm"
                >
                  {isQuorumReached ? 'KUORUM SAH TERCAPAI' : 'MENUNGGU KUORUM'}
                </Badge>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
                Landasan Hukum: UU No. 25/1992 Pasal 26
              </span>
            </div>

            {/* Split Gauge & Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto py-2">
              {/* CIRCULAR RADIAL METER (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
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
                      {actualAttended} dari {quorumTarget} Kuorum Diperlukan
                    </span>
                  </div>
                  <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isQuorumReached
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 to-indigo-600'
                      }`}
                      style={{ width: `${clampedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* INTEGRATED EXECUTIVE METRIC STRIP (4 METRICS IN A CLEAN ROW) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Total Berhak</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{totalEligible}</div>
                </div>
                <Users className="w-5 h-5 text-blue-500 opacity-80" />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Target Kuorum</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{quorumTarget}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-amber-500 opacity-80" />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Hadir Fisik</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{actualAttended}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-80" />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Status Sidang</div>
                  <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">
                    {remainingNeeded === 0 ? 'Sah Pleno' : `Kurang ${remainingNeeded}`}
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-indigo-500 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE STREAM PRESENSI PINTU MASUK (5 COLS, FULL HEIGHT) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 p-4 sm:p-5 shadow-md shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
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
