import React from 'react';
import { ListChecks, Info as InfoIcon, Settings2, Hash, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { Switch } from '../../../ui/Switch';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';

interface JenisKegiatanInfoSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  tipeOptions: any[];
}

export const JenisKegiatanInfoSection: React.FC<JenisKegiatanInfoSectionProps> = ({
  register,
  control,
  errors,
  isViewMode,
  watch,
  tipeOptions
}) => {
  const watchAktif = watch('aktif');

  if (isViewMode) {
    return (
      <SectionCard title="Informasi Jenis Kegiatan" icon={ListChecks}>
        <DetailRow icon={<ListChecks size={16} />} label="Nama Kegiatan" value={watch('nama')} />
        <DetailRow icon={<Settings2 size={16} />} label="Tipe" value={watch('tipe')} />
        <DetailRow icon={<Hash size={16} />} label="Urutan" value={watch('urutan')} />
        <DetailRow 
          icon={<CheckCircle2 size={16} />} 
          label="Status" 
          value={watchAktif ? 'AKTIF' : 'NONAKTIF'} 
          className={watchAktif ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Informasi Jenis Kegiatan" icon={ListChecks}>
      <div className="space-y-2 md:col-span-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Kegiatan <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Input
          id="nama"
          {...register('nama')}
          placeholder="Entry Nama Kegiatan..."
          disabled={isViewMode}
          className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama ? 'border-red-500' : ''}`}
        />
        {errors.nama && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="tipe" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Tipe <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          control={control}
          name="tipe"
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onValueChange={field.onChange}
              options={tipeOptions}
              placeholder="Pilih Tipe..."
              disabled={isViewMode}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.tipe ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.tipe && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tipe.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="urutan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Urutan Tampil
          </Label>
          <div className="flex items-center gap-1.5">
            <InfoIcon className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Sorting Order</p>
          </div>
        </div>
        <Input
          id="urutan"
          type="number"
          {...register('urutan')}
          placeholder="0"
          disabled={isViewMode}
          className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
        />
      </div>

      <div className="md:col-span-2 pt-2">
        <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 p-4 ${
          watchAktif 
            ? 'bg-blue-50/40 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' 
            : 'bg-white border-slate-100 dark:bg-slate-900/30 dark:border-slate-800/50'
        }`}>
          <div className="flex items-center justify-between gap-4 relative z-10 text-xs">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className={`w-3.5 h-3.5 ${watchAktif ? 'text-blue-600' : 'text-slate-400'}`} />
                <Label htmlFor="aktif" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  Status Aktif
                </Label>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight font-medium">
                Aktifkan untuk menampilkan di pendaftaran kegiatan.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Controller
                name="aktif"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={isViewMode}
                    className="scale-110"
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
