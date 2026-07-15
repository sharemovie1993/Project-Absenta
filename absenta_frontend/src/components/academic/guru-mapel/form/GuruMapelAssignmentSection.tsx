import React from 'react';
import { User, BookOpen, Layers } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';

interface GuruMapelAssignmentSectionProps {
  control: any;
  errors: any;
  guruOptions: any[];
  mapelOptions: any[];
  loading: boolean;
}

export const GuruMapelAssignmentSection = React.memo<GuruMapelAssignmentSectionProps>(({
  control,
  errors,
  guruOptions = [],
  mapelOptions = [],
  loading
}) => {
  return (
    <div className="flex flex-col gap-5 overflow-visible">
      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="guru_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Pilih Guru <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          name="guru_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="guru_id"
              value={field.value}
              onValueChange={field.onChange}
              options={guruOptions?.map(g => ({ label: g.nama_guru, value: g.id }))}
              placeholder="Pilih Guru..."
              searchPlaceholder="Cari Guru..."
              disabled={loading}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.guru_id ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.guru_id && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.guru_id.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="mapel_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Mata Pelajaran <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          name="mapel_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="mapel_id"
              value={field.value}
              onValueChange={field.onChange}
              options={mapelOptions?.map(m => ({ label: m.nama_mapel, value: m.id }))}
              placeholder="Pilih Mapel..."
              searchPlaceholder="Cari Mapel..."
              disabled={loading}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.mapel_id ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.mapel_id && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.mapel_id.message}</p>
        )}
      </div>
    </div>
  );
});

GuruMapelAssignmentSection.displayName = 'GuruMapelAssignmentSection';
