import React from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import { Clock, Plus, ExternalLink, Play, CheckCircle2, RotateCcw, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import useConfirm from '../../../hooks/useConfirm';
import type { CoopAgendaItem, CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';

interface RatAgendaSectionProps {
  meetingId: string;
  agendas: CoopAgendaItem[];
  resolutions: CoopResolutionItem[];
  canManage: boolean;
  onOpenAddAgenda: () => void;
  onEditAgenda: (agenda: CoopAgendaItem) => void;
  onOpenAddResolution: () => void;
  onEditResolution: (resolution: CoopResolutionItem) => void;
}

export const RatAgendaSection: React.FC<RatAgendaSectionProps> = React.memo(({
  meetingId,
  agendas,
  resolutions,
  canManage,
  onOpenAddAgenda,
  onEditAgenda,
  onOpenAddResolution,
  onEditResolution,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

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

  // Mutation: Delete Resolution
  const deleteResolutionMutation = useMutation({
    mutationFn: async (resolutionId: string) => {
      const res = await api.delete(`/cooperative/rat/${meetingId}/resolutions/${resolutionId}`);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Surat ketetapan keputusan berhasil dihapus.');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus ketetapan';
      toast.error(errorMsg);
    }
  });

  const handleDeleteAgenda = async (agenda: CoopAgendaItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Butir Acara Sidang',
      message: `Apakah Anda yakin ingin menghapus butir agenda "${agenda.title}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (isConfirmed) {
      deleteAgendaMutation.mutate(agenda.id);
    }
  };

  const handleDeleteResolution = async (res: CoopResolutionItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Surat Ketetapan (TAP RAT)',
      message: `Apakah Anda yakin ingin menghapus ketetapan resmi "${res.resolutionNo}" (${res.subject})?`,
      confirmText: 'Ya, Hapus Ketetapan',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (isConfirmed) {
      deleteResolutionMutation.mutate(res.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: JADWAL ACARA & TATA TERTIB */}
      <SectionCard
        title="Jadwal Acara & Tata Tertib Sidang"
        rightElement={
          canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarOutline"
              onClick={onOpenAddAgenda}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Butir Acara
            </Button>
          )
        }
      >
        {(agendas || []).length > 0 ? (
          <div className="space-y-3">
            {(agendas || []).map((agenda, idx) => {
              const currentStatus = agenda.status || (agenda.isCompleted ? 'COMPLETED' : 'PENDING');
              return (
                <div
                  key={agenda.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                    currentStatus === 'IN_PROGRESS'
                      ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                      : currentStatus === 'COMPLETED'
                      ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center ${
                        currentStatus === 'COMPLETED'
                          ? 'bg-emerald-500 text-white'
                          : currentStatus === 'IN_PROGRESS'
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {currentStatus === 'COMPLETED' ? '✓' : idx + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {agenda.title}
                        </h4>
                        <Badge
                          variant={
                            currentStatus === 'COMPLETED'
                              ? 'success'
                              : currentStatus === 'IN_PROGRESS'
                              ? 'primary'
                              : 'default'
                          }
                          className="text-[10px] font-bold"
                        >
                          {currentStatus === 'IN_PROGRESS'
                            ? 'SEDANG BERLANGSUNG'
                            : currentStatus === 'COMPLETED'
                            ? 'SELESAI'
                            : 'MENUNGGU'}
                        </Badge>
                      </div>

                      {agenda.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {agenda.description}
                        </p>
                      )}

                      {(agenda.durationMinutes || agenda.durationMin) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>Alokasi waktu: {agenda.durationMinutes || agenda.durationMin} menit</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Managers */}
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
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
                          onClick={() => updateAgendaStatusMutation.mutate({ agendaId: agenda.id, status: 'COMPLETED' })}
                          disabled={updateAgendaStatusMutation.isPending}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm space-y-2">
            <p>Belum ada butir acara yang diagendakan pada sidang ini.</p>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddAgenda}
                className="gap-1.5 text-xs mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Butir Acara Pertama
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      {/* SECTION 2: DAFTAR SURAT KETETAPAN (TAP RAT) */}
      <SectionCard
        title="Daftar Surat Ketetapan Resmi Sidang (TAP RAT)"
        className="space-y-4"
        rightElement={
          canManage && (
            <Button
              type="button"
              size="toolbar"
              variant="toolbarOutline"
              onClick={onOpenAddResolution}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Ketetapan
            </Button>
          )
        }
      >
        <p className="text-xs text-slate-500">
          Seluruh ketetapan yang telah disepakati oleh anggota berstatus hukum sah dan mengikat kepengurusan koperasi.
        </p>

        {(resolutions || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(resolutions || []).map((res) => (
              <div
                key={res.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                      {res.resolutionNo}
                    </span>
                    <Badge variant={res.status === 'PASSED' ? 'success' : res.status === 'AMENDED' ? 'warning' : 'danger'}>
                      {res.status === 'PASSED' ? 'Disahkan' : res.status === 'AMENDED' ? 'Dengan Catatan' : 'Ditolak'}
                    </Badge>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {res.subject}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {res.summary}
                  </p>

                  {res.documentUrl && (
                    <a
                      href={res.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Unduh Salinan Dokumen SK
                    </a>
                  )}
                </div>

                {/* Actions for Managers */}
                {canManage && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditResolution(res)}
                      className="text-xs gap-1 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResolution(res)}
                      disabled={deleteResolutionMutation.isPending}
                      className="text-xs gap-1 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm space-y-2">
            <p>Belum ada ketetapan resmi yang dicatatkan pada sidang ini.</p>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddResolution}
                className="gap-1.5 text-xs mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Ketetapan Pertama
              </Button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
});

RatAgendaSection.displayName = 'RatAgendaSection';
