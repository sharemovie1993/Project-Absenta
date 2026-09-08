import React from 'react';
import { GraduationCap, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card, Button, SearchableSelect } from '../ui';
import axiosInstance from '../../lib/axiosInstance';
import toast from 'react-hot-toast';

interface AcademicTierCardProps {
  activeAcademicTier: string;
  onTierChangeSuccess: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
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
  onTierChangeSuccess,
  onSync,
  isSyncing = false
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
    <Card className="p-3.5 md:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Edisi Institusi</span>
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
              {tierDisplayName}
            </h4>
          </div>
        </div>

        {onSync && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Sinkronisasi Status Lisensi"
            onClick={onSync}
            disabled={isSyncing}
            className="h-8 px-2.5 text-[11px] font-bold border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500 rounded-lg flex items-center gap-1.5 shrink-0"
            title="Sinkronisasi kuota & masa aktif dari server lisensi pusat"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </Button>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <label htmlFor="selectAcademicTier" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Pilih Kapasitas Baru
          </label>
          <span className="text-[9px] text-slate-400 italic">
            Batas kapasitas siswa untuk pengadaan modul
          </span>
        </div>
        <div className="mt-1">
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
        </div>
      </div>
    </Card>
  );
});

