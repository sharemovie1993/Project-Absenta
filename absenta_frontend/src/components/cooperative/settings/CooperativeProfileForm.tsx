import React from 'react';
import { Building, Phone, Mail, Globe, MapPin, FileText, Percent, Save } from 'lucide-react';
import { Button, SectionCard } from '../../ui';
import type { CooperativeSettings } from './types';

interface CooperativeProfileFormProps {
  formData: CooperativeSettings;
  saving: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  effectiveLogoUrl: string;
  canEditProfile: boolean;
}

export const CooperativeProfileForm: React.FC<CooperativeProfileFormProps> = ({
  formData,
  saving,
  onInputChange,
  onSubmit,
  effectiveLogoUrl,
  canEditProfile
}) => {
  return (
    <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-955/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Building size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Profil & Badan Hukum</h3>
          <p className="text-xs text-slate-400">Pastikan informasi di bawah ini sesuai dengan akta pendirian resmi</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Logo Koperasi Selector */}
        <div className="flex flex-col md:flex-row items-center gap-4 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 mb-4">
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
          <div className="flex-1 space-y-1 w-full">
            <label htmlFor="cooperative_logo_url" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              URL Logo Koperasi
            </label>
            <input
              type="text"
              id="cooperative_logo_url"
              name="cooperative_logo_url"
              value={formData.cooperative_logo_url || ''}
              onChange={onInputChange}
              placeholder="https://alamat-logo.png/gambar.png"
              disabled={!canEditProfile}
              className="w-full h-8 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
            />
            <p className="text-[9px] text-slate-400">
              {formData.cooperative_logo_url ? 'Menggunakan logo khusus koperasi.' : 'Menggunakan logo sekolah utama (default).'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cooperative_name" className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            Nama Koperasi <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Building size={16} />
            </span>
            <input
              type="text"
              id="cooperative_name"
              name="cooperative_name"
              value={formData.cooperative_name || ''}
              onChange={onInputChange}
              required
              disabled={!canEditProfile}
              placeholder="Contoh: KOPERASI KARYAWAN SEJAHTERA SMKN 1"
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cooperative_legal_no" className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Nomor Badan Hukum
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <FileText size={16} />
            </span>
            <input
              type="text"
              id="cooperative_legal_no"
              name="cooperative_legal_no"
              value={formData.cooperative_legal_no || ''}
              onChange={onInputChange}
              disabled={!canEditProfile}
              placeholder="Contoh: Nomor 123/BH/PAD/XX/2026"
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cooperative_default_interest_rate" className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Suku Bunga Pinjaman Default (% / Bulan)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Percent size={16} />
            </span>
            <input
              type="number"
              step="0.1"
              id="cooperative_default_interest_rate"
              name="cooperative_default_interest_rate"
              value={formData.cooperative_default_interest_rate || ''}
              onChange={onInputChange}
              disabled={!canEditProfile}
              placeholder="Contoh: 1.5"
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="cooperative_phone" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Nomor Telepon
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Phone size={16} />
              </span>
              <input
                type="text"
                id="cooperative_phone"
                name="cooperative_phone"
                value={formData.cooperative_phone || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: 021-xxxxxxx"
                className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="cooperative_email" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Email Koperasi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Mail size={16} />
              </span>
              <input
                type="email"
                id="cooperative_email"
                name="cooperative_email"
                value={formData.cooperative_email || ''}
                onChange={onInputChange}
                disabled={!canEditProfile}
                placeholder="Contoh: cooperative@school.sch.id"
                className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cooperative_website" className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Website Resmi
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Globe size={16} />
            </span>
            <input
              type="text"
              id="cooperative_website"
              name="cooperative_website"
              value={formData.cooperative_website || ''}
              onChange={onInputChange}
              disabled={!canEditProfile}
              placeholder="Contoh: www.cooperative.school.sch.id"
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cooperative_address" className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Alamat Lengkap Koperasi
          </label>
          <div className="relative">
            <span className="absolute top-3 left-3 flex items-center text-slate-400 pointer-events-none">
              <MapPin size={16} />
            </span>
            <textarea
              id="cooperative_address"
              name="cooperative_address"
              value={formData.cooperative_address || ''}
              onChange={onInputChange}
              rows={3}
              disabled={!canEditProfile}
              placeholder="Jalan, RT/RW, Kecamatan, Kota/Kabupaten, Kode Pos"
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-slate-200 shadow-inner resize-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={saving || !canEditProfile}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-indigo-600/15"
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
};
