import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../ui';
import { Modal } from '../ui/Modal';
import { SmartStudentPicker } from '../../common/SmartStudentPicker';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { useKelasOptions } from '../../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../../hooks/useSiswaOptions';
import { useGuruOptions } from '../../../hooks/useGuruOptions';
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
  onEntitySelect: (entity: unknown) => void;
  selectedEntityId: string;
  isEmailEditable: boolean;
  isPhoneEditable: boolean;
  isAddressEditable: boolean;
  submitLoading: boolean;
  isExternal: boolean;
  onExternalToggle: (val: boolean) => void;
}

export const MemberAddModal: React.FC<MemberAddModalProps> = React.memo(({
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
  const [selectionMethod, setSelectionMethod] = useState<'smart' | 'siswa' | 'guru'>('smart');
  const [internalKelasId, setInternalKelasId] = useState<string>('');

  // Canonical hooks for Single Source of Truth
  const { options: kelasOptions, isLoading: isKelasLoading } = useKelasOptions({ onlyActive: true });
  const { options: siswaOptions, isLoading: isSiswaLoading } = useSiswaOptions({
    kelasId: internalKelasId || undefined,
    onlyActive: true,
  });
  const { options: guruOptions, isLoading: isGuruLoading } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: true,
  });

  useEffect(() => {
    if (!isOpen) {
      setInternalKelasId('');
    }
  }, [isOpen]);

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
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            {/* Sub-selector Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pencarian / Sumber Data
              </span>
              <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectionMethod('smart')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    selectionMethod === 'smart'
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  Scan / Cari
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMethod('siswa')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    selectionMethod === 'siswa'
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  Siswa (Kelas)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMethod('guru')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    selectionMethod === 'guru'
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  Guru & Staf
                </button>
              </div>
            </div>

            {selectionMethod === 'smart' && (
              <div className="space-y-1">
                <SmartStudentPicker
                  ref={undefined}
                  id="smart-student-picker-universal"
                  mode="universal"
                  scope="global"
                  placeholder="Cari nama, NIS, NIP, scan kartu/QR..."
                  onSelect={onEntitySelect}
                />
                <p className="text-[10px] text-slate-400">
                  Mendukung pencarian dinamis, scan QR kamera, serta pembaca barcode/RFID kartu otomatis (HID).
                </p>
              </div>
            )}

            {selectionMethod === 'siswa' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pilih Kelas</label>
                  <SearchableSelect
                    value={internalKelasId}
                    onValueChange={(val) => {
                      setInternalKelasId(val);
                    }}
                    options={kelasOptions}
                    placeholder="Pilih kelas..."
                    searchPlaceholder="Cari kelas..."
                    isLoading={isKelasLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pilih Siswa</label>
                  <SearchableSelect
                    value={selectedEntityId}
                    onValueChange={(val) => {
                      const selectedOpt = siswaOptions.find(o => o.value === val);
                      if (selectedOpt && (selectedOpt as any).raw) {
                        onEntitySelect({
                          ...(selectedOpt as any).raw,
                          _type: 'siswa',
                        });
                      }
                    }}
                    options={siswaOptions}
                    placeholder={internalKelasId ? "Pilih siswa..." : "Pilih kelas terlebih dahulu..."}
                    searchPlaceholder="Cari nama / NIS siswa..."
                    disabled={!internalKelasId}
                    isLoading={isSiswaLoading}
                  />
                </div>
              </div>
            )}

            {selectionMethod === 'guru' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pilih Guru / Tenaga Kependidikan</label>
                <SearchableSelect
                  value={selectedEntityId}
                  onValueChange={(val) => {
                    const selectedOpt = guruOptions.find(o => o.value === val);
                    if (selectedOpt && (selectedOpt as any).raw) {
                      onEntitySelect({
                        ...(selectedOpt as any).raw,
                        _type: 'guru',
                      });
                    }
                  }}
                  options={guruOptions}
                  placeholder="Pilih nama guru / staf..."
                  searchPlaceholder="Cari nama / NIP guru..."
                  isLoading={isGuruLoading}
                />
              </div>
            )}
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
});
