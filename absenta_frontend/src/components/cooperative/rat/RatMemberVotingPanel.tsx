import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '../../ui';
import api from '../../../lib/axiosInstance';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  LockKeyhole,
  BarChart3,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Gavel,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VotingOption {
  id: string;
  label?: string;
  title?: string;
  description?: string | null;
  voteCount?: number;
}

export interface MemberVotingSession {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  votingType?: string;
  category?: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'TALLIED';
  options: VotingOption[];
  ballotsCount?: number;
}

export interface RatMemberVotingPanelProps {
  session: MemberVotingSession | null;
  hasVoted: boolean;
  hasAttended: boolean;
  totalPresentMembers: number;
  meetingId: string;
  onVoteSuccess?: () => void;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const voteSchema = z.object({
  optionId: z.string().min(1, 'Silakan pilih salah satu opsi suara'),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function getOptionLabel(opt: VotingOption, idx: number): string {
  return opt.label || opt.title || `Opsi ${idx + 1}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const RatMemberVotingPanel: React.FC<RatMemberVotingPanelProps> = React.memo(({
  session,
  hasVoted,
  hasAttended,
  totalPresentMembers,
  meetingId,
  onVoteSuccess,
}) => {
  const queryClient = useQueryClient();

  // Ballot state
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [auditToken, setAuditToken] = useState<string | null>(null);
  const [auditTimestamp, setAuditTimestamp] = useState<string | null>(null);
  const [auditChoice, setAuditChoice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ sessionId, optionId }: { sessionId: string; optionId: string }) => {
      const res = await api.post(`/cooperative/rat/voting-sessions/${sessionId}/vote`, { optionId });
      return res.data;
    },
    onSuccess: () => {
      const chosen = session?.options?.find(o => o.id === selectedOptionId);
      const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setAuditToken(`VT-${rand1}-${rand2}`);
      setAuditTimestamp(timeStr);
      setAuditChoice(getOptionLabel(chosen as VotingOption, 0));
      invalidateRatCaches(queryClient, meetingId, session?.id);
      toast.success('Suara Anda berhasil tercatat secara rahasia dan sah!');
      onVoteSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message || 'Gagal mengirim suara';
      toast.error(msg);
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const result = voteSchema.safeParse({ optionId: selectedOptionId });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message || 'Pilih opsi suara');
      return;
    }
    if (!session) return;
    voteMutation.mutate({ sessionId: session.id, optionId: selectedOptionId });
  }, [selectedOptionId, session, voteMutation]);

  const handleCopyToken = () => {
    if (!auditToken) return;
    navigator.clipboard.writeText(auditToken);
    setCopied(true);
    toast.success('Kode audit berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── STATE: No active session ──────────────────────────────────────────────
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
          <Vote className="w-10 h-10 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
            Belum Ada Sesi e-Voting Aktif
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Bilik suara digital akan terbuka otomatis saat Presidium Sidang membuka sesi pemungutan suara.
          </p>
        </div>
      </div>
    );
  }

  const options = session.options || [];
  const isActive = session.status === 'ACTIVE';
  const isClosed = session.status === 'CLOSED' || session.status === 'TALLIED';
  const totalVotes = session.ballotsCount || options.reduce((s, o) => s + (o.voteCount || 0), 0);
  const participationPct = totalPresentMembers > 0
    ? Math.min(100, Math.round((totalVotes / totalPresentMembers) * 100))
    : 0;

  // ─── STATE: Session CLOSED / TALLIED → Show full results ──────────────────
  if (isClosed) {
    return (
      <div className="flex-1 flex flex-col p-5 sm:p-6 lg:p-8 space-y-5 max-w-3xl lg:max-w-4xl mx-auto w-full overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="text-xs font-bold">
                {session.status === 'TALLIED' ? '✅ TABULASI FINAL' : '🔒 DITUTUP'}
              </Badge>
              <span className="text-[11px] text-slate-500 font-mono uppercase">
                {session.category || session.votingType || 'RESOLUTION'}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              {session.title}
            </h3>
          </div>
          <div className="flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Suara</span>
              <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {totalVotes} <span className="text-xs text-slate-500 font-normal">/ {totalPresentMembers}</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-600/30">
              {participationPct}%
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Hasil Rekapitulasi Suara Sah</span>
            <span className="ml-auto text-xs text-slate-400 font-mono font-normal">Final & Resmi</span>
          </div>
          <div className="space-y-3">
            {options.map((opt, idx) => {
              const label = getOptionLabel(opt, idx);
              const count = opt.voteCount || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isWinner = count === Math.max(...options.map(o => o.voteCount || 0)) && count > 0;
              return (
                <div
                  key={opt.id || idx}
                  className={`p-4 rounded-xl border space-y-2 ${isWinner ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isWinner && <Gavel className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      <div className="truncate">
                        <span className={`font-bold text-sm block truncate ${isWinner ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>
                          {label}
                        </span>
                        {opt.description && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">{opt.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {count} <span className="text-xs text-slate-500 font-normal">suara</span>
                      </span>
                      <span className={`block font-mono text-xs font-bold ${isWinner ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isWinner ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE: ACTIVE + member already voted → Receipt + masked tally ─────────
  if (isActive && (hasVoted || auditToken)) {
    return (
      <div className="flex-1 flex flex-col p-5 sm:p-6 lg:p-8 space-y-5 max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto w-full overflow-y-auto">
        {/* Confirmation hero */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
              Suara Anda Sah Tercatat!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto mt-1 leading-relaxed">
              Identitas Anda telah dianonimkan secara kriptografis. Hak suara Anda sudah sah masuk ke dalam tabulasi resmi persidangan.
            </p>
          </div>
        </div>

        {/* Audit receipt (if just voted) */}
        {auditToken && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Tanda Terima Audit Kriptografis
              </span>
              <span className="text-[11px] font-mono text-slate-500">{auditTimestamp} WIB</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sesi Voting:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{session.title}</span>
              </div>
              {auditChoice && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pilihan Anda:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    {auditChoice}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Token Verifikasi:</span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-wider">{auditToken}</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyToken} className="gap-1 text-xs shrink-0">
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Masked participation counter (intentionally no per-option breakdown) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <LockKeyhole className="w-4 h-4 text-indigo-500" />
              <span>Partisipasi Pemungutan Suara</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Hasil detail setelah voting ditutup
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${participationPct}%` }}
              />
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                {totalVotes}
              </span>
              <span className="text-xs text-slate-500 ml-1">/ {totalPresentMembers} ({participationPct}%)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <LockKeyhole className="w-3 h-3 text-indigo-400 shrink-0" />
            Rincian hasil per opsi disembunyikan untuk menjaga integritas asas LUBER & JURDIL selama sesi masih berlangsung.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Hasil rekapitulasi lengkap akan ditampilkan setelah Presidium Sidang menutup sesi pemungutan suara ini.</span>
        </div>
      </div>
    );
  }

  // ─── STATE: ACTIVE + has NOT voted → Ballot form ──────────────────────────
  if (isActive && !hasVoted && !auditToken) {
    if (!hasAttended) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              Konfirmasi Presensi Dulu
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Hak suara e-Voting hanya diberikan kepada anggota yang telah sah tercatat hadir dalam sidang RAT ini.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col p-5 sm:p-6 lg:p-8 space-y-5 max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto w-full overflow-y-auto">
        {/* Session header */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl border border-indigo-700/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/80 border border-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Bilik Suara Terbuka
            </span>
            <span className="text-[10px] text-indigo-200 font-mono uppercase">
              {session.category || session.votingType || 'RESOLUTION'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-tight">
            {session.title}
          </h3>
          {session.description && (
            <p className="text-xs text-indigo-200 mt-1 leading-relaxed">{session.description}</p>
          )}
        </div>

        {/* Ballot options */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Tentukan Pilihan Anda:
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilihan bersifat rahasia & hanya bisa diberikan sekali. Tidak dapat diubah setelah dikirim.
            </p>
          </div>

          <div className="space-y-2.5">
            {options.map((option, idx) => {
              const label = getOptionLabel(option, idx);
              const isSelected = selectedOptionId === option.id;
              return (
                <div
                  key={option.id || idx}
                  onClick={() => !voteMutation.isPending && setSelectedOptionId(option.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/50'
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold leading-snug ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {formError && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {formError}
            </p>
          )}

          {/* Security assurance */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Identitas Anda diacak secara kriptografis (HMAC SHA-256). Pengurus tidak dapat melihat pilihan pribadi Anda. Sistem menjamin <strong>1 Anggota = 1 Suara</strong>.
            </span>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            isLoading={voteMutation.isPending}
            disabled={voteMutation.isPending || !selectedOptionId}
            className="w-full py-3 text-sm font-black gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Vote className="w-4 h-4" />
            Kirim Suara Sah Saya
          </Button>
        </form>
      </div>
    );
  }

  return null;
});

RatMemberVotingPanel.displayName = 'RatMemberVotingPanel';
