import React from 'react';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, SearchableSelect } from '../ui';
import axiosInstance from '../../lib/axiosInstance';
import toast from 'react-hot-toast';

interface AcademicTierCardProps {
  activeAcademicTier: string;
  onTierChangeSuccess: () => void;
}

const TIER_OPTIONS = [
  { value: 'MICRO', label: 'Micro (Maks. 100 Siswa)' },
  { value: 'SMALL', label: 'Small (Maks. 300 Siswa)' },
  { value: 'MEDIUM', label: 'Medium (Maks. 600 Siswa)' },
  { value: 'LARGE', label: 'Large (Maks. 1.200 Siswa)' },
  { value: 'ENTERPRISE', label: 'Enterprise (Tanpa Batas)' }
];

export const AcademicTierCard: React.FC<AcademicTierCardProps> = React.memo(({
  activeAcademicTier,
  onTierChangeSuccess
}) => {
  const currentTierVal = activeAcademicTier.toUpperCase() === 'CORE_PLATFORM' ? 'MICRO' : activeAcademicTier.toUpperCase();

  const handleSelectTier = async (newTier: string) => {
    const confirmChange = window.confirm(`Apakah Anda yakin ingin mengubah kapasitas sekolah ke edisi ${newTier}?`);
    if (!confirmChange) return;

    try {
      const res = await axiosInstance.post('/billing/subscriptions/update-academic-tier', { tier: newTier });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Kapasitas sekolah berhasil diubah!');
        onTierChangeSuccess();
      } else {
        toast.error(res.data.message || 'Gagal mengubah kapasitas sekolah.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj.response?.data?.message || 'Terjadi kesalahan saat menghubungi server.');
    }
  };

  return (
    <Card className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Edisi Sekolah</span>
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize truncate">
            Edisi {activeAcademicTier.toLowerCase().replace('_', ' ')}
          </h4>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <label htmlFor="selectAcademicTier" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
          Pilih Kapasitas Baru
        </label>
        <SearchableSelect
          id="selectAcademicTier"
          aria-label="Pilih Kapasitas Baru Sekolah"
          value={currentTierVal}
          onValueChange={handleSelectTier}
          options={TIER_OPTIONS}
          placeholder="Pilih edisi kapasitas"
          searchPlaceholder="Cari edisi..."
          triggerClassName="w-full text-[10px] font-bold"
        />
        <p className="text-[8.5px] text-slate-400 font-medium leading-relaxed italic mt-2">
          * Pilihan edisi minimal setara dengan kapasitas sekolah Anda untuk dapat membeli modul premium.
        </p>
      </div>
    </Card>
  );
});
