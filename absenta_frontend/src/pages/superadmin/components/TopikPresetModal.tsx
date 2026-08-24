import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input, SearchableSelect, Badge } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: {
    jenjang: string;
    nama_mapel: string;
    kode_mapel: string;
    fase: string;
    tingkat: number;
    judul_topik: string;
    deskripsi: string;
    kategori: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    jenjang: string;
    nama_mapel: string;
    kode_mapel: string;
    fase: string;
    tingkat: number;
    judul_topik: string;
    deskripsi: string;
    kategori: string;
  }>>;
  jenjangOptions: Array<{ value: string; label: string }>;
  kategoriOptions: Array<{ value: string; label: string }>;
  tingkatOptions: Array<{ value: string; label: string }>;
  onSave: (e: React.FormEvent) => void;
  isPending: boolean;
}

export const TopikPresetModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  jenjangOptions,
  kategoriOptions,
  tingkatOptions,
  onSave,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Preset Topik Pembelajaran' : 'Tambah Preset Topik Baru'}
      size="md"
    >
      <form onSubmit={onSave} className="space-y-4 py-2 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="topik-jenjang" className="font-bold text-slate-700 dark:text-slate-300">
              Jenjang Sekolah <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="topik-jenjang"
              aria-label="Pilih Jenjang Sekolah"
              value={formData.jenjang}
              onValueChange={(val) => setFormData(prev => ({ ...prev, jenjang: val }))}
              options={jenjangOptions}
              placeholder="Pilih Jenjang"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="topik-kategori" className="font-bold text-slate-700 dark:text-slate-300">
              Kategori Mapel <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="topik-kategori"
              aria-label="Pilih Kategori Mapel"
              value={formData.kategori}
              onValueChange={(val) => setFormData(prev => ({ ...prev, kategori: val }))}
              options={kategoriOptions}
              placeholder="Pilih Kategori"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="topik-mapel" className="font-bold text-slate-700 dark:text-slate-300">
              Nama Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <Input
              id="topik-mapel"
              aria-label="Nama Mata Pelajaran"
              value={formData.nama_mapel}
              onChange={(e) => setFormData(prev => ({ ...prev, nama_mapel: e.target.value }))}
              placeholder="Contoh: Bahasa Inggris / Matematika"
              required
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="topik-kode" className="font-bold text-slate-700 dark:text-slate-300">
              Kode Mapel (Opsional)
            </label>
            <Input
              id="topik-kode"
              aria-label="Kode Mata Pelajaran"
              value={formData.kode_mapel}
              onChange={(e) => setFormData(prev => ({ ...prev, kode_mapel: e.target.value }))}
              placeholder="Contoh: ING / MTK"
              className="rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="topik-tingkat" className="font-bold text-slate-700 dark:text-slate-300">
              Tingkat Kelas <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="topik-tingkat"
              aria-label="Pilih Tingkat Kelas"
              value={String(formData.tingkat)}
              onValueChange={(val) => setFormData(prev => ({ ...prev, tingkat: Number(val) }))}
              options={tingkatOptions}
              placeholder="Pilih Tingkat"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Fase Kurikulum Merdeka (Auto)
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-violet-700 dark:text-violet-300 flex items-center justify-between">
              <span>Fase {formData.fase || 'E'}</span>
              <Badge className="bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[9px] border-none">
                Auto-Sync
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="topik-judul" className="font-bold text-slate-700 dark:text-slate-300">
            Judul Topik Pembelajaran AI <span className="text-rose-500">*</span>
          </label>
          <Input
            id="topik-judul"
            aria-label="Judul topik pembelajaran"
            value={formData.judul_topik}
            onChange={(e) => setFormData(prev => ({ ...prev, judul_topik: e.target.value }))}
            placeholder="Contoh: Analytical Exposition Text & Public Speaking"
            required
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="topik-deskripsi" className="font-bold text-slate-700 dark:text-slate-300">
            Deskripsi / Ruang Lingkup (Opsional)
          </label>
          <textarea
            id="topik-deskripsi"
            aria-label="Deskripsi ruang lingkup topik"
            rows={3}
            value={formData.deskripsi}
            onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
            placeholder="Ringkasan cakupan materi..."
            className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {isEditing ? 'Simpan Perubahan' : 'Tambah Preset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default TopikPresetModal;
