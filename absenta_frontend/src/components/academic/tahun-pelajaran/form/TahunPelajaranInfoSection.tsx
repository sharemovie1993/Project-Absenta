import React from 'react';
import { Calendar, Info as InfoIcon, Settings2, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { Switch } from '../../../ui/Switch';
import { Alert } from '../../../ui/Alert';
import { Controller, Control, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';
import { CreateTahunPelajaranSchema } from '../../../../schemas/academic/tahun-pelajaran.schema';
import type { TahunPelajaran } from '../../../../types/academic';

interface TahunPelajaranInfoSectionProps {
  register: UseFormRegister<CreateTahunPelajaranSchema>;
  control: Control<CreateTahunPelajaranSchema>;
  errors: FieldErrors<CreateTahunPelajaranSchema>;
  isViewMode: boolean;
  watch: UseFormWatch<CreateTahunPelajaranSchema>;
  activeYear: TahunPelajaran | null;
  tahunPelajaranId?: string;
  isEditMode: boolean;
}

export const TahunPelajaranInfoSection = React.memo<TahunPelajaranInfoSectionProps>(({
  register,
  control,
  errors,
  isViewMode,
  watch,
  activeYear,
  tahunPelajaranId,
  isEditMode
}) => {
  const watchIsActive = watch('is_active');

  if (isViewMode) {
    return (
      <SectionCard title="Informasi Tahun Pelajaran" icon={Calendar}>
        <DetailRow icon={<Calendar size={16} />} label="Tahun Pelajaran" value={watch('tahun')} />
        <DetailRow 
          icon={<CheckCircle2 size={16} />} 
          label="Status" 
          value={watchIsActive ? 'AKTIF' : 'NONAKTIF'} 
          className={watchIsActive ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Tahun Pelajaran" icon={Calendar}>
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="tahun" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Tahun Pelajaran <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[10px] text-slate-500 font-medium italic">Format: 2025/2026</p>
          </div>
        </div>
        <Input
          id="tahun"
          {...register('tahun')}
          placeholder="Entry Tahun Pelajaran..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl ${errors.tahun ? 'border-red-500 focus:ring-red-500/20' : ''}`}
        />
        {errors.tahun && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">
            {errors.tahun.message}
          </p>
        )}
      </div>

      <div className="md:col-span-2 pt-2">
        <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 p-4 ${
          watchIsActive 
            ? 'bg-blue-50/40 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' 
            : 'bg-white border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50'
        }`}>
          {watchIsActive && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          )}

          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className={`w-3.5 h-3.5 ${watchIsActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <Label htmlFor="is_active" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  Aktifkan Sekarang
                </Label>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight font-medium">
                Jadikan periode utama sistem.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isViewMode}
                    className="scale-110"
                  />
                )}
              />
            </div>
          </div>

          {watchIsActive && activeYear && (!isEditMode || activeYear.id !== tahunPelajaranId) && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <Alert variant="warning" className="border-amber-200/50 bg-amber-50/30 p-3">
                <div className="flex gap-3">
                  <InfoIcon className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-0.5">Peringatan</div>
                    <div className="text-[11px] font-medium text-amber-800/80 leading-relaxed">
                      Periode berjalan: <strong className="text-amber-900">{activeYear.tahun}</strong>. 
                    </div>
                  </div>
                </div>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
});
TahunPelajaranInfoSection.displayName = 'TahunPelajaranInfoSection';

