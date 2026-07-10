import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, RefreshCw } from 'lucide-react';
import { 
  Button, 
  Alert,
  Loader,
  ModalFooter
} from '../../ui';
import { createKelas, updateKelas, getKelasDetail, type CreateKelasPayload, type UpdateKelasPayload } from '../../../api/academic/kelas.api';
import { getJurusanList } from '../../../api/academic/jurusan.api';
import type { Jurusan } from '../../../types/academic';
import { createKelasSchema, type CreateKelasSchema } from '../../../schemas/academic/kelas.schema';
import toast from 'react-hot-toast';
import { useJenjang } from '../../../hooks/useJenjang';

// Modular Sections
import { KelasInfoSection } from './form/KelasInfoSection';

interface KelasFormProps {
  kelasId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
  initialTingkat?: number;
}

// Tidak ada lagi TINGKAT_OPTIONS yang hardcode —
// opsi tingkat diambil secara dinamis dari kelas yang terdaftar di database.

export const KelasForm = React.memo<KelasFormProps>(({
  kelasId,
  onSuccess,
  onCancel,
  mode = 'create',
  initialTingkat
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);
  const [tingkatOptions, setTingkatOptions] = useState<{ value: number; label: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  const { tingkatList: hookTingkatList, isLoading: isLoadingJenjang } = useJenjang();



  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateKelasSchema>({
    resolver: zodResolver(createKelasSchema),
    defaultValues: {
      nama_kelas: '',
      tingkat: initialTingkat ?? 0, // akan di-update setelah tingkatOptions dimuat
      jurusan_id: '',
      device_id: '',
      is_active: true,
    }
  });

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const jurusanResponse = await getJurusanList(1, 100);
        setJurusanList(jurusanResponse.data || []);

        // Bangkitkan opsi tingkat secara dinamis dari hook useJenjang
        const options = hookTingkatList.map(t => ({ value: t, label: `Kelas ${t}` }));
        setTingkatOptions(options);

        // Jika mode create dan tingkat belum dipilih (0), set ke tingkat pertama yang tersedia
        if (mode === 'create' && initialTingkat === undefined && options.length > 0) {
          reset(prev => ({ ...prev, tingkat: options[0].value }));
        }
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    if (!isLoadingJenjang) {
      loadDropdownData();
    }
  }, [hookTingkatList, isLoadingJenjang]);

  // Load initial tingkat for create mode
  useEffect(() => {
    if (mode === 'create' && initialTingkat !== undefined) {
      reset({
        nama_kelas: '',
        tingkat: initialTingkat,
        jurusan_id: '',
        device_id: '',
        is_active: true,
      });
    }
  }, [mode, initialTingkat, reset]);

  // Load kelas data for edit/view mode
  useEffect(() => {
    const loadKelasData = async () => {
      if (!kelasId || mode === 'create') return;

      try {
        setLoadingData(true);
        const kelas = await getKelasDetail(kelasId);
        
        reset({
          nama_kelas: kelas.nama_kelas || '',
          tingkat: kelas.tingkat || tingkatOptions[0]?.value || 10,
          jurusan_id: kelas.jurusan_id || '',
          device_id: kelas.device_id || '',
          is_active: kelas.is_active !== undefined ? kelas.is_active : true,
        });

      } catch (error) {
        console.error('Error loading kelas data:', error);
        toast.error('Gagal memuat data kelas');
      } finally {
        setLoadingData(false);
      }
    };

    loadKelasData();
  }, [kelasId, mode, reset]);

  // Handle form submission
  const onFormSubmit = async (data: CreateKelasSchema) => {
    if (isViewMode) return;

    try {
      setLoading(true);
      setSubmitError('');

      const payload: CreateKelasPayload | UpdateKelasPayload = {
        nama_kelas: data.nama_kelas,
        tingkat: data.tingkat,
        jurusan_id: data.jurusan_id,
        device_id: data.device_id || undefined,
        is_active: data.is_active,
      };

      let response;
      if (isEditMode && kelasId) {
        response = await updateKelas(kelasId, payload);
      } else {
        response = await createKelas(payload as CreateKelasPayload);
      }

      if (response.success) {
        toast.success(isEditMode ? 'Kelas berhasil diperbarui' : 'Kelas berhasil dibuat');
        onSuccess?.();
      } else {
        setSubmitError(response.message || 'Terjadi kesalahan saat menyimpan data');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(
        error.response?.data?.message || 
        'Terjadi kesalahan saat menyimpan data'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            {submitError}
          </Alert>
        )}

        <KelasInfoSection 
          register={register}
          control={control}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
          jurusanList={jurusanList}
          tingkatOptions={tingkatOptions}
          loadingDropdowns={loadingDropdowns}
        />

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
              disabled={loading || loadingDropdowns}
              className="px-8"
            >
              {loading ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              {isEditMode ? 'Simpan Perubahan' : 'Buat Kelas Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
});

KelasForm.displayName = 'KelasForm';

export default KelasForm;
