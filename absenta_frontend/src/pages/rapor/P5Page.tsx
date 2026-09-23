import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Save, 
  Layers, 
  Loader2,
  Printer,
  Sparkles,
  BookOpen,
  GraduationCap,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Target,
  Bookmark
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, Button, Badge, SearchableSelect } from '../../components/ui';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useCapabilities } from '@/hooks/useCapabilities';
import { raporApi } from '../../api/rapor.api';
import { siswaApi } from '../../api/academic.api';
import useConfirm from '@/hooks/useConfirm';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  P5_KUALIFIKASI_OPTIONS,
  P5_DEFAULT_CATATAN,
  parseProjekMetadata,
  getDefaultSubElemen
} from './components/p5/p5Constants';

// Zod Schema Validation Guard (Pilar 25)
const matrixScoreSchema = z.object({
  projek_id: z.string().min(1, 'Projek wajib dipilih'),
  grades: z.array(
    z.object({
      siswa_id: z.string().min(1),
      dimensi: z.string().min(1),
      sub_elemen: z.string().min(1),
      kualifikasi: z.string().min(1),
      catatan_proses: z.string().optional().nullable(),
    })
  ).min(1, 'Minimal 1 data penilaian siswa'),
});

interface MatrixScoreItem {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  ratings: Record<string, string>; // dimensi -> 'BB' | 'MB' | 'BSH' | 'SB'
  sub_elemen_map?: Record<string, string>;
  catatan_proses: string;
}

export const P5Page: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  // Centralized Capabilities
  const { 
    isAdmin, 
    isKurikulum, 
    isKepsek, 
    isWaliKelas, 
    walikelasKelas, 
    walikelasKelasIds,
    user 
  } = useCapabilities();

  const canSupervise = isAdmin || isKurikulum || isKepsek;
  const waliKelasId = walikelasKelas?.id || (walikelasKelasIds && walikelasKelasIds.length > 0 ? walikelasKelasIds[0] : null);
  const waliKelasNama = walikelasKelas?.nama_kelas || (walikelasKelas as any)?.nama || 'Kelas Binaan';

  // Academic Context
  const academicCtx = useAcademicContext();
  const { options: allKelasOptions, isLoading: isLoadingAllKelas } = useKelasOptions({ onlyActive: true });

  // 1. Fetch Projek yang difasilitasi oleh guru login
  const { data: myP5ProjectsRes, isLoading: isLoadingMyProjects } = useQuery({
    queryKey: ['my-p5-projects', user?.id, academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester],
    queryFn: () => raporApi.getMyP5Projects({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester,
    }),
    enabled: Boolean(user?.id && academicCtx.selectedTahunPelajaran && academicCtx.selectedSemester),
  });

  const myP5Assignments = useMemo(() => {
    return (myP5ProjectsRes?.data || []) as Array<{
      fasilitator_id: string;
      guru_id: string;
      projek: { id: string; judul: string; deskripsi?: string };
      covered_classes: Array<{ id: string; nama_kelas: string; tingkat: number }>;
      covered_class_ids: string[];
    }>;
  }, [myP5ProjectsRes]);

  const isAssignedFacilitator = myP5Assignments.length > 0;

  // Tab State
  const [activeRoleTab, setActiveRoleTab] = useState<'my_tasks' | 'supervisi' | 'wali_kelas'>('my_tasks');
  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    if (!tabInitialized && myP5ProjectsRes !== undefined) {
      setTabInitialized(true);
      if (isAssignedFacilitator) {
        setActiveRoleTab('my_tasks');
      } else if (canSupervise) {
        setActiveRoleTab('supervisi');
      } else if (isWaliKelas) {
        setActiveRoleTab('wali_kelas');
      } else {
        setActiveRoleTab('my_tasks');
      }
    }
  }, [tabInitialized, myP5ProjectsRes, isAssignedFacilitator, canSupervise, isWaliKelas]);

  // Tab Options
  const roleTabs: TabOption[] = useMemo(() => {
    const opts: TabOption[] = [];
    if (isAssignedFacilitator || !canSupervise) {
      opts.push({
        id: 'my_tasks',
        label: isMobile ? 'Projek Saya' : 'Projek Binaan Saya',
        icon: Sparkles,
      });
    }
    if (canSupervise) {
      opts.push({
        id: 'supervisi',
        label: isMobile ? 'Supervisi' : 'Supervisi Seluruh Sekolah',
        icon: Layers,
      });
    }
    if (isWaliKelas) {
      opts.push({
        id: 'wali_kelas',
        label: isMobile ? `Kelas Walas` : `Kelas Binaan (${waliKelasNama})`,
        icon: GraduationCap,
      });
    }
    return opts;
  }, [isAssignedFacilitator, canSupervise, isWaliKelas, waliKelasNama, isMobile]);

  // Filters State: HANYA PROJEK & KELAS (Dimensi kini langsung kolom otomatis)
  const [selectedProjek, setSelectedProjek] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');

  // 2. Fetch All P5 Projek (for supervisi, master, and wali_kelas)
  const { data: allProjekList, isLoading: isLoadingAllProjek } = useQuery({
    queryKey: ['p5-projek-all', academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester],
    queryFn: () => raporApi.getP5Projek({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester
    }),
    enabled: Boolean(academicCtx.selectedTahunPelajaran && academicCtx.selectedSemester)
  });

  const allProjects = useMemo(() => {
    return (allProjekList?.data || []) as Array<{ id: string; judul: string; deskripsi?: string }>;
  }, [allProjekList]);

  // Compute Smart Projek Options
  const smartProjekOptions = useMemo(() => {
    if (activeRoleTab === 'my_tasks') {
      const opts = myP5Assignments.map((a) => ({
        value: a.projek.id,
        label: a.projek.judul,
      }));
      return [{ value: '', label: '-- Pilih Projek Binaan Anda --' }, ...opts];
    }
    const opts = allProjects.map((p) => ({
      value: p.id,
      label: p.judul,
    }));
    return [{ value: '', label: '-- Pilih Projek P5 --' }, ...opts];
  }, [activeRoleTab, myP5Assignments, allProjects]);

  // Compute Smart Kelas Options
  const smartKelasOptions = useMemo(() => {
    if (activeRoleTab === 'my_tasks') {
      const activeAssignment = myP5Assignments.find((a) => a.projek.id === selectedProjek);
      if (!activeAssignment || activeAssignment.covered_classes.length === 0) {
        return [{ value: '', label: '-- Tidak Ada Kelas Ditugaskan --' }];
      }
      return [
        { value: '', label: '-- Pilih Kelas Ditugaskan --' },
        ...activeAssignment.covered_classes.map((c) => ({
          value: c.id,
          label: c.nama_kelas,
        })),
      ];
    }
    if (activeRoleTab === 'wali_kelas') {
      if (waliKelasId) {
        return [{ value: waliKelasId, label: waliKelasNama }];
      }
    }
    return [{ value: '', label: '-- Pilih Kelas --' }, ...allKelasOptions];
  }, [activeRoleTab, myP5Assignments, selectedProjek, waliKelasId, waliKelasNama, allKelasOptions]);

  // Auto-Select Project and Class in "my_tasks"
  useEffect(() => {
    if (activeRoleTab === 'my_tasks') {
      if (myP5Assignments.length > 0) {
        const exists = myP5Assignments.some((a) => a.projek.id === selectedProjek);
        if (!exists) {
          setSelectedProjek(myP5Assignments[0].projek.id);
        }
      } else {
        setSelectedProjek('');
      }
    } else if (activeRoleTab === 'wali_kelas') {
      if (waliKelasId && selectedKelas !== waliKelasId) {
        setSelectedKelas(waliKelasId);
      }
    }
  }, [activeRoleTab, myP5Assignments, selectedProjek, waliKelasId, selectedKelas]);

  // Auto-Select Class when Project is selected in "my_tasks"
  useEffect(() => {
    if (activeRoleTab === 'my_tasks' && selectedProjek) {
      const activeAssignment = myP5Assignments.find((a) => a.projek.id === selectedProjek);
      if (activeAssignment && activeAssignment.covered_classes.length > 0) {
        const isCurrentClassValid = activeAssignment.covered_classes.some((c) => c.id === selectedKelas);
        if (!isCurrentClassValid) {
          setSelectedKelas(activeAssignment.covered_classes[0].id);
        }
      }
    }
  }, [activeRoleTab, selectedProjek, myP5Assignments, selectedKelas]);

  // Objek & Metadata Projek Aktif (Target Dimensi)
  const selectedProjekObj = useMemo(() => {
    if (activeRoleTab === 'my_tasks') {
      return myP5Assignments.find((a) => a.projek.id === selectedProjek)?.projek;
    }
    return allProjects.find((p) => p.id === selectedProjek);
  }, [activeRoleTab, myP5Assignments, allProjects, selectedProjek]);

  const currentProjekMeta = useMemo(() => {
    return parseProjekMetadata(selectedProjekObj?.deskripsi);
  }, [selectedProjekObj]);

  const targetDimensions = useMemo(() => {
    if (currentProjekMeta.dimensiList.length > 0) {
      return currentProjekMeta.dimensiList;
    }
    return ['Mandiri', 'Gotong Royong', 'Kreatif'];
  }, [currentProjekMeta]);

  // Determine Read-Only Mode
  const isReadOnly = useMemo(() => {
    if (activeRoleTab === 'supervisi') return true;
    if (activeRoleTab === 'wali_kelas') return true;
    if (activeRoleTab === 'my_tasks') {
      const activeAssignment = myP5Assignments.find((a) => a.projek.id === selectedProjek);
      if (!activeAssignment) return true;
      if (selectedKelas && !activeAssignment.covered_class_ids.includes(selectedKelas)) {
        return true;
      }
      return false;
    }
    return !canSupervise;
  }, [activeRoleTab, myP5Assignments, selectedProjek, selectedKelas, canSupervise]);

  const readOnlyReason = useMemo(() => {
    if (!isReadOnly) return '';
    if (activeRoleTab === 'supervisi') {
      return 'Mode Supervisi Sekolah (Hanya Baca): Pemantauan progres pengisian nilai projek P5 seluruh kelas oleh Kurikulum & Kepala Sekolah.';
    }
    if (activeRoleTab === 'wali_kelas') {
      return 'Mode Pemantauan Wali Kelas (Hanya Baca): Nilai kualitatif projek P5 diisi secara langsung oleh Tim Guru Fasilitator Projek.';
    }
    return 'Mode Hanya Baca: Anda tidak terdaftar sebagai guru fasilitator untuk rombel/projek terpilih.';
  }, [isReadOnly, activeRoleTab]);

  // 3. Fetch Students for Selected Class (Seluruh siswa sekelas tanpa terpotong limit 10)
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-p5', selectedKelas],
    queryFn: () => siswaApi.getByKelas(selectedKelas, 200),
    enabled: Boolean(selectedKelas),
  });

  // 4. Fetch All Existing Grades for Selected Project
  const { data: existingP5Nilai, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['p5-nilai', selectedProjek],
    queryFn: () => raporApi.getP5Nilai({
      projek_id: selectedProjek,
    }),
    enabled: Boolean(selectedProjek),
  });

  // 5. Scores State (FULL MATRIX GRID WITHOUT PAGINATION)
  const [scores, setScores] = useState<MatrixScoreItem[]>([]);

  useEffect(() => {
    if (students?.data && Array.isArray(students.data)) {
      const existingList = existingP5Nilai?.data || [];
      const grid: MatrixScoreItem[] = students.data.map((stud: any) => {
        const studentGrades = existingList.filter((n: any) => n.siswa_id === stud.id);
        const ratings: Record<string, string> = {};
        const subElemenMap: Record<string, string> = {};
        let catatanProses = '';

        targetDimensions.forEach((dim) => {
          const found = studentGrades.find((n: any) => n.dimensi === dim);
          if (found) {
            ratings[dim] = found.kualifikasi;
            subElemenMap[dim] = found.sub_elemen;
            if (found.catatan_proses && !catatanProses) {
              catatanProses = found.catatan_proses;
            }
          } else {
            ratings[dim] = 'BSH';
            subElemenMap[dim] = getDefaultSubElemen(dim);
          }
        });

        return {
          id: stud.id,
          siswa_id: stud.id,
          nama_siswa: stud.nama_siswa || stud.nama || '—',
          nis: stud.nis || stud.nisn || '—',
          ratings,
          sub_elemen_map: subElemenMap,
          catatan_proses: catatanProses || P5_DEFAULT_CATATAN['BSH'] || '',
        };
      });

      setScores(grid);
    } else {
      setScores([]);
    }
  }, [students, existingP5Nilai, targetDimensions]);

  // Handler: Update Dimensi Rating untuk 1 Siswa
  const handleScoreChange = useCallback((siswaId: string, dimensi: string, kualifikasi: string) => {
    if (isReadOnly) {
      toast.error('Tidak dapat mengubah nilai: Anda berada dalam Mode Hanya Baca.');
      return;
    }
    setScores((prev) =>
      prev.map((s) => {
        if (s.siswa_id !== siswaId) return s;
        return {
          ...s,
          ratings: {
            ...s.ratings,
            [dimensi]: kualifikasi,
          },
        };
      })
    );
  }, [isReadOnly]);

  // Handler: Update Catatan Proses untuk 1 Siswa
  const handleCatatanChange = useCallback((siswaId: string, text: string) => {
    if (isReadOnly) return;
    setScores((prev) =>
      prev.map((s) => (s.siswa_id === siswaId ? { ...s, catatan_proses: text } : s))
    );
  }, [isReadOnly]);

  // Quick Action: Set BSH untuk SATU KOLOM DIMENSI Sekelas
  const handleSetAllForDimension = useCallback((dimensi: string, kualifikasi: string = 'BSH') => {
    if (isReadOnly) return;
    setScores((prev) =>
      prev.map((s) => ({
        ...s,
        ratings: {
          ...s.ratings,
          [dimensi]: kualifikasi,
        },
      }))
    );
    toast.success(`Berhasil menerapkan ${kualifikasi} untuk dimensi ${dimensi} sekelas!`);
  }, [isReadOnly]);

  // Quick Action: Set SEMUA DIMENSI Sekelas
  const handleBulkSetAllDimensions = useCallback((kualifikasi: string) => {
    if (isReadOnly) return;
    setScores((prev) =>
      prev.map((s) => {
        const nextRatings: Record<string, string> = {};
        targetDimensions.forEach((dim) => {
          nextRatings[dim] = kualifikasi;
        });
        return {
          ...s,
          ratings: nextRatings,
          catatan_proses: P5_DEFAULT_CATATAN[kualifikasi] || s.catatan_proses,
        };
      })
    );
    toast.success(`Berhasil menerapkan ${kualifikasi} untuk seluruh dimensi di kelas!`);
  }, [isReadOnly, targetDimensions]);

  // Quick Action: Salin Catatan Baris 1 ke Semua
  const handleCopyFirstCatatanToAll = useCallback(() => {
    if (isReadOnly || scores.length === 0) return;
    const sourceCatatan = scores[0].catatan_proses;
    if (!sourceCatatan?.trim()) {
      toast.error('Catatan siswa baris pertama masih kosong');
      return;
    }
    setScores((prev) =>
      prev.map((s) => ({ ...s, catatan_proses: sourceCatatan }))
    );
    toast.success('Berhasil menyalin catatan capaian baris pertama ke seluruh siswa!');
  }, [isReadOnly, scores]);

  // Save Mutation (Matrix Atomic Transaction)
  const saveMatrixMutation = useMutation({
    mutationFn: raporApi.upsertMatrixP5Nilai,
    onSuccess: () => {
      toast.success('Seluruh nilai matriks dimensi P5 berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['p5-nilai', selectedProjek] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan nilai matriks P5');
    },
  });

  const handleSaveScores = () => {
    if (isReadOnly) {
      toast.error('Anda berada dalam Mode Hanya Baca.');
      return;
    }
    if (!selectedProjek || !selectedKelas) {
      toast.error('Pastikan Projek dan Kelas telah dipilih');
      return;
    }
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }

    const grades: Array<{
      siswa_id: string;
      dimensi: string;
      sub_elemen: string;
      kualifikasi: string;
      catatan_proses?: string | null;
    }> = [];

    for (const s of scores) {
      targetDimensions.forEach((dim) => {
        grades.push({
          siswa_id: s.siswa_id,
          dimensi: dim,
          sub_elemen: s.sub_elemen_map?.[dim] || getDefaultSubElemen(dim),
          kualifikasi: s.ratings[dim] || 'BSH',
          catatan_proses: s.catatan_proses || null,
        });
      });
    }

    saveMatrixMutation.mutate({
      projek_id: selectedProjek,
      grades,
    });
  };

  // Cetak PDF Rapor P5
  const handlePrintStudentP5 = useCallback((siswaId: string) => {
    const url = raporApi.getPdfP5Url(
      siswaId,
      academicCtx.selectedTahunPelajaran,
      academicCtx.selectedSemester
    );
    window.open(url, '_blank');
  }, [academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester]);

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/input' },
    { label: 'Projek P5', path: '/rapor/p5' },
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Projek Penguatan Profil Pelajar Pancasila (P5)"
        description="Lembar penilaian kualitatif karakter dan capaian dimensi Profil Pelajar Pancasila Kurikulum Merdeka."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="p5_rapor_page"
        topSlot={
          <AcademicContextBar
            tahunPelajaranId={academicCtx.selectedTahunPelajaran}
            semesterId={academicCtx.selectedSemester}
            onTahunPelajaranChange={academicCtx.handleTpChange}
            onSemesterChange={academicCtx.handleSemesterChange}
            tpOptions={academicCtx.tpOptions}
            semesterOptions={academicCtx.semesterOptions}
            isLoadingTp={academicCtx.isLoadingTp}
            isLoadingSem={academicCtx.isLoadingSem}
            variant="toolbar"
          />
        }
        instruction={{
          title: 'Panduan Asesmen Projek P5 Matriks Kolom',
          description: 'Penilaian kualitatif karakter siswa tersaji secara simultan dalam kolom-kolom dimensi target projek.',
          items: [
            { text: 'Pilih Projek P5 dan Rombongan Belajar (Kelas) yang ditugaskan kepada Anda.' },
            { text: 'Dimensi-dimensi sasaran projek otomatis tampil sebagai kolom tabel berdasarkan konfigurasi tema projek.' },
            { text: 'Gunakan tombol Set BSH di header kolom untuk mengatur cepat capaian satu dimensi sekelas.' },
            { text: 'Sesuaikan kualifikasi per siswa (BB / MB / BSH / SB) dan lengkapi deskripsi catatan proses capaian.' },
            { text: 'Klik Simpan Semua Nilai Matriks P5 untuk menyimpan seluruh dimensi secara atomik dalam satu klik.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-12 w-full min-w-0 max-w-full">
            {/* ── 1. Role Navigation Tabs & Settings Shortcut ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <TabSwitcher
                activeTab={activeRoleTab}
                onChange={(id) => setActiveRoleTab(id as any)}
                tabs={roleTabs}
              />
              {canSupervise && (
                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => navigate('/rapor/settings?tab=tim_p5')}
                  className="font-bold rounded-xl shrink-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                  Pengaturan Tema & Tim P5
                </Button>
              )}
            </div>

            {/* ── 2. Read-Only Notice Banner ── */}
            {isReadOnly && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{readOnlyReason}</span>
              </div>
            )}

            {/* ── 3. Main Grading Interface (Projek Saya / Supervisi / Wali Kelas) ── */}
            <div className="space-y-6">
              {/* Filter Card: Hanya Projek & Kelas */}
              <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900 space-y-4 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="p5-filter-projek" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <Target size={12} className="text-indigo-500" />
                      1. Projek P5 {activeRoleTab === 'my_tasks' && '(Binaan)'}
                    </label>
                    <SearchableSelect
                      id="p5-filter-projek"
                      value={selectedProjek}
                      onValueChange={setSelectedProjek}
                      options={smartProjekOptions}
                      placeholder="Pilih Projek"
                      isLoading={isLoadingMyProjects || isLoadingAllProjek}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="p5-filter-kelas" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <Bookmark size={12} className="text-indigo-500" />
                      2. Rombongan Belajar (Kelas)
                    </label>
                    <SearchableSelect
                      id="p5-filter-kelas"
                      value={selectedKelas}
                      onValueChange={setSelectedKelas}
                      options={smartKelasOptions}
                      placeholder="Pilih Kelas"
                      disabled={activeRoleTab === 'wali_kelas'}
                    />
                  </div>
                </div>

                {/* Banner Ringkasan Metadata Projek Terpilih */}
                {selectedProjek && selectedProjekObj && (
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {selectedProjekObj.judul}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50">
                          {currentProjekMeta.tema}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 text-slate-600 dark:text-slate-400">
                          {currentProjekMeta.fase}
                        </Badge>
                      </div>
                      {currentProjekMeta.cleanDesc && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {currentProjekMeta.cleanDesc}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                        Dimensi Kolom ({targetDimensions.length}):
                      </span>
                      {targetDimensions.map((dim) => (
                        <span
                          key={dim}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                        >
                          {dim}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* ── Scoring Area (MATRIKS KOLOM TERBUKA PENUH TANPA PAGINASI) ── */}
              {!selectedProjek || !selectedKelas ? (
                <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-2">
                  <Sparkles className="w-12 h-12 text-indigo-300 dark:text-indigo-800 mx-auto" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Pilih Projek & Kelas untuk Membuka Matriks Nilai
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Dimensi-dimensi sasaran projek akan langsung otomatis terbuka sebagai kolom tabel penilaian tanpa perlu memilih per dimensi lagi.
                  </p>
                </Card>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-0">
                  {/* Top Action & Bulk Tools Bar */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Sparkles size={13} className="text-amber-500" />
                        Aksi Cepat Sekelas:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReadOnly}
                        onClick={() => handleBulkSetAllDimensions('BSH')}
                        className="text-[11px] font-bold h-7 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50"
                      >
                        Semua Dimensi BSH
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReadOnly}
                        onClick={() => handleBulkSetAllDimensions('SB')}
                        className="text-[11px] font-bold h-7 rounded-lg border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50"
                      >
                        Semua Dimensi SB
                      </Button>
                      <span className="text-slate-300">|</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isReadOnly}
                        onClick={handleCopyFirstCatatanToAll}
                        className="text-[11px] font-semibold h-7 text-slate-600 hover:text-indigo-600"
                        title="Salin Catatan Baris 1 ke Semua Siswa"
                      >
                        <Copy size={11} className="mr-1" /> Salin Catatan #1
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">
                        {scores.length} Siswa Terdaftar
                      </span>
                      <Button
                        type="button"
                        variant="toolbarPrimary"
                        size="toolbar"
                        disabled={isReadOnly || saveMatrixMutation.isPending}
                        onClick={handleSaveScores}
                        className="font-bold rounded-xl shadow-md w-full sm:w-auto"
                      >
                        {saveMatrixMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Simpan Matriks Nilai P5
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Full Matriks Table (Without Pagination) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">No</th>
                          <th className="py-3 px-3 w-52 min-w-[200px]">Nama Peserta Didik</th>
                          {/* Kolom Dimensi Dinamis Sesuai Target Projek */}
                          {targetDimensions.map((dim) => (
                            <th key={dim} className="py-3 px-2 text-center min-w-[170px] bg-indigo-50/20 dark:bg-indigo-950/10 border-x border-slate-100 dark:border-slate-800/80">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-extrabold text-[11px] text-indigo-700 dark:text-indigo-300">
                                  {dim}
                                </span>
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => handleSetAllForDimension(dim, 'BSH')}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 transition-colors"
                                  title={`Set semua siswa ${dim} ke BSH`}
                                >
                                  Set BSH
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="py-3 px-3 min-w-[240px]">Catatan Proses Capaian</th>
                          <th className="py-3 px-2 w-16 text-center">Cetak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {isLoadingStudents || isLoadingGrades ? (
                          <tr>
                            <td colSpan={targetDimensions.length + 4} className="py-16 text-center text-xs text-slate-400 italic">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                              Memuat data nilai dan siswa kelas...
                            </td>
                          </tr>
                        ) : scores.length === 0 ? (
                          <tr>
                            <td colSpan={targetDimensions.length + 4} className="py-16 text-center text-xs text-slate-400 italic">
                              Kelas kosong atau tidak ditemukan data siswa aktif.
                            </td>
                          </tr>
                        ) : (
                          scores.map((row, idx) => {
                            return (
                              <tr
                                key={row.siswa_id}
                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800 dark:text-white text-xs">
                                    {row.nama_siswa}
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    NIS: {row.nis || '-'}
                                  </span>
                                </td>

                                {/* Kolom Pills untuk Setiap Dimensi */}
                                {targetDimensions.map((dim) => {
                                  const currentRating = row.ratings[dim] || 'BSH';
                                  return (
                                    <td key={dim} className="py-2.5 px-2 text-center border-x border-slate-100 dark:border-slate-800/50 bg-slate-50/10">
                                      <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 gap-0.5">
                                        {[
                                          { val: 'BB', desc: 'Belum Berkembang', activeClass: 'bg-rose-500 text-white' },
                                          { val: 'MB', desc: 'Mulai Berkembang', activeClass: 'bg-amber-500 text-white' },
                                          { val: 'BSH', desc: 'Berkembang Sesuai Harapan', activeClass: 'bg-indigo-600 text-white' },
                                          { val: 'SB', desc: 'Sangat Berkembang', activeClass: 'bg-emerald-600 text-white' },
                                        ].map((pill) => {
                                          const isSelected = currentRating === pill.val;
                                          return (
                                            <button
                                              key={pill.val}
                                              type="button"
                                              disabled={isReadOnly}
                                              onClick={() => handleScoreChange(row.siswa_id, dim, pill.val)}
                                              title={`${dim}: ${pill.desc}`}
                                              className={cn(
                                                "px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide transition-all cursor-pointer select-none",
                                                isSelected
                                                  ? pill.activeClass + " shadow-2xs font-black scale-105"
                                                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white/40"
                                              )}
                                            >
                                              {pill.val}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  );
                                })}

                                <td className="py-3 px-3">
                                  <input
                                    type="text"
                                    disabled={isReadOnly}
                                    value={row.catatan_proses}
                                    onChange={(e) => handleCatatanChange(row.siswa_id, e.target.value)}
                                    placeholder="Tulis deskripsi capaian..."
                                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-200"
                                  />
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handlePrintStudentP5(row.siswa_id)}
                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                    title="Cetak Rapor P5 Siswa"
                                  >
                                    <Printer size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List (No Pagination) */}
                  <div className="md:hidden p-4 space-y-4">
                    {isLoadingStudents || isLoadingGrades ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Memuat daftar siswa kelas...
                      </div>
                    ) : scores.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        Kelas kosong atau tidak ditemukan data siswa.
                      </div>
                    ) : (
                      scores.map((row, idx) => (
                        <div
                          key={row.siswa_id}
                          className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">
                                {row.nama_siswa}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-400">NIS: {row.nis || '-'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePrintStudentP5(row.siswa_id)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                              title="Cetak Rapor P5"
                            >
                              <Printer size={15} />
                            </button>
                          </div>

                          {/* Mobile Dynamic Dimensions */}
                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            {targetDimensions.map((dim) => {
                              const currentRating = row.ratings[dim] || 'BSH';
                              return (
                                <div key={dim} className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                    <span>{dim}</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{currentRating}</span>
                                  </label>
                                  <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                                    {[
                                      { val: 'BB', activeClass: 'bg-rose-500 text-white' },
                                      { val: 'MB', activeClass: 'bg-amber-500 text-white' },
                                      { val: 'BSH', activeClass: 'bg-indigo-600 text-white' },
                                      { val: 'SB', activeClass: 'bg-emerald-600 text-white' },
                                    ].map((pill) => {
                                      const isSelected = currentRating === pill.val;
                                      return (
                                        <button
                                          key={pill.val}
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => handleScoreChange(row.siswa_id, dim, pill.val)}
                                          className={cn(
                                            "py-1.5 rounded-lg font-bold text-xs text-center select-none",
                                            isSelected ? pill.activeClass : "text-slate-500"
                                          )}
                                        >
                                          {pill.val}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Mobile Catatan Input */}
                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Catatan Proses:</label>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={row.catatan_proses}
                              onChange={(e) => handleCatatanChange(row.siswa_id, e.target.value)}
                              placeholder="Tulis deskripsi..."
                              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default P5Page;
