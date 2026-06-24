import React from 'react';
import { Hash, User as UserIcon, Phone, MapPin, Calendar, Users, Bus, Radio, Home } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Label } from '../../../ui/Label';
import { Controller, UseFormRegister, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { JENIS_KELAMIN_OPTIONS, TRANSPORTASI_OPTIONS } from '../../../../api/dropdown.api';
import { SiswaFormValues } from '../../../../schemas/academic/siswa.schema';
import { SectionCard, DetailRow } from './FormShared';

interface PersonalSectionProps {
    register: UseFormRegister<SiswaFormValues>;
    control: Control<SiswaFormValues>;
    errors: FieldErrors<SiswaFormValues>;
    isViewMode: boolean;
    watch: UseFormWatch<SiswaFormValues>;
}

export const PersonalSection: React.FC<PersonalSectionProps> = React.memo(({
    register,
    control,
    errors,
    isViewMode,
    watch
}) => {
    if (isViewMode) {
        return (
            <SectionCard title="Informasi Pribadi Siswa" icon={UserIcon}>
                <DetailRow icon={<Hash size={16} />} label="NIS" value={watch('nis')} />
                <DetailRow icon={<Hash size={16} />} label="NISN" value={watch('nisn') || '-'} />
                <DetailRow icon={<UserIcon size={16} />} label="Nama Lengkap" value={watch('nama_siswa')} />
                <DetailRow icon={<Phone size={16} />} label="Nomor HP" value={watch('no_hp')} />
                <DetailRow icon={<MapPin size={16} />} label="Tempat Lahir" value={watch('tempat_lahir')} />
                <DetailRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={watch('tanggal_lahir')} />
                <DetailRow icon={<Users size={16} />} label="Jenis Kelamin" value={(JENIS_KELAMIN_OPTIONS || []).find(o => o.value === watch('jenis_kelamin'))?.label} />
                <DetailRow icon={<Bus size={16} />} label="Transportasi" value={(TRANSPORTASI_OPTIONS || []).find(o => o.value === watch('transportasi'))?.label} />
                <DetailRow icon={<Radio size={16} />} label="No RFID" value={watch('no_rfid')} />
                <DetailRow icon={<Home size={16} />} label="Alamat" value={watch('alamat')} />
            </SectionCard>
        );
    }

    return (
        <SectionCard title="Informasi Utama Siswa" icon={UserIcon}>
            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="nis" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Nomor Induk Siswa (NIS)
                    </Label>
                </div>
                <Input
                    id="nis"
                    {...register('nis')}
                    placeholder="Masukkan NIS..."
                    disabled={isViewMode}
                    className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nis ? 'border-red-500' : ''}`}
                />
                {errors.nis && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nis.message}</p>
                )}
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="nisn" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        NISN (Nasional)
                    </Label>
                </div>
                <Input
                    id="nisn"
                    {...register('nisn')}
                    placeholder="Masukkan NISN..."
                    disabled={isViewMode}
                    className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nisn ? 'border-red-500' : ''}`}
                />
                {errors.nisn && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nisn.message}</p>
                )}
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="nama_siswa" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Nama Lengkap <span className="text-rose-500">*</span>
                    </Label>
                </div>
                <Input
                    id="nama_siswa"
                    {...register('nama_siswa')}
                    placeholder="Nama sesuai ijazah..."
                    disabled={isViewMode}
                    className={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.nama_siswa ? 'border-red-500' : ''}`}
                />
                {errors.nama_siswa && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.nama_siswa.message}</p>
                )}
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="no_hp" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Nomor HP / WhatsApp
                    </Label>
                </div>
                <Input
                    id="no_hp"
                    {...register('no_hp')}
                    placeholder="628xxxx..."
                    disabled={isViewMode}
                    className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                />
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="tempat_lahir" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Tempat Lahir
                    </Label>
                </div>
                <Input
                    id="tempat_lahir"
                    {...register('tempat_lahir')}
                    placeholder="Kota kelahiran..."
                    disabled={isViewMode}
                    className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                />
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="tanggal_lahir" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Tanggal Lahir
                    </Label>
                </div>
                <Input
                    id="tanggal_lahir"
                    type="date"
                    {...register('tanggal_lahir')}
                    disabled={isViewMode}
                    className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                />
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="jenis_kelamin" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Jenis Kelamin <span className="text-rose-500">*</span>
                    </Label>
                </div>
                <Controller
                    name="jenis_kelamin"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            id="jenis_kelamin"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={JENIS_KELAMIN_OPTIONS}
                            placeholder="Pilih Gender"
                            disabled={isViewMode}
                            triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.jenis_kelamin ? 'border-red-500' : ''}`}
                        />
                    )}
                />
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="transportasi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Moda Transportasi
                    </Label>
                </div>
                <Controller
                    name="transportasi"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            id="transportasi"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={TRANSPORTASI_OPTIONS}
                            placeholder="Pilih Transportasi"
                            disabled={isViewMode}
                            triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    )}
                />
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="no_rfid" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Nomor Kartu RFID
                    </Label>
                </div>
                <Input
                    id="no_rfid"
                    {...register('no_rfid')}
                    placeholder="Scan kartu RFID..."
                    disabled={isViewMode}
                    className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                />
            </div>

            <div className="md:col-span-2 space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="alamat" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Alamat Lengkap Domisili
                    </Label>
                </div>
                <Textarea
                    id="alamat"
                    {...register('alamat')}
                    placeholder="Masukkan alamat lengkap RT/RW/Kelurahan/Kecamatan..."
                    disabled={isViewMode}
                    className="text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl min-h-[80px]"
                />
            </div>
        </SectionCard>
    );
});

PersonalSection.displayName = 'PersonalSection';
