import React from 'react';
import { Modal, Input, Label, Button, Alert, AlertDescription } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Info } from 'lucide-react';
import type { AttendanceDevice } from '@/api/attendance/device.api';

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDevice: AttendanceDevice | null;
  formData: {
    device_id: string;
    name: string;
    kelas_id: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    device_id: string;
    name: string;
    kelas_id: string;
  }>>;
  kelasOptions: { value: string; label: string }[];
  handleSave: () => void;
  isSaving: boolean;
}

export const DeviceFormModal: React.FC<DeviceFormModalProps> = React.memo(({
  isOpen,
  onClose,
  editingDevice,
  formData,
  setFormData,
  kelasOptions,
  handleSave,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDevice ? 'Pengaturan Perangkat' : 'Tambah Perangkat Baru'}
      className="max-w-md"
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="device_id">Device ID / Hardware MAC <span className="text-red-500">*</span></Label>
          <Input 
            id="device_id"
            aria-label="Device ID atau MAC Hardware"
            placeholder="Contoh: ESP32-GATE-01" 
            value={formData.device_id}
            onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
            disabled={!!editingDevice}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="device_name">Nama Terminal <span className="text-red-500">*</span></Label>
          <Input 
            id="device_name"
            aria-label="Nama Terminal Perangkat"
            placeholder="Contoh: Terminal Gerbang Barat" 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="device_kelas_select">Hubungkan ke Kelas (Opsional)</Label>
          <SearchableSelect 
            id="device_kelas_select"
            options={[{ value: '', label: '-- Tidak Dihubungkan --' }, ...(kelasOptions ?? [])]}
            value={formData.kelas_id}
            onValueChange={(val) => setFormData(prev => ({ ...prev, kelas_id: val }))}
            placeholder="Pilih Ruang Kelas"
          />
        </div>

        <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs">
            Perangkat yang dihubungkan ke kelas akan secara otomatis memproses absensi siswa pada kelas tersebut.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : editingDevice ? 'Simpan Perubahan' : 'Daftarkan Alat'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
