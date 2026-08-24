import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { Hari, piketGuruApi } from '@/api/piketGuru.api';
import { HARI_LIST } from '@/constants/day.constants';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Square, Search } from 'lucide-react';

const bulkSchema = z.object({
  guruIds: z.array(z.string()).min(1, 'Pilih minimal satu guru untuk penugasan massal'),
  hari: z.string().min(1, 'Hari tugas wajib dipilih'),
  pos: z.string().min(1, 'Pos tugas piket wajib diisi'),
});

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeHari: Hari;
  selectedTpId: string;
  selectedSemId: string;
  guruList: Array<{ id: string; nama_guru: string; nip?: string }>;
  onSuccess: () => void;
  getSlotStartTime: (slot: number) => string;
  getSlotEndTime: (slot: number) => string;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = React.memo(({
  isOpen,
  onClose,
  activeHari,
  selectedTpId,
  selectedSemId,
  guruList,
  onSuccess,
  getSlotStartTime,
  getSlotEndTime,
}) => {
  const queryClient = useQueryClient();
  const [bulkGuruIds, setBulkGuruIds] = useState<string[]>([]);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkHari, setBulkHari] = useState<Hari>(activeHari);
  const [bulkPos, setBulkPos] = useState('Piket Umum');
  const [bulkSlotMulai, setBulkSlotMulai] = useState(1);
  const [bulkSlotSelesai, setBulkSlotSelesai] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const filteredGurus = useMemo(() => {
    if (!bulkSearchTerm.trim()) return guruList;
    const q = bulkSearchTerm.toLowerCase();
    return (guruList ?? []).filter(g =>
      (g.nama_guru || '').toLowerCase().includes(q) ||
      (g.nip || '').toLowerCase().includes(q)
    );
  }, [guruList, bulkSearchTerm]);

  const handleToggleSelect = useCallback((id: string) => {
    setBulkGuruIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (bulkGuruIds.length === filteredGurus.length) {
      setBulkGuruIds([]);
    } else {
      setBulkGuruIds(filteredGurus.map(g => g.id));
    }
  }, [bulkGuruIds.length, filteredGurus]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bulkSchema.safeParse({
      guruIds: bulkGuruIds,
      hari: bulkHari,
      pos: bulkPos,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data penugasan massal belum lengkap');
      return;
    }
    try {
      setSubmitting(true);
      const promises = bulkGuruIds.map(guruId => 
        piketGuruApi.create({
          tahun_pelajaran_id: selectedTpId,
          semester_id: selectedSemId,
          guru_id: guruId,
          hari: bulkHari,
          pos_piket: bulkPos,
          slot_mulai: bulkSlotMulai,
          slot_selesai: bulkSlotSelesai,
          jam_mulai: getSlotStartTime(bulkSlotMulai),
          jam_selesai: getSlotEndTime(bulkSlotSelesai),
        })
      );
      await Promise.all(promises);
      toast.success(`Berhasil menugaskan ${bulkGuruIds.length} guru piket!`);
      queryClient.invalidateQueries({ queryKey: ['jadwal-piket-list'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menugaskan massal';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [bulkGuruIds, bulkHari, bulkPos, bulkSlotMulai, bulkSlotSelesai, selectedTpId, selectedSemId, getSlotStartTime, getSlotEndTime, queryClient, onSuccess, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penugasan Guru Piket Massal"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="bulk-hari-select" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hari Tugas
            </label>
            <SearchableSelect
              id="bulk-hari-select"
              aria-label="Pilih hari tugas massal"
              value={bulkHari}
              onValueChange={(val) => setBulkHari(val as Hari)}
              options={HARI_LIST.map(h => ({ value: h.id, label: h.label }))}
              placeholder="Pilih Hari"
            />
          </div>
          <div>
            <label htmlFor="bulk-pos-input" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pos / Wilayah Piket
            </label>
            <Input
              id="bulk-pos-input"
              aria-label="Pos piket massal"
              value={bulkPos}
              onChange={(e) => setBulkPos(e.target.value)}
              placeholder="Contoh: Piket Umum"
              className="rounded-xl"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Pilih Guru ({bulkGuruIds.length} terpilih)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleSelectAll}
              className="text-[10px] font-bold text-indigo-600"
            >
              {bulkGuruIds.length === filteredGurus.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="bulk-search-guru"
              aria-label="Cari guru untuk penugasan massal"
              placeholder="Cari nama guru..."
              value={bulkSearchTerm}
              onChange={(e) => setBulkSearchTerm(e.target.value)}
              className="pl-9 rounded-xl text-xs"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            {filteredGurus?.map(guru => {
              const selected = bulkGuruIds.includes(guru.id);
              return (
                <div
                  key={guru.id}
                  onClick={() => handleToggleSelect(guru.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                    selected ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs">{guru.nama_guru}</p>
                    <p className="text-[10px] text-slate-400">NIP: {guru.nip || '-'}</p>
                  </div>
                  {selected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="toolbarPrimary" size="toolbar" disabled={submitting || bulkGuruIds.length === 0}>
            {submitting ? 'Memproses...' : `Tugaskan ${bulkGuruIds.length} Guru`}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default BulkAssignModal;
