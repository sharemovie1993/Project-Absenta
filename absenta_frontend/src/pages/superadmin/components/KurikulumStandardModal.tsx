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
    tingkat: number;
    jp_per_minggu: number;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    jenjang: string;
    category: string;
    nama_mapel: string;
    kode_mapel: string;
    tingkat: number;
    jp_per_minggu: number;
  }>>;
  jenjangOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  onSave: () => void;
  isPending: boolean;
}

export const KurikulumStandardModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  isEditing,
  form,
  setForm,
  jenjangOptions,
  categoryOptions,
  onSave,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Acuan JP Kurikulum' : 'Tambah Acuan JP Kurikulum'}
      size="md"
    >
      <div className="space-y-4 py-2 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="std-jenjang" className="font-bold text-slate-700 dark:text-slate-300">
              Jenjang <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="std-jenjang"
              aria-label="Pilih Jenjang"
              value={form.jenjang}
              onValueChange={val => setForm(f => ({ ...f, jenjang: val }))}
              options={jenjangOptions}
              placeholder="Pilih Jenjang"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="std-category" className="font-bold text-slate-700 dark:text-slate-300">
              Kelompok Mapel
            </label>
            <SearchableSelect
              id="std-category"
              aria-label="Pilih Kelompok Mapel"
              value={form.category}
              onValueChange={val => setForm(f => ({ ...f, category: val }))}
              options={categoryOptions}
              placeholder="Pilih Kelompok"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="std-tingkat" className="font-bold text-slate-700 dark:text-slate-300">
              Tingkat Kelas <span className="text-rose-500">*</span>
            </label>
            <Input
              id="std-tingkat"
              aria-label="Tingkat kelas"
              type="number"
              min={1}
              max={13}
              value={form.tingkat}
              onChange={e => setForm(f => ({ ...f, tingkat: Number(e.target.value) }))}
              placeholder="1 - 13"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="std-jp" className="font-bold text-slate-700 dark:text-slate-300">
              JP per Minggu <span className="text-rose-500">*</span>
            </label>
            <Input
              id="std-jp"
              aria-label="Jumlah JP per minggu"
              type="number"
              min={1}
              max={50}
              value={form.jp_per_minggu}
              onChange={e => setForm(f => ({ ...f, jp_per_minggu: Number(e.target.value) }))}
              placeholder="JP"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="std-nama" className="font-bold text-slate-700 dark:text-slate-300">
            Nama Mata Pelajaran <span className="text-rose-500">*</span>
          </label>
          <Input
            id="std-nama"
            aria-label="Nama mata pelajaran"
            value={form.nama_mapel}
            onChange={e => setForm(f => ({ ...f, nama_mapel: e.target.value }))}
            placeholder="Contoh: Pendidikan Agama Islam dan Budi Pekerti"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="std-kode" className="font-bold text-slate-700 dark:text-slate-300">
            Kode Mapel <span className="text-rose-500">*</span>
          </label>
          <Input
            id="std-kode"
            aria-label="Kode mata pelajaran"
            value={form.kode_mapel}
            onChange={e => setForm(f => ({ ...f, kode_mapel: e.target.value.toUpperCase() }))}
            placeholder="Contoh: PAIBP"
            className="rounded-xl font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">Kode ini digunakan sebagai kunci pencocokan otomatis di tabel frontend.</p>
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
            {isEditing ? 'Simpan Perubahan' : 'Tambah Acuan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default KurikulumStandardModal;
