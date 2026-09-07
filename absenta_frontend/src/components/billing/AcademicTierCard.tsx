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
  { value: 'MICRO', label: 'Micro (≤ 100 Siswa)' },
  { value: 'SMALL', label: 'Small (≤ 300 Siswa)' },
  { value: 'MEDIUM', label: 'Medium (≤ 600 Siswa)' },
  { value: 'LARGE', label: 'Large (≤ 1.200 Siswa)' },
  { value: 'ENTERPRISE', label: 'Enterprise (Tanpa Batas)' }
];

export const AcademicTierCard: React.FC<AcademicTierCardProps> = React.memo(({
  activeAcademicTier,
  onTierChangeSuccess
}) => {
  const currentTierVal = activeAcademicTier.toUpperCase() === 'CORE_PLATFORM' ? 'MICRO' : activeAcademicTier.toUpperCase();
  const tierDisplayName = activeAcademicTier.toUpperCase() === 'CORE_PLATFORM' 
    ? 'Core Platform' 
    : `Edisi ${activeAcademicTier.charAt(0).toUpperCase() + activeAcademicTier.slice(1).toLowerCase()}`;

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
    <Card className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0 mt-0.5">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Edisi Institusi</span>
            <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
            {tierDisplayName}
          </h4>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <label htmlFor="selectAcademicTier" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
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
          triggerClassName="w-full text-xs font-medium h-9"
        />
        <p className="text-[9px] text-slate-400 leading-tight italic mt-1.5">
          * Pilihan edisi menentukan batas kapasitas siswa untuk pengadaan modul.
        </p>
      </div>
    </Card>
  );
});
