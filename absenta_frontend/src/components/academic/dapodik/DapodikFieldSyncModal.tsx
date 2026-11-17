import React, { useState } from 'react';
import {
  Calendar,
  Hash,
  User,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface DapodikFieldSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudents: Array<{
    id: string;
    nama: string;
    nisn?: string;
    rombel?: string;
    absentaRaw?: any;
    dapodikRaw?: any;
  }>;
  onConfirm: (selectedFields: string[]) => void;
  isLoading?: boolean;
}

export const DapodikFieldSyncModal: React.FC<DapodikFieldSyncModalProps> = ({
  isOpen,
  onClose,
  targetStudents,
  onConfirm,
  isLoading = false,
}) => {
  // State pilihan kolom yang akan ditarik
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    tempat_lahir: true,
    tanggal_lahir: true,
    nisn: false,
    nis: false,
    nik: false,
    nama: false,
    jenis_kelamin: false,
    kelas_id: false, // Default ketat: Dikecualikan agar tidak merusak kelas Absenta!
  });

  if (!isOpen) return null;

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Actions
  const applyPresetHanyaLahir = () => {
    setSelectedFields({
      tempat_lahir: true,
      tanggal_lahir: true,
      nisn: false,
      nis: false,
      nik: false,
      nama: false,
      jenis_kelamin: false,
      kelas_id: false,
    });
  };

  const applyPresetBiodataTanpaKelas = () => {
    setSelectedFields({
      tempat_lahir: true,
      tanggal_lahir: true,
      nisn: true,
      nis: true,
      nik: true,
      nama: true,
      jenis_kelamin: true,
      kelas_id: false,
    });
  };

  const applyPresetSemuaTermasukKelas = () => {
    setSelectedFields({
      tempat_lahir: true,
      tanggal_lahir: true,
      nisn: true,
      nis: true,
      nik: true,
      nama: true,
      jenis_kelamin: true,
      kelas_id: true,
    });
  };

  const activeFieldKeys = Object.entries(selectedFields)
    .filter(([_, isChecked]) => isChecked)
    .map(([key]) => key);

  const isBirthOnly =
    selectedFields.tempat_lahir &&
    selectedFields.tanggal_lahir &&
    !selectedFields.nisn &&
    !selectedFields.nis &&
    !selectedFields.nik &&
    !selectedFields.nama &&
    !selectedFields.jenis_kelamin &&
    !selectedFields.kelas_id;

  const isExcludeClass =
    !selectedFields.kelas_id &&
    (selectedFields.tempat_lahir || selectedFields.nisn || selectedFields.nama);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeFieldKeys.length === 0) {
      return;
    }
    onConfirm(activeFieldKeys);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                Pilih Kolom Data yang Ingin Diperbarui
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tentukan biodata apa saja yang akan ditarik dari Dapodik untuk{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">{targetStudents.length} siswa</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pilihan Cepat (Preset):
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyPresetHanyaLahir}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isBirthOnly
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hanya Tempat &amp; Tgl Lahir</span>
              </button>

              <button
                type="button"
                onClick={applyPresetBiodataTanpaKelas}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isExcludeClass && !isBirthOnly
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Biodata Lengkap (Kecualikan Kelas)</span>
              </button>

              <button
                type="button"
                onClick={applyPresetSemuaTermasukKelas}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  selectedFields.kelas_id
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Semua Data (Termasuk Rombel)</span>
              </button>
            </div>
          </div>

          {/* Granular Field List */}
          <div className="space-y-2.5 pt-1">
            {/* 1. Tempat & Tanggal Lahir */}
            <div
              onClick={() => {
                const next = !selectedFields.tempat_lahir || !selectedFields.tanggal_lahir;
                setSelectedFields((prev) => ({
                  ...prev,
                  tempat_lahir: next,
                  tanggal_lahir: next,
                }));
              }}
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                selectedFields.tempat_lahir || selectedFields.tanggal_lahir
                  ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              )}
            >
              <input
                type="checkbox"
                checked={selectedFields.tempat_lahir && selectedFields.tanggal_lahir}
                onChange={() => {}}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tempat Lahir &amp; Tanggal Lahir</span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                    Aman
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Menyelaraskan kota tempat lahir dan tanggal lahir siswa dari Dapodik. Tidak mengubah kelas atau data lainnya.
                </p>
              </div>
            </div>

            {/* 2. Nomor Induk (NISN, NIS, NIK) */}
            <div
              onClick={() => {
                const next = !selectedFields.nisn || !selectedFields.nis || !selectedFields.nik;
                setSelectedFields((prev) => ({
                  ...prev,
                  nisn: next,
                  nis: next,
                  nik: next,
                }));
              }}
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                selectedFields.nisn || selectedFields.nis || selectedFields.nik
                  ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              )}
            >
              <input
                type="checkbox"
                checked={selectedFields.nisn && selectedFields.nis && selectedFields.nik}
                onChange={() => {}}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nomor Induk Siswa (NISN, NIS/NIPD, NIK)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Menyelaraskan NISN 10 digit, NIS sekolah, dan NIK kependudukan dari Dapodik.
                </p>
              </div>
            </div>

            {/* 3. Nama & Jenis Kelamin */}
            <div
              onClick={() => {
                const next = !selectedFields.nama || !selectedFields.jenis_kelamin;
                setSelectedFields((prev) => ({
                  ...prev,
                  nama: next,
                  jenis_kelamin: next,
                }));
              }}
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                selectedFields.nama || selectedFields.jenis_kelamin
                  ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              )}
            >
              <input
                type="checkbox"
                checked={selectedFields.nama && selectedFields.jenis_kelamin}
                onChange={() => {}}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nama Lengkap &amp; Jenis Kelamin</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Menyelaraskan penulisan ejaan nama resmi siswa dan jenis kelamin (L/P).
                </p>
              </div>
            </div>

            {/* 4. Rombel & Kelas Siswa (Peringatan Khusus) */}
            <div
              onClick={() => toggleField('kelas_id')}
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                selectedFields.kelas_id
                  ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              )}
            >
              <input
                type="checkbox"
                checked={Boolean(selectedFields.kelas_id)}
                onChange={() => {}}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <AlertTriangle className={cn('w-3.5 h-3.5', selectedFields.kelas_id ? 'text-rose-600' : 'text-slate-400')} />
                  <span>Rombel &amp; Kelas Siswa (Pindahkan Kelas)</span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.2 rounded border border-rose-200/60">
                    Berdampak pada Rombel
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Jika dicentang, kelas aktif siswa di Absenta akan <strong>dipindahkan</strong> mengikuti rombel Dapodik.
                  Biarkan <strong>tidak dicentang</strong> jika Anda ingin mempertahankan pembagian kelas yang sudah ada di Absenta.
                </p>
              </div>
            </div>
          </div>

          {/* Pratinjau Singkat Target Siswa */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold mb-1">
              <span>Siswa yang akan diperbarui:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{targetStudents.length} Siswa</span>
            </div>
            <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
              {targetStudents.slice(0, 3).map((s) => (
                <span key={s.id} className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                  {s.nama}
                </span>
              ))}
              {targetStudents.length > 3 && (
                <span className="text-slate-400 self-center">
                  +{targetStudents.length - 3} siswa lainnya
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>{activeFieldKeys.length} kategori kolom dipilih</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isLoading || activeFieldKeys.length === 0}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>{isLoading ? 'Memperbarui...' : `Perbarui ${targetStudents.length} Siswa`}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
