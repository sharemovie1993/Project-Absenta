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
  Sliders,
  MapPin,
  CreditCard,
  Users,
  Check,
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

interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'identitas' | 'kelahiran' | 'profil' | 'rombel';
  badge?: string;
  badgeVariant?: 'safe' | 'warning' | 'danger';
}

const AVAILABLE_FIELDS: FieldDefinition[] = [
  // Kelahiran
  {
    key: 'tanggal_lahir',
    label: 'Tanggal Lahir',
    description: 'Menyelaraskan format tanggal lahir (YYYY-MM-DD) dari Dapodik.',
    icon: Calendar,
    category: 'kelahiran',
    badge: 'Aman',
    badgeVariant: 'safe',
  },
  {
    key: 'tempat_lahir',
    label: 'Tempat Lahir',
    description: 'Menyelaraskan kota tempat lahir resmi dari Dapodik.',
    icon: MapPin,
    category: 'kelahiran',
    badge: 'Aman',
    badgeVariant: 'safe',
  },

  // Nomor Induk & Identitas
  {
    key: 'nisn',
    label: 'NISN (10 Digit)',
    description: 'Menyelaraskan Nomor Induk Siswa Nasional 10 digit Dapodik.',
    icon: Hash,
    category: 'identitas',
    badge: 'Identitas',
    badgeVariant: 'safe',
  },
  {
    key: 'nis',
    label: 'NIS / NIPD',
    description: 'Menyelaraskan Nomor Induk Siswa / NIPD lokal sekolah.',
    icon: Hash,
    category: 'identitas',
    badge: 'Sekolah',
    badgeVariant: 'safe',
  },
  {
    key: 'nik',
    label: 'NIK (16 Digit)',
    description: 'Menyelaraskan Nomor Induk Kependudukan (KTP/KK) siswa.',
    icon: CreditCard,
    category: 'identitas',
    badge: 'Dukcapil',
    badgeVariant: 'safe',
  },

  // Profil Personal
  {
    key: 'nama',
    label: 'Nama Lengkap Siswa',
    description: 'Menyelaraskan ejaan penulisan nama resmi siswa dari Dapodik.',
    icon: User,
    category: 'profil',
  },
  {
    key: 'jenis_kelamin',
    label: 'Jenis Kelamin (L/P)',
    description: 'Menyelaraskan status jenis kelamin resmi (Laki-laki/Perempuan).',
    icon: Users,
    category: 'profil',
  },

  // Rombel & Kelas
  {
    key: 'kelas_id',
    label: 'Rombel & Kelas (Pindahkan Kelas)',
    description: 'Memindahkan kelas aktif siswa di Absenta mengikuti rombongan belajar Dapodik.',
    icon: AlertTriangle,
    category: 'rombel',
    badge: 'Berdampak pada Rombel',
    badgeVariant: 'danger',
  },
];

export const DapodikFieldSyncModal: React.FC<DapodikFieldSyncModalProps> = ({
  isOpen,
  onClose,
  targetStudents,
  onConfirm,
  isLoading = false,
}) => {
  // State granular pilihan kolom yang akan ditarik
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    tanggal_lahir: true,
    tempat_lahir: true,
    nisn: false,
    nis: false,
    nik: false,
    nama: false,
    jenis_kelamin: false,
    kelas_id: false, // Default aman: dikecualikan agar tidak merusak kelas Absenta
  });

  if (!isOpen) return null;

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Preset Handlers
  const applyPresetHanyaLahir = () => {
    setSelectedFields({
      tanggal_lahir: true,
      tempat_lahir: true,
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
      tanggal_lahir: true,
      tempat_lahir: true,
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
      tanggal_lahir: true,
      tempat_lahir: true,
      nisn: true,
      nis: true,
      nik: true,
      nama: true,
      jenis_kelamin: true,
      kelas_id: true,
    });
  };

  const applyPresetKustomReset = () => {
    setSelectedFields({
      tanggal_lahir: false,
      tempat_lahir: false,
      nisn: false,
      nis: false,
      nik: false,
      nama: false,
      jenis_kelamin: false,
      kelas_id: false,
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

  const isBiodataExcludeClass =
    !selectedFields.kelas_id &&
    selectedFields.tempat_lahir &&
    selectedFields.tanggal_lahir &&
    selectedFields.nisn &&
    selectedFields.nis &&
    selectedFields.nik &&
    selectedFields.nama &&
    selectedFields.jenis_kelamin;

  const isAllIncluded =
    selectedFields.kelas_id &&
    selectedFields.tempat_lahir &&
    selectedFields.tanggal_lahir &&
    selectedFields.nisn &&
    selectedFields.nis &&
    selectedFields.nik &&
    selectedFields.nama &&
    selectedFields.jenis_kelamin;

  const isCustomMode = !isBirthOnly && !isBiodataExcludeClass && !isAllIncluded;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeFieldKeys.length === 0) {
      return;
    }
    onConfirm(activeFieldKeys);
  };

  // Group fields by category
  const categories = [
    { id: 'identitas', title: 'Nomor Induk & Identitas Resmi', icon: Hash },
    { id: 'kelahiran', title: 'Data Kelahiran', icon: Calendar },
    { id: 'profil', title: 'Profil Personal Siswa', icon: User },
    { id: 'rombel', title: 'Rombongan Belajar & Kelas', icon: AlertTriangle },
  ];

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
                Pilih kolom data spesifik yang akan ditarik dari Dapodik untuk{' '}
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
          {/* Quick Preset Buttons (Termasuk Mode Kustom) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pilihan Cepat (Preset):
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {activeFieldKeys.length} dari {AVAILABLE_FIELDS.length} kolom aktif
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={applyPresetHanyaLahir}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isBirthOnly
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-600/20'
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
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isBiodataExcludeClass
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-600/20'
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
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isAllIncluded
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs ring-2 ring-rose-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Semua Data (Termasuk Rombel)</span>
              </button>

              {/* Varian Custom / Kosongkan untuk Pilih Bebas */}
              <button
                type="button"
                onClick={applyPresetKustomReset}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                  isCustomMode
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs ring-2 ring-amber-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
                title="Pilih sendiri hanya kolom data yang Anda butuhkan"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Kustom (Pilih Bebas)</span>
              </button>
            </div>
          </div>

          {/* Granular Field List (Bisa Dicentang Bebas Satu per Satu) */}
          <div className="space-y-3 pt-1">
            {categories.map((cat) => {
              const fields = AVAILABLE_FIELDS.filter((f) => f.category === cat.id);
              if (fields.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <cat.icon className="w-3 h-3 text-slate-400" />
                      {cat.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {fields.map((field) => {
                      const isChecked = Boolean(selectedFields[field.key]);
                      const isDanger = field.key === 'kelas_id';

                      return (
                        <div
                          key={field.key}
                          onClick={() => toggleField(field.key)}
                          className={cn(
                            'p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none',
                            isChecked
                              ? isDanger
                                ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/25 ring-1 ring-rose-500/20'
                                : 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20'
                              : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className={cn(
                              'mt-0.5 rounded w-4 h-4 cursor-pointer',
                              isDanger
                                ? 'text-rose-600 focus:ring-rose-500'
                                : 'text-indigo-600 focus:ring-indigo-500'
                            )}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                              <field.icon
                                className={cn(
                                  'w-3.5 h-3.5',
                                  isChecked
                                    ? isDanger
                                      ? 'text-rose-600'
                                      : 'text-indigo-600'
                                    : 'text-slate-400'
                                )}
                              />
                              <span>{field.label}</span>
                              {field.badge && (
                                <span
                                  className={cn(
                                    'text-[9px] font-bold px-1.5 py-0.2 rounded border',
                                    field.badgeVariant === 'danger'
                                      ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200/60'
                                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60'
                                  )}
                                >
                                  {field.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {field.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pratinjau Singkat Target Siswa */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold mb-1">
              <span>Siswa yang akan diperbarui:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {targetStudents.length} Siswa
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
              {targetStudents.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600"
                >
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
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              {activeFieldKeys.length === 0 ? (
                <span className="text-rose-500 font-bold">Pilih minimal 1 kolom data</span>
              ) : (
                <span>
                  <strong>{activeFieldKeys.length} kolom</strong> terpilih ({activeFieldKeys.join(', ')})
                </span>
              )}
            </span>
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
