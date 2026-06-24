import React from 'react';
import { Building2, Info as InfoIcon, Hash, Layers } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';

interface KelasInfoSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  jurusanList: any[];
  tingkatOptions: any[];
  loadingDropdowns: boolean;
}

export const KelasInfoSection = React.memo<KelasInfoSectionProps>(({
  register,
  control,
  errors,
  isViewMode,
  watch,
  jurusanList = [],
  tingkatOptions = [],
  loadingDropdowns
}) => {
  if (isViewMode) {
    const selectedTingkat = tingkatOptions?.find(opt => opt.value === watch('tingkat'));
    const selectedJurusan = jurusanList?.find(j => j.id === watch('jurusan_id'));
    const isActive = watch('is_active');

    return (
      <SectionCard title="Informasi Kelas" icon={Building2}>
        <DetailRow icon={<Building2 size={16} />} label="Nama Kelas" value={watch('nama_kelas')} />
        <DetailRow icon={<Layers size={16} />} label="Tingkat" value={selectedTingkat?.label} />
        <DetailRow icon={<Hash size={16} />} label="Jurusan" value={selectedJurusan ? `${selectedJurusan.nama} (${selectedJurusan.singkatan || selectedJurusan.kode || ''})` : '-'} />
        <DetailRow 
          icon={<Building2 size={16} />} 
          label="Status Keaktifan" 
          value={
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          } 
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Kelas" icon={Building2}>
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama_kelas" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Kelas <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Contoh: X IPA 1</p>
          </div>
        </div>
        <Input
          id="nama_kelas"
          {...register('nama_kelas')}
          placeholder="Entry Nama Kelas..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama_kelas ? 'border-red-500' : ''}`}
        />
        {errors.nama_kelas && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama_kelas.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="tingkat" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Tingkat <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          control={control}
          name="tingkat"
          render={({ field }) => (
            <SearchableSelect
              id="tingkat"
              value={field.value ? field.value.toString() : ''}
              onValueChange={(val) => field.onChange(parseInt(val))}
              options={tingkatOptions?.map(opt => ({ value: opt.value.toString(), label: opt.label }))}
              placeholder="Pilih Tingkat"
              disabled={isViewMode || loadingDropdowns}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.tingkat ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.tingkat && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tingkat.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="jurusan_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Jurusan <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          control={control}
          name="jurusan_id"
          render={({ field }) => (
            <SearchableSelect
              id="jurusan_id"
              value={field.value}
              onValueChange={field.onChange}
              options={jurusanList?.map((j) => ({ value: j.id, label: `${j.nama} ${j.singkatan || j.kode ? `(${j.singkatan || j.kode || ''})` : ''}` }))}
              placeholder="Pilih Jurusan"
              disabled={isViewMode || loadingDropdowns}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.jurusan_id ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.jurusan_id && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.jurusan_id.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80 md:col-span-2 group mt-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter cursor-pointer">
                Status Keaktifan Kelas
              </Label>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Nonaktifkan kelas untuk menyembunyikannya dari dropdown operasional absensi tahun ajaran baru.
              </p>
            </div>
            <button
              type="button"
              id="is_active"
              disabled={isViewMode}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${field.value ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'} ${isViewMode ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ transition: 'background-color 0.2s' }}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${field.value ? 'translate-x-5' : 'translate-x-0'}`}
                style={{ transition: 'transform 0.2s' }}
              />
            </button>
          </div>
        )}
      />
    </SectionCard>
  );
});

KelasInfoSection.displayName = 'KelasInfoSection';
export default KelasInfoSection;
