import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  BookOpen,
  Sparkles,
  Edit3,
  Wand2,
  Trash2,
  Check,
  LayoutGrid,
  List,
  Search,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Card, Button, Badge, SectionCard, TabSwitcher } from '@/components/ui';
import { Table, Column } from '@/components/ui/Table';
import { kurikulumApi } from '@/api/kurikulum.api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useAuthStore } from '@/store/authStore';
import useConfirm from '@/hooks/useConfirm';
import { useJenjang } from '@/hooks/useJenjang';
import { useMapelOptions, useGuruOptions } from '@/components/common';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

import {
  uploadPerangkatSchema,
  reviewPerangkatSchema,
  generateAIPerangkatSchema,
  saveAIPerangkatSchema,
} from './perangkatAjarSchemas';

import { PerangkatAjarGridCard } from './PerangkatAjarGridCard';
import { getPerangkatAjarTableColumns } from './perangkatAjarTableColumns';
import { PerangkatAjarModals } from './PerangkatAjarModals';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { usePerangkatAjarMutations } from './usePerangkatAjarMutations';
import { Subject, Teacher, JENIS_LABELS, PerangkatAjar } from './perangkatAjarTypes';

const hardeningModuleKey = 'perangkat_ajar_page';

export interface UniversalPerangkatAjarViewProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  guruId?: string;
  mapelId?: string;
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  roleContext?: 'GURU' | 'KURIKULUM' | 'AUTO';
  onClose?: () => void;
}

export const PerangkatAjarView: React.FC<UniversalPerangkatAjarViewProps> = React.memo(({
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  guruId: propGuruId,
  mapelId: propMapelId,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  roleContext = 'AUTO',
  onClose,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const { isKurikulum, isAdmin, can } = useCapabilities();
  const isMobile = useIsMobile();

  // 🛡️ Isolasi Konteks Peran (Mematuhi universal-role-ready-view)
  // Ketika berada di Dashboard Guru (propGuruId terisi atau roleContext='GURU'),
  // fitur supervisi/approval kurikulum & filter guru lain dinonaktifkan secara ketat.
  const isGuruContext = useMemo(() => {
    if (roleContext === 'GURU') return true;
    if (roleContext === 'KURIKULUM') return false;
    return Boolean(propGuruId);
  }, [roleContext, propGuruId]);

  const isKurikulumOrAdmin = useMemo(() => {
    if (isGuruContext) return false;
    return isAdmin || isKurikulum || (typeof can === 'function' && can('academic.manage.academic'));
  }, [isGuruContext, isAdmin, isKurikulum, can]);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null);

  // Word Editor Modal States
  const [isWordEditorOpen, setIsWordEditorOpen] = useState(false);
  const [selectedWordEditItem, setSelectedWordEditItem] = useState<{
    id?: string;
    judul: string;
    jenis: string;
    mapel_id?: string;
    guru_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    html_content?: string;
    status?: string;
  } | null>(null);

  const handleOpenWordEditor = useCallback((item: PerangkatAjar) => {
    setSelectedWordEditItem({
      id: item.id,
      judul: item.judul,
      jenis: item.jenis,
      mapel_id: item.Mapel?.id,
      guru_id: item.Guru?.id,
      tahun_pelajaran_id: item.TahunPelajaran?.id,
      semester_id: item.Semester?.id,
      status: item.status,
    });
    setIsWordEditorOpen(true);
  }, []);

  // Reader Mode State
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
  const [readerPerangkatId, setReaderPerangkatId] = useState('');

  const handleOpenReader = useCallback((item: PerangkatAjar) => {
    setReaderPerangkatId(item.id);
    setIsReaderModalOpen(true);
  }, []);

  // Studio Modul Ajar (Per-Pertemuan) State
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [studioPerangkat, setStudioPerangkat] = useState<PerangkatAjar | null>(null);

  const handleOpenStudio = useCallback((item: PerangkatAjar) => {
    setStudioPerangkat(item);
    setIsStudioModalOpen(true);
  }, []);

  // View & Pagination States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  // Library Katalog Filter States
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryJenisFilter, setLibraryJenisFilter] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // AI Generator States
  const [aiForm, setAiForm] = useState({
    jenis: 'MODUL_AJAR',
    mapel_id: '',
    kelas: 'X',
    topik: '',
    alokasi_waktu: '2 x 45 Menit',
  });
  const [generatedAIContent, setGeneratedAIContent] = useState('');

  // Upload & Review Form States
  const [uploadForm, setUploadForm] = useState<{
    judul: string;
    jenis: string;
    mapel_id: string;
    guru_id: string;
    file: File | null;
  }>({
    judul: '',
    jenis: '',
    mapel_id: '',
    guru_id: '',
    file: null,
  });

  const [reviewForm, setReviewForm] = useState<{
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  }>({
    status: 'APPROVED',
    catatan_reviewer: '',
  });

  // ── Konteks Akademik Terpusat (AcademicFilterToolbar SSOT) ──
  const academicFilter = useAcademicFilter({
    enableTp: !hideLayout,
    enableSemester: !hideLayout,
    enableGuru: !isGuruContext && isKurikulumOrAdmin,
    enableMapel: true,
    enableSearch: true,
    initialTpId: propTpId,
    initialSemesterId: propSemId,
    initialGuruId: propGuruId,
    initialMapelId: propMapelId,
  });

  const activeTpId = propTpId || academicFilter.values.tahunPelajaranId;
  const activeSemId = propSemId || academicFilter.values.semesterId;
  const userGuruProfileId = (user?.guru_profile as { id?: string })?.id;
  const activeGuruId = isGuruContext ? (propGuruId || userGuruProfileId || currentGuru?.id) : (propGuruId || academicFilter.values.guruId);
  const activeMapelId = propMapelId || academicFilter.values.mapelId;
  const activeSearch = academicFilter.debouncedSearchQuery;

  // 🛡️ Academic Context Guard: Deteksi apakah user sedang melihat tahun ajaran arsip/lampau
  const isViewingArchiveYear = Boolean(
    academicFilter.activeAcademicYear?.id &&
    activeTpId &&
    academicFilter.activeAcademicYear.id !== activeTpId
  );

  const { options: canonicalMapelOptions, rawList: mapelRawList } = useMapelOptions();
  const { options: canonicalGuruOptions, rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });

  const currentGuru = useMemo(() => {
    return (guruRawList || [])?.find((g) => g.user_id === user?.id || g.id === (user?.guru_profile as { id?: string })?.id);
  }, [guruRawList, user]);

  const { data: teacherAssignedMapels } = useQuery({
    queryKey: ['guru-assigned-mapels', currentGuru?.id],
    queryFn: () => currentGuru?.id ? kurikulumApi.getGuruMapel(currentGuru.id).catch(() => null) : null,
    enabled: !!currentGuru?.id,
  });

  const teacherMapelIds = useMemo(() => {
    const list = teacherAssignedMapels?.data || [];
    return list?.map((m: { id: string; mapel_id?: string; Mapel?: { id: string } }) => m.mapel_id || m.Mapel?.id || m.id);
  }, [teacherAssignedMapels]);

  const filterStatus = useMemo(() => {
    return activeTab === 'ALL' ? '' : activeTab;
  }, [activeTab]);

  const { data: listPerangkat, isLoading } = useQuery({
    queryKey: [
      'perangkat-ajar-list',
      activeTpId,
      activeSemId,
      activeGuruId,
      filterStatus,
      filterJenis,
      activeMapelId,
      activeSearch,
      page,
      limit,
    ],
    queryFn: () =>
      kurikulumApi.getPerangkatAjar({
        tahun_pelajaran_id: activeTpId || undefined,
        semester_id: activeSemId || undefined,
        guru_id: activeGuruId || undefined,
        search: activeSearch || undefined,
        status: filterStatus || undefined,
        jenis: filterJenis || undefined,
        mapel_id: activeMapelId || undefined,
        page,
        limit,
      }),
  });

  const { data: allPerangkatForStats } = useQuery({
    queryKey: ['perangkat-ajar-stats-all', activeTpId, activeSemId, isGuruContext ? activeGuruId : 'all'],
    queryFn: () =>
      kurikulumApi.getPerangkatAjar({
        tahun_pelajaran_id: activeTpId || undefined,
        semester_id: activeSemId || undefined,
        guru_id: isGuruContext ? (activeGuruId || undefined) : undefined,
        limit: 1000,
      }),
  });

  const { jenjang } = useJenjang();

  const { data: libraryTemplatesData, isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['perangkat-library-templates', librarySearch, libraryJenisFilter, isAIModalOpen, isWizardModalOpen, jenjang],
    queryFn: () =>
      kurikulumApi.getLibraryTemplates({
        jenjang: jenjang || 'SMK',
        nama_mapel: librarySearch || undefined,
        jenis: libraryJenisFilter || undefined,
        search: librarySearch || undefined,
        limit: 200,
      }),
    enabled: isLibraryModalOpen || isAIModalOpen || isWizardModalOpen,
  });

  const selectedMapelForAI = useMemo(() => {
    return (mapelRawList || []).find((m) => m.id === aiForm.mapel_id);
  }, [mapelRawList, aiForm.mapel_id]);

  React.useEffect(() => {
    const list = mapelRawList || [];
    if (!aiForm.mapel_id && list.length > 0) {
      setAiForm((prev) => ({ ...prev, mapel_id: list[0].id }));
    }
  }, [mapelRawList, aiForm.mapel_id]);

  const selectedMapelNameClean = useMemo(() => {
    if (!selectedMapelForAI?.nama_mapel) return undefined;
    return selectedMapelForAI.nama_mapel.replace(/\s*\([^)]*\)/g, '').trim();
  }, [selectedMapelForAI]);

  const selectedTingkatFromKelas = useMemo(() => {
    const k = String(aiForm.kelas || '').toUpperCase();
    if (k.includes('XI') || k.includes('11')) return 11;
    if (k.includes('XII') || k.includes('12')) return 12;
    if (k.includes('X') || k.includes('10')) return 10;
    if (k.includes('IX') || k.includes('9')) return 9;
    if (k.includes('VIII') || k.includes('8')) return 8;
    if (k.includes('VII') || k.includes('7')) return 7;
    return undefined;
  }, [aiForm.kelas]);

  const { data: aiPresetsData } = useQuery({
    queryKey: ['perangkat-topik-presets', selectedMapelNameClean, selectedTingkatFromKelas],
    queryFn: () =>
      kurikulumApi.getTopikPresets({
        mapel_name: selectedMapelNameClean,
        tingkat: selectedTingkatFromKelas,
      }),
    enabled: (isAIModalOpen || isWizardModalOpen) && !!selectedMapelNameClean,
  });

  const stats = useMemo(() => {
    const items: PerangkatAjar[] = allPerangkatForStats?.data ?? [];
    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'PENDING').length,
      approved: items.filter((i) => i.status === 'APPROVED').length,
      rejected: items.filter((i) => i.status === 'REJECTED').length,
    };
  }, [allPerangkatForStats]);

  const {
    uploadMutation,
    uploadProgress,
    reviewMutation,
    deleteMutation,
    bulkDeleteMutation,
    handleBulkDelete,
    claimMutation,
    generateAIMutation,
    saveAIMutation,
  } = usePerangkatAjarMutations({
    queryClient,
    setIsUploadModalOpen,
    setUploadForm,
    setIsReviewModalOpen,
    setSelectedPerangkatId,
    selectedRowKeys,
    setSelectedRowKeys,
    setClaimingId,
    setIsLibraryModalOpen,
    setGeneratedAIContent,
    JENIS_LABELS,
    aiForm,
    isWizardModalOpen,
    setIsWizardModalOpen,
    setSelectedWordEditItem,
    currentGuru,
    activeYear: academicFilter.activeTpYear,
    activeSemester: academicFilter.activeSemester,
    setIsWordEditorOpen,
    setIsAIModalOpen,
    setActiveTab,
    setFilterJenis,
    setFilterMapel: academicFilter.setMapelId,
    setPage,
  });

  const filterJenisOptions = useMemo(
    () => [
      { label: 'Semua Jenis Berkas', value: '' },
      { label: 'Modul Ajar', value: 'MODUL_AJAR' },
      { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
      { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
      { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
      { label: 'Program Semester (PROMES)', value: 'PROMES' },
      { label: 'KKTP', value: 'KKTP' },
      { label: 'RPP / Modul Ajar Legacy', value: 'RPP' },
      { label: 'Silabus Legacy', value: 'SILABUS' },
    ],
    []
  );

  const mapelOptions = useMemo(() => {
    if (teacherMapelIds.length > 0) {
      const teacherMapels = canonicalMapelOptions.filter((m) => teacherMapelIds.includes(m.value));
      if (teacherMapels.length > 0) return teacherMapels;
    }
    return canonicalMapelOptions;
  }, [canonicalMapelOptions, teacherMapelIds]);

  const handleOpenUploadModal = useCallback(() => {
    setUploadForm({
      judul: '',
      jenis: '',
      mapel_id: teacherMapelIds.length > 0 ? teacherMapelIds[0] : mapelOptions[0]?.value || '',
      guru_id: currentGuru?.id || '',
      file: null,
    });
    setIsUploadModalOpen(true);
  }, [currentGuru, teacherMapelIds, mapelOptions]);

  const handleCreateNewStudio = useCallback(() => {
    setStudioPerangkat({
      id: 'new',
      judul: 'Modul Ajar Mandiri Guru',
      jenis: 'MODUL_AJAR',
      fase: 'E',
      tingkat: 10,
      mapel_id: teacherMapelIds[0] || (mapelOptions[0]?.value as string) || '',
      guru_id: currentGuru?.id || '',
      status: 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      Mapel: { id: teacherMapelIds[0] || '', nama_mapel: mapelOptions[0]?.label || 'Mata Pelajaran' } as Record<string, unknown>,
    } as Record<string, unknown>);
    setIsStudioModalOpen(true);
  }, [teacherMapelIds, mapelOptions, currentGuru]);

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Hapus Perangkat Ajar',
        message: 'Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.',
        confirmText: 'Hapus',
        style: 'danger',
      });
      if (ok) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation]
  );

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveGuruId = uploadForm.guru_id || (isGuruContext ? currentGuru?.id : '') || currentGuru?.id || '';
    const submitPayload = { ...uploadForm, guru_id: effectiveGuruId };
    const result = uploadPerangkatSchema.safeParse(submitPayload);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    const validData = result.data;
    const formData = new FormData();
    formData.append('judul', validData.judul);
    formData.append('jenis', validData.jenis);
    formData.append('mapel_id', validData.mapel_id);
    formData.append('guru_id', validData.guru_id);
    
    // 🛡️ Academic Context Hardening: Selalu alokasikan dokumen baru ke Periode Aktif
    const targetTpId = academicFilter.activeAcademicYear?.id || activeTpId;
    const targetSemId = academicFilter.activeSemester?.id || activeSemId;
    if (targetTpId) formData.append('tahun_pelajaran_id', targetTpId);
    if (targetSemId) formData.append('semester_id', targetSemId);
    if (validData.file) formData.append('file', validData.file);

    uploadMutation.mutate(formData);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerangkatId) return;

    const result = reviewPerangkatSchema.safeParse(reviewForm);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    reviewMutation.mutate({ id: selectedPerangkatId, data: result.data });
  };

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = generateAIPerangkatSchema.safeParse(aiForm);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    const targetMapel = mapelRawList?.find((m) => m.id === result.data.mapel_id);
    if (!targetMapel) {
      toast.error('Pilih mata pelajaran yang valid terlebih dahulu');
      return;
    }

    generateAIMutation.mutate({
      jenis: result.data.jenis,
      mapel_name: targetMapel.nama_mapel,
      kelas: result.data.kelas,
      topik: result.data.topik,
      alokasi_waktu: result.data.alokasi_waktu,
    });
  };

  const handleAISave = () => {
    // 🛡️ Academic Context Hardening: Alokasikan AI draft ke Periode Aktif
    const targetTpId = academicFilter.activeAcademicYear?.id || activeTpId;
    const targetSemId = academicFilter.activeSemester?.id || activeSemId;

    const rawPayload = {
      judul: `${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} - ${aiForm.topik}`,
      jenis: aiForm.jenis,
      mapel_id: aiForm.mapel_id,
      guru_id: currentGuru?.id,
      tahun_pelajaran_id: targetTpId || '',
      semester_id: targetSemId || '',
      html_content: generatedAIContent,
    };

    const result = saveAIPerangkatSchema.safeParse(rawPayload);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    saveAIMutation.mutate(result.data);
  };

  const academicStats = useMemo(
    () => [
      {
        title: 'Total Berkas',
        value: stats.total,
        icon: <FileText className="h-4 w-4 text-white" />,
        gradient: 'from-blue-500 to-indigo-600',
        subtitle: 'Diajukan oleh guru',
      },
      {
        title: 'Perlu Review',
        value: stats.pending,
        icon: <Clock className="h-4 w-4 text-white" />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Menunggu persetujuan',
      },
      {
        title: 'Disetujui',
        value: stats.approved,
        icon: <CheckCircle className="h-4 w-4 text-white" />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Lolos verifikasi',
      },
      {
        title: 'Perlu Revisi',
        value: stats.rejected,
        icon: <XCircle className="h-4 w-4 text-white" />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Ditolak & butuh revisi',
      },
    ],
    [stats]
  );

  const tabOptions = useMemo(
    () => [
      { id: 'ALL', label: 'Semua Berkas', icon: FileText, colorClass: 'text-blue-600 dark:text-blue-400' },
      {
        id: 'PENDING',
        label: isGuruContext ? 'Menunggu Verifikasi' : 'Perlu Review',
        icon: Clock,
        colorClass: 'text-amber-600 dark:text-amber-400'
      },
      { id: 'APPROVED', label: 'Disetujui', icon: CheckCircle, colorClass: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'REJECTED', label: 'Perlu Revisi', icon: XCircle, colorClass: 'text-rose-600 dark:text-rose-400' },
    ],
    [isGuruContext]
  );

  const tableColumns = useMemo(
    () =>
      getPerangkatAjarTableColumns({
        page,
        limit,
        JENIS_LABELS,
        currentGuru,
        isKurikulumOrAdmin,
        isGuruContext,
        handleOpenStudio,
        handleOpenReader,
        handleOpenWordEditor,
        setSelectedPerangkatId,
        setIsReviewModalOpen,
        handleDelete,
      }),
    [
      page,
      limit,
      currentGuru,
      isKurikulumOrAdmin,
      isGuruContext,
      handleOpenStudio,
      handleOpenReader,
      handleOpenWordEditor,
      setSelectedPerangkatId,
      setIsReviewModalOpen,
      handleDelete,
    ]
  );

  const content = (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      {/* 🛡️ Mode Arsip Historis Alert Banner */}
      {isViewingArchiveYear && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Mode Arsip Dokumen:</strong> Anda sedang meninjau perangkat ajar untuk tahun pelajaran non-aktif ({academicFilter.selectedTahunPelajaranNama || 'Lampau'}). Dokumen baru yang diunggah/dibuat otomatis akan dialokasikan ke Periode Akademik Aktif ({academicFilter.activeAcademicYear?.tahun || 'Aktif'}).
          </span>
        </div>
      )}

      {/* 1. Status Filter Tabs */}
      <TabSwitcher
        options={tabOptions}
        activeTab={activeTab}
        onChange={(id) => {
          setActiveTab(id as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED');
          setPage(1);
        }}
      />

      {/* 2. Unified Filter Toolbar (SSOT) */}
      <SectionCard fullWidth noPadding>
        <div className="p-3 sm:p-4 space-y-3">
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="plain"
            searchPlaceholder={
              isGuruContext
                ? "Cari judul berkas atau topik pembelajaran..."
                : "Cari judul perangkat, topik, atau nama guru..."
            }
            actionsRight={
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Jenis Dokumen */}
                <div className="w-40 sm:w-44">
                  <SearchableSelect
                    value={filterJenis}
                    onValueChange={(v) => {
                      setFilterJenis(v);
                      setPage(1);
                    }}
                    options={filterJenisOptions}
                    placeholder="Jenis Berkas"
                    triggerClassName="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                    title="Tampilan Grid Kartu"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                {/* 1. Tombol Utama: Unggah Berkas */}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleOpenUploadModal}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs h-9 px-3.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Berkas</span>
                </Button>

                {/* 2. Studio Modul Ajar */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNewStudio}
                  className="rounded-xl text-xs font-bold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-9 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Studio Modul</span>
                </Button>

                {/* 3. Menu Alat Bantu & AI Generator (Clean Ergonomic Dropdown) */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsToolsMenuOpen(prev => !prev)}
                    className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="hidden md:inline">Alat Bantu &amp; AI</span>
                    <ChevronDown size={13} className={cn("transition-transform text-slate-400", isToolsMenuOpen && "rotate-180")} />
                  </Button>

                  {isToolsMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsToolsMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsAIModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 transition-colors text-left cursor-pointer"
                        >
                          <Sparkles size={15} className="text-purple-600 shrink-0" />
                          <div>
                            <div className="font-bold">AI Generator Modul</div>
                            <div className="text-[10px] text-slate-400 font-normal">Buat modul via asisten AI</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsLibraryModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          <BookOpen size={15} className="text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-bold">Katalog Nasional</div>
                            <div className="text-[10px] text-slate-400 font-normal">Adopsi template Kemdikbud</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setIsWizardModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors text-left cursor-pointer"
                        >
                          <Wand2 size={15} className="text-amber-600 shrink-0" />
                          <div>
                            <div className="font-bold">Wizard (Bulk)</div>
                            <div className="text-[10px] text-slate-400 font-normal">Generate perangkat massal</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
          />
        </div>

        {/* 3. Batch Action Bar */}
        {selectedRowKeys.size > 0 && isKurikulumOrAdmin && (
          <div className="mx-4 mb-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between animate-in fade-in">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {selectedRowKeys.size} berkas terpilih
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="rounded-lg text-xs gap-1.5 h-8"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </Button>
          </div>
        )}

        {/* 4. Data Content: Table or Grid */}
        <div className="p-4 pt-0">
          {viewMode === 'grid' && !isMobile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {(listPerangkat?.data || []).map((item: PerangkatAjar) => (
                <PerangkatAjarGridCard
                  key={item.id}
                  item={item}
                  JENIS_LABELS={JENIS_LABELS}
                  currentGuru={currentGuru}
                  isKurikulumOrAdmin={isKurikulumOrAdmin}
                  handleOpenStudio={handleOpenStudio}
                  handleOpenReader={handleOpenReader}
                  handleOpenWordEditor={handleOpenWordEditor}
                  setSelectedPerangkatId={setSelectedPerangkatId}
                  setIsReviewModalOpen={setIsReviewModalOpen}
                  handleDelete={handleDelete}
                />
              ))}
            </div>
          ) : isMobile ? (
            <MobileAcademicList
              data={listPerangkat?.data || []}
              isLoading={isLoading}
              titleKey="judul"
              badgeKey="jenis"
              subtitleKey="nama_guru"
              metaKey="nama_mapel"
              emptyMessage="Belum ada perangkat ajar"
              onItemClick={(item) => handleOpenReader(item)}
            />
          ) : (
            <Table
              data={listPerangkat?.data || []}
              columns={tableColumns}
              isLoading={isLoading}
              pagination={{
                currentPage: page,
                totalPages: listPerangkat?.totalPages || 1,
                totalItems: listPerangkat?.total || 0,
                itemsPerPage: limit,
                onPageChange: (newPage) => setPage(newPage),
                onItemsPerPageChange: (newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                },
              }}
              selectable={isKurikulumOrAdmin}
              selectedRowKeys={selectedRowKeys}
              onSelectRows={setSelectedRowKeys}
            />
          )}
        </div>
      </SectionCard>

      {/* 5. Submodals Hub */}
      <PerangkatAjarModals
        isUploadModalOpen={isUploadModalOpen}
        setIsUploadModalOpen={setIsUploadModalOpen}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        handleUploadSubmit={handleUploadSubmit}
        uploadMutation={uploadMutation}
        uploadProgress={uploadProgress}
        isGuruContext={isGuruContext}
        currentTeacherName={currentGuru?.nama_guru}
        uploadLoading={uploadMutation.isPending}
        isReviewModalOpen={isReviewModalOpen}
        setIsReviewModalOpen={setIsReviewModalOpen}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        handleReviewSubmit={handleReviewSubmit}
        reviewMutation={reviewMutation}
        reviewLoading={reviewMutation.isPending}
        isLibraryModalOpen={isLibraryModalOpen}
        setIsLibraryModalOpen={setIsLibraryModalOpen}
        librarySearch={librarySearch}
        setLibrarySearch={setLibrarySearch}
        libraryJenisFilter={libraryJenisFilter}
        setLibraryJenisFilter={setLibraryJenisFilter}
        libraryTemplatesData={libraryTemplatesData}
        isLoadingLibrary={isLoadingLibrary}
        claimingId={claimingId}
        claimMutation={claimMutation}
        isAIModalOpen={isAIModalOpen}
        setIsAIModalOpen={setIsAIModalOpen}
        aiForm={aiForm}
        setAiForm={setAiForm}
        handleAISubmit={handleAISubmit}
        generateAIMutation={generateAIMutation}
        generateAILoading={generateAIMutation.isPending}
        generatedAIContent={generatedAIContent}
        setGeneratedAIContent={setGeneratedAIContent}
        handleAISave={handleAISave}
        saveAIMutation={saveAIMutation}
        saveAILoading={saveAIMutation.isPending}
        isWizardModalOpen={isWizardModalOpen}
        setIsWizardModalOpen={setIsWizardModalOpen}
        isWordEditorOpen={isWordEditorOpen}
        setIsWordEditorOpen={setIsWordEditorOpen}
        selectedWordEditItem={selectedWordEditItem}
        setSelectedWordEditItem={setSelectedWordEditItem}
        isReaderModalOpen={isReaderModalOpen}
        setIsReaderModalOpen={setIsReaderModalOpen}
        readerPerangkatId={readerPerangkatId}
        isStudioModalOpen={isStudioModalOpen}
        setIsStudioModalOpen={setIsStudioModalOpen}
        studioPerangkat={studioPerangkat}
        setStudioPerangkat={setStudioPerangkat}
        filterJenisOptions={filterJenisOptions}
        mapelOptions={mapelOptions}
        canonicalGuruOptions={canonicalGuruOptions}
        currentGuru={currentGuru}
        isKurikulumOrAdmin={isKurikulumOrAdmin}
        activeYear={academicFilter.activeTpYear}
        activeSemester={academicFilter.activeSemester}
        JENIS_LABELS={JENIS_LABELS}
        aiPresetsData={aiPresetsData}
      />
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title="Perangkat Ajar Guru (Kurikulum Merdeka)"
      description="Manajemen pengunggahan dan verifikasi berkas administrasi KBM guru."
      breadcrumbs={[
        { label: 'Kurikulum', href: '/kurikulum/dashboard' },
        { label: 'Perangkat Ajar' },
      ]}
      stats={academicStats}
      hardeningModuleKey={hardeningModuleKey}
      instruction={{
        title: 'Panduan Perangkat Ajar Kurikulum Merdeka',
        description:
          'Repositori penyimpanan berkas administrasi KBM Kurikulum Merdeka guru seperti Modul Ajar, ATP, Modul Projek P5, PROTA, PROMES, dan KKTP.',
        items: [
          { text: 'Guru dapat mengunggah berkas fisik Word/Dokumen dengan mengklik tombol "Unggah".' },
          {
            text: 'Staf kurikulum dapat melakukan verifikasi (APPROVED / REJECTED) dengan mengklik tombol "Verifikasi" di tab Perlu Review.',
          },
          { text: 'Filter jenis berkas, mata pelajaran, dan periode akademik untuk menyaring data spesifik.' },
        ],
      }}
    >
      {content}
    </AcademicPageLayout>
  );
});
