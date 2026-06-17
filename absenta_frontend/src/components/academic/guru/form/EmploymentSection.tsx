import React from 'react';
import { Briefcase, GraduationCap, Activity, CreditCard } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { PENDIDIKAN_OPTIONS } from '../../../../api/dropdown.api';
import { SectionCard, DetailRow } from './FormShared';

interface EmploymentSectionProps {
  register: any;
  control: any;
  isViewMode: boolean;
  watch: any;
  getLabel: (value: string | undefined, options: any[]) => string;
  statusKepegawaianOptions: any[];
  statusOptions: any[];
}

export const EmploymentSection: React.FC<EmploymentSectionProps> = ({
  register,
  control,
  isViewMode,
  watch,
  getLabel,
  statusKepegawaianOptions,
  statusOptions
}) => {
  if (isViewMode) {
    return (
      <SectionCard title="Status Kepegawaian" icon={Briefcase}>
        <DetailRow icon={<Briefcase size={16} />} label="Hubungan Kerja" value={getLabel(watch('status_kepegawaian'), statusKepegawaianOptions)} />
        <DetailRow icon={<GraduationCap size={16} />} label="Pendidikan" value={getLabel(watch('pendidikan_terakhir'), PENDIDIKAN_OPTIONS)} />
        <DetailRow icon={<Activity size={16} />} label="Status Akun" value={getLabel(watch('status'), statusOptions)} />
        <DetailRow icon={<CreditCard size={16} />} label="RFID Tag" value={watch('rfid_tag')} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Status Kepegawaian" icon={Briefcase}>
      <div className="space-y-2 group">
        <Label htmlFor="status_kepegawaian" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Hubungan Kerja</Label>
        <Controller control={control} name="status_kepegawaian" render={({ field }) => (
          <SearchableSelect value={field.value} onValueChange={field.onChange} options={statusKepegawaianOptions} placeholder="Pilih Status..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
        )} />
      </div>
      <div className="space-y-2 group">
        <Label htmlFor="pendidikan_terakhir" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kualifikasi Pendidikan</Label>
        <Controller control={control} name="pendidikan_terakhir" render={({ field }) => (
          <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENDIDIKAN_OPTIONS} placeholder="Pilih Pendidikan..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
        )} />
      </div>
      <div className="space-y-2 group">
        <Label htmlFor="status" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Status Akun</Label>
        <Controller control={control} name="status" render={({ field }) => (
          <SearchableSelect value={field.value} onValueChange={field.onChange} options={statusOptions} placeholder="Pilih Status..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
        )} />
      </div>
      <div className="space-y-2 group">
        <Label htmlFor="rfid_tag" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Digital Tag (RFID)</Label>
        <Input {...register('rfid_tag')} placeholder="Entry No RFID..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl shadow-inner" />
      </div>
    </SectionCard>
  );
};
