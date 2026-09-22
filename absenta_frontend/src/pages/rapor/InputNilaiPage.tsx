import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles,
  Printer,
  UserCheck,
  BookOpen,
  Layers,
  GraduationCap,
  ShieldCheck,
  ExternalLink,
  Info,
  BarChart3
} from 'lucide-react';
import { TabSwitcher, TabOption } from '../../components/ui/TabSwitcher';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SectionCard } from '../../components/ui/SectionCard';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button } from '../../components/ui/Button';
import { SearchableSelect, SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { AcademicContextBar } from '../../components/common/AcademicContextBar';
import { cn } from '../../lib/utils';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, mapelApi, tahunPelajaranApi, semesterApi, siswaApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useAcademicContext } from '../../hooks/useAcademicContext';
import { useJenjang } from '../../hooks/useJenjang';
import { toast } from 'sonner';
import { generateStyledExcelTemplate } from '../../utils/excel-advanced.utils';

// Import Hardened Types, Schemas, & Subcomponents
import { StudentScoreItem, TeacherTaskItem, ClassItem, SubjectItem, CategoryItem } from '../../types/inputNilai.types';
import { ScoreInputSchema, KkmThresholdSchema, BulkPasteTextSchema } from '../../schemas/inputNilai.schema';


import { TeacherProgressCard } from '../../components/rapor/input-nilai/TeacherProgressCard';
import { ScoreGridTable } from '../../components/rapor/input-nilai/ScoreGridTable';
import { ExcelPasteModal } from '../../components/rapor/input-nilai/ExcelPasteModal';
import { BulkImportExcelCard } from '../../components/rapor/input-nilai/BulkImportExcelCard';
import { ClassSubjectItem } from '../../components/rapor/cetak-rapor/ClassSubjectProgressCard';

export default React.memo(function InputNilaiPage() {
  const queryClient = useQueryClient();
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
  const waliKelasNama = walikelasKelas?.nama_kelas || (walikelasKelas as any)?.nama || 'Kelas Binaan';

  const [activeRoleTab, setActiveRoleTab] = useState<'my_tasks' | 'supervisi' | 'wali_kelas'>(() => {
    if (tabParam && ['my_tasks', 'supervisi', 'wali_kelas'].includes(tabParam)) {
      return tabParam;
    }
    return 'my_tasks';
  });
  const [selectedKelas, setSelectedKelas] = useState<string>(() => kelasParam);
  const [selectedMapel, setSelectedMapel] = useState<string>(() => mapelParam);
  const [selectedJenisNilai, setSelectedJenisNilai] = useState<string>('');
  // Platform hanya menggunakan Kurikulum Merdeka — mode sumatif dikunci
  const entryMode = 'sumatif' as const;

  const [showProgressDetail, setShowProgressDetail] = useState<boolean>(false);
  
  // Scores Grid State
  const [scores, setScores] = useState<StudentScoreItem[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Modal Paste State
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteRawText, setPasteRawText] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Subject-Persistent KKM Threshold State
  const [kkmThreshold, setKkmThreshold] = useState<number>(70);

  // Task Search & Filter State
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'empty' | 'partial' | 'completed'>('all');

  // ── Centralized System Hooks ──
  const { config: jenjangConfig } = useJenjang();
  const { options: kelasOptions, rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: true,
  });
  const { options: mapelOptions, rawList: mapelList, isLoading: isLoadingMapel } = useMapelOptions();

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
    semesterRawList,
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
      setScores([]);
    }, [activeRoleTab, waliKelasId]),
    onSemesterChange: useCallback(() => {
      if (activeRoleTab === 'wali_kelas' && waliKelasId) {
        setSelectedKelas(waliKelasId);
      } else {
        setSelectedKelas('');
      }
      setSelectedMapel('');
      setScores([]);
    }, [activeRoleTab, waliKelasId]),
  });

  const { data: categories } = useQuery({
    queryKey: ['kategori-nilai'],
    queryFn: async () => {
      try {
        return await raporApi.getKategoriNilai();
      } catch {
        return { data: [] };
      }
    },
    enabled: entryMode === 'kategori'
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
    if (Array.isArray((classSubjectProgressRes as any).subjects)) {
      return (classSubjectProgressRes as any).subjects;
    }
    if ((classSubjectProgressRes as any).data && Array.isArray((classSubjectProgressRes as any).data.subjects)) {
      return (classSubjectProgressRes as any).data.subjects;
    }
    return [];
  }, [classSubjectProgressRes]);

  // Smart Mapel Options terikat kelas dengan info guru & badge kelengkapan
  const smartMapelOptions = useMemo<SearchableSelectOption[]>(() => {
    if (classSubjectList.length > 0) {
      return classSubjectList.map((s) => {
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
    if (!selectedMapel || !classSubjectList.length) return null;
    return classSubjectList.find((s) => s.mapel_id === selectedMapel) || null;
  }, [selectedMapel, classSubjectList]);

  // Persistent KKM Threshold Sync per selected mapel
  useEffect(() => {
    if (selectedMapel) {
      const stored = localStorage.getItem(`absenta_kkm_mapel_${selectedMapel}`);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) setKkmThreshold(val);
      } else {
        setKkmThreshold(70);
      }
    }
  }, [selectedMapel]);

  const handleKkmThresholdChange = useCallback((newVal: number) => {
    const parsed = KkmThresholdSchema.safeParse(newVal);
    const validVal = parsed.success ? parsed.data : 70;
    setKkmThreshold(validVal);
    if (selectedMapel) {
      localStorage.setItem(`absenta_kkm_mapel_${selectedMapel}`, validVal.toString());
    }
  }, [selectedMapel]);

  // Memoized Filtered Tasks for search & filter tabs
  const filteredTasks = useMemo(() => {
    if (!progressInfo?.tasks) return [];
    return progressInfo.tasks.filter((t: TeacherTaskItem) => {
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
    const hasInPersonalTasks = teachingTasks.some(
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
        const isPersonal = teachingTasks.some(
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
      if (teachingTasks.length > 0) {
        const isPersonal = teachingTasks.some(
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

  // Reset scores grid immediately whenever selected filter changes
  useEffect(() => {
    setScores([]);
  }, [selectedKelas, selectedMapel, entryMode, selectedJenisNilai]);

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

  // Combine students and existing grades into scores state
  useEffect(() => {
    if (studentListHook && studentListHook.length > 0) {
      const studentList = studentListHook;
      const gradesList = existingGradesData?.data || [];

      interface ApiSiswaRecord { id: string; nama_siswa?: string; nama?: string; nama_lengkap?: string; nis?: string; nisn?: string }
      interface ApiGradeRecord { siswa_id: string; sumatif_1?: number; sumatif_2?: number; sumatif_3?: number; sumatif_akhir?: number; deskripsi_cp?: string; capaian_kompetensi?: string; deskripsi?: string; nilai?: number }

      const initialScores: StudentScoreItem[] = studentList?.map((s: ApiSiswaRecord) => {
        const found = gradesList.find((g: ApiGradeRecord) => g.siswa_id === s.id);
        const studentName = s.nama_siswa || s.nama_lengkap || s.nama || '—';
        const studentNis = s.nis || s.nisn || '—';

        if (found) {
          return {
            siswa_id: s.id,
            nama: studentName,
            nis: studentNis,
            sumatif_1: found.sumatif_1 ?? null,
            sumatif_2: found.sumatif_2 ?? null,
            sumatif_3: found.sumatif_3 ?? null,
            sumatif_akhir: found.sumatif_akhir ?? null,
            deskripsi_cp: found.deskripsi_cp ?? found.capaian_kompetensi ?? found.deskripsi ?? '',
            nilai: found.nilai ?? null,
            deskripsi: found.deskripsi ?? found.deskripsi_cp ?? ''
          };
        }
        return {
          siswa_id: s.id,
          nama: studentName,
          nis: studentNis,
          sumatif_1: null,
          sumatif_2: null,
          sumatif_3: null,
          sumatif_akhir: null,
          deskripsi_cp: '',
          nilai: null,
          deskripsi: ''
        };
      }) || [];

      setScores(initialScores);
    }
  }, [studentListHook, existingGradesData]);

  // Score Input Change Handler with Zod Schema Validation & Range Checks
  const handleScoreChange = useCallback((index: number, field: keyof StudentScoreItem, val: string | number | null) => {
    if (isReadOnly) {
      toast.error('Tidak dapat mengubah nilai: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }
    setScores(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      // Range check for numeric score fields
      if (['sumatif_1', 'sumatif_2', 'sumatif_3', 'sumatif_akhir', 'nilai'].includes(field as string)) {
        if (val !== '' && val !== null && val !== undefined) {
          const num = parseFloat(String(val));
          if (!isNaN(num) && (num < 0 || num > 100)) {
            toast.error('Nilai harus berkisar antara 0 - 100.');
            return prev;
          }
        }
      }

      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  }, [isReadOnly]);

  // 1-Click Copy CP to All
  const handleCopyCpToAll = useCallback((sourceCp: string) => {
    if (isReadOnly) return;
    if (!sourceCp.trim()) {
      toast.warning('Teks Capaian Kompetensi (CP) baris pertama masih kosong.');
      return;
    }
    setScores(prev => prev?.map(s => ({ ...s, deskripsi_cp: sourceCp })) || []);
    toast.success(`Berhasil menyalin Capaian Kompetensi ke seluruh siswa!`);
  }, [isReadOnly]);

  // 1-Click Clear CP
  const handleClearCpAll = useCallback(() => {
    if (isReadOnly) return;
    setScores(prev => prev?.map(s => ({ ...s, deskripsi_cp: '' })) || []);
    toast.info('Seluruh Capaian Kompetensi (CP) telah dikosongkan.');
  }, [isReadOnly]);

  // Keyboard Grid Navigation
  const handleKeyDownGrid = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, colIndex: number) => {
    const totalRows = scores.length;
    const maxCols = entryMode === 'sumatif' ? 5 : 2;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (rowIndex < totalRows - 1) {
        e.preventDefault();
        const target = document.getElementById(`input-grid-${rowIndex + 1}-${colIndex}`) as HTMLInputElement;
        target?.focus();
        target?.select?.();
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const target = document.getElementById(`input-grid-${rowIndex - 1}-${colIndex}`) as HTMLInputElement;
        target?.focus();
        target?.select?.();
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd) {
        if (colIndex < maxCols - 1) {
          e.preventDefault();
          const target = document.getElementById(`input-grid-${rowIndex}-${colIndex + 1}`) as HTMLInputElement;
          target?.focus();
          target?.select?.();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === input.selectionEnd && input.selectionStart === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          const target = document.getElementById(`input-grid-${rowIndex}-${colIndex - 1}`) as HTMLInputElement;
          target?.focus();
          target?.select?.();
        }
      }
    }
  }, [scores.length, entryMode]);

  // Color Coding Helper based on subject KKM threshold
  const getScoreInputStyle = useCallback((scoreVal: string | number | null) => {
    if (scoreVal === null || scoreVal === undefined || scoreVal === '') {
      return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    }
    const num = parseFloat(String(scoreVal));
    if (isNaN(num)) return 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    
    if (num < kkmThreshold) {
      return 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-black';
    }
    const upperTuntas = Math.max(84, kkmThreshold + 14);
    if (num >= kkmThreshold && num <= upperTuntas) {
      return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold';
    }
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-black';
  }, [kkmThreshold]);

  // Save Mutations
  const sumatifSaveMutation = useMutation({
    mutationFn: (data: unknown) => raporApi.saveSumatifMassal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      setSaveSuccessMsg('Seluruh nilai Sumatif & Capaian Kompetensi berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai sumatif.';
      toast.error(msg);
    }
  });

  const bulkSaveMutation = useMutation({
    mutationFn: (data: unknown) => raporApi.saveNilaiBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      setSaveSuccessMsg('Nilai Kategori berhasil disimpan ke database!');
      toast.success('Penyimpanan Nilai Bulk Berhasil!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan nilai bulk.';
      toast.error(msg);
    }
  });

  const handleSaveSubmit = useCallback(() => {
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only). Hanya Guru Pengampu yang berhak menyimpan nilai.');
      return;
    }

    if (!selectedKelas || !selectedMapel) {
      toast.error('Silakan pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }

    if (entryMode === 'sumatif') {
      const payload = {
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
        scores: scores?.map(s => ({
          siswa_id: s.siswa_id,
          sumatif_1: s.sumatif_1 !== null && s.sumatif_1 !== '' ? Number(s.sumatif_1) : null,
          sumatif_2: s.sumatif_2 !== null && s.sumatif_2 !== '' ? Number(s.sumatif_2) : null,
          sumatif_3: s.sumatif_3 !== null && s.sumatif_3 !== '' ? Number(s.sumatif_3) : null,
          sumatif_akhir: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          nilai_akhir_sumatif: s.sumatif_akhir !== null && s.sumatif_akhir !== '' ? Number(s.sumatif_akhir) : null,
          deskripsi_cp: s.deskripsi_cp || '',
          capaian_kompetensi: s.deskripsi_cp || ''
        })) || []
      };
      sumatifSaveMutation.mutate(payload);
    } else {
      if (!selectedJenisNilai) {
        toast.error('Pilih Kategori Penilaian terlebih dahulu.');
        return;
      }
      const payload = {
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        jenis_nilai_id: selectedJenisNilai,
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
        scores: scores?.map(s => ({
          siswa_id: s.siswa_id,
          nilai: s.nilai !== null && s.nilai !== '' ? Number(s.nilai) : null,
          deskripsi: s.deskripsi || ''
        })) || []
      };
      bulkSaveMutation.mutate(payload);
    }
  }, [isReadOnly, selectedKelas, selectedMapel, entryMode, activeYear, activeSemester, scores, selectedJenisNilai, sumatifSaveMutation, bulkSaveMutation]);

  // Excel Paste Process Handler
  const handleProcessPaste = useCallback(() => {
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }

    const parseRes = BulkPasteTextSchema.safeParse(pasteRawText);
    if (!parseRes.success) {
      toast.error(parseRes.error.errors[0]?.message || 'Teks paste kosong.');
      return;
    }

    const lines = pasteRawText.trim().split('\n');
    let matchedCount = 0;

    setScores(prev => {
      const nextScores = [...prev];
      lines?.forEach(line => {
        const cols = line.split('\t');
        if (cols.length >= 2) {
          const key = cols[0].trim();
          const targetIndex = nextScores.findIndex(s => s.nis === key || s.nama.toLowerCase().includes(key.toLowerCase()));
          if (targetIndex !== -1) {
            matchedCount++;
            nextScores[targetIndex] = {
              ...nextScores[targetIndex],
              sumatif_1: cols[1]?.trim() || nextScores[targetIndex].sumatif_1,
              sumatif_2: cols[2]?.trim() || nextScores[targetIndex].sumatif_2,
              sumatif_3: cols[3]?.trim() || nextScores[targetIndex].sumatif_3,
              sumatif_akhir: cols[4]?.trim() || nextScores[targetIndex].sumatif_akhir,
              deskripsi_cp: cols[5]?.trim() || nextScores[targetIndex].deskripsi_cp
            };
          }
        }
      });
      return nextScores;
    });

    setShowPasteModal(false);
    setPasteRawText('');
    toast.success(`Berhasil mencocokkan dan memasang nilai untuk ${matchedCount} siswa!`);
  }, [pasteRawText]);

  // Excel Styled Template Download Handler
  const handleDownloadTemplate = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find(k => k.id === selectedKelas);
    const currentMapelObj = subjects.find(m => m.id === selectedMapel);

    try {
      const blob = await generateStyledExcelTemplate({
        nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
        nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
        tahun_pelajaran: activeYear?.nama || '2025/2026',
        semester: activeSemester?.nama || 'Ganjil',
        students: scores?.map(s => ({ nis: s.nis, nama: s.nama })) || []
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Nilai_${currentKelasObj?.nama_kelas}_${currentMapelObj?.nama_mapel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Format Excel Bermerek Resmi berhasil diunduh!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal mengunduh format Excel: ' + msg);
    }
  }, [selectedKelas, selectedMapel, classes, subjects, activeYear, activeSemester, scores]);

  // Excel Bulk File Upload Handler
  const uploadExcelMutation = useMutation({
    mutationFn: (formData: FormData) => raporApi.importExcel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-progress'] });
      toast.success('Impor Excel Massal Berhasil!');
      setExcelFile(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengimpor berkas Excel.';
      toast.error(msg);
    }
  });

  const handleUploadSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Akses ditolak: Anda berada dalam Mode Hanya Baca (Read-Only).');
      return;
    }
    if (!excelFile) return;
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas dan Mapel terlebih dahulu.');
      return;
    }
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('kelas_id', selectedKelas);
    formData.append('mapel_id', selectedMapel);
    formData.append('tahun_pelajaran_id', activeYear?.id || '');
    formData.append('semester_id', activeSemester?.id || '');

    uploadExcelMutation.mutate(formData);
  }, [isReadOnly, excelFile, selectedKelas, selectedMapel, activeYear, activeSemester, uploadExcelMutation]);

  const selectedKelasObj = useMemo(() => classes.find(k => k.id === selectedKelas), [classes, selectedKelas]);
  const selectedMapelObj = useMemo(() => subjects.find(m => m.id === selectedMapel), [subjects, selectedMapel]);

  // Export e-Rapor Kemendikbud Handler
  const handleExportEraporKemendikbud = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      toast.error('Pilih Kelas Rombel dan Mata Pelajaran terlebih dahulu.');
      return;
    }
    const currentKelasObj = classes.find(k => k.id === selectedKelas);
    const currentMapelObj = subjects.find(m => m.id === selectedMapel);

    try {
      const blob = await generateStyledExcelTemplate({
        nama_kelas: currentKelasObj?.nama_kelas || 'Rombel',
        nama_mapel: currentMapelObj?.nama_mapel || 'Mata Pelajaran',
        tahun_pelajaran: activeYear?.nama || '2025/2026',
        semester: activeSemester?.nama || 'Ganjil',
        students: scores?.map(s => ({ nis: s.nis, nama: s.nama })) || []
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eRapor_Kemendikbud_${currentKelasObj?.nama_kelas}_${currentMapelObj?.nama_mapel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Berkas Siap Impor e-Rapor Kemendikbud berhasil diunduh!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Gagal mengunduh e-Rapor: ' + msg);
    }
  }, [selectedKelas, selectedMapel, classes, subjects, activeYear, activeSemester, scores]);

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
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Kelas Rombel:
                    </label>
                    <SearchableSelect
                      id="supervisi-select-kelas"
                      aria-label="Pilih kelas rombel supervisi"
                      options={kelasOptions}
                      value={selectedKelas}
                      onValueChange={(val) => {
                        setSelectedKelas(val);
                        setSelectedMapel('');
                        setScores([]);
                      }}
                      placeholder="-- Pilih Kelas --"
                      isLoading={isLoadingClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Mata Pelajaran:
                    </label>
                    <SearchableSelect
                      id="supervisi-select-mapel"
                      aria-label="Pilih mata pelajaran supervisi"
                      options={smartMapelOptions}
                      value={selectedMapel}
                      onValueChange={(val) => {
                        setSelectedMapel(val);
                        setScores([]);
                      }}
                      placeholder={
                        !selectedKelas
                          ? '⚠️ Pilih Kelas dahulu'
                          : isLoadingClassSubjects
                          ? 'Memuat mapel...'
                          : smartMapelOptions.length === 0
                          ? 'Tidak ada mapel terjadwal'
                          : '-- Pilih Mata Pelajaran --'
                      }
                      disabled={!selectedKelas || isLoadingClassSubjects}
                      isLoading={isLoadingClassSubjects}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/rapor/dashboard')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    title="Buka Dashboard Monitoring Rapor"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dashboard Monitoring</span>
                  </button>
                </div>
              </div>

              {/* Alert jika belum ada Jadwal KBM pada TP / Semester terpilih */}
              {selectedKelas && !isLoadingClassSubjects && smartMapelOptions.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Rombel <strong>{selectedKelasObj?.nama_kelas || 'Kelas'}</strong> belum memiliki jadwal KBM untuk <strong>{activeYear?.nama || 'TP Aktif'} • {activeSemester?.nama || 'Semester Aktif'}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB 3: Kelas Binaan (Wali Kelas) */}
          {activeRoleTab === 'wali_kelas' && isWaliKelas && (
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-blue-100 dark:border-blue-950/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1 max-w-xl">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Mata Pelajaran di Kelas {waliKelasNama}:
                  </label>
                  <SearchableSelect
                    id="walikelas-select-mapel"
                    aria-label="Pilih mata pelajaran kelas binaan"
                    options={smartMapelOptions}
                    value={selectedMapel}
                    onValueChange={(val) => {
                      if (waliKelasId) setSelectedKelas(waliKelasId);
                      setSelectedMapel(val);
                      setScores([]);
                    }}
                    placeholder={
                      isLoadingClassSubjects
                        ? 'Memuat mata pelajaran...'
                        : smartMapelOptions.length === 0
                        ? 'Tidak ada mapel terjadwal di kelas ini'
                        : '-- Pilih Mata Pelajaran --'
                    }
                    disabled={!waliKelasId || isLoadingClassSubjects}
                    isLoading={isLoadingClassSubjects}
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => navigate(`/rapor/cetak?kelas_id=${waliKelasId || ''}&tahun_pelajaran_id=${activeYear?.id || ''}&semester_id=${activeSemester?.id || ''}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer"
                    title="Buka Leger & Cetak Rapor"
                  >
                    <Printer size={14} />
                    <span>Leger &amp; Cetak Rapor</span>
                  </button>
                </div>
              </div>

              {/* Alert jika belum ada Jadwal KBM pada TP / Semester terpilih */}
              {selectedKelas && !isLoadingClassSubjects && smartMapelOptions.length === 0 && (
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    Kelas binaan <strong>{waliKelasNama}</strong> belum memiliki jadwal KBM pada <strong>{activeYear?.nama || 'TP Aktif'} • {activeSemester?.nama || 'Semester Aktif'}</strong>.
                  </p>
                </div>
              )}
            </div>
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
                isUploading={uploadExcelMutation.isPending}
                isSaving={sumatifSaveMutation.isPending || bulkSaveMutation.isPending}
                isLoading={isLoadingStudents || isLoadingGrades}
                isReadOnly={isReadOnly}
                readOnlyReason={readOnlyReason}
              />
            </div>
          )}

          {/* Modal Paste dari Excel */}
          <ExcelPasteModal
            isOpen={showPasteModal}
            onClose={() => setShowPasteModal(false)}
            rawText={pasteRawText}
            onRawTextChange={setPasteRawText}
            onProcessPaste={handleProcessPaste}
          />

        </div>
      </SectionCard>
    </AcademicPageLayout>
  );
});
