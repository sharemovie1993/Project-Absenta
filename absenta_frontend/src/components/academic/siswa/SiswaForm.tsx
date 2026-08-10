

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { createSiswa, updateSiswa, getSiswaDetail, type CreateSiswaPayload, type UpdateSiswaPayload, type Siswa, siswaQueryKeys } from '../../../api/academic/siswa.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { studentCardConfigApi } from '../../../api/academic/student-card-config.api';
import { DEFAULT_CONFIG, PAPER_SIZES } from '@/components/academic/student-card/constants';
import { PrintOverlay } from '@/components/academic/student-card/PrintOverlay';
import { useAuthStore } from '../../../store/authStore';
import { getTenantById } from '../../../api/tenants.api';
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
  const queryClient = useQueryClient();


  const [loading, setLoading] = useState(false);
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
      const { user } = useAuthStore.getState();
      
      const [sekolahRes, configRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        studentCardConfigApi.getConfig().catch(() => null)
      ]);

      let tenantInfo = null;
      if (user?.tenant_id) {
        try {
          const tenantRes = await getTenantById(user.tenant_id);
          tenantInfo = tenantRes?.data || tenantRes || null;
        } catch (err) {
          console.error('Failed to fetch tenant info for print:', err);
        }
      }
      
      let parsedConfig = DEFAULT_CONFIG;
      if (configRes) {
        let savedSiswaConfig = null;
        if (configRes.layout_presets) {
          try {
            const presets = JSON.parse(configRes.layout_presets);
            if (presets.siswa_active_config) {
              savedSiswaConfig = presets.siswa_active_config;
            }
          } catch (e) {
            console.error('Failed to parse siswa active config:', e);
          }
        }

        if (savedSiswaConfig) {
          parsedConfig = {
            ...DEFAULT_CONFIG,
            ...configRes,
            ...savedSiswaConfig,
          };
        } else {
          parsedConfig = {
            ...DEFAULT_CONFIG,
            ...configRes,
          };
        }
      }

      // Merge tenantInfo & sekolahProfile metadata (consistent with StudentCardPage)
      const sekolahData = sekolahRes?.data || sekolahRes || null;
      const resolvedName: string    = (tenantInfo as any)?.name    || sekolahData?.nama    || '';
      const resolvedAddress: string = (tenantInfo as any)?.address || sekolahData?.alamat  || '';
      const resolvedLogo: string    = (tenantInfo as any)?.logo_url || sekolahData?.logo_url || '';
      const resolvedHeader: string  = (tenantInfo as any)?.nama_dinas_atas   || '';
      const resolvedSubheader: string = (tenantInfo as any)?.nama_dinas_bawah || '';

      const resolvedKepsek = sekolahData?.kepala_sekolah || '';
      const resolvedNipKepsek = sekolahData?.nip_kepala || '';

      const finalKepsek = resolvedKepsek || 
        (parsedConfig.back_principal_name === 'Nama Kepala Sekolah, M.Pd' ? '' : parsedConfig.back_principal_name) || 
        'Nama Kepala Sekolah, M.Pd';
      
      const finalNip = resolvedNipKepsek || 
        (parsedConfig.back_principal_nip === 'NIP. 198001012005011001' ? '' : parsedConfig.back_principal_nip) || 
        'NIP. 198001012005011001';

      const configObj = {
        ...parsedConfig,
        school_name: resolvedName || parsedConfig.school_name || '',
        school_address: resolvedAddress || parsedConfig.school_address || '',
        logo_url: resolvedLogo || parsedConfig.logo_url || '',
        header_text: resolvedHeader || parsedConfig.header_text || '',
        subheader_text: resolvedSubheader || parsedConfig.subheader_text || '',
        back_signature_title: parsedConfig.back_signature_title || 'Kepala Sekolah',
        back_principal_name: finalKepsek,
        back_principal_nip: finalNip,
        back_stamp_image_url: parsedConfig.back_stamp_image_url || resolvedLogo || undefined,
      };

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
      
      const paperW = prConfig.paperSize === 'Custom' ? (prConfig.customWidth || 210) : PAPER_SIZES[prConfig.paperSize as keyof typeof PAPER_SIZES]?.width || 210;
      const paperH = prConfig.paperSize === 'Custom' ? (prConfig.customHeight || 297) : PAPER_SIZES[prConfig.paperSize as keyof typeof PAPER_SIZES]?.height || 297;

      const baseW = Math.min(paperW, paperH);
      const baseH = Math.max(paperW, paperH);

      const finalW = prConfig.orientation === 'portrait' ? baseW : baseH;
      const finalH = prConfig.orientation === 'portrait' ? baseH : baseW;

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

  // ── useQuery: Dropdown Options ───────────────────────────────────────────
  const { data: kelasData, isLoading: loadingKelas } = useQuery({
    queryKey: ['kelas-dropdown'],
    queryFn: getKelasForDropdown,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tahunData, isLoading: loadingTahun } = useQuery({
    queryKey: ['tahun-pelajaran-dropdown'],
    queryFn: getTahunPelajaranForDropdown,
    staleTime: 10 * 60 * 1000,
  });

  const { data: semesterData } = useQuery({
    queryKey: ['semester-dropdown', watchTahunPelajaran],
    queryFn: () => getSemesterByTahunPelajaranForDropdown(watchTahunPelajaran!),
    enabled: !!watchTahunPelajaran,
    staleTime: 10 * 60 * 1000,
  });

  const kelasOptions = kelasData || [];
  const tahunPelajaranOptions = tahunData || [];
  const semesterOptions = semesterData || [];
  const loadingDropdowns = loadingKelas || loadingTahun;

  // ── useQuery: Fetch detail data ──────────────────────────────────────────
  const { data: fetchedSiswa, isLoading: loadingData } = useQuery({
    queryKey: siswaQueryKeys.detail(siswaId || ''),
    queryFn: () => getSiswaDetail(siswaId!),
    enabled: !!siswaId && mode !== 'create',
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (fetchedSiswa) {
      setSiswaData(fetchedSiswa);
      reset({
        nis: fetchedSiswa.nis || '',
        nama_siswa: fetchedSiswa.nama_siswa || '',
        email: fetchedSiswa.User?.email || '',
        no_hp: fetchedSiswa.no_hp || '',
        alamat: fetchedSiswa.alamat || '',
        dusun: (fetchedSiswa as any).dusun || '',
        rt: (fetchedSiswa as any).rt || '',
        rw: (fetchedSiswa as any).rw || '',
        kelurahan: (fetchedSiswa as any).kelurahan || '',
        kecamatan: (fetchedSiswa as any).kecamatan || '',
        kabupaten: (fetchedSiswa as any).kabupaten || '',
        provinsi: (fetchedSiswa as any).provinsi || '',
        kode_pos: (fetchedSiswa as any).kode_pos || '',
        lintang: (fetchedSiswa as any).lintang || '',
        bujur: (fetchedSiswa as any).bujur || '',
        koordinat: (fetchedSiswa as any).koordinat || '',
        sekolah_asal: (fetchedSiswa as any).sekolah_asal || '',
        no_ijazah_smp: (fetchedSiswa as any).no_ijazah_smp || '',
        tanggal_lahir: fetchedSiswa.tanggal_lahir ? fetchedSiswa.tanggal_lahir.split('T')[0] : '',
        tempat_lahir: fetchedSiswa.tempat_lahir || '',
        jenis_kelamin: (fetchedSiswa.jenis_kelamin as 'L' | 'P') || 'L',
        kelas_id: fetchedSiswa.kelas_id || '',
        tahun_pelajaran_id: fetchedSiswa.tahun_pelajaran_id || '',
        semester_id: fetchedSiswa.semester_id || '',
        status: (fetchedSiswa.status as any) || 'AKTIF',
        tanggal_keluar: fetchedSiswa.tanggal_keluar ? fetchedSiswa.tanggal_keluar.split('T')[0] : '',
        alasan_keluar: fetchedSiswa.alasan_keluar || '',
        transportasi: fetchedSiswa.transportasi || '',
        no_rfid: fetchedSiswa.no_rfid || '',
        nisn: fetchedSiswa.nisn || '',
        nik: fetchedSiswa.nik || '',
        tinggi_badan: fetchedSiswa.tinggi_badan ?? '',
        berat_badan: fetchedSiswa.berat_badan ?? '',
        foto: fetchedSiswa.foto || '',
        nama_ayah: fetchedSiswa.nama_ayah || '',
        nik_ayah: (fetchedSiswa as any).nik_ayah || '',
        no_hp_ayah: (fetchedSiswa as any).no_hp_ayah || '',
        pekerjaan_ayah: fetchedSiswa.pekerjaan_ayah || '',
        pendidikan_ayah: fetchedSiswa.pendidikan_ayah || '',
        penghasilan_ayah: fetchedSiswa.penghasilan_ayah || '',
        nama_ibu: fetchedSiswa.nama_ibu || '',
        nik_ibu: (fetchedSiswa as any).nik_ibu || '',
        no_hp_ibu: (fetchedSiswa as any).no_hp_ibu || '',
        pekerjaan_ibu: fetchedSiswa.pekerjaan_ibu || '',
        pendidikan_ibu: fetchedSiswa.pendidikan_ibu || '',
        penghasilan_ibu: fetchedSiswa.penghasilan_ibu || '',
        nama_wali: fetchedSiswa.nama_wali || '',
        nik_wali: (fetchedSiswa as any).nik_wali || '',
        no_hp_wali: (fetchedSiswa as any).no_hp_wali || '',
        hubungan_wali: fetchedSiswa.hubungan_wali || '',
        pekerjaan_wali: fetchedSiswa.pekerjaan_wali || '',
        penghasilan_wali: fetchedSiswa.penghasilan_wali || '',
        no_hp_ortu: (fetchedSiswa as any).no_hp_ortu || '',
        orang_tua: ((fetchedSiswa as any).OrangTua || []).map((o: any) => ({
          id: o.id,
          nama: o.nama || '',
          hubungan: o.hubungan || '',
          no_hp: o.no_hp || '',
          email: o.email || '',
          nik: o.nik || ''
        })) || []
      });
    }
  }, [fetchedSiswa, reset]);

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

      // Client-side cache invalidation for dropdowns, stats, and roster lists
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['siswa-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['classmates-roster-list'] });

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


