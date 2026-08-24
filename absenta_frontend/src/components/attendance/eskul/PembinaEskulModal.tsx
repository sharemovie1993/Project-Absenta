import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui/Label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { GuruPickerItem } from '@/api/attendance/pembinaKegiatanEskul.api';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';

interface PembinaEskulModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFormGuruId: string;
  setSelectedFormGuruId: (id: string) => void;
  selectedFormEskulId: string;
  setSelectedFormEskulId: (id: string) => void;
  guruPickerList: GuruPickerItem[];
  eskulList: JenisKegiatanMaster[];
  loadingPicker: boolean;
  submittingForm: boolean;
  handleSavePembinaForm: () => void;
}

export const PembinaEskulModal: React.FC<PembinaEskulModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedFormGuruId,
  setSelectedFormGuruId,
  selectedFormEskulId,
  setSelectedFormEskulId,
  guruPickerList,
  eskulList,
  loadingPicker,
  submittingForm,
  handleSavePembinaForm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-visible border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
              Tambah Pembina Eskul
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Petakan guru pembina untuk kegiatan ekstrakurikuler</p>
          </div>
          <button 
            type="button"
            aria-label="Tutup modal pembina"
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5">
          {/* Select Guru */}
          <div className="space-y-2">
            <Label htmlFor="form-guru-select" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Pilih Guru <span className="text-rose-500">*</span>
            </Label>
            <SearchableSelect
              id="form-guru-select"
              value={selectedFormGuruId}
              onValueChange={setSelectedFormGuruId}
              options={(guruPickerList ?? []).map(g => ({ label: g.nama_guru, value: g.id }))}
              placeholder={loadingPicker ? "Memuat guru..." : "Cari nama guru..."}
              searchPlaceholder="Cari nama guru..."
              disabled={loadingPicker || submittingForm}
              triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
            />
          </div>

          {/* Select Eskul */}
          <div className="space-y-2">
            <Label htmlFor="form-eskul-select-pembina" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Pilih Ekstrakurikuler <span className="text-rose-500">*</span>
            </Label>
            <SearchableSelect
              id="form-eskul-select-pembina"
              value={selectedFormEskulId}
              onValueChange={setSelectedFormEskulId}
              options={(eskulList ?? []).map(e => ({ label: e.nama, value: e.id }))}
              placeholder="Pilih kegiatan eskul..."
              searchPlaceholder="Cari eskul..."
              disabled={submittingForm}
              triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-2xl">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={submittingForm}
          >
            Batalkan
          </Button>
          <Button 
            variant="primary"
            onClick={handleSavePembinaForm}
            disabled={submittingForm || !selectedFormGuruId || !selectedFormEskulId}
            className="px-6"
          >
            {submittingForm ? 'Menyimpan...' : 'Simpan Penugasan'}
          </Button>
        </div>
      </div>
    </div>
  );
});
