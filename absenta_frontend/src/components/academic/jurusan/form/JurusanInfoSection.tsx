import React from 'react';
import { BookOpen, Info as InfoIcon, Hash } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SectionCard, DetailRow } from './FormShared';

interface JurusanInfoSectionProps {
  register: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
}

export const JurusanInfoSection = React.memo<JurusanInfoSectionProps>(({
  register,
  errors,
  isViewMode,
  watch
}) => {
  if (isViewMode) {
    return (
      <SectionCard title="Informasi Jurusan" icon={BookOpen}>
        <DetailRow icon={<BookOpen size={16} />} label="Nama Jurusan" value={watch('nama')} />
        <DetailRow icon={<Hash size={16} />} label="Singkatan Jurusan" value={watch('singkatan') || '-'} />
        <DetailRow icon={<Hash size={16} />} label="Kode Jurusan (Internal)" value={watch('kode') || '-'} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Jurusan" icon={BookOpen}>
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Jurusan <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Input
          id="nama"
          {...register('nama')}
          placeholder="Entry Nama Jurusan..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.nama && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">
            {errors.nama.message}
          </p>
        )}
      </div>

      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="singkatan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Singkatan Jurusan <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-blue-400" />
            <p className="text-[9px] text-blue-500 font-medium italic">Tampil di Diagram & Nama Kelas (Contoh: RPL)</p>
          </div>
        </div>
        <Input
          id="singkatan"
          {...register('singkatan', {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
          placeholder="Entry Singkatan (Contoh: RPL)..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.singkatan ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.singkatan && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">
            {errors.singkatan.message}
          </p>
        )}
      </div>

      <div className="space-y-2 md:col-span-2 group opacity-80">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="kode" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Kode Jurusan (Internal/Dapodik)
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Opsional</p>
          </div>
        </div>
        <Input
          id="kode"
          {...register('kode')}
          placeholder="Entry Kode Internal (opsional)..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.kode ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.kode && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">
            {errors.kode.message}
          </p>
        )}
      </div>
    </SectionCard>
  );
});

JurusanInfoSection.displayName = 'JurusanInfoSection';
