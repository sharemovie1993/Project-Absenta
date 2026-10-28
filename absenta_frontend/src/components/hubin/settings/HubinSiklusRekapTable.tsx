import React, { useState, useCallback } from 'react';
import {
  RotateCcw,
  PencilLine,
  Save,
  X,
  Camera,
  FileCheck,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '@/api/hubin.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { HubinSettingSummaryRow } from './HubinSettingsRekapTable';

export interface HubinSiklusRekapTableProps {
  rows: HubinSettingSummaryRow[];
  isLoading: boolean;
  activeTahunAjaran?: string;
  readOnly?: boolean;
}

const CYCLE_MODE_LABELS: Record<string, { label: string; desc: string; badgeClass: string }> = {
  THREE_CYCLE: {
    label: '3 Siklus Standar Kemendikbud',
    desc: 'Siklus 1: Antar/Orientasi • Siklus 2: Monitoring Tengah • Siklus 3: Jemput/Penarikan',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200',
  },
  FOUR_CYCLE: {
    label: '4 Siklus Intensif Vokasi',
    desc: 'Siklus 1: Antar • Siklus 2: Monitoring Tengah • Siklus 3: Verifikasi Laporan • Siklus 4: Jemput',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200',
  },
  CUSTOM: {
    label: 'Fleksibel / Kustom',
    desc: 'Frekuensi kunjungan disesuaikan dengan kebutuhan DUDI mitra',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200',
  },
};

const CYCLE_OPTIONS: Array<{
  mode: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM';
  title: string;
  desc: string;
  defaultTarget: number;
}> = [
  {
    mode: 'THREE_CYCLE',
    title: '3 Siklus Standar Kemendikbudristek (Rekomendasi Vokasi)',
    desc: '1. Penyerahan/Antar Siswa & Orientasi DUDI • 2. Monitoring Tengah/Evaluasi Progres • 3. Penjemputan/Penarikan Siswa.',
    defaultTarget: 3,
  },
  {
    mode: 'FOUR_CYCLE',
    title: '4 Siklus Intensif Vokasi (Khusus Industri Berbobot Tinggi)',
    desc: '1. Penyerahan • 2. Monitoring Tengah • 3. Verifikasi Draf Laporan & Pra-Sidang • 4. Penjemputan & Evaluasi Nilai DUDI.',
    defaultTarget: 4,
  },
  {
    mode: 'CUSTOM',
    title: 'Fleksibel / Kustom Bebas',
    desc: 'Jumlah kunjungan dapat ditentukan bebas berdasarkan kesepakatan MoU sekolah dengan mitra DUDI.',
    defaultTarget: 3,
  },
];

export const HubinSiklusRekapTable: React.FC<HubinSiklusRekapTableProps> = React.memo(({
  rows,
  isLoading,
  activeTahunAjaran,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const [editingRow, setEditingRow] = useState<HubinSettingSummaryRow | null>(null);

  const [formMode, setFormMode] = useState<'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM'>('THREE_CYCLE');
  const [formTarget, setFormTarget] = useState<number>(3);
  const [formRequirePhoto, setFormRequirePhoto] = useState<boolean>(true);
  const [formRequireSignature, setFormRequireSignature] = useState<boolean>(true);
  const [formRequireJournal, setFormRequireJournal] = useState<boolean>(true);

  const handleOpenEdit = useCallback((row: HubinSettingSummaryRow) => {
    if (readOnly) return;
    setEditingRow(row);
    const mode = row.visitCycleMode || 'THREE_CYCLE';
    setFormMode(mode);
    setFormTarget(row.visitCycleTarget || (mode === 'FOUR_CYCLE' ? 4 : 3));
    setFormRequirePhoto(row.visitRequirePhoto !== false);
    setFormRequireSignature(row.visitRequireSignature !== false);
    setFormRequireJournal(row.visitRequireJournal !== false);
  }, [readOnly]);

  const handleSelectMode = (mode: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM') => {
    setFormMode(mode);
    if (mode === 'THREE_CYCLE') setFormTarget(3);
    else if (mode === 'FOUR_CYCLE') setFormTarget(4);
  };

  const saveSiklusMutation = useMutation({
    mutationFn: (payload: {
      tahun_pelajaran_id?: string;
      visitCycleMode: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM';
      visitCycleTarget: number;
      visitRequirePhoto: boolean;
      visitRequireSignature: boolean;
      visitRequireJournal: boolean;
    }) => hubinApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      toast.success('Pola siklus kunjungan industri berhasil disimpan!');
      setEditingRow(null);
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || 'Gagal menyimpan pola siklus kunjungan');
    },
  });

  const handleSave = () => {
    if (!editingRow) return;
    if (formTarget < 1) {
      toast.error('Target kunjungan minimal 1 kali per industri');
      return;
    }

    saveSiklusMutation.mutate({
      tahun_pelajaran_id: editingRow.tahun_pelajaran_id,
      visitCycleMode: formMode,
      visitCycleTarget: Number(formTarget),
      visitRequirePhoto: formRequirePhoto,
      visitRequireSignature: formRequireSignature,
      visitRequireJournal: formRequireJournal,
    });
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 w-44">Tahun Pelajaran</th>
              <th className="py-3.5 px-4">Pola Siklus Monitoring</th>
              <th className="py-3.5 px-4 text-center w-36">Target Kunjungan</th>
              <th className="py-3.5 px-4">Instrumen Bukti Wajib</th>
              <th className="py-3.5 px-4 text-right w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCcw size={16} className="animate-spin text-indigo-500" />
                    <span>Memuat slot siklus kunjungan...</span>
                  </div>
                </td>
              </tr>
            ) : (rows || [])?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada data slot tahun pelajaran.
                </td>
              </tr>
            ) : (
              (rows || [])?.map((row) => {
                const modeKey = row.visitCycleMode || 'THREE_CYCLE';
                const modeMeta = CYCLE_MODE_LABELS[modeKey] || CYCLE_MODE_LABELS.THREE_CYCLE;
                const target = row.visitCycleTarget || (modeKey === 'FOUR_CYCLE' ? 4 : 3);
                const isCurrentActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;

                return (
                  <tr
                    key={row.tahun_pelajaran_id}
                    className={cn(
                      'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors',
                      isCurrentActive && 'bg-indigo-50/30 dark:bg-indigo-950/20'
                    )}
                  >
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          TP {row.tahun_ajaran}
                        </span>
                      </div>
                      {isCurrentActive && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200">
                          ★ Aktif Berjalan
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <span className={cn('inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border', modeMeta.badgeClass)}>
                          {modeMeta.label}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {modeMeta.desc}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-center">
                      <span className="inline-flex items-center justify-center font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {target}x Kunjungan
                      </span>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {row.visitRequirePhoto !== false && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 px-2 py-0.5 rounded-md">
                            <Camera size={12} /> Foto GPS
                          </span>
                        )}
                        {row.visitRequireSignature !== false && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <FileCheck size={12} /> TTD Industri
                          </span>
                        )}
                        {row.visitRequireJournal !== false && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 px-2 py-0.5 rounded-md">
                            <BookOpen size={12} /> Cek Jurnal
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-right">
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(row)}
                          className="font-bold text-xs border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl"
                        >
                          <PencilLine size={13} className="mr-1" />
                          Atur Siklus
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {(rows || [])?.map((row) => {
          const modeKey = row.visitCycleMode || 'THREE_CYCLE';
          const modeMeta = CYCLE_MODE_LABELS[modeKey] || CYCLE_MODE_LABELS.THREE_CYCLE;
          const target = row.visitCycleTarget || (modeKey === 'FOUR_CYCLE' ? 4 : 3);
          const isCurrentActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;

          return (
            <div
              key={row.tahun_pelajaran_id}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                  TP {row.tahun_ajaran}
                </span>
                {isCurrentActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    ★ Aktif
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border', modeMeta.badgeClass)}>
                  {modeMeta.label}
                </span>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {modeMeta.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target: {target}x Kunjungan
                </span>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(row)}
                    className="text-xs font-bold text-indigo-600 rounded-xl"
                  >
                    <PencilLine size={13} className="mr-1" />
                    Atur
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog Atur Pola Siklus */}
      {editingRow && (
        <Modal
          isOpen={Boolean(editingRow)}
          onClose={() => setEditingRow(null)}
          size="lg"
          className="p-0 overflow-hidden"
        >
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-indigo-300">
                <RotateCcw size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Pengaturan Pola Siklus Kunjungan Industri</h3>
                <p className="text-[11px] text-slate-300">
                  Angkatan Tahun Pelajaran: <span className="font-bold text-amber-300">TP {editingRow.tahun_ajaran}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingRow(null)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
            {/* 1. Pilih Pola Siklus */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Pilih Standar Siklus Kunjungan:
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {CYCLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => handleSelectMode(opt.mode)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3',
                      formMode === opt.mode
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0',
                      formMode === opt.mode ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    )}>
                      {formMode === opt.mode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Target Frekuensi Kunjungan */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <label htmlFor="input-target-kunjungan" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Target Kunjungan per Pembimbing ke DUDI:
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="input-target-kunjungan"
                  aria-label="Target jumlah kunjungan"
                  type="number"
                  min={1}
                  max={12}
                  value={formTarget}
                  onChange={(e) => setFormTarget(Number(e.target.value) || 1)}
                  className="w-28 font-bold text-center"
                />
                <span className="text-xs font-bold text-slate-500">Kali Kunjungan / Periode PKL</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Angka ini menjadi dasar kuota BAP kunjungan dan klaim SPPD perjalanan dinas guru pembimbing.
              </p>
            </div>

            {/* 3. Instrumen Validasi Wajib */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Instrumen Bukti Kunjungan yang Wajib Diunggah Guru Pembimbing:
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formRequirePhoto}
                    onChange={(e) => setFormRequirePhoto(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <Camera size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Wajib Foto Bersama Pembimbing Industri (Kamera Geotagging GPS Real-Time)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formRequireSignature}
                    onChange={(e) => setFormRequireSignature(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <FileCheck size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Wajib Tanda Tangan Elektronik / Foto Lembar TTD & Cap DUDI
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formRequireJournal}
                    onChange={(e) => setFormRequireJournal(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <BookOpen size={16} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Wajib Checklist Verifikasi Jurnal PKL Siswa di Tempat
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingRow(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={saveSiklusMutation.isPending}
                className="font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Save size={15} />
                {saveSiklusMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Siklus'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

HubinSiklusRekapTable.displayName = 'HubinSiklusRekapTable';
export default HubinSiklusRekapTable;
