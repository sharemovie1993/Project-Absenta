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
  editingPkl?: any;
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
  editingPkl,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2">
          <UserPlus size={20} className="text-blue-605 text-indigo-600" />
          <span>{editingPkl ? 'Edit Detail Penempatan PKL' : 'Plotting Penempatan Baru'}</span>
        </div>
      }
    >
      <form onSubmit={handlePlottingSubmit} className="space-y-4">
        {editingPkl ? (
          <SimpleFormField label="Siswa PKL (Terkunci)">
            <Input 
              value={`${editingPkl.Siswa?.nama_siswa} (${editingPkl.Siswa?.nis})`} 
              disabled 
              className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800/80 cursor-not-allowed font-medium"
            />
          </SimpleFormField>
        ) : (
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
        )}

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
              defaultValue={editingPkl?.tanggal_mulai ? new Date(editingPkl.tanggal_mulai).toISOString().substring(0, 10) : ''}
              required
            />
          </SimpleFormField>
          <SimpleFormField htmlFor="plotting-tanggal-selesai" label="Tanggal Selesai PKL (Estimasi)">
            <Input
              id="plotting-tanggal-selesai"
              type="date"
              name="tanggal_selesai"
              defaultValue={editingPkl?.tanggal_selesai ? new Date(editingPkl.tanggal_selesai).toISOString().substring(0, 10) : ''}
            />
          </SimpleFormField>
        </div>

        {/* Seksi Geofencing Overrides */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl space-y-3.5 border border-slate-150/50 dark:border-slate-800/40">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
            Geofencing Khusus / Overrides (Opsional)
          </p>
          
          <label className="flex items-center gap-2.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl cursor-pointer select-none transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-900/40">
            <input
              type="checkbox"
              name="is_flexible_location"
              defaultChecked={editingPkl?.is_flexible_location || false}
              className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500/20 h-4.5 w-4.5 cursor-pointer dark:bg-slate-900 dark:border-slate-700"
            />
            <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">
              Lokasi Presensi Fleksibel (Toleransi Geofence dengan Verifikasi)
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimpleFormField htmlFor="plotting-lat-override" label="Latitude Override">
              <Input
                id="plotting-lat-override"
                name="lat_override"
                type="number"
                step="any"
                defaultValue={editingPkl?.lat_override ?? ''}
                placeholder="Contoh: -6.8914"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="plotting-lon-override" label="Longitude Override">
              <Input
                id="plotting-lon-override"
                name="lon_override"
                type="number"
                step="any"
                defaultValue={editingPkl?.lon_override ?? ''}
                placeholder="Contoh: 107.6104"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="plotting-radius-override" label="Radius Override (Meter)">
              <Input
                id="plotting-radius-override"
                name="radius_override"
                type="number"
                defaultValue={editingPkl?.radius_override ?? ''}
                placeholder="Contoh: 50"
                className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </SimpleFormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingPkl ? 'Simpan Perubahan' : 'Simpan Penempatan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
