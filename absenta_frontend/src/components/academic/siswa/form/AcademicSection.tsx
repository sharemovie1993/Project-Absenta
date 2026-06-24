import React from 'react';
import { School, CalendarRange, Clock, Settings2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Label } from '../../../ui/Label';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Input } from '../../../ui/Input';
import { Controller, UseFormRegister, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { DropdownOption } from '../../../../api/dropdown.api';
import { SiswaFormValues } from '../../../../schemas/academic/siswa.schema';
import { SectionCard, DetailRow } from './FormShared';

interface AcademicSectionProps {
    control: Control<SiswaFormValues>;
    register: UseFormRegister<SiswaFormValues>;
    errors: FieldErrors<SiswaFormValues>;
    isViewMode: boolean;
    watch: UseFormWatch<SiswaFormValues>;
    kelasOptions: DropdownOption[];
    tahunPelajaranOptions: DropdownOption[];
    semesterOptions: DropdownOption[];
    loadingDropdowns: boolean;
}

const STATUS_SISWA_OPTIONS = [
    { value: 'AKTIF', label: 'Aktif' },
    { value: 'TIDAK_AKTIF', label: 'Tidak Aktif' },
    { value: 'LULUS', label: 'Lulus' },
    { value: 'PINDAH', label: 'Pindah' },
    { value: 'KELUAR', label: 'Keluar' }
];

export const AcademicSection: React.FC<AcademicSectionProps> = React.memo(({
    control,
    register,
    errors,
    isViewMode,
    watch,
    kelasOptions,
    tahunPelajaranOptions,
    semesterOptions,
    loadingDropdowns
}) => {
    const watchStatus = watch('status');

    if (isViewMode) {
        return (
            <SectionCard title="Informasi Akademik" icon={School}>
                <DetailRow icon={<School size={16} />} label="Kelas" value={(kelasOptions || []).find(o => o.value === watch('kelas_id'))?.label} />
                <DetailRow icon={<CalendarRange size={16} />} label="Tahun Pelajaran" value={(tahunPelajaranOptions || []).find(o => o.value === watch('tahun_pelajaran_id'))?.label} />
                <DetailRow icon={<Clock size={16} />} label="Semester" value={(semesterOptions || []).find(o => o.value === watch('semester_id'))?.label} />
                <DetailRow 
                    icon={<ShieldCheck size={16} />} 
                    label="Status Siswa" 
                    value={watchStatus} 
                    className={watchStatus === 'AKTIF' ? 'bg-green-50/50 dark:bg-green-900/20' : 'bg-red-50/50 dark:bg-red-900/20'}
                />
                {(watchStatus !== 'AKTIF') && (
                    <>
                        <DetailRow icon={<CalendarRange size={16} />} label="Tanggal Keluar" value={watch('tanggal_keluar')} />
                        <DetailRow icon={<AlertCircle size={16} />} label="Alasan Keluar" value={watch('alasan_keluar')} />
                    </>
                )}
            </SectionCard>
        );
    }

    return (
        <SectionCard title="Penempatan & Status Akademik" icon={School}>
            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="kelas_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Pilih Kelas <span className="text-rose-500">*</span>
                    </Label>
                </div>
                <Controller
                    name="kelas_id"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            id="kelas_id"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={kelasOptions}
                            placeholder={loadingDropdowns ? 'Memuat...' : 'Pilih Kelas'}
                            disabled={isViewMode || loadingDropdowns}
                            triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.kelas_id ? 'border-red-500' : ''}`}
                        />
                    )}
                />
                {errors.kelas_id && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.kelas_id.message}</p>
                )}
            </div>

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
                            id="tahun_pelajaran_id"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={tahunPelajaranOptions}
                            placeholder={loadingDropdowns ? 'Memuat...' : 'Pilih Tahun'}
                            disabled={isViewMode || loadingDropdowns}
                            triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.tahun_pelajaran_id ? 'border-red-500' : ''}`}
                        />
                    )}
                />
                {errors.tahun_pelajaran_id && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.tahun_pelajaran_id.message}</p>
                )}
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="semester_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Semester <span className="text-rose-500">*</span>
                    </Label>
                </div>
                <Controller
                    name="semester_id"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            id="semester_id"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={semesterOptions}
                            placeholder="Pilih Semester"
                            disabled={isViewMode || !watch('tahun_pelajaran_id')}
                            triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.semester_id ? 'border-red-500' : ''}`}
                        />
                    )}
                />
                {errors.semester_id && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.semester_id.message}</p>
                )}
            </div>

            <div className="space-y-2 group">
                <div className="flex items-center justify-between px-1">
                    <Label htmlFor="status" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                        Status Keaktifan <span className="text-rose-500">*</span>
                    </Label>
                </div>
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <SearchableSelect
                            id="status"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={STATUS_SISWA_OPTIONS}
                            placeholder="Pilih Status"
                            disabled={isViewMode}
                            triggerClassName={`h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl ${errors.status ? 'border-red-500' : ''}`}
                        />
                    )}
                />
            </div>

            {watchStatus !== 'AKTIF' && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="tanggal_keluar" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                Tanggal Keluar / Lulus
                            </Label>
                        </div>
                        <Input
                            id="tanggal_keluar"
                            type="date"
                            {...register('tanggal_keluar')}
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>

                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="alasan_keluar" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                Alasan Keluar
                            </Label>
                        </div>
                        <Input
                            id="alasan_keluar"
                            {...register('alasan_keluar')}
                            placeholder="Keterangan pindah/lulus..."
                            disabled={isViewMode}
                            className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500/30 transition-all rounded-xl"
                        />
                    </div>
                </div>
            )}
        </SectionCard>
    );
});

AcademicSection.displayName = 'AcademicSection';
