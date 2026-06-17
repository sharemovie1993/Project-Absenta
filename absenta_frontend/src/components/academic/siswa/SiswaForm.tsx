import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { Alert } from '../../ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import { ModalFooter } from '../../ui/Modal';
import { Save, X, RefreshCw } from 'lucide-react';
import { createSiswa, updateSiswa, getSiswaDetail, type CreateSiswaPayload, type UpdateSiswaPayload } from '../../../api/academic/siswa.api';
import {
  getKelasForDropdown,
  getTahunPelajaranForDropdown,
  getSemesterByTahunPelajaranForDropdown,
  type DropdownOption
} from '../../../api/dropdown.api';
import { siswaSchema, type SiswaFormValues } from '../../../schemas/academic/siswa.schema';
import { useToast } from '../../../hooks/useToast';

// Modular Sections
import { PersonalSection } from './form/PersonalSection';
import { AcademicSection } from './form/AcademicSection';
import { GuardianSection } from './form/GuardianSection';

interface SiswaFormProps {
  siswaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const SiswaForm: React.FC<SiswaFormProps> = ({
  siswaId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranOptions, setTahunPelajaranOptions] = useState<DropdownOption[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<DropdownOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<SiswaFormValues>({
    resolver: zodResolver(siswaSchema),
    defaultValues: {
      jenis_kelamin: '' as any,
      status: 'AKTIF',
      transportasi: 'KENDARAAN_PRIBADI',
      orang_tua: []
    }
  });

  const watchTahunPelajaran = watch('tahun_pelajaran_id');

  // Load Initial Dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [kelasData, tahunPelajaranData] = await Promise.all([
          getKelasForDropdown(),
          getTahunPelajaranForDropdown()
        ]);
        setKelasOptions(kelasData || []);
        setTahunPelajaranOptions(tahunPelajaranData || []);
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadDropdownData();
  }, []);

  // Load Semesters when Tahun Pelajaran changes
  useEffect(() => {
    const loadSemesters = async () => {
      if (!watchTahunPelajaran) {
        setSemesterOptions([]);
        return;
      }
      try {
        const semesters = await getSemesterByTahunPelajaranForDropdown(watchTahunPelajaran);
        setSemesterOptions(semesters || []);
      } catch (error) {
        console.error('Error loading semesters:', error);
      }
    };
    loadSemesters();
  }, [watchTahunPelajaran]);

  // Load Siswa Data for Edit/View
  useEffect(() => {
    const loadSiswaData = async () => {
      if (!siswaId || mode === 'create') return;

      try {
        setLoadingData(true);
        const siswa = await getSiswaDetail(siswaId);
        
        if (!siswa) return;

        reset({
          nis: siswa.nis || '',
          nama_siswa: siswa.nama_siswa || '',
          no_hp: siswa.no_hp || '',
          alamat: siswa.alamat || '',
          tanggal_lahir: siswa.tanggal_lahir ? siswa.tanggal_lahir.split('T')[0] : '',
          tempat_lahir: siswa.tempat_lahir || '',
          jenis_kelamin: (siswa.jenis_kelamin as 'L' | 'P') || 'L',
          kelas_id: siswa.kelas_id || '',
          tahun_pelajaran_id: siswa.tahun_pelajaran_id || '',
          semester_id: siswa.semester_id || '',
          status: (siswa.status as any) || 'AKTIF',
          tanggal_keluar: siswa.tanggal_keluar ? siswa.tanggal_keluar.split('T')[0] : '',
          alasan_keluar: siswa.alasan_keluar || '',
          transportasi: siswa.transportasi || '',
          no_rfid: siswa.no_rfid || '',
          nisn: siswa.nisn || '',
          nama_ayah: siswa.nama_ayah || '',
          pekerjaan_ayah: siswa.pekerjaan_ayah || '',
          pendidikan_ayah: siswa.pendidikan_ayah || '',
          penghasilan_ayah: siswa.penghasilan_ayah || '',
          nama_ibu: siswa.nama_ibu || '',
          pekerjaan_ibu: siswa.pekerjaan_ibu || '',
          pendidikan_ibu: siswa.pendidikan_ibu || '',
          penghasilan_ibu: siswa.penghasilan_ibu || '',
          nama_wali: siswa.nama_wali || '',
          hubungan_wali: siswa.hubungan_wali || '',
          pekerjaan_wali: siswa.pekerjaan_wali || '',
          penghasilan_wali: siswa.penghasilan_wali || '',
          orang_tua: (siswa as any).OrangTua?.map((o: any) => ({
            id: o.id,
            nama: o.nama || '',
            hubungan: o.hubungan || '',
            no_hp: o.no_hp || '',
            email: o.email || '',
            nik: o.nik || ''
          })) || []
        });
      } catch (error) {
        console.error('Error loading siswa data:', error);
        setSubmitError('Gagal memuat data siswa');
      } finally {
        setLoadingData(false);
      }
    };

    loadSiswaData();
  }, [siswaId, mode, reset]);

  const onFormSubmit = async (data: SiswaFormValues) => {
    if (isViewMode) return;

    try {
      setLoading(true);
      setSubmitError('');

      const payload = {
        ...data,
        tanggal_lahir: data.tanggal_lahir || undefined,
        tanggal_keluar: data.tanggal_keluar || undefined,
        alasan_keluar: data.alasan_keluar || undefined,
        no_rfid: data.no_rfid?.trim() ? data.no_rfid : undefined,
        orang_tua: data.orang_tua?.filter(o => o.nama.trim()).map(o => ({
            ...o,
            email: o.email || undefined
        }))
      };

      if (isEditMode && siswaId) {
        await updateSiswa(siswaId, payload as UpdateSiswaPayload);
      } else {
        await createSiswa(payload as CreateSiswaPayload);
      }

      showToast(isEditMode ? 'Data siswa berhasil diperbarui' : 'Siswa baru berhasil ditambahkan', 'success');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.response?.data?.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} data siswa`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Loader size="lg" />
        <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sinkronisasi Data Siswa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive" className="rounded-xl border-dashed">
            {submitError}
          </Alert>
        )}

        <Tabs defaultValue="data-pribadi" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-14 p-2 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <TabsTrigger value="data-pribadi" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Data Pribadi</TabsTrigger>
            <TabsTrigger value="akademik" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Akademik</TabsTrigger>
            <TabsTrigger value="orang-tua" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Orang Tua & Wali</TabsTrigger>
          </TabsList>

          <TabsContent value="data-pribadi" className="space-y-6">
            <PersonalSection 
              register={register}
              control={control}
              errors={errors}
              isViewMode={isViewMode}
              watch={watch}
            />
          </TabsContent>

          <TabsContent value="akademik" className="space-y-6">
            <AcademicSection 
              register={register}
              control={control}
              errors={errors}
              isViewMode={isViewMode}
              watch={watch}
              kelasOptions={kelasOptions}
              tahunPelajaranOptions={tahunPelajaranOptions}
              semesterOptions={semesterOptions}
              loadingDropdowns={loadingDropdowns}
            />
          </TabsContent>

          <TabsContent value="orang-tua" className="space-y-6">
            <GuardianSection 
              register={register}
              control={control}
              errors={errors}
              isViewMode={isViewMode}
              watch={watch}
            />
          </TabsContent>
        </Tabs>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            {isViewMode ? 'Tutup Detail' : 'Batalkan'}
          </Button>
          {!isViewMode && (
            <Button
              type="submit"
              variant="toolbarPrimary"
              size="toolbar"
              disabled={loading}
              className="px-8"
            >
              {loading ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Siswa Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
};

export default SiswaForm;
