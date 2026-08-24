import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input, SearchableSelect } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  form: {
    jenjang: string;
    judul: string;
    jenis: string;
    keterangan: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    jenjang: string;
    judul: string;
    jenis: string;
    keterangan: string;
  }>>;
  jenjangSelectOptions: Array<{ value: string; label: string }>;
  jenisSelectOptions: Array<{ value: string; label: string }>;
  onSave: () => void;
  isPending: boolean;
}

export const CalendarPresetModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  isEditing,
  form,
  setForm,
  jenjangSelectOptions,
  jenisSelectOptions,
  onSave,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Preset Event Kalender' : 'Tambah Preset Event Kalender'}
      size="md"
    >
      <div className="space-y-4 py-2 text-xs">
        <div className="space-y-1">
          <label htmlFor="preset-judul" className="font-bold text-slate-700 dark:text-slate-300">
            Nama / Judul Event <span className="text-rose-500">*</span>
          </label>
          <Input
            id="preset-judul"
            aria-label="Nama atau judul event"
            value={form.judul}
            onChange={e => setForm(f => ({ ...f, judul: e.target.value }))}
            placeholder="cth. Masa Pengenalan Lingkungan Sekolah (MPLS)"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="preset-jenjang" className="font-bold text-slate-700 dark:text-slate-300">
            Jenjang Sasaran <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="preset-jenjang"
            aria-label="Pilih jenjang sasaran"
            value={form.jenjang}
            onValueChange={(val) => setForm(f => ({ ...f, jenjang: val }))}
            options={jenjangSelectOptions}
            placeholder="Pilih Jenjang"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="preset-jenis" className="font-bold text-slate-700 dark:text-slate-300">
            Kategori Jenis Event <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="preset-jenis"
            aria-label="Pilih kategori jenis event"
            value={form.jenis}
            onValueChange={(val) => setForm(f => ({ ...f, jenis: val }))}
            options={jenisSelectOptions}
            placeholder="Pilih Kategori Event"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="preset-keterangan" className="font-bold text-slate-700 dark:text-slate-300">
            Keterangan (Opsional)
          </label>
          <textarea
            id="preset-keterangan"
            aria-label="Keterangan event"
            value={form.keterangan}
            onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
            placeholder="Informasi deskripsi event..."
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={onSave}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Simpan Preset
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default CalendarPresetModal;
