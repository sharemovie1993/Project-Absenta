import React, { useRef, useState } from 'react';
import { Building, Phone, Mail, Globe, MapPin, FileText, Percent, Save, Upload, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { Button, SectionCard, Input, Label, Textarea } from '../../ui';
import type { CooperativeSettings } from './types';
import axiosInstance from '@/lib/axiosInstance';

interface CooperativeProfileFormProps {
  formData: CooperativeSettings;
  saving: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  effectiveLogoUrl: string;
  canEditProfile: boolean;
  /** Handler khusus untuk toggle boolean sebagai string ('true'/'false') */
  onToggleChange?: (name: keyof CooperativeSettings, value: string) => void;
}

export const CooperativeProfileForm = React.memo<CooperativeProfileFormProps>(({
  formData,
  saving,
  onInputChange,
  onSubmit,
  effectiveLogoUrl,
  canEditProfile,
  onToggleChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        onInputChange({
          target: { name: 'cooperative_logo_url', value: fileUrl }
        } as React.ChangeEvent<HTMLInputElement>);
      }
    } catch (err) {
      console.error('Failed to upload cooperative logo:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SectionCard fullWidth className="p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900/90 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Building size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Profil & Badan Hukum</h3>
            <p className="text-xs text-slate-400">Pastikan informasi di bawah ini sesuai dengan akta pendirian resmi</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Logo Koperasi Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-200/70 dark:border-slate-800/80 rounded-xl bg-slate-50/60 dark:bg-slate-950/30">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner p-1.5">
              <img 
                src={effectiveLogoUrl} 
                alt="Logo Koperasi" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
          </div>
          <div className="flex-1 space-y-1.5 w-full">
            <label htmlFor="cooperative_logo_url" className="text-xs font-bold text-slate-600 dark:text-slate-400">
              URL Logo Koperasi
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="cooperative_logo_url"
                name="cooperative_logo_url"
                value={formData.cooperative_logo_url || ''}
                onChange={onInputChange}
                placeholder="https://alamat-logo.png/gambar.png"
                disabled={!canEditProfile}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/*"
                className="hidden"
                disabled={!canEditProfile}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEditProfile || isUploading}
                className="shrink-0 h-9 px-3.5 text-xs flex items-center gap-1.5 border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 font-semibold"
              >
                {isUploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                <span>Unggah</span>
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              {formData.cooperative_logo_url ? 'Menggunakan logo khusus koperasi.' : 'Menggunakan logo sekolah utama (default).'}
            </p>
          </div>
        </div>

        {/* Baris 1: Nama Koperasi + Nomor Badan Hukum */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="cooperative_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Koperasi <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <Building size={16} />
              </span>
              <Input
                type="text"
                id="cooperative_name"
                name="cooperative_name"
                value={formData.cooperative_name || ''}
                onChange={onInputChange}
                required
                disabled={!canEditProfile}
                placeholder="Contoh: KOPERASI KARYAWAN SEJAHTERA SMKN 1"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cooperative_legal_no" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nomor Badan Hukum
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <FileText size={16} />
              </span>
              <Input
                type="text"
                id="cooperative_legal_no"
                name="cooperative_legal_no"
                value={formData.cooperative_legal_no || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: 123/BH/PAD/XX/2026"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Baris 2: Telepon + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="cooperative_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nomor Telepon
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <Phone size={16} />
              </span>
              <Input
                type="text"
                id="cooperative_phone"
                name="cooperative_phone"
                value={formData.cooperative_phone || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: 021-xxxxxxx"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cooperative_email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Koperasi
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <Mail size={16} />
              </span>
              <Input
                type="email"
                id="cooperative_email"
                name="cooperative_email"
                value={formData.cooperative_email || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: cooperative@school.sch.id"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Baris 3: Website + Suku Bunga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="cooperative_website" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Website Resmi
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <Globe size={16} />
              </span>
              <Input
                type="text"
                id="cooperative_website"
                name="cooperative_website"
                value={formData.cooperative_website || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: www.cooperative.school.sch.id"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cooperative_default_interest_rate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Suku Bunga Default (% / Bulan)
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none z-10">
                <Percent size={16} />
              </span>
              <Input
                type="number"
                step="0.1"
                id="cooperative_default_interest_rate"
                name="cooperative_default_interest_rate"
                value={formData.cooperative_default_interest_rate || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: 1.5"
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* ─── Kebijakan Masa Keanggotaan Minimum ─────────────────────────────────── */}
        <div className="p-4 border border-violet-200/70 dark:border-violet-800/50 rounded-xl bg-violet-50/40 dark:bg-violet-950/20 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Kebijakan Masa Keanggotaan Sebelum Pinjaman
              </h4>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Wajibkan anggota telah bergabung minimal N bulan sebelum dapat mengajukan pinjaman.
              </p>
            </div>
          </div>

          {/* Toggle Aktif/Nonaktif */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Aktifkan Pembatasan
              </span>
              <span className="text-[10px] text-slate-400">
                {formData.cooperative_loan_min_membership_enabled === 'true' ? 'Kebijakan ini sedang AKTIF.' : 'Kebijakan ini sedang NONAKTIF — semua anggota boleh pinjam kapan saja.'}
              </span>
            </div>
            <button
              type="button"
              disabled={!canEditProfile}
              onClick={() => {
                const current = formData.cooperative_loan_min_membership_enabled === 'true';
                onToggleChange?.('cooperative_loan_min_membership_enabled', current ? 'false' : 'true');
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 shrink-0 ${
                formData.cooperative_loan_min_membership_enabled === 'true'
                  ? 'bg-violet-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              } ${!canEditProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-checked={formData.cooperative_loan_min_membership_enabled === 'true'}
              role="switch"
              aria-label="Aktifkan kebijakan masa keanggotaan minimum"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                formData.cooperative_loan_min_membership_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Input durasi minimum (hanya tampil jika aktif) */}
          {formData.cooperative_loan_min_membership_enabled === 'true' && (
            <div className="space-y-1.5 pt-1 border-t border-violet-200/60 dark:border-violet-800/40">
              <Label htmlFor="cooperative_loan_min_membership_months" className="text-xs font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                <Clock size={12} />
                Minimal Masa Keanggotaan (Bulan)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  id="cooperative_loan_min_membership_months"
                  name="cooperative_loan_min_membership_months"
                  value={formData.cooperative_loan_min_membership_months || '3'}
                  onChange={onInputChange}
                  disabled={!canEditProfile}
                  min="1"
                  max="60"
                  placeholder="Contoh: 3"
                  className="h-9 w-32 text-sm text-center font-bold"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  bulan sejak tanggal bergabung sebagai anggota
                </span>
              </div>
              <p className="text-[10px] text-violet-700/80 dark:text-violet-400/80 leading-tight">
                Anggota yang belum memenuhi syarat akan mendapatkan pesan penolakan informatif. Operator/Kasir tetap dapat memproses pinjaman tanpa batasan ini.
              </p>
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────────────── */}

        {/* Baris 4: Alamat — full width */}
        <div className="space-y-1.5">
          <Label htmlFor="cooperative_address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Alamat Lengkap Koperasi
          </Label>
          <div className="relative">
            <span className="absolute top-3.5 left-3.5 flex items-center text-slate-400 pointer-events-none z-10">
              <MapPin size={16} />
            </span>
            <Textarea
              id="cooperative_address"
              name="cooperative_address"
              value={formData.cooperative_address || ''}
              onChange={onInputChange}
              rows={3}
              disabled={!canEditProfile}
              placeholder="Jalan, RT/RW, Kecamatan, Kota/Kabupaten, Kode Pos"
              className="pl-10 resize-none text-sm"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Perubahan data identitas akan diterapkan ke seluruh laporan & kuitansi koperasi.
          </p>
          <Button
            type="submit"
            disabled={saving || !canEditProfile}
            className="w-full sm:w-auto h-10 px-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-indigo-600/20 shrink-0"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={14} />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
});

CooperativeProfileForm.displayName = 'CooperativeProfileForm';
