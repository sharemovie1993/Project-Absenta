import React from 'react';
import { Calendar, Layers, Info as InfoIcon, Settings2, CheckCircle2 } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { Switch } from '../../../ui/Switch';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { SectionCard, DetailRow } from './FormShared';

interface SemesterInfoSectionProps {
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  tahunPelajaranList: any[];
  loadingTahunPelajaran: boolean;
  semesterOptions: any[];
  handleActiveChange: (checked: boolean) => void;
}

export const SemesterInfoSection: React.FC<SemesterInfoSectionProps> = ({
  control,
  errors,
  isViewMode,
  watch,
  tahunPelajaranList,
  loadingTahunPelajaran,
  semesterOptions,
  handleActiveChange
}) => {
  const watchIsActive = watch('is_active');

  if (isViewMode) {
    const selectedTp = tahunPelajaranList.find(t => t.id === watch('tahun_pelajaran_id'));
    const selectedSemester = semesterOptions.find(s => s.value === watch('nama_semester'));

    return (
      <SectionCard title="Informasi Semester" icon={Layers}>
        <DetailRow icon={<Calendar size={16} />} label="Tahun Pelajaran" value={selectedTp ? selectedTp.tahun : '-'} />
        <DetailRow icon={<Layers size={16} />} label="Semester" value={selectedSemester?.label} />
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
    <SectionCard title="Informasi Semester" icon={Layers}>
      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="tahun_pelajaran_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Tahun Pelajaran <span className="text-rose-500">*</span>
          </Label>
        </div>
        <Controller
          name="tahun_pelajaran_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onValueChange={field.onChange}
              options={tahunPelajaranList.map(t => ({ value: t.id, label: `${t.tahun} ${t.is_active ? '(Aktif)' : ''}` }))}
              placeholder={loadingTahunPelajaran ? 'Memuat...' : 'Pilih Tahun Pelajaran'}
              disabled={isViewMode || loadingTahunPelajaran}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl ${errors.tahun_pelajaran_id ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.tahun_pelajaran_id && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tahun_pelajaran_id.message}</p>
        )}
      </div>

      <div className="space-y-2 group">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="nama_semester" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
            Nama Semester <span className="text-rose-500">*</span>
          </Label>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <p className="text-[9px] text-slate-500 font-medium italic">Ganjil / Genap</p>
          </div>
        </div>
        <Controller
          name="nama_semester"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onValueChange={field.onChange}
              options={semesterOptions}
              placeholder="Pilih Semester"
              disabled={isViewMode}
              triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl ${errors.nama_semester ? 'border-red-500' : ''}`}
            />
          )}
        />
        {errors.nama_semester && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama_semester.message}</p>
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

          <div className="flex items-center justify-between gap-4 relative z-10 text-xs">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className={`w-3.5 h-3.5 ${watchIsActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <Label htmlFor="is_active" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  Aktifkan Semester
                </Label>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight font-medium">
                Aktifkan untuk operasional akademik sekarang.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={handleActiveChange}
                    disabled={isViewMode}
                    className="scale-110"
                  />
                )}
              />
            </div>
          </div>
        </div>
        {errors.is_active && (
          <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.is_active.message}</p>
        )}
      </div>
    </SectionCard>
  );
};
