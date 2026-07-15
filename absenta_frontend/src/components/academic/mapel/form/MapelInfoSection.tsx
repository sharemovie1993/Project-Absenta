import React from 'react';
import { BookOpenCheck, Info as InfoIcon, Hash, Layers } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';
import toast from 'react-hot-toast';

interface MapelInfoSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  tingkatOptions: any[];
  presets?: any[];
  setValue?: any;
}

export const MapelInfoSection = React.memo<MapelInfoSectionProps>(({
  register,
  control,
  errors,
  isViewMode,
  watch,
  tingkatOptions = [],
  presets = [],
  setValue
}) => {
  if (isViewMode) {
    const selectedTingkat = tingkatOptions?.find(opt => opt.value === (watch('tingkat')?.toString() || '0'));

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
      {/* Option to load from Global Preset (Autofill) */}
      {!isViewMode && presets && presets.length > 0 && (
        <div className="space-y-2 md:col-span-2 p-4 bg-violet-50/40 dark:bg-violet-950/15 rounded-2xl border border-violet-100 dark:border-violet-900/40 mb-2">
          <label className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider block mb-1">
            🚀 Preset Mata Pelajaran (Autofill Cepat)
          </label>
          <select
            onChange={(e) => {
              const selectedPresetId = e.target.value;
              if (selectedPresetId) {
                const preset = presets.find(p => p.id === selectedPresetId);
                if (preset && setValue) {
                  setValue('nama_mapel', preset.nama_mapel, { shouldValidate: true });
                  setValue('kode_mapel', preset.kode_mapel || '', { shouldValidate: true });
                  toast.success(`Autofill berhasil untuk mapel: ${preset.nama_mapel}`);
                }
              }
            }}
            className="w-full h-10 px-3 text-[12px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
          >
            <option value="">— Pilih Preset Mata Pelajaran —</option>
            {presets.map(p => (
              <option key={p.id} value={p.id}>
                {p.nama_mapel} ({p.kode_mapel} · {p.category})
              </option>
            ))}
          </select>
          <p className="text-[9px] text-slate-500 italic mt-1">
            * Memilih salah satu preset akan mengisi otomatis nama dan kode mata pelajaran.
          </p>
        </div>
      )}
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
              id="tingkat"
              value={field.value?.toString() || '0'}
              onValueChange={(val) => field.onChange(val === '0' ? null : parseInt(val))}
              options={tingkatOptions?.map(opt => ({ value: opt.value, label: opt.label }))}
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
});

MapelInfoSection.displayName = 'MapelInfoSection';
export default MapelInfoSection;
