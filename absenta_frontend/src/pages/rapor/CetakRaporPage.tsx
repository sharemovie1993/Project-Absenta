import React, { useMemo, useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Layers } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { TabOption } from '../../components/ui/TabSwitcher';
import { raporApi } from '../../api/rapor.api';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useAcademicContext } from '../../hooks/useAcademicContext';
import { useStrukturKurikulumOptions } from '../../hooks/useStrukturKurikulumOptions';
import { useJenjang } from '../../hooks/useJenjang';
import { useGuruMe } from '../../hooks/useGuruMe';
import { useRekapBulananSiswa } from '../../hooks/attendance/useRekapAbsensi';
import { toast } from 'sonner';
import { useRaporPdf } from '../../hooks/useRaporPdf';
import type { InstructionData } from '../../contexts/InstructionContext';

// Import Hardened Types, Subcomponents & Custom Hooks
import {
  LegerStudent,
  RawStudent,
  RawLegerEntry,
  AcademicYear,
  Semester,
  TranskripNilaiData,
} from '../../types/cetakRapor.types';
import { LegerStudentTable } from '../../components/rapor/cetak-rapor/LegerStudentTable';
import { CetakRaporHeaderCard } from '../../components/rapor/cetak-rapor/CetakRaporHeaderCard';
import { useRaporPklPrint, KelasOptionItem } from '../../components/rapor/cetak-rapor/useRaporPklPrint';
import { useRaporSummaryManager } from '../../components/rapor/cetak-rapor/useRaporSummaryManager';
import { useCetakRaporActions } from '../../components/rapor/cetak-rapor/useCetakRaporActions';
import type { ClassSubjectProgressData } from '../../components/rapor/cetak-rapor/ClassSubjectProgressCard';

// Lazy-loaded modals for architectural compliance & performance
const RaporSummaryModal = lazy(() =>
  import('../../components/rapor/cetak-rapor/RaporSummaryModal').then((m) => ({ default: m.RaporSummaryModal }))
);
const TranskripModal = lazy(() =>
  import('../../components/rapor/cetak-rapor/TranskripModal').then((m) => ({ default: m.TranskripModal }))
);
const SertifikatPklModal = lazy(() =>
  import('../../components/hubin/SertifikatPklModal').then((m) => ({ default: m.SertifikatPklModal }))
);
const RaporRenderProgressModal = lazy(() =>
  import('../../components/rapor/cetak-rapor/RaporRenderProgressModal').then((m) => ({ default: m.RaporRenderProgressModal }))
);
const MonitoringMapelRombelModal = lazy(() =>
  import('../../components/rapor/input-nilai/MonitoringMapelRombelModal').then((m) => ({ default: m.MonitoringMapelRombelModal }))
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

// Static Instruction Constant to eliminate infinite re-render loops
const CETAK_RAPOR_INSTRUCTION: InstructionData = {
  title: 'Panduan Cetak Rapor & Leger',
  description: 'Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pencetakan lembar e-Rapor resmi.',
  items: [
    { text: 'Pilih Rombel / Kelas untuk merekap ranking leger dan absensi.' },
    { text: 'Klik Catatan untuk mengisi catatan wali kelas dan status transisi.' },
    { text: 'Gunakan Cetak Sekaligus untuk mengunduh seluruh rapor dalam 1 file PDF.' },
    { text: 'Ekspor Leger ke spreadsheet Excel untuk kebutuhan arsip dan administrasi.' },
  ],
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

export default React.memo(function CetakRaporPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCurrentRoute = location.pathname.toLowerCase().replace(/\/$/, '') === '/rapor/cetak';
  const { isHomeroomTeacher, isKurikulum, isKepalaSekolah, isAdmin, walikelasKelas, walikelasKelasIds } = useCapabilities();
  const canSupervise = isAdmin || isKurikulum || isKepalaSekolah;

  // ── User Auth & Wali Kelas Operational Context ──
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();

  const userKelasId = useMemo(() => {
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
  }, [walikelasKelas, walikelasKelasIds, guruProfile, user]);

  const waliKelasNama = walikelasKelas?.nama_kelas || (walikelasKelas as unknown as { nama?: string })?.nama || 'Kelas Binaan';
  const hasWaliKelas = Boolean(userKelasId);

  // Wali Kelas murni: guru yang ditugaskan sebagai wali kelas tapi bukan admin/kurikulum/kepsek
  const isPureWaliKelas = useMemo(() => {
    if (isAdmin || isKurikulum || isKepalaSekolah) return false;
    return isHomeroomTeacher || Boolean(userKelasId);
  }, [isAdmin, isKurikulum, isKepalaSekolah, isHomeroomTeacher, userKelasId]);

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
    const saved = getSavedCetakContext();
    const urlTab = searchParams.get('tab') as 'wali_kelas' | 'supervisi' | null;
    let defaultTab: 'wali_kelas' | 'supervisi' = 'wali_kelas';
    if (!hasWaliKelas && canSupervise) {
      defaultTab = 'supervisi';
    }
    const validTab = urlTab && ['wali_kelas', 'supervisi'].includes(urlTab) ? urlTab : saved?.tab || defaultTab;

    initialContextRef.current = {
      tab: validTab,
      kelasId: searchParams.get('kelas_id') || searchParams.get('kelas') || (validTab === 'wali_kelas' && userKelasId ? userKelasId : saved?.kelasId || ''),
      tpId: searchParams.get('tahun_pelajaran_id') || searchParams.get('tp_id') || saved?.tahunPelajaranId || '',
      semId: searchParams.get('semester_id') || searchParams.get('sem_id') || saved?.semesterId || '',
    };
  }

  const initialContext = initialContextRef.current;

  // ── State ──
  const [activeRoleTab, setActiveRoleTab] = useState<'wali_kelas' | 'supervisi'>(initialContext.tab);
  const [selectedKelas, setSelectedKelas] = useState<string>(initialContext.kelasId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranskripStudent, setSelectedTranskripStudent] = useState<LegerStudent | null>(null);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  // Tab Options (Disimplifikasi 1-2 kata agar kompak dan tidak overflow)
  const tabOptions: TabOption[] = useMemo(() => {
    const opts: TabOption[] = [];

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
  }, [hasWaliKelas, canSupervise]);

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
    return (classList as unknown as KelasOptionItem[]) || [];
  }, [classList]);

  // Auto-select class logic
  useEffect(() => {
    if (activeRoleTab === 'wali_kelas' && userKelasId) {
      if (selectedKelas !== userKelasId) setSelectedKelas(userKelasId);
      return;
    }
    if (!selectedKelas && (typedClassList ?? []).length > 0) {
      setSelectedKelas(typedClassList[0].id);
    }
  }, [activeRoleTab, userKelasId, selectedKelas, typedClassList]);

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

  // ── Two-Way Reactive URL & Smart Session Persistence ──
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

  // Sinkronisasi state HANYA saat tombol Back/Forward browser ditekan (popstate)
  useEffect(() => {
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
  }, [setSelectedTahunPelajaran, setSelectedSemester]);

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
  const { printLeger } = useRaporPdf({
    tahunPelajaranId: activeYear?.id,
    semesterId: activeSemester?.id,
  });

  // ── Hook Struktur Kurikulum Rombel ──
  const currentKelasObj = useMemo<KelasOptionItem | undefined>(() => {
    return (typedClassList ?? []).find((k) => k.id === selectedKelas);
  }, [typedClassList, selectedKelas]);

  const { totalJp: kurikulumTotalJp, rawList: kurikulumStrukturList } = useStrukturKurikulumOptions({
    tahunPelajaranId: activeYear?.id,
    tingkat: currentKelasObj?.tingkat,
    jurusanId: currentKelasObj?.jurusan_id || currentKelasObj?.jurusan?.id,
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
          rank: found?.rank ?? '—',
          rata_rata: found?.rata_rata ?? 0,
          sakit: found?.sakit ?? s.sakit ?? 0,
          izin: found?.izin ?? s.izin ?? 0,
          alpa: found?.alpa ?? s.alpa ?? 0,
          catatan_wali: found?.catatan_wali ?? '',
          keputusan_transisi: found?.keputusan_transisi ?? '',
          catatan_kokurikuler: found?.catatan_kokurikuler ?? '',
          referensi_absensi_harian: found?.referensi_absensi_harian || { sakit: 0, izin: 0, alpa: 0 },
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
  } = useCetakRaporActions({
    selectedKelas,
    activeYear,
    activeSemester,
    currentKelasObj,
    filteredStudents,
  });

  // ── Hook Cetak Rapor PKL Terisolasi ──
  const { handlePrintRaporPkl, handleBatchPrintRaporPkl, handleOpenSertifikatPkl, isBatchPklPrinting } = useRaporPklPrint({
    selectedKelas,
    classList: typedClassList,
    activeYear,
    activeSemester,
    user,
    setPdfLoading,
  });

  const [selectedSertifikatPklId, setSelectedSertifikatPklId] = useState<string | null>(null);

  const handleOpenSertifikat = useCallback(
    async (student: LegerStudent) => {
      const pklId = await handleOpenSertifikatPkl(student);
      if (pklId) {
        setSelectedSertifikatPklId(pklId);
      }
    },
    [handleOpenSertifikatPkl]
  );

  const breadcrumbs = useMemo(
    () => [{ label: 'Rapor', href: '/rapor/dashboard' }, { label: 'Cetak Rapor & Leger' }],
    []
  );

  return (
    <AcademicPageLayout
      title="Leger Kelas & Cetakan Rapor"
      description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pratinjau PDF lembar e-Rapor resmi di tab baru."
      breadcrumbs={breadcrumbs}
      instruction={CETAK_RAPOR_INSTRUCTION}
      hardeningModuleKey="cetakraporpage"
    >
      <SectionCard fullWidth className="border-none shadow-none bg-transparent p-0">
        <div className="space-y-4 animate-in fade-in duration-500 pb-10 w-full max-w-full min-w-0">
          {/* Unified Selector Header Card with Integrated Toolbar & Action Bar */}
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
            onPrintLeger={() => printLeger(selectedKelas)}
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
            onNavigateInputNilai={() =>
              navigate(
                `/rapor/nilai?kelas_id=${selectedKelas || ''}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
              )
            }
          />

          {/* Student List & Leger Table */}
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
            onPrintSertifikatPkl={handleOpenSertifikat}
            onPrintLeger={() => printLeger(selectedKelas)}
            onExportLeger={handleExportLeger}
            onBatchPrintRapor={handleBatchPrintRapor}
            isBatchPrinting={isBatchPrinting}
            onBatchPrintRaporPkl={handleBatchPrintRaporPkl}
            isBatchPklPrinting={isBatchPklPrinting}
            hasLegerData={Boolean(leger?.data || filteredStudents.length > 0)}
            onOpenTranskripModal={(s) => setSelectedTranskripStudent(s)}
            getPdfSklUrl={(sId) => raporApi.getPdfSklUrl(sId)}
            getPdfUkkUrl={(sId) => raporApi.getPdfUkkUrl(sId)}
          />
        </div>

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

        {/* Sertifikat PKL Modal (Lazy-Loaded) */}
        <Suspense fallback={null}>
          {selectedSertifikatPklId && (
            <SertifikatPklModal
              isOpen={Boolean(selectedSertifikatPklId)}
              onClose={() => setSelectedSertifikatPklId(null)}
              siswaPklId={selectedSertifikatPklId}
            />
          )}
        </Suspense>

        {/* Rapor Render Progress Modal (Interactive Non-Silent Feedback) */}
        <Suspense fallback={null}>
          <RaporRenderProgressModal />
        </Suspense>
      </SectionCard>
    </AcademicPageLayout>
  );
});
