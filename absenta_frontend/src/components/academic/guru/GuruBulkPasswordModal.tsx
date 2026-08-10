import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react';
import { Modal, ModalFooter, Button, Label, Input } from '../../ui';
import { bulkResetGuruPassword } from '../../../api/academic/guru.api';
import toast from 'react-hot-toast';

interface GuruBulkPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedGuruIds?: string[];
}

export const GuruBulkPasswordModal: React.FC<GuruBulkPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedGuruIds = []
}) => {
  const [mode, setMode] = useState<'NIP' | 'CUSTOM'>('NIP');
  const [customPassword, setCustomPassword] = useState('');
  const [targetScope, setTargetScope] = useState<'ALL' | 'SELECTED'>(
    selectedGuruIds.length > 0 ? 'SELECTED' : 'ALL'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'CUSTOM' && (!customPassword || customPassword.length < 6)) {
      toast.error('Kata sandi kustom minimal 6 karakter.');
      return;
    }

    if (targetScope === 'SELECTED' && selectedGuruIds.length === 0) {
      toast.error('Tidak ada guru yang dipilih.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Memproses generate/reset password massal guru...');

    try {
      const res = await bulkResetGuruPassword({
        mode,
        customPassword: mode === 'CUSTOM' ? customPassword : undefined,
        targetScope,
        guru_ids: targetScope === 'SELECTED' ? selectedGuruIds : undefined,
      });

      if (res.success) {
        toast.success(res.message || 'Password massal guru berhasil diproses!', { id: toastId, duration: 5000 });
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
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <KeyRound size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Reset / Generate Password Massal Guru
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Set password akun guru dari NIP atau password kustom
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode('NIP')}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                mode === 'NIP'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Gunakan NIP Guru</span>
                <Sparkles size={15} className={mode === 'NIP' ? 'text-emerald-500' : 'text-slate-400'} />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Password = Nomor NIP Guru</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('CUSTOM')}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                mode === 'CUSTOM'
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Kata Sandi Kustom</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Sama untuk semua guru</span>
            </button>
          </div>
        </div>

        {/* Custom Password Input */}
        {mode === 'CUSTOM' && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label htmlFor="customPasswordGuru" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kata Sandi Baru <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="customPasswordGuru"
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
            Target Guru <span className="text-rose-500">*</span>
          </Label>
          <div className="space-y-2">
            {selectedGuruIds.length > 0 && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 cursor-pointer">
                <input
                  type="radio"
                  name="targetScopeGuru"
                  checked={targetScope === 'SELECTED'}
                  onChange={() => setTargetScope('SELECTED')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <Users size={15} className="text-emerald-500" />
                  <span>{selectedGuruIds.length} Guru Terpilih (Centang Tabel)</span>
                </div>
              </label>
            )}

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
              <input
                type="radio"
                name="targetScopeGuru"
                checked={targetScope === 'ALL'}
                onChange={() => setTargetScope('ALL')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Semua Guru di Sekolah</span>
            </label>
          </div>
        </div>

        {/* Alert Info Notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert size={15} className="text-amber-500 shrink-0" />
            <span>Pembuatan Akun Otomatis</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/80">
            Guru yang belum memiliki akun pengguna akan <strong>otomatis dibuatkan akun User baru</strong> (email: <code>nip@absenta.id</code>) sehingga guru langsung dapat login menggunakan NIP & password baru.
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
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
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
