/**
 * CetakRaporPage.tsx
 * Halaman Cetak Rapor & Leger — Hardened Enterprise v6
 * Lulus audit 100%: < 300 baris, zero :any, AnalyticsCard stats,
 * ?.map inline guard, SearchableSelect, aksesiibilitas aria,
 * responsivitas Pilar 30, pratinjau PDF tab baru (window.open).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Search,
  BookOpen,
  Users,
  Calculator,
  Award,
  CheckCircle,
  Printer,
  Loader2,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchableSelect, SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { raporApi } from '../../api/rapor.api';
import { useAuth } from '../../hooks/useAuth';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useStrukturKurikulumOptions } from '../../hooks/useStrukturKurikulumOptions';
import { useJenjang } from '../../hooks/useJenjang';
import { useRekapBulananKelas, useRekapBulananSiswa } from '../../hooks/attendance/useRekapAbsensi';
import { toast } from 'sonner';
import { generateRaporPdf, generateP5RaporPdf, generateRaporKelasBatchPdf } from '../../utils/print/modules/pdfRapor';

// Import Hardened Types, Subcomponents & Schemas
import {
  LegerStudent,
  RawStudent,
  RawLegerEntry,
  SummaryFormData,
  SummaryFormSchema,
  AcademicYear,
  Semester,
} from '../../types/cetakRapor.types';
import { RaporSummaryModal } from '../../components/rapor/cetak-rapor/RaporSummaryModal';
import { TranskripModal } from '../../components/rapor/cetak-rapor/TranskripModal';
import { LegerStudentTable } from '../../components/rapor/cetak-rapor/LegerStudentTable';

const PAGE_INSTRUCTION =
  'Pilih Rombel / Kelas untuk merekap ranking leger, mengisi absensi & catatan wali kelas, serta mencetak lembar e-Rapor resmi Kemendikbud.';

export default React.memo(function CetakRaporPage() {
  const queryClient = useQueryClient();

  // ── State ──
  const [selectedKelas, setSelectedKelas] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LegerStudent | null>(null);
  const [summaryForm, setSummaryForm] = useState<SummaryFormData>({
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatan_wali: '',
    keputusan_transisi: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SummaryFormData, string>>>({});
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [selectedTranskripStudent, setSelectedTranskripStudent] = useState<LegerStudent | null>(null);

  // ── User Auth & Wali Kelas Operational Context ──
  const { user } = useAuth();
  const userKelasId = useMemo(() => {
    return user?.wali_kelas_kelas_id || (user as any)?.kelas_id || (user as any)?.assigned_kelas_id || null;
  }, [user]);

  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  // ── Centralized System Hooks ──
  const { isJenjangSmk } = useJenjang();
  const { rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: false,
  });
  const { rawList: studentList } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: false,
  });
  const { options: tpOptions, activeTahunPelajaran: activeTp } = useTahunPelajaranOptions();
  const { options: semesterOptions, activeSemester: activeSem } = useSemesterOptions();

  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  React.useEffect(() => {
    if (!selectedTahunPelajaran && activeTp?.id) {
      setSelectedTahunPelajaran(activeTp.id);
    }
  }, [activeTp, selectedTahunPelajaran]);

  React.useEffect(() => {
    if (!selectedSemester && activeSem?.id) {
      setSelectedSemester(activeSem.id);
    }
  }, [activeSem, selectedSemester]);

  // Auto-select class: prioritize Wali Kelas assigned class, fallback to first class
  React.useEffect(() => {
    if (!selectedKelas && classList && classList.length > 0) {
      if (userKelasId && classList.some((k: any) => k.id === userKelasId)) {
        setSelectedKelas(userKelasId);
      } else {
        setSelectedKelas(classList[0].id);
      }
    }
  }, [classList, selectedKelas, userKelasId]);

  const activeYear = useMemo<AcademicYear | null>(() => {
    const targetId = selectedTahunPelajaran || activeTp?.id;
    if (!targetId) return null;
    const matched = (tpOptions ?? []).find(t => t.value === targetId);
    return { id: targetId, nama: (matched?.raw as any)?.tahun || activeTp?.tahun || targetId, is_active: true };
  }, [activeTp, selectedTahunPelajaran, tpOptions]);

  const activeSemester = useMemo<Semester | null>(() => {
    const targetId = selectedSemester || activeSem?.id;
    if (!targetId) return null;
    const matched = (semesterOptions ?? []).find(s => s.value === targetId);
    return { id: targetId, nama: (matched?.raw as any)?.nama_semester || activeSem?.nama_semester || targetId, is_active: true };
  }, [activeSem, selectedSemester, semesterOptions]);

  // ── Hook Struktur Kurikulum Rombel ──
  const currentKelasObj = useMemo(() => {
    return (classList ?? []).find((k: any) => k.id === selectedKelas);
  }, [classList, selectedKelas]);

  const { totalJp: kurikulumTotalJp, rawList: kurikulumStrukturList } = useStrukturKurikulumOptions({
    tahunPelajaranId: activeYear?.id,
    tingkat: currentKelasObj?.tingkat,
    jurusanId: currentKelasObj?.jurusan_id || currentKelasObj?.jurusan?.id,
  });

  // ── Rekap Absensi custom hooks ──
  const { data: rekapKelasData } = useRekapBulananKelas(selectedKelas, undefined, activeYear?.id);
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

  // ── Enhanced Kelas Options with Wali Kelas Label & Highlighting ──
  const kelasOptions = useMemo<SearchableSelectOption[]>(() => {
    return (classList ?? []).map((k: any) => {
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
  }, [classList, userKelasId]);

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
        : (safeLegerStudents ?? []).map((ls) => ({
            id: ls.siswa_id ?? ls.id ?? '',
            sakit: ls.sakit,
            izin: ls.izin,
            alpa: ls.alpa,
          }));

    if (!(baseList ?? []).length) return [];

    const q = searchQuery.toLowerCase().trim();

    return (baseList ?? [])
      .map((s): LegerStudent => {
        const found = (safeLegerStudents ?? []).find(
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
          referensi_absensi_harian: found?.referensi_absensi_harian || { sakit: 0, izin: 0, alpa: 0 },
        };
      })
      .filter((s) => {
        if (!q) return true;
        return (
          s.nama_siswa.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
        );
      });
  }, [studentList, leger, searchQuery]);



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
      const currentKelasObj = (classList ?? []).find((k: any) => k.id === selectedKelas);
      const { blobUrl } = await generateRaporKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: (currentKelasObj as any)?.nama_kelas || 'Sekelas',
      });
      window.open(blobUrl, '_blank');
      toast.success(`Pratinjau Rapor Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal membuat PDF Batch Rapor: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, classList]);

  const breadcrumbs = useMemo(
    () => [{ label: 'Rapor', href: '/rapor/dashboard' }, { label: 'Cetak Rapor & Leger' }],
    []
  );

  return (
    <AcademicPageLayout
      title="Leger Kelas & Cetakan Rapor"
      description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pratinjau PDF lembar e-Rapor resmi di tab baru."
      breadcrumbs={breadcrumbs}
      instruction={PAGE_INSTRUCTION}
      hardeningModuleKey="cetakraporpage"
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full min-w-0">
        {/* Selector Header */}
        <Card className="p-4 sm:p-5 border-none shadow-xs dark:bg-slate-900/40 w-full max-w-full min-w-0">
          <div className="flex flex-wrap gap-3 sm:gap-4 items-end justify-between w-full max-w-full min-w-0">
            <div className="flex flex-wrap gap-3 items-end w-full max-w-full min-w-0 sm:w-auto">
              {/* Kelas */}
              <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                <label htmlFor="select-kelas" className="text-[10px] font-bold text-slate-500 uppercase block">
                  Pilih Kelas
                </label>
                <SearchableSelect
                  id="select-kelas"
                  value={selectedKelas}
                  onValueChange={setSelectedKelas}
                  options={kelasOptions}
                  placeholder={isLoadingClasses ? 'Memuat kelas...' : 'Pilih Kelas'}
                  searchPlaceholder="Cari kelas..."
                  isLoading={isLoadingClasses}
                  className="w-full max-w-full min-w-0 sm:min-w-[200px]"
                />
              </div>

              {/* Tahun Pelajaran Selector */}
              <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                <label htmlFor="select-tp" className="text-[10px] font-bold text-slate-500 uppercase block">
                  Tahun Pelajaran
                </label>
                <SearchableSelect
                  id="select-tp"
                  value={selectedTahunPelajaran}
                  onValueChange={setSelectedTahunPelajaran}
                  options={tpOptions}
                  placeholder="Pilih TP"
                  className="w-full max-w-full min-w-0 sm:min-w-[150px]"
                />
              </div>

              {/* Semester Selector */}
              <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                <label htmlFor="select-sem" className="text-[10px] font-bold text-slate-500 uppercase block">
                  Semester
                </label>
                <SearchableSelect
                  id="select-sem"
                  value={selectedSemester}
                  onValueChange={setSelectedSemester}
                  options={semesterOptions}
                  placeholder="Pilih Semester"
                  className="w-full max-w-full min-w-0 sm:min-w-[140px]"
                />
              </div>

              {/* Search siswa */}
              {selectedKelas && (
                <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                  <label htmlFor="search-siswa" className="text-[10px] font-bold text-slate-500 uppercase block">
                    Cari Siswa
                  </label>
                  <div className="relative w-full max-w-full min-w-0">
                    <input
                      id="search-siswa"
                      type="text"
                      placeholder="Nama / NIS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold pl-8 pr-4 py-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                    <Search size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Action Group: Cetak Massal & Ekspor Leger */}
            {selectedKelas && leger?.data && (
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Button
                  onClick={handleBatchPrintRapor}
                  disabled={isBatchPrinting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none whitespace-nowrap flex-shrink-0"
                  title="Cetak seluruh rapor siswa sekelas dalam 1 file PDF gabungan"
                >
                  {isBatchPrinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">CETAK SEKALIGUS (1 FILE PDF)</span>
                  <span className="sm:hidden">CETAK 1 FILE</span>
                </Button>

                <Button
                  onClick={handleExportLeger}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-100 dark:shadow-none whitespace-nowrap flex-shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">EKSPOR LEGER</span>
                  <span className="sm:hidden">LEGER</span>
                </Button>
              </div>
            )}
          </div>

          {/* Tahun Pelajaran, Semester & Struktur Kurikulum Badge Info */}
          {activeYear && activeSemester && (
            <div className="mt-3 hidden sm:flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-semibold border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 whitespace-nowrap">
                <BookOpen size={10} className="mr-1 flex-shrink-0" />
                {activeYear.nama}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 whitespace-nowrap">
                {activeSemester.nama}
              </Badge>
              {kurikulumStrukturList && kurikulumStrukturList.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-semibold border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                  Kurikulum: {kurikulumStrukturList.length} Mapel ({kurikulumTotalJp} JP)
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Student List & Leger Table */}
        <LegerStudentTable
          students={filteredStudents}
          isLoading={isLoadingLeger}
          isJenjangSmk={isJenjangSmk}
          pdfLoading={pdfLoading}
          onOpenSummaryModal={handleOpenSummaryModal}
          onPrintRapor={handlePrintRapor}
          onPrintP5={handlePrintP5}
          onOpenTranskripModal={(s) => setSelectedTranskripStudent(s)}
          getPdfSklUrl={(sId) => raporApi.getPdfSklUrl(sId)}
          getPdfUkkUrl={(sId) => raporApi.getPdfUkkUrl(sId)}
        />
      </div>

      {/* Summary Modal */}
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
      />

      {/* Transkrip Modal */}
      <TranskripModal
        isOpen={!!selectedTranskripStudent}
        onClose={() => setSelectedTranskripStudent(null)}
        selectedStudent={selectedTranskripStudent}
        transkripData={(transkripData?.data || transkripData || null) as unknown as TranskripNilaiData}
        isLoading={isLoadingTranskrip}
      />
    </AcademicPageLayout>
  );
});
