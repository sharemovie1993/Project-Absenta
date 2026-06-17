import React from 'react';
import { Award } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { SimpleFormField } from '../ui/SimpleFormField';
import { HubinPklHeaderInfo } from './HubinPklHeaderInfo';

interface HubinPklNilaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: any;
  handleNilaiSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

export const HubinPklNilaiModal: React.FC<HubinPklNilaiModalProps> = ({
  isOpen,
  onClose,
  selectedPkl,
  handleNilaiSubmit,
  isPending,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Award size={20} className="text-blue-600 dark:text-blue-500" />
          <span>Input Penilaian PKL</span>
        </div>
      }
    >
      {selectedPkl && (
        <div className="space-y-4 animate-fadeIn">
          <HubinPklHeaderInfo
            siswaName={selectedPkl.Siswa?.nama_siswa}
            mitraName={selectedPkl.Mitra?.nama}
            variant="compact"
          />

          <form onSubmit={handleNilaiSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <SimpleFormField label="Soft Skills" required>
                <Input
                  type="number"
                  name="soft_skills"
                  min="0"
                  max="100"
                  required
                  defaultValue={selectedPkl.nilai_json?.soft_skills ?? ''}
                  placeholder="0-100"
                />
              </SimpleFormField>
              <SimpleFormField label="Teknis" required>
                <Input
                  type="number"
                  name="technical_skills"
                  min="0"
                  max="100"
                  required
                  defaultValue={selectedPkl.nilai_json?.technical_skills ?? ''}
                  placeholder="0-100"
                />
              </SimpleFormField>
              <SimpleFormField label="Kedisiplinan" required>
                <Input
                  type="number"
                  name="discipline"
                  min="0"
                  max="100"
                  required
                  defaultValue={selectedPkl.nilai_json?.discipline ?? ''}
                  placeholder="0-100"
                />
              </SimpleFormField>
            </div>

            <SimpleFormField label="Catatan Akhir Evaluasi Instruktur">
              <Textarea
                name="catatan"
                rows={3}
                defaultValue={selectedPkl.nilai_json?.catatan ?? ''}
                placeholder="Tuliskan catatan kemajuan siswa, rekomendasi, atau apresiasi..."
              />
            </SimpleFormField>

            {selectedPkl.nilai_json?.nilai_akhir && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50">
                <Award className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nilai Akhir Rata-rata</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{selectedPkl.nilai_json?.nilai_akhir} / 100</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isPending}>
                Simpan Nilai
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
