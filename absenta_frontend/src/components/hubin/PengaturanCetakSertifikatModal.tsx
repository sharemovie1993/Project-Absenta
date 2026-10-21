import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  X, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  RotateCcw, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export interface SertifikatPklPrintSettings {
  showLogoKanan: boolean;
  showLogoKiri: boolean;
  showDudiName: boolean;
  showPicName: boolean;
  overrideJabatan?: string;
  overrideTanggalTerbit?: string;
  overrideDurasiJp?: string;
  overrideKepalaSekolah?: string;
  overrideNipKepala?: string;
}

export const SERTIFIKAT_SETTINGS_KEY = 'absenta_sertifikat_settings';

export const DEFAULT_SERTIFIKAT_SETTINGS: SertifikatPklPrintSettings = {
  showLogoKanan: false,
  showLogoKiri: true,
  showDudiName: true,
  showPicName: true,
  overrideJabatan: '',
  overrideTanggalTerbit: '',
  overrideDurasiJp: '',
  overrideKepalaSekolah: '',
  overrideNipKepala: '',
};

export const getStoredSertifikatSettings = (): SertifikatPklPrintSettings => {
  try {
    const raw = localStorage.getItem(SERTIFIKAT_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SERTIFIKAT_SETTINGS, ...JSON.parse(raw) };
    }
    const legacyLogoKanan = localStorage.getItem('absenta_sertifikat_logo_kanan') === 'true';
    const legacyPicName = localStorage.getItem('absenta_sertifikat_show_pic_name') !== 'false';
    return {
      ...DEFAULT_SERTIFIKAT_SETTINGS,
      showLogoKanan: legacyLogoKanan,
      showPicName: legacyPicName,
    };
  } catch {
    return DEFAULT_SERTIFIKAT_SETTINGS;
  }
};

export const saveStoredSertifikatSettings = (settings: SertifikatPklPrintSettings) => {
  try {
    localStorage.setItem(SERTIFIKAT_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem('absenta_sertifikat_logo_kanan', String(settings.showLogoKanan));
    localStorage.setItem('absenta_sertifikat_show_pic_name', String(settings.showPicName));
  } catch (e) {
    console.error('Failed to save sertifikat settings to localStorage:', e);
  }
};

interface PengaturanCetakSertifikatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SertifikatPklPrintSettings;
  onSave: (newSettings: SertifikatPklPrintSettings) => void;
  defaultData?: {
    namaSekolah?: string;
    kepalaSekolah?: string;
    nipKepala?: string;
    tanggalTerbit?: string;
    durasiJp?: string;
    mitraNama?: string;
    picJabatan?: string;
  };
}

export const PengaturanCetakSertifikatModal: React.FC<PengaturanCetakSertifikatModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  defaultData,
}) => {
  const [formState, setFormState] = useState<SertifikatPklPrintSettings>(currentSettings);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormState(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof SertifikatPklPrintSettings) => {
    setFormState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (key: keyof SertifikatPklPrintSettings, val: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleReset = () => {
    setFormState(DEFAULT_SERTIFIKAT_SETTINGS);
    toast.info('Pengaturan dikembalikan ke setelan default');
  };

  const handleSave = () => {
    saveStoredSertifikatSettings(formState);
    onSave(formState);
    toast.success('Pengaturan cetak sertifikat berhasil disimpan!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-settings-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 id="modal-settings-title" className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                Pengaturan Cetak Sertifikat PKL
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesuaikan opsi kop surat, tanda tangan, dan informasi sertifikat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
          {/* Section 1: Pengaturan Tanda Tangan Mitra (Halaman Belakang) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Building2 size={15} />
              <span>Tanda Tangan & Mitra (Halaman Belakang / Nilai)</span>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-4">
              {/* Toggle Nama PIC / Polos */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-600 dark:text-blue-400" />
                    Nama PIC / Pimpinan di Atas Garis TTD
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pilih apakah nama penanggung jawab dicetak di atas garis atau <strong className="text-slate-700 dark:text-slate-200">dipoloskan/kosong</strong> untuk tanda tangan dan penulisan nama basah.
                  </p>
                </div>
                <div className="flex bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl border border-slate-300/80 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormState((p) => ({ ...p, showPicName: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formState.showPicName
                        ? 'bg-white text-blue-700 shadow-xs dark:bg-blue-600 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Tampil (ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState((p) => ({ ...p, showPicName: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !formState.showPicName
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Polos (OFF)
                  </button>
                </div>
              </div>

              {/* Toggle Nama DUDI */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/40 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    Nama DUDI / Instansi pada TTD
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mencantumkan nama perusahaan mitra di bawah teks <em>Penanggung Jawab Perusahaan / Instansi</em> (1 baris).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showDudiName')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 cursor-pointer ${
                    formState.showDudiName ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={formState.showDudiName}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      formState.showDudiName ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Input Override Label Jabatan */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/40 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Override Label Jabatan di Bawah Garis (Opsional)
                </label>
                <input
                  type="text"
                  placeholder={`Default: ${defaultData?.picJabatan || 'Pimpinan / Pembimbing Lapangan'}`}
                  value={formState.overrideJabatan || ''}
                  onChange={(e) => handleInputChange('overrideJabatan', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Kosongkan untuk menggunakan jabatan otomatis dari data penempatan DUDI.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Kop Surat & Logo (Halaman Depan) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={15} />
              <span>Kop Surat & Logo Sekolah (Halaman Depan)</span>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-4">
              {/* Toggle Logo Kanan */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Logo Kanan (Logo Sekolah)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menampilkan logo sekolah di sebelah kanan kop surat resmi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showLogoKanan')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 cursor-pointer ${
                    formState.showLogoKanan ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={formState.showLogoKanan}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      formState.showLogoKanan ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Logo Kiri */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/40 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
                    Logo Kiri (Logo Daerah / Pemda)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menampilkan logo pemerintah daerah / provinsi di sebelah kiri kop surat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showLogoKiri')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 cursor-pointer ${
                    formState.showLogoKiri !== false ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={formState.showLogoKiri !== false}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      formState.showLogoKiri !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Informasi Terbit & Pejabat (Opsional Override) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Calendar size={15} />
              <span>Informasi Terbit & Penandatangan (Opsional)</span>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Tanggal & Tempat Terbit
                </label>
                <input
                  type="text"
                  placeholder={defaultData?.tanggalTerbit || 'Purwakarta, 22 Desember 2025'}
                  value={formState.overrideTanggalTerbit || ''}
                  onChange={(e) => handleInputChange('overrideTanggalTerbit', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  Durasi JP (Jam Pelajaran)
                </label>
                <input
                  type="text"
                  placeholder={defaultData?.durasiJp || '792'}
                  value={formState.overrideDurasiJp || ''}
                  onChange={(e) => handleInputChange('overrideDurasiJp', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  placeholder={defaultData?.kepalaSekolah || 'Nama Kepala Sekolah'}
                  value={formState.overrideKepalaSekolah || ''}
                  onChange={(e) => handleInputChange('overrideKepalaSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCheck2 size={13} className="text-slate-400" />
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  placeholder={defaultData?.nipKepala || '19711102...'}
                  value={formState.overrideNipKepala || ''}
                  onChange={(e) => handleInputChange('overrideNipKepala', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <RotateCcw size={14} />
            Reset Default
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
