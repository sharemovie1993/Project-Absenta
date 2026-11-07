import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '@/api/hubin.api';
import { HubinJurnalStatus } from '@/constants/HubinConstants';
import { 
  ClipboardList, 
  CheckCircle2, 
  GraduationCap, 
  Building2, 
  UserPlus, 
  Users, 
  User,
  FileSpreadsheet,
  Trash2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getMyTenant } from '@/api/tenants.api';
import { SectionCard, Table, Button } from '@/components/ui';
import { TabSwitcher, type TabOption } from '@/components/ui/TabSwitcher';
import { formatDate } from '@/utils/layoutUtils';
import useConfirm from '@/hooks/useConfirm';
import { getPenempatanColumns } from '@/components/hubin/HubinPklColumns';
import { useDudiOptions } from '@/hooks/useDudiOptions';
import { usePembimbingPklOptions } from '@/hooks/usePembimbingPklOptions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { HubCard } from '@/components/ui/hub';

import { PenempatanMobileCard } from './PenempatanMobileCard';
import { usePenempatanActions } from './usePenempatanActions';
import { cn } from '@/lib/utils';

const PenempatanModals = lazy(() => import('./PenempatanModals').then(m => ({ default: m.PenempatanModals })));

import type {
  SiswaData,
  MitraData,
  PembimbingData,
  SiswaPkl,
  CreatePenempatanPayload,
  MutasiPenempatanPayload,
  PenilaianPayload,
  KunjunganPayload
} from '@/pages/hubin/types/penempatan.types';

export interface UniversalPenempatanPklViewProps {
  // 1. Context & Scope Injections (Diinjeksi oleh Dashboard Role atau null untuk global)
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
  initialTab?: 'ALL' | 'MY_GUIDANCE';
  initialKelasId?: string;
  initialTpId?: string;

  // 2. Display Modifiers
  isModal?: boolean;       // True jika dirender dalam Modal dialog
  hideLayout?: boolean;    // True jika dirender dalam Tab (sembunyikan Topbar / Page Header duplikat)
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  hideTpFilter?: boolean;
  hideKelasFilter?: boolean;
  siswaList?: any[];
  mitraOptions?: { value: string; label: string }[];
  readOnly?: boolean;      // True jika user hanya memiliki hak pantau (misal: Kepsek / Pengawas)

  // 3. Event Callbacks
  onClose?: () => void;    // Callback penutup jika dipanggil dalam modal
  onNavigateDetail?: (id: string) => void;
  onOpenSiswaDetail?: (siswa: any) => void;
  className?: string;
}

export type PenempatanPklViewProps = UniversalPenempatanPklViewProps;

export const PenempatanPklView: React.FC<UniversalPenempatanPklViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  kelasNama: propKelasNama,
  guruId: propGuruId,
  tahunPelajaranId: propTpId,
  tahunAjaran: propTahunAjaran,
  semesterId: propSemesterId,
  initialTab,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  hideTpFilter = false,
  hideKelasFilter = false,
  siswaList: propSiswaList,
  mitraOptions: propMitraOptions,
  initialKelasId,
  initialTpId,
  onClose,
  onNavigateDetail,
  onOpenSiswaDetail,
  className
}) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [guruSearch, setGuruSearch] = useState('');
  const [mitraSearch, setMitraSearch] = useState('');
  
  const { isHubin, isAdmin, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, can, activeGuruId: capActiveGuruId } = useCapabilities();
  const isGuru = useMemo(() => !!user?.isTeacher, [user]);

  // Priority to explicit prop: allows summoning scoped view from Kaprog Dashboard
  const effectiveJurusanId = propJurusanId || (isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined);
  const effectiveJurusanNama = propJurusanNama || kaprogJurusan?.nama || 'Kejuruan';
  const isJurusanScoped = Boolean(effectiveJurusanId);
  
  const canManage = useMemo(() => {
    if (readOnly) return false;
    return isAdmin || isHubin || isKaprog || can('hubin.partners.manage') || can('hubin.pkl.manage');
  }, [readOnly, isAdmin, isHubin, isKaprog, can]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_GUIDANCE'>(
    initialTab || (propGuruId ? 'MY_GUIDANCE' : (canManage || isWaliKelas) ? 'ALL' : 'MY_GUIDANCE')
  );
  
  const isEnabled = subscription !== undefined;

  // Queries
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: !!user?.tenant_id
  });

  const isWaliKelasRestricted = Boolean(
    isWaliKelas &&
    walikelasKelas?.id &&
    !isAdmin &&
    !isHubin &&
    !isKaprog &&
    !propJurusanId &&
    initialTab !== 'MY_GUIDANCE' &&
    !propGuruId
  );

  // Standarisasi Academic Filter Engine (Pilar 21 & Pilar 31 SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: !hideTpFilter,
    enableKelas: !hideKelasFilter && !propKelasId,
    allowAllKelas: true,
    enableMitra: true,
    allowAllMitra: true,
    enableSearch: true,
    enableCohort: false,
    searchPlaceholder: 'Cari siswa atau mitra...',
    jurusanId: effectiveJurusanId,
    initialTpId: propTpId || initialTpId || '',
    initialKelasId: isWaliKelasRestricted ? walikelasKelas!.id : (propKelasId || initialKelasId || ''),
    isKelasDisabled: isWaliKelasRestricted || Boolean(propKelasId),
  });

  const selectedTpFilter = academicFilter.values.tahunPelajaranId;
  const selectedMitraFilter = academicFilter.values.mitraId;
  const selectedKelasFilter = academicFilter.values.kelasId;
  const searchTerm = academicFilter.values.searchQuery;

  // Khusus Wali Kelas: Otomatis kunci filter kelas ke kelas binaan
  useEffect(() => {
    if (isWaliKelasRestricted && walikelasKelas?.id && academicFilter.values.kelasId !== walikelasKelas.id) {
      academicFilter.setKelasId(walikelasKelas.id);
    }
  }, [isWaliKelasRestricted, walikelasKelas, academicFilter]);

  // Reset pagination saat filter berganti
  useEffect(() => {
    setPage(1);
  }, [selectedTpFilter, selectedMitraFilter, selectedKelasFilter, searchTerm]);

  // Integrated Custom Hooks (Pilar 31 Data Layer)
  const { options: guruOptions, isLoading: isLoadingGuru } = usePembimbingPklOptions();
  const rawGuru = useMemo(() => (guruOptions ?? [])?.map(g => (g.raw || {}) as PembimbingData), [guruOptions]);

  const activeGuruId = useMemo(() => {
    if (propGuruId) return propGuruId;
    if (capActiveGuruId) return capActiveGuruId;
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: PembimbingData) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [propGuruId, capActiveGuruId, rawGuru, user]);

  const effectiveKelasFilter = selectedKelasFilter || undefined;
  const effectivePembimbingFilter = (activeTab === 'MY_GUIDANCE' || propGuruId) && activeGuruId ? activeGuruId : undefined;

  const { data: penempatanData, isLoading } = useQuery({
    queryKey: ['penempatan-pkl', { 
      search: searchTerm, 
      page, 
      limit, 
      tahun_pelajaran_id: selectedTpFilter,
      mitra_id: selectedMitraFilter,
      kelas_id: effectiveKelasFilter,
      pembimbing_id: effectivePembimbingFilter,
      jurusan_id: effectiveJurusanId
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
      tahun_pelajaran_id: selectedTpFilter,
      jurusan_id: effectiveJurusanId
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

  const { options: mitraOptions, isLoading: isLoadingMitra } = useDudiOptions(mitraSearch);

  // Hook for actions, mutations, and modal states
  const actions = usePenempatanActions({
    rawMitra,
    rawPenempatan,
    canManage,
  });

  useEffect(() => {
    return () => {
      if (actions.printTimerRef.current) {
        clearTimeout(actions.printTimerRef.current);
      }
    };
  }, [actions.printTimerRef]);

  const placedStudentIds = useMemo(() => {
    const list = Array.isArray(allActivePenempatan?.data) ? allActivePenempatan.data : (allActivePenempatan as { data?: SiswaPkl[] })?.data || [];
    return new Set<string>(list.filter((p: SiswaPkl) => p.status === 'AKTIF')?.map((p: SiswaPkl) => p.siswa_id));
  }, [allActivePenempatan]);

  const allActiveList = useMemo(() => (Array.isArray(allActivePenempatan?.data) ? allActivePenempatan.data : (allActivePenempatan as { data?: SiswaPkl[] })?.data || []), [allActivePenempatan]);

  const isActuallyPembimbing = useMemo(() => {
    if (!activeGuruId) return false;
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    return list.some((p: SiswaPkl) => (p.pembimbing_id || p.Pembimbing?.id) === activeGuruId);
  }, [allActiveList, rawPenempatan, activeGuruId]);

  const myGuidanceCount = useMemo(() => {
    if (!activeGuruId) return 0;
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    return list.filter((p: SiswaPkl) => (p.pembimbing_id || p.Pembimbing?.id) === activeGuruId).length;
  }, [allActiveList, rawPenempatan, activeGuruId]);

  const allCount = useMemo(() => {
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    if (isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog && !propJurusanId) {
      return list.filter((p: SiswaPkl) => (p.SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || p.Siswa?.kelas_id) === walikelasKelas.id).length;
    }
    return list.length;
  }, [allActiveList, rawPenempatan, isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog, propJurusanId]);

  const showTabs = useMemo(() => {
    if (propGuruId) return false;
    return (canManage || isWaliKelas) && isActuallyPembimbing;
  }, [canManage, isWaliKelas, isActuallyPembimbing, propGuruId]);

  // Sync activeTab if tabs are hidden or propGuruId is injected
  useEffect(() => {
    if (propGuruId) {
      setActiveTab('MY_GUIDANCE');
      return;
    }
    if (!showTabs) {
      setActiveTab((canManage || isWaliKelas) ? 'ALL' : 'MY_GUIDANCE');
    }
  }, [showTabs, canManage, isWaliKelas, propGuruId]);

  const filteredData = useMemo(() => {
    let result = rawPenempatan || [];
    if (activeTab === 'MY_GUIDANCE' || propGuruId) {
      result = result.filter((p: SiswaPkl) => (p.pembimbing_id || p.Pembimbing?.id) === activeGuruId);
    }
    if (selectedMitraFilter) {
      result = result.filter((p: SiswaPkl) => p.mitra_id === selectedMitraFilter);
    }
    if (selectedKelasFilter && activeTab !== 'MY_GUIDANCE') {
      result = result.filter((p: SiswaPkl) => {
        const kId = p.SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
        return kId === selectedKelasFilter;
      });
    }
    return result.filter((p: SiswaPkl) => 
      p.Siswa?.nama_siswa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Mitra?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawPenempatan, searchTerm, activeTab, activeGuruId, selectedMitraFilter, selectedKelasFilter, propGuruId]);

  // Overdue Students calculation
  const overdueStudents = useMemo(() => {
    if (!rawPenempatan) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rawPenempatan.filter((p: SiswaPkl) => {
      if (p.status !== 'AKTIF' || !p.tanggal_selesai) return false;
      const endDate = new Date(p.tanggal_selesai);
      return endDate < today;
    });
  }, [rawPenempatan]);

  const [isBatchCheckingOut, setIsBatchCheckingOut] = useState(false);
  const handleBatchCheckoutOverdue = useCallback(async () => {
    if (overdueStudents.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Konfirmasi Penarikan Massal',
      description: `Apakah Anda yakin ingin menandai status SELESAI untuk ${overdueStudents.length} siswa yang jadwal PKL-nya telah berakhir?`,
      confirmText: 'Ya, Tandai Selesai',
      cancelText: 'Batal',
      style: 'warning'
    });

    if (isConfirmed) {
      setIsBatchCheckingOut(true);
      try {
        const todayStr = new Date().toISOString().substring(0, 10);
        await Promise.all(
          (overdueStudents ?? [])?.map(s =>
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
      } catch {
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

  // Ringkasan Statistik 4 KPI
  const statsList = useMemo(() => {
    const backendStats = (penempatanData as any)?.stats;
    const totalCount = backendStats?.total ?? pagination?.total ?? (rawPenempatan?.length || 0);
    const activeCount = backendStats?.active ?? (rawPenempatan?.filter((p: SiswaPkl) => p.status === 'AKTIF').length || 0);
    const finishedCount = backendStats?.finished ?? (rawPenempatan?.filter((p: SiswaPkl) => p.status === 'SELESAI').length || 0);
    const mitraCount = backendStats?.mitraCount ?? (Array.from(new Set((rawPenempatan ?? [])?.map((p: SiswaPkl) => p.mitra_id))).length || 0);

    return {
      totalCount,
      activeCount,
      finishedCount,
      mitraCount,
    };
  }, [penempatanData, pagination, rawPenempatan]);

  const handleBulkDelete = useCallback(async () => {
    if (actions.selectedRowKeys.size === 0) return;
    const count = actions.selectedRowKeys.size;
    const confirmed = await confirm({
      title: 'Hapus Penempatan Terpilih',
      description: `Apakah Anda yakin ingin menghapus ${count} penempatan PKL terpilih? Siswa yang dihapus penempatannya akan kembali ke status belum ter-plot.`,
      confirmText: `Hapus (${count})`,
      variant: 'danger',
      progressLabel: `Menghapus ${count} penempatan...`,
    });
    if (confirmed) {
      actions.bulkDeleteMutation.mutate(Array.from(actions.selectedRowKeys));
    }
  }, [confirm, actions.selectedRowKeys, actions.bulkDeleteMutation]);

  const toolbar = canManage ? (
    <div className="flex items-center gap-2">
      {actions.selectedRowKeys.size > 0 && (
        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 rounded-xl">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{actions.selectedRowKeys.size} dipilih</span>
          <Button onClick={handleBulkDelete} disabled={actions.bulkDeleteMutation.isPending} variant="destructive" size="sm" className="h-7 px-2 text-xs flex items-center gap-1">
            <Trash2 size={13} /> Hapus Terpilih
          </Button>
          <Button onClick={() => actions.setSelectedRowKeys(new Set())} variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700">
            Batal
          </Button>
        </div>
      )}
      <Button onClick={() => actions.setIsImportWizardOpen(true)} variant="toolbarOutline" size="toolbar" className="rounded-xl h-9 px-3.5 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
        <FileSpreadsheet size={16} /> Import Plotting Excel
      </Button>
      <Button onClick={() => actions.setIsBulkPlottingOpen(true)} variant="toolbarOutline" size="toolbar" className="rounded-xl h-9 px-4 flex items-center gap-1.5">
        <Users size={16} /> Plotting Kolektif
      </Button>
      <Button onClick={() => { actions.setSelectedPkl(null); actions.setSelectedSiswaId(''); actions.setSelectedMitraId(''); actions.setSelectedPembimbingId(''); actions.setIsPlottingOpen(true); }} variant="toolbarPrimary" size="toolbar" className="h-9 px-4 rounded-xl flex items-center gap-1.5">
        <UserPlus size={16} /> Plotting Baru
      </Button>
    </div>
  ) : null;

  // Unified row action handlers shared across Table columns and Mobile card
  const rowActionHandlers = useMemo(() => ({
    onNilai: (row: SiswaPkl) => { actions.setSelectedPkl(row); actions.setIsNilaiOpen(true); },
    onKunjungan: (row: SiswaPkl) => { actions.setSelectedPkl(row); actions.setIsKunjunganOpen(true); },
    onReviewJurnal: (row: SiswaPkl) => {
      actions.setSelectedPkl(row);
      actions.setReviewJurnalStatus(row.jurnal_json?.status === HubinJurnalStatus.REVISI ? HubinJurnalStatus.REVISI : HubinJurnalStatus.DISETUJUI);
      actions.setReviewJurnalCatatan(row.jurnal_json?.catatan_revisi || '');
      actions.setIsReviewJurnalOpen(true);
    },
    onCetakTugas: actions.handlePrintTugas,
    onCetakKolektif: actions.handlePrintKolektif,
    onPrintMonitoring: (row: SiswaPkl) => { actions.setSelectedMonitoringPkl(row); actions.setIsMonitoringConfigModalOpen(true); },
    onHapus: async (row: SiswaPkl) => {
      const isConfirmed = await confirm({
        title: 'Hapus Penempatan PKL',
        description: `Apakah Anda yakin ingin membatalkan plotting penempatan PKL untuk ${row.Siswa?.nama_siswa} di ${row.Mitra?.nama}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger'
      });
      if (isConfirmed) actions.deleteMutation.mutate(row.id);
    },
    onEdit: (row: SiswaPkl) => {
      actions.setSelectedPkl(row);
      actions.setSelectedSiswaId(row.siswa_id);
      actions.setSelectedMitraId(row.mitra_id);
      actions.setSelectedPembimbingId(row.pembimbing_id || '');
      actions.setIsPlottingOpen(true);
    },
    onMutasi: (row: SiswaPkl) => { actions.setSelectedMutasiPkl(row); actions.setIsMutasiOpen(true); },
    onFilterSiswaHistory: (namaSiswa: string) => academicFilter.setSearchQuery(namaSiswa),
    onEditMitraKontak: actions.handleOpenEditMitraKontak
  }), [actions, confirm, academicFilter]);

  const isPembimbingMode = activeTab === 'MY_GUIDANCE' || Boolean(propGuruId);

  // Jika dalam isPembimbingMode, tampilkan hanya mitra yang tertaut dengan pembimbing ini
  const scopedMitraOptions = useMemo(() => {
    if (!isPembimbingMode) return undefined;
    const map = new Map<string, string>();

    if (propMitraOptions && propMitraOptions.length > 0) {
      propMitraOptions.forEach(m => { if (m.value) map.set(m.value, m.label); });
    } else if (propSiswaList && propSiswaList.length > 0) {
      propSiswaList.forEach((s: any) => {
        const mId = s.mitra_id || s.Mitra?.id;
        const mName = s.nama_mitra || s.Mitra?.nama || s.Mitra?.nama_perusahaan;
        if (mId && mName && !map.has(mId)) map.set(mId, mName);
      });
    }

    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    if (list && list.length > 0) {
      const mentorList = activeGuruId 
        ? list.filter((p: SiswaPkl) => (p.pembimbing_id || p.Pembimbing?.id) === activeGuruId)
        : list;

      mentorList.forEach((p: SiswaPkl) => {
        const mId = p.mitra_id || p.Mitra?.id;
        const mName = p.Mitra?.nama || p.Mitra?.nama_perusahaan;
        if (mId && mName && !map.has(mId)) map.set(mId, mName);
      });
    }

    if (map.size === 0) return undefined;

    return [
      { value: '', label: 'Semua' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label }))
    ];
  }, [isPembimbingMode, propMitraOptions, propSiswaList, allActiveList, rawPenempatan, activeGuruId]);

  useEffect(() => {
    if (isPembimbingMode && scopedMitraOptions && scopedMitraOptions.length > 0 && selectedMitraFilter) {
      if (!scopedMitraOptions.some((m) => m.value === selectedMitraFilter)) {
        academicFilter.setMitraId('');
      }
    }
  }, [isPembimbingMode, scopedMitraOptions, selectedMitraFilter, academicFilter]);

  // Table Columns
  const columns = useMemo(() => getPenempatanColumns({
    rawMitra,
    canManage,
    hasKolektif,
    hidePembimbing: isPembimbingMode,
    isPembimbingMode,
    onOpenDetail: onOpenSiswaDetail,
    ...rowActionHandlers
  }), [rawMitra, canManage, hasKolektif, isPembimbingMode, onOpenSiswaDetail, rowActionHandlers]);

  // Visit history list calculation
  const currentSelectedPkl = useMemo(() => {
    if (!actions.selectedPkl) return null;
    return rawPenempatan?.find((p: SiswaPkl) => p.id === actions.selectedPkl?.id) || actions.selectedPkl;
  }, [actions.selectedPkl, rawPenempatan]);

  const selectedKunjunganList = useMemo(() => {
    if (!currentSelectedPkl || !Array.isArray(currentSelectedPkl.kunjungan_json)) return [];
    return currentSelectedPkl.kunjungan_json;
  }, [currentSelectedPkl]);

  const collectiveStudents = useMemo(() => {
    if (!actions.printKolektifMitraId || !rawPenempatan) return [];
    return rawPenempatan.filter((item: SiswaPkl) => item.mitra_id === actions.printKolektifMitraId);
  }, [actions.printKolektifMitraId, rawPenempatan]);

  const representativeRow = useMemo(() => {
    return collectiveStudents[0] || null;
  }, [collectiveStudents]);

  const tabOptions = useMemo((): TabOption[] => {
    const allLabel = isJurusanScoped 
      ? `Semua Siswa ${effectiveJurusanNama}` 
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
  }, [isGuru, isJurusanScoped, effectiveJurusanNama, isWaliKelas, walikelasKelas, allCount, myGuidanceCount]);

  const renderMobileCard = useCallback((row: SiswaPkl) => (
    <PenempatanMobileCard
      key={row.id}
      row={row}
      rawMitra={rawMitra}
      canManage={canManage}
      hasKolektif={hasKolektif}
      selectable={canManage}
      isSelected={actions.selectedRowKeys.has(row.id)}
      hidePembimbing={isPembimbingMode}
      isPembimbingMode={isPembimbingMode}
      onOpenDetail={onOpenSiswaDetail}
      onToggleSelect={(id) => {
        actions.setSelectedRowKeys((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      {...rowActionHandlers}
    />
  ), [rawMitra, canManage, hasKolektif, rowActionHandlers, actions.selectedRowKeys, actions.setSelectedRowKeys, isPembimbingMode, onOpenSiswaDetail]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 0. Modal Header jika dipanggil dalam dialog Modal */}
      {isModal && onClose && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Penempatan PKL Siswa {effectiveJurusanNama && isJurusanScoped ? `• ${effectiveJurusanNama}` : ''}
            </h3>
            <p className="text-xs text-slate-500">Pratinjau cepat penempatan &amp; pembimbing industri</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">Tutup</Button>
        </div>
      )}

      {/* 1. Header KPI Stats 1-Baris Hairline Strip (Shopee-Grade High-Density) */}
      {!hideHeaderStats && (
        <HubCard noPadding className="w-full">
          <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800/80 py-2 sm:py-2.5 text-center">
            <div className="px-1 min-w-0">
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
                {statsList.totalCount}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                Total
              </div>
            </div>
            <div className="px-1 min-w-0">
              <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {statsList.activeCount}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                Aktif
              </div>
            </div>
            <div className="px-1 min-w-0">
              <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 leading-none">
                {statsList.finishedCount}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                Selesai
              </div>
            </div>
            <div className="px-1 min-w-0">
              <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-none">
                {statsList.mitraCount}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                Mitra
              </div>
            </div>
          </div>
        </HubCard>
      )}

      {/* 2. Main Section Card Konten Plotting PKL */}
      <SectionCard 
        title={isModal || hideLayout ? undefined : "Data Penempatan PKL Siswa"} 
        icon={isModal || hideLayout ? undefined : ClipboardList} 
        fullWidth 
        noPadding
        className={cn((isModal || hideLayout) && "!border-0 !shadow-none !bg-transparent")}
      >
        {/* Banner Khusus Kaprog: Unit Terkunci (Hanya pada halaman mandiri Hubin, bukan di modal/dashboard) */}
        {isJurusanScoped && !isModal && !hideScopeBanner && (
          <div className="mx-4 mt-4 flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
              <span>
                Data penempatan dibatasi otomatis untuk Jurusan{' '}
                <strong>{effectiveJurusanNama}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Banner Khusus Wali Kelas: Kelas Terkunci (Hanya pada halaman mandiri) */}
        {isWaliKelasRestricted && !isModal && !hideScopeBanner && (
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
        {overdueStudents?.length > 0 && canManage && (
          <div className="mx-3 sm:mx-4 mt-3 flex items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 rounded-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 min-w-0">
              <Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>{overdueStudents.length} siswa</strong> habis masa PKL
              </span>
            </div>
            <Button
              type="button"
              size="xs"
              variant="warning"
              onClick={handleBatchCheckoutOverdue}
              disabled={isBatchCheckingOut}
              className="shrink-0 h-7 px-2.5 text-[11px] font-bold rounded-lg shadow-2xs cursor-pointer"
            >
              {isBatchCheckingOut ? 'Memproses...' : `Selesaikan (${overdueStudents.length})`}
            </Button>
          </div>
        )}

        {/* Tab Filters (Semua Penempatan / Bimbingan Saya) */}
        {showTabs && (
          <div className="px-4 pt-4 w-full flex justify-start overflow-x-auto no-scrollbar flex-nowrap">
            <div className="whitespace-nowrap">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'ALL' | 'MY_GUIDANCE')}
              />
            </div>
          </div>
        )}

        {/* Standarisasi Academic Filter Engine Toolbar (Varian Mini Ramping di HP) */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            mitraOptions={scopedMitraOptions || academicFilter.toolbarProps.mitraOptions}
            variant={isMobile ? 'mini' : 'plain'}
            className="!p-0 !border-0 !shadow-none !bg-transparent"
          />
        </div>

        <div className="bg-transparent overflow-hidden">
          {isMobile ? (
            <div className="p-3 sm:p-4 space-y-3">
              {/* Responsive Mobile Action Toolbar */}
              {canManage && (
                <div className="space-y-2">
                  {actions.selectedRowKeys.size > 0 && (
                    <div className="flex items-center justify-between gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-xl">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        {actions.selectedRowKeys.size} dipilih
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={handleBulkDelete}
                          disabled={actions.bulkDeleteMutation.isPending}
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Hapus
                        </Button>
                        <Button
                          onClick={() => actions.setSelectedRowKeys(new Set())}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-500"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 w-full">
                    <Button
                      onClick={() => {
                        actions.setSelectedPkl(null);
                        actions.setSelectedSiswaId('');
                        actions.setSelectedMitraId('');
                        actions.setSelectedPembimbingId('');
                        actions.setIsPlottingOpen(true);
                      }}
                      variant="primary"
                      size="sm"
                      className="h-8 px-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
                    >
                      <UserPlus size={13} className="shrink-0" />
                      <span>Plot Baru</span>
                    </Button>
                    <Button
                      onClick={() => actions.setIsBulkPlottingOpen(true)}
                      variant="outline"
                      size="sm"
                      className="h-8 px-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap"
                    >
                      <Users size={13} className="shrink-0" />
                      <span>Kolektif</span>
                    </Button>
                    <Button
                      onClick={() => actions.setIsImportWizardOpen(true)}
                      variant="outline"
                      size="sm"
                      className="h-8 px-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs whitespace-nowrap"
                    >
                      <FileSpreadsheet size={13} className="shrink-0" />
                      <span>Excel</span>
                    </Button>
                  </div>
                </div>
              )}

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
              rowKey="id"
              selectedRowKeys={actions.selectedRowKeys}
              onSelectedRowKeysChange={actions.setSelectedRowKeys}
              pagination={paginationProps}
              toolbarRight={toolbar}
            />
          )}
        </div>
      </SectionCard>

      {/* Modals Subsystem */}
      <Suspense fallback={null}>
        <PenempatanModals
          actions={actions}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          kelasOptions={academicFilter.kelasOptions.filter(k => k.value !== '')}
          tpOptions={academicFilter.tpOptions.filter(t => t.value !== '')}
          placedStudentIds={placedStudentIds}
          tenantData={tenantData}
          collectiveStudents={collectiveStudents}
          representativeRow={representativeRow}
          currentSelectedPkl={currentSelectedPkl}
          selectedKunjunganList={selectedKunjunganList}
          setGuruSearch={setGuruSearch}
          setMitraSearch={setMitraSearch}
          isLoadingGuru={isLoadingGuru}
          isLoadingMitra={isLoadingMitra}
          selectedTpFilter={selectedTpFilter}
          filterJurusan={isJurusanScoped ? effectiveJurusanNama : undefined}
          filterJurusanId={effectiveJurusanId}
          canManage={canManage}
          rawMitra={rawMitra}
        />
      </Suspense>
    </div>
  );
});

PenempatanPklView.displayName = 'PenempatanPklView';
