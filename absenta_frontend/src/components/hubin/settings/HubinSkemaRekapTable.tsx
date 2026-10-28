import React, { useState } from 'react';
import {
  Scale,
  Award,
  CheckCircle2,
  PencilLine,
  Sliders,
  Save,
  X,
} from 'lucide-react';
import { Button, Badge, Modal } from '@/components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '@/api/hubin.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { HubinSettingSummaryRow } from './HubinSettingsRekapTable';

export interface HubinSkemaRekapTableProps {
  rows: HubinSettingSummaryRow[];
  isLoading: boolean;
  activeTahunAjaran?: string;
}

export const HubinSkemaRekapTable: React.FC<HubinSkemaRekapTableProps> = React.memo(({
  rows,
  isLoading,
  activeTahunAjaran,
}) => {
  const queryClient = useQueryClient();
  const [editingRow, setEditingRow] = useState<HubinSettingSummaryRow | null>(null);

  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  const handleOpenEdit = (row: HubinSettingSummaryRow) => {
    setEditingRow(row);
    setFormMode(row.assessmentMode || 'DUDI_ONLY');
    setFormWeightDudi(row.weightDudi ?? 70);
    setFormWeightLaporan(row.weightLaporan ?? 15);
    setFormWeightSidang(row.weightSidang ?? 15);
  };

  const saveSkemaMutation = useMutation({
    mutationFn: (payload: any) => hubinApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      toast.success('Skema & bobot penilaian berhasil disimpan!');
      setEditingRow(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan skema penilaian');
    },
  });

  const handleSaveSkema = () => {
    if (!editingRow) return;

    if (formMode === 'COMPOSITE') {
      const total = formWeightDudi + formWeightLaporan + formWeightSidang;
      if (total !== 100) {
        toast.error(`Total persentase bobot harus pas 100% (Saat ini: ${total}%)`);
        return;
      }
    }

    saveSkemaMutation.mutate({
      tahun_pelajaran_id: editingRow.tahun_pelajaran_id,
      assessmentMode: formMode,
      weightDudi: formWeightDudi,
      weightLaporan: formWeightLaporan,
      weightSidang: formWeightSidang,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Slot Skema &amp; Bobot Penilaian Akhir PKL per Angkatan
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="text-left px-4 py-3.5 w-40">Tahun Pelajaran</th>
              <th className="text-left px-3 py-3.5 w-36">Mode Penilaian</th>
              <th className="text-center px-3 py-3.5 w-28">Bobot DUDI</th>
              <th className="text-center px-3 py-3.5 w-28">Bobot Laporan</th>
              <th className="text-center px-3 py-3.5 w-28">Bobot Sidang</th>
              <th className="text-center px-4 py-3.5 w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((row) => {
              const isActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;
              const isComposite = row.assessmentMode === 'COMPOSITE';

              return (
                <tr
                  key={row.tahun_pelajaran_id}
                  className={cn(
                    'transition-colors',
                    isActive ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  )}
                >
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {row.tahun_ajaran}
                    </span>
                    {isActive && (
                      <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">
                        Aktif Berjalan ★
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3.5">
                    {isComposite ? (
                      <Badge variant="secondary" className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        Komposit (3 Unsur)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-extrabold uppercase">
                        DUDI Tunggal (100%)
                      </Badge>
                    )}
                  </td>

                  <td className="px-3 py-3.5 text-center font-bold">
                    {isComposite ? `${row.weightDudi ?? 70}%` : '100%'}
                  </td>
                  <td className="px-3 py-3.5 text-center font-bold">
                    {isComposite ? `${row.weightLaporan ?? 15}%` : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-center font-bold">
                    {isComposite ? `${row.weightSidang ?? 15}%` : '—'}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(row)}
                      className="text-xs font-bold rounded-xl h-8 gap-1.5 px-3"
                    >
                      <PencilLine size={13} />
                      <span>Atur Bobot</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog Atur Skema */}
      {editingRow && (
        <Modal
          isOpen={Boolean(editingRow)}
          onClose={() => setEditingRow(null)}
          size="md"
          className="p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale size={16} className="text-indigo-600" />
              Skema Bobot — Angkatan {editingRow.tahun_ajaran}
            </h3>
            <button
              type="button"
              onClick={() => setEditingRow(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pilih Mode Penilaian
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormMode('DUDI_ONLY')}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all',
                    formMode === 'DUDI_ONLY'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  DUDI Tunggal (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('COMPOSITE')}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all',
                    formMode === 'COMPOSITE'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  Komposit (3 Unsur)
                </button>
              </div>
            </div>

            {formMode === 'COMPOSITE' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">DUDI (%)</label>
                    <input
                      type="number"
                      value={formWeightDudi}
                      onChange={(e) => setFormWeightDudi(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Laporan (%)</label>
                    <input
                      type="number"
                      value={formWeightLaporan}
                      onChange={(e) => setFormWeightLaporan(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Sidang (%)</label>
                    <input
                      type="number"
                      value={formWeightSidang}
                      onChange={(e) => setFormWeightSidang(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-center font-bold">
                  Total:{' '}
                  <span
                    className={
                      formWeightDudi + formWeightLaporan + formWeightSidang === 100
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }
                  >
                    {formWeightDudi + formWeightLaporan + formWeightSidang}% (Wajib 100%)
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingRow(null)}
                className="text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveSkema}
                disabled={saveSkemaMutation.isPending}
                className="text-xs font-bold rounded-xl bg-indigo-600 text-white"
              >
                {saveSkemaMutation.isPending ? 'Menyimpan...' : 'Simpan Skema'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

HubinSkemaRekapTable.displayName = 'HubinSkemaRekapTable';
export default HubinSkemaRekapTable;
