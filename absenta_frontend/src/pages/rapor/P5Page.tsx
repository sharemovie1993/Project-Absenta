import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  FileText, 
  Loader2,
  Printer,
  Sparkles,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, Button, Badge, SearchableSelect, Input } from '../../components/ui';
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
  P5_TEMA_OPTIONS,
  P5_FASE_OPTIONS,
  P5_DIMENSI_OPTIONS,
  P5_SUB_ELEMEN_MAP,
  P5_KUALIFIKASI_OPTIONS,
  P5_DEFAULT_CATATAN,
  formatProjekDeskripsi,
  parseProjekMetadata
} from './components/p5/p5Constants';

// Zod Schema Validation Guard (Pilar 25)
const createProjekSchema = z.object({
  judul: z.string().min(3, 'Judul projek minimal 3 karakter'),
  tema: z.string().min(1, 'Tema projek wajib dipilih'),
  fase: z.string().min(1, 'Fase capaian wajib dipilih'),
  deskripsi: z.string().optional(),
});

const bulkScoresSchema = z.object({
  projek_id: z.string().min(1, 'Projek wajib dipilih'),
  dimensi: z.string().min(1, 'Dimensi wajib dipilih'),
  sub_elemen: z.string().min(1, 'Sub-elemen wajib dipilih'),
});

interface ScoreItem {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  kualifikasi: string;
  catatan_proses: string;
}

export const P5Page: React.FC = React.memo(() => {
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
    activeGuruId,
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
  const [activeRoleTab, setActiveRoleTab] = useState<'my_tasks' | 'supervisi' | 'wali_kelas' | 'master'>('my_tasks');
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
    if (canSupervise) {
      opts.push({
        id: 'master',
        label: isMobile ? 'Master Tema' : 'Master Tema Projek',
        icon: FileText,
      });
    }
    return opts;
  }, [isAssignedFacilitator, canSupervise, isWaliKelas, waliKelasNama, isMobile]);

  // Filters State
  const [selectedProjek, setSelectedProjek] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedDimensi, setSelectedDimensi] = useState('');
  const [selectedSubElemen, setSelectedSubElemen] = useState('');

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
      if (myP5Assignments.length > 0 && !selectedProjek) {
        setSelectedProjek(myP5Assignments[0].projek.id);
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

  // Sub-Elemen cascade options
  const subElemenOptions = useMemo(() => {
    if (!selectedDimensi) return [{ value: '', label: '-- Pilih Dimensi Terlebih Dahulu --' }];
    return P5_SUB_ELEMEN_MAP[selectedDimensi] || [{ value: '', label: '-- Pilih Sub-Elemen --' }];
  }, [selectedDimensi]);

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
      return `Mode Pemantauan Wali Kelas (Hanya Baca): Nilai kualitatif projek P5 diisi secara langsung oleh Tim Guru Fasilitator Projek.`;
    }
    return 'Mode Hanya Baca: Anda tidak terdaftar sebagai guru fasilitator untuk rombel/projek terpilih.';
  }, [isReadOnly, activeRoleTab]);

  // 3. Fetch Students for Selected Class
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-p5', selectedKelas],
    queryFn: () => siswaApi.getByKelas(selectedKelas),
    enabled: Boolean(selectedKelas && activeRoleTab !== 'master'),
  });

  // 4. Fetch Existing Grades
  const { data: existingP5Nilai, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['p5-nilai', selectedProjek, selectedDimensi, selectedSubElemen],
    queryFn: () => raporApi.getP5Nilai({
      projek_id: selectedProjek,
      dimensi: selectedDimensi,
    }),
    enabled: Boolean(selectedProjek && selectedDimensi && selectedSubElemen && activeRoleTab !== 'master'),
  });

  // 5. Scores State (FULL LIST WITHOUT PAGINATION)
  const [scores, setScores] = useState<ScoreItem[]>([]);

  useEffect(() => {
    if (students?.data && Array.isArray(students.data)) {
      const existingList = existingP5Nilai?.data || [];
      const grid: ScoreItem[] = students.data.map((stud: any) => {
        const found = existingList.find((n: any) =>
          n.siswa_id === stud.id && n.sub_elemen === selectedSubElemen
        );
        const kualifikasi = found?.kualifikasi || 'BSH';
        const defaultCatatan = P5_DEFAULT_CATATAN[kualifikasi] || '';

        return {
          id: stud.id,
          siswa_id: stud.id,
          nama_siswa: stud.nama_siswa || stud.nama || '—',
          nis: stud.nis || stud.nisn || '—',
          kualifikasi,
          catatan_proses: found?.catatan_proses || defaultCatatan,
        };
      });

      setScores(grid);
    } else {
      setScores([]);
    }
  }, [students, existingP5Nilai, selectedSubElemen]);

  // Change single score field
  const handleScoreChange = useCallback((siswaId: string, field: 'kualifikasi' | 'catatan_proses', val: string) => {
    if (isReadOnly) {
      toast.error('Tidak dapat mengubah nilai: Anda berada dalam Mode Hanya Baca.');
      return;
    }
    setScores((prev) =>
      prev.map((s) => {
        if (s.siswa_id !== siswaId) return s;
        const updated = { ...s, [field]: val };
        if (field === 'kualifikasi' && (!s.catatan_proses || Object.values(P5_DEFAULT_CATATAN).includes(s.catatan_proses))) {
          updated.catatan_proses = P5_DEFAULT_CATATAN[val] || '';
        }
        return updated;
      })
    );
  }, [isReadOnly]);

  // Quick Action: Set Cepat Sekelas
  const handleBulkSetKualifikasi = useCallback((kualifikasi: string) => {
    if (isReadOnly) return;
    setScores((prev) =>
      prev.map((s) => ({
        ...s,
        kualifikasi,
        catatan_proses: P5_DEFAULT_CATATAN[kualifikasi] || s.catatan_proses,
      }))
    );
    toast.success(`Berhasil menerapkan ${kualifikasi} untuk seluruh siswa di kelas!`);
  }, [isReadOnly]);

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

  // Quick Action: Kosongkan Catatan
  const handleClearAllCatatan = useCallback(() => {
    if (isReadOnly) return;
    setScores((prev) =>
      prev.map((s) => ({ ...s, catatan_proses: '' }))
    );
    toast.info('Seluruh catatan capaian telah dikosongkan');
  }, [isReadOnly]);

  // Save Mutation
  const saveP5BulkMutation = useMutation({
    mutationFn: raporApi.upsertBulkP5Nilai,
    onSuccess: () => {
      toast.success('Nilai kualitatif projek P5 berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['p5-nilai', selectedProjek, selectedDimensi, selectedSubElemen] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan nilai P5');
    },
  });

  const handleSaveScores = () => {
    if (isReadOnly) {
      toast.error('Anda berada dalam Mode Hanya Baca.');
      return;
    }
    if (!selectedProjek || !selectedDimensi || !selectedSubElemen) {
      toast.error('Pastikan Projek, Dimensi, dan Sub-Elemen telah dipilih lengkap');
      return;
    }
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }

    const payload = {
      projek_id: selectedProjek,
      dimensi: selectedDimensi,
      sub_elemen: selectedSubElemen,
      scores: scores.map((s) => ({
        siswa_id: s.siswa_id,
        kualifikasi: s.kualifikasi,
        catatan_proses: s.catatan_proses,
      })),
    };

    saveP5BulkMutation.mutate(payload);
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

  // Master Projek Management (for tab === 'master')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjek, setNewProjek] = useState({
    judul: '',
    tema: 'Kewirausahaan',
    fase: 'Fase F',
    deskripsi: ''
  });

  const createProjekMutation = useMutation({
    mutationFn: raporApi.createP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek-all'] });
      toast.success('Projek P5 berhasil dibuat');
      setIsCreateModalOpen(false);
      setNewProjek({ judul: '', tema: 'Kewirausahaan', fase: 'Fase F', deskripsi: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat projek');
    },
  });

  const deleteProjekMutation = useMutation({
    mutationFn: raporApi.deleteP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek-all'] });
      toast.success('Projek P5 berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus projek');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createProjekSchema.safeParse(newProjek);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Input projek tidak valid');
      return;
    }
    const fullDesc = formatProjekDeskripsi(newProjek.tema, newProjek.fase, newProjek.deskripsi);
    createProjekMutation.mutate({
      judul: newProjek.judul,
      deskripsi: fullDesc,
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester,
    });
  };

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
          title: 'Panduan Asesmen Projek P5',
          description: 'Pengisian nilai kualitatif karakter siswa per dimensi dan sub-elemen Projek Penguatan Profil Pelajar Pancasila.',
          items: [
            { text: 'Pilih projek P5 dan rombel kelas yang ditugaskan kepada Anda sebagai guru fasilitator.' },
            { text: 'Pilih Dimensi Profil Pelajar Pancasila dan Sub-Elemen yang dinilai.' },
            { text: 'Gunakan tombol Set Cepat (Semua BSH) untuk efisiensi penilaian awal satu kelas.' },
            { text: 'Sesuaikan kualifikasi per siswa (BB / MB / BSH / SB) dan lengkapi catatan proses perkembangan.' },
            { text: 'Klik tombol Simpan Nilai P5, dan gunakan tombol Cetak untuk melihat pratinjau PDF Rapor P5.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-12 w-full min-w-0 max-w-full">
            {/* ── 1. Role Navigation Tabs ── */}
            <TabSwitcher
              activeTab={activeRoleTab}
              onChange={(id) => setActiveRoleTab(id as any)}
              tabs={roleTabs}
            />

            {/* ── 2. Read-Only Notice Banner ── */}
            {isReadOnly && activeRoleTab !== 'master' && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{readOnlyReason}</span>
              </div>
            )}

            {/* ── 3. Tab Master Projek (Kurikulum / Admin Only) ── */}
            {activeRoleTab === 'master' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Daftar Tema Projek P5 Satuan Pendidikan
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Daftar judul tema projek yang diselenggarakan pada semester aktif.
                    </p>
                  </div>
                  {canSupervise && (
                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="font-bold rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Tambah Projek P5
                    </Button>
                  )}
                </div>

                {isLoadingAllProjek ? (
                  <div className="py-20 text-center text-xs text-slate-400 italic">Memuat projek...</div>
                ) : allProjects.length === 0 ? (
                  <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Tema Projek</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Daftarkan tema projek baru menggunakan tombol Tambah Projek P5.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allProjects.map((item) => {
                      const meta = parseProjekMetadata(item.deskripsi);
                      return (
                        <Card key={item.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px]">
                                {meta.tema}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {meta.fase}
                              </Badge>
                            </div>
                            {canSupervise && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Hapus projek "${item.judul}"?`)) {
                                    deleteProjekMutation.mutate(item.id);
                                  }
                                }}
                                className="p-1.5 h-auto text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{item.judul}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-3">{meta.cleanDesc || 'Tidak ada deskripsi.'}</p>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 4. Main Grading Interface (Projek Saya / Supervisi / Wali Kelas) ── */}
            {activeRoleTab !== 'master' && (
              <div className="space-y-6">
                {/* Filter Card */}
                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
                  <div className="space-y-1">
                    <label htmlFor="p5-filter-projek" className="text-[10px] font-bold text-slate-500 uppercase">
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
                    <label htmlFor="p5-filter-kelas" className="text-[10px] font-bold text-slate-500 uppercase">
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

                  <div className="space-y-1">
                    <label htmlFor="p5-filter-dimensi" className="text-[10px] font-bold text-slate-500 uppercase">
                      3. Dimensi Karakter Pancasila
                    </label>
                    <SearchableSelect
                      id="p5-filter-dimensi"
                      value={selectedDimensi}
                      onValueChange={(val) => {
                        setSelectedDimensi(val);
                        setSelectedSubElemen('');
                      }}
                      options={P5_DIMENSI_OPTIONS}
                      placeholder="Pilih Dimensi"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="p5-filter-subelemen" className="text-[10px] font-bold text-slate-500 uppercase">
                      4. Sub-Elemen Penilaian
                    </label>
                    <SearchableSelect
                      id="p5-filter-subelemen"
                      value={selectedSubElemen}
                      onValueChange={setSelectedSubElemen}
                      options={subElemenOptions}
                      placeholder="Pilih Sub-Elemen"
                    />
                  </div>
                </Card>

                {/* ── Scoring Area (FULL VIEW, UNPAGINATED LIKE INPUT NILAI RAPOR) ── */}
                {!selectedProjek || !selectedKelas || !selectedDimensi || !selectedSubElemen ? (
                  <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-2">
                    <Sparkles className="w-12 h-12 text-indigo-300 dark:text-indigo-800 mx-auto" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      Lengkapi Filter Penilaian P5 di Atas
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Pilih Projek, Kelas, Dimensi, dan Sub-Elemen karakter untuk membuka lembar penilaian siswa secara penuh.
                    </p>
                  </Card>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-0">
                    {/* Top Action & Bulk Tools Bar */}
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Sparkles size={13} className="text-amber-500" />
                          Set Cepat Sekelas:
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isReadOnly}
                          onClick={() => handleBulkSetKualifikasi('BSH')}
                          className="text-[11px] font-bold h-7 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50"
                        >
                          Semua BSH
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isReadOnly}
                          onClick={() => handleBulkSetKualifikasi('SB')}
                          className="text-[11px] font-bold h-7 rounded-lg border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50"
                        >
                          Semua SB
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isReadOnly}
                          onClick={() => handleBulkSetKualifikasi('MB')}
                          className="text-[11px] font-bold h-7 rounded-lg border-amber-200 dark:border-amber-900 text-amber-600 hover:bg-amber-50"
                        >
                          Semua MB
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
                          disabled={isReadOnly || saveP5BulkMutation.isPending}
                          onClick={handleSaveScores}
                          className="font-bold rounded-xl shadow-md w-full sm:w-auto"
                        >
                          {saveP5BulkMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Simpan Nilai P5
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Full Table (Without Pagination) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4 w-12 text-center">No</th>
                            <th className="py-3 px-4 w-64">Nama Peserta Didik</th>
                            <th className="py-3 px-4 w-72 text-center">Capaian Kualitatif</th>
                            <th className="py-3 px-4">Deskripsi / Catatan Proses Capaian</th>
                            <th className="py-3 px-4 w-20 text-center">Cetak</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                          {isLoadingStudents ? (
                            <tr>
                              <td colSpan={5} className="py-16 text-center text-xs text-slate-400 italic">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                Memuat daftar siswa kelas...
                              </td>
                            </tr>
                          ) : scores.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-16 text-center text-xs text-slate-400 italic">
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
                                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-800 dark:text-white text-xs">
                                      {row.nama_siswa}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      NIS: {row.nis || '-'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {/* 4-Pill Interactive Option */}
                                    <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 gap-1">
                                      {[
                                        { val: 'BB', label: 'BB', desc: 'Belum Berkembang', activeClass: 'bg-rose-500 text-white' },
                                        { val: 'MB', label: 'MB', desc: 'Mulai Berkembang', activeClass: 'bg-amber-500 text-white' },
                                        { val: 'BSH', label: 'BSH', desc: 'Berkembang Sesuai Harapan', activeClass: 'bg-indigo-600 text-white' },
                                        { val: 'SB', label: 'SB', desc: 'Sangat Berkembang', activeClass: 'bg-emerald-600 text-white' },
                                      ].map((pill) => {
                                        const isSelected = row.kualifikasi === pill.val;
                                        return (
                                          <button
                                            key={pill.val}
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => handleScoreChange(row.siswa_id, 'kualifikasi', pill.val)}
                                            title={pill.desc}
                                            className={cn(
                                              "px-2.5 py-1 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer select-none",
                                              isSelected
                                                ? pill.activeClass + " shadow-xs font-black scale-105"
                                                : "text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white/40"
                                            )}
                                          >
                                            {pill.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      disabled={isReadOnly}
                                      value={row.catatan_proses}
                                      onChange={(e) => handleScoreChange(row.siswa_id, 'catatan_proses', e.target.value)}
                                      placeholder="Tulis deskripsi capaian..."
                                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-200"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-center">
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

                    {/* Mobile Continuous Card List (No Pagination) */}
                    <div className="md:hidden p-4 space-y-3">
                      {isLoadingStudents ? (
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

                            {/* Mobile Pills */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">Capaian:</label>
                              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                                {[
                                  { val: 'BB', label: 'BB', activeClass: 'bg-rose-500 text-white' },
                                  { val: 'MB', label: 'MB', activeClass: 'bg-amber-500 text-white' },
                                  { val: 'BSH', label: 'BSH', activeClass: 'bg-indigo-600 text-white' },
                                  { val: 'SB', label: 'SB', activeClass: 'bg-emerald-600 text-white' },
                                ].map((pill) => {
                                  const isSelected = row.kualifikasi === pill.val;
                                  return (
                                    <button
                                      key={pill.val}
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => handleScoreChange(row.siswa_id, 'kualifikasi', pill.val)}
                                      className={cn(
                                        "py-1.5 rounded-lg font-bold text-xs text-center select-none",
                                        isSelected ? pill.activeClass : "text-slate-500"
                                      )}
                                    >
                                      {pill.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Mobile Catatan Input */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase block">Catatan:</label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={row.catatan_proses}
                                onChange={(e) => handleScoreChange(row.siswa_id, 'catatan_proses', e.target.value)}
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
            )}

            {/* ── Modal Create Projek P5 ── */}
            {isCreateModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 space-y-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      Tambah Tema Projek P5 Baru
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daftarkan projek pembelajaran bertema Pancasila Kurikulum Merdeka.
                    </p>
                  </div>

                  <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label htmlFor="modal-projek-judul" className="font-bold text-slate-700 dark:text-slate-300">
                        Judul Projek *
                      </label>
                      <Input
                        id="modal-projek-judul"
                        placeholder="Contoh: Kewirausahaan Dari Hasil Kebun Sekolah"
                        value={newProjek.judul}
                        onChange={(e) => setNewProjek((prev) => ({ ...prev, judul: e.target.value }))}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="modal-projek-tema" className="font-bold text-slate-700 dark:text-slate-300">
                          Tema Projek *
                        </label>
                        <SearchableSelect
                          id="modal-projek-tema"
                          value={newProjek.tema}
                          onValueChange={(val) => setNewProjek((prev) => ({ ...prev, tema: val }))}
                          options={P5_TEMA_OPTIONS}
                          placeholder="Pilih Tema"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="modal-projek-fase" className="font-bold text-slate-700 dark:text-slate-300">
                          Fase Capaian *
                        </label>
                        <SearchableSelect
                          id="modal-projek-fase"
                          value={newProjek.fase}
                          onValueChange={(val) => setNewProjek((prev) => ({ ...prev, fase: val }))}
                          options={P5_FASE_OPTIONS}
                          placeholder="Pilih Fase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-projek-desc" className="font-bold text-slate-700 dark:text-slate-300">
                        Deskripsi Projek
                      </label>
                      <textarea
                        id="modal-projek-desc"
                        rows={3}
                        value={newProjek.deskripsi}
                        onChange={(e) => setNewProjek((prev) => ({ ...prev, deskripsi: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                        placeholder="Tulis deskripsi tujuan dan output projek..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="toolbarPrimary"
                        size="toolbar"
                        disabled={createProjekMutation.isPending}
                      >
                        {createProjekMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        Simpan Projek
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default P5Page;
