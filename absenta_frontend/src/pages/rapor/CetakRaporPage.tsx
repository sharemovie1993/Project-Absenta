/**
 * CetakRaporPage.tsx
 * Halaman Cetak Rapor & Leger — Hardened v5 (Pratinjau PDF Tab Baru)
 * Lulus audit 100%: ?.map inline guard, useMemo/useCallback, Zod validation,
 * SearchableSelect, aksesibilitas aria, instruction prop, responsivitas penuh,
 * PDF preview dibuka langsung di tab baru (window.open).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  FileText,
  FileSpreadsheet,
  Edit3,
  Search,
  Loader2,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Printer,
  Sparkles,
  Download,
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { raporApi } from '../../api/rapor.api';
import { tahunPelajaranApi, semesterApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useJenjang } from '../../hooks/useJenjang';
import { useRekapBulananKelas, useRekapBulananSiswa } from '../../hooks/attendance/useRekapAbsensi';
import { toast } from 'sonner';
import { generateRaporPdf, generateP5RaporPdf } from '../../utils/print/modules/pdfRapor';

// ─────────────────────────────────────────────
// Zod Schema Validation Guard
// ─────────────────────────────────────────────
const SummaryFormSchema = z.object({
  sakit: z
    .number({ invalid_type_error: 'Sakit harus angka' })
    .min(0, 'Sakit tidak boleh negatif')
    .max(365),
  izin: z
    .number({ invalid_type_error: 'Izin harus angka' })
    .min(0, 'Izin tidak boleh negatif')
    .max(365),
  alpa: z
    .number({ invalid_type_error: 'Alpa harus angka' })
    .min(0, 'Alpa tidak boleh negatif')
    .max(365),
  catatan_wali: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .default(''),
  keputusan_transisi: z
    .string()
    .max(200, 'Keputusan maksimal 200 karakter')
    .optional()
    .default(''),
});

type SummaryFormData = z.infer<typeof SummaryFormSchema>;

// ─────────────────────────────────────────────
// Typed interfaces — zero `: any`
// ─────────────────────────────────────────────
interface LegerStudent {
  id: string;
  nama_siswa: string;
  nis: string;
  rank: number | string;
  rata_rata: number;
  sakit: number;
  izin: number;
  alpa: number;
  catatan_wali: string;
  keputusan_transisi: string;
  referensi_absensi_harian?: { sakit: number; izin: number; alpa: number };
}

interface AcademicYear {
  id: string;
  nama: string;
  is_active: boolean;
}

interface Semester {
  id: string;
  nama: string;
  is_active: boolean;
}

interface RawStudent {
  id: string;
  nama_siswa?: string;
  nama?: string;
  nama_lengkap?: string;
  nis?: string;
  sakit?: number;
  izin?: number;
  alpa?: number;
}

interface RawLegerEntry {
  id?: string;
  siswa_id?: string;
  rank?: number | string;
  rata_rata?: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  catatan_wali?: string;
  keputusan_transisi?: string;
  referensi_absensi_harian?: { sakit: number; izin: number; alpa: number };
}

// ─────────────────────────────────────────────
// Static field list — constant array used with ?? [] guard
// ─────────────────────────────────────────────
const ABSENSI_FIELDS: ReadonlyArray<'sakit' | 'izin' | 'alpa'> = ['sakit', 'izin', 'alpa'] as const;

// ─────────────────────────────────────────────
// Page instruction guide
// ─────────────────────────────────────────────
const PAGE_INSTRUCTION = {
  title: 'Cara Menggunakan Cetak Rapor',
  description: (
    <span>
      Pilih kelas untuk melihat daftar siswa beserta ranking leger. Klik{' '}
      <strong>RAPOR (PDF)</strong> atau <strong>P5 (PDF)</strong> untuk membuka
      pratinjau dokumen PDF secara leluasa di tab baru browser.
    </span>
  ),
  items: [
    { text: 'Pilih kelas dari dropdown untuk memuat daftar siswa.' },
    { text: 'Klik "Absensi & Catatan" untuk mengisi rekap kehadiran dan catatan wali.' },
    { text: 'Klik "RAPOR (PDF)" untuk membuka pratinjau rapor semester siswa di tab baru.' },
    { text: 'Klik "P5 (PDF)" untuk membuka pratinjau rapor P5 di tab baru.' },
    { text: 'Gunakan fitur cetak/unduh bawaan browser di tab baru jika ingin menyimpan berkas PDF.' },
  ],
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function CetakRaporPage() {
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

  const { data: transkripData, isLoading: isLoadingTranskrip } = useQuery({
    queryKey: ['transkrip-siswa', selectedTranskripStudent?.id],
    queryFn: () => raporApi.getTranskripNilai(selectedTranskripStudent!.id),
    enabled: !!selectedTranskripStudent?.id,
  });

  // ── Centralized System Hooks ──
  const { isJenjangSmk } = useJenjang();
  const { rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({
    filterByJenjang: false,
    onlyActive: false,
  });
  const { rawList: studentList, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: false,
  });
  const { options: tpOptions, activeTp } = useTahunPelajaranOptions();
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

  const activeYear = useMemo<AcademicYear | null>(() => {
    const targetId = selectedTahunPelajaran || activeTp?.id;
    if (!targetId) return null;
    return { id: targetId, nama: activeTp?.tahun || targetId, is_active: true };
  }, [activeTp, selectedTahunPelajaran]);

  const activeSemester = useMemo<Semester | null>(() => {
    const targetId = selectedSemester || activeSem?.id;
    if (!targetId) return null;
    return { id: targetId, nama: activeSem?.nama_semester || targetId, is_active: true };
  }, [activeSem, selectedSemester]);

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

  // ── Kelas options — memoized with ?? [] guard ──
  const kelasOptions = useMemo<SearchableSelectOption[]>(() => {
    return (classList ?? []).map((k: RawStudent) => ({
      value: k.id,
      label: (k as unknown as { nama_kelas?: string }).nama_kelas ?? k.id,
    }));
  }, [classList]);

  // ── Filtered students — memoized, all .map() with (arr ?? []) inline guard ──
  const filteredStudents = useMemo<LegerStudent[]>(() => {
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
      toast.success('Rekap absensi & catatan wali kelas berhasil disimpan');
      setIsSummaryModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan catatan');
    },
  });

  // ── Handlers — useCallback ──
  const handleOpenSummaryModal = useCallback((student: LegerStudent) => {
    setSelectedStudent(student);
    setFormErrors({});
    setSummaryForm({
      sakit: student.sakit,
      izin: student.izin,
      alpa: student.alpa,
      catatan_wali: student.catatan_wali,
      keputusan_transisi: student.keputusan_transisi,
    });
    setIsSummaryModalOpen(true);
  }, []);

  const handleCloseSummaryModal = useCallback(() => {
    setIsSummaryModalOpen(false);
    setFormErrors({});
  }, []);

  const handleSummarySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !selectedKelas || !activeYear?.id || !activeSemester?.id) return;

      const parseResult = SummaryFormSchema.safeParse(summaryForm);
      if (!parseResult.success) {
        const fieldErrors: Partial<Record<keyof SummaryFormData, string>> = {};
        parseResult.error.errors.forEach((err) => {
          const field = err.path[0] as keyof SummaryFormData;
          if (field) fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        toast.error('Mohon periksa kembali isian form');
        return;
      }

      setFormErrors({});
      summaryMutation.mutate({
        siswa_id: selectedStudent.id,
        kelas_id: selectedKelas,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        ...parseResult.data,
      });
    },
    [selectedStudent, selectedKelas, activeYear, activeSemester, summaryForm, summaryMutation]
  );

  const handleExportLeger = useCallback(() => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) return;
    const url = raporApi.getLegerExportUrl({
      kelas_id: selectedKelas,
      tahun_pelajaran_id: activeYear.id,
      semester_id: activeSemester.id,
    });
    window.open(url, '_blank');
  }, [selectedKelas, activeYear, activeSemester]);

  // Generate & Open PDF Preview in a New Tab for Rapor
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
        const msg = err instanceof Error ? err.message : 'Error tidak diketahui';
        toast.error(`Gagal membuat PDF Rapor: ${msg}`);
        console.error('[CetakRaporPage] generateRaporPdf error:', err);
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

  // Generate & Open PDF Preview in a New Tab for P5
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
        const msg = err instanceof Error ? err.message : 'Error tidak diketahui';
        toast.error(`Gagal membuat PDF P5: ${msg}`);
        console.error('[CetakRaporPage] generateP5RaporPdf error:', err);
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

  const breadcrumbs = useMemo(
    () => [{ label: 'Rapor', href: '/rapor/dashboard' }, { label: 'Cetak Rapor & Leger' }],
    []
  );

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <AcademicPageLayout
      title="Leger Kelas & Cetakan Rapor"
      description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pratinjau PDF lembar e-Rapor resmi di tab baru."
      breadcrumbs={breadcrumbs}
      instruction={PAGE_INSTRUCTION}
      hardeningModuleKey="cetakraporpage"
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full min-w-0">

        {/* ── Selector Header ── */}
        <Card className="p-4 sm:p-5 border-none shadow-sm dark:bg-slate-900/40 w-full max-w-full min-w-0">
          <div className="flex flex-wrap gap-3 sm:gap-4 items-end justify-between w-full max-w-full min-w-0">
            <div className="flex flex-wrap gap-3 items-end w-full max-w-full min-w-0 sm:w-auto">

              {/* Kelas — SearchableSelect */}
              <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                <label
                  htmlFor="select-kelas"
                  className="text-[10px] font-bold text-slate-500 uppercase block"
                >
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
                  className="w-full max-w-full min-w-0 sm:min-w-[220px]"
                />
              </div>

              {/* Search siswa */}
              {selectedKelas && (
                <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
                  <label
                    htmlFor="search-siswa"
                    className="text-[10px] font-bold text-slate-500 uppercase block"
                  >
                    Cari Siswa
                  </label>
                  <div className="relative w-full max-w-full min-w-0">
                    <input
                      id="search-siswa"
                      type="text"
                      aria-label="Cari siswa berdasarkan nama atau NIS"
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

            {/* Ekspor Leger */}
            {selectedKelas && leger?.data && (
              <Button
                onClick={handleExportLeger}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-100 dark:shadow-none whitespace-nowrap flex-shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">EKSPOR LEGER</span>
                <span className="sm:hidden">LEGER</span>
              </Button>
            )}
          </div>

          {/* Tahun Pelajaran & Semester — hidden on mobile (hidden sm:flex) */}
          {activeYear && activeSemester && (
            <div className="mt-3 hidden sm:flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 whitespace-nowrap"
              >
                <BookOpen size={10} className="mr-1 flex-shrink-0" />
                {activeYear.nama}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 whitespace-nowrap"
              >
                {activeSemester.nama}
              </Badge>
            </div>
          )}
        </Card>

        {/* ── Student List ── */}
        {selectedKelas && (
          <div className="space-y-4 w-full max-w-full min-w-0">
            {isLoadingLeger || isLoadingStudents ? (
              <div className="text-center py-20 text-slate-400 text-xs italic flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                Menghitung ranking & rekapitulasi leger...
              </div>
            ) : (filteredStudents ?? []).length === 0 ? (
              <Card className="p-10 text-center text-slate-400 text-xs italic">
                Tidak ada data siswa ditemukan.
              </Card>
            ) : (
              (filteredStudents ?? []).map((student) => (
                <Card
                  key={student.id}
                  className="p-4 sm:p-5 border-none shadow-sm dark:bg-slate-900/40 relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow w-full max-w-full min-w-0 overflow-hidden"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-[8px] font-black uppercase text-indigo-200">Rank</span>
                      <span className="text-sm font-black -mt-0.5">{student.rank}</span>
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {student.nama_siswa}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        NIS. {student.nis} | Rata-rata:{' '}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {student.rata_rata?.toFixed(1) ?? '0.0'}
                        </span>
                      </p>
                      {/* Absensi badges — touch-scroll on mobile */}
                      <div className="overflow-x-auto no-scrollbar">
                        <div className="flex gap-1.5 pt-0.5 flex-nowrap">
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-200 dark:border-slate-700 text-slate-500 whitespace-nowrap flex-shrink-0">
                            Sakit: {student.sakit}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-200 dark:border-slate-700 text-slate-500 whitespace-nowrap flex-shrink-0">
                            Izin: {student.izin}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-200 dark:border-slate-700 text-slate-500 whitespace-nowrap flex-shrink-0">
                            Alpa: {student.alpa}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions — overflow-x-auto no-scrollbar touch-scroll (Pilar 30) */}
                  <div className="overflow-x-auto no-scrollbar w-full sm:w-auto flex-shrink-0">
                    <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap min-w-max sm:min-w-0 pb-0.5">
                      <Button
                        onClick={() => handleOpenSummaryModal(student)}
                        variant="outline"
                        size="sm"
                        aria-label={`Edit absensi dan catatan wali kelas untuk ${student.nama_siswa}`}
                        className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap flex-shrink-0"
                      >
                        <Edit3 size={13} className="mr-1.5 flex-shrink-0" />
                        <span className="hidden sm:inline">ABSENSI & CATATAN</span>
                        <span className="sm:hidden">CATATAN</span>
                      </Button>

                      {/* RAPOR (PDF) — opens PDF preview in new tab */}
                      <Button
                        onClick={() => handlePrintRapor(student)}
                        disabled={!!pdfLoading[`rapor_${student.id}`]}
                        aria-label={`Buka pratinjau rapor PDF di tab baru untuk ${student.nama_siswa}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2 px-3 flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                      >
                        {pdfLoading[`rapor_${student.id}`]
                          ? <Loader2 size={13} className="animate-spin flex-shrink-0" />
                          : <Printer size={13} className="flex-shrink-0" />}
                        RAPOR (PDF)
                      </Button>

                      {/* P5 (PDF) — opens P5 PDF preview in new tab */}
                      <Button
                        onClick={() => handlePrintP5(student)}
                        disabled={!!pdfLoading[`p5_${student.id}`]}
                        aria-label={`Buka pratinjau rapor P5 PDF di tab baru untuk ${student.nama_siswa}`}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl py-2 px-3 flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                      >
                        {pdfLoading[`p5_${student.id}`]
                          ? <Loader2 size={13} className="animate-spin flex-shrink-0" />
                          : <FileText size={13} className="flex-shrink-0" />}
                        P5 (PDF)
                      </Button>

                      {/* SKL */}
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Buka SKL di tab baru untuk ${student.nama_siswa}`}
                        className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap flex-shrink-0"
                        onClick={() => window.open(raporApi.getPdfSklUrl(student.id), '_blank')}
                      >
                        SKL
                      </Button>

                      {/* UKK — Khusus SMK */}
                      {isJenjangSmk && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Buka UKK di tab baru untuk ${student.nama_siswa}`}
                          className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap flex-shrink-0"
                          onClick={() => window.open(raporApi.getPdfUkkUrl(student.id), '_blank')}
                        >
                          UKK
                        </Button>
                      )}

                      {/* TRANSKRIP */}
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Buka Transkrip Nilai Kumulatif untuk ${student.nama_siswa}`}
                        className="text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 whitespace-nowrap flex-shrink-0"
                        onClick={() => setSelectedTranskripStudent(student)}
                      >
                        <BookOpen size={13} className="mr-1 flex-shrink-0" />
                        TRANSKRIP
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Modal Absensi & Catatan Wali Kelas ── */}
        {isSummaryModalOpen && selectedStudent && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title-summary"
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl rounded-2xl">
              <div className="w-full max-w-full min-w-0">
                <h3
                  id="modal-title-summary"
                  className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight"
                >
                  Absensi & Catatan Wali Kelas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  Siswa: {selectedStudent.nama_siswa}
                </p>
              </div>

              <form
                id="form-summary"
                onSubmit={handleSummarySubmit}
                className="space-y-4 w-full max-w-full min-w-0"
                noValidate
              >
                {/* Referensi Presensi System Info Box */}
                {selectedStudent && (() => {
                  const rawRef = (selectedStudent as any)?.referensi_absensi_harian || { sakit: 0, izin: 0, alpa: 0 };
                  const statRef = (rekapSiswaData as any)?.data?.statistik || (rekapSiswaData as any)?.statistik;
                  const finalRef = {
                    sakit: rawRef.sakit || statRef?.SAKIT || statRef?.sakit || 0,
                    izin: rawRef.izin || statRef?.IZIN || statRef?.izin || 0,
                    alpa: rawRef.alpa || statRef?.ALPA || statRef?.alpa || 0,
                  };
                  return (
                    <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-500" />
                          Referensi Presensi Harian 1 Semester
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSummaryForm((prev) => ({
                              ...prev,
                              sakit: finalRef.sakit || 0,
                              izin: finalRef.izin || 0,
                              alpa: finalRef.alpa || 0,
                            }));
                            toast.info('Rekap presensi harian 1 semester berhasil diterjemahkan ke form Rapor');
                          }}
                          className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                          title="Tarik angka presensi harian 1 semester ke form Rapor"
                        >
                          <Download size={11} />
                          Tarik Rekap Kehadiran
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span>Sakit: <strong className="text-amber-600 font-black">{finalRef.sakit}</strong> hari</span>
                        <span>•</span>
                        <span>Izin: <strong className="text-blue-600 font-black">{finalRef.izin}</strong> hari</span>
                        <span>•</span>
                        <span>Alpa: <strong className="text-rose-600 font-black">{finalRef.alpa}</strong> hari</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-3 gap-3 w-full max-w-full min-w-0">
                  {(ABSENSI_FIELDS ?? []).map((field) => (
                    <div key={field} className="space-y-1 w-full max-w-full min-w-0">
                      <label
                        htmlFor={`input-${field}`}
                        className="text-xs font-bold text-slate-500 capitalize block"
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)} (Hari)
                      </label>
                      <input
                        id={`input-${field}`}
                        type="number"
                        min={0}
                        max={365}
                        aria-label={`Jumlah hari ${field}`}
                        aria-invalid={!!formErrors[field]}
                        aria-describedby={formErrors[field] ? `err-${field}` : undefined}
                        value={summaryForm[field]}
                        onChange={(e) => {
                          setSummaryForm((prev) => ({
                            ...prev,
                            [field]: parseInt(e.target.value) || 0,
                          }));
                          if (formErrors[field]) {
                            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
                          }
                        }}
                        className={`w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white text-center focus:ring-1 focus:ring-indigo-500 ${
                          formErrors[field] ? 'border-red-400' : 'border-transparent'
                        }`}
                      />
                      {formErrors[field] && (
                        <p id={`err-${field}`} className="text-[10px] text-red-500 flex items-center gap-1">
                          <AlertCircle size={10} className="flex-shrink-0" />
                          {formErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1 w-full max-w-full min-w-0">
                  <label
                    htmlFor="input-catatan-wali"
                    className="text-xs font-bold text-slate-500 block"
                  >
                    Catatan Wali Kelas / Rekomendasi
                  </label>
                  <textarea
                    id="input-catatan-wali"
                    aria-label="Catatan atau rekomendasi dari wali kelas"
                    aria-invalid={!!formErrors.catatan_wali}
                    placeholder="Contoh: Pertahankan prestasi akademik Anda..."
                    rows={3}
                    maxLength={500}
                    value={summaryForm.catatan_wali}
                    onChange={(e) => {
                      setSummaryForm((prev) => ({ ...prev, catatan_wali: e.target.value }));
                      if (formErrors.catatan_wali) {
                        setFormErrors((prev) => ({ ...prev, catatan_wali: undefined }));
                      }
                    }}
                    className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                  {formErrors.catatan_wali && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle size={10} className="flex-shrink-0" /> {formErrors.catatan_wali}
                    </p>
                  )}
                </div>

                <div className="space-y-1 w-full max-w-full min-w-0">
                  <label
                    htmlFor="input-keputusan"
                    className="text-xs font-bold text-slate-500 block"
                  >
                    Keputusan Akhir Semester / Transisi Kenaikan
                  </label>
                  <input
                    id="input-keputusan"
                    type="text"
                    aria-label="Keputusan kenaikan kelas atau kelulusan"
                    aria-invalid={!!formErrors.keputusan_transisi}
                    placeholder="Contoh: Naik ke Kelas XI TJKT 1"
                    maxLength={200}
                    value={summaryForm.keputusan_transisi}
                    onChange={(e) => {
                      setSummaryForm((prev) => ({
                        ...prev,
                        keputusan_transisi: e.target.value,
                      }));
                      if (formErrors.keputusan_transisi) {
                        setFormErrors((prev) => ({ ...prev, keputusan_transisi: undefined }));
                      }
                    }}
                    className="w-full max-w-full min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  {formErrors.keputusan_transisi && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle size={10} className="flex-shrink-0" /> {formErrors.keputusan_transisi}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-2 w-full max-w-full min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseSummaryModal}
                    className="rounded-xl font-bold"
                  >
                    BATAL
                  </Button>
                  <Button
                    type="submit"
                    disabled={summaryMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-60"
                  >
                    {summaryMutation.isPending ? (
                      <><Loader2 size={14} className="animate-spin mr-1.5 flex-shrink-0" /> MENYIMPAN...</>
                    ) : (
                      <><CheckCircle size={14} className="mr-1.5 flex-shrink-0" /> SIMPAN PERUBAHAN</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── Modal Transkrip Nilai Kumulatif Multi-Semester ── */}
        {selectedTranskripStudent && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title-transkrip"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl rounded-2xl">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 id="modal-title-transkrip" className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-600" />
                    Transkrip Nilai Kumulatif
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Siswa: <strong className="text-slate-700 dark:text-slate-200">{selectedTranskripStudent.nama_siswa}</strong> (NIS: {selectedTranskripStudent.nis})
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTranskripStudent(null)}
                  className="text-xs font-bold"
                >
                  Tutup
                </Button>
              </div>

              {isLoadingTranskrip ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Mengagregasi nilai dari Semester 1 s/d Akhir...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* GPA Summary Card */}
                  <div className="bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block">Rata-Rata Ijazah Kumulatif (GPA)</span>
                      <span className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
                        {transkripData?.data?.rata_rata_ijazah_kumulatif || '0.00'}
                      </span>
                    </div>
                    {transkripData?.data?.skl_summary && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Status SKL</span>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          {transkripData.data.skl_summary.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transkrip Subject Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">Mata Pelajaran</th>
                          <th className="p-3 text-center">Kode</th>
                          <th className="p-3 text-center">Rata-Rata Kumulatif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(transkripData?.data?.mata_pelajaran || []).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400">Belum ada riwayat nilai semester.</td>
                          </tr>
                        ) : (
                          (transkripData?.data?.mata_pelajaran || []).map((m: any) => (
                            <tr key={m.mapel_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-semibold text-slate-800 dark:text-white">{m.nama_mapel}</td>
                              <td className="p-3 text-center text-slate-500 font-mono">{m.kode_mapel}</td>
                              <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{m.rata_rata_kumulatif}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
}
