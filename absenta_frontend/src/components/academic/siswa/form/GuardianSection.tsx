import React from 'react';
import { User as UserIcon, Phone, Mail, Briefcase, BookOpen, Banknote, UserCheck, Users, Plus, Trash2, ShieldCheck, Heart } from 'lucide-react';
import { Input } from '../../../ui/Input';
import { SearchableSelect } from '../../../ui/SearchableSelect';
import { Label } from '../../../ui/Label';
import { Button } from '../../../ui/Button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../ui/Accordion';
import { Controller, useFieldArray } from 'react-hook-form';
import { 
    PEKERJAAN_OPTIONS, 
    PENDIDIKAN_OPTIONS, 
    PENGHASILAN_OPTIONS, 
    HUBUNGAN_WALI_OPTIONS 
} from '../../../../api/dropdown.api';
import { SectionCard, DetailRow } from './FormShared';

const HUBUNGAN_ORANG_TUA_OPTIONS = [
  { value: 'AYAH', label: 'Ayah' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'WALI', label: 'Wali' }
];

interface GuardianSectionProps {
    control: any;
    register: any;
    errors: any;
    isViewMode: boolean;
    watch: any;
}

export const GuardianSection: React.FC<GuardianSectionProps> = ({
    control,
    register,
    errors,
    isViewMode,
    watch
}) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "orang_tua"
    });

    if (isViewMode) {
        const orangTua = watch('orang_tua') || [];
        return (
            <div className="space-y-6">
                <SectionCard title="Kontak Notifikasi Orang Tua" icon={Phone}>
                    {orangTua.length > 0 ? (
                        orangTua.map((row: any, index: number) => (
                            <div key={row.id || index} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 mb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0 last:mb-0">
                                <DetailRow icon={<UserIcon size={16} />} label="Nama" value={row.nama} />
                                <DetailRow icon={<Heart size={16} />} label="Hubungan" value={row.hubungan} />
                                <DetailRow icon={<Phone size={16} />} label="WhatsApp" value={row.no_hp} />
                                <DetailRow icon={<Mail size={16} />} label="Email" value={row.email} />
                            </div>
                        ))
                    ) : (
                        <div className="md:col-span-2 py-8 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Belum Ada Kontak Terdaftar</p>
                        </div>
                    )}
                </SectionCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Profil Ayah Kandung" icon={UserCheck}>
                        <DetailRow icon={<UserIcon size={16} />} label="Nama Ayah" value={watch('nama_ayah')} />
                        <DetailRow icon={<Briefcase size={16} />} label="Pekerjaan" value={PEKERJAAN_OPTIONS.find(o => o.value === watch('pekerjaan_ayah'))?.label} />
                        <DetailRow icon={<BookOpen size={16} />} label="Pendidikan" value={PENDIDIKAN_OPTIONS.find(o => o.value === watch('pendidikan_ayah'))?.label} />
                        <DetailRow icon={<Banknote size={16} />} label="Penghasilan" value={PENGHASILAN_OPTIONS.find(o => o.value === watch('penghasilan_ayah'))?.label} />
                    </SectionCard>
                    <SectionCard title="Profil Ibu Kandung" icon={UserCheck}>
                        <DetailRow icon={<UserIcon size={16} />} label="Nama Ibu" value={watch('nama_ibu')} />
                        <DetailRow icon={<Briefcase size={16} />} label="Pekerjaan" value={PEKERJAAN_OPTIONS.find(o => o.value === watch('pekerjaan_ibu'))?.label} />
                        <DetailRow icon={<BookOpen size={16} />} label="Pendidikan" value={PENDIDIKAN_OPTIONS.find(o => o.value === watch('pendidikan_ibu'))?.label} />
                        <DetailRow icon={<Banknote size={16} />} label="Penghasilan" value={PENGHASILAN_OPTIONS.find(o => o.value === watch('penghasilan_ibu'))?.label} />
                    </SectionCard>
                </div>

                <SectionCard title="Profil Wali Siswa" icon={ShieldCheck}>
                    <DetailRow icon={<UserIcon size={16} />} label="Nama Wali" value={watch('nama_wali')} />
                    <DetailRow icon={<Heart size={16} />} label="Hubungan" value={HUBUNGAN_WALI_OPTIONS.find(o => o.value === watch('hubungan_wali'))?.label} />
                    <DetailRow icon={<Briefcase size={16} />} label="Pekerjaan" value={PEKERJAAN_OPTIONS.find(o => o.value === watch('pekerjaan_wali'))?.label} />
                    <DetailRow icon={<Banknote size={16} />} label="Penghasilan" value={PENGHASILAN_OPTIONS.find(o => o.value === watch('penghasilan_wali'))?.label} />
                </SectionCard>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <SectionCard title="Kontak Emergency / Notifikasi" icon={Phone}>
                <div className="md:col-span-2 space-y-4">
                    {fields.length === 0 && (
                        <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Belum Ada Kontak. Klik tombol di bawah untuk menambah.</p>
                        </div>
                    )}
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/50 space-y-6 relative group/card"
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 group">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Nama Lengkap</Label>
                                    <Input
                                        {...register(`orang_tua.${index}.nama`)}
                                        placeholder="Entry Nama..."
                                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                    />
                                    {errors.orang_tua?.[index]?.nama && (
                                        <p className="text-[10px] font-bold text-red-500 mt-1">{errors.orang_tua[index].nama.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2 group">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Hubungan</Label>
                                    <Controller
                                        name={`orang_tua.${index}.hubungan`}
                                        control={control}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                options={HUBUNGAN_ORANG_TUA_OPTIONS}
                                                placeholder="Pilih Hubungan"
                                                triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2 group">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">No HP (WhatsApp)</Label>
                                    <Input
                                        {...register(`orang_tua.${index}.no_hp`)}
                                        placeholder="628xxx..."
                                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2 group">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Email</Label>
                                    <Input
                                        type="email"
                                        {...register(`orang_tua.${index}.email`)}
                                        placeholder="example@mail.com"
                                        className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => append({ nama: '', hubungan: 'AYAH', no_hp: '', email: '' })}
                            className="px-8 border-dashed border-2 hover:border-blue-500 hover:text-blue-600 dark:border-slate-800"
                        >
                            <Plus size={14} className="mr-2" />
                            Tambah Kontak Notifikasi
                        </Button>
                    </div>
                </div>
            </SectionCard>
            
            <Accordion defaultValue="ayah" className="w-full space-y-4">
                <AccordionItem value="ayah" className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <UserCheck size={16} />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-left">Data Ayah Kandung</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Nama Ayah</Label>
                                <Input {...register('nama_ayah')} placeholder="Nama Ayah..." className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Pekerjaan</Label>
                                <Controller name="pekerjaan_ayah" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PEKERJAAN_OPTIONS} placeholder="Pilih Pekerjaan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Pendidikan</Label>
                                <Controller name="pendidikan_ayah" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENDIDIKAN_OPTIONS} placeholder="Pilih Pendidikan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Penghasilan</Label>
                                <Controller name="penghasilan_ayah" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENGHASILAN_OPTIONS} placeholder="Pilih Penghasilan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ibu" className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <UserCheck size={16} />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-left">Data Ibu Kandung</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Nama Ibu</Label>
                                <Input {...register('nama_ibu')} placeholder="Nama Ibu..." className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Pekerjaan</Label>
                                <Controller name="pekerjaan_ibu" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PEKERJAAN_OPTIONS} placeholder="Pilih Pekerjaan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Pendidikan</Label>
                                <Controller name="pendidikan_ibu" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENDIDIKAN_OPTIONS} placeholder="Pilih Pendidikan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Penghasilan</Label>
                                <Controller name="penghasilan_ibu" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENGHASILAN_OPTIONS} placeholder="Pilih Penghasilan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="wali" className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <ShieldCheck size={16} />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-left">Data Wali (Opsional)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Nama Wali</Label>
                                <Input {...register('nama_wali')} placeholder="Nama Wali..." className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Hubungan Wali</Label>
                                <Controller name="hubungan_wali" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={HUBUNGAN_WALI_OPTIONS} placeholder="Pilih Hubungan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Pekerjaan Wali</Label>
                                <Controller name="pekerjaan_wali" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PEKERJAAN_OPTIONS} placeholder="Pilih Pekerjaan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                            <div className="space-y-2 group">
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Penghasilan Wali</Label>
                                <Controller name="penghasilan_wali" control={control} render={({ field }) => (
                                    <SearchableSelect value={field.value} onValueChange={field.onChange} options={PENGHASILAN_OPTIONS} placeholder="Pilih Penghasilan" triggerClassName="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl" />
                                )} />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};
