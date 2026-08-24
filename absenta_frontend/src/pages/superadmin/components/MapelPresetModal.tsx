import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input, SearchableSelect } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  form: {
    jenjang: string;
    category: string;
    nama_mapel: string;
    kode_mapel: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    jenjang: string;
    category: string;
    nama_mapel: string;
    kode_mapel: string;
  }>>;
  jenjangOptions: Array<{ value: string; label: string }>;
  onSave: () => void;
  isPending: boolean;
}

export const MapelPresetModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  isEditing,
  form,
  setForm,
  jenjangOptions,
  onSave,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Preset Mata Pelajaran' : 'Tambah Preset Mata Pelajaran Baru'}
      size="md"
    >
      <div className="space-y-4 py-2 text-xs">
        <div className="space-y-1">
          <label htmlFor="mapel-preset-jenjang" className="font-bold text-slate-700 dark:text-slate-300">
            Jenjang Sekolah <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="mapel-preset-jenjang"
            aria-label="Pilih Jenjang Sekolah"
            value={form.jenjang}
            onValueChange={val => setForm(f => ({ ...f, jenjang: val }))}
            options={jenjangOptions}
            placeholder="Pilih Jenjang Sekolah"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="mapel-preset-category" className="font-bold text-slate-700 dark:text-slate-300">
            Kategori / Kelompok Mapel <span className="text-rose-500">*</span>
          </label>
          <Input
            id="mapel-preset-category"
            aria-label="Kategori atau kelompok mapel"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Contoh: UMUM, KEJURUAN, MULOK, PILIHAN"
            className="rounded-xl font-bold"
          />
          <p className="text-[10px] text-slate-400 mt-1">Gunakan nama kelompok standar (misal: UMUM, KEJURUAN, MULOK).</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="mapel-preset-nama" className="font-bold text-slate-700 dark:text-slate-300">
            Nama Mata Pelajaran <span className="text-rose-500">*</span>
          </label>
          <Input
            id="mapel-preset-nama"
            aria-label="Nama mata pelajaran"
            value={form.nama_mapel}
            onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))}
            placeholder="Contoh: Pemrograman Web dan Perangkat Bergerak"
            className="rounded-xl font-bold"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="mapel-preset-kode" className="font-bold text-slate-700 dark:text-slate-300">
            Kode Mapel <span className="text-rose-500">*</span>
          </label>
          <Input
            id="mapel-preset-kode"
            aria-label="Kode mata pelajaran"
            value={form.kode_mapel}
            onChange={e => setForm(f => ({ ...f, kode_mapel: e.target.value.toUpperCase() }))}
            placeholder="Contoh: PWPB"
            className="rounded-xl font-bold font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">Kode akan digabung dengan singkatan kurikulum saat disinkronisasi.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
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
            {isEditing ? 'Simpan Perubahan' : 'Tambah Preset'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default MapelPresetModal;
