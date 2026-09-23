import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import { HubinJurnalStatus } from '../../constants/HubinConstants';
import { 
  ClipboardList, 
  CheckCircle2, 
  GraduationCap, 
  Building2, 
  UserPlus, 
  Users, 
  User 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { getMyTenant } from '../../api/tenants.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button } from '../../components/ui';
import { type TabOption } from '../../components/ui/TabSwitcher';
import { formatDate } from '../../utils/layoutUtils';
import useConfirm from '../../hooks/useConfirm';
import { getPenempatanColumns } from '../../components/hubin/HubinPklColumns';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { usePembimbingPklOptions } from '../../hooks/usePembimbingPklOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

import { PenempatanMobileCard } from '../../components/hubin/penempatan/PenempatanMobileCard';
import { PenempatanFilterBar } from '../../components/hubin/penempatan/PenempatanFilterBar';
import { usePenempatanActions } from '../../components/hubin/penempatan/usePenempatanActions';

const PenempatanModals = lazy(() => import('../../components/hubin/penempatan/PenempatanModals').then(m => ({ default: m.PenempatanModals })));

import type {
  SiswaData,
  MitraData,
  PembimbingData,
  SiswaPkl,
  CreatePenempatanPayload,
  MutasiPenempatanPayload,
  PenilaianPayload,
  KunjunganPayload
} from './types/penempatan.types';

export const PenempatanPklSection: React.FC = React.memo(() => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [guruSearch, setGuruSearch] = useState('');
  const [mitraSearch, setMitraSearch] = useState('');
  
  const { isHubin, isAdmin, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, can, activeGuruId: capActiveGuruId } = useCapabilities();
  const isGuru = useMemo(() => !!user?.isTeacher, [user]);
  
  const canManage = useMemo(() => {
    return isAdmin || isHubin || isKaprog || can('hubin.partners.manage') || can('hubin.pkl.manage');
  }, [isAdmin, isHubin, isKaprog, can]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_GUIDANCE'>((canManage || isWaliKelas) ? 'ALL' : 'MY_GUIDANCE');
  
  const isEnabled = subscription !== undefined;

  // Queries
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: !!user?.tenant_id
  });

  // Konteks Tahun Pelajaran, Kelas & Mitra Filter
  const { options: tpOptions, activeTahunPelajaran, isLoading: isLoadingTp } = useTahunPelajaranOptions();
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
    ...((rawMitra || [])?.map((m: MitraData) => ({ label: m.nama, value: m.id })).sort((a, b) => a.label.localeCompare(b.label)) || [])
  ], [rawMitra]);

  const { options: mitraOptions, isLoading: isLoadingMitra } = useDudiOptions(mitraSearch);

  // Hook for actions, mutations, and modal states
  const actions = usePenempatanActions({
    rawMitra,
    rawPenempatan,
    canManage,
    selectedTpFilter
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

  const allActiveList = useMemo(() => {
    return Array.isArray(allActivePenempatan?.data) ? allActivePenempatan.data : (allActivePenempatan as { data?: SiswaPkl[] })?.data || [];
  }, [allActivePenempatan]);

  const isActuallyPembimbing = useMemo(() => {
    if (!activeGuruId) return false;
    const list = allActiveList.length > 0 ? allActiveList : (rawPenempatan || []);
    return list.some((p: SiswaPkl) => p.pembimbing_id === activeGuruId);
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
        const kId = p.SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    return list.length;
  }, [allActiveList, rawPenempatan, isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog]);

  const showTabs = useMemo(() => {
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
        const kId = p.SiswaAkademik?.kelas_id || p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
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
    setSelectedKelasFilter(isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog ? walikelasKelas.id : '');
    setSearchTerm('');
    if (activeTahunPelajaran?.id) {
      setSelectedTpFilter(activeTahunPelajaran.id);
    }
    setPage(1);
  }, [activeTahunPelajaran, isWaliKelas, walikelasKelas, isAdmin, isHubin, isKaprog]);

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
        onClick={() => actions.setIsBulkPlottingOpen(true)}
        variant="toolbarOutline"
        size="toolbar"
        className="rounded-xl h-9 px-4 flex items-center gap-1.5"
      >
        <Users size={16} />
        Plotting Kolektif
      </Button>
      <Button
        onClick={() => {
          actions.setSelectedPkl(null);
          actions.setSelectedSiswaId('');
          actions.setSelectedMitraId('');
          actions.setSelectedPembimbingId('');
          actions.setIsPlottingOpen(true);
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

  // Unified row action handlers shared across Table columns and Mobile card
  const rowActionHandlers = useMemo(() => ({
    onNilai: (row: SiswaPkl) => {
      actions.setSelectedPkl(row);
      actions.setIsNilaiOpen(true);
    },
    onKunjungan: (row: SiswaPkl) => {
      actions.setSelectedPkl(row);
      actions.setIsKunjunganOpen(true);
    },
    onReviewJurnal: (row: SiswaPkl) => {
      actions.setSelectedPkl(row);
      actions.setReviewJurnalStatus(row.jurnal_json?.status === HubinJurnalStatus.REVISI ? HubinJurnalStatus.REVISI : HubinJurnalStatus.DISETUJUI);
      actions.setReviewJurnalCatatan(row.jurnal_json?.catatan_revisi || '');
      actions.setIsReviewJurnalOpen(true);
    },
    onCetakTugas: actions.handlePrintTugas,
    onCetakKolektif: actions.handlePrintKolektif,
    onPrintMonitoring: (row: SiswaPkl) => {
      actions.setSelectedMonitoringPkl(row);
      actions.setIsMonitoringConfigModalOpen(true);
    },
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
    onMutasi: (row: SiswaPkl) => {
      actions.setSelectedMutasiPkl(row);
      actions.setIsMutasiOpen(true);
    },
    onFilterSiswaHistory: (namaSiswa: string) => setSearchTerm(namaSiswa),
    onEditMitraKontak: actions.handleOpenEditMitraKontak
  }), [actions, confirm]);

  // Table Columns
  const columns = useMemo(() => getPenempatanColumns({
    rawMitra,
    canManage,
    hasKolektif,
    ...rowActionHandlers
  }), [rawMitra, canManage, hasKolektif, rowActionHandlers]);

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

  const renderMobileCard = useCallback((row: SiswaPkl) => (
    <PenempatanMobileCard
      key={row.id}
      row={row}
      rawMitra={rawMitra}
      canManage={canManage}
      hasKolektif={hasKolektif}
      {...rowActionHandlers}
    />
  ), [rawMitra, canManage, hasKolektif, rowActionHandlers]);

  const content = (
    <>
      <SectionCard title="Data Penempatan PKL Siswa" icon={ClipboardList} fullWidth noPadding>
        <PenempatanFilterBar
          isKaprog={isKaprog}
          kaprogJurusan={kaprogJurusan}
          isWaliKelas={isWaliKelas}
          walikelasKelas={walikelasKelas}
          isAdmin={isAdmin}
          isHubin={isHubin}
          canManage={canManage}
          overdueStudents={overdueStudents}
          isBatchCheckingOut={isBatchCheckingOut}
          onBatchCheckoutOverdue={handleBatchCheckoutOverdue}
          showTabs={showTabs}
          tabOptions={tabOptions}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'ALL' | 'MY_GUIDANCE')}
          tpFilterOptions={tpFilterOptions}
          selectedTpFilter={selectedTpFilter}
          onTpFilterChange={(val) => {
            setSelectedTpFilter(val);
            setPage(1);
          }}
          isLoadingTp={isLoadingTp}
          kelasFilterOptions={kelasFilterOptions}
          selectedKelasFilter={selectedKelasFilter}
          onKelasFilterChange={(val) => {
            setSelectedKelasFilter(val);
            setPage(1);
          }}
          isLoadingKelas={isLoadingKelas}
          mitraFilterOptions={mitraFilterOptions}
          selectedMitraFilter={selectedMitraFilter}
          onMitraFilterChange={(val) => {
            setSelectedMitraFilter(val);
            setPage(1);
          }}
          isLoadingRawMitra={isLoadingRawMitra}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
        />

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

      <Suspense fallback={null}>
        <PenempatanModals
          actions={actions}
          mitraOptions={mitraOptions}
          guruOptions={guruOptions}
          kelasOptions={kelasOptions}
          tpOptions={tpOptions}
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
          filterJurusan={isKaprog && kaprogJurusan ? (kaprogJurusan.singkatan || kaprogJurusan.nama) : undefined}
          canManage={canManage}
        />
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
export type { 
  SiswaData, 
  MitraData, 
  PembimbingData, 
  SiswaPkl, 
  CreatePenempatanPayload, 
  MutasiPenempatanPayload,
  PenilaianPayload, 
  KunjunganPayload 
} from './types/penempatan.types';
