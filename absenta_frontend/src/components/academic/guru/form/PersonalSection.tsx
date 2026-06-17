import React from 'react';
import { User, Hash, Mail, Phone, MapPin, Calendar, Activity, Building2 } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Label } from '../../../ui/Label';
import { Textarea } from '../../../ui/Textarea';
import { DatePicker } from '../../../ui/DatePicker';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Controller } from 'react-hook-form';
import { JENIS_KELAMIN_OPTIONS, AGAMA_OPTIONS } from '../../../../api/dropdown.api';
import { SectionCard, DetailRow } from './FormShared';

interface PersonalSectionProps {
  register: any;
  control: any;
  errors: any;
  isViewMode: boolean;
  watch: any;
  getLabel: (value: string | undefined, options: any[]) => string;
}

export const PersonalSection: React.FC<PersonalSectionProps> = ({
  register,
  control,
  errors,
  isViewMode,
  watch,
  getLabel
}) => {
  if (isViewMode) {
    return (
      <>
        <SectionCard title="Identitas Personal" icon={User}>
          <DetailRow icon={<Hash size={16} />} label="NIP" value={watch('nip')} />
          <DetailRow icon={<User size={16} />} label="Nama Lengkap" value={watch('nama')} />
          <DetailRow icon={<Mail size={16} />} label="Email" value={watch('email')} />
          <DetailRow icon={<Phone size={16} />} label="Nomor WhatsApp" value={watch('no_hp')} />
          <DetailRow icon={<MapPin size={16} />} label="Tempat Lahir" value={watch('tempat_lahir')} />
          <DetailRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={watch('tanggal_lahir')} />
          <DetailRow icon={<Activity size={16} />} label="Jenis Kelamin" value={getLabel(watch('jenis_kelamin'), JENIS_KELAMIN_OPTIONS)} />
          <DetailRow icon={<Building2 size={16} />} label="Agama" value={getLabel(watch('agama'), AGAMA_OPTIONS)} />
        </SectionCard>
        <SectionCard title="Domisili Pendidik" icon={MapPin}>
          <div className="md:col-span-2">
            <DetailRow icon={<MapPin size={16} />} label="Alamat Lengkap" value={watch('alamat')} />
          </div>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <SectionCard title="Identitas Personal" icon={User}>
        <div className="space-y-2 group">
          <Label htmlFor="nip" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">NIP</Label>
          <Input {...register('nip')} placeholder="Entry NIP..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
          {errors.nip && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nip.message}</p>}
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="nama" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap <span className="text-rose-500">*</span></Label>
          <Input {...register('nama')} placeholder="Entry Nama Lengkap..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl shadow-inner" />
          {errors.nama && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama.message}</p>}
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="email" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email Aktif</Label>
          <Input {...register('email')} type="email" placeholder="Entry Email..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
          {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.email.message}</p>}
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="no_hp" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">No WhatsApp</Label>
          <Input {...register('no_hp')} placeholder="Entry Nomor HP..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
          {errors.no_hp && <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.no_hp.message}</p>}
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="tempat_lahir" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tempat Lahir</Label>
          <Input {...register('tempat_lahir')} placeholder="Entry Tempat Lahir..." disabled={isViewMode} className="h-10 text-[13px] font-bold tracking-tight bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl" />
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="tanggal_lahir" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tanggal Lahir</Label>
          <Controller control={control} name="tanggal_lahir" render={({ field }) => (
            <DatePicker value={field.value} onChange={field.onChange} disabled={isViewMode} placeholder="Pilih Tanggal..." className="h-10 font-bold rounded-xl" />
          )} />
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="jenis_kelamin" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</Label>
          <Controller control={control} name="jenis_kelamin" render={({ field }) => (
            <SearchableSelect value={field.value} onValueChange={field.onChange} options={JENIS_KELAMIN_OPTIONS} placeholder="Pilih JK..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
          )} />
        </div>
        <div className="space-y-2 group">
          <Label htmlFor="agama" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Agama</Label>
          <Controller control={control} name="agama" render={({ field }) => (
            <SearchableSelect value={field.value} onValueChange={field.onChange} options={AGAMA_OPTIONS} placeholder="Pilih Agama..." disabled={isViewMode} triggerClassName="h-10 text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
          )} />
        </div>
      </SectionCard>
      <SectionCard title="Domisili Pendidik" icon={MapPin}>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="alamat" className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</Label>
          <Textarea {...register('alamat')} placeholder="Entry Alamat Lengkap..." disabled={isViewMode} rows={3} className="text-[13px] font-bold bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-blue-500/30 rounded-2xl resize-none p-4 shadow-inner" />
        </div>
      </SectionCard>
    </>
  );
};
