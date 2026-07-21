import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { Alert } from '../../ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import { ModalFooter } from '../../ui/Modal';
import { Save, X, RefreshCw, Printer, Users } from 'lucide-react';

const GuruDocsPanel = lazy(() => import('./GuruDocsPanel').then(module => ({ default: module.GuruDocsPanel })));
import { createGuru, updateGuru, getGuruDetail, type CreateGuruPayload, type UpdateGuruPayload } from '../../../api/academic/guru.api';
import { getMapelList, type Mapel } from '../../../api/academic/mapel.api';
import { listGuruMapel, assignGuruMapel, removeGuruMapel } from '../../../api/kurikulum/guru-mapel.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { studentCardConfigApi } from '../../../api/academic/student-card-config.api';
import { DEFAULT_GURU_CONFIG, PAPER_SIZES } from '@/components/academic/student-card/constants';
import { PrintOverlay } from '@/pages/academic/student-card/components/PrintOverlay';
import { guruSchema, type GuruFormValues } from '../../../schemas/academic/guru.schema';
import type { Guru } from '../../../types/academic';
import toast from 'react-hot-toast';

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

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [loadingMapel, setLoadingMapel] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [guruData, setGuruData] = useState<Guru | null>(null);

  const [printingCard, setPrintingCard] = useState(false);
  const [printOverlayData, setPrintOverlayData] = useState<{
    config: any;
    printConfig: any;
    printLayout: any;
    sekolah: any;
    person: any;
  } | null>(null);

  const handlePrintGuruCard = async () => {
    try {
      setPrintingCard(true);
      
      const currentValues = watch();
      let targetGuru: any = guruData;
      
      if (!targetGuru && guruId) {
        try {
          targetGuru = await getGuruDetail(guruId);
          setGuruData(targetGuru);
        } catch (e) {
          console.error('Failed to fetch guru detail for printing:', e);
        }
      }
      
      if (!targetGuru) {
        targetGuru = {
          id: guruId || 'temp-id',
          nama_guru: currentValues.nama || 'Nama Guru',
          nip: currentValues.nip || null,
          jenis_ptk: currentValues.jenis_ptk || 'PENDIDIK',
          status_kepegawaian: currentValues.status_kepegawaian || 'PNS',
          foto: currentValues.foto || null,
          no_hp: currentValues.no_hp || '',
          email: currentValues.email || ''
        };
      }

      const [sekolahRes, configRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        studentCardConfigApi.getConfig().catch(() => null)
      ]);
      
       // Maintain distinct Executive Pegawai / Guru design preset for Guru cards!
      const baseConfig = configRes || DEFAULT_GURU_CONFIG;
      let parsedGuruConfig = DEFAULT_GURU_CONFIG;
      if (configRes && configRes.layout_presets) {
        try {
          const presets = JSON.parse(configRes.layout_presets);
          if (presets.guru_active_config) {
            parsedGuruConfig = {
              ...DEFAULT_GURU_CONFIG,
              ...presets.guru_active_config,
            };
          }
        } catch (e) {
          console.error('Failed to parse guru active config:', e);
        }
      }

      const guruConfigObj: StudentCardConfig = {
        ...parsedGuruConfig,
        card_title: 'KARTU PEGAWAI',
        school_name: (sekolahRes as any)?.nama || baseConfig.school_name || '',
        school_address: (sekolahRes as any)?.alamat || baseConfig.school_address || '',
        header_text: baseConfig.header_text || 'PEMERINTAH KABUPATEN',
        subheader_text: baseConfig.subheader_text || 'DINAS PENDIDIKAN',
        logo_url: (sekolahRes as any)?.logo_url || baseConfig.logo_url || '',
        print_paper_size: baseConfig.print_paper_size,
        print_orientation: baseConfig.print_orientation,
        print_margin_top: baseConfig.print_margin_top,
        print_margin_bottom: baseConfig.print_margin_bottom,
        print_margin_left: baseConfig.print_margin_left,
        print_margin_right: baseConfig.print_margin_right,
        print_gap_x: baseConfig.print_gap_x,
        print_gap_y: baseConfig.print_gap_y
      };
      
      const isRfid = guruConfigObj.print_paper_size === 'RFID';
      const prConfig = {
        paperSize: (guruConfigObj.print_paper_size as any) || 'A4',
        orientation: isRfid ? (guruConfigObj.template === 'horizontal' ? 'landscape' : 'portrait') : ((guruConfigObj.print_orientation as any) || 'portrait'),
        marginTop: isRfid ? 0 : (guruConfigObj.print_margin_top ?? 10),
        marginBottom: isRfid ? 0 : (guruConfigObj.print_margin_bottom ?? 10),
        marginLeft: isRfid ? 0 : (guruConfigObj.print_margin_left ?? 10),
        marginRight: isRfid ? 0 : (guruConfigObj.print_margin_right ?? 10),
        gapX: isRfid ? 0 : (guruConfigObj.print_gap_x ?? 5),
        gapY: isRfid ? 0 : (guruConfigObj.print_gap_y ?? 5),
        customWidth: guruConfigObj.print_custom_width ?? 210,
        customHeight: guruConfigObj.print_custom_height ?? 297,
        autoCenterX: isRfid ? false : (guruConfigObj.print_auto_center_x ?? false),
        autoCenterY: isRfid ? false : (guruConfigObj.print_auto_center_y ?? false),
      };
      
      const baseW = Math.min(paperW, paperH);
      const baseH = Math.max(paperW, paperH);

      const finalW = prConfig.orientation === 'portrait' ? baseW : baseH;
      const finalH = prConfig.orientation === 'portrait' ? baseH : baseW;

      const cardW = guruConfigObj.template === 'vertical' ? 54 : 85.6;
      const cardH = guruConfigObj.template === 'vertical' ? 85.6 : 54;

      const availW = finalW - prConfig.marginLeft - prConfig.marginRight;
      const availH = finalH - prConfig.marginTop - prConfig.marginBottom;

      const cols = isRfid ? 1 : Math.max(1, Math.floor((availW + prConfig.gapX) / (cardW + prConfig.gapX)));
      const rows = isRfid ? 1 : Math.max(1, Math.floor((availH + prConfig.gapY) / (cardH + prConfig.gapY)));

      const totalGridW = cols * cardW + (cols - 1) * prConfig.gapX;
      const totalGridH = rows * cardH + (rows - 1) * prConfig.gapY;

      const effectiveMarginLeft = (prConfig.autoCenterX && !isRfid) ? (finalW - totalGridW) / 2 : prConfig.marginLeft;
      const effectiveMarginTop  = (prConfig.autoCenterY && !isRfid) ? (finalH - totalGridH) / 2 : prConfig.marginTop;

      const layoutObj = {
        finalW,
        finalH,
        cols,
        rows,
        cardW,
        cardH,
        effectiveMarginLeft,
        effectiveMarginTop
      };

      setPrintOverlayData({
        config: guruConfigObj,
        printConfig: prConfig,
        printLayout: layoutObj,
        sekolah: sekolahRes || { nama: '', alamat: '' },
        pages: [[targetGuru]]
      });

      setTimeout(() => {
        window.print();
        setPrintingCard(false);
      }, 500);

    } catch (err: any) {
      console.error('Failed to print guru card:', err);
      toast.error('Gagal memuat konfigurasi cetak kartu');
      setPrintingCard(false);
    }
  };
  
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
      jenis_ptk: 'PENDIDIK',
      no_hp: '',
      foto: '',
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
        setGuruData(guru);
        
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
          rfid_tag: guru.no_rfid || '',
          max_jp: (guru as any).max_jp || '',
          jenis_ptk: guru.jenis_ptk || 'PENDIDIK',
          foto: guru.foto || ''
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
        console.error('Error loading guru mapel assignments:', error);
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
          nip: data.nip || undefined,
          nama_guru: data.nama,
          email: data.email || undefined,
          no_hp: data.no_hp?.trim() ? data.no_hp : undefined,
          alamat: data.alamat,
          tanggal_lahir: data.tanggal_lahir?.trim() ? data.tanggal_lahir : undefined,
          jenis_kelamin: data.jenis_kelamin,
          agama: data.agama,
          status_kepegawaian: data.status_kepegawaian,
          pendidikan_terakhir: data.pendidikan_terakhir,
          no_rfid: data.rfid_tag?.trim() ? data.rfid_tag : undefined,
          max_jp: data.max_jp === '' ? undefined : Number(data.max_jp),
          jenis_ptk: data.jenis_ptk || 'PENDIDIK',
          foto: data.foto || undefined
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
          no_rfid: data.rfid_tag?.trim() ? data.rfid_tag : undefined,
          max_jp: data.max_jp === '' ? undefined : Number(data.max_jp),
          jenis_ptk: data.jenis_ptk || 'PENDIDIK',
          foto: data.foto || undefined
        };
        
        const created = await createGuru(createPayload);
        const newGuruId = created?.data?.id;
        
        if (enableMapelAssignments && newGuruId && data.mapel_ids && data.mapel_ids.length > 0) {
          for (const mapelId of data.mapel_ids) {
            await assignGuruMapel({ guru_id: newGuruId, mapel_id: mapelId });
          }
        }
      }

      toast.success(isEditMode ? 'Data guru berhasil diperbarui' : 'Guru baru berhasil ditambahkan');
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

        {isViewMode && (
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Aksi Cepat Pegawai / Guru</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold uppercase tracking-tighter">Proses data & cetak kartu identitas pegawai/guru secara instan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={handlePrintGuruCard}
                disabled={printingCard}
                className="hover:border-indigo-200 dark:hover:border-indigo-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 rounded-xl"
              >
                {printingCard ? (
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                ) : (
                  <Printer size={14} className="mr-2" />
                )}
                Cetak Kartu Pegawai
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="data-pribadi" className="w-full">
          <TabsList className={cn(
            'grid w-full mb-8 h-14 p-2 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50',
            guruId ? 'grid-cols-4' : 'grid-cols-3'
          )}>
            <TabsTrigger value="data-pribadi" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Data Pribadi</TabsTrigger>
            <TabsTrigger value="kepegawaian" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Kepegawaian</TabsTrigger>
            <TabsTrigger value="penugasan" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Penugasan</TabsTrigger>
            {guruId && (
              <TabsTrigger value="berkas" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Berkas</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="data-pribadi" className="space-y-6">
            <PersonalSection 
              register={register}
              control={control}
              errors={errors}
              isViewMode={isViewMode}
              watch={watch}
              setValue={setValue}
              guruId={guruId}
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

          {guruId && (
            <TabsContent value="berkas" className="space-y-6">
              <Suspense fallback={<div className="h-40 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                <GuruDocsPanel guruId={guruId} guruName={watch('nama')} mode="full" />
              </Suspense>
            </TabsContent>
          )}
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

      {printOverlayData && (
        <PrintOverlay
          isPrinting={true}
          config={printOverlayData.config}
          printConfig={printOverlayData.printConfig}
          printLayout={printOverlayData.printLayout}
          sekolah={printOverlayData.sekolah}
          pages={printOverlayData.pages}
        />
      )}
    </div>
  );
});

GuruForm.displayName = 'GuruForm';

export default GuruForm;
