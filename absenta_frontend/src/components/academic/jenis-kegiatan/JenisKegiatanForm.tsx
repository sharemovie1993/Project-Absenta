

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, RefreshCw } from 'lucide-react';
import { 
  Button, 
  Alert,
  Loader,
  ModalFooter
} from '../../ui';
import { jenisKegiatanMasterApi } from '../../../api/academic/jenisKegiatanMaster.api';
import toast from 'react-hot-toast';
import { jenisKegiatanSchema, type JenisKegiatanFormValues } from '../../../schemas/academic/jenis-kegiatan.schema';

// Modular Sections
import { JenisKegiatanInfoSection } from './form/JenisKegiatanInfoSection';

interface JenisKegiatanFormProps {
  itemId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

const TIPE_OPTIONS = [
  { value: 'PEMBIASAAN', label: 'PEMBIASAAN' },
  { value: 'KBM', label: 'KBM' },
  { value: 'ESKUL', label: 'ESKUL' }
];

export const JenisKegiatanForm: React.FC<JenisKegiatanFormProps> = React.memo(({
  itemId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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
  } = useForm<JenisKegiatanFormValues>({
    resolver: zodResolver(jenisKegiatanSchema) as any,
    defaultValues: {
      nama: '',
      tipe: 'KBM',
      urutan: undefined,
      aktif: true
    }
  });

  // Load data for edit/view mode
  useEffect(() => {
    const loadItemData = async () => {
      if (!itemId || mode === 'create') return;

      try {
        setLoadingData(true);
        const res = await jenisKegiatanMasterApi.getAll({ limit: 100 });
        const items = res.data || [];
        const item = items.find(i => i.id === itemId);
        
        if (item) {
          reset({
            nama: item.nama || '',
            tipe: item.tipe as 'PEMBIASAAN' | 'KBM' | 'ESKUL',
            urutan: item.urutan,
            aktif: item.aktif
          } as any);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Gagal memuat data jenis kegiatan');
      } finally {
        setLoadingData(false);
      }
    };

    loadItemData();
  }, [itemId, mode, reset]);

  const onFormSubmit = useCallback(async (data: JenisKegiatanFormValues) => {
    if (isViewMode) return;
    
    try {
      setLoading(true);
      setSubmitError('');

      if (isEditMode && itemId) {
        await jenisKegiatanMasterApi.update(itemId, data as any);
        toast.success('Jenis kegiatan berhasil diperbarui');
      } else {
        await jenisKegiatanMasterApi.create(data as any);
        toast.success('Jenis kegiatan berhasil dibuat');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  }, [isViewMode, isEditMode, itemId, onSuccess]);

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            {submitError}
          </Alert>
        )}

        <JenisKegiatanInfoSection 
          register={register}
          control={control}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
          tipeOptions={TIPE_OPTIONS}
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
              {isEditMode ? 'Simpan Perubahan' : 'Buat Jenis Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
});

JenisKegiatanForm.displayName = 'JenisKegiatanForm';
export default JenisKegiatanForm;

