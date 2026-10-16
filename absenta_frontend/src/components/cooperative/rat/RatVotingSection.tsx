import React from 'react';
import { Badge, Button } from '../../ui';
import {
  Vote,
  Plus,
  Tv,
  CheckCircle2,
  StopCircle,
  CheckCheck,
  Radio,
  FileCheck,
  TrendingUp,
  UserCheck,
  Award,
  Trash2,
} from 'lucide-react';
import type { CoopVotingSessionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatVotingSectionProps {
  votingSessions: CoopVotingSessionItem[];
  canManage: boolean;
  canVote: boolean;
  totalPresentMembers?: number;
  totalEligibleMembers?: number;
  onOpenCreateSession: () => void;
  onSelectVoteSession: (session: CoopVotingSessionItem) => void;
  onUpdateSessionStatus: (sessionId: string, status: 'ACTIVE' | 'CLOSED' | 'TALLIED') => void;
  onDeleteSession?: (session: CoopVotingSessionItem) => void;
  onOpenTvDisplay?: () => void;
  isUpdatingStatus: boolean;
}

export const RatVotingSection: React.FC<RatVotingSectionProps> = React.memo(({
  votingSessions,
  canManage,
  canVote,
  totalPresentMembers = 0,
  totalEligibleMembers = 0,
  onOpenCreateSession,
  onSelectVoteSession,
  onUpdateSessionStatus,
  onDeleteSession,
  onOpenTvDisplay,
  isUpdatingStatus
}) => {
  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & CONTROL TOOLBAR ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-100/80 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Vote className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
              Pusat Kendali e-Voting Sidang (One Member One Vote)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Monitor perolehan suara secara langsung, pantau tingkat partisipasi peserta hadir, dan sahkan hasil resmi pemungutan suara ke dalam Berita Acara TAP RAT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
          {onOpenTvDisplay && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarOutline"
              onClick={onOpenTvDisplay}
              className="gap-1.5 text-xs font-semibold"
            >
              <Tv className="w-4 h-4 text-indigo-500" />
              <span>Layar TV / Proyektor</span>
            </Button>
          )}

          {canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={onOpenCreateSession}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Sesi Voting Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. SESSION LIST / COMMAND CARDS ──────────────────────────────── */}
      {(votingSessions || []).length > 0 ? (
        <div className="space-y-6">
          {(votingSessions || []).map((session) => {
            const totalVotes = session.ballotsCount || (session.options || []).reduce((acc, curr) => acc + (curr.voteCount || 0), 0);
            const turnoutPct = totalPresentMembers > 0
              ? Math.min(100, Math.round((totalVotes / totalPresentMembers) * 100))
              : 0;

            // Find highest vote option
            const maxVoteCount = Math.max(0, ...(session.options || []).map(o => o.voteCount || 0));
            const leadingOption = totalVotes > 0 ? (session.options || []).find(o => o.voteCount === maxVoteCount) : null;

            return (
              <div
                key={session.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* ── Card Header: Session Title & Presiding Actions ──────── */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {session.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          <span>SEDANG BERLANGSUNG (LIVE POLLING)</span>
                        </span>
                      )}
                      {session.status === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          <StopCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>PEMUNGUTAN DITUTUP (MENUNGGU PENGESAHAN)</span>
                        </span>
                      )}
                      {session.status === 'TALLIED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>HASIL RESMI DISAHKAN (FINAL)</span>
                        </span>
                      )}
                      {session.status === 'DRAFT' && (
                        <Badge variant="default">DRAF</Badge>
                      )}
                    </div>

                    <h4 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                      {session.title}
                    </h4>

                    {session.description && (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Pimpinan Sidang Controls */}
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                      {session.status === 'ACTIVE' && (
                        <Button
                          type="button"
                          size="toolbar"
                          variant="toolbarOutline"
                          onClick={() => onUpdateSessionStatus(session.id, 'CLOSED')}
                          disabled={isUpdatingStatus}
                          className="gap-1.5 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold"
                        >
                          <StopCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>Tutup Pemungutan</span>
                        </Button>
                      )}

                      {(session.status === 'CLOSED' || session.status === 'ACTIVE') && (
                        <Button
                          type="button"
                          size="toolbar"
                          variant="toolbarPrimary"
                          onClick={() => onUpdateSessionStatus(session.id, 'TALLIED')}
                          disabled={isUpdatingStatus}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-bold"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Hitung & Sahkan Hasil Resmi</span>
                        </Button>
                      )}

                      {session.status === 'TALLIED' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Tercatat Permanen di TAP RAT</span>
                        </div>
                      )}

                      {/* Tombol Hapus Sesi Voting (Hanya jika belum disahkan permanen ke TAP RAT) */}
                      {session.status !== 'TALLIED' && onDeleteSession && (
                        <Button
                          type="button"
                          size="toolbar"
                          variant="toolbarOutline"
                          onClick={() => onDeleteSession(session)}
                          disabled={isUpdatingStatus}
                          title="Hapus sesi pemungutan suara ini"
                          className="gap-1.5 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span className="hidden sm:inline">Hapus</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Realtime KPI Metric Chips ───────────────────────────── */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Metric 1: Total Suara Masuk */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Total Suara Masuk
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                            {totalVotes}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Surat Suara Sah
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Vote className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Metric 2: Tingkat Partisipasi Hadir */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Partisipasi Peserta Hadir
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {turnoutPct}%
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            ({totalVotes} / {totalPresentMembers || totalVotes} hadir)
                          </span>
                        </div>
                        {/* Mini progress */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${turnoutPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Metric 3: Opsi / Kandidat Terdepan */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Perolehan Teratas
                        </span>
                        <div className="truncate font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-0.5">
                          {leadingOption ? leadingOption.title : 'Belum Ada Pilihan'}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {leadingOption ? `${leadingOption.voteCount || 0} Suara (${totalVotes > 0 ? Math.round(((leadingOption.voteCount || 0) / totalVotes) * 100) : 0}%)` : 'Menunggu pemilih'}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Perolehan Suara - Candidate / Option Cards Grid ──────── */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span>Rincian Perolehan Suara Tiap Opsi / Kandidat</span>
                    </h5>
                    <span className="text-xs text-slate-400 font-medium">
                      {(session.options || []).length} Pilihan Tersedia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(session.options || []).map((opt, idx) => {
                      const pct = totalVotes > 0 ? Math.round(((opt.voteCount || 0) / totalVotes) * 100) : 0;
                      const isLeading = totalVotes > 0 && (opt.voteCount || 0) === maxVoteCount && (opt.voteCount || 0) > 0;

                      return (
                        <div
                          key={opt.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isLeading
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
                              : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 font-mono">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
                                {opt.title}
                              </span>
                            </div>

                            {isLeading && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 shrink-0">
                                👑 Terdepan
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                              {opt.voteCount || 0}
                              <span className="text-xs font-semibold text-slate-500 ml-1">Suara</span>
                            </span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60">
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isLeading
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-sm'
                                  : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Separate Personal Ballot Ribbon ──────────────────────── */}
                {canVote && session.status === 'ACTIVE' && (
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/60 via-indigo-50/50 to-transparent dark:from-slate-800/80 dark:via-slate-800/40 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Vote className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Anda memiliki hak suara sah sebagai anggota pada sesi ini
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pilihan Anda dijamin rahasia dan independen dari wewenang kepengurusan.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="toolbar"
                      variant="toolbarPrimary"
                      onClick={() => onSelectVoteSession(session)}
                      className="gap-1.5 text-xs font-bold self-start sm:self-center shrink-0"
                    >
                      <Vote className="w-4 h-4" />
                      <span>Gunakan Hak Suara Saya (Buka Surat Suara) →</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <Vote className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Belum ada sesi pemungutan suara yang diagendakan.
          </p>
          {canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarPrimary"
              onClick={onOpenCreateSession}
              className="gap-1.5 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Sesi Voting Baru Sekarang</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

RatVotingSection.displayName = 'RatVotingSection';
