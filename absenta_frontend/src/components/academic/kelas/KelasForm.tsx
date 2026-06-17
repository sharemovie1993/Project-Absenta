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

// Modular Sections
import { KelasInfoSection } from './form/KelasInfoSection';

interface KelasFormProps {
  kelasId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

const TINGKAT_OPTIONS = [
  { value: 10, label: 'Kelas 10' },
  { value: 11, label: 'Kelas 11' },
  { value: 12, label: 'Kelas 12' }
];

export const KelasForm: React.FC<KelasFormProps> = ({
  kelasId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

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
      tingkat: 10,
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
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdownData();
  }, []);

  // Load kelas data for edit/view mode
  useEffect(() => {
    const loadKelasData = async () => {
      if (!kelasId || mode === 'create') return;

      try {
        setLoadingData(true);
        const kelas = await getKelasDetail(kelasId);
        
        reset({
          nama_kelas: kelas.nama_kelas || '',
          tingkat: kelas.tingkat || 10,
          jurusan_id: kelas.jurusan_id || '',
          device_id: kelas.device_id || '',
          is_active: kelas.is_active !== undefined ? kelas.is_active : true,
        });

      } catch (error) {
        console.error('Error loading kelas data:', error);
        setSubmitError('Gagal memuat data kelas');
      } finally {
        setLoadingData(false);
      }
    };

    loadKelasData();
  }, [kelasId, mode, reset]);

  const onFormSubmit = async (data: CreateKelasSchema) => {
    if (isViewMode) return;

    try {
      setLoading(true);
      setSubmitError('');

      if (isEditMode && kelasId) {
        const updatePayload: UpdateKelasPayload = {
          nama_kelas: data.nama_kelas,
          tingkat: data.tingkat,
          jurusan_id: data.jurusan_id,
          is_active: data.is_active,
        };
        
        await updateKelas(kelasId, updatePayload);
      } else {
        const createPayload: CreateKelasPayload = {
          nama_kelas: data.nama_kelas,
          tingkat: data.tingkat,
          jurusan_id: data.jurusan_id,
          is_active: data.is_active,
        };
        
        await createKelas(createPayload);
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(
        error.response?.data?.message || 
        `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} data kelas`
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Loader size="lg" />
        <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memuat data kelas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40">
      <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-6">
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
          tingkatOptions={TINGKAT_OPTIONS}
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
};
