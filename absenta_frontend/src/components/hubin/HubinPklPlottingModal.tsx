import React from 'react';
import { UserPlus } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { SimpleFormField } from '../ui/SimpleFormField';
import { SmartStudentPicker, type Student } from '../common/SmartStudentPicker';

interface HubinPklPlottingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  selectedSiswaId: string;
  setSelectedSiswaId: (val: string) => void;
  selectedMitraId: string;
  setSelectedMitraId: (val: string) => void;
  selectedPembimbingId: string;
  setSelectedPembimbingId: (val: string) => void;
  handlePlottingSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  onGuruSearch?: (val: string) => void;
  onMitraSearch?: (val: string) => void;
  isLoadingGuru?: boolean;
  isLoadingMitra?: boolean;
}

export const HubinPklPlottingModal: React.FC<HubinPklPlottingModalProps> = ({
  isOpen,
  onClose,
  mitraOptions,
  guruOptions,
  selectedSiswaId,
  setSelectedSiswaId,
  selectedMitraId,
  setSelectedMitraId,
  selectedPembimbingId,
  setSelectedPembimbingId,
  handlePlottingSubmit,
  isPending,
  onGuruSearch,
  onMitraSearch,
  isLoadingGuru,
  isLoadingMitra,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <UserPlus size={20} className="text-blue-600" />
          <span>Plotting Penempatan Baru</span>
        </div>
      }
    >
      <form onSubmit={handlePlottingSubmit} className="space-y-4 pb-40">
        <SimpleFormField label="Pilih Siswa PKL" required>
          <SmartStudentPicker 
            onSelect={(s: Student) => setSelectedSiswaId(s.id)}
            scope="global"
            placeholder="Scan RFID, QR, atau ketik nama/NIS..."
            autoFocus
          />
          {selectedSiswaId && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserPlus size={16} />
              </div>
              <div className="text-[11px]">
                <p className="font-bold text-blue-800 dark:text-blue-300">Siswa Terpilih (ID: {selectedSiswaId.slice(0,8)}...)</p>
                <p className="text-blue-600/80 dark:text-blue-400/80">Silakan lengkapi data mitra dan pembimbing di bawah.</p>
              </div>
            </div>
          )}
        </SimpleFormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleFormField htmlFor="plotting-mitra" label="Mitra Industri" required>
            <SearchableSelect
              id="plotting-mitra"
              options={mitraOptions}
              placeholder="-- Pilih perusahaan --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={(val) => setSelectedMitraId(val)}
              value={selectedMitraId}
              onSearch={onMitraSearch}
              isLoading={isLoadingMitra}
            />
          </SimpleFormField>

          <SimpleFormField htmlFor="plotting-pembimbing" label="Guru Pembimbing">
            <SearchableSelect
              id="plotting-pembimbing"
              options={guruOptions}
              placeholder="-- Pilih pembimbing --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={(val) => setSelectedPembimbingId(val)}
              value={selectedPembimbingId}
              onSearch={onGuruSearch}
              isLoading={isLoadingGuru}
            />
          </SimpleFormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleFormField htmlFor="plotting-tanggal-mulai" label="Tanggal Mulai PKL" required>
            <Input
              id="plotting-tanggal-mulai"
              type="date"
              name="tanggal_mulai"
              required
            />
          </SimpleFormField>
          <SimpleFormField htmlFor="plotting-tanggal-selesai" label="Tanggal Selesai PKL (Estimasi)">
            <Input
              id="plotting-tanggal-selesai"
              type="date"
              name="tanggal_selesai"
            />
          </SimpleFormField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Simpan Penempatan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
