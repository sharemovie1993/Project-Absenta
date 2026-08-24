import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';

interface Props {
  programModalOpen: boolean;
  setProgramModalOpen: (val: boolean) => void;
  editingProgram: boolean;
  programForm: {
    bidang_keahlian: string;
    nama: string;
    kode: string;
    singkatan: string;
  };
  setProgramForm: React.Dispatch<React.SetStateAction<{
    bidang_keahlian: string;
    nama: string;
    kode: string;
    singkatan: string;
  }>>;
  onSaveProgram: () => void;
  savingProgram: boolean;

  jurusanModalOpen: boolean;
  setJurusanModalOpen: (val: boolean) => void;
  editingJurusan: boolean;
  jurusanForm: {
    program_preset_id: string;
    nama: string;
    kode: string;
    singkatan: string;
  };
  setJurusanForm: React.Dispatch<React.SetStateAction<{
    program_preset_id: string;
    nama: string;
    kode: string;
    singkatan: string;
  }>>;
  onSaveJurusan: () => void;
  savingJurusan: boolean;
}

export const JurusanPresetModals: React.FC<Props> = React.memo(({
  programModalOpen,
  setProgramModalOpen,
  editingProgram,
  programForm,
  setProgramForm,
  onSaveProgram,
  savingProgram,

  jurusanModalOpen,
  setJurusanModalOpen,
  editingJurusan,
  jurusanForm,
  setJurusanForm,
  onSaveJurusan,
  savingJurusan
}) => {
  return (
    <>
      {/* Modal Program Keahlian */}
      <Modal
        isOpen={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        title={editingProgram ? 'Edit Program Keahlian' : 'Tambah Program Keahlian Global'}
        size="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1">
            <label htmlFor="prog-bidang" className="font-bold text-slate-700 dark:text-slate-300">
              Bidang Keahlian <span className="text-rose-500">*</span>
            </label>
            <Input
              id="prog-bidang"
              aria-label="Bidang keahlian"
              value={programForm.bidang_keahlian}
              onChange={(e) => setProgramForm(prev => ({ ...prev, bidang_keahlian: e.target.value }))}
              placeholder="Contoh: Teknologi Informasi"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prog-nama" className="font-bold text-slate-700 dark:text-slate-300">
              Nama Program Keahlian <span className="text-rose-500">*</span>
            </label>
            <Input
              id="prog-nama"
              aria-label="Nama program keahlian"
              value={programForm.nama}
              onChange={(e) => setProgramForm(prev => ({ ...prev, nama: e.target.value }))}
              placeholder="Contoh: Pengembangan Perangkat Lunak dan Gim"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="prog-kode" className="font-bold text-slate-700 dark:text-slate-300">
                Kode Program <span className="text-rose-500">*</span>
              </label>
              <Input
                id="prog-kode"
                aria-label="Kode program"
                value={programForm.kode}
                onChange={(e) => setProgramForm(prev => ({ ...prev, kode: e.target.value }))}
                placeholder="Contoh: PPLG"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="prog-singkatan" className="font-bold text-slate-700 dark:text-slate-300">
                Singkatan <span className="text-rose-500">*</span>
              </label>
              <Input
                id="prog-singkatan"
                aria-label="Singkatan program"
                value={programForm.singkatan}
                onChange={(e) => setProgramForm(prev => ({ ...prev, singkatan: e.target.value }))}
                placeholder="Contoh: PPLG"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setProgramModalOpen(false)}
              disabled={savingProgram}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={onSaveProgram}
              disabled={savingProgram}
            >
              {savingProgram ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Simpan Program
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konsentrasi Keahlian (Jurusan) */}
      <Modal
        isOpen={jurusanModalOpen}
        onClose={() => setJurusanModalOpen(false)}
        title={editingJurusan ? 'Edit Konsentrasi Keahlian' : 'Tambah Konsentrasi Keahlian'}
        size="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1">
            <label htmlFor="jur-nama" className="font-bold text-slate-700 dark:text-slate-300">
              Nama Konsentrasi Keahlian <span className="text-rose-500">*</span>
            </label>
            <Input
              id="jur-nama"
              aria-label="Nama konsentrasi keahlian"
              value={jurusanForm.nama}
              onChange={(e) => setJurusanForm(prev => ({ ...prev, nama: e.target.value }))}
              placeholder="Contoh: Rekayasa Perangkat Lunak"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="jur-kode" className="font-bold text-slate-700 dark:text-slate-300">
                Kode <span className="text-rose-500">*</span>
              </label>
              <Input
                id="jur-kode"
                aria-label="Kode konsentrasi keahlian"
                value={jurusanForm.kode}
                onChange={(e) => setJurusanForm(prev => ({ ...prev, kode: e.target.value }))}
                placeholder="Contoh: RPL"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="jur-singkatan" className="font-bold text-slate-700 dark:text-slate-300">
                Singkatan <span className="text-rose-500">*</span>
              </label>
              <Input
                id="jur-singkatan"
                aria-label="Singkatan konsentrasi keahlian"
                value={jurusanForm.singkatan}
                onChange={(e) => setJurusanForm(prev => ({ ...prev, singkatan: e.target.value }))}
                placeholder="Contoh: RPL"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => setJurusanModalOpen(false)}
              disabled={savingJurusan}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={onSaveJurusan}
              disabled={savingJurusan}
            >
              {savingJurusan ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Simpan Konsentrasi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default JurusanPresetModals;
