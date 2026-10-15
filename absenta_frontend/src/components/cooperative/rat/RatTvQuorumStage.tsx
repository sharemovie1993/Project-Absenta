import React from 'react';
import Badge from '../../ui/Badge';
import {
  Users, ShieldCheck, CheckCircle2, Clock,
  Sparkles, TrendingUp, Radio, CreditCard,
  ScanLine, Gavel, BookOpen
} from 'lucide-react';

export interface LocalAttendee {
  id: string;
  name: string;
  memberNo: string;
  type: string;
  time: string;
  method: string;
  isNew?: boolean;
}

interface RatTvQuorumStageProps {
  activeAgenda: any;
  activeIdx: number;
  agendas: any[];
  nextAgenda: any;
  totalEligible: number;
  quorumTarget: number;
  actualAttended: number;
  percentage: number;
  isQuorumReached: boolean;
  remainingNeeded: number;
  statusText: string;
  radius: number;
  circumference: number;
  strokeDashoffset: number;
  clampedPercentage: number;
  attendeesList: LocalAttendee[];
}

export const RatTvQuorumStage: React.FC<RatTvQuorumStageProps> = React.memo(({
  activeAgenda,
  activeIdx,
  agendas,
  nextAgenda,
  totalEligible,
  quorumTarget,
  actualAttended,
  percentage,
  isQuorumReached,
  remainingNeeded,
  statusText,
  radius,
  circumference,
  strokeDashoffset,
  clampedPercentage,
  attendeesList,
}) => {
  return (
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
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="quorumGradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="quorumGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="13"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Animated Progress Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke={isQuorumReached ? 'url(#quorumGradEmerald)' : 'url(#quorumGradAmber)'}
                    strokeWidth="13"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center percentage & status pill with generous breathing room */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                    Capaian
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none">
                      {percentage}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 ml-0.5">
                      %
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-2 shadow-sm ${
                      isQuorumReached
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isQuorumReached ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
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
  );
});

RatTvQuorumStage.displayName = 'RatTvQuorumStage';
export default RatTvQuorumStage;
