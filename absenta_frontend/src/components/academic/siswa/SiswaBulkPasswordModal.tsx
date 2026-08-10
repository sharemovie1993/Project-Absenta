import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Sparkles, School, Users } from 'lucide-react';
import { Modal, ModalFooter, Button, Label, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { DropdownOption } from '../../../api/dropdown.api';
import { bulkResetSiswaPassword } from '../../../api/academic/siswa.api';
import toast from 'react-hot-toast';

interface SiswaBulkPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  kelasOptions: DropdownOption[];
  selectedSiswaIds?: string[];
  selectedKelasId?: string;
}

export const SiswaBulkPasswordModal: React.FC<SiswaBulkPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  kelasOptions,
  selectedSiswaIds = [],
  selectedKelasId = ''
}) => {
  const [mode, setMode] = useState<'NISN' | 'NIS' | 'CUSTOM'>('NISN');
  const [customPassword, setCustomPassword] = useState('');
  const [targetScope, setTargetScope] = useState<'ALL' | 'KELAS' | 'SELECTED'>(
    selectedSiswaIds.length > 0 ? 'SELECTED' : (selectedKelasId ? 'KELAS' : 'ALL')
  );
  const [kelasId, setKelasId] = useState(selectedKelasId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'CUSTOM' && (!customPassword || customPassword.length < 6)) {
      toast.error('Kata sandi kustom minimal 6 karakter.');
      return;
    }

    if (targetScope === 'KELAS' && !kelasId) {
      toast.error('Silakan pilih kelas target terlebih dahulu.');
      return;
    }

    if (targetScope === 'SELECTED' && selectedSiswaIds.length === 0) {
      toast.error('Tidak ada siswa yang dipilih.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Memproses generate/reset password massal siswa...');

    try {
      const res = await bulkResetSiswaPassword({
        mode,
        customPassword: mode === 'CUSTOM' ? customPassword : undefined,
        targetScope,
        kelas_id: targetScope === 'KELAS' ? kelasId : undefined,
        siswa_ids: targetScope === 'SELECTED' ? selectedSiswaIds : undefined,
      });

      if (res.success) {
        toast.success(res.message || 'Password massal berhasil diproses!', { id: toastId, duration: 5000 });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Gagal mereset password.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <KeyRound size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Reset / Generate Password Massal Siswa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Set password akun siswa dari NISN atau password kustom
            </p>
          </div>
        </div>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Mode Password Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Sumber Password Baru <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('NISN')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                mode === 'NISN'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Dari NISN</span>
                <Sparkles size={14} className={mode === 'NISN' ? 'text-blue-500' : 'text-slate-400'} />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Password = NISN Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('NIS')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                mode === 'NIS'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Dari NIS</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Password = NIS Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('CUSTOM')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                mode === 'CUSTOM'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Kustom</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Sama untuk semua</span>
            </button>
          </div>
        </div>

        {/* Custom Password Input */}
        {mode === 'CUSTOM' && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label htmlFor="customPassword" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kata Sandi Baru <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="customPassword"
              type="password"
              placeholder="Masukkan kata sandi (min 6 karakter)..."
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              className="h-10 text-xs font-semibold rounded-xl"
            />
          </div>
        )}

        {/* Target Scope Selection */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Siswa <span className="text-rose-500">*</span>
          </Label>
          <div className="space-y-2">
            {selectedSiswaIds.length > 0 && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 cursor-pointer">
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'SELECTED'}
                  onChange={() => setTargetScope('SELECTED')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <Users size={15} className="text-blue-500" />
                  <span>{selectedSiswaIds.length} Siswa Terpilih (Centang Tabel)</span>
                </div>
              </label>
            )}

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
              <input
                type="radio"
                name="targetScope"
                checked={targetScope === 'ALL'}
                onChange={() => setTargetScope('ALL')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Semua Siswa di Sekolah</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
              <input
                type="radio"
                name="targetScope"
                checked={targetScope === 'KELAS'}
                onChange={() => setTargetScope('KELAS')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <School size={15} className="text-slate-400" />
                <span>Spesifik Per Kelas</span>
              </div>
            </label>

            {targetScope === 'KELAS' && (
              <div className="pl-6 pt-1">
                <SearchableSelect
                  id="kelasId"
                  value={kelasId}
                  onValueChange={(val) => setKelasId(val)}
                  options={kelasOptions}
                  placeholder="Pilih Kelas Target..."
                  triggerClassName="h-9 text-xs rounded-xl"
                />
              </div>
            )}
          </div>
        </div>

        {/* Alert Info Notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert size={15} className="text-amber-500 shrink-0" />
            <span>Pembuatan Akun Otomatis</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/80">
            Siswa yang belum memiliki akun pengguna akan <strong>otomatis dibuatkan akun User baru</strong> (email: <code>nisn@absenta.id</code>) sehingga siswa langsung dapat login menggunakan NISN & password baru.
          </p>
        </div>

        <ModalFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="mr-2" />
                Eksekusi Reset Password
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
