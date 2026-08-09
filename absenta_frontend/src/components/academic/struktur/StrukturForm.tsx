import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/Label';
import { SimpleFormField } from '@/components/ui/SimpleFormField';
import type { CreateStrukturInput, UpdateStrukturInput, StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';
import { getJurusanList } from '@/api/academic/jurusan.api';
import { getKelasList } from '@/api/academic/kelas.api';
import type { Jurusan, Kelas } from '@/types/academic';

const schema = z.object({
  kode: z.string()
    .min(1, 'Kode wajib diisi')
    .max(20, 'Maksimal 20 karakter')
    .regex(/^[A-Za-z0-9_]+$/, 'Kode hanya boleh berisi huruf, angka, dan underscore'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  deskripsi: z.string().optional(),
  scope: z.string().min(1, 'Scope wajib dipilih'),
  scope_type: z.enum(['global', 'unit', 'kelas']),
  unit_id: z.string().optional().nullable(),
  kelas_id: z.string().optional().nullable(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface StrukturFormProps {
  initialData?: StrukturOrganisasi | null;
  onSubmit: (data: CreateStrukturInput | UpdateStrukturInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const SCOPE_OPTIONS = [
  { value: 'attendance', label: 'Attendance (Absensi)' },
  { value: 'academic', label: 'Academic (Kurikulum)' },
  { value: 'student', label: 'Student (Kesiswaan)' },
  { value: 'admin', label: 'Admin (TU/Kantor)' },
  { value: 'facility', label: 'Facility (Sarpras)' },
];

const SCOPE_TYPE_OPTIONS = [
  { value: 'global', label: 'Global (Seluruh Sekolah)' },
  { value: 'unit', label: 'Per Jurusan / Unit' },
  { value: 'kelas', label: 'Per Kelas' },
];

export const StrukturForm: React.FC<StrukturFormProps> = React.memo(({ initialData, onSubmit, onCancel, isLoading }) => {
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [kelass, setKelass] = useState<Kelas[]>([]);
  
  const { register, control, handleSubmit, watch, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: '',
      nama: '',
      deskripsi: '',
      scope: '',
      scope_type: 'global' as const,
      unit_id: null,
      kelas_id: null,
      is_active: true,
    }
  });

  const watchScopeType = watch('scope_type');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jRes, kRes] = await Promise.all([
          getJurusanList(1, 100),
          getKelasList(1, 100)
        ]);
        setJurusans(jRes.data || []);
        setKelass(kRes.data || []);
      } catch (err) {
        console.error('Failed to fetch jurisdictional data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        kode: initialData.kode,
        nama: initialData.nama,
        deskripsi: initialData.deskripsi || '',
        scope: initialData.scope,
        scope_type: (initialData.scope_type as any) || 'global',
        unit_id: initialData.unit_id || null,
        kelas_id: initialData.kelas_id || null,
        is_active: initialData.is_active,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (values: any) => {
    const payload = {
      ...values,
      kode: (values.kode as string).trim().toUpperCase(),
      // Ensure IDs are null if type doesn't match
      unit_id: values.scope_type === 'unit' ? values.unit_id : null,
      kelas_id: values.scope_type === 'kelas' ? values.kelas_id : null,
    };
    await onSubmit(payload as any);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <SimpleFormField label="Kode Struktur *" error={errors.kode?.message}>
          <Input 
            id="kode"
            {...register('kode')} 
            placeholder="Contoh: TOOLMAN" 
            disabled={!!initialData} 
            className="font-mono uppercase"
          />
        </SimpleFormField>

        <SimpleFormField label="Nama Struktur *" error={errors.nama?.message}>
          <Input 
            id="nama"
            {...register('nama')} 
            placeholder="Contoh: Toolman Bengkel" 
          />
        </SimpleFormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SimpleFormField label="Scope Modul *" error={errors.scope?.message}>
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                options={SCOPE_OPTIONS}
                placeholder="Pilih Scope..."
              />
            )}
          />
        </SimpleFormField>

        <SimpleFormField label="Tipe Penugasan *">
          <Controller
            name="scope_type"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                options={SCOPE_TYPE_OPTIONS}
                placeholder="Pilih Tipe..."
              />
            )}
          />
        </SimpleFormField>
      </div>

      {watchScopeType === 'unit' && (
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
          <SimpleFormField label="Hubungkan ke Jurusan / Unit *">
            <Controller
              name="unit_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={jurusans.map(j => ({ label: j.nama, value: j.id }))}
                  placeholder="Pilih Jurusan..."
                  className="bg-white"
                />
              )}
            />
          </SimpleFormField>
          <p className="text-xs text-blue-600 mt-2">
            Jabatan ini akan terbatas pada yurisdiksi jurusan yang dipilih.
          </p>
        </div>
      )}

      {watchScopeType === 'kelas' && (
        <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
          <SimpleFormField label="Hubungkan ke Kelas *">
            <Controller
              name="kelas_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={kelass.map(k => ({ label: `${k.tingkat} ${k.nama_kelas}`, value: k.id }))}
                  placeholder="Pilih Kelas..."
                  className="bg-white"
                />
              )}
            />
          </SimpleFormField>
          <p className="text-xs text-purple-600 mt-2">
            Jabatan ini (misal: Wali Kelas) akan terikat pada kelas yang dipilih.
          </p>
        </div>
      )}

      <SimpleFormField label="Deskripsi" error={errors.deskripsi?.message}>
        <Textarea 
          id="deskripsi"
          {...register('deskripsi')} 
          placeholder="Tuliskan tugas dan tanggung jawab jabatan ini..." 
          className="min-h-[100px]"
        />
      </SimpleFormField>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button type="submit" disabled={isLoading} className="px-8">
          {isLoading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Buat Struktur'}
        </Button>
      </div>
    </form>
  );
});
