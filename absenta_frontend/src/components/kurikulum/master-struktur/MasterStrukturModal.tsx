import React from 'react';
import { Modal } from '../../ui/Modal';
import { ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import type { Mapel } from '../../../types/academic';
import { SinglePlottingForm } from './SinglePlottingForm';
import { BulkPlottingForm } from './BulkPlottingForm';

import { StrukturKurikulum } from '../../../utils/kurikulum/masterStrukturHelper';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: StrukturKurikulum | null;
  addMode: 'manual' | 'massal';
  formData: {
    mapel_id: string;
    jp_per_minggu: number;
    kelompok: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<{
    mapel_id: string;
    jp_per_minggu: number;
    kelompok: string;
  }>>;
  unmappedSubjects: Mapel[];
  subjects: any;
  kelompokOptions: { value: string; label: string }[];
  selectedTingkat: number;
  detectDefaultJpForMapel: (kodeMapel: string, namaMapel: string, tingkat: number) => number;
  
  // Bulk form specific props
  bulkSearchQuery: string;
  setBulkSearchQuery: (val: string) => void;
  bulkSelections: Record<string, { jp_per_minggu: number; kelompok: string }>;
  setBulkSelections: React.Dispatch<React.SetStateAction<Record<string, { jp_per_minggu: number; kelompok: string }>>>;
  mappingFiltered: StrukturKurikulum[];
  isMapelBelongsToOtherJurusan: (s: Mapel) => boolean;
  detectKelompokForMapel: (kode: string, nama: string) => string;
  presetSisaCount: { UMUM: number; KEJURUAN: number; MULOK: number; PILIHAN: number };
  handleAddPreset: (type: 'UMUM' | 'KEJURUAN' | 'MULOK' | 'PILIHAN') => void;
  
  // Form submission and mutators
  handleSave: (e: React.FormEvent<HTMLFormElement>) => void;
  isPendingSave: boolean;
  jenjang?: string;
  kurikulum?: string;
  targetJp?: number;
  standardReferences?: any;
}

export const MasterStrukturModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  addMode,
  formData,
  handleInputChange,
  setFormData,
  unmappedSubjects,
  subjects,
  kelompokOptions,
  selectedTingkat,
  detectDefaultJpForMapel,
  
  bulkSearchQuery,
  setBulkSearchQuery,
  bulkSelections,
  setBulkSelections,
  mappingFiltered,
  isMapelBelongsToOtherJurusan,
  detectKelompokForMapel,
  presetSisaCount,
  handleAddPreset,
  
  handleSave,
  isPendingSave,
  jenjang = 'SMA',
  kurikulum = 'MERDEKA',
  targetJp = 40,
  standardReferences
}) => {
  const isSingleMode = editingItem || addMode === 'manual';
  const saveLabel = isSingleMode 
    ? 'SIMPAN PEMETAAN' 
    : `SIMPAN ${Object.keys(bulkSelections).length} PEMETAAN`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingItem
          ? 'Edit Alokasi JP'
          : addMode === 'manual'
          ? 'Tambah Alokasi JP (Manual)'
          : `Bulk Plotting — ${jenjang} · Kelas ${selectedTingkat}`
      }
      size={isSingleMode ? '2xl' : '5xl'}
      contentClassName={isSingleMode ? "!overflow-visible" : ""}
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {isSingleMode ? (
          <SinglePlottingForm
            editingItem={editingItem}
            addMode={addMode}
            formData={formData}
            handleInputChange={handleInputChange}
            setFormData={setFormData}
            unmappedSubjects={unmappedSubjects}
            subjects={subjects}
            kelompokOptions={kelompokOptions}
            selectedTingkat={selectedTingkat}
            detectDefaultJpForMapel={detectDefaultJpForMapel}
          />
        ) : (
          <BulkPlottingForm
            bulkSearchQuery={bulkSearchQuery}
            setBulkSearchQuery={setBulkSearchQuery}
            bulkSelections={bulkSelections}
            setBulkSelections={setBulkSelections}
            subjects={subjects}
            mappingFiltered={mappingFiltered}
            selectedTingkat={selectedTingkat}
            isMapelBelongsToOtherJurusan={isMapelBelongsToOtherJurusan}
            detectKelompokForMapel={detectKelompokForMapel}
            detectDefaultJpForMapel={detectDefaultJpForMapel}
            presetSisaCount={presetSisaCount}
            handleAddPreset={handleAddPreset}
            kelompokOptions={kelompokOptions}
            jenjang={jenjang}
            kurikulum={kurikulum}
            isPendingSave={isPendingSave}
            onClose={onClose}
            targetJp={targetJp}
            standardReferences={standardReferences}
          />
        )}

        {isSingleMode && (
          <ModalFooter className="px-0 pt-4 mt-6">
            <Button variant="ghost" type="button" onClick={onClose} className="rounded-xl font-bold">
              BATAL
            </Button>
            <Button 
              type="submit" 
              isLoading={isPendingSave} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {saveLabel}
            </Button>
          </ModalFooter>
        )}
      </form>
    </Modal>
  );
};
export default MasterStrukturModal;
