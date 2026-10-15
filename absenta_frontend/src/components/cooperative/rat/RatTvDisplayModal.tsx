import React, { useState, useEffect } from 'react';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { formatDate } from '../../../utils/layoutUtils';
import { useSocket } from '../../../hooks/useSocket';
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

export const RatTvDisplayModal: React.FC<RatTvDisplayModalProps> = ({
  isOpen,
  onClose,
  meeting,
  quorumStats,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newArrival, setNewArrival] = useState<NewArrivalEvent | null>(null);

  const { subscribe, unsubscribe } = useSocket();

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to WebSocket for live attendee arrivals on TV screen
  useEffect(() => {
    if (!isOpen) return;

    const handleRatUpdate = (payload: any) => {
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

        setNewArrival({
          name: displayName,
          memberNo,
          type,
          time: new Date().toLocaleTimeString('id-ID'),
        });

        // Auto dismiss arrival toast after 6s
        setTimeout(() => {
          setNewArrival((prev) => (prev?.name === displayName ? null : prev));
        }, 6000);
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

  const totalEligible = quorumStats?.totalEligibleMembers ?? meeting.totalEligibleMembers;
  const quorumTarget = quorumStats?.quorumTarget ?? meeting.quorumTarget;
  const actualAttended = quorumStats?.actualAttendance ?? meeting.actualAttendance;
  const percentage = quorumStats?.percentage ?? (totalEligible > 0 ? Math.round((actualAttended / totalEligible) * 100) : 0);
  const isQuorumReached = quorumStats?.isQuorumReached ?? actualAttended >= quorumTarget;
  const remainingNeeded = Math.max(0, quorumTarget - actualAttended);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none transition-colors duration-300">
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                Sidang Paripurna Rapat Anggota Tahunan
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
              {meeting.title} ({meeting.year})
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Realtime Clock */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black font-mono tracking-wider text-slate-800 dark:text-slate-200">
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
            className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
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
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN AUDITORIUM DISPLAY AREA */}
      <main className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6 overflow-y-auto z-10">
        {/* LEGAL QUORUM STATUS BANNER */}
        <div
          className={`p-4 md:p-5 rounded-2xl border transition-all text-center flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl ${
            isQuorumReached
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50 text-emerald-950 dark:text-white shadow-emerald-500/10'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/50 text-amber-950 dark:text-white shadow-amber-500/10'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isQuorumReached ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {isQuorumReached ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status Legalitas Sidang
                </span>
                <Badge variant={isQuorumReached ? 'success' : 'warning'}>
                  {isQuorumReached ? 'MEMENUHI KUORUM RESMI' : 'BELUM KUORUM'}
                </Badge>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                {isQuorumReached
                  ? 'KUORUM SAH TERCAPAI — KEPUTUSAN SIDANG SAH SECARA HUKUM (UU NO. 25/1992)'
                  : `MENUNGGU MEMENUHI KUORUM SAH (DIBUTUHKAN MINIMAL ${remainingNeeded} ANGGOTA LAGI)`}
              </h2>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
              {percentage}%
            </span>
            <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              dari Total Anggota Berhak
            </span>
          </div>
        </div>

        {/* CENTERPIECE: HUGE PROGRESS METER */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Perkembangan Kehadiran Fisik & Kuorum:
            </span>
            <span className="text-sm md:text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
              {actualAttended} / {quorumTarget} Suara Diperlukan
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-6 md:h-8 rounded-full overflow-hidden p-1 border border-slate-200 dark:border-slate-700/60 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 shadow-md ${
                isQuorumReached
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-amber-500 to-indigo-500 shadow-amber-500/50'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>0% Mulai</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              Ambang Batas Kuorum (50% + 1) = {quorumTarget} Orang
            </span>
            <span>100% Sempurna ({totalEligible} Orang)</span>
          </div>
        </div>

        {/* 4 BIG METRIC DISPLAY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Anggota</span>
              <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
              {totalEligible}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Anggota aktif berhak suara</div>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Target Kuorum</span>
              <ShieldCheck className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {quorumTarget}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Syarat minimal pengambilan putusan</div>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Hadir Terverifikasi</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {actualAttended}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Peserta tercatat di pintu masuk</div>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Kekurangan Kuorum</span>
              <TrendingUp className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
              {remainingNeeded === 0 ? 'TERPENUHI' : `${remainingNeeded} Orang`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {remainingNeeded === 0 ? 'Putusan sah mengikat' : 'Menunggu kedatangan peserta'}
            </div>
          </div>
        </div>

        {/* LIVE CELEBRATORY ARRIVAL TOAST BANNER */}
        {newArrival && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/90 dark:to-purple-900/90 border border-indigo-300 dark:border-indigo-400/50 shadow-2xl flex items-center justify-between gap-4 animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                  Peserta Baru Saja Melakukan Presensi di Pintu Masuk:
                </span>
                <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{newArrival.name}</span>
                  <Badge variant="success">{newArrival.memberNo}</Badge>
                  <span className="text-xs font-normal text-slate-600 dark:text-indigo-200">({newArrival.type})</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300">{newArrival.time}</span>
          </div>
        )}
      </main>

      {/* FOOTER TICKER */}
      <footer className="px-6 py-2.5 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Sistem Pemantauan Kuorum Real-Time Berstandar Undang-Undang Perkoperasian</span>
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-300">
          Absenta Cooperative Enterprise System
        </div>
      </footer>
    </div>
  );
};
export default RatTvDisplayModal;
