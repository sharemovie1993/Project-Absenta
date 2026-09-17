import React, { useMemo, useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import { guruApi } from '../../api/academic.api';
import { HubinJurnalStatus, HubinPklStatus } from '../../constants/HubinConstants';
import { getPklDisplayStatus } from '../../utils/hubinPklLifecycle';
import { 
  Search, 
  UserPlus, 
  Calendar, 
  Building2, 
  User, 
  ClipboardList, 
  CheckCircle2, 
  Award,
  MapPin,
  Printer,
  FileText,
  MessageCircle,
  Trash2,
  Users,
  RotateCcw,
  Clock,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { getMyTenant } from '../../api/tenants.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input, Loader } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { formatDate } from '../../utils/layoutUtils';
import { PklStatusBadge } from '../../components/hubin/PklStatusBadge';
import useConfirm from '../../hooks/useConfirm';
import { getPenempatanColumns } from '../../components/hubin/HubinPklColumns';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { usePembimbingPklOptions } from '../../hooks/usePembimbingPklOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { PenempatanRowActionMenu } from '../../components/hubin/PenempatanRowActionMenu';

import type {
  SiswaData,
  MitraData,
  PembimbingData,
  SiswaPkl,
  CreatePenempatanPayload,
  PenilaianPayload,
  KunjunganPayload
} from './types/penempatan.types';

const HubinPklPlottingModal = lazy(() => import('../../components/hubin/HubinPklPlottingModal').then(m => ({ default: m.HubinPklPlottingModal })));
const HubinPklBulkPlottingModal = lazy(() => import('../../components/hubin/HubinPklBulkPlottingModal').then(m => ({ default: m.HubinPklBulkPlottingModal })));
const HubinPklNilaiModal = lazy(() => import('../../components/hubin/HubinPklNilaiModal').then(m => ({ default: m.HubinPklNilaiModal })));
const HubinPklKunjunganModal = lazy(() => import('../../components/hubin/HubinPklKunjunganModal').then(m => ({ default: m.HubinPklKunjunganModal })));
const HubinPklReviewJurnalModal = lazy(() => import('../../components/hubin/HubinPklReviewJurnalModal').then(m => ({ default: m.HubinPklReviewJurnalModal })));
const HubinPklPrintSurat = lazy(() => import('../../components/hubin/HubinPklPrintSurat').then(m => ({ default: m.HubinPklPrintSurat })));
const HubinPklPrintMonitoringModal = lazy(() => import('../../components/hubin/HubinPklPrintMonitoringModal').then(m => ({ default: m.HubinPklPrintMonitoringModal })));
const HubinPklMutasiModal = lazy(() => import('../../components/hubin/HubinPklMutasiModal').then(m => ({ default: m.HubinPklMutasiModal })));
import type { MonitoringPrintConfig } from '../../components/hubin/HubinPklPrintMonitoringModal';

// ─── Zod Schema Validation Guard (Pilar 25) ───
const penempatanSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa harus dipilih'),
  mitra_id: z.string().min(1, 'Mitra industri harus dipilih'),
  pembimbing_id: z.string().nullable(),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai harus diisi'),
  tanggal_selesai: z.string().nullable(),
  status: z.string().min(1),
});
type PenempatanFormValues = z.infer<typeof penempatanSchema>;

export const PenempatanPklSection: React.FC = React.memo(() => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [guruSearch, setGuruSearch] = useState('');
  const [mitraSearch, setMitraSearch] = useState('');
  const printTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isHubin, isAdmin, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, can, activeGuruId: capActiveGuruId } = useCapabilities();
  const isGuru = useMemo(() => !!user?.isTeacher, [user]);
  
  const canManage = useMemo(() => {
    return isAdmin || isHubin || isKaprog || can('hubin.partners.manage') || can('hubin.pkl.manage');
  }, [isAdmin, isHubin, isKaprog, can]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_GUIDANCE'>((canManage || isWaliKelas) ? 'ALL' : 'MY_GUIDANCE');
  
  // Selected Plotting IDs
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [selectedMitraId, setSelectedMitraId] = useState('');
  const [selectedPembimbingId, setSelectedPembimbingId] = useState('');
  
  // Modals Open State
  const [isPlottingOpen, setIsPlottingOpen] = useState(false);
  const [isBulkPlottingOpen, setIsBulkPlottingOpen] = useState(false);
  const [isNilaiOpen, setIsNilaiOpen] = useState(false);
  const [isKunjunganOpen, setIsKunjunganOpen] = useState(false);
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  
  const [isReviewJurnalOpen, setIsReviewJurnalOpen] = useState(false);
  const [reviewJurnalStatus, setReviewJurnalStatus] = useState<'DISETUJUI' | 'REVISI'>('DISETUJUI');
  const [reviewJurnalCatatan, setReviewJurnalCatatan] = useState('');

  const [isMutasiOpen, setIsMutasiOpen] = useState(false);
  const [selectedMutasiPkl, setSelectedMutasiPkl] = useState<SiswaPkl | null>(null);
  
  // Selected Data for Modals
  const [selectedPkl, setSelectedPkl] = useState<SiswaPkl | null>(null);
  const [printData, setPrintData] = useState<SiswaPkl | null>(null);
  const [printKolektifMitraId, setPrintKolektifMitraId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'surat_tugas' | 'lembar_monitoring'>('surat_tugas');
  const [isMonitoringConfigModalOpen, setIsMonitoringConfigModalOpen] = useState(false);
  const [selectedMonitoringPkl, setSelectedMonitoringPkl] = useState<SiswaPkl | null>(null);
  const [monitoringPrintConfig, setMonitoringPrintConfig] = useState<MonitoringPrintConfig>({
    pattern: 'standard_3',
    includeEmptyRows: true
  });

  // Timer Cleanup Effect
  useEffect(() => {
    return () => {
      if (printTimerRef.current) {
        clearTimeout(printTimerRef.current);
      }
    };
  }, []);

  // Gating Logic
  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');
  const isEnabled = subscription !== undefined;

  // Queries
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: !!user?.tenant_id
  });

  // Konteks Tahun Pelajaran, Kelas & Mitra Filter
  const { options: tpOptions, activeTahunPelajaran, isLoading: isLoadingTp } = useTahunPelajaranOptions();
  // Khusus Kaprog: Batasi opsi kelas hanya untuk jurusannya
  const { options: kelasOptions, isLoading: isLoadingKelas } = useKelasOptions({
    jurusanId: isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined
  });
  const [selectedTpFilter, setSelectedTpFilter] = useState<string>('');
  const [selectedMitraFilter, setSelectedMitraFilter] = useState<string>('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('');

  // Khusus Wali Kelas: Otomatis kunci filter kelas ke kelas binaan
  useEffect(() => {
    if (isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog) {
      setSelectedKelasFilter(walikelasKelas.id);
    }
  }, [isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog]);

  useEffect(() => {
    if (activeTahunPelajaran?.id && !selectedTpFilter) {
      setSelectedTpFilter(activeTahunPelajaran.id);
    }
  }, [activeTahunPelajaran, selectedTpFilter]);

  const tpFilterOptions = useMemo(() => [
    { label: 'Semua Tahun Pelajaran', value: '' },
    ...tpOptions
  ], [tpOptions]);

  const kelasFilterOptions = useMemo(() => [
    { label: 'Semua Kelas', value: '' },
    ...kelasOptions
  ], [kelasOptions]);

  // Integrated Custom Hooks (Pilar 31 Data Layer)
  const { options: guruOptions, isLoading: isLoadingGuru } = usePembimbingPklOptions();
  const rawGuru = useMemo(() => (guruOptions ?? [])?.map(g => (g.raw || {}) as PembimbingData), [guruOptions]);

  const activeGuruId = useMemo(() => {
    if (capActiveGuruId) return capActiveGuruId;
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: PembimbingData) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [capActiveGuruId, rawGuru, user]);

  const effectiveKelasFilter = activeTab === 'MY_GUIDANCE' ? undefined : (selectedKelasFilter || undefined);
  const effectivePembimbingFilter = activeTab === 'MY_GUIDANCE' && activeGuruId ? activeGuruId : undefined;

  const { data: penempatanData, isLoading } = useQuery({
    queryKey: ['penempatan-pkl', { 
      search: searchTerm, 
      page, 
      limit, 
      tahun_pelajaran_id: selectedTpFilter,
      mitra_id: selectedMitraFilter,
      kelas_id: effectiveKelasFilter,
      pembimbing_id: effectivePembimbingFilter
    }],
    queryFn: () => hubinApi.getPenempatan({
      search: searchTerm,
      page,
      limit,
      tahun_pelajaran_id: selectedTpFilter || undefined,
      mitra_id: selectedMitraFilter || undefined,
      kelas_id: effectiveKelasFilter,
      pembimbing_id: effectivePembimbingFilter
    }),
    enabled: isEnabled
  });

  const { data: allActivePenempatan } = useQuery({
    queryKey: ['penempatan-pkl', 'all-active', { 
      tahun_pelajaran_id: selectedTpFilter
    }],
    queryFn: () => hubinApi.getPenempatan({
      limit: 1000,
      tahun_pelajaran_id: selectedTpFilter || undefined
    }),
    enabled: isEnabled
  });

  const rawPenempatan = useMemo(() => {
    return Array.isArray(penempatanData?.data) ? penempatanData.data : (penempatanData as { data?: SiswaPkl[] })?.data || [];
  }, [penempatanData]);

  const pagination = useMemo(() => penempatanData?.pagination || null, [penempatanData]);

  const hasKolektif = useCallback((mitraId: string) => {
    if (!rawPenempatan) return false;
    const count = rawPenempatan.filter((item: SiswaPkl) => item.mitra_id === mitraId).length;
    return count > 1;
  }, [rawPenempatan]);

  const { data: rawMitraRes, isLoading: isLoadingRawMitra } = useQuery({
    queryKey: ['mitra-industri-raw-penempatan'],
    queryFn: () => hubinApi.getMitra({ limit: 1000 }).catch(() => null),
    enabled: isEnabled,
  });
  const rawMitra = useMemo(() => {
    return (Array.isArray(rawMitraRes?.data) ? rawMitraRes.data : []) as MitraData[];
  }, [rawMitraRes]);

  const mitraFilterOptions = useMemo(() => [
    { label: 'Semua Mitra Industri', value: '' },
    ...(rawMitra || []).map((m: MitraData) => ({ label: m.nama, value: m.id })).sort((a, b) => a.label.localeCompare(b.label))
  ], [rawMitra]);

  // Integrated Custom Hooks (Pilar 31 Data Layer)
  const { options: mitraOptions, isLoading: isLoadingMitra } = useDudiOptions(mitraSearch);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePenempatanPayload) => hubinApi.createPenempatan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Penempatan PKL berhasil dibuat');
      setIsPlottingOpen(false);
      setSelectedSiswaId('');
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    },
    onError: (error: unknown) => {
      const errorMsg = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Gagal membuat penempatan');
      toast.error(errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SiswaPkl> }) => hubinApi.updatePenempatan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Perubahan penempatan berhasil disimpan');
      setIsPlottingOpen(false);
      setSelectedPkl(null);
      setSelectedSiswaId('');
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    },
    onError: (error: unknown) => {
      const errorMsg = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Gagal mengubah penempatan');
      toast.error(errorMsg);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payload: CreatePenempatanPayload[]) => hubinApi.bulkCreatePenempatan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Plotting penempatan kolektif berhasil dibuat');
      setIsBulkPlottingOpen(false);
    },
    onError: (error: unknown) => {
      const errorMsg = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Gagal membuat penempatan kolektif');
      toast.error(errorMsg);
    },
  });

  const nilaiMutation = useMutation({
    mutationFn: ({ id, nilai }: { id: string; nilai: PenilaianPayload }) => hubinApi.updatePenilaian(id, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      toast.success('Penilaian PKL berhasil disimpan');
      setIsNilaiOpen(false);
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menyimpan penilaian';
      toast.error(errorMsg);
    },
  });

  const kunjunganMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KunjunganPayload }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Laporan kunjungan berhasil ditambahkan');
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menambahkan kunjungan';
      toast.error(errorMsg);
    },
  });

  const updateKunjunganMutation = useMutation({
    mutationFn: ({ id, kunjunganId, data }: { id: string; kunjunganId: string; data: KunjunganPayload }) =>
      hubinApi.updateKunjungan(id, kunjunganId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Catatan kunjungan berhasil diperbarui');
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal memperbarui kunjungan';
      toast.error(errorMsg);
    },
  });

  const deleteKunjunganMutation = useMutation({
    mutationFn: ({ id, kunjunganId }: { id: string; kunjunganId: string }) =>
      hubinApi.deleteKunjungan(id, kunjunganId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Catatan kunjungan berhasil dihapus');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menghapus kunjungan';
      toast.error(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deletePenempatan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Penempatan PKL berhasil dihapus');
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menghapus penempatan';
      toast.error(errorMsg);
    },
  });

  const reviewJurnalMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: string; catatan: string }) => 
      hubinApi.reviewJurnalPortofolio(id, status, catatan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Review Jurnal & Portofolio berhasil disimpan!');
      setIsReviewJurnalOpen(false);
      setReviewJurnalCatatan('');
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Gagal menyimpan review';
      toast.error(errorMsg);
    },
  });

  const mutasiMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hubinApi.mutasiPenempatan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Mutasi penempatan siswa berhasil diproses');
      setIsMutasiOpen(false);
      setSelectedMutasiPkl(null);
    },
    onError: (error: unknown) => {
      const errorMsg = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Gagal memproses mutasi penempatan');
      toast.error(errorMsg);
    },
  });

  // Plotting Submit Handler
  const handlePlottingSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedSiswaId || !selectedMitraId) {
      toast.error('Mohon pilih siswa dan mitra industri');
      return;
    }

    const isFlexible = formData.get('is_flexible_location') === 'on';
    const latOverride = formData.get('lat_override') ? parseFloat(formData.get('lat_override') as string) : null;
    const lonOverride = formData.get('lon_override') ? parseFloat(formData.get('lon_override') as string) : null;
    const radiusOverride = formData.get('radius_override') ? parseInt(formData.get('radius_override') as string) : null;
    const tpId = (formData.get('tahun_pelajaran_id') as string) || selectedTpFilter || null;
    const semId = (formData.get('semester_id') as string) || null;

    const data: CreatePenempatanPayload = {
      siswa_id: selectedSiswaId,
      mitra_id: selectedMitraId,
      pembimbing_id: selectedPembimbingId || null,
      tanggal_mulai: new Date(formData.get('tanggal_mulai') as string).toISOString(),
      tanggal_selesai: formData.get('tanggal_selesai') ? new Date(formData.get('tanggal_selesai') as string).toISOString() : null,
      status: (formData.get('status') as string) || (selectedPkl ? selectedPkl.status : 'AKTIF'),
      tahun_pelajaran_id: tpId,
      semester_id: semId,
      is_flexible_location: isFlexible,
      lat_override: latOverride,
      lon_override: lonOverride,
      radius_override: radiusOverride
    } as any;

    if (selectedPkl) {
      updateMutation.mutate({ id: selectedPkl.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [selectedSiswaId, selectedMitraId, selectedPembimbingId, selectedPkl, selectedTpFilter, createMutation, updateMutation]);

  const handleBulkPlottingSubmit = useCallback((data: {
    siswa_ids: string[];
    mitra_id: string;
    pembimbing_id: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    tahun_pelajaran_id?: string | null;
    semester_id?: string | null;
    kelas_id?: string | null;
  }) => {
    const payload: CreatePenempatanPayload[] = (data.siswa_ids ?? [])?.map(siswa_id => ({
      siswa_id,
      mitra_id: data.mitra_id,
      pembimbing_id: data.pembimbing_id,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      status: 'AKTIF',
      tahun_pelajaran_id: data.tahun_pelajaran_id || selectedTpFilter || null,
      semester_id: data.semester_id || null,
      kelas_id: data.kelas_id || null,
    }));
    bulkCreateMutation.mutate(payload);
  }, [bulkCreateMutation, selectedTpFilter]);

  const placedStudentIds = useMemo(() => {
    const list = Array.isArray(allActivePenempatan?.data) ? allActivePenempatan.data : (allActivePenempatan as { data?: SiswaPkl[] })?.data || [];
    return new Set<string>(list.filter((p: SiswaPkl) => p.status === 'AKTIF')?.map((p: SiswaPkl) => p.siswa_id));
  }, [allActivePenempatan]);

  // Penilaian Submit Handler
  const handleNilaiSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const nilai = {
      soft_skills: parseFloat(formData.get('soft_skills') as string) || 0,
      technical_skills: parseFloat(formData.get('technical_skills') as string) || 0,
      discipline: parseFloat(formData.get('discipline') as string) || 0,
      catatan: formData.get('catatan') as string || '',
      nilai_akhir: Math.round(
        ((parseFloat(formData.get('soft_skills') as string) || 0) +
         (parseFloat(formData.get('technical_skills') as string) || 0) +
         (parseFloat(formData.get('discipline') as string) || 0)) / 3
      )
    };

    nilaiMutation.mutate({ id: selectedPkl.id, nilai });
  }, [selectedPkl, nilaiMutation]);

  // Kunjungan Submit & Delete Handlers
  const handleKunjunganSubmit = useCallback((
    e: React.FormEvent<HTMLFormElement>,
    editingKunjunganId?: string,
    onSuccess?: () => void
  ) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const tanggalVal = formData.get('tanggal') as string;
    const data: KunjunganPayload = {
      catatan: formData.get('catatan') as string || '',
      catatan_dudi: formData.get('catatan_dudi') as string || undefined,
      foto_url: formData.get('foto_url') as string || undefined,
      latitude: parseFloat(formData.get('latitude') as string) || undefined,
      longitude: parseFloat(formData.get('longitude') as string) || undefined,
      tanggal: tanggalVal ? new Date(tanggalVal).toISOString() : undefined,
    };

    if (!data.catatan) {
      toast.error('Tuliskan catatan monitoring hasil kunjungan');
      return;
    }

    if (editingKunjunganId) {
      updateKunjunganMutation.mutate(
        { id: selectedPkl.id, kunjunganId: editingKunjunganId, data },
        {
          onSuccess: () => {
            onSuccess?.();
          }
        }
      );
    } else {
      kunjunganMutation.mutate(
        { id: selectedPkl.id, data },
        {
          onSuccess: () => {
            onSuccess?.();
          }
        }
      );
    }
  }, [selectedPkl, kunjunganMutation, updateKunjunganMutation]);

  const handleDeleteKunjungan = useCallback((kunjunganId: string) => {
    if (!selectedPkl) return;
    deleteKunjunganMutation.mutate({ id: selectedPkl.id, kunjunganId });
  }, [selectedPkl, deleteKunjunganMutation]);

  const allActiveList = useMemo(() => {
    return Array.isArray(allActivePenempatan?.data) ? (allActivePenempatan.data as SiswaPkl[]) : [];
  }, [allActivePenempatan]);

  const isActuallyPembimbing = useMemo(() => {
    if (!activeGuruId) return false;
    const listToCheck = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    return listToCheck.some((p: SiswaPkl) => p.pembimbing_id === activeGuruId);
  }, [allActiveList, rawPenempatan, activeGuruId]);

  const myGuidanceCount = useMemo(() => {
    if (!activeGuruId) return 0;
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    return list.filter((p: SiswaPkl) => p.pembimbing_id === activeGuruId).length;
  }, [allActiveList, rawPenempatan, activeGuruId]);

  const allCount = useMemo(() => {
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    if (isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog) {
      return list.filter((p: SiswaPkl) => {
        const kId = (p as any).SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || (p.Siswa as any)?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    return list.length;
  }, [allActiveList, rawPenempatan, isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog]);

  const showTabs = useMemo(() => {
    // Tab hanya muncul jika dia HUBIN Global / Kaprog / Wali Kelas DAN sekaligus memiliki siswa bimbingan
    return (canManage || isWaliKelas) && isActuallyPembimbing;
  }, [canManage, isWaliKelas, isActuallyPembimbing]);

  // Sync activeTab if tabs are hidden
  useEffect(() => {
    if (!showTabs) {
      setActiveTab((canManage || isWaliKelas) ? 'ALL' : 'MY_GUIDANCE');
    }
  }, [showTabs, canManage, isWaliKelas]);

  const filteredData = useMemo(() => {
    let result = rawPenempatan || [];
    if (activeTab === 'MY_GUIDANCE') {
      result = result.filter((p: SiswaPkl) => p.pembimbing_id === activeGuruId);
    }
    if (selectedMitraFilter) {
      result = result.filter((p: SiswaPkl) => p.mitra_id === selectedMitraFilter);
    }
    if (selectedKelasFilter && activeTab !== 'MY_GUIDANCE') {
      result = result.filter((p: SiswaPkl) => {
        const kId = (p as any).SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || (p.Siswa as any)?.kelas_id;
        return kId === selectedKelasFilter;
      });
    }
    return result.filter((p: SiswaPkl) => 
      p.Siswa?.nama_siswa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Mitra?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawPenempatan, searchTerm, activeTab, activeGuruId, selectedMitraFilter, selectedKelasFilter]);

  const hasActiveFilters = Boolean(
    selectedMitraFilter || 
    selectedKelasFilter || 
    searchTerm || 
    (selectedTpFilter && activeTahunPelajaran?.id && selectedTpFilter !== activeTahunPelajaran.id)
  );

  const handleResetFilters = useCallback(() => {
    setSelectedMitraFilter('');
    if (!(isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog)) {
      setSelectedKelasFilter('');
    }
    setSearchTerm('');
    if (activeTahunPelajaran?.id) {
      setSelectedTpFilter(activeTahunPelajaran.id);
    } else {
      setSelectedTpFilter('');
    }
    setPage(1);
  }, [activeTahunPelajaran, isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog]);

  // Deteksi siswa yang jadwal PKL-nya telah berakhir (PERIODE_BERAKHIR) namun status masih AKTIF
  const overdueStudents = useMemo(() => {
    if (!rawPenempatan) return [];
    return rawPenempatan.filter((p: SiswaPkl) => {
      const display = getPklDisplayStatus(p);
      return display.status === 'PERIODE_BERAKHIR' && p.status === 'AKTIF';
    });
  }, [rawPenempatan]);

  const [isBatchCheckingOut, setIsBatchCheckingOut] = useState(false);

  const handleBatchCheckoutOverdue = useCallback(async () => {
    if (overdueStudents.length === 0) return;
    const isConfirmed = await confirm({
      title: 'Tandai Selesai Siswa Berakhir',
      description: `Apakah Anda yakin ingin menandai SELESAI penempatan untuk ${overdueStudents.length} siswa yang jadwal PKL-nya telah berakhir? Status penempatan akan diperbarui menjadi SELESAI per hari ini.`,
      confirmText: `Ya, Selesaikan (${overdueStudents.length} Siswa)`,
      cancelText: 'Batal',
      style: 'primary'
    });

    if (isConfirmed) {
      setIsBatchCheckingOut(true);
      try {
        const todayStr = new Date().toISOString().substring(0, 10);
        await Promise.all(
          overdueStudents.map(s =>
            hubinApi.updatePenempatan(s.id, {
              status: 'SELESAI',
              tanggal_selesai: s.tanggal_selesai ? s.tanggal_selesai.substring(0, 10) : todayStr
            })
          )
        );
        queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
        queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
        queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
        toast.success(`Berhasil menyelesaikan ${overdueStudents.length} penempatan siswa`);
      } catch (err) {
        toast.error('Gagal menyelesaikan penempatan siswa');
      } finally {
        setIsBatchCheckingOut(false);
      }
    }
  }, [overdueStudents, confirm, queryClient]);

  const paginationProps = useMemo(() => {
    if (!pagination) return undefined;
    return {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      onPageChange: (newPage: number) => setPage(newPage),
      onLimitChange: (newLimit: number) => setLimit(newLimit)
    };
  }, [pagination]);

  const stats = useMemo(() => {
    const totalCount = rawPenempatan?.length || 0;
    const activeCount = rawPenempatan?.filter((p: SiswaPkl) => p.status === 'AKTIF').length || 0;
    const finishedCount = rawPenempatan?.filter((p: SiswaPkl) => p.status === 'SELESAI').length || 0;
    const mitraCount = Array.from(new Set((rawPenempatan ?? [])?.map((p: SiswaPkl) => p.mitra_id))).length || 0;

    return [
      {
        title: 'Total Penempatan',
        value: totalCount,
        icon: <ClipboardList size={24} />,
        gradient: 'from-blue-500 to-indigo-600'
      },
      {
        title: 'Penempatan Aktif',
        value: activeCount,
        icon: <CheckCircle2 size={24} />,
        gradient: 'from-emerald-400 to-teal-600'
      },
      {
        title: 'Penempatan Selesai',
        value: finishedCount,
        icon: <GraduationCap size={24} />,
        gradient: 'from-purple-500 to-indigo-600'
      },
      {
        title: 'Mitra Terlibat',
        value: mitraCount,
        icon: <Building2 size={24} />,
        gradient: 'from-amber-400 to-orange-600'
      }
    ];
  }, [rawPenempatan]);

  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Penempatan PKL', path: '/hubin/penempatan' }
  ];

  const toolbar = canManage ? (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setIsBulkPlottingOpen(true)}
        variant="toolbarOutline"
        size="toolbar"
        className="rounded-xl h-9 px-4 flex items-center gap-1.5"
      >
        <Users size={16} />
        Plotting Kolektif
      </Button>
      <Button
        onClick={() => {
          setSelectedPkl(null);
          setSelectedSiswaId('');
          setSelectedMitraId('');
          setSelectedPembimbingId('');
          setIsPlottingOpen(true);
        }}
        variant="toolbarPrimary"
        size="toolbar"
        className="h-9 px-4 rounded-xl flex items-center gap-1.5"
      >
        <UserPlus size={16} />
        Plotting Baru
      </Button>
    </div>
  ) : null;



  // Table Columns
  const columns = useMemo(() => getPenempatanColumns({
    rawMitra,
    canManage,
    hasKolektif,
    onNilai: (row) => {
      setSelectedPkl(row);
      setIsNilaiOpen(true);
    },
    onKunjungan: (row) => {
      setSelectedPkl(row);
      setIsKunjunganOpen(true);
    },
    onReviewJurnal: (row) => {
      setSelectedPkl(row);
      setReviewJurnalStatus(row.jurnal_json?.status === HubinJurnalStatus.REVISI ? HubinJurnalStatus.REVISI : HubinJurnalStatus.DISETUJUI);
      setReviewJurnalCatatan(row.jurnal_json?.catatan_revisi || '');
      setIsReviewJurnalOpen(true);
    },
    onCetakTugas: (row) => {
      setPrintKolektifMitraId(null);
      setPrintMode('surat_tugas');
      setPrintData(row);
      printTimerRef.current = setTimeout(() => {
        window.print();
      }, 250);
    },
    onCetakKolektif: (mitraId) => {
      setPrintData(null);
      setPrintMode('surat_tugas');
      setPrintKolektifMitraId(mitraId);
      printTimerRef.current = setTimeout(() => {
        window.print();
      }, 250);
    },
    onPrintMonitoring: (row) => {
      setSelectedMonitoringPkl(row);
      setIsMonitoringConfigModalOpen(true);
    },
    onHapus: async (row) => {
      const isConfirmed = await confirm({
        title: 'Hapus Penempatan PKL',
        description: `Apakah Anda yakin ingin membatalkan plotting penempatan PKL untuk ${row.Siswa?.nama_siswa} di ${row.Mitra?.nama}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger'
      });
      if (isConfirmed) {
        deleteMutation.mutate(row.id);
      }
    },
    onEdit: (row) => {
      setSelectedPkl(row);
      setSelectedSiswaId(row.siswa_id);
      setSelectedMitraId(row.mitra_id);
      setSelectedPembimbingId(row.pembimbing_id || '');
      setIsPlottingOpen(true);
    },
    onSelesai: async (row) => {
      const isConfirmed = await confirm({
        title: 'Tandai Selesai PKL',
        description: `Apakah Anda yakin ingin menandai penempatan PKL untuk ${row.Siswa?.nama_siswa} di ${row.Mitra?.nama} sebagai SELESAI? Status siswa akan diperbarui dan presensi harian ditutup.`,
        confirmText: 'Ya, Tandai Selesai',
        cancelText: 'Batal',
        style: 'primary'
      });
      if (isConfirmed) {
        updateMutation.mutate({
          id: row.id,
          data: {
            status: 'SELESAI',
            tanggal_selesai: new Date().toISOString().substring(0, 10)
          }
        });
      }
    },
    onMutasi: (row) => {
      setSelectedMutasiPkl(row);
      setIsMutasiOpen(true);
    },
    onFilterSiswaHistory: (namaSiswa: string) => {
      setSearchTerm(namaSiswa);
    }
  }), [rawMitra, canManage, hasKolektif, deleteMutation, updateMutation, confirm, setSearchTerm]);

  const handleConfirmMonitoringPrint = useCallback((config: MonitoringPrintConfig) => {
    if (!selectedMonitoringPkl) return;
    setPrintKolektifMitraId(null);
    setPrintMode('lembar_monitoring');
    setMonitoringPrintConfig(config);
    setPrintData(selectedMonitoringPkl);
    printTimerRef.current = setTimeout(() => {
      window.print();
    }, 250);
  }, [selectedMonitoringPkl]);

  // Visit history list calculation
  const currentSelectedPkl = useMemo(() => {
    if (!selectedPkl) return null;
    return rawPenempatan?.find((p: SiswaPkl) => p.id === selectedPkl.id) || selectedPkl;
  }, [selectedPkl, rawPenempatan]);

  const selectedKunjunganList = useMemo(() => {
    if (!currentSelectedPkl || !Array.isArray(currentSelectedPkl.kunjungan_json)) return [];
    return currentSelectedPkl.kunjungan_json;
  }, [currentSelectedPkl]);

  const collectiveStudents = useMemo(() => {
    if (!printKolektifMitraId || !rawPenempatan) return [];
    return rawPenempatan.filter((item: SiswaPkl) => item.mitra_id === printKolektifMitraId);
  }, [printKolektifMitraId, rawPenempatan]);

  const representativeRow = useMemo(() => {
    return collectiveStudents[0] || null;
  }, [collectiveStudents]);

  const tabOptions = useMemo((): TabOption[] => {
    const allLabel = isKaprog 
      ? `Semua Siswa ${kaprogJurusan?.singkatan || 'Jurusan'}` 
      : (isWaliKelas ? `Semua Siswa ${walikelasKelas?.nama_kelas || 'Kelas'}` : 'Semua Penempatan');

    const guidanceLabel = `Bimbingan Saya (${myGuidanceCount})`;
    const fullAllLabel = `${allLabel} (${allCount})`;

    return isGuru 
      ? [
          { id: 'MY_GUIDANCE', label: guidanceLabel, icon: User },
          { id: 'ALL', label: fullAllLabel, icon: ClipboardList }
        ]
      : [
          { id: 'ALL', label: fullAllLabel, icon: ClipboardList },
          { id: 'MY_GUIDANCE', label: guidanceLabel, icon: User }
        ];
  }, [isGuru, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, allCount, myGuidanceCount]);

  const isMobile = useIsMobile();

  const renderMobileCard = (row: SiswaPkl) => {
    const fullMitra = rawMitra.find((m: MitraData) => m.id === row.mitra_id);
    const siswaPhone = row.Siswa?.no_hp || '';
    const mitraPhone = row.Mitra?.kontak || fullMitra?.kontak || '';

    const formatWhatsAppLink = (phone: string, text: string) => {
      if (!phone) return '';
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
      else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
      return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
    };

    const siswaMsg = `Halo ${row.Siswa?.nama_siswa || 'Siswa'}, saya pembimbing PKL Anda dari sekolah. Bagaimana perkembangan praktik Anda hari ini?`;
    const mitraMsg = `Halo Bapak/Ibu dari ${row.Mitra?.nama || 'Mitra'}, saya pembimbing PKL dari sekolah untuk siswa ${row.Siswa?.nama_siswa || 'Siswa'}. Bagaimana progres magang siswa kami di sana?`;

    const siswaWaLink = formatWhatsAppLink(siswaPhone, siswaMsg);
    const mitraWaLink = formatWhatsAppLink(mitraPhone, mitraMsg);

    const kunjunganList = Array.isArray(row.kunjungan_json) ? row.kunjungan_json : [];
    const visitCount = kunjunganList.length;
    const targetVisits = 3;
    const percentage = Math.min(100, Math.round((visitCount / targetVisits) * 100));

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
              <User size={18} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                {row.Siswa?.nama_siswa}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 font-mono">
                NIS: {row.Siswa?.nis || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PklStatusBadge status={row.status} />
            <PenempatanRowActionMenu
              row={row}
              canManage={canManage}
              hasKolektif={hasKolektif}
              onNilai={(r) => {
                setSelectedPkl(r);
                setIsNilaiOpen(true);
              }}
              onKunjungan={(r) => {
                setSelectedPkl(r);
                setIsKunjunganOpen(true);
              }}
              onReviewJurnal={(r) => {
                setSelectedPkl(r);
                setIsReviewJurnalOpen(true);
              }}
              onCetakTugas={(r) => {
                setPrintKolektifMitraId(null);
                setPrintMode('surat_tugas');
                setPrintData(r);
                printTimerRef.current = setTimeout(() => {
                  window.print();
                }, 250);
              }}
              onCetakKolektif={(mitraId) => {
                setPrintData(null);
                setPrintMode('surat_tugas');
                setPrintKolektifMitraId(mitraId);
                printTimerRef.current = setTimeout(() => {
                  window.print();
                }, 250);
              }}
              onPrintMonitoring={(r) => {
                setSelectedMonitoringPkl(r);
                setIsMonitoringConfigModalOpen(true);
              }}
              onHapus={async (r) => {
                const isConfirmed = await confirm({
                  title: 'Hapus Penempatan PKL',
                  description: `Apakah Anda yakin ingin membatalkan plotting penempatan PKL untuk ${r.Siswa?.nama_siswa} di ${r.Mitra?.nama}?`,
                  confirmText: 'Ya, Hapus',
                  cancelText: 'Batal',
                  style: 'danger'
                });
                if (isConfirmed) {
                  deleteMutation.mutate(r.id);
                }
              }}
              onEdit={(r) => {
                setSelectedPkl(r);
                setSelectedSiswaId(r.siswa_id);
                setSelectedMitraId(r.mitra_id);
                setSelectedPembimbingId(r.pembimbing_id || '');
                setIsPlottingOpen(true);
              }}
              siswaPhone={siswaPhone}
              mitraPhone={mitraPhone}
            />
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 min-w-0">
              <Building2 size={13} className="text-indigo-500 shrink-0" />
              <span className="truncate">{row.Mitra?.nama}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 shrink-0">
              Pmb: {row.Pembimbing?.nama_guru || 'Belum ada'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/50 dark:border-slate-800 pt-1.5">
            <span>Periode: {formatDate(row.tanggal_mulai, { day: '2-digit', month: 'short' })} - {row.tanggal_selesai ? formatDate(row.tanggal_selesai, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Selesai'}</span>
            <span className="font-bold">{visitCount}/{targetVisits} Visit ({percentage}%)</span>
          </div>

          {/* Contact WA Links */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400">Kontak WA:</span>
            {siswaPhone && (
              <a
                href={siswaWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full"
              >
                <MessageCircle size={10} /> Siswa
              </a>
            )}
            {mitraPhone && (
              <a
                href={mitraWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full"
              >
                <Building2 size={10} /> HRD
              </a>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[11px] font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl"
            onClick={() => {
              setSelectedPkl(row);
              setIsNilaiOpen(true);
            }}
          >
            <Award size={13} className="mr-1" /> Nilai PKL
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl"
            onClick={() => {
              setSelectedPkl(row);
              setIsKunjunganOpen(true);
            }}
          >
            <MapPin size={13} className="mr-1" /> Kunjungan
          </Button>
        </div>
      </div>
    );
  };

  const content = (
    <>
      <SectionCard title="Data Penempatan PKL Siswa" icon={ClipboardList} fullWidth noPadding>
        {/* Banner Khusus Kaprog: Unit Terkunci */}
        {isKaprog && (
          <div className="mx-4 mt-4 flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
              <span>
                Data penempatan dibatasi otomatis untuk Jurusan{' '}
                <strong>{kaprogJurusan?.nama || 'Binaan Anda'}</strong>
                {kaprogJurusan?.singkatan ? ` (${kaprogJurusan.singkatan})` : ''}.
              </span>
            </div>
          </div>
        )}

        {/* Banner Khusus Wali Kelas: Kelas Terkunci */}
        {isWaliKelas && !isKaprog && !isAdmin && !isHubin && (
          <div className="mx-4 mt-4 flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">Mode Wali Kelas (Monitoring Kelas Binaan):</span>{' '}
              <span>
                Data penempatan dibatasi otomatis untuk siswa kelas{' '}
                <strong>{walikelasKelas?.nama_kelas || 'Binaan Anda'}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Banner Aksi Cepat: Siswa Periode Berakhir */}
        {overdueStudents.length > 0 && canManage && (
          <div className="mx-4 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Terdapat <strong>{overdueStudents.length} siswa</strong> yang jadwal PKL-nya telah berakhir dan menunggu konfirmasi penarikan.
              </span>
            </div>
            <Button
              type="button"
              size="xs"
              variant="warning"
              onClick={handleBatchCheckoutOverdue}
              disabled={isBatchCheckingOut}
              className="shrink-0 text-xs font-bold rounded-xl shadow-sm"
            >
              {isBatchCheckingOut ? 'Memproses...' : `⚡ Tandai Selesai (${overdueStudents.length} Siswa)`}
            </Button>
          </div>
        )}

        {/* Custom Search & Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 w-full">
          {/* Tab Filters */}
          {showTabs && (
            <div className="w-full flex justify-start pb-0.5">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'ALL' | 'MY_GUIDANCE')}
              />
            </div>
          )}

          {/* Filter Controls Grid */}
          <div className="flex flex-col lg:flex-row flex-wrap items-center gap-2.5 w-full">
            {/* Filter Tahun Pelajaran */}
            <div className="w-full lg:w-48 shrink-0">
              <SearchableSelect
                id="filter-tp"
                options={tpFilterOptions}
                placeholder="-- Pilih TP --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedTpFilter(val);
                  setPage(1);
                }}
                value={selectedTpFilter}
                isLoading={isLoadingTp}
              />
            </div>

            {/* Filter Kelas */}
            <div className="w-full lg:w-44 shrink-0">
              <SearchableSelect
                id="filter-kelas"
                options={kelasFilterOptions}
                placeholder="-- Semua Kelas --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedKelasFilter(val);
                  setPage(1);
                }}
                value={selectedKelasFilter}
                isLoading={isLoadingKelas}
                disabled={Boolean(isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog)}
              />
            </div>

            {/* Filter Mitra Industri */}
            <div className="w-full lg:w-56 shrink-0">
              <SearchableSelect
                id="filter-mitra"
                options={mitraFilterOptions}
                placeholder="-- Semua Mitra --"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                onValueChange={(val) => {
                  setSelectedMitraFilter(val);
                  setPage(1);
                }}
                value={selectedMitraFilter}
                isLoading={isLoadingRawMitra}
              />
            </div>

            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                aria-label="Cari nama siswa atau mitra industri"
                placeholder="Cari siswa atau mitra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
              />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl shrink-0 transition-colors w-full lg:w-auto"
                title="Reset semua filter"
              >
                <RotateCcw size={14} className="mr-1.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="bg-transparent overflow-hidden">
          {isMobile ? (
            <div className="p-4 space-y-4">
              <div className="flex justify-end mb-2">
                {toolbar}
              </div>
              <MobileAcademicList
                title="Daftar Siswa PKL"
                data={filteredData}
                loading={isLoading}
                totalItems={paginationProps?.totalItems || filteredData.length}
                emptyMessage="Belum ada data penempatan siswa PKL"
                pagination={paginationProps}
                renderCard={renderMobileCard}
              />
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredData}
              loading={isLoading}
              emptyMessage="Belum ada data penempatan siswa PKL"
              compact={true}
              pagination={paginationProps}
              toolbarRight={toolbar}
            />
          )}
        </div>
      </SectionCard>

      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"><Loader size="lg" /></div>}>
        <HubinPklPlottingModal
          isOpen={isPlottingOpen}
          onClose={() => {
            setIsPlottingOpen(false);
            setSelectedPkl(null);
            setSelectedSiswaId('');
            setSelectedMitraId('');
            setSelectedPembimbingId('');
          }}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          selectedSiswaId={selectedSiswaId}
          setSelectedSiswaId={setSelectedSiswaId}
          selectedMitraId={selectedMitraId}
          setSelectedMitraId={setSelectedMitraId}
          selectedPembimbingId={selectedPembimbingId}
          setSelectedPembimbingId={setSelectedPembimbingId}
          handlePlottingSubmit={handlePlottingSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          onGuruSearch={setGuruSearch}
          onMitraSearch={setMitraSearch}
          isLoadingGuru={isLoadingGuru}
          isLoadingMitra={isLoadingMitra}
          editingPkl={selectedPkl}
          filterJurusan={isKaprog && kaprogJurusan ? (kaprogJurusan.singkatan || kaprogJurusan.nama) : undefined}
        />
      </Suspense>

      <Suspense fallback={null}>
        {isMutasiOpen && (
          <HubinPklMutasiModal
            isOpen={isMutasiOpen}
            onClose={() => {
              setIsMutasiOpen(false);
              setSelectedMutasiPkl(null);
            }}
            row={selectedMutasiPkl}
            mitraOptions={mitraOptions}
            guruOptions={guruOptions}
            onSubmit={(data) => {
              if (selectedMutasiPkl) {
                mutasiMutation.mutate({ id: selectedMutasiPkl.id, data });
              }
            }}
            isPending={mutasiMutation.isPending}
            isLoadingMitra={isLoadingMitra}
            isLoadingGuru={isLoadingGuru}
            onGuruSearch={setGuruSearch}
            onMitraSearch={setMitraSearch}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklBulkPlottingModal
          isOpen={isBulkPlottingOpen}
          onClose={() => setIsBulkPlottingOpen(false)}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          placedStudentIds={placedStudentIds}
          onSubmit={handleBulkPlottingSubmit}
          isPending={bulkCreateMutation.isPending}
          onGuruSearch={setGuruSearch}
          onMitraSearch={setMitraSearch}
          isLoadingGuru={isLoadingGuru}
          isLoadingMitra={isLoadingMitra}
          filterJurusanId={isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined}
          jurusanNama={isKaprog && kaprogJurusan ? (kaprogJurusan.singkatan || kaprogJurusan.nama) : undefined}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklNilaiModal
          isOpen={isNilaiOpen}
          onClose={() => {
            setIsNilaiOpen(false);
            setSelectedPkl(null);
          }}
          selectedPkl={selectedPkl}
          handleNilaiSubmit={handleNilaiSubmit}
          isPending={nilaiMutation.isPending}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklKunjunganModal
          isOpen={isKunjunganOpen}
          onClose={() => {
            setIsKunjunganOpen(false);
            setSelectedPkl(null);
            setVisitFotoUrl('');
            setVisitLat('');
            setVisitLng('');
          }}
          selectedPkl={currentSelectedPkl}
          selectedKunjunganList={selectedKunjunganList}
          handleKunjunganSubmit={handleKunjunganSubmit}
          onDeleteKunjungan={handleDeleteKunjungan}
          isPending={kunjunganMutation.isPending || updateKunjunganMutation.isPending || deleteKunjunganMutation.isPending}
          isDetectingGps={isDetectingGps}
          setIsDetectingGps={setIsDetectingGps}
          visitLat={visitLat}
          setVisitLat={setVisitLat}
          visitLng={visitLng}
          setVisitLng={setVisitLng}
          visitFotoUrl={visitFotoUrl}
          setVisitFotoUrl={setVisitFotoUrl}
          onPrintMonitoring={(row) => {
            setSelectedMonitoringPkl(row);
            setIsMonitoringConfigModalOpen(true);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklReviewJurnalModal
          isOpen={isReviewJurnalOpen}
          onClose={() => {
            setIsReviewJurnalOpen(false);
            setSelectedPkl(null);
          }}
          selectedPkl={selectedPkl}
          reviewJurnalStatus={reviewJurnalStatus}
          setReviewJurnalStatus={setReviewJurnalStatus}
          reviewJurnalCatatan={reviewJurnalCatatan}
          setReviewJurnalCatatan={setReviewJurnalCatatan}
          reviewJurnalMutation={reviewJurnalMutation}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HubinPklPrintSurat
          printData={printData}
          printKolektifMitraId={printKolektifMitraId}
          tenantData={tenantData}
          collectiveStudents={collectiveStudents}
          representativeRow={representativeRow}
          printMode={printMode}
          monitoringConfig={monitoringPrintConfig}
        />
      </Suspense>

      <Suspense fallback={null}>
        {isMonitoringConfigModalOpen && selectedMonitoringPkl && (
          <HubinPklPrintMonitoringModal
            isOpen={isMonitoringConfigModalOpen}
            onClose={() => {
              setIsMonitoringConfigModalOpen(false);
              setSelectedMonitoringPkl(null);
            }}
            selectedPkl={selectedMonitoringPkl}
            onConfirmPrint={handleConfirmMonitoringPrint}
          />
        )}
      </Suspense>
    </>
  );


  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penempatan PKL Siswa"
      description="Optimalkan proses penempatan kerja lapangan. Plotting siswa ke mitra industri secara cerdas, tunjuk guru pembimbing, dan kelola periode PKL dalam satu manajemen terpusat."
    >
      <AcademicPageLayout
        title="Penempatan PKL"
        description="Plotting siswa ke mitra industri dan penunjukkan pembimbing"
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        hardeningModuleKey="hubin_penempatan_pkl"
        instruction={{
          title: "Panduan Penempatan PKL",
          description: "Kelola plotting penempatan praktek kerja lapangan siswa ke mitra industri.",
          items: [
            { text: "Pilih siswa dan mitra industri untuk melakukan plotting penempatan baru." },
            { text: "Tunjuk guru pembimbing untuk memonitor progres PKL siswa." },
            { text: "Input nilai, buat laporan kunjungan, dan lakukan review jurnal siswa secara berkala." }
          ]
        }}
      >
        {content}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

const PenempatanPklPage = React.memo(() => <PenempatanPklSection />);
export default PenempatanPklPage;
// Re-export types for backward compatibility
export type { SiswaData, MitraData, PembimbingData, SiswaPkl, CreatePenempatanPayload, PenilaianPayload, KunjunganPayload } from './types/penempatan.types';
