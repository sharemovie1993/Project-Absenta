import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Wand2,
  Trash2,
  Check,
  LayoutGrid,
  List,
  Zap,
  Edit3
} from 'lucide-react';

import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card, Button, Badge, SectionCard, TabSwitcher } from '../../components/ui';
import { Table, Column } from '../../components/ui/Table';

import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'sonner';
import { useCapabilities } from '../../hooks/useCapabilities';
import useConfirm from '../../hooks/useConfirm';
import { useJenjang } from '../../hooks/useJenjang';
import { useMapelOptions, useGuruOptions } from '../../components/common';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';

import {
  uploadPerangkatSchema,
  reviewPerangkatSchema,
  generateAIPerangkatSchema,
  saveAIPerangkatSchema
} from '../../components/kurikulum/perangkat-ajar/perangkatAjarSchemas';

import { PerangkatAjarGridCard } from '../../components/kurikulum/perangkat-ajar/PerangkatAjarGridCard';

// Subcomponents Lazy Loading
const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));
const PerangkatAjarUploadModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarUploadModal'));
const PerangkatAjarReviewModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarReviewModal'));
const PerangkatAjarLibraryModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarLibraryModal'));
const PerangkatAjarAIModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarAIModal'));
const PerangkatAjarWordEditorModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarWordEditorModal'));
const PerangkatAjarWizardModal = lazy(() => import('../../components/kurikulum/perangkat-ajar/PerangkatAjarWizardModal'));

const hardeningModuleKey = 'perangkat_ajar_page';

export interface Subject {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

export interface Teacher {
  id: string;
  nama_guru: string;
  nip?: string;
  user_id?: string;
}

export interface PerangkatAjar {
  id: string;
  judul: string;
  jenis: string;
  status: string;
  file_url: string;
  catatan_reviewer?: string;
  Guru?: Teacher;
  Mapel?: Subject;
  TahunPelajaran?: { id: string; tahun: string };
  Semester?: { id: string; nama_semester: string };
  Reviewer?: { full_name: string };
}

const JENIS_LABELS: Record<string, string> = {
  MODUL_AJAR: 'Modul Ajar',
  ATP: 'ATP (Alur Tujuan Pembelajaran)',
  MODUL_PROJEK: 'Modul Projek (P5)',
  PROTA: 'Program Tahunan (PROTA)',
  PROMES: 'Program Semester (PROMES)',
  KKTP: 'KKTP',
  RPP: 'RPP / Modul Ajar (K13 Legacy)',
  SILABUS: 'Silabus (K13 Legacy)',
};

export default function PerangkatAjarPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isKurikulum, isAdmin, can } = useCapabilities();

  const isKurikulumOrAdmin = useMemo(() => {
    return isAdmin || isKurikulum || (typeof can === 'function' && can('academic.manage.academic'));
  }, [isAdmin, isKurikulum, can]);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
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

  // View & Pagination States
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());


  // Library Katalog Filter States
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryJenisFilter, setLibraryJenisFilter] = useState('');
  const [claimMapelId, setClaimMapelId] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // AI Generator States
  const [aiForm, setAiForm] = useState({
    jenis: 'MODUL_AJAR',
    mapel_id: '',
    kelas: 'X',
    topik: '',
    alokasi_waktu: '2 x 45 Menit'
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

  // Canonical Reference Options Hooks
  const { rawList: tahunPelajaranList, activeYear } = useTahunPelajaranOptions();
  const { rawList: semesterList, activeSemester } = useSemesterOptions({ tahunPelajaranId: activeYear?.id });
  const { options: canonicalMapelOptions, rawList: mapelRawList } = useMapelOptions();
  const { options: canonicalGuruOptions, rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });

  const currentGuru = useMemo(() => {
    return (guruRawList || [])?.find((g) => g.user_id === user?.id || g.id === (user?.guru_profile as { id?: string })?.id);
  }, [guruRawList, user]);

  const { data: teacherAssignedMapels } = useQuery({
    queryKey: ['guru-assigned-mapels', currentGuru?.id],
    queryFn: () => currentGuru?.id ? kurikulumApi.getGuruMapel(currentGuru.id).catch(() => null) : null,
    enabled: !!currentGuru?.id
  });

  const teacherMapelIds = useMemo(() => {
    const list = teacherAssignedMapels?.data || [];
    return list.map((m: { id: string; mapel_id?: string; Mapel?: { id: string } }) => m.mapel_id || m.Mapel?.id || m.id);
  }, [teacherAssignedMapels]);

  const filterStatus = useMemo(() => {
    return activeTab === 'ALL' ? '' : activeTab;
  }, [activeTab]);

  const { data: listPerangkat, isLoading } = useQuery({
    queryKey: ['perangkat-ajar-list', activeYear?.id, activeSemester?.id, filterStatus, filterJenis, filterMapel, page, limit],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id,
      status: filterStatus || undefined,
      jenis: filterJenis || undefined,
      mapel_id: filterMapel || undefined,
      page,
      limit,
    }),
  });

  const { data: allPerangkatForStats } = useQuery({
    queryKey: ['perangkat-ajar-stats-all', activeYear?.id, activeSemester?.id],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id,
      limit: 1000
    }),
  });

  const { jenjang } = useJenjang();

  const { data: libraryTemplatesData, isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['perangkat-library-templates', librarySearch, libraryJenisFilter, isAIModalOpen, isWizardModalOpen, jenjang],
    queryFn: () => kurikulumApi.getLibraryTemplates({
      jenjang: jenjang || 'SMK',
      nama_mapel: librarySearch || undefined,
      jenis: libraryJenisFilter || undefined,
      search: librarySearch || undefined,
      limit: 200
    }),
    enabled: isLibraryModalOpen || isAIModalOpen || isWizardModalOpen
  });

  const selectedMapelForAI = useMemo(() => {
    return (mapelRawList || []).find((m) => m.id === aiForm.mapel_id);
  }, [mapelRawList, aiForm.mapel_id]);

  // Auto select first mapel if aiForm.mapel_id is empty
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
    queryFn: () => kurikulumApi.getTopikPresets({
      mapel_name: selectedMapelNameClean,
      tingkat: selectedTingkatFromKelas
    }),
    enabled: (isAIModalOpen || isWizardModalOpen) && !!selectedMapelNameClean
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

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => kurikulumApi.uploadPerangkatAjar(formData),
    onSuccess: () => {
      toast.success('Perangkat ajar berhasil diunggah');
      setIsUploadModalOpen(false);
      setUploadForm({ judul: '', jenis: '', mapel_id: '', guru_id: '', file: null });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas';
      toast.error(msg);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'APPROVED' | 'REJECTED'; catatan_reviewer?: string } }) =>
      kurikulumApi.reviewPerangkatAjar(id, data),
    onSuccess: () => {
      toast.success('Status verifikasi perangkat ajar berhasil diperbarui');
      setIsReviewModalOpen(false);
      setSelectedPerangkatId(null);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status verifikasi';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deletePerangkatAjar(id),
    onSuccess: () => {
      toast.success('Dokumen perangkat ajar berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus dokumen';
      toast.error(msg);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => kurikulumApi.bulkDeletePerangkatAjar(ids),
    onSuccess: (res: { message?: string }) => {
      toast.success(res?.message || 'Dokumen perangkat ajar terpilih berhasil dihapus');
      setSelectedRowKeys(new Set());
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus dokumen terpilih';
      toast.error(msg);
    }
  });

  const handleBulkDelete = useCallback(async () => {
    if (selectedRowKeys.size === 0) return;
    const ok = await confirm({
      title: 'Hapus Masal Perangkat Ajar',
      message: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.size} dokumen terpilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Hapus ${selectedRowKeys.size} Dokumen`,
      style: 'danger'
    });
    if (ok) {
      bulkDeleteMutation.mutate(Array.from(selectedRowKeys));
    }
  }, [selectedRowKeys, confirm, bulkDeleteMutation]);

  const claimMutation = useMutation({
    mutationFn: (payload: { library_id: string; mapel_id: string; tahun_pelajaran_id: string; semester_id: string; guru_id: string }) =>
      kurikulumApi.claimLibraryTemplate(payload),
    onMutate: (vars) => setClaimingId(vars.library_id),
    onSuccess: () => {
      toast.success('Template nasional berhasil diklaim dan diadopsi!');
      setIsLibraryModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
      queryClient.invalidateQueries({ queryKey: ['global-topik-presets'] });
      queryClient.invalidateQueries({ queryKey: ['global-perangkat-library'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengklaim template';
      toast.error(msg);
    },
    onSettled: () => setClaimingId(null)
  });

  const generateAIMutation = useMutation({
    mutationFn: (params: { jenis: string; mapel_name: string; kelas: string; topik: string; alokasi_waktu?: string }) =>
      kurikulumApi.generatePerangkatAjarAI(params),
    onSuccess: (res) => {
      if (res?.data?.content) {
        setGeneratedAIContent(res.data.content);
        toast.success(`Matriks ${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} berhasil disusun!`);

        // Jika dipicu dari Wizard Modal, langsung buka Word Editor Modal
        if (isWizardModalOpen) {
          setIsWizardModalOpen(false);
          setSelectedWordEditItem({
            judul: `${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} - ${aiForm.topik}`,
            jenis: aiForm.jenis,
            mapel_id: aiForm.mapel_id,
            guru_id: currentGuru?.id,
            tahun_pelajaran_id: activeYear?.id || '',
            semester_id: activeSemester?.id || '',
            html_content: res.data.content,
            status: 'PENDING'
          });
          setIsWordEditorOpen(true);
        }
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyusun perangkat dengan AI';
      toast.error(msg);
    }
  });

  const saveAIMutation = useMutation({
    mutationFn: (params: any) =>
      kurikulumApi.savePerangkatAjarEditor(params),
    onSuccess: () => {
      toast.success('Perangkat ajar AI berhasil disimpan ke repositori!');
      setIsAIModalOpen(false);
      setGeneratedAIContent('');
      setActiveTab('ALL');
      setFilterJenis('');
      setFilterMapel('');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-all'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan berkas editor';
      toast.error(msg);
    }
  });


  // Select Options
  const filterJenisOptions = useMemo(() => [
    { label: 'Semua Jenis Berkas', value: '' },
    { label: 'Modul Ajar', value: 'MODUL_AJAR' },
    { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
    { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
    { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
    { label: 'Program Semester (PROMES)', value: 'PROMES' },
    { label: 'KKTP', value: 'KKTP' },
    { label: 'RPP / Modul Ajar Legacy', value: 'RPP' },
    { label: 'Silabus Legacy', value: 'SILABUS' },
  ], []);

  const mapelOptions = useMemo(() => {
    if (teacherMapelIds.length > 0) {
      const teacherMapels = canonicalMapelOptions.filter((m) => teacherMapelIds.includes(m.value));
      if (teacherMapels.length > 0) return teacherMapels;
    }
    return canonicalMapelOptions;
  }, [canonicalMapelOptions, teacherMapelIds]);

  const filterMapelOptions = useMemo(() => [
    { label: 'Semua Mata Pelajaran', value: '' },
    ...canonicalMapelOptions
  ], [canonicalMapelOptions]);

  const teacherOptions = useMemo(() => [
    { label: 'Pilih Guru Pengajar', value: '' },
    ...canonicalGuruOptions
  ], [canonicalGuruOptions]);

  const handleOpenUploadModal = useCallback(() => {
    setUploadForm({
      judul: '',
      jenis: '',
      mapel_id: teacherMapelIds.length > 0 ? teacherMapelIds[0] : (mapelOptions[0]?.value || ''),
      guru_id: currentGuru?.id || '',
      file: null,
    });
    setIsUploadModalOpen(true);
  }, [currentGuru, teacherMapelIds, mapelOptions]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Perangkat Ajar',
      message: 'Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  }, [confirm, deleteMutation]);

  // Zod Guard: Upload Form
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = uploadPerangkatSchema.safeParse(uploadForm);
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
    if (activeYear?.id) formData.append('tahun_pelajaran_id', activeYear.id);
    if (activeSemester?.id) formData.append('semester_id', activeSemester.id);
    if (validData.file) formData.append('file', validData.file);

    uploadMutation.mutate(formData);
  };

  // Zod Guard: Review Form
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

  // Zod Guard: AI Generation Form
  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = generateAIPerangkatSchema.safeParse(aiForm);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    const targetMapel = (mapels?.data ?? [])?.find((m) => m.id === result.data.mapel_id);
    if (!targetMapel) {
      toast.error('Pilih mata pelajaran yang valid terlebih dahulu');
      return;
    }

    generateAIMutation.mutate({
      jenis: result.data.jenis,
      mapel_name: targetMapel.nama_mapel,
      kelas: result.data.kelas,
      topik: result.data.topik,
      alokasi_waktu: result.data.alokasi_waktu
    });
  };

  // Zod Guard: Save AI Content
  const handleAISave = () => {
    const rawPayload = {
      judul: `${JENIS_LABELS[aiForm.jenis] || aiForm.jenis} - ${aiForm.topik}`,
      jenis: aiForm.jenis,
      mapel_id: aiForm.mapel_id,
      guru_id: currentGuru?.id,
      tahun_pelajaran_id: activeYear?.id || '',
      semester_id: activeSemester?.id || '',
      html_content: generatedAIContent
    };

    const result = saveAIPerangkatSchema.safeParse(rawPayload);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue.message);
      return;
    }

    saveAIMutation.mutate(result.data);
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', href: '/kurikulum/dashboard' },
    { label: 'Perangkat Ajar' }
  ], []);

  const academicStats = useMemo(() => [
    { title: 'Total Berkas', value: stats.total, icon: <FileText className="h-4 w-4 text-white" />, gradient: 'from-blue-500 to-indigo-600', subtitle: 'Diajukan oleh guru' },
    { title: 'Perlu Review', value: stats.pending, icon: <Clock className="h-4 w-4 text-white" />, gradient: 'from-amber-500 to-orange-600', subtitle: 'Menunggu persetujuan' },
    { title: 'Disetujui', value: stats.approved, icon: <CheckCircle className="h-4 w-4 text-white" />, gradient: 'from-emerald-500 to-teal-600', subtitle: 'Lolos verifikasi' },
    { title: 'Perlu Revisi', value: stats.rejected, icon: <XCircle className="h-4 w-4 text-white" />, gradient: 'from-rose-500 to-pink-600', subtitle: 'Ditolak & butuh revisi' },
  ], [stats]);

  const tabOptions = useMemo(() => [
    { id: 'ALL', label: 'Semua Berkas', icon: FileText, colorClass: 'text-blue-600 dark:text-blue-400' },
    { id: 'PENDING', label: 'Perlu Review', icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400' },
    { id: 'APPROVED', label: 'Disetujui', icon: CheckCircle, colorClass: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'REJECTED', label: 'Perlu Revisi', icon: XCircle, colorClass: 'text-rose-600 dark:text-rose-400' },
  ], []);

  // Table Columns Definition
  const tableColumns: Column[] = useMemo(() => [
    {
      key: 'no',
      label: 'NO',
      className: 'w-12 text-center text-xs font-bold text-slate-500',
      render: (_: unknown, __: unknown, index: number) => (
        <span className="text-xs font-bold text-slate-500">{(page - 1) * limit + index + 1}</span>
      )
    },
    {
      key: 'judul',
      label: 'DOKUMEN & MAPEL',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="space-y-1 py-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/50 text-[10px]">
              {JENIS_LABELS[item.jenis] || item.jenis}
            </Badge>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">{item.judul}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Mapel: <span className="font-bold text-slate-700 dark:text-slate-300">{item.Mapel?.nama_mapel || '-'}</span> ({item.Mapel?.kode_mapel || '-'})
          </div>
        </div>
      )
    },
    {
      key: 'guru',
      label: 'GURU PENGAJAR',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru || '-'}</div>
          <div className="text-[10px] text-slate-400 font-medium">NIP. {item.Guru?.nip || '-'}</div>
        </div>
      )
    },
    {
      key: 'periode',
      label: 'PERIODE',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
          {item.TahunPelajaran?.tahun || '-'} ({item.Semester?.nama_semester || '-'})
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="space-y-1">
          {item.status === 'APPROVED' && <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-emerald-200 text-[10px] font-black"><Check size={11} className="mr-1" /> APPROVED</Badge>}
          {item.status === 'REJECTED' && <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 border-rose-200 text-[10px] font-black"><XCircle size={11} className="mr-1" /> REJECTED</Badge>}
          {item.status === 'PENDING' && <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 border-amber-200 text-[10px] font-black"><Clock size={11} className="mr-1" /> PENDING</Badge>}
          {item.catatan_reviewer && (
            <div className="text-[10px] text-slate-400 italic line-clamp-1">"{item.catatan_reviewer}"</div>
          )}
        </div>
      )
    },
    {
      key: 'aksi',
      label: 'AKSI',
      className: 'text-right',
      render: (_: unknown, item: PerangkatAjar) => {
        const isOwner = Boolean(currentGuru && item.Guru?.id === currentGuru.id);
        const canUserDelete = isKurikulumOrAdmin || isOwner;
        const canUserEdit = isKurikulumOrAdmin || isOwner;

        return (
          <div className="flex items-center justify-end gap-1.5">

            <Button
              type="button"
              onClick={() => handleOpenWordEditor(item)}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 px-2.5 py-1 h-8 flex items-center gap-1 shadow-sm"
              title="Sunting Dokumen via Word Editor"
            >
              <Edit3 size={13} />
              Edit
            </Button>

            {isKurikulumOrAdmin && (
              <Button
                type="button"
                onClick={() => {
                  setSelectedPerangkatId(item.id);
                  setIsReviewModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="text-xs font-bold border-slate-200 dark:border-slate-800 px-2 py-1 h-8"
              >
                Verifikasi
              </Button>
            )}

            {canUserDelete && (
              <Button
                type="button"
                onClick={() => handleDelete(item.id)}
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 p-1.5 h-8 w-8"
                title="Hapus Dokumen"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        );
      }
    }
  ], [page, limit, currentGuru, isKurikulumOrAdmin, handleDelete, handleOpenWordEditor]);

  return (
    <AcademicPageLayout
      title="Perangkat Ajar Guru (Kurikulum Merdeka)"
      description="Manajemen pengunggahan dan verifikasi berkas administrasi KBM guru."
      breadcrumbs={breadcrumbs}
      stats={academicStats}
      hardeningModuleKey={hardeningModuleKey}
      instruction={{
        title: 'Panduan Perangkat Ajar Kurikulum Merdeka',
        description: 'Repositori penyimpanan berkas administrasi KBM Kurikulum Merdeka guru seperti Modul Ajar, ATP, Modul Projek P5, PROTA, PROMES, dan KKTP.',
        items: [
          { text: 'Guru dapat mengunggah berkas fisik Word/Dokumen dengan mengklik tombol "UNGGAH BERKAS".' },
          { text: 'Staf kurikulum dapat melakukan verifikasi (APPROVED / REJECTED) dengan mengklik tombol "VERIFIKASI" di tab Perlu Review.' },
          { text: 'Filter jenis berkas dan mata pelajaran untuk menyaring data spesifik.' }
        ]
      }}
    >
      <div className="space-y-4 animate-in fade-in duration-500 pb-10">
        <TabSwitcher
          options={tabOptions}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED');
            setPage(1);
          }}
        />

        <SectionCard fullWidth noPadding>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => setIsLibraryModalOpen(true)}
                size="toolbar"
                className="rounded-xl shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md shadow-emerald-500/20 font-bold"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300 fill-amber-300" />
                KATALOG PLATFORM (SIAP KLAIM)
              </Button>

              <Button
                type="button"
                onClick={handleOpenUploadModal}
                variant="toolbarPrimary"
                size="toolbar"
                className="rounded-xl shrink-0"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                UNGGAH BERKAS
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setAiForm((prev) => ({ ...prev, jenis: 'MODUL_AJAR' }));
                  setIsAIModalOpen(true);
                }}
                size="toolbar"
                className="rounded-xl shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-violet-500/20 font-bold"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                ⚡ MODUL AJAR (AI)
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setAiForm((prev) => ({ ...prev, jenis: 'ATP' }));
                  setIsWizardModalOpen(true);
                }}
                size="toolbar"
                className="rounded-xl shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md shadow-amber-500/20 font-bold"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                🧙‍♂️ WIZARD ATP / PROTA / PROMES
              </Button>

              {selectedRowKeys.size > 0 && (
                <Button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  size="toolbar"
                  className="rounded-xl shrink-0 bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-md shadow-rose-500/20 font-bold animate-in fade-in zoom-in duration-300"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {bulkDeleteMutation.isPending
                    ? 'MENGHAPUS...'
                    : `HAPUS (${selectedRowKeys.size}) TERPILIH`}
                </Button>
              )}

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-1" />

              <Suspense fallback={<div className="h-9 w-56 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />}>
                <div className="w-full sm:w-56">
                  <SearchableSelect
                    id="filter-jenis-select"
                    value={filterJenis}
                    onValueChange={(val) => {
                      setFilterJenis(val);
                      setPage(1);
                    }}
                    options={filterJenisOptions}
                    placeholder="Semua Jenis Berkas"
                  />
                </div>
              </Suspense>

              <Suspense fallback={<div className="h-9 w-56 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />}>
                <div className="w-full sm:w-56">
                  <SearchableSelect
                    id="filter-mapel-select"
                    value={filterMapel}
                    onValueChange={(val) => {
                      setFilterMapel(val);
                      setPage(1);
                    }}
                    options={filterMapelOptions}
                    placeholder="Semua Mata Pelajaran"
                  />
                </div>
              </Suspense>
            </div>

            <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List size={14} />
                Tabel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid size={14} />
                Kartu
              </button>
            </div>
          </div>

          <div className={viewMode === 'table' ? 'p-0' : 'p-6'}>
            {isLoading ? (
              <div className="text-center py-20 text-slate-400 text-xs italic">Memuat berkas perangkat ajar...</div>
            ) : !listPerangkat?.data || listPerangkat.data.length === 0 ? (
              <div className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-xl m-6">
                <FileText size={48} className="text-slate-300" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Dokumen</h4>
                <p className="text-xs text-slate-400 max-w-sm">Guru belum mengunggah perangkat ajar pada semester aktif ini.</p>
              </div>
            ) : viewMode === 'table' ? (
              <Table
                columns={tableColumns}
                data={listPerangkat?.data ?? []}
                hoverable
                striped
                selectedRowKeys={selectedRowKeys}
                onSelectedRowKeysChange={setSelectedRowKeys}
                pagination={{
                  currentPage: page,
                  totalPages: listPerangkat?.meta?.last_page || 1,
                  totalItems: listPerangkat?.meta?.total || (listPerangkat?.data?.length ?? 0),
                  itemsPerPage: limit,
                  onPageChange: (newPage) => setPage(newPage),
                  onLimitChange: (newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listPerangkat?.data?.map((item: PerangkatAjar) => (
                  <PerangkatAjarGridCard
                    key={item.id}
                    item={item}
                    jenisLabels={JENIS_LABELS}
                    isKurikulumOrAdmin={isKurikulumOrAdmin}
                    currentGuruId={currentGuru?.id}
                    onOpenPdf={undefined}
                    onReview={(id) => {
                      setSelectedPerangkatId(id);
                      setIsReviewModalOpen(true);
                    }}
                    onDelete={handleDelete}
                    onEdit={handleOpenWordEditor}
                  />
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Subcomponents Loaded via Lazy & Suspense */}
        <Suspense fallback={null}>
          {isUploadModalOpen && (
            <PerangkatAjarUploadModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
              uploadForm={uploadForm}
              setUploadForm={setUploadForm}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              teacherOptions={teacherOptions}
              isSubmitting={uploadMutation.isPending}
              onSubmit={handleUploadSubmit}
            />
          )}

          {isReviewModalOpen && (
            <PerangkatAjarReviewModal
              isOpen={isReviewModalOpen}
              onClose={() => setIsReviewModalOpen(false)}
              reviewForm={reviewForm}
              setReviewForm={setReviewForm}
              isSubmitting={reviewMutation.isPending}
              onSubmit={handleReviewSubmit}
            />
          )}

          {isLibraryModalOpen && (
            <PerangkatAjarLibraryModal
              isOpen={isLibraryModalOpen}
              onClose={() => setIsLibraryModalOpen(false)}
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              libraryJenisFilter={libraryJenisFilter}
              setLibraryJenisFilter={setLibraryJenisFilter}
              claimMapelId={claimMapelId}
              setClaimMapelId={setClaimMapelId}
              claimingId={claimingId}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onEditExistingPerangkat={(item: any) => {
                setIsLibraryModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isLoadingLibrary={isLoadingLibrary}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              teacherAssignedMapels={teacherAssignedMapels?.data}
              activeYear={activeYear}
              activeSemester={activeSemester}
              currentGuru={currentGuru}
              jenisLabels={JENIS_LABELS}
              onClaim={(payload) => claimMutation.mutate(payload)}
            />
          )}

          {isAIModalOpen && (
            <PerangkatAjarAIModal
              isOpen={isAIModalOpen}
              onClose={() => setIsAIModalOpen(false)}
              aiForm={aiForm}
              setAiForm={setAiForm}
              filterJenisOptions={filterJenisOptions}
              mapelOptions={mapelOptions}
              aiTopikPresets={aiPresetsData?.data}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onOpenLibraryCatalog={() => {
                setIsAIModalOpen(false);
                setIsLibraryModalOpen(true);
              }}
              onEditExistingPerangkat={(item: any) => {
                setIsAIModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isGeneratingAI={generateAIMutation.isPending}
              isSavingAI={saveAIMutation.isPending}
              generatedAIContent={generatedAIContent}
              setGeneratedAIContent={setGeneratedAIContent}
              onSubmitAI={handleAISubmit}
              onSaveAI={handleAISave}
            />
          )}

          {isWizardModalOpen && (
            <PerangkatAjarWizardModal
              isOpen={isWizardModalOpen}
              onClose={() => setIsWizardModalOpen(false)}
              aiForm={aiForm}
              setAiForm={setAiForm}
              mapelOptions={mapelOptions}
              aiTopikPresets={aiPresetsData?.data}
              libraryTemplates={libraryTemplatesData?.data ?? []}
              myPerangkatList={listPerangkat?.data ?? []}
              onOpenLibraryCatalog={() => {
                setIsWizardModalOpen(false);
                setIsLibraryModalOpen(true);
              }}
              onEditExistingPerangkat={(item: any) => {
                setIsWizardModalOpen(false);
                handleOpenWordEditor(item);
              }}
              isGeneratingAI={generateAIMutation.isPending}
              onSubmitAI={handleAISubmit}
            />
          )}

          {isWordEditorOpen && (
            <PerangkatAjarWordEditorModal
              isOpen={isWordEditorOpen}
              onClose={() => {
                setIsWordEditorOpen(false);
                setSelectedWordEditItem(null);
              }}
              itemData={selectedWordEditItem}
              onSaveSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
              }}
            />
          )}

        </Suspense>
      </div>
    </AcademicPageLayout>
  );
}
