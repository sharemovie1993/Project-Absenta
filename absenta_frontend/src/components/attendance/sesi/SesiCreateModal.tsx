import React from 'react';
import { Modal, ModalFooter, Input, Label } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import Button from '../../ui/Button';
import { type DropdownOption } from '../../../api/dropdown.api';

interface PetugasFormState {
  kelas_id: string;
  guru_id: string;
  mapel_id?: string;
  jenis_kegiatan: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
}

interface SesiCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  petugasForm: PetugasFormState;
  setPetugasForm: React.Dispatch<React.SetStateAction<PetugasFormState>>;
  kelasOptions: DropdownOption[];
  jenisOptions: DropdownOption[];
  guruOptions: DropdownOption[];
  mapelOptions: DropdownOption[];
  onSave: () => void;
  creatingSession: boolean;
  normalizeDateTimeWithTanggal: (tanggalValue: string, dt: string) => string;
}

const SesiCreateModalComponent: React.FC<SesiCreateModalProps> = ({
  isOpen,
  onClose,
  petugasForm,
  setPetugasForm,
  kelasOptions,
  jenisOptions,
  guruOptions,
  mapelOptions,
  onSave,
  creatingSession,
  normalizeDateTimeWithTanggal,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buat Sesi Absensi Manual">
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="create-kelas-select">Kelas</Label>
          <SearchableSelect
            id="create-kelas-select"
            value={petugasForm.kelas_id}
            onValueChange={(v) => setPetugasForm((f) => ({ ...f, kelas_id: v }))}
            options={kelasOptions}
            placeholder="Pilih Kelas"
            triggerClassName="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="create-jenis-select">Jenis Kegiatan</Label>
            <SearchableSelect
              id="create-jenis-select"
              value={petugasForm.jenis_kegiatan}
              onValueChange={(v) => setPetugasForm((f) => ({ ...f, jenis_kegiatan: v }))}
              options={jenisOptions}
              placeholder="Pilih Jenis"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-tanggal-input">Tanggal</Label>
            <Input
              id="create-tanggal-input"
              type="date"
              value={petugasForm.tanggal}
              onChange={(e) => {
                const nextDate = e.target.value;
                setPetugasForm((f) => ({
                  ...f,
                  tanggal: nextDate,
                  waktu_mulai: normalizeDateTimeWithTanggal(nextDate, f.waktu_mulai),
                  waktu_selesai: normalizeDateTimeWithTanggal(nextDate, f.waktu_selesai),
                }));
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="create-guru-select">Guru (Opsional/Wajib KBM)</Label>
          <SearchableSelect
            id="create-guru-select"
            value={petugasForm.guru_id}
            onValueChange={(v) => setPetugasForm((f) => ({ ...f, guru_id: v }))}
            options={guruOptions}
            placeholder="Pilih Guru"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="create-mapel-select">Mata Pelajaran (Opsional)</Label>
          <SearchableSelect
            id="create-mapel-select"
            value={petugasForm.mapel_id || ''}
            onValueChange={(v) => setPetugasForm((f) => ({ ...f, mapel_id: v }))}
            options={mapelOptions}
            placeholder="Pilih Mapel"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="create-mulai-input">Waktu Mulai</Label>
            <Input
              id="create-mulai-input"
              type="datetime-local"
              value={petugasForm.waktu_mulai}
              onChange={(e) => setPetugasForm((f) => ({ ...f, waktu_mulai: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-selesai-input">Waktu Selesai</Label>
            <Input
              id="create-selesai-input"
              type="datetime-local"
              value={petugasForm.waktu_selesai}
              onChange={(e) => setPetugasForm((f) => ({ ...f, waktu_selesai: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="button" onClick={onSave} disabled={creatingSession}>
          {creatingSession ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

SesiCreateModalComponent.displayName = 'SesiCreateModal';
export const SesiCreateModal = React.memo(SesiCreateModalComponent);
