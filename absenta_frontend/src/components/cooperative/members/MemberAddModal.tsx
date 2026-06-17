import React from 'react';
import { Button, Input } from '../../ui';
import { Modal } from '../ui/Modal';
import { SmartStudentPicker } from '../../common/SmartStudentPicker';
import { cn } from '../../../lib/utils';

interface MemberAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    memberNo: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    siswaId: string;
    guruId: string;
    userId: string;
    pin: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEntitySelect: (entity: any) => void;
  selectedEntityId: string;
  isEmailEditable: boolean;
  isPhoneEditable: boolean;
  isAddressEditable: boolean;
  submitLoading: boolean;
  isExternal: boolean;
  onExternalToggle: (val: boolean) => void;
}

export const MemberAddModal: React.FC<MemberAddModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  onEntitySelect,
  selectedEntityId,
  isEmailEditable,
  isPhoneEditable,
  isAddressEditable,
  submitLoading,
  isExternal,
  onExternalToggle
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Anggota Baru"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Toggle Internal / External */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
          <button
            type="button"
            onClick={() => onExternalToggle(false)}
            className={cn(
              "flex-1 text-center py-2 text-xs font-black rounded-lg transition-all",
              !isExternal
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Siswa / Guru (Internal)
          </button>
          <button
            type="button"
            onClick={() => onExternalToggle(true)}
            className={cn(
              "flex-1 text-center py-2 text-xs font-black rounded-lg transition-all",
              isExternal
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Umum / Kantin (Eksternal)
          </button>
        </div>

        <Input
          label="Nomor Anggota"
          id="memberNo"
          name="memberNo"
          value={formData.memberNo}
          onChange={onInputChange}
          placeholder="Terisi otomatis"
          required
        />

        {!isExternal ? (
          <div className="space-y-1">
            <label htmlFor="smart-student-picker-universal" className="block text-sm font-medium text-slate-700 dark:text-slate-350">
              Cari Anggota (Siswa atau Guru)
            </label>
            <SmartStudentPicker
              mode="universal"
              scope="global"
              placeholder="Cari nama, NIS, NIP, scan kartu/QR..."
              onSelect={onEntitySelect}
            />
            <p className="text-[10px] text-slate-400">
              Mendukung pencarian dinamis, scan QR kamera, serta pembaca barcode/RFID kartu otomatis (HID).
            </p>
          </div>
        ) : (
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
            Pendaftaran anggota eksternal (umum) akan **otomatis membuatkan akun User login** dengan role khusus **ANGGOTA_KOPERASI_EXTERNAL** dan password awal: **koperasi123**.
          </div>
        )}

        <Input
          label="Nama Lengkap"
          id="name"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          required
          disabled={!isExternal}
          placeholder={
            isExternal 
              ? "Ketik nama lengkap" 
              : (!selectedEntityId ? "Pilih Siswa/Guru terlebih dahulu" : "Terisi otomatis")
          }
        />
        <Input
          label="Email"
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onInputChange}
          required={isExternal}
          disabled={!isExternal && (!selectedEntityId || !isEmailEditable)}
          placeholder={
            isExternal 
              ? "Ketik email (digunakan untuk login)" 
              : (!selectedEntityId 
                  ? "Pilih Siswa/Guru terlebih dahulu" 
                  : (isEmailEditable ? "Ketik email untuk melengkapi data induk" : "Terisi otomatis"))
          }
        />
        <Input
          label="No. Telepon / HP"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={onInputChange}
          required={isExternal}
          disabled={!isExternal && (!selectedEntityId || !isPhoneEditable)}
          placeholder={
            isExternal 
              ? "Ketik nomor telepon / HP" 
              : (!selectedEntityId 
                  ? "Pilih Siswa/Guru terlebih dahulu" 
                  : (isPhoneEditable ? "Ketik nomor telepon untuk melengkapi data induk" : "Terisi otomatis"))
          }
        />
        <Input
          label="Alamat"
          id="address"
          name="address"
          value={formData.address}
          onChange={onInputChange}
          disabled={!isExternal && (!selectedEntityId || !isAddressEditable)}
          placeholder={
            isExternal 
              ? "Ketik alamat tempat tinggal / kantin" 
              : (!selectedEntityId 
                  ? "Pilih Siswa/Guru terlebih dahulu" 
                  : (isAddressEditable ? "Ketik alamat untuk melengkapi data induk" : "Terisi otomatis"))
          }
        />
        <Input
          label="PIN Transaksi Koperasi (6-Digit)"
          id="pin"
          name="pin"
          type="password"
          maxLength={6}
          pattern="[0-9]{6}"
          inputMode="numeric"
          value={formData.pin}
          onChange={onInputChange}
          disabled={!isExternal && !selectedEntityId}
          placeholder={
            !isExternal && !selectedEntityId 
              ? "Pilih Siswa/Guru terlebih dahulu" 
              : "Masukkan 6 digit angka (Default: 123456)"
          }
        />
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            isLoading={submitLoading}
          >
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
