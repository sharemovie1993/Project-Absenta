import React from 'react';
import { User, BookOpen, Layers } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { cn } from '../../../../lib/utils';

interface GuruMapelAssignmentSectionProps {
  control: any;
  errors: any;
  guruOptions: any[];
  mapelOptions: any[];
  jurusanOptions?: any[];
  kelasOptions?: any[];
  scopeMode: 'GLOBAL' | 'JURUSAN' | 'KELAS';
  setScopeMode: (val: 'GLOBAL' | 'JURUSAN' | 'KELAS') => void;
  scopeJurusanId: string;
  setScopeJurusanId: (val: string) => void;
  scopeKelasId: string;
  setScopeKelasId: (val: string) => void;
  loading: boolean;
}

export const GuruMapelAssignmentSection = React.memo<GuruMapelAssignmentSectionProps>(({
  control,
  errors,
  guruOptions = [],
  mapelOptions = [],
  jurusanOptions = [],
  kelasOptions = [],
  scopeMode,
  setScopeMode,
  scopeJurusanId,
  setScopeJurusanId,
  scopeKelasId,
  setScopeKelasId,
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

      {/* Scope Plotting Selection */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
        <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter block">
          Cakupan Plotting Mengajar
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setScopeMode('GLOBAL')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              scopeMode === 'GLOBAL'
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            )}
          >
            Global (Semua Kelas)
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('JURUSAN')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              scopeMode === 'JURUSAN'
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            )}
          >
            Khusus Jurusan
          </button>
          <button
            type="button"
            onClick={() => setScopeMode('KELAS')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              scopeMode === 'KELAS'
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            )}
          >
            Khusus Rombel
          </button>
        </div>

        {scopeMode === 'JURUSAN' && (
          <div className="pt-1">
            <select
              value={scopeJurusanId}
              onChange={(e) => setScopeJurusanId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Pilih Target Jurusan...</option>
              {jurusanOptions.map((j: any) => (
                <option key={j.id} value={j.id}>{j.nama}</option>
              ))}
            </select>
          </div>
        )}

        {scopeMode === 'KELAS' && (
          <div className="pt-1">
            <select
              value={scopeKelasId}
              onChange={(e) => setScopeKelasId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Pilih Target Rombel/Kelas...</option>
              {kelasOptions.map((k: any) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
});

GuruMapelAssignmentSection.displayName = 'GuruMapelAssignmentSection';

