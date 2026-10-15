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
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import useConfirm from '../../../hooks/useConfirm';
import type { CoopAgendaItem, CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';
import { RatRulesTabContent } from './RatRulesTabContent';
import { RatResolutionsCard } from './RatResolutionsCard';

interface RatAgendaSectionProps {
  meetingId: string;
  agendas: CoopAgendaItem[];
  resolutions: CoopResolutionItem[];
  canManage: boolean;
  meetingDescription?: string | null;
  onOpenAddAgenda: () => void;
  onEditAgenda: (agenda: CoopAgendaItem) => void;
  onOpenAddResolution: () => void;
  onEditResolution: (resolution: CoopResolutionItem) => void;
  onOpenEditRules?: () => void;
}

export const RatAgendaSection: React.FC<RatAgendaSectionProps> = React.memo(({
  meetingId,
  agendas,
  resolutions,
  canManage,
  meetingDescription,
  onOpenAddAgenda,
  onEditAgenda,
  onOpenAddResolution,
  onEditResolution,
  onOpenEditRules,
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

    // Tanya operator apakah ingin langsung membuatkan draf TAP RAT otomatis
    const shouldDraft = await confirm({
      title: 'Terbitkan Draf TAP RAT Otomatis?',
      message: `Agenda "${agenda.title}" telah diselesaikan. Apakah Anda ingin sistem langsung menerbitkan Draf Surat Ketetapan Resmi (TAP RAT) yang menginjeksi kuorum kehadiran sah dan hasil voting sidang?`,
      confirmText: 'Ya, Terbitkan Draf TAP RAT',
      cancelText: 'Hanya Selesaikan Agenda',
      style: 'primary',
      type: 'primary',
      variant: 'primary',
    });

    if (shouldDraft) {
      generateResolutionMutation.mutate(agenda.id);
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
          <span>Susunan Acara Sidang (Rundown)</span>
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
          <span>Pedoman Tata Tertib Sidang (Rules of Order)</span>
          <Badge variant="success" className="text-[10px] ml-1">
            UU 25/1992
          </Badge>
        </button>
      </div>

      {/* VIEW 1: JADWAL ACARA & RUNDOWN */}
      {subTab === 'rundown' && (
        <SectionCard
          title="Jadwal Acara & Rundown Sidang RAT"
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

                return (
                  <div
                    key={agenda.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                      isLive
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30'
                        : isDone
                        ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
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

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`font-semibold text-sm truncate ${
                              isDone
                                ? 'line-through text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                            title={agenda.title}
                          >
                            {agenda.title}
                          </h4>

                          {isLive && (
                            <Badge variant="indigo" className="text-[10px] py-0 px-1.5 animate-pulse">
                              Sedang Berlangsung
                            </Badge>
                          )}
                          {isDone && (
                            <Badge variant="success" className="text-[10px] py-0 px-1.5">
                              Selesai
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
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
                      </div>
                    )}
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
          title="Pedoman & Tata Tertib Sidang Paripurna RAT"
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
      />
    </div>
  );
});

RatAgendaSection.displayName = 'RatAgendaSection';
export default RatAgendaSection;
