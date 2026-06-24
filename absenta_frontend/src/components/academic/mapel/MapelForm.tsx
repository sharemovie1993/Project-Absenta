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
import { createMapel, updateMapel, getMapelDetail, type CreateMapelPayload, type UpdateMapelPayload } from '../../../api/academic/mapel.api';
import { useToast } from '../../../hooks/useToast';
import { createMapelSchema, type CreateMapelSchema } from '../../../schemas/academic/mapel.schema';

// Modular Sections
import { MapelInfoSection } from './form/MapelInfoSection';

interface MapelFormProps {
  mapelId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

const TINGKAT_OPTIONS = [
  { value: '0', label: 'Semua Tingkat' },
  { value: '1', label: 'Kelas 1' },
  { value: '2', label: 'Kelas 2' },
  { value: '3', label: 'Kelas 3' },
  { value: '4', label: 'Kelas 4' },
  { value: '5', label: 'Kelas 5' },
  { value: '6', label: 'Kelas 6' },
  { value: '7', label: 'Kelas 7' },
  { value: '8', label: 'Kelas 8' },
  { value: '9', label: 'Kelas 9' },
  { value: '10', label: 'Kelas 10' },
  { value: '11', label: 'Kelas 11' },
  { value: '12', label: 'Kelas 12' }
];

export const MapelForm = React.memo<MapelFormProps>(({
  mapelId,
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
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateMapelSchema>({
    resolver: zodResolver(createMapelSchema),
    defaultValues: {
      nama_mapel: '',
      kode_mapel: '',
      tingkat: null
    }
  });

  // Load mapel data for edit/view mode
  useEffect(() => {
    const loadMapelData = async () => {
      if (!mapelId || mode === 'create') return;

      try {
        setLoadingData(true);
        const response = await getMapelDetail(mapelId);
        
        if (response.success) {
          const mapel = response.data;
          reset({
            nama_mapel: mapel.nama_mapel || '',
            kode_mapel: mapel.kode_mapel || '',
            tingkat: mapel.tingkat ?? null
          });
        } else {
          setSubmitError('Gagal memuat data mata pelajaran');
        }
      } catch (error) {
        console.error('Error loading mapel data:', error);
        setSubmitError('Gagal memuat data mata pelajaran');
      } finally {
        setLoadingData(false);
      }
    };

    loadMapelData();
  }, [mapelId, mode, reset]);

  // Handle form submission
  const onFormSubmit = async (data: CreateMapelSchema) => {
    if (isViewMode) return;

    try {
      setLoading(true);
      setSubmitError('');

      const payload: CreateMapelPayload | UpdateMapelPayload = {
        nama_mapel: data.nama_mapel,
        kode_mapel: data.kode_mapel,
        tingkat: data.tingkat
      };

      let response;
      if (isEditMode && mapelId) {
        response = await updateMapel(mapelId, payload);
      } else {
        response = await createMapel(payload as CreateMapelPayload);
      }

      if (response.success) {
        showToast(
          isEditMode ? 'Mata pelajaran berhasil diperbarui' : 'Mata pelajaran berhasil dibuat',
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

        <MapelInfoSection 
          register={register}
          control={control}
          errors={errors}
          isViewMode={isViewMode}
          watch={watch}
          tingkatOptions={TINGKAT_OPTIONS}
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
              {isEditMode ? 'Simpan Perubahan' : 'Buat Mapel Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
});

MapelForm.displayName = 'MapelForm';

export default MapelForm;
