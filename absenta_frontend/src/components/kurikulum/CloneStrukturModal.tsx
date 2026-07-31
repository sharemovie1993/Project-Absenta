import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, ArrowRight, History } from 'lucide-react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'react-hot-toast';

interface CloneStrukturModalProps {
  isOpen: boolean;
  onClose: () => void;
  years: Array<{ id: string; tahun: string; is_active?: boolean }>;
  currentTargetTahunId?: string;
  onSuccess?: () => void;
}

const parseStartYear = (tahunStr: string): number => {
  const match = (tahunStr || '').match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
};

export const CloneStrukturModal: React.FC<CloneStrukturModalProps> = ({
  isOpen,
  onClose,
  years,
  currentTargetTahunId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [fromTahunId, setFromTahunId] = useState<string>('');
  const [toTahunId, setToTahunId] = useState<string>('');
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [allowBackwardClone, setAllowBackwardClone] = useState<boolean>(false);

  // Set default selection
  useEffect(() => {
    if (years && years.length > 0) {
      const activeYear = years.find((y) => y.is_active);
      const targetId = currentTargetTahunId || activeYear?.id || years[0].id;
      setToTahunId(targetId);

      // Default source to a year other than target
      const availableSources = years.filter((y) => y.id !== targetId);
      if (availableSources.length > 0) {
        setFromTahunId(availableSources[0].id);
      }
    }
  }, [years, currentTargetTahunId, isOpen]);

  const fromYearObj = useMemo(() => years?.find((y) => y.id === fromTahunId), [years, fromTahunId]);
  const toYearObj = useMemo(() => years?.find((y) => y.id === toTahunId), [years, toTahunId]);

  // Check if user is cloning backwards (from newer year to older year)
  const isCloningBackward = useMemo(() => {
    if (!fromYearObj || !toYearObj) return false;
    const fromStart = parseStartYear(fromYearObj.tahun);
    const toStart = parseStartYear(toYearObj.tahun);
    return fromStart > 0 && toStart > 0 && fromStart > toStart;
  }, [fromYearObj, toYearObj]);

  // Reset backward checkbox if target changes to non-backward
  useEffect(() => {
    if (!isCloningBackward) {
      setAllowBackwardClone(false);
    }
  }, [isCloningBackward]);

  const cloneMutation = useMutation({
    mutationFn: (payload: { from_tahun_pelajaran_id: string; to_tahun_pelajaran_id: string; overwrite: boolean }) =>
      kurikulumApi.cloneStruktur(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur-summary'] });
      toast.success(res.message || 'Struktur kurikulum berhasil disalin!');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menyalin struktur kurikulum';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromTahunId || !toTahunId) {
      toast.error('Pilih Tahun Pelajaran Asal dan Tujuan');
      return;
    }
    if (fromTahunId === toTahunId) {
      toast.error('Tahun Pelajaran Asal dan Tujuan tidak boleh sama');
      return;
    }
    if (isCloningBackward && !allowBackwardClone) {
      toast.error('Centang persetujuan salin ke Tahun Pelajaran terlama (backfill data historis) terlebih dahulu');
      return;
    }

    cloneMutation.mutate({
      from_tahun_pelajaran_id: fromTahunId,
      to_tahun_pelajaran_id: toTahunId,
      overwrite,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salin / Clone Struktur Kurikulum"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {/* Banner Info */}
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-850 rounded-2xl flex items-start gap-3">
          <Copy className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
              Duplikasi Struktur Kurikulum
            </h4>
            <p className="text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed font-medium">
              Seluruh alokasi Jam Pelajaran (JP), tingkat kelas, kelompok mapel, dan pemetaan jurusan dari Tahun Pelajaran Asal akan disalin secara otomatis ke Tahun Pelajaran Tujuan.
            </p>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Source Year */}
          <div className="md:col-span-5 space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <label htmlFor="fromTahunId" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Tahun Pelajaran Asal
            </label>
            <select
              id="fromTahunId"
              value={fromTahunId}
              onChange={(e) => setFromTahunId(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            >
              <option value="" disabled>Pilih Tahun Asal...</option>
              {years?.map((y) => (
                <option key={y.id} value={y.id} disabled={y.id === toTahunId}>
                  {y.tahun} {y.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-slate-400 font-medium">Sumber data struktur yang akan diduplikasi.</p>
          </div>

          {/* Direction Arrow */}
          <div className="md:col-span-1 flex justify-center my-1 md:my-0">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
              <ArrowRight className="w-4 h-4 hidden md:block" />
              <ArrowRight className="w-4 h-4 md:hidden rotate-90" />
            </div>
          </div>

          {/* Target Year */}
          <div className="md:col-span-5 space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <label htmlFor="toTahunId" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Tahun Pelajaran Tujuan
            </label>
            <select
              id="toTahunId"
              value={toTahunId}
              onChange={(e) => setToTahunId(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            >
              <option value="" disabled>Pilih Tahun Tujuan...</option>
              {years?.map((y) => (
                <option key={y.id} value={y.id} disabled={y.id === fromTahunId}>
                  {y.tahun} {y.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-slate-400 font-medium">Tahun ajaran yang akan menerima duplikasi.</p>
          </div>
        </div>

        {/* Backward Cloning Warning & Checkbox (For Backfilling Historical Data) */}
        {isCloningBackward && (
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2.5 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                Deteksi Menyalin ke Tahun Pelajaran Lebih Lama (Backfill Data Historis)
              </h4>
            </div>
            <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90 leading-relaxed font-medium">
              Anda sedang menyalin struktur kurikulum dari tahun lebih baru (<strong>{fromYearObj?.tahun}</strong>) ke tahun yang lebih lama/arsip (<strong>{toYearObj?.tahun}</strong>) untuk melengkapi data historis lama di platform.
            </p>
            <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={allowBackwardClone}
                onChange={(e) => setAllowBackwardClone(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-blue-300 dark:border-blue-700"
              />
              <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                Izinkan menyalin ke Tahun Pelajaran terlama (Backfill data historis)
              </span>
            </label>
          </div>
        )}

        {/* Options */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Timpa (Overwrite) data struktur kurikulum yang sudah ada pada Tahun Pelajaran Tujuan
            </span>
          </label>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-7 font-medium leading-relaxed">
            {overwrite
              ? '⚠️ Perhatian: Seluruh data struktur kurikulum yang ada di tahun tujuan akan DIHAPUS dan digantikan sepenuhnya dengan data dari tahun asal.'
              : 'ℹ️ Opsi gabung: Hanya menyalin mata pelajaran yang BELUM ADA di tahun tujuan. Data existing di tahun tujuan tidak akan terhapus.'}
          </p>
        </div>

        {/* Summary Card */}
        {fromYearObj && toYearObj && (
          <div className="p-3 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-slate-300">
            Proses: Menyalin Struktur <span className="text-indigo-600 dark:text-indigo-400">{fromYearObj.tahun}</span> &rarr; <span className="text-indigo-600 dark:text-indigo-400">{toYearObj.tahun}</span>
          </div>
        )}

        <ModalFooter className="px-0 pt-3">
          <Button variant="ghost" type="button" onClick={onClose} className="rounded-xl font-bold">
            BATAL
          </Button>
          <Button
            type="submit"
            isLoading={cloneMutation.isPending}
            disabled={isCloningBackward && !allowBackwardClone}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={14} />
            PROSES SALIN STRUKTUR
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default CloneStrukturModal;
