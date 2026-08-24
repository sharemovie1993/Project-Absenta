import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input, SearchableSelect, Badge } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formState: {
    jenjang: string;
    nama_mapel: string;
    kode_mapel: string;
    tingkat: number;
    fase: string;
    jenis: string;
    judul: string;
    topik: string;
  };
  setFormState: React.Dispatch<React.SetStateAction<{
    jenjang: string;
    nama_mapel: string;
    kode_mapel: string;
    tingkat: number;
    fase: string;
    jenis: string;
    judul: string;
    topik: string;
  }>>;
  jenjangOptions: Array<{ value: string; label: string }>;
  jenisOptions: Array<{ value: string; label: string }>;
  tingkatOptions: Array<{ value: string; label: string }>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export const LibraryTemplateModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  isEditing,
  formState,
  setFormState,
  jenjangOptions,
  jenisOptions,
  tingkatOptions,
  onSubmit,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Template Perangkat Ajar' : 'Tambah Template Master Baru'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4 py-2 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="modal-jenjang" className="font-bold text-slate-700 dark:text-slate-300">
              Jenjang Sekolah <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="modal-jenjang"
              aria-label="Pilih Jenjang Sekolah"
              value={formState.jenjang}
              onValueChange={(val) => setFormState(prev => ({ ...prev, jenjang: val }))}
              options={jenjangOptions}
              placeholder="Pilih Jenjang"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="modal-jenis" className="font-bold text-slate-700 dark:text-slate-300">
              Jenis Dokumen Perangkat <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="modal-jenis"
              aria-label="Pilih Jenis Dokumen Perangkat"
              value={formState.jenis}
              onValueChange={(val) => setFormState(prev => ({ ...prev, jenis: val }))}
              options={jenisOptions}
              placeholder="Pilih Jenis Dokumen"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="modal-mapel" className="font-bold text-slate-700 dark:text-slate-300">
              Nama Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <Input
              id="modal-mapel"
              aria-label="Nama Mata Pelajaran"
              required
              value={formState.nama_mapel}
              onChange={(e) => setFormState(prev => ({ ...prev, nama_mapel: e.target.value }))}
              placeholder="Contoh: Pemrograman Web / Bahasa Indonesia"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="modal-judul" className="font-bold text-slate-700 dark:text-slate-300">
              Judul Template Dokumen <span className="text-rose-500">*</span>
            </label>
            <Input
              id="modal-judul"
              aria-label="Judul Template Dokumen"
              required
              value={formState.judul}
              onChange={(e) => setFormState(prev => ({ ...prev, judul: e.target.value }))}
              placeholder="Contoh: Modul Ajar RESTful API Frontend React"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="modal-tingkat" className="font-bold text-slate-700 dark:text-slate-300">
              Tingkat Kelas <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="modal-tingkat"
              aria-label="Pilih Tingkat Kelas"
              value={String(formState.tingkat)}
              onValueChange={(val) => setFormState(prev => ({ ...prev, tingkat: Number(val) }))}
              options={tingkatOptions}
              placeholder="Pilih Tingkat Kelas"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Fase Kurikulum Merdeka (Otomatis)
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold text-violet-700 dark:text-violet-300 flex items-center justify-between">
              <span>Fase {formState.fase || 'E'}</span>
              <Badge className="bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[9px] border-none">
                Auto-Sync Jenjang
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="modal-topik" className="font-bold text-slate-700 dark:text-slate-300">
            Topik / Pokok Bahasan Utama <span className="text-rose-500">*</span>
          </label>
          <Input
            id="modal-topik"
            aria-label="Topik atau pokok bahasan utama"
            required
            value={formState.topik}
            onChange={(e) => setFormState(prev => ({ ...prev, topik: e.target.value }))}
            placeholder="Contoh: REST API & State Management"
            className="rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose}>
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
            {isEditing ? 'Simpan Perubahan' : 'Tambah Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default LibraryTemplateModal;
