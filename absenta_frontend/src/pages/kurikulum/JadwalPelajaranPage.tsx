import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '../../hooks/useCapabilities';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useGerbangModeAndRole } from '../../hooks/attendance/useGerbangModeAndRole';
import { 
  Loader,
  Button,
  SectionCard,
  Badge
} from '../../components/ui';
import { 
  FileStack, 
  Clock,
  LayoutGrid,
  List,
  Printer,
  Paintbrush,
  Sparkles,
  Trash2,
  Users,
  FileUp
} from 'lucide-react';
import { AutoJadwalWizardModal } from '../../components/kurikulum/AutoJadwalWizardModal';
import { BebanGuruSummaryModal } from '../../components/kurikulum/jadwal-builder/BebanGuruSummaryModal';
import { AscImportWizardModal } from '../../components/kurikulum/jadwal-builder/AscImportWizardModal';
import { JadwalBuiltInPdfPreview } from '../../components/kurikulum/jadwal-builder/JadwalBuiltInPdfPreview';
import { useGuruOptions, useMapelOptions, useKelasOptions } from '../../components/common';
import { useUnifiedScheduleData } from '../../hooks/attendance/useUnifiedScheduleData';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { getJadwalKBM, deleteJadwalKBM, clearJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { getTahunPelajaranList } from '../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../api/academic/semester.api';
import { LogService } from '../../utils/LogService';
import useConfirm from '../../hooks/useConfirm';
import { toast } from 'react-hot-toast';

// Built-in PDF and API Imports
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getMyTenant } from '../../api/tenants.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { getStrukturList } from '../../api/academic/strukturOrganisasi.api';
import { getBase64ImageFromUrl } from '../../utils/cooperative/coopDocUtils';
import { jenisKegiatanMasterApi } from '../../api/academic/jenisKegiatanMaster.api';
import { getKelasList } from '../../api/academic/kelas.api';
import { getGuruList } from '../../api/academic/guru.api';
import { piketGuruApi } from '../../api/piketGuru.api';
import { getJadwalKegiatan } from '../../api/attendance/jadwalKegiatan.api';
import { isRoutineKesiswaanActivity } from '../../hooks/attendance/useJadwalKegiatan';
import { useJenisKegiatanMaster } from '../../hooks/academic/useJenisKegiatanMaster';

// ── Pillar 5: Lazy Loading ──────────────────────────────────────────────────
const JadwalGrid = lazy(() => import('../../components/kurikulum/JadwalGrid').then(m => ({ default: m.JadwalGrid })));
const JadwalBuilder = lazy(() => import('../../components/kurikulum/JadwalBuilder'));
const CetakBerkasKurikulumPage = lazy(() => import('./CetakBerkasKurikulumPage').then(m => ({ default: m.CetakBerkasKurikulumPage })));

const hardeningModuleKey = 'jadwal_pelajaran_page';

export default function JadwalPelajaranPage() {
  const queryClient = useQueryClient();
  const { user, subscription } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();

  const { isKurikulum, isWaliKelas, isAdmin, can } = useCapabilities();

  // ── 1. Role & Capability Detection ──────────────────────────────────────────
  const isSiswa = !!user?.isStudent;
  const isGuru = !!user?.isTeacher;
  const myGuruId = user?.guru_profile?.id;
  const myKelasId = (user?.guru_profile as { wali_kelas_di?: { id: string } })?.wali_kelas_di?.id;

  const canManage = isAdmin || isKurikulum || can('academic.schedules.create') || can('academic.schedules.update') || can('academic.schedules.delete') ||
                    can('attendance.schedules.create') || can('attendance.schedules.update') || can('attendance.schedules.delete');
  
  // ── 2. View State Logic ─────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'builder' | 'preview'>('grid');

  // ── 3. Shared Data State (for Grid View) ────────────────────────────────────
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(searchParams.get('kelas_id') || '');
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [autoWizardOpen, setAutoWizardOpen] = useState(false);
  const [bebanModalOpen, setBebanModalOpen] = useState(false);
  const [ascWizardOpen, setAscWizardOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(searchParams.get('guru_id') || (isGuru ? (myGuruId || '') : ''));

  const { allJadwal: unifiedAllJadwal } = useUnifiedScheduleData({
    tahunPelajaranId: selectedTahunId,
    semesterId: selectedSemesterId,
  });

  // ── Print Preview Isolated Context State ──
  const [previewPrintType, setPreviewPrintType] = useState<'roster' | 'roster_teacher'>('roster');
  const [previewTargetClassId, setPreviewTargetClassId] = useState<string>('');
  const [previewTargetGuruId, setPreviewTargetGuruId] = useState<string>('');

  const triggerPrintPreview = useCallback((printType?: 'roster' | 'roster_teacher', targetId?: string) => {
    let type: 'roster' | 'roster_teacher' = printType || 'roster';
    
    const activeGuruId = (printType === 'roster_teacher' && targetId) ? targetId : selectedGuruId;
    const activeKelasId = (printType === 'roster' && targetId) ? targetId : selectedKelasId;

    if (!printType) {
      if (activeGuruId && !selectedKelasId) {
        type = 'roster_teacher';
      } else if (selectedKelasId && !activeGuruId) {
        type = 'roster';
      } else {
        type = activeGuruId ? 'roster_teacher' : 'roster';
      }
    }

    // Invalidate schedule queries so Cetak Berkas preview fetches fresh painted schedule data instantly
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });

    setPreviewPrintType(type);
    if (type === 'roster_teacher') {
      setPreviewTargetGuruId(activeGuruId || '');
      setPreviewTargetClassId(''); // Strips class context strictly
    } else {
      setPreviewTargetClassId(activeKelasId || '');
      setPreviewTargetGuruId(''); // Strips teacher context strictly
    }
    setViewMode('preview');
  }, [selectedGuruId, selectedKelasId, queryClient]);

  const { rawList: kelasRawList } = useKelasOptions();
  const { rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { rawList: mapelRawList } = useMapelOptions();
  const { rawList: jenisMasterRawList } = useJenisKegiatanMaster();
  const { data: sekolahProfileRes } = useQuery({
    queryKey: ['sekolah-profile-preview'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  // Logic: Auto-switch filters based on View Mode for Dual-Role (Guru + Walas)
  useEffect(() => {
    if (isGuru && isWaliKelas) {
      if (viewMode === 'grid') {
        setSelectedGuruId(myGuruId || '');
        setSelectedKelasId('');
      } else {
        setSelectedKelasId(myKelasId || '');
        setSelectedGuruId('');
      }
    }
  }, [viewMode, isGuru, isWaliKelas, myGuruId, myKelasId]);

  // Security Lock: Ensure non-canManage users cannot access builder mode & Siswa cannot access preview
  useEffect(() => {
    if (!canManage && viewMode === 'builder') {
      setViewMode('grid');
    }
    if (isSiswa && viewMode === 'preview') {
      setViewMode('grid');
    }
  }, [canManage, isSiswa, viewMode]);

  const { absensiMode, managedKelasIds } = useGerbangModeAndRole({
    user,
    tenantId: user?.tenant_id,
  });

  // For SISWA PETUGAS_KELAS: inject their managed kelas as default if no kelas_id in URL
  const defaultKelasId = useMemo(() => {
    if (isSiswa && managedKelasIds && managedKelasIds.length > 0 && !selectedKelasId) {
      return managedKelasIds[0];
    }
    return selectedKelasId;
  }, [isSiswa, managedKelasIds, selectedKelasId]);

  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = false; // Completely unlocked - free under Kurikulum module

  // ── useQuery: Academic Context (Active Tahun & Semester) ──────────────────
  const { data: activeTpRes } = useQuery({
    queryKey: ['active-tahun-pelajaran'],
    queryFn: () => getTahunPelajaranList(1, 10).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const activeTp = activeTpRes?.data?.find((t: { is_active?: boolean }) => t.is_active) || activeTpRes?.data?.[0];

  useEffect(() => {
    if (activeTp?.id && !selectedTahunId) {
      setSelectedTahunId(activeTp.id);
    }
  }, [activeTp, selectedTahunId]);

  const { data: activeSemRes } = useQuery({
    queryKey: ['active-semester', selectedTahunId],
    queryFn: () => selectedTahunId ? getSemesterList(1, 10, '', selectedTahunId).catch(() => null) : null,
    enabled: !!selectedTahunId,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (activeSemRes?.data && !selectedSemesterId) {
      const activeSem = activeSemRes.data.find((s: { is_active?: boolean }) => s.is_active) || activeSemRes.data[0];
      if (activeSem) setSelectedSemesterId(activeSem.id);
    }
  }, [activeSemRes, selectedSemesterId]);

  useEffect(() => {
    if (isGuru && !selectedGuruId) {
      const mId = user?.guru_profile?.id;
      if (mId) setSelectedGuruId(mId);
    }
  }, [isGuru, user, selectedGuruId]);

  // ── useQuery: Grid View Schedule & Duty Items ──────────────────────────────
  const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;

  const { data: kbmResData, isLoading: loadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: ['jadwal-pelajaran-grid', targetKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey],
    queryFn: async () => {
      if (!selectedTahunId || !selectedSemesterId) return [];
      const [res, piketRes, kegiatanRes] = await Promise.all([
        getJadwalKBM({
          kelas_id: targetKelasId || undefined,
          guru_id: selectedGuruId || undefined,
          tahun_pelajaran_id: selectedTahunId,
          semester_id: selectedSemesterId
        }).catch(() => ({ data: [] })),
        selectedGuruId
          ? piketGuruApi.getList({
              guru_id: selectedGuruId,
              tahun_pelajaran_id: selectedTahunId,
              semester_id: selectedSemesterId
            }).catch(() => ({ success: false, data: [] }))
          : Promise.resolve({ success: false, data: [] }),
        getJadwalKegiatan({ aktif: true }).catch(() => ({ success: false, data: [] }))
      ]);

      const kbmItems = res.data || [];
      const piketItems: any[] = [];
      const pembiasaanItems: any[] = [];

      if (piketRes?.success && Array.isArray(piketRes.data)) {
        piketRes.data.forEach((p: any) => {
          const startSlot = p.slot_mulai || 1;
          const endSlot = p.slot_selesai || 10;
          for (let slot = startSlot; slot <= endSlot; slot++) {
            piketItems.push({
              id: `piket-${p.id}-${slot}`,
              hari: p.hari,
              slot_index: slot,
              jam_mulai: p.jam_mulai || '06:30',
              jam_selesai: p.jam_selesai || '15:30',
              is_piket: true,
              pos_piket: p.pos_piket || 'Piket Umum',
              jenis_kegiatan: 'DUTY_PIKET',
              Mapel: { nama_mapel: 'TUGAS PIKET GURU', kode_mapel: 'PIKET' },
              Kelas: { id: `piket-${p.id}`, nama_kelas: p.pos_piket || 'Piket Umum' },
              Guru: p.Guru
            });
          }
        });
      }

      if (kegiatanRes?.success && Array.isArray(kegiatanRes.data)) {
        const parseArray = (val: any): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) return parsed;
            } catch {}
            return val.split(',').map(s => s.trim()).filter(Boolean);
          }
          return [];
        };

        kegiatanRes.data.forEach((keg: any) => {
          if (!isRoutineKesiswaanActivity(keg)) return;

          const days = parseArray(keg.hari);
          const targetKelasIds = parseArray(keg.target_kelas_ids);

          if (targetKelasId) {
            if (!keg.target_semua_kelas && !targetKelasIds.includes(targetKelasId)) return;
            days.forEach((dStr: string) => {
              const upperDay = dStr.toUpperCase();
              pembiasaanItems.push({
                id: `pembiasaan-${keg.id}-${upperDay}-${targetKelasId}`,
                tenant_id: keg.tenant_id,
                tahun_pelajaran_id: selectedTahunId,
                semester_id: selectedSemesterId,
                kelas_id: targetKelasId,
                hari: upperDay,
                slot_index: 0,
                jam_mulai: keg.waktu_mulai || '06:30',
                jam_selesai: keg.waktu_selesai || '07:00',
                jenis_kegiatan: 'PEMBIASAAN',
                is_locked: true,
                is_pembiasaan: true,
                Mapel: { nama_mapel: keg.nama || 'PEMBIASAAN', kode_mapel: 'PEMBIASAAN' },
                Kelas: { id: targetKelasId, nama_kelas: keg.target_semua_kelas ? 'Seluruh Kelas' : 'Kelas Terpilih' },
                Guru: { nama_guru: 'Pembiasaan Sekolah' }
              });
            });
          } else {
            const activeIds = keg.target_semua_kelas 
              ? (kelasRawList || []).map((k: any) => k.id) 
              : targetKelasIds;

            days.forEach((dStr: string) => {
              const upperDay = dStr.toUpperCase();
              activeIds.forEach((kId: string) => {
                pembiasaanItems.push({
                  id: `pembiasaan-${keg.id}-${upperDay}-${kId}`,
                  tenant_id: keg.tenant_id,
                  tahun_pelajaran_id: selectedTahunId,
                  semester_id: selectedSemesterId,
                  kelas_id: kId,
                  hari: upperDay,
                  slot_index: 0,
                  jam_mulai: keg.waktu_mulai || '06:30',
                  jam_selesai: keg.waktu_selesai || '07:00',
                  jenis_kegiatan: 'PEMBIASAAN',
                  is_locked: true,
                  is_pembiasaan: true,
                  Mapel: { nama_mapel: keg.nama || 'PEMBIASAAN', kode_mapel: 'PEMBIASAAN' },
                  Kelas: { id: kId, nama_kelas: keg.target_semua_kelas ? 'Seluruh Kelas' : 'Kelas Terpilih' },
                  Guru: { nama_guru: 'Pembiasaan Sekolah' }
                });
              });
            });
          }
        });
      }

      return [...pembiasaanItems, ...kbmItems, ...piketItems] as JadwalKBM[];
    },
    enabled: !!selectedTahunId && !!selectedSemesterId,
    staleTime: 5 * 60 * 1000,
  });

  const jadwal = kbmResData || [];

  // Pillar 2: Memoize callbacks
  const handleEditSlot = useCallback(() => {
    if (canManage) {
      setViewMode('builder');
    }
  }, [canManage]);

  const handlePrint = useCallback(async () => {
    const toastId = toast.loading('Sedang menyiapkan dokumen PDF...');
    try {
      // 1. Fetch school info
      let sekolah = null;
      try {
        sekolah = await sekolahApi.getProfile();
      } catch (e) {
        console.warn('Failed to fetch school profile', e);
      }

      // 2. Fetch tenant info
      let tenantInfo = null;
      try {
        const tenantRes = await getMyTenant();
        tenantInfo = tenantRes?.success ? tenantRes.data : null;
      } catch (e) {
        console.warn('Failed to fetch tenant info', e);
      }

      // 3. Fetch list of organizational assignments for principal NIP/Name signature
      let strukturList: any[] = [];
      try {
        const strukturRes = await getStrukturList({ page: 1, limit: 100 });
        strukturList = strukturRes?.success ? strukturRes.data : [];
      } catch (e) {
        console.warn('Failed to fetch structure list', e);
      }

      // 4. Fetch school and regional logos as base64
      let logoDaerahBase64 = null;
      let logoSekolahBase64 = null;

      try {
        if (sekolah?.logo_daerah) {
          logoDaerahBase64 = await getBase64ImageFromUrl(sekolah.logo_daerah).catch(() => null);
        }
        if (sekolah?.logo_sekolah) {
          logoSekolahBase64 = await getBase64ImageFromUrl(sekolah.logo_sekolah).catch(() => null);
        }
      } catch (e) {
        console.warn('Failed to fetch base64 logos', e);
      }

      // 5. Fetch master kegiatan for activity name mappings
      let jenisKegiatanList: any[] = [];
      try {
        const jenisRes = await jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 });
        jenisKegiatanList = jenisRes?.success ? jenisRes.data : [];
      } catch (e) {
        console.warn('Failed to fetch jenis kegiatan list', e);
      }

      // 6. Extract unique classes and gurus from the current page's jadwal list to avoid potential 403 Forbidden errors
      const classes: any[] = [];
      const classIds = new Set<string>();
      const gurus: any[] = [];
      const guruIds = new Set<string>();

      jadwal.forEach(j => {
        if (j.kelas_id && !classIds.has(j.kelas_id)) {
          classIds.add(j.kelas_id);
          classes.push({ id: j.kelas_id, nama_kelas: j.Kelas?.nama_kelas || 'Kelas' });
        }
        if (j.guru_id && !guruIds.has(j.guru_id)) {
          guruIds.add(j.guru_id);
          gurus.push({ id: j.guru_id, nama_guru: j.Guru?.User?.full_name || 'Guru' });
        }
      });

      const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;

      // 7. Generate PDF blob
      const blob = await generateGenericPdf({
        module: 'kurikulum',
        printType: selectedGuruId ? 'roster_teacher' : 'roster',
        selectedClassId: targetKelasId || 'all',
        selectedGuruId: selectedGuruId || 'all',
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        filterData: { 
          jadwalList: jadwal, 
          classes, 
          gurus, 
          jenisKegiatanList 
        }
      });

      // 8. Download the PDF directly
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const docTitle = selectedGuruId ? `Jadwal_Guru_${user?.full_name}` : `Jadwal_Kelas_${selectedKelasId || 'Semua'}`;
      link.setAttribute('download', `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('PDF berhasil diunduh');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      toast.dismiss(toastId);
      toast.error('Gagal menghasilkan PDF');
    }
  }, [user, selectedGuruId, selectedKelasId, isSiswa, defaultKelasId, selectedTahunId, selectedSemesterId, jadwal]);

  const invalidateAllJadwalCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
    queryClient.invalidateQueries({ queryKey: ['bebanGuru'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    queryClient.invalidateQueries({ queryKey: ['struktur-kurikulum-builder-jp'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kontrak-kbm'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kontrak-kbm-summary'] });
    queryClient.invalidateQueries({ queryKey: ['unified-jadwal-kbm-all'] });
  }, [queryClient]);

  const handleDeleteSlot = useCallback(async (id: string) => {
    if (!canManage) return;
    
    const isConfirmed = await confirm({
      title: 'Hapus Jadwal?',
      description: 'Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteJadwalKBM(id);
        invalidateAllJadwalCaches();
        setRefreshKey(k => k + 1);
        refetchJadwal();
        toast.success('Jadwal berhasil dihapus');
      } catch (err) {
        LogService.error('Delete failed', err);
        toast.error('Gagal menghapus jadwal');
      }
    }
  }, [canManage, confirm, invalidateAllJadwalCaches, refetchJadwal]);

  const handleClearSchedule = useCallback(async () => {
    const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;
    const targetGuruId = selectedGuruId;

    let scopeLabel = 'SELURUH jadwal KBM sekolah';
    if (targetKelasId) scopeLabel = 'seluruh slot jadwal KBM untuk KELAS yang dipilih';
    else if (targetGuruId) scopeLabel = 'seluruh slot jadwal KBM untuk GURU yang dipilih';

    const desc = `Apakah Anda yakin ingin mengosongkan/menghapus ${scopeLabel}? Tindakan ini tidak dapat dibatalkan.`;
    
    const ok = await confirm({
      title: 'Kosongkan / Reset Jadwal KBM',
      description: desc,
      confirmText: 'Ya, Kosongkan Jadwal',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    try {
      const res = await clearJadwalKBM({
        kelas_id: targetKelasId || undefined,
        guru_id: targetGuruId || undefined,
        tahun_pelajaran_id: selectedTahunId || undefined,
        semester_id: selectedSemesterId || undefined,
      });

      if (res && res.success !== false) {
        toast.success(res.message || 'Berhasil mengosongkan jadwal KBM.');
        try {
          invalidateAllJadwalCaches();
          setRefreshKey(k => k + 1);
          refetchJadwal();
        } catch (postErr) {
          console.warn('[JadwalPelajaranPage] Post-clear refresh warning:', postErr);
        }
      } else {
        toast.error(res?.message || 'Gagal mengosongkan jadwal');
      }
    } catch (err: any) {
      console.error('Failed to clear schedules', err);
      toast.error(err?.message || 'Gagal mengosongkan jadwal KBM');
    }
  }, [confirm, isSiswa, defaultKelasId, selectedKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, invalidateAllJadwalCaches, refetchJadwal]);

  const canViewTpl = can('academic.schedules.view.list') || can('attendance.schedules.view.list');
  const isAllowed = absensiMode === 'MULTI_SESI' && canViewTpl;

  // Pillar 2: Memoize complex JSX
  const pageContent = useMemo(() => (
    <div className="space-y-3">
      <SectionCard fullWidth>
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10 shadow-sm hover:shadow-md transition-all text-amber-700 dark:text-amber-400 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={() => setAutoWizardOpen(true)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Generate Otomatis
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm hover:bg-indigo-100/50 hover:shadow-md transition-all text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5 text-xs"
                  onClick={() => setBebanModalOpen(true)}
                  title="Statistik Beban Mengajar Guru"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Beban JP Guru
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm hover:bg-emerald-100/50 hover:shadow-md transition-all text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={() => setAscWizardOpen(true)}
                  title="Impor Jadwal KBM dari File aSc Timetables (.XML)"
                >
                  <FileUp className="w-3.5 h-3.5 text-emerald-500" />
                  Impor XML aSc
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl px-3 py-1.5 border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 shadow-sm hover:bg-rose-100/50 hover:shadow-md transition-all text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={handleClearSchedule}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Kosongkan Jadwal
                </Button>
              </>
            )}
          </div>

          {canManage ? (
            <TabSwitcher
              options={[
                { id: 'grid', label: 'Visual Grid', icon: LayoutGrid, colorClass: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'builder', label: 'Visual Builder', icon: Paintbrush, colorClass: 'text-purple-600 dark:text-purple-400' },
                { id: 'preview', label: 'Pratinjau PDF', icon: Printer, colorClass: 'text-blue-600 dark:text-blue-400' }
              ]}
              activeTab={viewMode}
              onChange={(id) => id === 'preview' ? triggerPrintPreview() : setViewMode(id as any)}
            />
          ) : !isSiswa ? (
            <TabSwitcher
              options={[
                { id: 'grid', label: 'Visual Grid', icon: LayoutGrid, colorClass: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'preview', label: 'Pratinjau PDF', icon: Printer, colorClass: 'text-blue-600 dark:text-blue-400' }
              ]}
              activeTab={viewMode}
              onChange={(id) => id === 'preview' ? triggerPrintPreview() : setViewMode(id as any)}
            />
          ) : null}
        </div>

        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
          {viewMode === 'builder' && canManage ? (
            <JadwalBuilder 
              tahunPelajaranId={selectedTahunId} 
              semesterId={selectedSemesterId}
              selectedGuruId={selectedGuruId}
              setSelectedGuruId={setSelectedGuruId}
              selectedKelasId={selectedKelasId}
              setSelectedKelasId={setSelectedKelasId}
              onRefresh={() => setRefreshKey(k => k + 1)}
              onOpenPrintPreview={(pType, targetId) => triggerPrintPreview(pType, targetId)}
            />
          ) : viewMode === 'preview' && !isSiswa ? (
            <CetakBerkasKurikulumPage 
              key={`${previewPrintType}-${previewTargetClassId}-${previewTargetGuruId}`}
              initialPrintType={previewPrintType}
              initialClassId={previewPrintType === 'roster' ? previewTargetClassId : ''}
              initialGuruId={previewPrintType === 'roster_teacher' ? previewTargetGuruId : ''}
              hideHeader={true}
            />
          ) : (
            <JadwalGrid 
              jadwal={jadwal} 
              onAddSlot={() => canManage && setViewMode('builder')}
              onEditSlot={handleEditSlot}
              onDeleteSlot={handleDeleteSlot}
              loading={loadingJadwal}
              readOnly={!canManage}
              selectedKelasId={isSiswa ? defaultKelasId : selectedKelasId}
            />
          )}
        </Suspense>
      </SectionCard>
    </div>
  ), [viewMode, canManage, handlePrint, handleClearSchedule, jadwal, loadingJadwal, selectedKelasId, defaultKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey, isSiswa, handleEditSlot, handleDeleteSlot]);

  // 🛡️ Premium Lock Check
  if (isLocked) {
    return (
      <AcademicPageLayout
        title="Jadwal KBM & Visual Builder"
        description="Workspace Operasional Penyusunan & Mapping Jadwal Pelajaran"
        hardeningModuleKey={hardeningModuleKey}
      >
        <PremiumFeatureGate 
          isLocked={isLocked}
          moduleName="ACADEMIC"
          featureName="Manajemen Jadwal KBM"
          description="Buat jadwal KBM presensi yang fleksibel untuk berbagai sesi, memudahkan otomatisasi pencatatan kehadiran setiap harinya."
        >
          <div />
        </PremiumFeatureGate>
      </AcademicPageLayout>
    );
  }

  if (!isAllowed) {
    return (
      <AcademicPageLayout
        title="Jadwal KBM & Visual Builder"
        description="Workspace Operasional Penyusunan & Mapping Jadwal Pelajaran"
        hardeningModuleKey={hardeningModuleKey}
      >
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full mb-4">
              <FileStack className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mode Absensi Tidak Mendukung</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md">
              Halaman Jadwal KBM hanya aktif pada sekolah yang mengaktifkan mode absensi MULTI_SESI. Silakan hubungi admin untuk mengubah pengaturan mode absensi.
            </p>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Jadwal KBM & Visual Builder"
      description="Workspace Operasional Penyusunan & Mapping Jadwal Pelajaran"
      instruction={{
        title: 'Panduan Penyusunan Jadwal (Full Screen Workspace)',
        description: 'Jadwal pelajaran bertindak sebagai blueprint KBM harian yang menggerakkan generator absensi otomatis.',
        items: [
          { text: 'Visual Grid menampilkan pratinjau jadwal mingguan per kelas atau per guru secara ringkas.' },
          { text: 'Visual Builder & Daftar Kelola memungkinkan Wakasek Kurikulum melakukan penyusunan interaktif (Drag-and-Drop & CRUD).' },
          { text: 'Anda juga dapat melakukan import data jadwal sekaligus menggunakan template spreadsheet excel.' }
        ]
      }}
      hardeningModuleKey={hardeningModuleKey}
    >
      {pageContent}

      <AutoJadwalWizardModal
        isOpen={autoWizardOpen}
        onClose={() => setAutoWizardOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <BebanGuruSummaryModal
        isOpen={bebanModalOpen}
        onClose={() => setBebanModalOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
      />

      <AscImportWizardModal
        isOpen={ascWizardOpen}
        onClose={() => setAscWizardOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
        onSuccessImport={() => {
          setRefreshKey(k => k + 1);
          queryClient.invalidateQueries({ queryKey: ['jadwal-kbm'] });
          queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });
          queryClient.invalidateQueries({ queryKey: ['unified-jadwal-kbm-all'] });
        }}
      />
    </AcademicPageLayout>
  );
}
