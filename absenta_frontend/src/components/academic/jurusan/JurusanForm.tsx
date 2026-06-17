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
import { createJurusan, updateJurusan, getJurusanDetail, type CreateJurusanPayload, type UpdateJurusanPayload } from '../../../api/academic/jurusan.api';
import { useToast } from '../../../hooks/useToast';
import { createJurusanSchema, type CreateJurusanSchema } from '../../../schemas/academic/jurusan.schema';

// Modular Sections
import { JurusanInfoSection } from './form/JurusanInfoSection';

interface JurusanFormProps {
  jurusanId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const JurusanForm: React.FC<JurusanFormProps> = ({
  jurusanId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  const { showToast } = useToast();

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateJurusanSchema>({
    resolver: zodResolver(createJurusanSchema),
    defaultValues: {
      nama: '',
      kode: '',
      singkatan: ''
    }
  });

  // Load jurusan data for edit/view mode
  useEffect(() => {
    const loadJurusanData = async () => {
      if (!jurusanId || mode === 'create') return;

      try {
        setLoadingData(true);
        const jurusan = await getJurusanDetail(jurusanId);
        
        reset({
          nama: jurusan.nama || '',
          kode: jurusan.kode || '',
          singkatan: jurusan.singkatan || ''
        });
      } catch (error) {
        console.error('Error loading jurusan data:', error);
        showToast('Gagal memuat data jurusan', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadJurusanData();
  }, [jurusanId, mode, showToast, reset]);

  // Handle form submission
  const onFormSubmit = async (data: CreateJurusanSchema) => {
    if (isViewMode) return;
    
    try {
      setLoading(true);
      setSubmitError('');

      const payload: CreateJurusanPayload | UpdateJurusanPayload = {
        nama: data.nama,
        kode: data.kode || undefined,
        singkatan: data.singkatan || undefined
      };

      let response;
      if (isEditMode && jurusanId) {
        response = await updateJurusan(jurusanId, payload);
      } else {
        response = await createJurusan(payload as CreateJurusanPayload);
      }

      if (response.success) {
        showToast(
          isEditMode ? 'Jurusan berhasil diperbarui' : 'Jurusan berhasil dibuat',
          'success'
        );
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

        <JurusanInfoSection 
          register={register}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
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
              disabled={loading}
              className="px-8"
            >
              {loading ? (
                <RefreshCw size={14} className="mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              {isEditMode ? 'Simpan Perubahan' : 'Buat Jurusan Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
};
