import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  School, 
  Users, 
  Check, 
  RefreshCw,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Modal, ModalFooter, Button, Label, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { DropdownOption, getJurusanForDropdown } from '../../../api/dropdown.api';
import { bulkResetSiswaPassword, countBulkResetSiswaTarget } from '../../../api/academic/siswa.api';
import toast from 'react-hot-toast';

interface SiswaBulkPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  kelasOptions: DropdownOption[];
  selectedSiswaIds?: string[];
  selectedKelasId?: string;
}

const TINGKAT_OPTIONS: DropdownOption[] = [
  { label: 'Tingkat X (Kelas 10)', value: '10' },
  { label: 'Tingkat XI (Kelas 11)', value: '11' },
  { label: 'Tingkat XII (Kelas 12)', value: '12' },
  { label: 'Tingkat XIII (Kelas 13 - 4 Tahun)', value: '13' },
];

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
  
  // Status filter: defaults strictly to 'AKTIF' for data safety
  const [statusFilter, setStatusFilter] = useState<'AKTIF' | 'ALL'>('AKTIF');

  // Target Scope Selection
  const [targetScope, setTargetScope] = useState<'ALL' | 'TINGKAT' | 'JURUSAN' | 'KELAS' | 'SELECTED'>(
    selectedSiswaIds.length > 0 ? 'SELECTED' : (selectedKelasId ? 'KELAS' : 'ALL')
  );
  const [tingkat, setTingkat] = useState<string>('10');
  const [jurusanId, setJurusanId] = useState<string>('');
  const [jurusanOptions, setJurusanOptions] = useState<DropdownOption[]>([]);
  const [kelasId, setKelasId] = useState(selectedKelasId);

  // Target count preview
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  
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

  // Fetch Jurusan Options for Filter
  useEffect(() => {
    if (isOpen) {
      getJurusanForDropdown()
        .then((data) => setJurusanOptions(data || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Live Count Preview whenever filters change
  useEffect(() => {
    if (!isOpen) return;

    if (targetScope === 'SELECTED') {
      setTargetCount(selectedSiswaIds.length);
      return;
    }

    let isMounted = true;
    setIsLoadingCount(true);

    const timer = setTimeout(async () => {
      try {
        const res = await countBulkResetSiswaTarget({
          targetScope,
          status: statusFilter,
          tingkat: targetScope === 'TINGKAT' ? tingkat : undefined,
          jurusan_id: targetScope === 'JURUSAN' ? jurusanId : undefined,
          kelas_id: targetScope === 'KELAS' ? kelasId : undefined,
        });
        if (isMounted && res.success) {
          setTargetCount(res.count);
        }
      } catch (err) {
        console.error('Failed to preview bulk reset target:', err);
      } finally {
        if (isMounted) setIsLoadingCount(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, targetScope, statusFilter, tingkat, jurusanId, kelasId, selectedSiswaIds.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'CUSTOM' && (!customPassword || customPassword.length < 6)) {
      toast.error('Kata sandi kustom minimal 6 karakter.');
      return;
    }

    if (targetScope === 'TINGKAT' && !tingkat) {
      toast.error('Silakan pilih tingkat target terlebih dahulu.');
      return;
    }

    if (targetScope === 'JURUSAN' && !jurusanId) {
      toast.error('Silakan pilih kejuruan target terlebih dahulu.');
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

    if (targetCount === 0) {
      toast.error('Tidak ada siswa yang sesuai dengan filter target.');
      return;
    }

    setIsSubmitting(true);
    setSummaryResult(null);
    setProgressPercent(10);
    setProgressStatusText(`Menyiapkan data target ${targetCount ? targetCount + ' ' : ''}siswa & enkripsi password...`);

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
      setProgressStatusText(`Menyimpan relasi User & transaksi data ${targetCount ? targetCount + ' ' : ''}siswa di server...`);
    }, 2000);

    try {
      const res = await bulkResetSiswaPassword({
        mode,
        customPassword: mode === 'CUSTOM' ? customPassword : undefined,
        targetScope,
        status: statusFilter,
        tingkat: targetScope === 'TINGKAT' ? tingkat : undefined,
        jurusan_id: targetScope === 'JURUSAN' ? jurusanId : undefined,
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
              Set password akun siswa dari NISN, NIS, atau kata sandi kustom
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

          {/* Filter Status Siswa (Aktif vs Semua) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Filter Status Siswa <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400">Penyaring basis data</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStatusFilter('AKTIF')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  statusFilter === 'AKTIF'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    Hanya Siswa Aktif
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold uppercase">Aman</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Kecualikan Alumni & Pindah</span>
                </div>
                {statusFilter === 'AKTIF' && <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStatusFilter('ALL')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Semua Status</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Termasuk Alumni, Pindah, DO</span>
                </div>
                {statusFilter === 'ALL' && <Check size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Target Scope Selection */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cakupan Target <span className="text-rose-500">*</span>
            </Label>
            
            <div className="space-y-2">
              {/* Siswa Terpilih (jika ada checklist) */}
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

              {/* Semua Siswa */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="targetScope"
                  disabled={isSubmitting}
                  checked={targetScope === 'ALL'}
                  onChange={() => setTargetScope('ALL')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Users size={15} className="text-slate-400" />
                  <span>
                    {statusFilter === 'AKTIF' ? 'Semua Siswa Aktif di Sekolah' : 'Semua Data Siswa di Sekolah'}
                  </span>
                </div>
              </label>

              {/* Per Tingkat */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="targetScope"
                  disabled={isSubmitting}
                  checked={targetScope === 'TINGKAT'}
                  onChange={() => setTargetScope('TINGKAT')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <GraduationCap size={15} className="text-slate-400" />
                  <span>Per Tingkat (Kelas X, XI, atau XII)</span>
                </div>
              </label>

              {targetScope === 'TINGKAT' && (
                <div className="pl-6 pt-0.5 animate-in fade-in duration-200">
                  <SearchableSelect
                    id="tingkatSelect"
                    value={tingkat}
                    disabled={isSubmitting}
                    onValueChange={(val) => setTingkat(val)}
                    options={TINGKAT_OPTIONS}
                    placeholder="Pilih Tingkat..."
                    triggerClassName="h-9 text-xs rounded-xl"
                  />
                </div>
              )}

              {/* Per Kejuruan / Jurusan */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="targetScope"
                  disabled={isSubmitting}
                  checked={targetScope === 'JURUSAN'}
                  onChange={() => setTargetScope('JURUSAN')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Layers size={15} className="text-slate-400" />
                  <span>Per Konsentrasi / Jurusan Keahlian</span>
                </div>
              </label>

              {targetScope === 'JURUSAN' && (
                <div className="pl-6 pt-0.5 animate-in fade-in duration-200">
                  <SearchableSelect
                    id="jurusanSelect"
                    value={jurusanId}
                    disabled={isSubmitting}
                    onValueChange={(val) => setJurusanId(val)}
                    options={jurusanOptions}
                    placeholder="Pilih Jurusan / Keahlian..."
                    triggerClassName="h-9 text-xs rounded-xl"
                  />
                </div>
              )}

              {/* Per Rombel / Kelas */}
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
                  <span>Spesifik Per Kelas / Rombel</span>
                </div>
              </label>

              {targetScope === 'KELAS' && (
                <div className="pl-6 pt-0.5 animate-in fade-in duration-200">
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

          {/* Live Preview Target Banner */}
          <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Estimasi Target Eksekusi:
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-black text-xs text-blue-700 dark:text-blue-300">
              {isLoadingCount ? (
                <span className="flex items-center gap-1 text-blue-500">
                  <Loader2 size={13} className="animate-spin" /> Menghitung...
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/70 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-extrabold text-xs">
                  {targetCount !== null ? `${targetCount.toLocaleString('id-ID')} Siswa` : '-'}
                </span>
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
              disabled={isSubmitting || isLoadingCount || targetCount === 0}
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
                  Eksekusi Reset {targetCount !== null ? `(${targetCount.toLocaleString('id-ID')} Siswa)` : ''}
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
};
