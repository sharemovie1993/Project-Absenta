import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, UserCheck, Sparkles } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { AcademicContextBar } from '../../components/common/AcademicContextBar';
import { SearchableSelectOption } from '../../components/ui/SearchableSelect';
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
import { generateRaporPdf, generateP5RaporPdf, generateRaporKelasBatchPdf } from '../../utils/print/modules/pdfRapor';
import { useRaporPdf } from '../../hooks/useRaporPdf';

// Import Hardened Types, Subcomponents & Schemas
import {
  LegerStudent,
  RawStudent,
  RawLegerEntry,
  SummaryFormData,
  SummaryFormSchema,
  AcademicYear,
  Semester,
  TranskripNilaiData,
} from '../../types/cetakRapor.types';
import { LegerStudentTable } from '../../components/rapor/cetak-rapor/LegerStudentTable';
import { ClassSubjectProgressCard } from '../../components/rapor/cetak-rapor/ClassSubjectProgressCard';
import { CetakRaporHeaderCard } from '../../components/rapor/cetak-rapor/CetakRaporHeaderCard';
import { useRaporPklPrint, KelasOptionItem } from '../../components/rapor/cetak-rapor/useRaporPklPrint';

// Lazy-loaded modals for architectural compliance & performance
const RaporSummaryModal = lazy(() =>
  import('../../components/rapor/cetak-rapor/RaporSummaryModal').then((m) => ({ default: m.RaporSummaryModal }))
);
const TranskripModal = lazy(() =>
  import('../../components/rapor/cetak-rapor/TranskripModal').then((m) => ({ default: m.TranskripModal }))
);

interface ExtendedUserContext {
  nama?: string;
  name?: string;
  full_name?: string;
  nip?: string;
  wali_kelas_kelas_id?: string;
  kelas_id?: string;
  assigned_kelas_id?: string;
  guru_profile?: {
    wali_kelas_di?: {
      id?: string;
    };
  };
}

export default React.memo(function CetakRaporPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isHomeroomTeacher, isKurikulum, isKepalaSekolah, isAdmin, walikelasKelas, walikelasKelasIds } = useCapabilities();

  // ── URL Search Params ──
  const [searchParams] = useSearchParams();
  const kelasParam = searchParams.get('kelas_id') || searchParams.get('kelas') || '';
  const tpParam = searchParams.get('tahun_pelajaran_id') || searchParams.get('tp_id') || '';
  const semParam = searchParams.get('semester_id') || searchParams.get('sem_id') || '';

  // ── State ──
  const [selectedKelas, setSelectedKelas] = useState<string>(() => kelasParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LegerStudent | null>(null);
  const [summaryForm, setSummaryForm] = useState<SummaryFormData>({
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatan_wali: '',
    keputusan_transisi: '',
    catatan_kokurikuler: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SummaryFormData, string>>>({});
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [selectedTranskripStudent, setSelectedTranskripStudent] = useState<LegerStudent | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

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

  // Wali Kelas murni: guru yang ditugaskan sebagai wali kelas tapi bukan admin/kurikulum/kepsek
  const isPureWaliKelas = useMemo(() => {
    if (isAdmin || isKurikulum || isKepalaSekolah) return false;
    return isHomeroomTeacher || Boolean(userKelasId);
  }, [isAdmin, isKurikulum, isKepalaSekolah, isHomeroomTeacher, userKelasId]);

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
  });

  const typedClassList = useMemo<KelasOptionItem[]>(() => {
    return (classList as unknown as KelasOptionItem[]) || [];
  }, [classList]);

  // Auto-select class: prioritize URL param, then Wali Kelas assigned class, fallback to first class
  React.useEffect(() => {
    if (kelasParam && (typedClassList ?? []).some((k) => k.id === kelasParam)) {
      setSelectedKelas(kelasParam);
      return;
    }
    if (userKelasId && (typedClassList ?? []).some((k) => k.id === userKelasId)) {
      if (isPureWaliKelas) {
        setSelectedKelas(userKelasId);
        return;
      }
      if (!selectedKelas) {
        setSelectedKelas(userKelasId);
      }
    } else if (!selectedKelas && (typedClassList ?? []).length > 0) {
      setSelectedKelas(typedClassList[0].id);
    }
  }, [typedClassList, selectedKelas, userKelasId, isPureWaliKelas, kelasParam]);

  // ── Konteks Akademik (TP + Semester) — via hook reusable ──
  const {
    selectedTahunPelajaran,
    selectedSemester,
    handleTpChange: handleAcademicTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
    activeYear: academicActiveYear,
    activeSemester: academicActiveSemester,
  } = useAcademicContext({
    initialTpId: tpParam,
    initialSemId: semParam,
  });

  const activeYear = useMemo<AcademicYear | null>(() => {
    if (!academicActiveYear) return null;
    return { id: academicActiveYear.id, nama: academicActiveYear.tahun, is_active: true };
  }, [academicActiveYear]);

  const activeSemester = useMemo<Semester | null>(() => {
    if (!academicActiveSemester) return null;
    return { id: academicActiveSemester.id, nama: academicActiveSemester.nama_semester, is_active: true };
  }, [academicActiveSemester]);

  // Query Settings Rapor (untuk saklar kokurikuler, arsip sumatif, dll)
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
    const rawYear = academicActiveYear?.tahun || '';
    const match = rawYear.match(/^(\d{4})/);
    const startYear = match ? parseInt(match[1], 10) : 2025;
    return startYear >= 2025;
  }, [settingsRes, academicActiveYear]);

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

  // ── Rekap Absensi custom hook ──
  const { data: rekapSiswaData } = useRekapBulananSiswa(selectedStudent?.id, undefined, activeYear?.id);

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
      const label = `${tingkatPart}${namePart}${jurusanPart}${isWali ? ' ⭐ [KELAS BINAAN ANDA]' : ''}`;
      return {
        value: k.id,
        label,
        raw: k,
      };
    });
  }, [typedClassList, userKelasId, isPureWaliKelas]);

  // ── Filtered students ──
  const filteredStudents = useMemo<LegerStudent[]>(() => {
    if (!selectedKelas) return [];

    const safeStudentList: RawStudent[] = Array.isArray(studentList) ? studentList : [];
    const safeLegerStudents: RawLegerEntry[] = Array.isArray(leger?.data?.students)
      ? (leger.data.students as RawLegerEntry[])
      : [];

    const baseList: RawStudent[] =
      safeStudentList.length > 0
        ? safeStudentList
        : (safeLegerStudents ?? [])?.map((ls) => ({
            id: ls.siswa_id ?? ls.id ?? '',
            sakit: ls.sakit,
            izin: ls.izin,
            alpa: ls.alpa,
          }));

    if (!(baseList ?? []).length) return [];

    const q = searchQuery.toLowerCase().trim();

    return (baseList ?? [])
      ?.map((s): LegerStudent => {
        const found = (safeLegerStudents ?? [])?.find(
          (ls) => ls.id === s.id || ls.siswa_id === s.id
        );
        const nama = s.nama_siswa ?? s.nama ?? s.nama_lengkap ?? '—';
        const nis = s.nis ?? '—';
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

  // ── Summary mutation ──
  const summaryMutation = useMutation({
    mutationFn: raporApi.upsertRaporSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leger'] });
      queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      toast.success('Rekap absensi & catatan wali kelas berhasil disimpan');
      setIsSummaryModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Gagal menyimpan catatan: ${err.message}`);
    },
  });

  const handleOpenSummaryModal = useCallback((student: LegerStudent) => {
    setSelectedStudent(student);
    setSummaryForm({
      sakit: student.sakit ?? 0,
      izin: student.izin ?? 0,
      alpa: student.alpa ?? 0,
      catatan_wali: student.catatan_wali ?? '',
      keputusan_transisi: student.keputusan_transisi ?? '',
      catatan_kokurikuler: student.catatan_kokurikuler ?? '',
    });
    setFormErrors({});
    setIsSummaryModalOpen(true);
  }, []);

  const handleSummaryFormChange = useCallback((field: keyof SummaryFormData, val: string | number) => {
    setSummaryForm((prev) => ({ ...prev, [field]: val }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSummarySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !activeYear?.id || !activeSemester?.id) {
        toast.error('Data kelas / semester belum lengkap');
        return;
      }
      const validation = SummaryFormSchema.safeParse(summaryForm);
      if (!validation.success) {
        const errors: Partial<Record<keyof SummaryFormData, string>> = {};
        (validation.error.errors ?? []).forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof SummaryFormData] = err.message;
          }
        });
        setFormErrors(errors);
        toast.error('Mohon periksa kembali input form Anda');
        return;
      }

      summaryMutation.mutate({
        siswa_id: selectedStudent.id,
        kelas_id: selectedKelas,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        sakit: validation.data.sakit,
        izin: validation.data.izin,
        alpa: validation.data.alpa,
        catatan_wali: validation.data.catatan_wali,
        keputusan_transisi: validation.data.keputusan_transisi,
        catatan_kokurikuler: validation.data.catatan_kokurikuler,
      });
    },
    [selectedStudent, activeYear, activeSemester, summaryForm, selectedKelas, summaryMutation]
  );

  const handlePrintRapor = useCallback(
    async (student: LegerStudent) => {
      if (!activeYear?.id || !activeSemester?.id) {
        toast.error('Tahun pelajaran / semester belum tersedia');
        return;
      }
      const key = `rapor_${student.id}`;
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const { blobUrl } = await generateRaporPdf({
          siswaId: student.id,
          tahunPelajaranId: activeYear.id,
          semesterId: activeSemester.id,
          tahunPelajaranNama: activeYear.nama ?? '',
          semesterNama: activeSemester.nama ?? '',
        });
        window.open(blobUrl, '_blank');
        toast.success(`Pratinjau Rapor ${student.nama_siswa} dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Gagal membuat PDF Rapor: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [activeYear, activeSemester]
  );

  const handlePrintP5 = useCallback(
    async (student: LegerStudent) => {
      if (!activeYear?.id || !activeSemester?.id) {
        toast.error('Tahun pelajaran / semester belum tersedia');
        return;
      }
      const key = `p5_${student.id}`;
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const { blobUrl } = await generateP5RaporPdf({
          siswaId: student.id,
          tahunPelajaranId: activeYear.id,
          semesterId: activeSemester.id,
          tahunPelajaranNama: activeYear.nama ?? '',
          semesterNama: activeSemester.nama ?? '',
        });
        window.open(blobUrl, '_blank');
        toast.success(`Pratinjau Rapor P5 ${student.nama_siswa} dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Gagal membuat PDF P5: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [activeYear, activeSemester]
  );

  const handleExportLeger = useCallback(() => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    const url = `/api/rapor/leger/export?kelas_id=${selectedKelas}&tahun_pelajaran_id=${activeYear.id}&semester_id=${activeSemester.id}`;
    window.open(url, '_blank');
    toast.success('Mengekspor file Excel Leger Kelas...');
  }, [selectedKelas, activeYear, activeSemester]);

  const handleBatchPrintRapor = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    setIsBatchPrinting(true);
    toast.info(`Memproses cetak massal ${filteredStudents.length} Rapor Siswa...`);
    try {
      const { blobUrl } = await generateRaporKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
      });
      window.open(blobUrl, '_blank');
      toast.success(`Pratinjau Rapor Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal membuat PDF Batch Rapor: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  // ── Hook Cetak Rapor PKL Terisolasi ──
  const { handlePrintRaporPkl, handleBatchPrintRaporPkl, isBatchPklPrinting } = useRaporPklPrint({
    selectedKelas,
    classList: typedClassList,
    activeYear,
    activeSemester,
    user,
    setPdfLoading,
  });

  const breadcrumbs = useMemo(
    () => [{ label: 'Rapor', href: '/rapor/dashboard' }, { label: 'Cetak Rapor & Leger' }],
    []
  );

  return (
    <AcademicPageLayout
      title="Leger Kelas & Cetakan Rapor"
      description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pratinjau PDF lembar e-Rapor resmi di tab baru."
      breadcrumbs={breadcrumbs}
      instruction={{
        title: 'Panduan Cetak Rapor & Leger',
        description: 'Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pencetakan lembar e-Rapor resmi.',
        items: [
          { text: 'Pilih Rombel / Kelas untuk merekap ranking leger dan absensi.' },
          { text: 'Klik Ringkasan untuk mengisi catatan wali kelas dan status transisi.' },
          { text: 'Gunakan Cetak Sekaligus untuk mengunduh seluruh rapor dalam 1 file PDF.' },
          { text: 'Ekspor Leger ke spreadsheet Excel untuk kebutuhan arsip dan administrasi.' },
        ],
      }}
      hardeningModuleKey="cetakraporpage"
      topSlot={
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2">
          {/* Kiri: Dropdown TP & Semester + Navigasi Cepat Antarmuka e-Rapor */}
          <div className="flex items-center gap-2 flex-wrap">
            <AcademicContextBar
              id="cetak-rapor"
              tahunPelajaranId={selectedTahunPelajaran}
              semesterId={selectedSemester}
              onTahunPelajaranChange={handleAcademicTpChange}
              onSemesterChange={handleSemesterChange}
              tpOptions={tpOptions}
              semesterOptions={semesterOptions}
              isLoadingTp={isLoadingTp}
              isLoadingSem={isLoadingSem}
              variant="toolbar"
            />

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/rapor/input-nilai?kelas_id=${selectedKelas || ''}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Buka Lembar Input Nilai e-Rapor"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lembar Input Nilai</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/kurikulum/wali-kelas')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
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
      <SectionCard fullWidth className="border-none shadow-none bg-transparent p-0">
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full min-w-0">
          {/* Selector Header Subcomponent */}
          <CetakRaporHeaderCard
            selectedKelas={selectedKelas}
            onSelectKelas={setSelectedKelas}
            kelasOptions={kelasOptions}
            isLoadingClasses={isLoadingClasses}
            selectedTahunPelajaran={selectedTahunPelajaran}
            selectedSemester={selectedSemester}
            onTahunPelajaranChange={handleAcademicTpChange}
            onSemesterChange={handleSemesterChange}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            hasLegerData={Boolean(leger?.data)}
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
            onNavigateInputNilai={() =>
              navigate(
                `/rapor/input-nilai?kelas_id=${selectedKelas || ''}&tahun_pelajaran_id=${selectedTahunPelajaran || ''}&semester_id=${selectedSemester || ''}`
              )
            }
          />

          {/* Monitoring Kelengkapan Nilai Mata Pelajaran Kelas Binaan */}
          {selectedKelas && (
            <ClassSubjectProgressCard
              data={classProgressData}
              isLoading={isLoadingClassProgress}
              tahunPelajaranId={activeYear?.id}
              semesterId={activeSemester?.id}
            />
          )}

          {/* Student List & Leger Table */}
          <LegerStudentTable
            students={filteredStudents}
            isLoading={isLoadingLeger}
            isJenjangSmk={isJenjangSmk}
            pdfLoading={pdfLoading}
            tahunPelajaranId={activeYear?.id}
            semesterId={activeSemester?.id}
            onOpenSummaryModal={handleOpenSummaryModal}
            onPrintRapor={handlePrintRapor}
            onPrintP5={handlePrintP5}
            onPrintRaporPkl={handlePrintRaporPkl}
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
            isSaving={summaryMutation.isPending}
            tampilkanKokurikuler={tampilkanKokurikuler}
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
      </SectionCard>
    </AcademicPageLayout>
  );
});
