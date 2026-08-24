import React from 'react';
import { Search, AlertCircle, X, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui/Label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { SiswaAkademikPickerItem } from '@/api/attendance/anggotaKegiatanEskul.api';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';

interface AnggotaEskulWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: 1 | 2 | 3;
  setCurrentStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  eskulList: JenisKegiatanMaster[];
  classes: Array<{ id: string; nama_kelas: string }>;
  selectedWizardEskulId: string;
  setSelectedWizardEskulId: (id: string) => void;
  selectedWizardSiswaIds: Set<string>;
  wizardSiswaSearch: string;
  setWizardSiswaSearch: (val: string) => void;
  wizardSiswaKelasId: string;
  setWizardSiswaKelasId: (val: string) => void;
  siswaPickerList: SiswaAkademikPickerItem[];
  loadingPicker: boolean;
  handleSelectAllSiswa: () => void;
  handleToggleSiswa: (id: string) => void;
  wizardEskulName: string;
  selectedSiswaDetails: SiswaAkademikPickerItem[];
  handleSaveWizard: () => void;
  submittingForm: boolean;
}

export const AnggotaEskulWizardModal: React.FC<AnggotaEskulWizardModalProps> = React.memo(({
  isOpen,
  onClose,
  currentStep,
  setCurrentStep,
  eskulList,
  classes,
  selectedWizardEskulId,
  setSelectedWizardEskulId,
  selectedWizardSiswaIds,
  wizardSiswaSearch,
  setWizardSiswaSearch,
  wizardSiswaKelasId,
  setWizardSiswaKelasId,
  siswaPickerList,
  loadingPicker,
  handleSelectAllSiswa,
  handleToggleSiswa,
  wizardEskulName,
  selectedSiswaDetails,
  handleSaveWizard,
  submittingForm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex-shrink-0">
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
              Penugasan Anggota Eskul (Siswa)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Langkah {currentStep} dari 3</p>
          </div>
          <button 
            type="button"
            aria-label="Tutup modal wizard"
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pilih Eskul</span>
            </div>
            <div className="h-0.5 flex-1 mx-3 bg-slate-100 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pilih Siswa</span>
            </div>
            <div className="h-0.5 flex-1 mx-3 bg-slate-100 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                3
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Konfirmasi</span>
            </div>
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-eskul-select" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Pilih Ekstrakurikuler / Kegiatan <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  id="wizard-eskul-select"
                  value={selectedWizardEskulId}
                  onValueChange={setSelectedWizardEskulId}
                  options={(eskulList ?? []).map(e => ({ label: e.nama, value: e.id }))}
                  placeholder="Pilih kegiatan eskul..."
                  searchPlaceholder="Cari eskul..."
                  triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                />
              </div>
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  <strong>Langkah 1:</strong> Pilih salah satu jenis eskul/pembiasaan yang ingin Anda petakan anggotanya. Langkah berikutnya akan memunculkan daftar siswa aktif.
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 flex flex-col h-full max-h-[50vh]">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="wizard-siswa-search"
                    aria-label="Cari siswa"
                    value={wizardSiswaSearch}
                    onChange={e => setWizardSiswaSearch(e.target.value)}
                    placeholder="Cari nama / NIS siswa..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <SearchableSelect
                    id="wizard-kelas-filter"
                    value={wizardSiswaKelasId}
                    onValueChange={setWizardSiswaKelasId}
                    options={[
                      { label: 'Semua Kelas', value: '' },
                      ...(classes ?? []).map(c => ({ label: c.nama_kelas, value: c.id }))
                    ]}
                    placeholder="Pilih kelas..."
                    triggerClassName="h-9 text-xs font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                  />
                </div>
              </div>

              {/* Students Picker List Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-y-auto flex-1">
                {loadingPicker ? (
                  <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                    Memuat data siswa picker...
                  </div>
                ) : (siswaPickerList ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-xs text-slate-400 gap-2">
                    <AlertCircle className="w-6 h-6" />
                    <span>Siswa tidak ditemukan</span>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 w-12 text-center">
                          <input
                            type="checkbox"
                            aria-label="Pilih semua siswa"
                            checked={selectedWizardSiswaIds.size === siswaPickerList.length && siswaPickerList.length > 0}
                            onChange={handleSelectAllSiswa}
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-2.5">NIS</th>
                        <th className="px-4 py-2.5">Nama Siswa</th>
                        <th className="px-4 py-2.5">Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {siswaPickerList?.map(s => {
                        const checked = selectedWizardSiswaIds.has(s.siswa_akademik_id);
                        return (
                          <tr 
                            key={s.siswa_akademik_id}
                            onClick={() => handleToggleSiswa(s.siswa_akademik_id)}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer transition-colors ${
                              checked ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label={`Pilih siswa ${s.nama_siswa}`}
                                checked={checked}
                                onChange={() => handleToggleSiswa(s.siswa_akademik_id)}
                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">{s.nis}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{s.nama_siswa}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                {s.kelas}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>Terpilih: {selectedWizardSiswaIds.size} Siswa</span>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 flex flex-col h-full max-h-[50vh]">
              {/* Summary Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Kegiatan</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{wizardEskulName}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa Terpilih</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedWizardSiswaIds.size} Orang</span>
                </div>
              </div>

              {/* Summary Selected List Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-y-auto flex-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">No</th>
                      <th className="px-4 py-2.5">NIS</th>
                      <th className="px-4 py-2.5">Nama Siswa</th>
                      <th className="px-4 py-2.5">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedSiswaDetails?.map((s, idx) => (
                      <tr key={s.siswa_akademik_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono">{s.nis}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{s.nama_siswa}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            {s.kelas}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Stepper Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-b-2xl flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => {
              if (currentStep === 1) {
                onClose();
              } else {
                setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
              }
            }}
            disabled={submittingForm}
          >
            {currentStep === 1 ? 'Batalkan' : 'Sebelumnya'}
          </Button>
          
          {currentStep < 3 ? (
            <Button 
              variant="primary"
              onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
              disabled={currentStep === 1 ? !selectedWizardEskulId : selectedWizardSiswaIds.size === 0}
            >
              Selanjutnya
            </Button>
          ) : (
            <Button 
              variant="primary"
              onClick={handleSaveWizard}
              disabled={submittingForm || !selectedWizardEskulId || selectedWizardSiswaIds.size === 0}
              className="px-6"
            >
              {submittingForm ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
