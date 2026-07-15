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
import { createMapel, updateMapel, getMapelDetail, getPresetsByJenjang, type CreateMapelPayload, type UpdateMapelPayload, type GlobalMapelPreset } from '../../../api/academic/mapel.api';
import toast from 'react-hot-toast';
import { createMapelSchema, type CreateMapelSchema } from '../../../schemas/academic/mapel.schema';
import { useJenjang } from '../../../hooks/useJenjang';

// Modular Sections
import { MapelInfoSection } from './form/MapelInfoSection';

interface MapelFormProps {
  mapelId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

// TINGKAT_OPTIONS dinonaktifkan di sini karena telah digantikan dengan opsi dinamis dari useJenjang()

export const MapelForm = React.memo<MapelFormProps>(({
  mapelId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [presets, setPresets] = useState<GlobalMapelPreset[]>([]);
  
  const { tingkatList, jenjang, kurikulum } = useJenjang();
  
  const tingkatOptions = React.useMemo(() => {
    return [
      { value: '0', label: 'Semua Tingkat' },
      ...tingkatList.map(t => ({ value: String(t), label: `Kelas ${t}` }))
    ];
  }, [tingkatList]);

  useEffect(() => {
    if (mode === 'create') {
      getPresetsByJenjang(jenjang)
        .then(res => {
          if (res.success && res.data) {
            let filtered = res.data;
            if (kurikulum === 'K13') {
              filtered = res.data.filter(p => p.category !== 'SENI_PILIHAN');
            } else {
              filtered = res.data.filter(p => p.kode_mapel !== 'SENI');
            }
            setPresets(filtered);
          }
        })
        .catch(err => console.error('Failed to load global mapel presets:', err));
    }
  }, [jenjang, kurikulum, mode]);

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
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
        toast.success(isEditMode ? 'Mata pelajaran berhasil diperbarui' : 'Mata pelajaran berhasil dibuat');
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
          tingkatOptions={tingkatOptions}
          presets={presets}
          setValue={setValue}
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
