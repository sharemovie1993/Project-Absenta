import React, { useState } from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import {
  Clock,
  Plus,
  Play,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Trash2,
  Sparkles,
  BookOpen,
  ListOrdered,
  Printer,
  Calendar,
  Scale,
  FileText,
  Vote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import useConfirm from '../../../hooks/useConfirm';
import type {
  CoopAgendaItem,
  CoopResolutionItem,
  CoopVotingSessionItem,
} from '../../../pages/cooperative/RatMeetingPage';
import { RatRulesTabContent } from './RatRulesTabContent';
import { RatResolutionsCard } from './RatResolutionsCard';

export {
  isStatutoryTapAgenda,
  getAgendaVotingRecommendation,
  getAgendaMinuteRequirement,
} from './ratAgendaClassifier';
export type { AgendaVotingRecommendation, AgendaMinuteObligation, AgendaMinuteClassification } from './ratAgendaClassifier';
import {
  isStatutoryTapAgenda,
  getAgendaVotingRecommendation,
  getAgendaMinuteRequirement,
} from './ratAgendaClassifier';


interface RatAgendaSectionProps {
  meetingId: string;
  agendas: CoopAgendaItem[];
  resolutions: CoopResolutionItem[];
  votingSessions?: CoopVotingSessionItem[];
  canManage: boolean;
  meetingDescription?: string | null;
  onOpenAddAgenda: () => void;
  onEditAgenda: (agenda: CoopAgendaItem) => void;
  onOpenAddResolution: () => void;
  onEditResolution: (resolution: CoopResolutionItem) => void;
  onOpenEditRules?: () => void;
  onOpenCreateVoting?: (agenda: CoopAgendaItem) => void;
  onOpenCastVote?: (session: CoopVotingSessionItem) => void;
  onOpenAddMinute?: (agendaId: string) => void;
  meetingLocation?: string | null;
  meetingDate?: string | null;
}

export const RatAgendaSection: React.FC<RatAgendaSectionProps> = React.memo(({
  meetingId,
  agendas,
  resolutions,
  votingSessions = [],
  canManage,
  meetingDescription,
  onOpenAddAgenda,
  onEditAgenda,
  onOpenAddResolution,
  onEditResolution,
  onOpenEditRules,
  onOpenCreateVoting,
  onOpenCastVote,
  onOpenAddMinute,
  meetingLocation,
  meetingDate,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState<'rundown' | 'rules'>('rundown');

  // Mutation: Update Agenda Status (Mulai / Selesai / Reset)
  const updateAgendaStatusMutation = useMutation({
    mutationFn: async ({ agendaId, status }: { agendaId: string; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' }) => {
      const res = await api.put(`/cooperative/rat/${meetingId}/agendas/${agendaId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Status tahapan agenda berhasil diperbarui!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengubah status agenda';
      toast.error(errorMsg);
    }
  });

  // Mutation: Generate Resolution Automatically from Agenda
  const generateResolutionMutation = useMutation({
    mutationFn: async (agendaId: string) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/agendas/${agendaId}/generate-resolution`);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Draf Surat Ketetapan Resmi (TAP RAT) otomatis berhasil diterbitkan!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menerbitkan TAP RAT otomatis';
      toast.error(errorMsg);
    }
  });

  // Mutation: Delete Agenda
  const deleteAgendaMutation = useMutation({
    mutationFn: async (agendaId: string) => {
      const res = await api.delete(`/cooperative/rat/${meetingId}/agendas/${agendaId}`);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Butir agenda sidang berhasil dihapus.');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus butir agenda';
      toast.error(errorMsg);
    }
  });

  // Mutation: Load Preset Agendas (Idempotent & Safe)
  const loadPresetMutation = useMutation({
    mutationFn: async ({ forceReset }: { forceReset?: boolean } = {}) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/agendas/preset`, { forceReset });
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Susunan 9 Agenda Standar RAT Koperasi berhasil disinkronkan!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memuat preset agenda';
      toast.error(errorMsg);
    }
  });

  const hasLiveOrCompletedAgenda = React.useMemo(() => {
    return (agendas || []).some(a => a.status === 'IN_PROGRESS' || a.status === 'COMPLETED' || a.isCompleted);
  }, [agendas]);

  const handleLoadPreset = async () => {
    if (hasLiveOrCompletedAgenda) {
      toast.error('Sidang sedang/sudah berjalan. Susunan acara terkunci demi kepastian hukum persidangan.');
      return;
    }

    if ((agendas || []).length > 0) {
      const isConfirmed = await confirm({
        title: 'Reset Susunan Agenda RAT?',
        message: `Sidang ini telah memiliki ${(agendas || []).length} butir acara. Apakah Anda ingin me-reset ulang dan mengembalikan ke susunan 9 butir agenda standar resmi? Tindakan ini akan menghapus butir acara lama yang belum berjalan.`,
        confirmText: 'Ya, Reset Susunan Acara',
        cancelText: 'Batal',
        variant: 'warning',
        style: 'warning',
      });
      if (isConfirmed) {
        loadPresetMutation.mutate({ forceReset: true });
      }
      return;
    }

    const isConfirmed = await confirm({
      title: 'Muat Preset Agenda Standar RAT Koperasi',
      message: 'Apakah Anda ingin memuat 9 butir acara resmi sidang RAT berstandar UU No. 25/1992? Susunan acara lengkap mulai dari registrasi, pembukaan, LPJ, pandangan umum, hingga pengesahan ketetapan akan diisikan secara otomatis.',
      confirmText: 'Ya, Muat Preset Standar',
      cancelText: 'Batal',
      style: 'primary',
      variant: 'primary',
    });
    if (isConfirmed) {
      loadPresetMutation.mutate({ forceReset: false });
    }
  };

  const handleCompleteAgenda = async (agenda: CoopAgendaItem) => {
    await updateAgendaStatusMutation.mutateAsync({ agendaId: agenda.id, status: 'COMPLETED' });

    const isTapRequired = isStatutoryTapAgenda(agenda.title);

    if (isTapRequired) {
      // Agenda yuridis yang menghasilkan ketetapan sidang
      const shouldDraft = await confirm({
        title: 'Agenda Selesai! Terbitkan Draf TAP RAT?',
        message: (
          <div className="space-y-2.5 text-xs leading-relaxed">
            <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Status tahapan agenda telah tersimpan selesai.</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Agenda <strong className="text-indigo-600 dark:text-indigo-400">"{agenda.title}"</strong> berbobot yuridis statuter (UU No. 25/1992). Ingin sistem langsung menyusun draf naskah resmi berpenomoran <strong>TAP/RAT</strong> lengkap dengan data kuorum dan rekapan voting?
            </p>
            <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300">
              💡 <em>Naskah draf otomatis masuk ke daftar TAP di bawah dan tetap dapat disunting atau disesuaikan kembali sebelum dicetak.</em>
            </div>
          </div>
        ),
        confirmText: '✨ Ya, Buatkan Draf TAP RAT',
        cancelText: 'Cukup Selesaikan (Tanpa TAP)',
        style: 'primary',
        type: 'primary',
        variant: 'primary',
      });

      if (shouldDraft) {
        generateResolutionMutation.mutate(agenda.id);
      }
    } else {
      // Agenda protokoler/diskusi (umumnya cukup notulensi)
      const shouldDraft = await confirm({
        title: 'Butir Acara Telah Selesai',
        message: (
          <div className="space-y-2 text-xs leading-relaxed">
            <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Status tahapan agenda telah tersimpan selesai.</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Agenda <strong className="text-slate-800 dark:text-slate-200">"{agenda.title}"</strong> merupakan tahapan protokoler/dinamika forum yang umumnya dicatat dalam Berita Acara & Notulensi Sidang (tanpa SK mandiri).
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Apakah forum menghasilkan keputusan khusus yang memerlukan penerbitan Surat Ketetapan (TAP RAT)?
            </p>
          </div>
        ),
        confirmText: 'Terbitkan TAP Khusus',
        cancelText: 'Selesai (Cukup Notulensi)',
        style: 'info',
        type: 'info',
        variant: 'info',
      });

      if (shouldDraft) {
        generateResolutionMutation.mutate(agenda.id);
      }
    }
  };

  const handleDeleteAgenda = async (agenda: CoopAgendaItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Butir Acara Sidang',
      message: `Apakah Anda yakin ingin menghapus butir agenda "${agenda.title}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
      type: 'danger',
      variant: 'danger',
    });
    if (isConfirmed) {
      deleteAgendaMutation.mutate(agenda.id);
    }
  };

  const handlePrintRules = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* SUB-NAV TOGGLE: JADWAL ACARA VS TATA TERTIB SIDANG */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 w-fit">
        <button
          type="button"
          onClick={() => setSubTab('rundown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'rundown'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Rundown</span>
          <Badge variant="outline" className="text-[10px] ml-1">
            {agendas.length} Acara
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'rules'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tata Tertib</span>
          <Badge variant="success" className="text-[10px] ml-1">
            UU 25/1992
          </Badge>
        </button>
      </div>

      {/* VIEW 1: JADWAL ACARA & RUNDOWN */}
      {subTab === 'rundown' && (
        <SectionCard
          title="Rundown Sidang"
          fullWidth
          actions={
            canManage && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="toolbar"
                  variant="outline"
                  onClick={handleLoadPreset}
                  disabled={loadPresetMutation.isPending || hasLiveOrCompletedAgenda}
                  title={hasLiveOrCompletedAgenda ? 'Preset terkunci karena sidang sedang/sudah berjalan' : undefined}
                  className="gap-1 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadPresetMutation.isPending
                    ? 'Menyinkronkan...'
                    : (agendas || []).length > 0
                    ? 'Reset ke 9 Agenda Standar'
                    : 'Muat Preset Standar RAT'}
                </Button>
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarOutline"
                  onClick={onOpenAddAgenda}
                  className="gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Manual
                </Button>
              </div>
            )
          }
        >
          {(agendas || []).length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {(agendas || []).map((agenda, index) => {
                const currentStatus = agenda.status || (agenda.isCompleted ? 'COMPLETED' : 'PENDING');
                const isLive = currentStatus === 'IN_PROGRESS';
                const isDone = currentStatus === 'COMPLETED';

                const linkedSession = (votingSessions || []).find(
                  (s) => (s as any).agendaId === agenda.id || s.title.toLowerCase().includes(agenda.title.toLowerCase())
                );
                const votingRec = getAgendaVotingRecommendation(agenda.title);
                const minuteReq = getAgendaMinuteRequirement(agenda.title);

                return (
                  <div
                    key={agenda.id}
                    className={`flex flex-col justify-between p-4 rounded-xl border transition-all gap-3.5 ${
                      isLive
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30'
                        : isDone
                        ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 opacity-80'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-colors ${
                          isLive
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800 animate-pulse'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`font-semibold text-sm leading-snug break-words ${
                              isDone
                                ? 'line-through text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {agenda.title}
                          </h4>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isLive && (
                              <Badge variant="indigo" className="text-[10px] py-0.5 px-2 animate-pulse">
                                Sedang Berlangsung
                              </Badge>
                            )}
                            {isDone && (
                              <Badge variant="success" className="text-[10px] py-0.5 px-2">
                                Selesai
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          {isStatutoryTapAgenda(agenda.title) && (
                            <span
                              className="inline-flex items-center gap-1 font-semibold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60"
                              title="Agenda yuridis yang menghasilkan Surat Ketetapan Resmi (TAP RAT)"
                            >
                              <Scale className="w-3 h-3 text-indigo-500" />
                              Wajib TAP RAT
                            </span>
                          )}

                          {/* Selective Notulensi Requirement Badge */}
                          <span
                            className={`inline-flex items-center gap-1 font-medium text-[10px] px-2 py-0.5 rounded-md border ${minuteReq.badgeClass}`}
                            title={minuteReq.helperText}
                          >
                            <BookOpen className="w-3 h-3" />
                            {minuteReq.shortLabel}
                          </span>

                          {votingRec === 'RECOMMENDED' && !linkedSession && (
                            <span
                              className="inline-flex items-center gap-1 font-semibold text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/60"
                              title="Agenda pemilihan kepengurusan lazim diselenggarakan lewat e-Voting rahasia"
                            >
                              <Vote className="w-3 h-3 text-purple-500" />
                              Disarankan e-Voting
                            </span>
                          )}

                          {linkedSession && (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-md border ${
                                linkedSession.status === 'ACTIVE'
                                  ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
                                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              <Vote className="w-3 h-3" />
                              {linkedSession.status === 'ACTIVE'
                                ? 'e-Voting Terbuka'
                                : `Voting Selesai (${linkedSession.ballotsCount || 0} Suara)`}
                            </span>
                          )}

                          {agenda.presenter && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span className="text-[11px] font-medium text-slate-400">Pembicara:</span> {agenda.presenter}
                            </span>
                          )}
                          {agenda.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {agenda.durationMinutes} Menit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions container: for both voters and managers */}
                    <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                      {/* Active Voting Ballot Shortcut for all eligible participants */}
                      {linkedSession && linkedSession.status === 'ACTIVE' && onOpenCastVote && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => onOpenCastVote(linkedSession)}
                          className="text-xs gap-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>Berikan Suara</span>
                        </Button>
                      )}

                      {/* Management Actions */}
                      {canManage && (
                        <>
                          {/* Create Voting Shortcut - Selective Awareness */}
                          {!linkedSession && onOpenCreateVoting && (isLive || currentStatus === 'PENDING') && votingRec !== 'NOT_APPLICABLE' && (
                            votingRec === 'RECOMMENDED' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={() => onOpenCreateVoting(agenda)}
                                title="Buka pemungutan suara digital rahasia untuk pemilihan pengurus/pengawas"
                                className="text-xs gap-1 py-1 bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-1 ring-purple-400"
                              >
                                <Vote className="w-3 h-3 animate-pulse" />
                                <span>Buka e-Voting Pemilihan</span>
                              </Button>
                            ) : isLive ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="toolbarOutline"
                                onClick={() => onOpenCreateVoting(agenda)}
                                title="Utamakan musyawarah mufakat. Buka voting hanya jika terjadi kebuntuan (deadlock) suara."
                                className="text-xs gap-1 py-1 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700"
                              >
                                <Vote className="w-3 h-3 text-slate-400" />
                                <span className="hidden sm:inline">Voting</span> Bila Deadlock
                              </Button>
                            ) : null
                          )}

                          {/* Add Minute Shortcut - Selective Awareness */}
                          {onOpenAddMinute && (
                            <Button
                              type="button"
                              size="sm"
                              variant={minuteReq.isMandatory ? 'primary' : 'toolbarOutline'}
                              onClick={() => onOpenAddMinute(agenda.id)}
                              title={minuteReq.helperText}
                              className={`text-xs gap-1 py-1 ${
                                minuteReq.isMandatory
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                  : minuteReq.obligation === 'ADVISORY'
                                  ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                                  : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700'
                              }`}
                            >
                              <BookOpen className="w-3 h-3" />
                              {minuteReq.isMandatory ? (
                                <>
                                  <span className="hidden sm:inline">Catat</span> Notulensi Wajib
                                </>
                              ) : minuteReq.obligation === 'ADVISORY' ? (
                                <>
                                  <span className="hidden sm:inline">Catat</span> Arahan
                                </>
                              ) : (
                                <>
                                  <span className="hidden sm:inline">Catat</span> Opsional
                                </>
                              )}
                            </Button>
                          )}

                          {/* Status Toggle Button */}
                          {currentStatus === 'PENDING' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => updateAgendaStatusMutation.mutate({ agendaId: agenda.id, status: 'IN_PROGRESS' })}
                              disabled={updateAgendaStatusMutation.isPending}
                              className="text-xs gap-1 py-1"
                            >
                              <Play className="w-3 h-3" />
                              Mulai Acara
                            </Button>
                          )}

                          {currentStatus === 'IN_PROGRESS' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="success"
                              onClick={() => handleCompleteAgenda(agenda)}
                              disabled={updateAgendaStatusMutation.isPending || generateResolutionMutation.isPending}
                              className="text-xs gap-1 py-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Selesaikan
                            </Button>
                          )}

                          {currentStatus === 'COMPLETED' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => updateAgendaStatusMutation.mutate({ agendaId: agenda.id, status: 'PENDING' })}
                              disabled={updateAgendaStatusMutation.isPending}
                              className="text-xs gap-1 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Buka Ulang
                            </Button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onEditAgenda(agenda)}
                            aria-label="Edit butir acara"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAgenda(agenda)}
                            disabled={deleteAgendaMutation.isPending}
                            aria-label="Hapus butir acara"
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Quick Action to Add Agenda Item */}
              {canManage && (
                <button
                  type="button"
                  onClick={onOpenAddAgenda}
                  className={`py-3.5 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center justify-center gap-2 transition-all bg-slate-50/50 hover:bg-indigo-50/40 dark:bg-slate-900/30 dark:hover:bg-indigo-950/20 min-h-[64px] ${
                    agendas.length % 2 === 1 ? 'col-span-1' : 'col-span-1 lg:col-span-2'
                  }`}
                >
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span>+ Tambah Butir Acara Baru</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm space-y-4 max-w-md mx-auto">
              <div className="space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada butir acara yang diagendakan.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gunakan preset 9 butir acara resmi sidang RAT berstandar UU No. 25/1992 atau susun butir acara secara manual.
                </p>
              </div>
              {canManage && (
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleLoadPreset}
                    disabled={loadPresetMutation.isPending}
                    className="gap-1.5 text-xs shadow-md shadow-indigo-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {loadPresetMutation.isPending ? 'Memuat Preset...' : 'Muat 9 Agenda Standar RAT'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenAddAgenda}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Manual
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* VIEW 2: NASKAH TATA TERTIB SIDANG RAT */}
      {subTab === 'rules' && (
        <SectionCard
          title="Tata Tertib Sidang"
          fullWidth
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="toolbar"
                variant="outline"
                onClick={handlePrintRules}
                className="gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Tatib
              </Button>
              {canManage && onOpenEditRules && (
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarOutline"
                  onClick={onOpenEditRules}
                  className="gap-1 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Kustomisasi Klausul
                </Button>
              )}
            </div>
          }
        >
          <RatRulesTabContent meetingDescription={meetingDescription} />
        </SectionCard>
      )}

      {/* SECTION 3: DAFTAR SURAT KETETAPAN (TAP RAT) */}
      <RatResolutionsCard
        meetingId={meetingId}
        resolutions={resolutions}
        canManage={canManage}
        onOpenAddResolution={onOpenAddResolution}
        onEditResolution={onEditResolution}
        meetingLocation={meetingLocation}
        meetingDate={meetingDate}
      />
    </div>
  );
});

RatAgendaSection.displayName = 'RatAgendaSection';
export default RatAgendaSection;
