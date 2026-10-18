import React, { useMemo, useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { InstructionData } from '../../contexts/InstructionContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Printer,
  UserCheck,
  BookOpen,
  Layers,
  GraduationCap,
  Info,
  BarChart3,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { TabSwitcher, TabOption } from '../../components/ui/TabSwitcher';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SectionCard } from '../../components/ui/SectionCard';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SearchableSelect, SearchableSelectOption } from '../../components/ui/SearchableSelect';
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
import { useScoreSheetManager, ApiSiswaRecord, ApiGradeRecord } from '../../components/rapor/input-nilai/useScoreSheetManager';
import { ClassSubjectProgressData, ClassSubjectItem } from '../../components/rapor/cetak-rapor/ClassSubjectProgressCard';
import { MonitoringMapelRombelModal } from '../../components/rapor/input-nilai/MonitoringMapelRombelModal';

interface ClassSubjectProgressResponse {
  subjects?: ClassSubjectItem[];
  data?: {
    subjects?: ClassSubjectItem[];
  };
}

// ── Smart Session & Context Persistence Constants ──
const INPUT_NILAI_SESSION_KEY = 'absenta_rapor_nilai_context';

interface SavedNilaiContext {
  tab?: 'my_tasks' | 'supervisi' | 'wali_kelas';
  kelasId?: string;
  mapelId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

const getSavedNilaiContext = (): SavedNilaiContext | null => {
  try {
    const raw = sessionStorage.getItem(INPUT_NILAI_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveNilaiContext = (ctx: SavedNilaiContext) => {
  try {
    sessionStorage.setItem(INPUT_NILAI_SESSION_KEY, JSON.stringify(ctx));
  } catch {}
};

// Static Instruction Constant to guarantee reference equality and zero re-renders
const INPUT_NILAI_INSTRUCTION: InstructionData = {
  title: 'Panduan Lembar Input Nilai e-Rapor',
  description: 'Pengisian Nilai Rapor Kurikulum Merdeka & K-13 secara terintegrasi.',
  items: [
    { text: 'Pilih Kelas dan Mata Pelajaran untuk membuka lembar pengisian.' },
    { text: 'Gunakan mode Sumatif atau Kategori sesuai format kurikulum sekolah.' },
    { text: 'Fitur 1-Klik Salin CP memudahkan pengisian capaian kompetensi massal.' },
    { text: 'Simpan nilai secara berkala atau unduh berkas format e-Rapor Kemendikbud.' },
  ],
};

const EMPTY_STUDENT_LIST: ApiSiswaRecord[] = Object.freeze([]);
const EMPTY_GRADES_LIST: ApiGradeRecord[] = Object.freeze([]);

export default React.memo(function InputNilaiPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCurrentRoute = location.pathname.toLowerCase().replace(/\/$/, '') === '/rapor/nilai';
  const lastSyncedParamsRef = useRef<string>('');

  // Initial context diambil HANYA SEKALI saat mount dari URL atau Session Storage
  const initialContextRef = useRef<{
    tab: 'my_tasks' | 'supervisi' | 'wali_kelas';
    kelasId: string;
    mapelId: string;
    tpId: string;
    semId: string;
  } | null>(null);

  if (!initialContextRef.current) {
    const saved = getSavedNilaiContext();
    const urlTab = searchParams.get('tab') as 'my_tasks' | 'supervisi' | 'wali_kelas' | null;
    const validTab = urlTab && ['my_tasks', 'supervisi', 'wali_kelas'].includes(urlTab) ? urlTab : saved?.tab || 'my_tasks';

    initialContextRef.current = {
      tab: validTab,
      kelasId: searchParams.get('kelas_id') || searchParams.get('kelas') || saved?.kelasId || '',
      mapelId: searchParams.get('mapel_id') || searchParams.get('mapel') || saved?.mapelId || '',
      tpId: searchParams.get('tahun_pelajaran_id') || searchParams.get('tp_id') || saved?.tahunPelajaranId || '',
      semId: searchParams.get('semester_id') || searchParams.get('sem_id') || saved?.semesterId || '',
    };
  }

  const initialContext = initialContextRef.current;

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

  const [activeRoleTab, setActiveRoleTab] = useState<'my_tasks' | 'supervisi' | 'wali_kelas'>(initialContext.tab);
  const [selectedKelas, setSelectedKelas] = useState<string>(initialContext.kelasId);
  const [selectedMapel, setSelectedMapel] = useState<string>(initialContext.mapelId);
  const selectedJenisNilai = '';
  // Platform hanya menggunakan Kurikulum Merdeka — mode sumatif dikunci
  const entryMode = 'sumatif' as const;

  const [showProgressDetail, setShowProgressDetail] = useState<boolean>(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState<boolean>(false);

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
    isCurrentTpActive,
  } = useAcademicContext({
    initialTpId: initialContext.tpId,
    initialSemId: initialContext.semId,
    onTpChange: useCallback((newTpId: string) => {
      // Isolasi Akademik: Reset pilihan kelas dan mapel saat berganti tahun pelajaran
      setSelectedKelas('');
      setSelectedMapel('');
      saveNilaiContext({
        tab: activeRoleTab,
        kelasId: '',
        mapelId: '',
        tahunPelajaranId: newTpId,
      });
    }, [activeRoleTab]),
    onSemesterChange: useCallback((newSemId: string) => {
      setSelectedKelas('');
      setSelectedMapel('');
      saveNilaiContext({
        tab: activeRoleTab,
        kelasId: '',
        mapelId: '',
        semesterId: newSemId,
      });
    }, [activeRoleTab]),
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

  // Query Jadwal KBM & Progres Mapel Kelas (Shared cache key with CetakRaporPage)
  const { data: classSubjectProgressRes, isLoading: isLoadingClassSubjects } = useQuery({
    queryKey: ['class-subject-progress', targetClassForSubjects, activeYear?.id, activeSemester?.id],
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
    enabled: !!targetClassForSubjects && (activeRoleTab === 'supervisi' || activeRoleTab === 'wali_kelas' || showMonitoringModal),
  });

  const classProgressData = useMemo<ClassSubjectProgressData | null>(() => {
    if (!classSubjectProgressRes) return null;
    const typed = classSubjectProgressRes as unknown as { data?: ClassSubjectProgressData } & ClassSubjectProgressData;
    return typed.data || typed;
  }, [classSubjectProgressRes]);

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

  // ── Mode Arsip Akademik (Safeguard Integritas Rapor) ──
  // Jika Tahun Pelajaran yang dibuka bukan tahun ajaran aktif (lampau/masa depan),
  // seluruh lembar penilaian dikunci dalam mode Hanya Baca (Read-Only) untuk mencegah
  // human error yang dapat merusak atau menimpa arsip nilai e-Rapor sekolah.
  const isArchivedAcademic = !isCurrentTpActive;

  const isReadOnly = !isSubjectTeacher || isArchivedAcademic;

  const readOnlyReason = useMemo(() => {
    if (!isReadOnly) return '';

    if (isArchivedAcademic) {
      const namaTp = activeYear?.nama || 'Tahun Pelajaran Terpilih';
      return `Mode Arsip Akademik (Tutup Buku): ${namaTp} berstatus Non-Aktif / Tutup Buku. Pengisian, pengeditan, dan penyimpanan nilai dikunci secara permanen untuk melindungi integritas riwayat kelulusan dan arsip e-Rapor sekolah. Seluruh data hanya dapat dilihat dan dicetak.`;
    }

    const guruPengampu = currentClassSubjectDetail?.nama_guru;
    const guruLabel = guruPengampu ? `Guru Pengampu (${guruPengampu})` : 'Guru Pengampu mata pelajaran ini';

    if (activeRoleTab === 'wali_kelas') {
      return `Mode Pemantauan Wali Kelas (Hanya Baca): Berdasarkan regulasi asesmen pendidikan nasional (Permendikbudristek No. 21/2022), pengisian dan pengubahan nilai merupakan kewenangan profesional ${guruLabel}. Wali kelas bertugas memantau progres keterisian serta memberikan catatan perkembangan peserta didik di halaman Cetak Rapor.`;
    }
    if (activeRoleTab === 'supervisi') {
      return `Mode Supervisi Kurikulum & Manajemen (Hanya Baca): Berdasarkan regulasi asesmen pendidikan nasional, pengisian dan pengubahan nilai merupakan kewenangan profesional ${guruLabel}. Manajemen sekolah melakukan pemantauan ketuntasan nilai melalui lembar ini.`;
    }
    return `Mode Hanya Baca (Read-Only): Anda tidak terdaftar sebagai Guru Pengampu untuk mata pelajaran ini di kelas terpilih. Pengubahan nilai hanya dapat dilakukan oleh ${guruLabel}.`;
  }, [isReadOnly, isArchivedAcademic, activeYear?.nama, activeRoleTab, currentClassSubjectDetail?.nama_guru]);

  // Build Tab Options dynamically based on persona & capabilities (Disimplifikasi 1-2 kata agar kompak)
  const tabOptions: TabOption[] = useMemo(() => {
    const opts: TabOption[] = [];

    // Tab 1: Tugas Saya
    if (hasTeachingTasks || !canSupervise) {
      opts.push({
        id: 'my_tasks',
        label: 'Tugas Saya',
        icon: BookOpen,
      });
    }

    // Tab 2: Supervisi
    if (canSupervise) {
      opts.push({
        id: 'supervisi',
        label: 'Supervisi',
        icon: Layers,
      });
    }

    // Tab 3: Kelas Binaan
    if (isWaliKelas) {
      opts.push({
        id: 'wali_kelas',
        label: 'Kelas Binaan',
        icon: GraduationCap,
      });
    }

    return opts;
  }, [hasTeachingTasks, canSupervise, isWaliKelas]);

  // Inisialisasi awal tab aktif jika pengguna belum memilih konteks apapun
  const [tabInitialized, setTabInitialized] = useState(false);
  useEffect(() => {
    if (!tabInitialized && teacherProgressData !== undefined) {
      setTabInitialized(true);

      // Jika URL / Session sudah menentukan tab non-default, pertahankan!
      if (initialContext.tab && initialContext.tab !== 'my_tasks') {
        return;
      }

      // Jika di tab tugas mengajar tapi tidak punya jadwal KBM dan user punya hak supervisi:
      if (!hasTeachingTasks && canSupervise && !initialContext.kelasId) {
        setActiveRoleTab('supervisi');
      }
    }
  }, [tabInitialized, teacherProgressData, initialContext, hasTeachingTasks, canSupervise]);

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

  // Sinkronisasi state HANYA saat tombol Back/Forward browser ditekan (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as 'my_tasks' | 'supervisi' | 'wali_kelas' | null;
      const urlKelas = params.get('kelas_id') || params.get('kelas') || '';
      const urlMapel = params.get('mapel_id') || params.get('mapel') || '';
      const urlTp = params.get('tahun_pelajaran_id') || params.get('tp_id') || '';
      const urlSem = params.get('semester_id') || params.get('sem_id') || '';

      if (urlTab && ['my_tasks', 'supervisi', 'wali_kelas'].includes(urlTab)) {
        setActiveRoleTab(urlTab);
      }
      setSelectedKelas(urlKelas);
      setSelectedMapel(urlMapel);
      if (urlTp) setSelectedTahunPelajaran(urlTp);
      if (urlSem) setSelectedSemester(urlSem);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedTahunPelajaran, setSelectedSemester]);

  // ── Two-Way Reactive URL & Smart Session Persistence ──
  useEffect(() => {
    // Kritis: Jangan lakukan update searchParams jika rute saat ini bukan /rapor/nilai (mencegah pembatalan navigasi)
    if (!isCurrentRoute) return;

    const currentTab = activeRoleTab;
    const currentKelas = selectedKelas;
    const currentMapel = selectedMapel;
    const currentTp = selectedTahunPelajaran || activeYear?.id || '';
    const currentSem = selectedSemester || activeSemester?.id || '';

    // 1. Simpan konteks terkini ke Session Storage browser
    saveNilaiContext({
      tab: currentTab,
      kelasId: currentKelas,
      mapelId: currentMapel,
      tahunPelajaranId: currentTp,
      semesterId: currentSem,
    });

    // 2. Sinkronkan ke URL searchParams secara aman tanpa reload menggunakan functional updater
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (currentTab) newParams.set('tab', currentTab);
      else newParams.delete('tab');

      if (currentKelas) newParams.set('kelas_id', currentKelas);
      else newParams.delete('kelas_id');

      if (currentMapel) newParams.set('mapel_id', currentMapel);
      else newParams.delete('mapel_id');

      if (currentTp) newParams.set('tahun_pelajaran_id', currentTp);
      else newParams.delete('tahun_pelajaran_id');

      if (currentSem) newParams.set('semester_id', currentSem);
      else newParams.delete('semester_id');

      // Hapus legacy params
      newParams.delete('kelas');
      newParams.delete('mapel');
      newParams.delete('tp_id');
      newParams.delete('sem_id');

      const nextQueryString = newParams.toString();
      if (prevParams.toString() === nextQueryString) {
        return prevParams;
      }
      lastSyncedParamsRef.current = nextQueryString;
      return newParams;
    }, { replace: true });
  }, [
    isCurrentRoute,
    activeRoleTab,
    selectedKelas,
    selectedMapel,
    selectedTahunPelajaran,
    selectedSemester,
    activeYear?.id,
    activeSemester?.id,
    setSearchParams,
  ]);

  // Auto-select first class-mapel task when progressInfo is loaded hanya jika belum ada yang terpilih dan tidak ada di URL
  useEffect(() => {
    if (activeRoleTab === 'my_tasks' && !selectedKelas && !initialContext.kelasId && progressInfo?.tasks && progressInfo.tasks.length > 0) {
      setSelectedKelas(progressInfo.tasks[0].kelas_id);
      setSelectedMapel(progressInfo.tasks[0].mapel_id);
    }
  }, [activeRoleTab, selectedKelas, initialContext.kelasId, progressInfo]);

  // Query students for selected class via centralized system hook (hanya saat kelas dipilih)
  const { rawList: studentListHook, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: true,
    enabled: Boolean(selectedKelas),
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
  const selectedKelasNama = useMemo(() => {
    if (!selectedKelas) return '';
    const found = (classes ?? []).find(k => k.id === selectedKelas);
    if (found) return found.nama_kelas || (found as any).nama || '';
    const fromTask = (teachingTasks ?? []).find(t => t.kelas_id === selectedKelas);
    if (fromTask) return fromTask.nama_kelas || '';
    if (activeRoleTab === 'wali_kelas') return waliKelasNama;
    return '';
  }, [classes, selectedKelas, teachingTasks, activeRoleTab, waliKelasNama]);
  const selectedMapelObj = useMemo(() => (subjects ?? []).find(m => m.id === selectedMapel), [subjects, selectedMapel]);

  // ── Custom Hook Pengelola Grid Nilai & Aksi Terpadu ──
  const memoizedStudentList = useMemo(() => {
    if (!selectedKelas) return EMPTY_STUDENT_LIST;
    return (studentListHook as unknown as ApiSiswaRecord[]) || EMPTY_STUDENT_LIST;
  }, [selectedKelas, studentListHook]);

  const memoizedExistingGrades = useMemo(() => {
    if (!selectedKelas || !selectedMapel) return EMPTY_GRADES_LIST;
    return (existingGradesData?.data as unknown as ApiGradeRecord[]) || EMPTY_GRADES_LIST;
  }, [selectedKelas, selectedMapel, existingGradesData?.data]);

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
    readOnlyReason,
    studentList: memoizedStudentList,
    existingGrades: memoizedExistingGrades,
  });

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/dashboard' },
    { label: 'Input Nilai' }
  ], []);

  const handleNavigateCetakRapor = useCallback(() => {
    const params = new URLSearchParams();
    if (activeRoleTab === 'wali_kelas') {
      if (waliKelasId) params.set('kelas_id', waliKelasId);
      params.set('tab', 'wali_kelas');
    } else {
      if (selectedKelas) params.set('kelas_id', selectedKelas);
      if (activeRoleTab === 'supervisi') params.set('tab', 'supervisi');
    }
    if (selectedTahunPelajaran || activeYear?.id) {
      params.set('tahun_pelajaran_id', selectedTahunPelajaran || activeYear?.id || '');
    }
    if (selectedSemester || activeSemester?.id) {
      params.set('semester_id', selectedSemester || activeSemester?.id || '');
    }
    const q = params.toString();
    navigate(`/rapor/cetak${q ? `?${q}` : ''}`);
  }, [activeRoleTab, waliKelasId, selectedKelas, selectedTahunPelajaran, activeYear?.id, selectedSemester, activeSemester?.id, navigate]);

  return (
    <AcademicPageLayout
      title="Lembar Input Nilai e-Rapor"
      description="Pengisian Nilai Rapor Kurikulum Merdeka & K-13 secara cepat, fleksibel, dan terintegrasi."
      breadcrumbs={breadcrumbs}
      instruction={INPUT_NILAI_INSTRUCTION}
      hardeningModuleKey="InputNilaiPage"
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="space-y-4">

          {/* Unified Control Toolbar Container (1 Frame Box Rapi & Hemat Ruang Vertikal) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3.5">
            {/* Hardening Guard Alert: Banner Mode Arsip Akademik */}
            {isArchivedAcademic && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Lock size={16} />
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>Mode Arsip Akademik (Tutup Buku)</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                        Hanya Baca
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                      {activeYear?.nama || 'Tahun Pelajaran Terpilih'} berstatus Non-Aktif. Pengisian, pengeditan, dan penyimpanan nilai dikunci secara otomatis untuk melindungi keaslian arsip riwayat nilai siswa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Baris 1: Konteks Akademik (TP & Semester) di kiri, Tab Switcher Role di kanan */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${activeRoleTab !== 'my_tasks' ? 'pb-3 border-b border-slate-100 dark:border-slate-800' : ''}`}>
              <div className="w-full md:w-auto">
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
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto flex-wrap">
                {tabOptions.length > 1 && (
                  <TabSwitcher
                    options={tabOptions}
                    activeTab={activeRoleTab}
                    onChange={handleRoleTabChange}
                  />
                )}

                {/* Tombol Monitoring Pengisian Mapel Seluruh Rombel */}
                <button
                  type="button"
                  onClick={() => setShowMonitoringModal(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Buka Status Monitoring Pengisian Mapel Seluruh Rombel"
                >
                  <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Monitoring</span>
                </button>
              </div>
            </div>

            {/* Baris 2: Seleksi Rombel / Mapel & Tombol Aksi */}
            {activeRoleTab === 'supervisi' && canSupervise && (
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                  <div>
                    <label htmlFor="supervisi-select-kelas" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
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
                    <label htmlFor="supervisi-select-mapel" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
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
              </div>
            )}

            {activeRoleTab === 'wali_kelas' && isWaliKelas && (
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                  <div className="flex-1 max-w-xl">
                    <label htmlFor="walikelas-select-mapel" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
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

                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/rapor/cetak?kelas_id=${waliKelasId || ''}&tab=wali_kelas&tahun_pelajaran_id=${activeYear?.id || ''}&semester_id=${activeSemester?.id || ''}`
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                      title="Buka Lembar Pengisian Catatan Rapor Siswa"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Isi Catatan</span>
                    </button>
                  </div>
                </div>

                {/* Info kelengkapan rapor kelas binaan */}
                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                    <Info size={14} className="text-indigo-600 shrink-0" />
                    <span className="text-[11px]">
                      {tampilkanKokurikuler
                        ? 'Wali kelas bertugas mengisi Nilai Mapel, Presensi, Catatan, & Evaluasi Kokurikuler.'
                        : 'Wali kelas bertugas mengisi Nilai Mapel, Presensi, & Catatan Wali Kelas.'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {tampilkanKokurikuler ? 'Kokurikuler: Aktif' : 'Kokurikuler: Nonaktif'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* VIEW TAB 1: Daftar Rombel Guru (Khusus Mode Tugas Mengajar) */}
          {activeRoleTab === 'my_tasks' && (
            hasTeachingTasks ? (
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
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <BookOpen size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Jadwal KBM pada Periode Ini
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Tidak ditemukan jadwal mengajar aktif pada Tahun Pelajaran / Semester terpilih.
                  {canSupervise
                    ? ' Sebagai Kurikulum/Administrator, Anda dapat beralih ke Mode Supervisi untuk memantau atau menginput nilai seluruh rombel sekolah.'
                    : ' Silakan berkoordinasi dengan Tim Kurikulum apabila jadwal KBM Anda belum selesai diplot.'}
                </p>
                {canSupervise && (
                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('supervisi')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Layers size={14} />
                    <span>Buka Supervisi Seluruh Sekolah</span>
                  </button>
                )}
              </div>
            )
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
                className={selectedKelasNama || undefined}
                teacherName={currentClassSubjectDetail?.nama_guru || undefined}
                kkmThreshold={kkmThreshold}
                onKkmThresholdChange={handleKkmThresholdChange}
                onScoreChange={handleScoreChange}
                onCopyCpToAll={handleCopyCpToAll}
                onClearCpAll={handleClearCpAll}
                onKeyDownGrid={handleKeyDownGrid}
                getScoreInputStyle={getScoreInputStyle}
                onSaveSubmit={handleSaveSubmit}
                onDownloadTemplate={handleDownloadTemplate}
                onExportEraporKemendikbud={handleExportEraporKemendikbud}
                onUploadSubmit={handleUploadSubmit}
                onNavigateCetakRapor={handleNavigateCetakRapor}
                isUploading={isUploading}
                isSaving={isSaving}
                isLoading={isLoadingStudents || isLoadingGrades}
                isReadOnly={isReadOnly}
                readOnlyReason={readOnlyReason}
              />
            </div>
          )}

          {/* Modal Monitoring Status Pengisian Mapel Rombel */}
          <MonitoringMapelRombelModal
            isOpen={showMonitoringModal}
            onClose={() => setShowMonitoringModal(false)}
            data={classProgressData}
            isLoading={isLoadingClassSubjects}
            selectedKelas={targetClassForSubjects}
            kelasOptions={kelasOptions}
            onSelectKelas={(kId) => {
              setSelectedKelas(kId);
              setSelectedMapel('');
            }}
            onSelectMapel={(mId, kId) => {
              if (kId && kId !== selectedKelas) {
                setSelectedKelas(kId);
              }
              setSelectedMapel(mId);
              toast.info('Beralih ke lembar nilai mapel terpilih');
            }}
            activeYearNama={activeYear?.nama}
            activeSemesterNama={activeSemester?.nama}
            kelasNama={selectedKelasObj?.nama_kelas || (activeRoleTab === 'wali_kelas' ? waliKelasNama : undefined)}
          />

        </div>
      </SectionCard>
    </AcademicPageLayout>
  );
});
