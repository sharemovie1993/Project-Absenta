import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

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

export const CastVoteModal: React.FC<CastVoteModalProps> = React.memo(({
  isOpen,
  onClose,
  session,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const voteMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; optionId: string }) => {
      const res = await api.post(`/cooperative/rat/voting-sessions/${payload.sessionId}/vote`, {
        optionId: payload.optionId
      });
      return res.data;
    },
    onSuccess: () => {
      if (session) {
        invalidateRatCaches(queryClient, session.meetingId, session.id);
      }
      toast.success('Suara Anda berhasil tercatat secara rahasia dan sah!');
      setSelectedOptionId('');
      onClose();
      onSuccess?.();
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

  if (!session) return null;

  const isPending = voteMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Surat Suara Digital (e-Voting Rahasia)"
      size="md"
    >
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
    </Modal>
  );
});

CastVoteModal.displayName = 'CastVoteModal';
