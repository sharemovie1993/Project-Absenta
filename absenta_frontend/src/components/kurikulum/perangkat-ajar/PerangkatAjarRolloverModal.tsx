import React, { useState, useMemo } from 'react';
import { Copy, Loader2, Sparkles, AlertCircle, ArrowRight, CheckCircle2, User, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { kurikulumApi } from '@/api/kurikulum.api';
import toast from 'react-hot-toast';

export interface PerangkatAjarRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  currentTargetTpId?: string;
  currentGuruId?: string;
  currentGuruNama?: string;
  isGuruContext?: boolean;
  activeEducators?: { id: string; nama_guru: string; nip?: string }[];
}

export const PerangkatAjarRolloverModal: React.FC<PerangkatAjarRolloverModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentTargetTpId,
  currentGuruId,
  currentGuruNama,
  isGuruContext = false,
  activeEducators = [],
}) => {
  const { rawList: tahunPelajaranList, activeYear } = useTahunPelajaranOptions();

  // Target Year: Defaults to currentTargetTpId or activeYear
  const effectiveTargetTpId = currentTargetTpId || activeYear?.id || '';

  // Source Year: Pick candidate source year (e.g. year before target)
  const [sourceTpId, setSourceTpId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>(isGuruContext ? (currentGuruId || '') : '');
  const [mode, setMode] = useState<'skip_existing' | 'overwrite'>('skip_existing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select candidate source year when modal opens or target changes
  React.useEffect(() => {
    if (isOpen && tahunPelajaranList.length > 0) {
      if (!sourceTpId) {
        const currentIdx = tahunPelajaranList.findIndex((t) => t.id === effectiveTargetTpId);
        const candidateSource =
          tahunPelajaranList[currentIdx + 1] ||
          tahunPelajaranList.find((t) => t.id !== effectiveTargetTpId);
        if (candidateSource) {
          setSourceTpId(candidateSource.id);
        }
      }
      if (isGuruContext && currentGuruId) {
        setSelectedGuruId(currentGuruId);
      }
    }
  }, [isOpen, effectiveTargetTpId, tahunPelajaranList, sourceTpId, isGuruContext, currentGuruId]);

  const targetTpObj = useMemo(() => {
    return tahunPelajaranList.find((t) => t.id === effectiveTargetTpId) || activeYear;
  }, [tahunPelajaranList, effectiveTargetTpId, activeYear]);

  const sourceTpOptions = useMemo(() => {
    return tahunPelajaranList.filter((tp) => tp.id !== effectiveTargetTpId);
  }, [tahunPelajaranList, effectiveTargetTpId]);

  const handleExecuteRollover = async () => {
    if (!sourceTpId || !effectiveTargetTpId) {
      toast.error('Silakan pilih tahun pelajaran sumber dan target');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await kurikulumApi.rolloverPerangkatAjar({
        source_tahun_pelajaran_id: sourceTpId,
        target_tahun_pelajaran_id: effectiveTargetTpId,
        guru_id: selectedGuruId || undefined,
        mode,
      });

      if (res.success) {
        toast.success(res.message || 'Perangkat ajar berhasil disalin!');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        toast.error(res.message || 'Gagal menyalin perangkat ajar');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menyalin perangkat ajar';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Salin Perangkat Ajar dari Tahun Lalu (Rollover)"
      description="Duplikasi perangkat ajar (ATP, Modul Ajar, Silabus, Prota/Promes) dari tahun pelajaran sebelumnya ke tahun pelajaran aktif."
      size="md"
    >
      <div className="space-y-4 p-1">
        {/* Info Banner */}
        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
          <Copy className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <span className="font-bold">Siklus 1-Klik Rollover:</span> Berkas dan susunan perangkat ajar dari tahun lalu akan disalin secara otomatis ke tahun pelajaran baru dengan status <span className="font-bold text-amber-700 dark:text-amber-300">Menunggu Review (Pending)</span> agar dapat diverifikasi oleh Kurikulum.
          </div>
        </div>

        {/* Source and Target Year Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Source Year */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun Sumber (Asal Salinan)
            </label>
            <select
              value={sourceTpId}
              onChange={(e) => setSourceTpId(e.target.value)}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Pilih Tahun Sumber --</option>
              {sourceTpOptions.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.tahun} {tp.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Year */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahun Target (Tujuan Salinan)
            </label>
            <div className="h-10 px-3.5 flex items-center bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white">
              <span className="truncate">{targetTpObj?.tahun || 'Tahun Pelajaran Aktif'}</span>
              <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                Target
              </span>
            </div>
          </div>
        </div>

        {/* Guru Selector (For Kurikulum) or Fixed Badge (For Teacher) */}
        {!isGuruContext ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Cakupan Pendidik / Guru
            </label>
            <div className="relative">
              <select
                value={selectedGuruId}
                onChange={(e) => setSelectedGuruId(e.target.value)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">✨ Seluruh Guru Pendidik (Salin Massal)</option>
                {activeEducators.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_guru} {g.nip ? `(${g.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pilih guru tertentu untuk menyalin berkas milik guru tersebut, atau pilih &apos;Seluruh Guru&apos; untuk rollover serentak satu sekolah.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2.5">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-500 dark:text-slate-400">Guru: </span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {currentGuruNama || 'Pendidik Saya'}
              </span>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Penanganan Dokumen yang Sudah Ada
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                mode === 'skip_existing'
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="rollover_mode"
                checked={mode === 'skip_existing'}
                onChange={() => setMode('skip_existing')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <div className="font-bold">Lewati jika ada (Rekomendasi)</div>
                <div className="text-[11px] opacity-75 mt-0.5">Dokumen yang sudah diunggah di tahun target tidak akan diubah/ditimpa.</div>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                mode === 'overwrite'
                  ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="rollover_mode"
                checked={mode === 'overwrite'}
                onChange={() => setMode('overwrite')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <div className="font-bold">Perbarui / Timpa</div>
                <div className="text-[11px] opacity-75 mt-0.5">Dokumen jenis sama di tahun target akan diperbarui dengan berkas tahun sumber.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleExecuteRollover}
            disabled={isSubmitting || !sourceTpId || !effectiveTargetTpId}
            className="rounded-xl px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Sedang Menyalin...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                Salin Sekarang
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
