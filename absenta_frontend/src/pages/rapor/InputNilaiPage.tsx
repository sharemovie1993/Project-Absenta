import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles,
  Printer,
  UserCheck,
  BookOpen,
  Layers,
  GraduationCap,
  Info
} from 'lucide-react';
import { TabSwitcher, TabOption } from '../../components/ui/TabSwitcher';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SectionCard } from '../../components/ui/SectionCard';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { AcademicContextBar } from '../../components/common/AcademicContextBar';
import { raporApi } from '../../api/rapor.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useAcademicContext } from '../../hooks/useAcademicContext';
import { useJenjang } from '../../hooks/useJenjang';
import { toast } from 'sonner';

// Import Hardened Types & Schemas
import { TeacherTaskItem, ClassItem, SubjectItem } from '../../types/inputNilai.types';

// Subcomponents & Custom Hook
import { TeacherProgressCard } from '../../components/rapor/input-nilai/TeacherProgressCard';
import { ScoreGridTable } from '../../components/rapor/input-nilai/ScoreGridTable';
import { SupervisiSelectorCard } from '../../components/rapor/input-nilai/SupervisiSelectorCard';
import { WaliKelasSelectorCard } from '../../components/rapor/input-nilai/WaliKelasSelectorCard';
import { useScoreSheetManager, ApiSiswaRecord, ApiGradeRecord } from '../../components/rapor/input-nilai/useScoreSheetManager';
import { ClassSubjectItem } from '../../components/rapor/cetak-rapor/ClassSubjectProgressCard';

// Lazy Loaded Modal for Hardening Performance
const ExcelPasteModal = lazy(() => import('../../components/rapor/input-nilai/ExcelPasteModal').then(m => ({ default: m.ExcelPasteModal })));

interface ClassSubjectProgressResponse {
  subjects?: ClassSubjectItem[];
  data?: {
    subjects?: ClassSubjectItem[];
  };
}

export default React.memo(function InputNilaiPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const kelasParam = searchParams.get('kelas_id') || searchParams.get('kelas') || '';
  const mapelParam = searchParams.get('mapel_id') || searchParams.get('mapel') || '';
  const tpParam = searchParams.get('tahun_pelajaran_id') || searchParams.get('tp_id') || '';
  const semParam = searchParams.get('semester_id') || searchParams.get('sem_id') || '';

  const tabParam = searchParams.get('tab') as 'my_tasks' | 'supervisi' | 'wali_kelas' | null;

  const { 
    isAdmin, 
    isKurikulum, 
    isKepsek, 
    isWaliKelas, 
    walikelasKelas, 
    walikelasKelasIds,
    activeGuruId,
  } = useCapabilities();

  const canSupervise = isAdmin || isKurikulum || isKepsek;
  const waliKelasId = walikelasKelas?.id || (walikelasKelasIds && walikelasKelasIds.length > 0 ? walikelasKelasIds[0] : null);
  const waliKelasNama = walikelasKelas?.nama_kelas || (walikelasKelas as unknown as { nama?: string })?.nama || 'Kelas Binaan';

  const [activeRoleTab, setActiveRoleTab] = useState<'my_tasks' | 'supervisi' | 'wali_kelas'>(() => {
    if (tabParam && ['my_tasks', 'supervisi', 'wali_kelas'].includes(tabParam)) {
      return tabParam;
    }
    return 'my_tasks';
  });
  const [selectedKelas, setSelectedKelas] = useState<string>(() => kelasParam);
  const [selectedMapel, setSelectedMapel] = useState<string>(() => mapelParam);
  const selectedJenisNilai = '';
  // Platform hanya menggunakan Kurikulum Merdeka — mode sumatif dikunci
  const entryMode = 'sumatif' as const;

  const [showProgressDetail, setShowProgressDetail] = useState<boolean>(false);

  // Task Search & Filter State
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'empty' | 'partial' | 'completed'>('all');

  // ── Centralized System Hooks ──
  useJenjang();
  const { options: kelasOptions, rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: true,
  });
  const { rawList: mapelList } = useMapelOptions();

  // ── Konteks Akademik (TP + Semester) — via hook reusable ──
  const {
    selectedTahunPelajaran,
    setSelectedTahunPelajaran,
    selectedSemester,
    setSelectedSemester,
    handleTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
    activeYear,
    activeSemester,
  } = useAcademicContext({
    initialTpId: tpParam,
    initialSemId: semParam,
    onTpChange: useCallback(() => {
      if (activeRoleTab === 'wali_kelas' && waliKelasId) {
        setSelectedKelas(waliKelasId);
      } else {
        setSelectedKelas('');
      }
      setSelectedMapel('');
    }, [activeRoleTab, waliKelasId]),
    onSemesterChange: useCallback(() => {
      if (activeRoleTab === 'wali_kelas' && waliKelasId) {
        setSelectedKelas(waliKelasId);
      } else {
        setSelectedKelas('');
      }
      setSelectedMapel('');
    }, [activeRoleTab, waliKelasId]),
  });

  const { data: teacherProgressData } = useQuery({
    queryKey: ['teacher-progress', activeYear?.id, activeSemester?.id],
    queryFn: async () => {
      try {
        return await raporApi.getTeacherProgress({
          tahun_pelajaran_id: activeYear?.id,
          semester_id: activeSemester?.id
        });
      } catch {
        return { data: null };
      }
    },
  });

  // Query Settings Rapor (untuk saklar kokurikuler, format cetak, dll)
  const { data: settingsRes } = useQuery({
    queryKey: ['rapor-settings', selectedTahunPelajaran, selectedSemester],
    queryFn: () =>
      raporApi.getRaporSettings({
        tahun_pelajaran_id: selectedTahunPelajaran,
        semester_id: selectedSemester,
      }),
    enabled: Boolean(selectedTahunPelajaran),
  });

  const tampilkanKokurikuler = useMemo(() => {
    if (settingsRes?.data?.tampilkan_kokurikuler !== undefined) {
      return Boolean(settingsRes.data.tampilkan_kokurikuler);
    }
    const rawYear = activeYear?.nama || '';
    const match = rawYear.match(/^(\d{4})/);
    const startYear = match ? parseInt(match[1], 10) : 2025;
    return startYear >= 2025;
  }, [settingsRes, activeYear]);

  const classes: ClassItem[] = useMemo(() => (classList as unknown as ClassItem[]) || [], [classList]);
  const subjects: SubjectItem[] = useMemo(() => (mapelList as unknown as SubjectItem[]) || [], [mapelList]);
  const progressInfo = useMemo(() => teacherProgressData?.data, [teacherProgressData]);

  // ── Smart Class-Bound Mapel Logic (Pilar 27 Hardening) ──
  const targetClassForSubjects = useMemo(() => {
    if (activeRoleTab === 'wali_kelas') {
      return waliKelasId || selectedKelas;
    }
    return selectedKelas;
  }, [activeRoleTab, waliKelasId, selectedKelas]);

  // Query Jadwal KBM & Progres Mapel Kelas
  const { data: classSubjectProgressRes, isLoading: isLoadingClassSubjects } = useQuery({
    queryKey: ['class-subject-progress-input', targetClassForSubjects, activeYear?.id, activeSemester?.id],
    queryFn: async () => {
      if (!targetClassForSubjects) return null;
      try {
        return await raporApi.getClassSubjectProgress(targetClassForSubjects, {
          tahun_pelajaran_id: activeYear?.id,
          semester_id: activeSemester?.id,
        });
      } catch {
        return null;
      }
    },
    enabled: !!targetClassForSubjects && (activeRoleTab === 'supervisi' || activeRoleTab === 'wali_kelas'),
  });

  const classSubjectList = useMemo<ClassSubjectItem[]>(() => {
    if (!classSubjectProgressRes) return [];
    const typedRes = classSubjectProgressRes as unknown as ClassSubjectProgressResponse;
    if (Array.isArray(typedRes.subjects)) {
      return typedRes.subjects;
    }
    if (typedRes.data && Array.isArray(typedRes.data.subjects)) {
      return typedRes.data.subjects;
    }
    return [];
  }, [classSubjectProgressRes]);

  // Smart Mapel Options terikat kelas dengan info guru & badge kelengkapan
  const smartMapelOptions = useMemo<SearchableSelectOption[]>(() => {
    if ((classSubjectList ?? []).length > 0) {
      return (classSubjectList ?? []).map((s) => {
        const guruLabel = s.nama_guru ? ` • Pengampu: ${s.nama_guru}` : ' • Pengampu: Belum Ditentukan';
        const isCompleted = s.status === 'completed';
        const isPartial = s.status === 'partial';

        const rightBadge = isCompleted
          ? `${s.siswa_terisi}/${s.total_siswa} Selesai`
          : isPartial
          ? `${s.siswa_terisi}/${s.total_siswa} Proses`
          : `0/${s.total_siswa || 0} Kosong`;

        const rightBadgeClass = isCompleted
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          : isPartial
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';

        const statusDotClass = isCompleted
          ? 'bg-emerald-500'
          : isPartial
          ? 'bg-amber-500 animate-pulse'
          : 'bg-slate-300 dark:bg-slate-600';

        return {
          value: s.mapel_id,
          label: `${s.nama_mapel}${guruLabel}`,
          nama_mapel: s.nama_mapel,
          nama_guru: s.nama_guru,
          rightBadge,
          rightBadgeClass,
          statusDotClass,
        };
      });
    }

    // Strict Academic Isolation: Jika belum ada jadwal KBM pada TP/Semester ini, kembalikan []
    return [];
  }, [classSubjectList]);

  // Detail Mapel Terpilih di Rombel ini
  const currentClassSubjectDetail = useMemo(() => {
    if (!selectedMapel || !(classSubjectList ?? []).length) return null;
    return (classSubjectList ?? []).find((s) => s.mapel_id === selectedMapel) || null;
  }, [selectedMapel, classSubjectList]);

  // Memoized Filtered Tasks for search & filter tabs
  const filteredTasks = useMemo(() => {
    if (!progressInfo?.tasks) return [];
    return (progressInfo.tasks ?? []).filter((t: TeacherTaskItem) => {
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const matchKelas = t.nama_kelas?.toLowerCase().includes(q);
        const matchMapel = t.nama_mapel?.toLowerCase().includes(q);
        if (!matchKelas && !matchMapel) return false;
      }
      return true;
    });
  }, [progressInfo, taskStatusFilter, taskSearchQuery]);

  const teachingTasks = useMemo(() => progressInfo?.tasks || [], [progressInfo]);
  const hasTeachingTasks = teachingTasks.length > 0;

  // ── Evaluasi Kewenangan Akademik (Opsi A: Integritas Penilaian Rapor) ──
  // Berdasarkan Permendikbudristek No. 21/2022 & etika akademik:
  // Hanya Guru Pengampu yang berhak mengisi dan mengedit nilai mapel.
  // Wali Kelas & Kurikulum berada dalam Mode Pemantauan / Supervisi (Hanya Baca / Read-Only).
  const isSubjectTeacher = useMemo(() => {
    if (!selectedKelas || !selectedMapel) return false;
    // 1. Cek dari daftar teachingTasks pribadi guru login
    const hasInPersonalTasks = (teachingTasks ?? []).some(
      (t: TeacherTaskItem) => t.kelas_id === selectedKelas && t.mapel_id === selectedMapel
    );
    if (hasInPersonalTasks) return true;

    // 2. Cek apakah guru_id pada jadwal mapel rombel ini cocok dengan activeGuruId akun login
    if (activeGuruId && currentClassSubjectDetail?.guru_id) {
      return activeGuruId === currentClassSubjectDetail.guru_id;
    }

    return false;
  }, [selectedKelas, selectedMapel, teachingTasks, activeGuruId, currentClassSubjectDetail]);

  const isReadOnly = !isSubjectTeacher;

  const readOnlyReason = useMemo(() => {
    if (!isReadOnly) return '';
    const guruPengampu = currentClassSubjectDetail?.nama_guru;
    const guruLabel = guruPengampu ? `Guru Pengampu (${guruPengampu})` : 'Guru Pengampu mata pelajaran ini';

    if (activeRoleTab === 'wali_kelas') {
      return `Mode Pemantauan Wali Kelas (Hanya Baca): Berdasarkan regulasi asesmen pendidikan nasional (Permendikbudristek No. 21/2022), pengisian dan pengubahan nilai merupakan kewenangan profesional ${guruLabel}. Wali kelas bertugas memantau progres keterisian serta memberikan catatan perkembangan peserta didik di halaman Cetak Rapor.`;
    }
    if (activeRoleTab === 'supervisi') {
      return `Mode Supervisi Kurikulum & Manajemen (Hanya Baca): Berdasarkan regulasi asesmen pendidikan nasional, pengisian dan pengubahan nilai merupakan kewenangan profesional ${guruLabel}. Manajemen sekolah melakukan pemantauan ketuntasan nilai melalui lembar ini.`;
    }
    return `Mode Hanya Baca (Read-Only): Anda tidak terdaftar sebagai Guru Pengampu untuk mata pelajaran ini di kelas terpilih. Pengubahan nilai hanya dapat dilakukan oleh ${guruLabel}.`;
  }, [isReadOnly, activeRoleTab, currentClassSubjectDetail?.nama_guru]);

  // Build Tab Options dynamically based on persona & capabilities
  const tabOptions: TabOption[] = useMemo(() => {
    const opts: TabOption[] = [];

    // Tab 1: Tugas Mengajar Saya (jika punya jadwal mengajar atau bukan kurikulum murni)
    if (hasTeachingTasks || !canSupervise) {
      opts.push({
        id: 'my_tasks',
        label: isMobile ? 'Tugas Saya' : 'Tugas Mengajar Saya',
        icon: BookOpen,
      });
    }

    // Tab 2: Supervisi Seluruh Sekolah (Khusus Kurikulum / Admin / Kepsek)
    if (canSupervise) {
      opts.push({
        id: 'supervisi',
        label: isMobile ? 'Supervisi Sekolah' : 'Supervisi Seluruh Sekolah',
        icon: Layers,
      });
    }

    // Tab 3: Kelas Binaan (Wali Kelas)
    if (isWaliKelas) {
      opts.push({
        id: 'wali_kelas',
        label: isMobile ? `Kelas Binaan (${waliKelasNama})` : `Kelas Binaan: ${waliKelasNama}`,
        icon: GraduationCap,
      });
    }

    return opts;
  }, [hasTeachingTasks, canSupervise, isWaliKelas, waliKelasNama, isMobile]);

  // Inisialisasi awal tab aktif secara cerdas
  const [tabInitialized, setTabInitialized] = useState(false);
  useEffect(() => {
    if (!tabInitialized && teacherProgressData !== undefined) {
      setTabInitialized(true);
      if (kelasParam && mapelParam) {
        const isPersonal = (teachingTasks ?? []).some(
          (t) => t.kelas_id === kelasParam && t.mapel_id === mapelParam
        );
        if (isPersonal) {
          setActiveRoleTab('my_tasks');
        } else if (isWaliKelas && waliKelasId && kelasParam === waliKelasId) {
          setActiveRoleTab('wali_kelas');
        } else if (canSupervise) {
          setActiveRoleTab('supervisi');
        } else {
          setActiveRoleTab('my_tasks');
        }
      } else if (!hasTeachingTasks && canSupervise) {
        setActiveRoleTab('supervisi');
      }
    }
  }, [tabInitialized, teacherProgressData, kelasParam, mapelParam, teachingTasks, canSupervise, hasTeachingTasks, isWaliKelas, waliKelasId]);

  const handleRoleTabChange = useCallback((id: string) => {
    const newTab = id as 'my_tasks' | 'supervisi' | 'wali_kelas';
    setActiveRoleTab(newTab);

    if (newTab === 'wali_kelas') {
      if (waliKelasId) {
        setSelectedKelas(waliKelasId);
      }
      toast.info(`Beralih ke pemantauan ${waliKelasNama}`);
    } else if (newTab === 'my_tasks') {
      if ((teachingTasks ?? []).length > 0) {
        const isPersonal = (teachingTasks ?? []).some(
          (t) => t.kelas_id === selectedKelas && t.mapel_id === selectedMapel
        );
        if (!isPersonal) {
          setSelectedKelas(teachingTasks[0].kelas_id);
          setSelectedMapel(teachingTasks[0].mapel_id);
        }
      }
      toast.info('Beralih ke Tugas Mengajar Saya');
    } else if (newTab === 'supervisi') {
      toast.info('Beralih ke Mode Supervisi Seluruh Sekolah');
    }
  }, [waliKelasId, waliKelasNama, teachingTasks, selectedKelas, selectedMapel]);

  // Sync URL searchParams jika berubah
  useEffect(() => {
    if (kelasParam) setSelectedKelas(kelasParam);
    if (mapelParam) setSelectedMapel(mapelParam);
    if (tpParam) setSelectedTahunPelajaran(tpParam);
    if (semParam) setSelectedSemester(semParam);
  }, [kelasParam, mapelParam, tpParam, semParam]);

  // Auto-select first class-mapel task when progressInfo is loaded hanya jika belum ada yang terpilih dan tidak ada di URL
  useEffect(() => {
    if (activeRoleTab === 'my_tasks' && !selectedKelas && !kelasParam && progressInfo?.tasks && progressInfo.tasks.length > 0) {
      setSelectedKelas(progressInfo.tasks[0].kelas_id);
      setSelectedMapel(progressInfo.tasks[0].mapel_id);
    }
  }, [activeRoleTab, selectedKelas, kelasParam, progressInfo]);

  // Query students for selected class via centralized system hook
  const { rawList: studentListHook, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: true,
  });

  // Query existing grades
  const { data: existingGradesData, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grades', selectedKelas, selectedMapel, selectedJenisNilai, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilai({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai || undefined,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!selectedMapel && !!activeYear && !!activeSemester
  });

  const selectedKelasObj = useMemo(() => (classes ?? []).find(k => k.id === selectedKelas), [classes, selectedKelas]);
  const selectedMapelObj = useMemo(() => (subjects ?? []).find(m => m.id === selectedMapel), [subjects, selectedMapel]);

  // ── Custom Hook Pengelola Grid Nilai & Aksi Terpadu ──
  const {
    scores,
    setScores,
    kkmThreshold,
    handleKkmThresholdChange,
    handleScoreChange,
    handleCopyCpToAll,
    handleClearCpAll,
    handleKeyDownGrid,
    getScoreInputStyle,
    showPasteModal,
    setShowPasteModal,
    pasteRawText,
    setPasteRawText,
    handleProcessPaste,
    handleSaveSubmit,
    handleDownloadTemplate,
    handleExportEraporKemendikbud,
    handleUploadSubmit,
    isSaving,
    isUploading,
    saveSuccessMsg,
    setSaveSuccessMsg,
  } = useScoreSheetManager({
    selectedKelas,
    selectedMapel,
    selectedJenisNilai,
    entryMode,
    activeYear,
    activeSemester,
    classes,
    subjects,
    isReadOnly,
    studentList: (studentListHook as unknown as ApiSiswaRecord[]) || [],
    existingGrades: (existingGradesData?.data as unknown as ApiGradeRecord[]) || [],
  });

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/dashboard' },
    { label: 'Input Nilai' }
  ], []);

  return (
    <AcademicPageLayout
      title="Lembar Input Nilai e-Rapor"
      description="Pengisian Nilai Rapor Kurikulum Merdeka & K-13 secara cepat, fleksibel, dan terintegrasi."
      breadcrumbs={breadcrumbs}
      instruction={{
        title: 'Panduan Lembar Input Nilai e-Rapor',
        description: 'Pengisian Nilai Rapor Kurikulum Merdeka & K-13 secara terintegrasi.',
        items: [
          { text: 'Pilih Kelas dan Mata Pelajaran untuk membuka lembar pengisian.' },
          { text: 'Gunakan mode Sumatif atau Kategori sesuai format kurikulum sekolah.' },
          { text: 'Fitur Copy CP dan Paste Excel memudahkan pengisian nilai massal.' },
          { text: 'Simpan nilai secara berkala atau unduh berkas format e-Rapor Kemendikbud.' }
        ]
      }}
      hardeningModuleKey="InputNilaiPage"
      topSlot={
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2">
          {/* Kiri: Dropdown TP & Semester + navigasi cepat */}
          <div className="flex items-center gap-2 flex-wrap">
            <AcademicContextBar
              id="input-nilai"
              tahunPelajaranId={selectedTahunPelajaran}
              semesterId={selectedSemester}
              onTahunPelajaranChange={handleTpChange}
              onSemesterChange={handleSemesterChange}
              tpOptions={tpOptions}
              semesterOptions={semesterOptions}
              isLoadingTp={isLoadingTp}
              isLoadingSem={isLoadingSem}
              variant="toolbar"
            />

            <button
              type="button"
              onClick={() => navigate('/rapor/cetak')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Buka Preview & Cetak Rapor Siswa"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview &amp; Cetak Rapor</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/kurikulum/wali-kelas')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Buka Hub Manajemen Wali Kelas"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Hub Wali Kelas</span>
            </button>
          </div>

          {/* Kanan: Badge Kurikulum */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Kurikulum Merdeka</span>
          </div>
        </div>
      }
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="space-y-6">

          {/* Tab Switcher per Role (Pilar 27 Hardening) */}
          {tabOptions.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeRoleTab}
                onChange={handleRoleTabChange}
              />

              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Info size={12} className="text-slate-400 shrink-0" />
                <span>
                  {activeRoleTab === 'my_tasks' && 'Jadwal KBM & rombel yang ditugaskan kepada Anda.'}
                  {activeRoleTab === 'supervisi' && 'Mode Supervisi: Akses penuh memantau & input nilai seluruh sekolah.'}
                  {activeRoleTab === 'wali_kelas' && `Mode Wali Kelas: Memantau nilai siswa pada ${waliKelasNama}.`}
                </span>
              </div>
            </div>
          )}

          {/* VIEW TAB 1: Tugas Mengajar Saya */}
          {activeRoleTab === 'my_tasks' && (
            <TeacherProgressCard
              progressInfo={progressInfo}
              showProgressDetail={showProgressDetail}
              onToggleProgressDetail={() => setShowProgressDetail(!showProgressDetail)}
              taskStatusFilter={taskStatusFilter}
              onSetTaskStatusFilter={setTaskStatusFilter}
              taskSearchQuery={taskSearchQuery}
              onSetTaskSearchQuery={setTaskSearchQuery}
              filteredTasks={filteredTasks}
              selectedKelas={selectedKelas}
              selectedMapel={selectedMapel}
              onSelectTask={(kId, mId, kNama, mNama) => {
                setSelectedKelas(kId);
                setSelectedMapel(mId);
                toast.info(`Memilih ${kNama} — ${mNama}`);
              }}
            />
          )}

          {/* VIEW TAB 2: Supervisi Seluruh Sekolah (Khusus Kurikulum / Admin / Kepsek) */}
          {activeRoleTab === 'supervisi' && canSupervise && (
            <SupervisiSelectorCard
              selectedKelas={selectedKelas}
              onSelectKelas={(val) => {
                setSelectedKelas(val);
                setSelectedMapel('');
                setScores([]);
              }}
              selectedMapel={selectedMapel}
              onSelectMapel={(val) => {
                setSelectedMapel(val);
                setScores([]);
              }}
              kelasOptions={kelasOptions}
              isLoadingClasses={isLoadingClasses}
              smartMapelOptions={smartMapelOptions}
              isLoadingClassSubjects={isLoadingClassSubjects}
              selectedKelasObj={selectedKelasObj}
              activeYear={activeYear}
              activeSemester={activeSemester}
              onNavigateDashboard={() => navigate('/rapor/dashboard')}
            />
          )}

          {/* VIEW TAB 3: Kelas Binaan (Wali Kelas) */}
          {activeRoleTab === 'wali_kelas' && isWaliKelas && (
            <WaliKelasSelectorCard
              waliKelasNama={waliKelasNama}
              waliKelasId={waliKelasId}
              selectedMapel={selectedMapel}
              onSelectMapel={(val) => {
                if (waliKelasId) setSelectedKelas(waliKelasId);
                setSelectedMapel(val);
                setScores([]);
              }}
              smartMapelOptions={smartMapelOptions}
              isLoadingClassSubjects={isLoadingClassSubjects}
              tampilkanKokurikuler={tampilkanKokurikuler}
              activeYear={activeYear}
              activeSemester={activeSemester}
              onNavigateCetak={() =>
                navigate(
                  `/rapor/cetak?kelas_id=${waliKelasId || ''}&tahun_pelajaran_id=${activeYear?.id || ''}&semester_id=${activeSemester?.id || ''}`
                )
              }
            />
          )}

          {saveSuccessMsg && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold">{saveSuccessMsg}</p>
                  <p className="text-[10px] text-emerald-100">Nilai siap digunakan untuk penerbitan Leger & e-Rapor resmi Dinas.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup notifikasi sukses"
                onClick={() => setSaveSuccessMsg(null)}
                className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all text-white"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Empty Selection Placeholder */}
          {(!selectedKelas || !selectedMapel) && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pilih Kelas dan Mata Pelajaran
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Silakan pilih kelas rombel dan mata pelajaran di atas untuk membuka lembar pengisian nilai siswa e-Rapor.
              </p>
            </div>
          )}

          {selectedKelas && selectedMapel && (
            <div className="space-y-6">
              {/* Full Width Input Grid Nilai with Integrated Top Action Toolbar */}
              <ScoreGridTable
                scores={scores}
                entryMode={entryMode}
                subjectName={currentClassSubjectDetail?.nama_mapel || selectedMapelObj?.nama_mapel}
                className={selectedKelasObj?.nama_kelas || (activeRoleTab === 'wali_kelas' ? waliKelasNama : undefined)}
                teacherName={currentClassSubjectDetail?.nama_guru || undefined}
                kkmThreshold={kkmThreshold}
                onKkmThresholdChange={handleKkmThresholdChange}
                onScoreChange={handleScoreChange}
                onCopyCpToAll={handleCopyCpToAll}
                onClearCpAll={handleClearCpAll}
                onKeyDownGrid={handleKeyDownGrid}
                getScoreInputStyle={getScoreInputStyle}
                onShowPasteModal={() => setShowPasteModal(true)}
                onSaveSubmit={handleSaveSubmit}
                onDownloadTemplate={handleDownloadTemplate}
                onExportEraporKemendikbud={handleExportEraporKemendikbud}
                onUploadSubmit={handleUploadSubmit}
                isUploading={isUploading}
                isSaving={isSaving}
                isLoading={isLoadingStudents || isLoadingGrades}
                isReadOnly={isReadOnly}
                readOnlyReason={readOnlyReason}
              />
            </div>
          )}

          {/* Modal Paste dari Excel (Lazy loaded) */}
          <Suspense fallback={null}>
            <ExcelPasteModal
              isOpen={showPasteModal}
              onClose={() => setShowPasteModal(false)}
              rawText={pasteRawText}
              onRawTextChange={setPasteRawText}
              onProcessPaste={handleProcessPaste}
            />
          </Suspense>

        </div>
      </SectionCard>
    </AcademicPageLayout>
  );
});
