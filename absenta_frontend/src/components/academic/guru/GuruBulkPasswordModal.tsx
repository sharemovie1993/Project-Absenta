import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Sparkles, Users, RefreshCw } from 'lucide-react';
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

  // Progress & Execution States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState('');
  const [summaryResult, setSummaryResult] = useState<{
    total: number;
    updated: number;
    created: number;
    failed: number;
    message: string;
  } | null>(null);

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
    setSummaryResult(null);
    setProgressPercent(10);
    setProgressStatusText('Menyiapkan data target guru & enkripsi password NIP...');

    const timer1 = setTimeout(() => {
      setProgressPercent(35);
      setProgressStatusText('Mengecek status akun User & memvalidasi NIP guru...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgressPercent(65);
      setProgressStatusText('Meng-hash password Bcrypt & membuat akun User baru jika belum ada...');
    }, 1200);

    const timer3 = setTimeout(() => {
      setProgressPercent(88);
      setProgressStatusText('Menyimpan relasi User & memperbarui data guru...');
    }, 2000);

    try {
      const res = await bulkResetGuruPassword({
        mode,
        customPassword: mode === 'CUSTOM' ? customPassword : undefined,
        targetScope,
        guru_ids: targetScope === 'SELECTED' ? selectedGuruIds : undefined,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setProgressPercent(100);
      setProgressStatusText('Proses selesai 100%!');

      if (res.success) {
        setSummaryResult({
          total: res.total || 0,
          updated: res.updated || 0,
          created: res.created || 0,
          failed: res.failed || 0,
          message: res.message || 'Password massal guru berhasil diproses!'
        });
        toast.success(res.message || 'Password massal guru berhasil diproses!', { duration: 5000 });
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Gagal mereset password.');
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setProgressPercent(0);
      setProgressStatusText('');
      toast.error(err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setSummaryResult(null);
    setProgressPercent(0);
    setProgressStatusText('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
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
      {/* SUMMARY RESULT DISPLAY IF COMPLETED */}
      {summaryResult ? (
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={26} />
            </div>
            <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
              Eksekusi Reset Password Selesai!
            </h4>
            <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">
              {summaryResult.message}
            </p>
          </div>

          {/* Stat Badges */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Target</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">{summaryResult.total}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">Akun Baru</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">+{summaryResult.created}</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Password Reset</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{summaryResult.updated}</span>
            </div>
          </div>

          <ModalFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetModal}
              className="rounded-xl text-xs font-bold"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Proses Lagi
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Selesai & Tutup
            </Button>
          </ModalFooter>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* ACTIVE EXECUTION PROGRESS BAR */}
          {(isSubmitting || progressPercent > 0) && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>{progressStatusText}</span>
                </span>
                <span className="text-emerald-700 dark:text-emerald-300 font-mono font-black">{progressPercent}%</span>
              </div>

              {/* Animated Progress Track */}
              <div className="w-full h-3 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Mode Password Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sumber Password Baru <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  Memproses ({progressPercent}%)...
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
      )}
    </Modal>
  );
};
