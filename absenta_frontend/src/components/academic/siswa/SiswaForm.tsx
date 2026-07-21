

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { cn } from '../../../lib/utils';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { Alert } from '../../ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import { ModalFooter } from '../../ui/Modal';
import { Save, X, RefreshCw, Printer, Users } from 'lucide-react';
import { createSiswa, updateSiswa, getSiswaDetail, type CreateSiswaPayload, type UpdateSiswaPayload, type Siswa } from '../../../api/academic/siswa.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { studentCardConfigApi } from '../../../api/academic/student-card-config.api';
import { DEFAULT_CONFIG, PAPER_SIZES } from '@/components/academic/student-card/constants';
import { PrintOverlay } from '@/pages/academic/student-card/components/PrintOverlay';
import { SiswaTimelineAndExitTab } from './SiswaTimelineAndExitTab';
import {
  getKelasForDropdown,
  getTahunPelajaranForDropdown,
  getSemesterByTahunPelajaranForDropdown,
  type DropdownOption
} from '../../../api/dropdown.api';
import { siswaSchema, type SiswaFormValues } from '../../../schemas/academic/siswa.schema';
import toast from 'react-hot-toast';

// Modular Sections
import { PersonalSection } from './form/PersonalSection';
import { AcademicSection } from './form/AcademicSection';
import { GuardianSection } from './form/GuardianSection';

// Lazy loaded Document Panel
const SiswaDocsPanel = lazy(() => import('./SiswaDocsPanel').then(module => ({ default: module.SiswaDocsPanel })));

interface SiswaFormProps {
  siswaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const SiswaForm: React.FC<SiswaFormProps> = React.memo(({
  siswaId,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';


  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [siswaData, setSiswaData] = useState<Siswa | null>(null);

  const [printingCard, setPrintingCard] = useState(false);
  const [printOverlayData, setPrintOverlayData] = useState<{
    config: any;
    printConfig: any;
    printLayout: any;
    sekolah: any;
  } | null>(null);

  const handlePrintStudentCard = async () => {
    if (!siswaId || !siswaData) return;
    try {
      setPrintingCard(true);
      const [sekolahRes, configRes] = await Promise.all([
        sekolahApi.getProfile(),
        studentCardConfigApi.getConfig()
      ]);
      
      let parsedConfig = DEFAULT_CONFIG;
      if (configRes) {
        parsedConfig = { ...DEFAULT_CONFIG, ...configRes };
        if (configRes.layout_presets) {
          try {
            const presets = JSON.parse(configRes.layout_presets);
            if (presets.siswa_active_config) {
              parsedConfig = {
                ...DEFAULT_CONFIG,
                ...presets.siswa_active_config,
              };
            }
          } catch (e) {
            console.error('Failed to parse siswa active config:', e);
          }
        }
      }
      const configObj = parsedConfig;
      const sekolahObj = sekolahRes || { nama: '', alamat: '' };
      
      const isRfid = configObj.print_paper_size === 'RFID';
      const prConfig = {
        paperSize: (configObj.print_paper_size as any) || 'A4',
        orientation: isRfid ? (configObj.template === 'horizontal' ? 'landscape' : 'portrait') : ((configObj.print_orientation as any) || 'portrait'),
        marginTop: isRfid ? 0 : (configObj.print_margin_top ?? 10),
        marginBottom: isRfid ? 0 : (configObj.print_margin_bottom ?? 10),
        marginLeft: isRfid ? 0 : (configObj.print_margin_left ?? 10),
        marginRight: isRfid ? 0 : (configObj.print_margin_right ?? 10),
        gapX: isRfid ? 0 : (configObj.print_gap_x ?? 5),
        gapY: isRfid ? 0 : (configObj.print_gap_y ?? 5),
        customWidth: configObj.print_custom_width ?? 210,
        customHeight: configObj.print_custom_height ?? 297,
        autoCenterX: isRfid ? false : (configObj.print_auto_center_x ?? false),
        autoCenterY: isRfid ? false : (configObj.print_auto_center_y ?? false),
      };
      
      const paperW = prConfig.paperSize === 'Custom' ? (prConfig.customWidth || 210) : PAPER_SIZES[prConfig.paperSize].width;
      const paperH = prConfig.paperSize === 'Custom' ? (prConfig.customHeight || 297) : PAPER_SIZES[prConfig.paperSize].height;

      const finalW = prConfig.orientation === 'portrait' ? paperW : paperH;
      const finalH = prConfig.orientation === 'portrait' ? paperH : paperW;

      const cardW = configObj.template === 'vertical' ? 54 : 85.6;
      const cardH = configObj.template === 'vertical' ? 85.6 : 54;

      const availW = finalW - prConfig.marginLeft - prConfig.marginRight;
      const availH = finalH - prConfig.marginTop - prConfig.marginBottom;

      const cols = Math.max(1, Math.floor((availW + prConfig.gapX) / (cardW + prConfig.gapX)));
      const rows = Math.max(1, Math.floor((availH + prConfig.gapY) / (cardH + prConfig.gapY)));

      const contentW = cols * cardW + (cols - 1) * prConfig.gapX;
      const contentH = rows * cardH + (rows - 1) * prConfig.gapY;

      let effectiveMarginLeft = prConfig.marginLeft;
      let effectiveMarginTop = prConfig.marginTop;

      if (prConfig.autoCenterX) {
          effectiveMarginLeft = (finalW - contentW) / 2;
      }

      if (prConfig.autoCenterY) {
          effectiveMarginTop = (finalH - contentH) / 2;
      }

      const itemsPerPage = cols * rows;

      const printLayout = { finalW, finalH, cardW, cardH, cols, rows, itemsPerPage, effectiveMarginLeft, effectiveMarginTop };
      
      setPrintOverlayData({
        config: configObj,
        printConfig: prConfig,
        printLayout,
        sekolah: sekolahObj
      });
      
      setTimeout(() => {
        window.print();
        setPrintingCard(false);
        setPrintOverlayData(null);
      }, 600);
      
    } catch (err: any) {
      console.error('Failed to print student card:', err);
      toast.error('Gagal memuat konfigurasi cetak kartu');
      setPrintingCard(false);
    }
  };
  
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
      orang_tua: [],
      foto: ''
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
        setSiswaData(siswa);

        reset({
          nis: siswa.nis || '',
          nama_siswa: siswa.nama_siswa || '',
          email: siswa.User?.email || '',
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
          foto: siswa.foto || '',
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
          orang_tua: ((siswa as any).OrangTua || []).map((o: any) => ({
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

  const onFormSubmit = useCallback(async (data: SiswaFormValues) => {
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
        orang_tua: (data.orang_tua || []).filter(o => o.nama.trim()).map(o => ({
            ...o,
            email: o.email || undefined
        }))
      };

      if (isEditMode && siswaId) {
        await updateSiswa(siswaId, payload as UpdateSiswaPayload);
      } else {
        await createSiswa(payload as CreateSiswaPayload);
      }

      toast.success(isEditMode ? 'Data siswa berhasil diperbarui' : 'Siswa baru berhasil ditambahkan');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.response?.data?.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} data siswa`);
    } finally {
      setLoading(false);
    }
  }, [isViewMode, isEditMode, siswaId, onSuccess]);

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

        {isViewMode && siswaData && (
          <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Aksi Cepat Siswa</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 font-bold uppercase tracking-tighter">Proses data & cetak kartu pelajar siswa secara instan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={handlePrintStudentCard}
                disabled={printingCard}
                className="hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl"
              >
                {printingCard ? (
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5 mr-2" />
                )}
                Cetak Kartu Siswa
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="data-pribadi" className="w-full">
          <TabsList className={cn(
            'grid w-full mb-8 h-14 p-2 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50',
            (siswaId && isViewMode) ? 'grid-cols-5' : (siswaId || isViewMode) ? 'grid-cols-4' : 'grid-cols-3'
          )}>
            <TabsTrigger value="data-pribadi" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Data Pribadi</TabsTrigger>
            <TabsTrigger value="akademik" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Akademik</TabsTrigger>
            <TabsTrigger value="orang-tua" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Orang Tua & Wali</TabsTrigger>
            {isViewMode && (
              <TabsTrigger value="linimasa-keluar" className="text-[10px] font-black uppercase tracking-widest h-full rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 transition-all duration-300">Linimasa & Keluar</TabsTrigger>
            )}
            {siswaId && (
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
              siswaId={siswaId}
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

          {isViewMode && siswaData && (
            <TabsContent value="linimasa-keluar" className="space-y-6">
              <SiswaTimelineAndExitTab siswa={siswaData} />
            </TabsContent>
          )}

          {siswaId && (
            <TabsContent value="berkas" className="space-y-6">
              <Suspense fallback={<div className="h-40 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                <SiswaDocsPanel
                  siswaId={siswaId}
                  siswaName={siswaData?.nama_siswa}
                  nis={siswaData?.nis}
                  nisn={siswaData?.nisn}
                  mode="full"
                />
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
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Siswa Baru'}
            </Button>
          )}
        </ModalFooter>
      </form>

      {printOverlayData && (
        <PrintOverlay
          isPrinting={printingCard}
          pages={[[siswaData]]}
          printLayout={printOverlayData.printLayout}
          printConfig={printOverlayData.printConfig}
          config={printOverlayData.config}
          sekolah={printOverlayData.sekolah}
        />
      )}
    </div>
  );
});

SiswaForm.displayName = 'SiswaForm';
export default SiswaForm;


