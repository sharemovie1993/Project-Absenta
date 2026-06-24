import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { Alert } from '../../ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import { ModalFooter } from '../../ui/Modal';
import { Save, X, RefreshCw } from 'lucide-react';
import { createGuru, updateGuru, getGuruDetail, type CreateGuruPayload, type UpdateGuruPayload } from '../../../api/academic/guru.api';
import { getMapelList, type Mapel } from '../../../api/academic/mapel.api';
import { listGuruMapel, assignGuruMapel, removeGuruMapel } from '../../../api/academic/guru-mapel.api';
import { guruSchema, type GuruFormValues } from '../../../schemas/academic/guru.schema';
import { useToast } from '../../../hooks/useToast';

// Modular Sections
import { PersonalSection } from './form/PersonalSection';
import { EmploymentSection } from './form/EmploymentSection';
import { AssignmentSection } from './form/AssignmentSection';

interface GuruFormProps {
  guruId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
  enableMapelAssignments?: boolean;
}

const STATUS_KEPEGAWAIAN_OPTIONS = [
  { value: 'PNS', label: 'PNS' },
  { value: 'HONORER', label: 'Honorer' },
  { value: 'KONTRAK', label: 'Kontrak' }
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Tidak Aktif' }
];

export const GuruForm = React.memo<GuruFormProps>(({
  guruId,
  onSuccess,
  onCancel,
  mode = 'create',
  enableMapelAssignments = true
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [loadingMapel, setLoadingMapel] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  const [originalMapelIds, setOriginalMapelIds] = useState<string[]>([]);
  const [originalAssignmentIds, setOriginalAssignmentIds] = useState<Map<string, string>>(new Map());

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<GuruFormValues>({
    resolver: zodResolver(guruSchema),
    defaultValues: {
      jenis_kelamin: 'L',
      agama: 'ISLAM',
      status_kepegawaian: 'PNS',
      status: 'ACTIVE',
      pendidikan_terakhir: 'S1',
      no_hp: '',
      mapel_ids: []
    }
  });

  const selectedMapelIds = watch('mapel_ids') || [];

  useEffect(() => {
    if (!enableMapelAssignments) return;
    const loadMapelData = async () => {
      try {
        setLoadingMapel(true);
        const response = await getMapelList();
        setMapelList(response.data || []);
      } catch (error) {
        console.error('Error loading mata pelajaran:', error);
      } finally {
        setLoadingMapel(false);
      }
    };
    loadMapelData();
  }, [enableMapelAssignments]);

  useEffect(() => {
    const loadGuruData = async () => {
      if (!guruId || mode === 'create') return;

      try {
        setLoadingData(true);
        const guru = await getGuruDetail(guruId);
        
        reset({
          nip: guru.nip || '',
          nama: guru.nama_guru || '',
          email: guru.email || '',
          no_hp: guru.no_hp || '',
          alamat: guru.alamat || '',
          tempat_lahir: guru.tempat_lahir || '',
          tanggal_lahir: guru.tanggal_lahir ? guru.tanggal_lahir.split('T')[0] : '',
          jenis_kelamin: (guru.jenis_kelamin as 'L' | 'P') || 'L',
          agama: guru.agama || 'ISLAM',
          status_kepegawaian: (guru.status_kepegawaian as 'PNS' | 'HONORER' | 'KONTRAK') || 'PNS',
          status: (guru as any).User?.status || 'ACTIVE',
          pendidikan_terakhir: guru.pendidikan_terakhir || 'S1',
          rfid_tag: guru.no_rfid || ''
        });
      } catch (error) {
        console.error('Error loading guru data:', error);
        setSubmitError('Gagal memuat data guru');
      } finally {
        setLoadingData(false);
      }
    };

    loadGuruData();
  }, [guruId, mode, reset]);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!enableMapelAssignments || !guruId || mode === 'create') return;
      try {
        setLoadingAssignments(true);
        const res = await listGuruMapel({ guru_id: guruId });
        const assignments = res.data || [];
        const currentIds = assignments.map((gm) => gm.mapel_id);
        
        setOriginalMapelIds(currentIds);
        const idMap = new Map();
        assignments.forEach(gm => idMap.set(gm.mapel_id, gm.id));
        setOriginalAssignmentIds(idMap);

        setValue('mapel_ids', currentIds);
      } catch (error) {
        console.error('Error loading guru-mapel assignments:', error);
      } finally {
        setLoadingAssignments(false);
      }
    };
    loadAssignments();
  }, [enableMapelAssignments, guruId, mode, setValue]);

  const onFormSubmit = async (data: GuruFormValues) => {
    if (isViewMode) return;

    try {
      setLoading(true);
      setSubmitError('');

      if (isEditMode && guruId) {
        const updatePayload: UpdateGuruPayload = {
          nip: data.nip,
          nama_guru: data.nama,
          email: data.email || undefined,
          no_hp: data.no_hp,
          alamat: data.alamat,
          tanggal_lahir: data.tanggal_lahir,
          jenis_kelamin: data.jenis_kelamin,
          agama: data.agama,
          status_kepegawaian: data.status_kepegawaian,
          status: data.status,
          pendidikan_terakhir: data.pendidikan_terakhir,
          no_rfid: data.rfid_tag?.trim() ? data.rfid_tag : undefined
        };
        
        await updateGuru(guruId, updatePayload);

        if (enableMapelAssignments) {
          const currentMapelIds = new Set(data.mapel_ids || []);
          const originalSet = new Set(originalMapelIds);

          for (const mapelId of currentMapelIds) {
            if (!originalSet.has(mapelId)) {
              await assignGuruMapel({ guru_id: guruId, mapel_id: mapelId });
            }
          }

          for (const mapelId of originalSet) {
            if (!currentMapelIds.has(mapelId)) {
              const assignmentId = originalAssignmentIds.get(mapelId);
              if (assignmentId) {
                await removeGuruMapel(assignmentId);
              }
            }
          }
        }
      } else {
        const createPayload: CreateGuruPayload = {
          nip: data.nip || undefined,
          nama_guru: data.nama,
          email: data.email || undefined,
          no_hp: data.no_hp?.trim() ? data.no_hp : '000000000',
          alamat: data.alamat ?? '',
          tanggal_lahir: data.tanggal_lahir?.trim() ? data.tanggal_lahir : '1990-01-01',
          jenis_kelamin: data.jenis_kelamin,
          agama: data.agama || 'ISLAM',
          status_kepegawaian: data.status_kepegawaian,
          pendidikan_terakhir: data.pendidikan_terakhir || 'S1',
          no_rfid: data.rfid_tag?.trim() ? data.rfid_tag : undefined
        };
        
        const created = await createGuru(createPayload);
        const newGuruId = created?.data?.id;
        
        if (enableMapelAssignments && newGuruId && data.mapel_ids && data.mapel_ids.length > 0) {
          for (const mapelId of data.mapel_ids) {
            await assignGuruMapel({ guru_id: newGuruId, mapel_id: mapelId });
          }
        }
      }

      showToast(isEditMode ? 'Data guru berhasil diperbarui' : 'Guru baru berhasil ditambahkan', 'success');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.response?.data?.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} data guru`);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (value: string | undefined, options: { value: string | number, label: string }[]) => {
    if (!value) return '-';
    const found = options.find(o => o.value.toString() === value.toString());
    return found ? found.label : value;
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Loader size="lg" />
        <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sinkronisasi Data Guru...</span>
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
            <TabsTrigger value="kepegawaian" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Kepegawaian</TabsTrigger>
            <TabsTrigger value="penugasan" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Penugasan</TabsTrigger>
          </TabsList>

          <TabsContent value="data-pribadi" className="space-y-6">
            <PersonalSection 
              register={register}
              control={control}
              errors={errors}
              isViewMode={isViewMode}
              watch={watch}
              getLabel={getLabel}
            />
          </TabsContent>

          <TabsContent value="kepegawaian" className="space-y-6">
            <EmploymentSection 
              register={register}
              control={control}
              isViewMode={isViewMode}
              watch={watch}
              getLabel={getLabel}
              statusKepegawaianOptions={STATUS_KEPEGAWAIAN_OPTIONS}
              statusOptions={STATUS_OPTIONS}
            />
          </TabsContent>

          <TabsContent value="penugasan" className="space-y-6">
            <AssignmentSection 
              loadingMapel={loadingMapel}
              loadingAssignments={loadingAssignments}
              mapelList={mapelList}
              selectedMapelIds={selectedMapelIds}
              setValue={setValue}
              isViewMode={isViewMode}
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
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Guru Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </div>
  );
});

GuruForm.displayName = 'GuruForm';

export default GuruForm;
