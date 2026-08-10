import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Sparkles, School, Users, Check, AlertCircle, RefreshCw } from 'lucide-react';
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

    if (targetScope === 'KELAS' && !kelasId) {
      toast.error('Silakan pilih kelas target terlebih dahulu.');
      return;
    }

    if (targetScope === 'SELECTED' && selectedSiswaIds.length === 0) {
      toast.error('Tidak ada siswa yang dipilih.');
      return;
    }

    setIsSubmitting(true);
    setSummaryResult(null);
    setProgressPercent(10);
    setProgressStatusText('Menyiapkan data target siswa & enkripsi password NISN...');

    // Smooth Progress Simulation while Backend Executes
    const timer1 = setTimeout(() => {
      setProgressPercent(35);
      setProgressStatusText('Mengecek status akun User & memvalidasi NISN...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgressPercent(65);
      setProgressStatusText('Meng-hash password Bcrypt & membuat akun User baru jika belum ada...');
    }, 1200);

    const timer3 = setTimeout(() => {
      setProgressPercent(88);
      setProgressStatusText('Menyimpan relasi User & memperbarui data siswa...');
    }, 2000);

    try {
      const res = await bulkResetSiswaPassword({
        mode,
        customPassword: mode === 'CUSTOM' ? customPassword : undefined,
        targetScope,
        kelas_id: targetScope === 'KELAS' ? kelasId : undefined,
        siswa_ids: targetScope === 'SELECTED' ? selectedSiswaIds : undefined,
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
          message: res.message || 'Password massal berhasil diproses!'
        });
        toast.success(res.message || 'Password massal siswa berhasil diproses!', { duration: 5000 });
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

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Akun Baru</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">+{summaryResult.created}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">Password Reset</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{summaryResult.updated}</span>
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
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Selesai & Tutup
            </Button>
          </ModalFooter>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* ACTIVE EXECUTION PROGRESS BAR */}
          {(isSubmitting || progressPercent > 0) && (
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  <span>{progressStatusText}</span>
                </span>
                <span className="text-blue-700 dark:text-blue-300 font-mono font-black">{progressPercent}%</span>
              </div>

              {/* Animated Progress Track */}
              <div className="w-full h-3 bg-blue-200/60 dark:bg-blue-900/60 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-xs"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
              Target Siswa <span className="text-rose-500">*</span>
            </Label>
            <div className="space-y-2">
              {selectedSiswaIds.length > 0 && (
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="targetScope"
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
