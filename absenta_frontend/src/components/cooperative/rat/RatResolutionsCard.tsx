import React, { useState } from 'react';
import { SectionCard, Badge, Button } from '../../ui';
import {
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Printer,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import useConfirm from '../../../hooks/useConfirm';
import type { CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';
import { RatResolutionPrintModal } from './RatResolutionPrintModal';

interface RatResolutionsCardProps {
  meetingId: string;
  resolutions: CoopResolutionItem[];
  canManage: boolean;
  onOpenAddResolution: () => void;
  onEditResolution: (resolution: CoopResolutionItem) => void;
}

export const RatResolutionsCard: React.FC<RatResolutionsCardProps> = React.memo(({
  meetingId,
  resolutions,
  canManage,
  onOpenAddResolution,
  onEditResolution,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedForPrint, setSelectedForPrint] = useState<CoopResolutionItem | null>(null);

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

  // Mutation: Load Preset Resolutions (Idempotent 5 Standard TAP RAT)
  const loadPresetResolutionsMutation = useMutation({
    mutationFn: async (options?: { forceReset?: boolean }) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/resolutions/preset`, options || {});
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('5 Draf Surat Ketetapan (TAP RAT) standar UU No. 25/1992 berhasil dimuat!');
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal memuat preset ketetapan';
      toast.error(errorMsg);
    }
  });

  const handleLoadPresetResolutions = async () => {
    if ((resolutions || []).length > 0) {
      const proceed = await confirm({
        title: 'Reset & Pasang Preset Draf TAP RAT?',
        message: `Sidang ini telah memiliki ${resolutions.length} surat ketetapan. Memuat ulang preset akan mengganti seluruh draf menjadi 5 draf standar yuridis koperasi (Jadwal/Tatib, LPJ, LHP, SHU, dan RK/RAPBK). Lanjutkan?`,
        confirmText: 'Ya, Pasang Ulang Preset',
        cancelText: 'Batal',
        type: 'warning',
      });
      if (proceed) {
        loadPresetResolutionsMutation.mutate({ forceReset: true });
      }
      return;
    }

    const proceed = await confirm({
      title: 'Muat Draf Surat Ketetapan Standar RAT?',
      message: 'Sistem akan otomatis menerbitkan 5 Draf Surat Ketetapan (TAP RAT) resmi berstandar UU Perkoperasian No. 25/1992 yang siap dibahas dan disahkan oleh Presidium Sidang.',
      confirmText: 'Muat 5 Draf TAP RAT',
      cancelText: 'Batal',
    });
    if (proceed) {
      loadPresetResolutionsMutation.mutate({ forceReset: false });
    }
  };

  const handleDeleteResolution = async (res: CoopResolutionItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Surat Ketetapan Sidang?',
      message: `Apakah Anda yakin ingin menghapus "${res.resolutionNo} - ${res.subject}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Ketetapan',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (isConfirmed) {
      deleteResolutionMutation.mutate(res.id);
    }
  };

  return (
    <>
      <SectionCard
        title="Daftar Surat Ketetapan Resmi Sidang (TAP RAT)"
        fullWidth
        className="space-y-4"
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="toolbar"
                variant="toolbarOutline"
                onClick={handleLoadPresetResolutions}
                disabled={loadPresetResolutionsMutation.isPending}
                className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                {loadPresetResolutionsMutation.isPending ? 'Memuat...' : 'Muat Preset Draf TAP RAT'}
              </Button>
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
            </div>
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

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
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

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedForPrint(res)}
                    className="text-xs gap-1 py-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak / Lihat SK
                  </Button>

                  {canManage && (
                    <div className="flex items-center gap-1">
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
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm space-y-3">
            <p>Belum ada ketetapan resmi yang dicatatkan pada sidang ini.</p>
            {canManage && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleLoadPresetResolutions}
                  disabled={loadPresetResolutionsMutation.isPending}
                  className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Muat 5 Draf TAP Standar UU
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenAddResolution}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Ketetapan Manual
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* PRINT PREVIEW & LEGAL EXPORT MODAL */}
      <RatResolutionPrintModal
        isOpen={Boolean(selectedForPrint)}
        onClose={() => setSelectedForPrint(null)}
        resolution={selectedForPrint}
      />
    </>
  );
});

RatResolutionsCard.displayName = 'RatResolutionsCard';
export default RatResolutionsCard;
