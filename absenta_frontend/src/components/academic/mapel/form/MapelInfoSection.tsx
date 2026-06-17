import React from 'react';
import { BookOpenCheck, Info as InfoIcon, Hash, Layers } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';

interface MapelInfoSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  tingkatOptions: any[];
}

export const MapelInfoSection: React.FC<MapelInfoSectionProps> = ({
  register,
  control,
  errors,
  isViewMode,
  watch,
  tingkatOptions
}) => {
  if (isViewMode) {
    const selectedTingkat = tingkatOptions.find(opt => opt.value === (watch('tingkat')?.toString() || '0'));

    return (
      <SectionCard title="Informasi Mata Pelajaran" icon={BookOpenCheck}>
        <DetailRow icon={<BookOpenCheck size={16} />} label="Nama Mapel" value={watch('nama_mapel')} />
        <DetailRow icon={<Hash size={16} />} label="Kode Mapel" value={watch('kode_mapel')} />
        <DetailRow icon={<Layers size={16} />} label="Tingkat" value={selectedTingkat?.label} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Mata Pelajaran" icon={BookOpenCheck}>
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama_mapel" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Mata Pelajaran <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Input
          id="nama_mapel"
          {...register('nama_mapel')}
          placeholder="Entry Nama Mata Pelajaran..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl ${errors.nama_mapel ? 'border-red-500' : ''}`}
        />
        {errors.nama_mapel && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama_mapel.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="kode_mapel" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Kode Mapel
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Kapital: MTK/IPA</p>
          </div>
        </div>
        <Input
          id="kode_mapel"
          {...register('kode_mapel')}
          placeholder="Entry Kode..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl ${errors.kode_mapel ? 'border-red-500' : ''}`}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            register('kode_mapel').onChange(e);
          }}
        />
        {errors.kode_mapel && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.kode_mapel.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="tingkat" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Tingkat
          </Label>
        </div>
        <Controller
          control={control}
          name="tingkat"
          render={({ field }) => (
            <SearchableSelect
              value={field.value?.toString() || '0'}
              onValueChange={(val) => field.onChange(val === '0' ? null : parseInt(val))}
              options={tingkatOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              placeholder="Pilih Tingkat"
              disabled={isViewMode}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl ${errors.tingkat ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.tingkat && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tingkat.message}</p>
        )}
      </div>
    </SectionCard>
  );
};
