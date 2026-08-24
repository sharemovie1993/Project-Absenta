import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { GuruSelect } from '@/components/common/GuruSelect';
import { Hari, JadwalPiketGuru, piketGuruApi } from '@/api/piketGuru.api';
import { HARI_LIST } from '@/constants/day.constants';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const singleAssignSchema = z.object({
  guruId: z.string().min(1, 'Guru piket wajib dipilih'),
  hari: z.string().min(1, 'Hari tugas wajib dipilih'),
  pos: z.string().min(1, 'Pos tugas piket wajib diisi'),
  slotMulai: z.number().min(1),
  slotSelesai: z.number().min(1),
});

interface SingleAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: JadwalPiketGuru | null;
  activeHari: Hari;
  selectedTpId: string;
  selectedSemId: string;
  isSmk: boolean;
  jurusanList: Array<{ id: string; nama_jurusan: string }>;
  onSuccess: () => void;
  getSlotStartTime: (slot: number) => string;
  getSlotEndTime: (slot: number) => string;
}

export const SingleAssignModal: React.FC<SingleAssignModalProps> = React.memo(({
  isOpen,
  onClose,
  editingItem,
  activeHari,
  selectedTpId,
  selectedSemId,
  isSmk,
  jurusanList,
  onSuccess,
  getSlotStartTime,
  getSlotEndTime,
}) => {
  const queryClient = useQueryClient();
  const [formGuruId, setFormGuruId] = useState('');
  const [formHari, setFormHari] = useState<Hari>(activeHari);
  const [formPos, setFormPos] = useState('Piket Umum');
  const [formSlotMulai, setFormSlotMulai] = useState(1);
  const [formSlotSelesai, setFormSlotSelesai] = useState(10);
  const [formJamMulai, setFormJamMulai] = useState('06:30');
  const [formJamSelesai, setFormJamSelesai] = useState('15:30');
  const [formCatatan, setFormCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormGuruId(editingItem.guru_id);
      setFormHari(editingItem.hari);
      setFormPos(editingItem.pos_piket || 'Piket Umum');
      setFormSlotMulai(editingItem.slot_mulai || 1);
      setFormSlotSelesai(editingItem.slot_selesai || 10);
      setFormJamMulai(editingItem.jam_mulai || '06:30');
      setFormJamSelesai(editingItem.jam_selesai || '15:30');
      setFormCatatan(editingItem.catatan || '');
    } else {
      setFormGuruId('');
      setFormHari(activeHari);
      setFormPos('Piket Umum');
      setFormSlotMulai(1);
      setFormSlotSelesai(10);
      setFormJamMulai(getSlotStartTime(1));
      setFormJamSelesai(getSlotEndTime(10));
      setFormCatatan('');
    }
  }, [editingItem, activeHari, getSlotStartTime, getSlotEndTime]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = singleAssignSchema.safeParse({
      guruId: formGuruId,
      hari: formHari,
      pos: formPos,
      slotMulai: formSlotMulai,
      slotSelesai: formSlotSelesai,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data penugasan belum lengkap');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        tahun_pelajaran_id: selectedTpId,
        semester_id: selectedSemId,
        guru_id: formGuruId,
        hari: formHari,
        pos_piket: formPos,
        slot_mulai: formSlotMulai,
        slot_selesai: formSlotSelesai,
        jam_mulai: formJamMulai,
        jam_selesai: formJamSelesai,
        catatan: formCatatan,
      };

      if (editingItem) {
        await piketGuruApi.update(editingItem.id, payload);
        toast.success('Penugasan piket guru berhasil diperbarui');
      } else {
        await piketGuruApi.create(payload);
        toast.success('Penugasan piket guru baru berhasil ditambahkan');
      }

      queryClient.invalidateQueries({ queryKey: ['jadwal-piket-list'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan penugasan piket';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [formGuruId, formHari, formPos, formSlotMulai, formSlotSelesai, formJamMulai, formJamSelesai, formCatatan, selectedTpId, selectedSemId, editingItem, queryClient, onSuccess, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Penugasan Guru Piket' : 'Tambah Guru Piket Baru'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
        <div>
          <label htmlFor="piket-guru-select" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Pilih Guru Bertugas <span className="text-rose-500">*</span>
          </label>
          <GuruSelect
            id="piket-guru-select"
            aria-label="Pilih guru bertugas piket"
            value={formGuruId}
            onChange={setFormGuruId}
            placeholder="Pilih guru..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="piket-hari-select" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hari Tugas
            </label>
            <SearchableSelect
              id="piket-hari-select"
              aria-label="Pilih hari penugasan"
              value={formHari}
              onValueChange={(val) => setFormHari(val as Hari)}
              options={HARI_LIST.map(h => ({ value: h.id, label: h.label }))}
              placeholder="Pilih Hari"
            />
          </div>
          <div>
            <label htmlFor="piket-pos-input" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pos / Wilayah Piket
            </label>
            <Input
              id="piket-pos-input"
              aria-label="Pos atau wilayah piket"
              value={formPos}
              onChange={(e) => setFormPos(e.target.value)}
              placeholder="Contoh: Piket Gerbang Utama"
              className="rounded-xl"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="piket-slot-mulai" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Slot Jam Ke- (Mulai)
            </label>
            <Input
              id="piket-slot-mulai"
              aria-label="Slot jam mulai"
              type="number"
              min={1}
              max={12}
              value={formSlotMulai}
              onChange={(e) => {
                const s = parseInt(e.target.value) || 1;
                setFormSlotMulai(s);
                setFormJamMulai(getSlotStartTime(s));
              }}
              className="rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="piket-slot-selesai" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Slot Jam Ke- (Selesai)
            </label>
            <Input
              id="piket-slot-selesai"
              aria-label="Slot jam selesai"
              type="number"
              min={1}
              max={12}
              value={formSlotSelesai}
              onChange={(e) => {
                const s = parseInt(e.target.value) || 10;
                setFormSlotSelesai(s);
                setFormJamSelesai(getSlotEndTime(s));
              }}
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <label htmlFor="piket-catatan" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Catatan / Mandat Khusus
          </label>
          <textarea
            id="piket-catatan"
            aria-label="Catatan atau mandat khusus piket"
            rows={2}
            value={formCatatan}
            onChange={(e) => setFormCatatan(e.target.value)}
            placeholder="Contoh: Fokus pemantauan gerbang timur pagi hari..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="toolbarPrimary" size="toolbar" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Penugasan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default SingleAssignModal;
