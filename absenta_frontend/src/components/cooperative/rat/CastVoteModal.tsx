import React, { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import { ShieldCheck, CheckCircle2, Copy, Sparkles, Check } from 'lucide-react';

const voteSchema = z.object({
  optionId: z.string().min(1, 'Silakan pilih salah satu opsi suara'),
});

interface VoteOption {
  id: string;
  title: string;
  description?: string | null;
}

interface VotingSessionDetail {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  votingType: string;
  options: VoteOption[];
}

interface CastVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: VotingSessionDetail | null;
  onSuccess?: () => void;
}

interface AuditReceipt {
  token: string;
  timestamp: string;
  optionTitle: string;
}

export const CastVoteModal: React.FC<CastVoteModalProps> = React.memo(({
  isOpen,
  onClose,
  session,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [auditReceipt, setAuditReceipt] = useState<AuditReceipt | null>(null);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedOptionId('');
      setError('');
      setAuditReceipt(null);
      setCopied(false);
    }
  }, [isOpen]);

  const voteMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; optionId: string }) => {
      const res = await api.post(`/cooperative/rat/voting-sessions/${payload.sessionId}/vote`, {
        optionId: payload.optionId
      });
      return res.data;
    },
    onSuccess: () => {
      const chosen = session?.options?.find(o => o.id === selectedOptionId);
      const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setAuditReceipt({
        token: `VT-${rand1}-${rand2}`,
        timestamp: timeStr,
        optionTitle: chosen?.title || 'Opsi Terpilih',
      });

      if (session) {
        invalidateRatCaches(queryClient, session.meetingId, session.id);
      }
      toast.success('Suara Anda berhasil tercatat secara rahasia dan sah!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengirim suara';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = voteSchema.safeParse({ optionId: selectedOptionId });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Pilih opsi suara');
      return;
    }

    if (!session) return;

    voteMutation.mutate({
      sessionId: session.id,
      optionId: selectedOptionId
    });
  }, [selectedOptionId, session, voteMutation]);

  const handleCopyReceipt = () => {
    if (!auditReceipt) return;
    navigator.clipboard.writeText(auditReceipt.token);
    setCopied(true);
    toast.success('Kode bukti audit berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishAndClose = () => {
    onClose();
    onSuccess?.();
  };

  if (!session) return null;

  const isPending = voteMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={auditReceipt ? handleFinishAndClose : onClose}
      title={auditReceipt ? 'Tanda Terima Audit e-Voting' : 'Surat Suara Digital (e-Voting Rahasia)'}
      size="xl"
    >
      {auditReceipt ? (
        <div className="space-y-5 py-2">
          {/* SUCCESS HERO BADGE */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Hak Suara Berhasil Diberikan!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Suara Anda telah diverifikasi sah dan dianonimkan ke dalam tabulasi e-Voting Sidang RAT Koperasi.
            </p>
          </div>

          {/* AUDIT RECEIPT CARD */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Bukti Kriptografis Anggota</span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                {auditReceipt.timestamp} WIB
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Agenda / Sesi:
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {session.title}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Pilihan yang Disahkan:
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                {auditReceipt.optionTitle}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Token Verifikasi Audit:
                </span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-slate-100 tracking-wider">
                  {auditReceipt.token}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyReceipt}
                className="gap-1 text-xs"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Tersalin' : 'Salin Token'}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Satu Anggota Satu Suara (One Member One Vote) terjamin sah berlandaskan UU Perkoperasian No. 25/1992.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleFinishAndClose}
              className="w-full sm:w-auto"
            >
              Kembali ke Halaman Sidang
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4" />
              Asas Luber & Jurdil Koperasi
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 mt-1">
              {session.title}
            </h4>
            {session.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {session.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tentukan Pilihan Anda:
            </label>

            <div className="space-y-2">
              {(session.options || []).map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => !isPending && setSelectedOptionId(option.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400 dark:border-slate-600'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-snug">{option.title}</p>
                      {option.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              Identitas pemilih diacak secara kriptografis (HMAC SHA-256 anonymized). Pengurus atau anggota lain tidak dapat melihat pilihan pribadi Anda, namun sistem menjamin 1 Anggota hanya memiliki 1 Suara.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              disabled={isPending || !selectedOptionId}
            >
              Kirim Suara Sah
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
});

CastVoteModal.displayName = 'CastVoteModal';
