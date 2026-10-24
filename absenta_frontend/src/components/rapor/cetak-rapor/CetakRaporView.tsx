import React, { useMemo, useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Layers, X, Printer, Search, BarChart3, BookOpen } from 'lucide-react';
import { SectionCard } from '../../ui/SectionCard';
import { Button } from '../../ui/Button';
import { SearchableSelectOption } from '../../ui/SearchableSelect';
import { TabOption } from '../../ui/TabSwitcher';
import { raporApi } from '../../../api/rapor.api';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useKelasOptions } from '../../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../../hooks/useSiswaOptions';
import { useAcademicContext } from '../../../hooks/useAcademicContext';
import { useStrukturKurikulumOptions } from '../../../hooks/useStrukturKurikulumOptions';
import { useJenjang } from '../../../hooks/useJenjang';
import { useGuruMe } from '../../../hooks/useGuruMe';
import { useRekapBulananSiswa } from '../../../hooks/attendance/useRekapAbsensi';
import { toast } from 'sonner';
import { useRaporPdf } from '../../../hooks/useRaporPdf';
import { cn } from '../../../lib/utils';

// Import Hardened Types, Subcomponents & Custom Hooks
import {
  LegerStudent,
  RawStudent,
  RawLegerEntry,
  AcademicYear,
  Semester,
  TranskripNilaiData,
} from '../../../types/cetakRapor.types';
import { LegerStudentTable } from './LegerStudentTable';
import { AcademicOrchestratorTable } from './AcademicOrchestratorTable';
import { CetakRaporHeaderCard } from './CetakRaporHeaderCard';
import { useRaporPklPrint, KelasOptionItem } from './useRaporPklPrint';
import { useRaporSummaryManager } from './useRaporSummaryManager';
import { useCetakRaporActions } from './useCetakRaporActions';

// Lazy-loaded modals for architectural compliance & performance
const UkkSertifikatModal = lazy(() =>
  import('../../academic/ukk/UkkSertifikatModal').then((m) => ({ default: m.UkkSertifikatModal }))
);
const RaporSummaryModal = lazy(() =>
  import('./RaporSummaryModal').then((m) => ({ default: m.RaporSummaryModal }))
);
const TranskripModal = lazy(() =>
  import('./TranskripModal').then((m) => ({ default: m.TranskripModal }))
);
const RaporRenderProgressModal = lazy(() =>
  import('./RaporRenderProgressModal').then((m) => ({ default: m.RaporRenderProgressModal }))
);
const MonitoringMapelRombelModal = lazy(() =>
  import('../input-nilai/MonitoringMapelRombelModal').then((m) => ({ default: m.MonitoringMapelRombelModal }))
);

// ── Smart Session & Context Persistence Constants ──
const CETAK_RAPOR_SESSION_KEY = 'absenta_rapor_cetak_context';

interface SavedCetakContext {
  tab?: 'wali_kelas' | 'supervisi';
  kelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

const getSavedCetakContext = (): SavedCetakContext | null => {
  try {
    const raw = sessionStorage.getItem(CETAK_RAPOR_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveCetakContext = (ctx: SavedCetakContext) => {
  try {
    sessionStorage.setItem(CETAK_RAPOR_SESSION_KEY, JSON.stringify(ctx));
  } catch {}
};

interface ExtendedUserContext {
  guru_profile?: {
    wali_kelas_di?: {
      id?: string;
    };
  };
  wali_kelas_kelas_id?: string;
  kelas_id?: string;
  assigned_kelas_id?: string;
}

export interface UniversalCetakRaporViewProps {
  // Context & Scope Injections
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;

  // Display Modifiers
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  defaultTab?: 'wali_kelas' | 'supervisi';

  // Event Callbacks
  onClose?: () => void;
  onNavigateDetail?: (id: string) => void;
}

export const CetakRaporView: React.FC<UniversalCetakRaporViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  kelasNama: propKelasNama,
  guruId: propGuruId,
  tahunPelajaranId: propTahunPelajaranId,
  tahunAjaran: propTahunAjaran,
  semesterId: propSemesterId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  defaultTab: propDefaultTab,
  onClose,
  onNavigateDetail,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isCurrentRoute = location.pathname.toLowerCase().replace(/\/$/, '') === '/rapor/cetak';
  const { isHomeroomTeacher, isKurikulum, isKepalaSekolah, isAdmin, isKaprog, isHubin, walikelasKelas, walikelasKelasIds } = useCapabilities();
  const canSupervise = isAdmin || isKurikulum || isKepalaSekolah || isKaprog || isHubin;

  // ── User Auth & Wali Kelas Operational Context ──
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();

  const userKelasId = useMemo(() => {
    if (propKelasId) return propKelasId;
    if (walikelasKelas?.id) return walikelasKelas.id;
    if (walikelasKelasIds && walikelasKelasIds.length > 0) return walikelasKelasIds[0];
    const extUser = user as unknown as ExtendedUserContext | null;
    const direct = guruProfile?.wali_kelas_di?.id || extUser?.guru_profile?.wali_kelas_di?.id;
    if (direct) return direct;
    return (
      extUser?.wali_kelas_kelas_id ||
      extUser?.kelas_id ||
      extUser?.assigned_kelas_id ||
      null
    );
  }, [propKelasId, walikelasKelas, walikelasKelasIds, guruProfile, user]);

  const waliKelasNama = propKelasNama || walikelasKelas?.nama_kelas || (walikelasKelas as unknown as { nama?: string })?.nama || 'Kelas Binaan';
  const hasWaliKelas = Boolean(userKelasId);

  // Wali Kelas murni: guru yang ditugaskan sebagai wali kelas tapi bukan admin/kurikulum/kepsek
  const isPureWaliKelas = useMemo(() => {
    // Jika dipanggil secara scoped dari Wali Kelas Tab (propKelasId ada dan bukan supervisi role)
    if (propKelasId && !propJurusanId && !canSupervise) return true;
    if (isAdmin || isKurikulum || isKepalaSekolah) return false;
    return isHomeroomTeacher || Boolean(userKelasId);
  }, [propKelasId, propJurusanId, canSupervise, isAdmin, isKurikulum, isKepalaSekolah, isHomeroomTeacher, userKelasId]);

  // ── URL Search Params & Initial Context (Once-Only Guard) ──
  const [searchParams, setSearchParams] = useSearchParams();
  const lastSyncedParamsRef = useRef<string>('');

  const initialContextRef = useRef<{
    tab: 'wali_kelas' | 'supervisi';
    kelasId: string;
    tpId: string;
    semId: string;
  } | null>(null);

  if (!initialContextRef.current) {
    const saved = isCurrentRoute ? getSavedCetakContext() : null;
    const urlTab = isCurrentRoute ? (searchParams.get('tab') as 'wali_kelas' | 'supervisi' | null) : null;
    let initialTab: 'wali_kelas' | 'supervisi' = propDefaultTab || 'wali_kelas';
    if (!propDefaultTab) {
      if (propJurusanId) {
        initialTab = 'supervisi';
      } else if (!hasWaliKelas && canSupervise) {
        initialTab = 'supervisi';
      }
    }
    const validTab = urlTab && ['wali_kelas', 'supervisi'].includes(urlTab) ? urlTab : saved?.tab || initialTab;

    const initialKelas =
      propKelasId ||
      (isCurrentRoute ? (searchParams.get('kelas_id') || searchParams.get('kelas')) : '') ||
      (validTab === 'wali_kelas' && userKelasId ? userKelasId : saved?.kelasId || '');

    const initialTp =
      propTahunPelajaranId ||
      (isCurrentRoute ? (searchParams.get('tahun_pelajaran_id') || searchParams.get('tp_id')) : '') ||
      saved?.tahunPelajaranId ||
      '';

    const initialSem =
      propSemesterId ||
      (isCurrentRoute ? (searchParams.get('semester_id') || searchParams.get('sem_id')) : '') ||
      saved?.semesterId ||
      '';

    initialContextRef.current = {
      tab: validTab,
      kelasId: initialKelas,
      tpId: initialTp,
      semId: initialSem,
    };
  }

  const initialContext = initialContextRef.current;

  // ── State ──
  const [viewMode, setViewMode] = useState<'orchestrator' | 'leger'>('orchestrator');
  const [activeRoleTab, setActiveRoleTab] = useState<'wali_kelas' | 'supervisi'>(initialContext.tab);
  const [selectedKelas, setSelectedKelas] = useState<string>(initialContext.kelasId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranskripStudent, setSelectedTranskripStudent] = useState<LegerStudent | null>(null);
  const [selectedUkkStudent, setSelectedUkkStudent] = useState<LegerStudent | null>(null);
  const [isUkkModalOpen, setIsUkkModalOpen] = useState(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  // Tab Options (Disimplifikasi 1-2 kata agar kompak dan tidak overflow)
  const tabOptions: TabOption[] = useMemo(() => {
    const opts: TabOption[] = [];

    // Jika dipanggil dari Kaprog view, fokus ke supervisi jurusan
    if (propJurusanId) {
      opts.push({
        id: 'supervisi',
        label: propJurusanNama ? `Supervisi ${propJurusanNama}` : 'Supervisi Jurusan',
        icon: Layers,
      });
      return opts;
    }

    if (hasWaliKelas) {
      opts.push({
        id: 'wali_kelas',
        label: 'Kelas Binaan',
        icon: GraduationCap,
      });
    }

    if (canSupervise) {
      opts.push({
        id: 'supervisi',
        label: 'Supervisi',
        icon: Layers,
      });
    }

    return opts;
  }, [hasWaliKelas, canSupervise, propJurusanId, propJurusanNama]);

  const handleRoleTabChange = useCallback((id: string) => {
    const newTab = id as 'wali_kelas' | 'supervisi';
    setActiveRoleTab(newTab);

    if (newTab === 'wali_kelas' && userKelasId) {
      setSelectedKelas(userKelasId);
      toast.info(`Beralih ke Kelas Binaan (${waliKelasNama})`);
    } else if (newTab === 'supervisi') {
      toast.info('Beralih ke Mode Supervisi Seluruh Rombel');
    }
  }, [userKelasId, waliKelasNama]);

  // ── Centralized System Hooks ──
  const { isJenjangSmk: hookIsSmk } = useJenjang();
  const isJenjangSmk = hookIsSmk ?? true;
  const { rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: false,
  });
  const { rawList: studentList } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: false,
    enabled: Boolean(selectedKelas),
  });

  const typedClassList = useMemo<KelasOptionItem[]>(() => {
    const list = (classList as unknown as KelasOptionItem[]) || [];
    if (!propJurusanId) return list;
    // Filter rombel berdasarkan jurusanId jika diinjeksi (e.g. dari Kaprog Dashboard)
    return list.filter((k) => {
      const kJurusanId = k.jurusan_id || k.jurusan?.id;
      return kJurusanId === propJurusanId;
    });
  }, [classList, propJurusanId]);

  // Auto-select class logic
  useEffect(() => {
    if (propKelasId) {
      if (selectedKelas !== propKelasId) setSelectedKelas(propKelasId);
      return;
    }
    if (activeRoleTab === 'wali_kelas' && userKelasId) {
      if (selectedKelas !== userKelasId) setSelectedKelas(userKelasId);
      return;
    }
    if (!selectedKelas && (typedClassList ?? []).length > 0) {
      setSelectedKelas(typedClassList[0].id);
    }
  }, [propKelasId, activeRoleTab, userKelasId, selectedKelas, typedClassList]);

  // ── Konteks Akademik (TP + Semester) — via hook reusable ──
  const {
    selectedTahunPelajaran,
    setSelectedTahunPelajaran,
    selectedSemester,
    setSelectedSemester,
    handleTpChange: handleAcademicTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
    activeYear: academicActiveYear,
    activeSemester: academicActiveSemester,
  } = useAcademicContext({
    initialTpId: initialContext.tpId,
    initialSemId: initialContext.semId,
  });

  // ── Two-Way Reactive URL & Smart Session Persistence (Hanya aktif di rute mandiri) ──
  useEffect(() => {
    if (!isCurrentRoute) return;

    const currentTab = activeRoleTab;
    const currentKelas = selectedKelas;
    const currentTp = selectedTahunPelajaran || academicActiveYear?.id || '';
    const currentSem = selectedSemester || academicActiveSemester?.id || '';

    // 1. Simpan konteks ke Session Storage
    saveCetakContext({
      tab: currentTab,
      kelasId: currentKelas,
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

      if (currentTp) newParams.set('tahun_pelajaran_id', currentTp);
      else newParams.delete('tahun_pelajaran_id');

      if (currentSem) newParams.set('semester_id', currentSem);
      else newParams.delete('semester_id');

      // Hapus legacy params
      newParams.delete('kelas');
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
    selectedTahunPelajaran,
    selectedSemester,
    academicActiveYear?.id,
    academicActiveSemester?.id,
    setSearchParams,
  ]);

  // Sinkronisasi state HANYA saat tombol Back/Forward browser ditekan (popstate) di rute mandiri
  useEffect(() => {
    if (!isCurrentRoute) return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as 'wali_kelas' | 'supervisi' | null;
      const urlKelas = params.get('kelas_id') || params.get('kelas') || '';
      const urlTp = params.get('tahun_pelajaran_id') || params.get('tp_id') || '';
      const urlSem = params.get('semester_id') || params.get('sem_id') || '';

      if (urlTab && ['wali_kelas', 'supervisi'].includes(urlTab)) {
        setActiveRoleTab(urlTab);
      }
      setSelectedKelas(urlKelas);
      if (urlTp) setSelectedTahunPelajaran(urlTp);
      if (urlSem) setSelectedSemester(urlSem);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCurrentRoute, setSelectedTahunPelajaran, setSelectedSemester]);

  const activeYear = useMemo<AcademicYear | null>(() => {
    if (!academicActiveYear) return null;
    return { id: academicActiveYear.id, nama: academicActiveYear.tahun, is_active: true };
  }, [academicActiveYear]);

  const activeSemester = useMemo<Semester | null>(() => {
    if (!academicActiveSemester) return null;
    return { id: academicActiveSemester.id, nama: academicActiveSemester.nama_semester, is_active: true };
  }, [academicActiveSemester]);

  // Query Settings Rapor (untuk saklar kokurikuler, arsip sumatif, dll)
  const effectiveTpId = selectedTahunPelajaran || academicActiveYear?.id;
  const effectiveSemId = selectedSemester || academicActiveSemester?.id;

  const { data: settingsRes } = useQuery({
    queryKey: ['rapor-settings', effectiveTpId, effectiveSemId],
    queryFn: () =>
      raporApi.getRaporSettings({
        tahun_pelajaran_id: effectiveTpId,
        semester_id: effectiveSemId,
      }),
    enabled: Boolean(effectiveTpId),
  });

  const tampilkanKokurikuler = useMemo(() => {
    if (settingsRes?.data?.tampilkan_kokurikuler !== undefined) {
      return Boolean(settingsRes.data.tampilkan_kokurikuler);
    }
    const currentYearObj = tpOptions?.find((t) => t.value === effectiveTpId)?.raw as { tahun?: string; nama?: string } | undefined;
    const rawYear = currentYearObj?.tahun || currentYearObj?.nama || academicActiveYear?.tahun || '';
    const match = rawYear.match(/^(\d{4})/);
    const startYear = match ? parseInt(match[1], 10) : 2025;
    return startYear >= 2025;
  }, [settingsRes, tpOptions, effectiveTpId, academicActiveYear]);

  const modeCetakRapor = useMemo<'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY'>(() => {
    return settingsRes?.data?.mode_cetak_rapor || 'CP_ONLY';
  }, [settingsRes]);

  // Hook cetak PDF terpadu
  const {
    printLeger,
    printBiodata,
    printRaporSemester,
    printRaporSumatif,
    printP5,
    printSkl,
  } = useRaporPdf({
    tahunPelajaranId: activeYear?.id,
    semesterId: activeSemester?.id,
    tahunPelajaranNama: activeYear?.nama || academicActiveYear?.tahun,
    semesterNama: activeSemester?.nama || academicActiveSemester?.nama_semester,
  });

  // ── Hook Struktur Kurikulum Rombel ──
  const currentKelasObj = useMemo<KelasOptionItem | undefined>(() => {
    return (typedClassList ?? []).find((k) => k.id === selectedKelas);
  }, [typedClassList, selectedKelas]);

  const { totalJp: kurikulumTotalJp, rawList: kurikulumStrukturList } = useStrukturKurikulumOptions({
    tahunPelajaranId: activeYear?.id,
    tingkat: currentKelasObj?.tingkat,
    jurusanId: currentKelasObj?.jurusan_id || currentKelasObj?.jurusan?.id || propJurusanId,
  });

  // ── Leger query ──
  const { data: leger, isLoading: isLoadingLeger } = useQuery({
    queryKey: ['leger', selectedKelas, activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getLeger({
        kelas_id: selectedKelas,
        tahun_pelajaran_id: activeYear?.id ?? '',
        semester_id: activeSemester?.id ?? '',
      }),
    enabled: !!selectedKelas && !!activeYear?.id && !!activeSemester?.id,
  });

  // ── Transkrip query ──
  const { data: transkripData, isLoading: isLoadingTranskrip } = useQuery({
    queryKey: ['transkrip-siswa', selectedTranskripStudent?.id],
    queryFn: () => raporApi.getTranskripNilai(selectedTranskripStudent!.id),
    enabled: !!selectedTranskripStudent?.id,
  });

  // ── Class Subject Progress (Kelengkapan Nilai Mapel Kelas Binaan) ──
  const { data: classProgressRes, isLoading: isLoadingClassProgress } = useQuery({
    queryKey: ['class-subject-progress', selectedKelas, activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getClassSubjectProgress(selectedKelas, {
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
      }),
    enabled: !!selectedKelas && !!activeYear?.id && !!activeSemester?.id,
  });
  const classProgressData = classProgressRes?.data || null;

  // ── Enhanced Kelas Options with Wali Kelas Label & Highlighting ──
  const kelasOptions = useMemo<SearchableSelectOption[]>(() => {
    const all = typedClassList ?? [];
    const targetList = isPureWaliKelas && userKelasId && all.some((k) => k.id === userKelasId)
      ? all.filter((k) => k.id === userKelasId)
      : all;

    return (targetList ?? [])?.map((k) => {
      const isWali = Boolean(userKelasId && k.id === userKelasId);
      const namePart = k.nama_kelas || k.nama || k.nama_lengkap || 'Rombel';
      const tingkatPart = k.tingkat ? `Kelas ${k.tingkat} - ` : '';
      const jurusanPart = k.jurusan?.kode_jurusan ? ` (${k.jurusan.kode_jurusan})` : (k.kode_jurusan ? ` (${k.kode_jurusan})` : '');
      const label = `${tingkatPart}${namePart}${jurusanPart}${isWali ? ' ⭐' : ''}`;
      return {
        value: k.id,
        label,
        raw: k,
      };
    });
  }, [typedClassList, userKelasId, isPureWaliKelas]);

  // ── Filtered students with defensive optional chaining & strict typing ──
  const filteredStudents = useMemo<LegerStudent[]>(() => {
    if (!selectedKelas) return [];

    const safeLegerStudents: RawLegerEntry[] = Array.isArray(leger?.data?.students)
      ? (leger.data.students as RawLegerEntry[])
      : [];
    const safeStudentList: RawStudent[] = Array.isArray(studentList) ? studentList : [];

    // Prioritaskan daftar siswa dari leger jika ada (karena leger menghormati konteks Tahun Pelajaran & Semester historis)
    const baseList: Array<{
      id: string;
      nama_siswa?: string;
      nama?: string;
      nama_lengkap?: string;
      nis?: string;
      sakit?: number;
      izin?: number;
      alpa?: number;
    }> =
      safeLegerStudents.length > 0
        ? (safeLegerStudents ?? [])?.map((ls) => ({
            id: ls.siswa_id ?? ls.id ?? '',
            nama_siswa: ls.nama_siswa ?? ls.nama ?? '',
            nis: ls.nis ?? '',
            sakit: ls.sakit,
            izin: ls.izin,
            alpa: ls.alpa,
          }))
        : safeStudentList;

    if (!(baseList ?? []).length) return [];

    const q = searchQuery.toLowerCase().trim();

    return (baseList ?? [])
      ?.map((s): LegerStudent => {
        const found = (safeLegerStudents ?? [])?.find(
          (ls) => (ls.siswa_id ?? ls.id) === s.id
        );
        const nama = found?.nama_siswa ?? s.nama_siswa ?? s.nama ?? s.nama_lengkap ?? '—';
        const nis = found?.nis ?? s.nis ?? '—';
        return {
          id: s.id,
          nama_siswa: nama,
          nis,
          nisn: (found as any)?.nisn || (s as any)?.nisn || '',
          sekolah_asal: (found as any)?.sekolah_asal || (s as any)?.sekolah_asal || null,
          is_pindahan: (found as any)?.is_pindahan ?? false,
          rank: found?.rank ?? '—',
          rata_rata: found?.rata_rata ?? 0,
          sakit: found?.sakit ?? s.sakit ?? 0,
          izin: found?.izin ?? s.izin ?? 0,
          alpa: found?.alpa ?? s.alpa ?? 0,
          catatan_wali: found?.catatan_wali ?? '',
          keputusan_transisi: found?.keputusan_transisi ?? '',
          catatan_kokurikuler: found?.catatan_kokurikuler ?? '',
          referensi_absensi_harian: found?.referensi_absensi_harian || { sakit: 0, izin: 0, alpa: 0 },
          dokumen_eligibility: (found as any)?.dokumen_eligibility,
          riwayat_semester: (found as any)?.riwayat_semester || [],
        };
      })
      .filter((s) => {
        if (!q) return true;
        return (
          s.nama_siswa.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
        );
      });
  }, [selectedKelas, studentList, leger, searchQuery]);

  const isGenap = useMemo(() => {
    const currentSemObj = semesterOptions?.find((s) => s.value === effectiveSemId)?.raw as Semester | undefined;
    const semName = (currentSemObj?.nama_semester || (currentSemObj as any)?.nama || academicActiveSemester?.nama_semester || academicActiveSemester?.nama || '').toLowerCase();
    const semNum = (currentSemObj as any)?.semester || (academicActiveSemester as any)?.semester;
    return semName.includes('genap') || semName.includes('2') || semNum === 2;
  }, [semesterOptions, effectiveSemId, academicActiveSemester]);

  // ── Custom Hook: Summary & Form Validation Manager ──
  const {
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    selectedStudent,
    summaryForm,
    formErrors,
    handleOpenSummaryModal,
    handleSummaryFormChange,
    handleSummarySubmit,
    isSavingSummary,
  } = useRaporSummaryManager({
    selectedKelas,
    activeYear,
    activeSemester,
    isGenap,
  });

  // ── Rekap Absensi custom hook untuk modal summary ──
  const { data: rekapSiswaData } = useRekapBulananSiswa(selectedStudent?.id, undefined, activeYear?.id);

  // ── Custom Hook: Cetak & Export Actions Manager ──
  const {
    pdfLoading,
    setPdfLoading,
    isBatchPrinting,
    handlePrintRapor,
    handlePrintP5,
    handleExportLeger,
    handleBatchPrintRapor,
    handleBatchPrintBiodata,
    handleBatchPrintRaporSumatif,
    handleBatchPrintP5,
    handleBatchPrintBundelLengkap,
  } = useCetakRaporActions({
    selectedKelas,
    activeYear,
    activeSemester,
    currentKelasObj,
    filteredStudents,
  });

  // ── Hook Cetak Rapor & Sertifikat PKL Terpadu ──
  const {
    handlePrintRaporPkl,
    handleBatchPrintRaporPkl,
    handlePrintSertifikatPkl,
    handleBatchPrintSertifikatPkl,
    isBatchPklPrinting,
    isBatchSertifikatPrinting,
    showLogoKananSertifikat,
    toggleShowLogoKananSertifikat,
  } = useRaporPklPrint({
    selectedKelas,
    classList: typedClassList,
    activeYear,
    activeSemester,
    user,
    setPdfLoading,
  });

  return (
    <div className={cn("space-y-4 w-full max-w-full min-w-0 pb-10 animate-in fade-in duration-300", isModal && "p-2 sm:p-4")}>
      {/* Modal / Standalone Header jika isModal diaktifkan */}
      {isModal && (
        <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Cetak Rapor & Leger {propJurusanNama ? `• ${propJurusanNama}` : ''} {propKelasNama ? `• ${propKelasNama}` : ''}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencetakan rapor individual, batch cetak buku rapor, dan rekapitulasi leger nilai.
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
              <X className="w-4 h-4 mr-1.5" />
              Tutup
            </Button>
          )}
        </div>
      )}

      {/* Unified Selector Header Card with Integrated Toolbar & Action Bar */}
      {isMobile ? (
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 w-full">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-siswa-mobile"
                type="text"
                placeholder="Cari siswa, NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium pl-9 pr-7 py-2 h-9 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Shortcut Rincian Mapel di Mobile */}
            <Button
              variant="outline"
              onClick={() => setShowMonitoringModal(true)}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl font-bold text-xs h-9 px-2.5 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Lihat Rincian Status Pengisian Nilai Mapel"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px]">Mapel</span>
            </Button>

            {/* Shortcut Input Nilai di Mobile */}
            <Button
              variant="outline"
              onClick={() => {
                if (onNavigateDetail) {
                  onNavigateDetail(selectedKelas);
                } else {
                  navigate(
                    `/rapor/nilai?kelas_id=${selectedKelas || ''}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
                  );
                }
              }}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 rounded-xl font-bold text-xs h-9 px-2.5 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Beralih ke Lembar Penginputan Nilai"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px]">Nilai</span>
            </Button>
          </div>
        </div>
      ) : (
        <CetakRaporHeaderCard
          selectedKelas={selectedKelas}
          onSelectKelas={setSelectedKelas}
          activeRoleTab={activeRoleTab}
          kelasOptions={kelasOptions}
          isLoadingClasses={isLoadingClasses}
          selectedTahunPelajaran={selectedTahunPelajaran}
          selectedSemester={selectedSemester}
          onTahunPelajaranChange={handleAcademicTpChange}
          onSemesterChange={handleSemesterChange}
          tpOptions={tpOptions}
          semesterOptions={semesterOptions}
          isLoadingTp={isLoadingTp}
          isLoadingSem={isLoadingSem}
          tabOptions={tabOptions}
          onRoleTabChange={handleRoleTabChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          hasLegerData={Boolean(leger?.data || filteredStudents.length > 0)}
          isLoadingLeger={isLoadingLeger}
          totalStudents={filteredStudents.length}
          isBatchPrinting={isBatchPrinting}
          onBatchPrintRapor={handleBatchPrintRapor}
          onPrintLeger={() => printLeger(selectedKelas, activeYear?.id, activeSemester?.id, currentKelasObj?.nama_kelas)}
          onExportLeger={handleExportLeger}
          isJenjangSmk={isJenjangSmk}
          onBatchPrintRaporPkl={handleBatchPrintRaporPkl}
          isBatchPklPrinting={isBatchPklPrinting}
          isPureWaliKelas={isPureWaliKelas}
          currentKelasNama={currentKelasObj?.nama_kelas}
          kurikulumStrukturListLength={kurikulumStrukturList?.length}
          kurikulumTotalJp={kurikulumTotalJp}
          modeCetakRapor={modeCetakRapor}
          onOpenMonitoringModal={() => setShowMonitoringModal(true)}
          onNavigateInputNilai={() => {
            if (onNavigateDetail) {
              onNavigateDetail(selectedKelas);
            } else {
              navigate(
                `/rapor/nilai?kelas_id=${selectedKelas || ''}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
              );
            }
          }}
        />
      )}

      {/* View Mode Switcher: Orkestrator Dokumen (Default) vs Buku Leger Nilai */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100/80 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setViewMode('orchestrator')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              viewMode === 'orchestrator'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Layers className="w-4 h-4" />
            <span>{isMobile ? 'Dokumen Rapor' : 'Pusat Orkestrasi Dokumen Siswa'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/60 dark:border-indigo-800/60">
              Utama
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('leger')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              viewMode === 'leger'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isMobile ? 'Buku Leger' : 'Buku Leger Nilai & Ranking'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Total: <b>{filteredStudents.length}</b> Siswa</span>
        </div>
      </div>

      {/* Main View: Academic Document Orchestrator Table vs Leger Nilai Table */}
      {viewMode === 'orchestrator' ? (
        <AcademicOrchestratorTable
          students={filteredStudents}
          isLoading={isLoadingLeger}
          isJenjangSmk={isJenjangSmk}
          pdfLoading={pdfLoading}
          modeCetakRapor={modeCetakRapor}
          onPrintBiodata={(sId) => printBiodata(sId)}
          onPrintRaporSemester={(sId, tpId, semId) => printRaporSemester(sId, tpId, semId)}
          onPrintRaporSumatif={(sId, tpId, semId) => printRaporSumatif(sId, tpId, semId)}
          onPrintP5={(sId) => printP5(sId)}
          onPrintRaporPkl={(s) => handlePrintRaporPkl(s)}
          onPrintSertifikatPkl={(s) => handlePrintSertifikatPkl(s)}
          onPrintSertifikatUkk={(s) => {
            setSelectedUkkStudent(s);
            setIsUkkModalOpen(true);
          }}
          onPrintSkl={(sId) => printSkl(sId)}
          onOpenTranskrip={(s) => setSelectedTranskripStudent(s)}
          onOpenSummaryModal={(s) => handleOpenSummaryModal(s)}
        />
      ) : (
        <LegerStudentTable
          students={filteredStudents}
          isLoading={isLoadingLeger}
          isJenjangSmk={isJenjangSmk}
          pdfLoading={pdfLoading}
          tahunPelajaranId={activeYear?.id}
          semesterId={activeSemester?.id}
          tahunPelajaranNama={activeYear?.nama || academicActiveYear?.tahun}
          semesterNama={activeSemester?.nama || academicActiveSemester?.nama_semester}
          modeCetakRapor={modeCetakRapor}
          onOpenSummaryModal={handleOpenSummaryModal}
          onPrintRapor={handlePrintRapor}
          onPrintP5={handlePrintP5}
          onPrintRaporPkl={handlePrintRaporPkl}
          onPrintSertifikatPkl={handlePrintSertifikatPkl}
          onPrintLeger={() => printLeger(selectedKelas, activeYear?.id, activeSemester?.id, currentKelasObj?.nama_kelas)}
          onExportLeger={handleExportLeger}
          onBatchPrintRapor={handleBatchPrintRapor}
          onBatchPrintBiodata={handleBatchPrintBiodata}
          onBatchPrintRaporSumatif={handleBatchPrintRaporSumatif}
          onBatchPrintP5={handleBatchPrintP5}
          onBatchPrintBundelLengkap={handleBatchPrintBundelLengkap}
          isBatchPrinting={isBatchPrinting}
          onBatchPrintRaporPkl={handleBatchPrintRaporPkl}
          isBatchPklPrinting={isBatchPklPrinting}
          onBatchPrintSertifikatPkl={handleBatchPrintSertifikatPkl}
          isBatchSertifikatPrinting={isBatchSertifikatPrinting}
          hasLegerData={Boolean(leger?.data || filteredStudents.length > 0)}
          showLogoKananSertifikat={showLogoKananSertifikat}
          toggleShowLogoKananSertifikat={toggleShowLogoKananSertifikat}
          onOpenTranskripModal={(s) => setSelectedTranskripStudent(s)}
          getPdfSklUrl={(sId) => raporApi.getPdfSklUrl(sId)}
          getPdfUkkUrl={(sId) => raporApi.getPdfUkkUrl(sId)}
        />
      )}

      {/* Modal Universal Sertifikat UKK (Lazy-Loaded) */}
      {isJenjangSmk && isUkkModalOpen && (
        <Suspense fallback={null}>
          <UkkSertifikatModal
            isOpen={isUkkModalOpen}
            onClose={() => {
              setIsUkkModalOpen(false);
              setSelectedUkkStudent(null);
            }}
            siswaId={selectedUkkStudent?.id || filteredStudents[0]?.id}
            namaSiswa={selectedUkkStudent?.nama_siswa || filteredStudents[0]?.nama_siswa}
            kelasNama={currentKelasObj?.nama_kelas || waliKelasNama}
          />
        </Suspense>
      )}

      {/* Summary Modal (Lazy-Loaded) */}
      <Suspense fallback={null}>
        <RaporSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          selectedStudent={selectedStudent}
          rekapSiswaData={rekapSiswaData}
          summaryForm={summaryForm}
          formErrors={formErrors}
          onFormChange={handleSummaryFormChange}
          onSubmit={handleSummarySubmit}
          isSaving={isSavingSummary}
          tampilkanKokurikuler={tampilkanKokurikuler}
          isGenap={isGenap}
        />
      </Suspense>

      {/* Monitoring & Rincian Mapel Rombel Modal (Lazy-Loaded) */}
      <Suspense fallback={null}>
        <MonitoringMapelRombelModal
          isOpen={showMonitoringModal}
          onClose={() => setShowMonitoringModal(false)}
          data={classProgressData}
          isLoading={isLoadingClassProgress}
          selectedKelas={selectedKelas}
          kelasOptions={kelasOptions}
          onSelectKelas={setSelectedKelas}
          onSelectMapel={(mId, kId) => {
            navigate(
              `/rapor/nilai?kelas_id=${kId || selectedKelas}&mapel_id=${mId}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
            );
          }}
          activeYearNama={activeYear?.nama}
          activeSemesterNama={activeSemester?.nama}
          kelasNama={currentKelasObj?.nama_kelas || waliKelasNama}
        />
      </Suspense>

      {/* Transkrip Modal (Lazy-Loaded) */}
      <Suspense fallback={null}>
        <TranskripModal
          isOpen={!!selectedTranskripStudent}
          onClose={() => setSelectedTranskripStudent(null)}
          selectedStudent={selectedTranskripStudent}
          transkripData={(transkripData?.data || transkripData || null) as unknown as TranskripNilaiData}
          isLoading={isLoadingTranskrip}
        />
      </Suspense>

      {/* Rapor Render Progress Modal (Interactive Non-Silent Feedback) */}
      <Suspense fallback={null}>
        <RaporRenderProgressModal />
      </Suspense>
    </div>
  );
});

CetakRaporView.displayName = 'CetakRaporView';
