
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Button, 
  Alert,
  Loader,
  ModalFooter
} from '../../ui';
import useConfirm from '../../../hooks/useConfirm';
import { Save, X, RefreshCw } from 'lucide-react';
import { 
  createTahunPelajaran, 
  updateTahunPelajaran, 
  getTahunPelajaranDetail,
  getActiveTahunPelajaran,
  activateTahunPelajaran,
  type CreateTahunPelajaranPayload, 
  type UpdateTahunPelajaranPayload 
} from '../../../api/academic/tahunPelajaran.api';
import type { TahunPelajaran } from '../../../types/academic';
import { useToast } from '../../../hooks/useToast';
import { createTahunPelajaranSchema, type CreateTahunPelajaranSchema } from '../../../schemas/academic/tahun-pelajaran.schema';

// Modular Sections
import { TahunPelajaranInfoSection } from './form/TahunPelajaranInfoSection';

interface TahunPelajaranFormProps {
  tahunPelajaranId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const TahunPelajaranForm: React.FC<TahunPelajaranFormProps> = React.memo(({
  tahunPelajaranId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [activeYear, setActiveYear] = useState<TahunPelajaran | null>(null);
  
  const confirm = useConfirm();
  const { showToast } = useToast();
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateTahunPelajaranSchema>({
    resolver: zodResolver(createTahunPelajaranSchema),
    defaultValues: {
      tahun: '',
      is_active: false
    }
  });

  // Load active year for validation/warning
  useEffect(() => {
    const loadActiveYear = async () => {
      try {
        const ay = await getActiveTahunPelajaran();
        setActiveYear(ay || null);
      } catch {
        setActiveYear(null);
      }
    };
    loadActiveYear();
  }, []);

  // Load data for edit/view mode
  useEffect(() => {
    const loadTahunPelajaranData = async () => {
      if (!tahunPelajaranId || mode === 'create') return;

      try {
        setLoadingData(true);
        const data = await getTahunPelajaranDetail(tahunPelajaranId);
        
        reset({
          tahun: data.tahun,
          is_active: data.is_active
        });
      } catch (error) {
        console.error('Error loading tahun pelajaran:', error);
        showToast('Gagal memuat data tahun pelajaran', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadTahunPelajaranData();
  }, [tahunPelajaranId, mode, showToast, reset]);

  const onFormSubmit = useCallback(async (data: CreateTahunPelajaranSchema) => {
    if (isViewMode) return;
    
    let requiresSeparateActivation = false;

    // Check for activation confirmation
    if (data.is_active) {
      if (activeYear && (!isEditMode || activeYear.id !== tahunPelajaranId)) {
        const ok = await confirm({
          title: "Konfirmasi Aktivasi",
          description: `Anda akan mengaktifkan Tahun Pelajaran ${data.tahun}. Tindakan ini akan menonaktifkan tahun pelajaran aktif sebelumnya (${activeYear?.tahun || '-'}). Lanjutkan?`,
          confirmText: "Ya, Aktifkan",
          cancelText: "Batal",
          style: "warning"
        });
        if (!ok) return;
        requiresSeparateActivation = true;
      }
    }

    try {
      setLoading(true);
      setSubmitError('');

      const payload: CreateTahunPelajaranPayload | UpdateTahunPelajaranPayload = {
        tahun: data.tahun,
        is_active: requiresSeparateActivation ? false : data.is_active
      };

      let response;
      if (isEditMode && tahunPelajaranId) {
        const updatePayload = { ...payload, is_active: requiresSeparateActivation ? false : data.is_active };
        response = await updateTahunPelajaran(tahunPelajaranId, updatePayload);
      } else {
        const createPayload = { ...payload, is_active: false };
        response = await createTahunPelajaran(createPayload as CreateTahunPelajaranPayload);
      }

      if (!response.success) {
        throw new Error(response.message || 'Gagal menyimpan data');
      }

      const targetId = isEditMode ? tahunPelajaranId : response.data?.id;

      // Handle explicit activation if needed
      if (data.is_active && targetId) {
        const needsActivation = !isEditMode || (isEditMode && !activeYear) || (activeYear?.id !== targetId);
        
        if (needsActivation) {
           const activateRes = await activateTahunPelajaran(targetId);
           if (!activateRes.success) {
             showToast('Data tersimpan tapi gagal mengaktifkan tahun pelajaran', 'warning');
           }
        }
      }

      showToast(
        isEditMode ? 'Tahun pelajaran berhasil diperbarui' : 'Tahun pelajaran berhasil dibuat',
        'success'
      );
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(
        error.response?.data?.message || 
        error.message ||
        'Terjadi kesalahan saat menyimpan data'
      );
    } finally {
      setLoading(false);
    }
  }, [isViewMode, activeYear, isEditMode, tahunPelajaranId, confirm, showToast, onSuccess]);

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            {submitError}
          </Alert>
        )}

        <TahunPelajaranInfoSection 
          register={register}
          control={control}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
          activeYear={activeYear}
          tahunPelajaranId={tahunPelajaranId}
          isEditMode={isEditMode}
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
              {isEditMode ? 'Simpan Perubahan' : 'Buat Periode Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </>
  );
});

TahunPelajaranForm.displayName = 'TahunPelajaranForm';
export default TahunPelajaranForm;

