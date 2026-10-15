import React, { useState } from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import {
  Clock,
  Plus,
  ExternalLink,
  Play,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Trash2,
  Sparkles,
  BookOpen,
  ListOrdered,
  Printer,
  Shield,
  FileText,
  Scale,
  Users,
  Gavel,
  AlertCircle,
} from 'lucide-react';
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

  // Mutation: Load Preset Agendas
  const loadPresetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cooperative/rat/${meetingId}/agendas/preset`);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('9 Butir Agenda Standar RAT Koperasi berhasil dimuat!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memuat preset agenda';
      toast.error(errorMsg);
    }
  });

  const handleLoadPreset = async () => {
    const isConfirmed = await confirm({
      title: 'Muat Preset Agenda Standar RAT Koperasi',
      message: 'Apakah Anda ingin memuat 9 butir acara resmi sidang RAT berstandar UU No. 25/1992? Susunan acara lengkap mulai dari registrasi, pembukaan, LPJ, pandangan umum, hingga pengesahan ketetapan akan diisikan secara otomatis.',
      confirmText: 'Ya, Muat Preset Standar',
      cancelText: 'Batal',
      style: 'primary',
      type: 'primary',
      variant: 'primary',
    });
    if (isConfirmed) {
      loadPresetMutation.mutate();
    }
  };

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
                  disabled={loadPresetMutation.isPending}
                  className="gap-1 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadPresetMutation.isPending ? 'Memuat Preset...' : 'Muat Preset Standar RAT'}
                </Button>
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
              </div>
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

              {/* Bottom Quick Action to Add Agenda Item */}
              {canManage && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenAddAgenda}
                    className="w-full py-3 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center justify-center gap-2 transition-all bg-slate-50/50 hover:bg-indigo-50/40 dark:bg-slate-900/30 dark:hover:bg-indigo-950/20"
                  >
                    <Plus className="w-4 h-4 text-indigo-500" />
                    <span>+ Tambah Butir Acara Baru (Manual)</span>
                  </button>
                </div>
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

      {/* VIEW 2: NASKAH TATA TERTIB SIDANG RAT (END-TO-END STATUTORY DOCUMENT) */}
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
                Cetak Tata Tertib
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
                  Ubah Klausul Khusus
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-6">
            {/* STATUTORY HIGHLIGHT CARDS (4 PILLARS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Asas Hak Suara</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  One Man, One Vote
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Satu anggota memiliki tepat satu hak suara sah tanpa perwakilan bertingkat.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Ambang Kuorum</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Minimal 50% + 1
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Syarat legalitas yuridis pengambilan keputusan rapat anggota menurut UU.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hak Bicara & Interupsi</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Maksimal 3 Menit
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Melalui izin pimpinan sidang dengan menyebutkan jenis interupsi resmi.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase">
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Ketetapan Sidang</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Sah & Mengikat (TAP RAT)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Seluruh keputusan dituangkan dalam surat ketetapan yang mengikat kepengurusan.
                </p>
              </div>
            </div>

            {/* CUSTOM RULES BOX (IF SAVED IN DATABASE) */}
            {meetingDescription && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/70 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Klausul Khusus & Ketentuan Tambahan Sidang Tahun Buku Ini:</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed pl-6">
                  {meetingDescription}
                </p>
              </div>
            )}

            {/* OFFICIAL 7 ARTICLES (PASAL-PASAL RESMI TATA TERTIB SIDANG RAT) */}
            <div className="space-y-4 pt-2">
              {/* PASAL 1 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">1</span>
                    Pasal 1: Nama, Kedudukan, dan Dasar Hukum
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Landasan Yuridis</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Rapat Anggota Tahunan (RAT) merupakan pemegang kekuasaan tertinggi dalam tata kehidupan koperasi.<br />
                  2. RAT ini diselenggarakan berdasarkan Undang-Undang Republik Indonesia Nomor 25 Tahun 1992 tentang Perkoperasian (Pasal 22 s/d Pasal 27), Peraturan Menteri Koperasi dan UKM, serta Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) Koperasi.
                </p>
              </div>

              {/* PASAL 2 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">2</span>
                    Pasal 2: Peserta Sidang, Hak Suara, dan Hak Bicara
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Hak Anggota</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Peserta RAT adalah seluruh anggota aktif koperasi yang telah terdaftar resmi pada buku daftar anggota dan melakukan presensi kehadiran.<br />
                  2. Dalam pengambilan keputusan, berlaku prinsip perkoperasian <strong>Satu Anggota Satu Suara (One Man, One Vote)</strong> tanpa memandang besaran simpanan pokok maupun simpanan wajib.<br />
                  3. Setiap peserta berhak mengajukan usul, saran, dan pertanyaan dengan seizin Pimpinan Sidang secara tertib dan konstruktif.
                </p>
              </div>

              {/* PASAL 3 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">3</span>
                    Pasal 3: Kuorum dan Keabsahan Sidang
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Syarat Sah Pleno</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Sidang RAT dinyatakan sah dan berhak mengambil keputusan yang mengikat apabila dihadiri oleh lebih dari separuh jumlah anggota aktif berhak suara (50% + 1).<br />
                  2. Apabila kuorum belum tercapai pada waktu yang ditentukan, sidang dapat diskors selama 1 x 15 menit. Apabila setelah skors kuorum tetap belum terpenuhi, sidang dilanjutkan dan keputusannya sah mengikat sesuai kesepakatan anggota yang hadir.
                </p>
              </div>

              {/* PASAL 4 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">4</span>
                    Pasal 4: Pimpinan Sidang (Presidium Sidang)
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Wewenang Pimpinan</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Sidang RAT dibuka oleh Pengurus/Pimpinan Sidang Sementara hingga disahkannya Tata Tertib dan terpilihnya Presidium Sidang Pleno definitif.<br />
                  2. Presidium Sidang beranggotakan Ketua, Sekretaris, dan Anggota yang dipilih dari dan oleh peserta rapat anggota.<br />
                  3. Pimpinan Sidang berwenang memimpin jalannya pleno, menjaga ketertiban, mengalokasikan waktu bicara, dan mengetuk palu pengesahan ketetapan sidang.
                </p>
              </div>

              {/* PASAL 5 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">5</span>
                    Pasal 5: Tata Cara Interupsi dan Waktu Berbicara
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Ketertiban Pleno</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Peserta yang ingin menyampaikan pandangan atau interupsi wajib mengangkat tangan dan menunggu persetujuan Pimpinan Sidang.<br />
                  2. Interupsi hanya diperkenankan untuk: (a) <em>Point of Order</em> (penegakan tata tertib), (b) <em>Point of Information</em> (memberikan data faktual), atau (c) <em>Point of Clarification</em> (meluruskan kekeliruan).<br />
                  3. Setiap peserta diberikan alokasi waktu berbicara maksimal 3 (tiga) menit untuk menjaga kelancaran durasi persidangan.
                </p>
              </div>

              {/* PASAL 6 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">6</span>
                    Pasal 6: Mekanisme Pengambilan Keputusan & e-Voting
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Putusan Sidang</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Keputusan sidang diutamakan melalui asas musyawarah untuk mencapai mufakat.<br />
                  2. Apabila musyawarah mufakat tidak tercapai setelah diupayakan sungguh-sungguh, maka keputusan diambil berdasarkan suara terbanyak (voting).<br />
                  3. Pemungutan suara dapat diselenggarakan secara digital melalui sistem <strong>e-Voting Absenta Cooperative</strong> atau pemungutan suara terbuka/tertutup secara langsung.
                </p>
              </div>

              {/* PASAL 7 */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">7</span>
                    Pasal 7: Risalah Sidang dan Surat Ketetapan (TAP RAT)
                  </h4>
                  <Badge variant="outline" className="text-[10px]">Kepastian Hukum</Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  1. Seluruh jalannya persidangan dan dinamika rapat wajib dicatat oleh Sekretaris Sidang dalam Berita Acara Rapat.<br />
                  2. Seluruh hasil keputusan yang disetujui dituangkan dalam <strong>Surat Ketetapan Resmi Rapat Anggota Tahunan (TAP RAT)</strong> yang ditandatangani oleh Presidium Sidang dan sah mengikat seluruh Pengurus, Pengawas, dan Anggota Koperasi.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* SECTION 3: DAFTAR SURAT KETETAPAN (TAP RAT) SELALU TERSEDIA */}
      <SectionCard
        title="Daftar Surat Ketetapan Resmi Sidang (TAP RAT)"
        fullWidth
        className="space-y-4"
        actions={
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
