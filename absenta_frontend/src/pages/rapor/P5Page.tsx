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
  Sparkles
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, Button, Badge, SearchableSelect, Input } from '../../components/ui';
import { Table, type Column } from '../../components/ui/Table';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { raporApi } from '../../api/rapor.api';
import { siswaApi } from '../../api/academic.api';
import useConfirm from '@/hooks/useConfirm';
import { toast } from 'react-hot-toast';
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
  const [activeTab, setActiveTab] = useState<string>('projek');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Reusable Centralized Academic Context
  const academicCtx = useAcademicContext();
  const { options: kelasOptions, isLoading: isLoadingKelas } = useKelasOptions();

  // Form Create Projek State
  const [newProjek, setNewProjek] = useState({
    judul: '',
    tema: 'Kewirausahaan',
    fase: 'Fase F',
    deskripsi: ''
  });

  // Penilaian Filters State
  const [selectedProjek, setSelectedProjek] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedDimensi, setSelectedDimensi] = useState('');
  const [selectedSubElemen, setSelectedSubElemen] = useState('');

  // Scores Grid State & Table Pagination
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('nama_siswa');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch P5 Projek Master List (Scoped to Academic Context)
  const { data: projekList, isLoading: isLoadingProjek } = useQuery({
    queryKey: ['p5-projek', academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester],
    queryFn: () => raporApi.getP5Projek({
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester
    }),
    enabled: Boolean(academicCtx.selectedTahunPelajaran && academicCtx.selectedSemester)
  });

  // Fetch Students by Class
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-p5', selectedKelas],
    queryFn: () => siswaApi.getByKelas(selectedKelas),
    enabled: activeTab === 'penilaian' && Boolean(selectedKelas)
  });

  // Fetch Existing P5 Grades
  const { data: existingP5Nilai } = useQuery({
    queryKey: ['p5-nilai', selectedProjek, selectedDimensi, selectedSubElemen],
    queryFn: () => raporApi.getP5Nilai({
      projek_id: selectedProjek,
      dimensi: selectedDimensi
    }),
    enabled: activeTab === 'penilaian' && Boolean(selectedProjek && selectedDimensi && selectedSubElemen)
  });

  // Prepopulate Grid when students load or existing grades arrive
  useEffect(() => {
    if (activeTab === 'penilaian' && students?.data) {
      const grid = (students.data ?? [])?.map((stud: { id: string; nama_siswa: string; nis?: string }) => {
        const exist = (existingP5Nilai?.data ?? [])?.find((n: { siswa_id: string; sub_elemen?: string; kualifikasi?: string; catatan_proses?: string }) => 
          n.siswa_id === stud.id && 
          n.sub_elemen === selectedSubElemen
        );
        const kualifikasi = exist?.kualifikasi || 'BSH';
        const defaultCatatan = P5_DEFAULT_CATATAN[kualifikasi] || '';
        return {
          id: stud.id,
          siswa_id: stud.id,
          nama_siswa: stud.nama_siswa,
          nis: stud.nis || '',
          kualifikasi,
          catatan_proses: exist?.catatan_proses || defaultCatatan
        };
      });
      setScores(grid);
    }
  }, [students, existingP5Nilai, activeTab, selectedSubElemen]);

  // Mutations
  const createProjekMutation = useMutation({
    mutationFn: raporApi.createP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      toast.success('Projek P5 berhasil dibuat');
      setIsCreateModalOpen(false);
      setNewProjek({ judul: '', tema: 'Kewirausahaan', fase: 'Fase F', deskripsi: '' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal membuat projek';
      toast.error(msg);
    }
  });

  const deleteProjekMutation = useMutation({
    mutationFn: raporApi.deleteP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      toast.success('Projek P5 berhasil dihapus');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus projek';
      toast.error(msg);
    }
  });

  const saveP5BulkMutation = useMutation({
    mutationFn: raporApi.upsertBulkP5Nilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-nilai'] });
      toast.success('Nilai Projek P5 berhasil disimpan');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan nilai';
      toast.error(msg);
    }
  });

  const handleCreateSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createProjekSchema.safeParse(newProjek);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Harap lengkapi form projek');
      return;
    }
    if (!academicCtx.selectedTahunPelajaran || !academicCtx.selectedSemester) {
      toast.error('Tahun pelajaran & semester belum dipilih pada konteks akademik');
      return;
    }

    const formattedDesc = formatProjekDeskripsi(newProjek.tema, newProjek.fase, newProjek.deskripsi);

    createProjekMutation.mutate({
      judul: newProjek.judul,
      deskripsi: formattedDesc,
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester
    });
  }, [newProjek, academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester, createProjekMutation]);

  const handleDeleteProjek = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Projek P5',
      description: 'Apakah Anda yakin ingin menghapus projek P5 ini beserta seluruh penilaian siswanya?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteProjekMutation.mutate(id);
    }
  }, [confirm, deleteProjekMutation]);

  const handleScoreChange = useCallback((id: string, field: 'kualifikasi' | 'catatan_proses', val: string) => {
    setScores(prev => (prev ?? [])?.map(s => {
      if (s.siswa_id !== id) return s;
      if (field === 'kualifikasi') {
        const defaultNote = P5_DEFAULT_CATATAN[val] || '';
        const isCurrentDefault = Object.values(P5_DEFAULT_CATATAN).includes(s.catatan_proses);
        const shouldUpdateNote = !s.catatan_proses || isCurrentDefault;
        return {
          ...s,
          kualifikasi: val,
          catatan_proses: shouldUpdateNote ? defaultNote : s.catatan_proses
        };
      }
      return { ...s, [field]: val };
    }));
  }, []);

  const handleBulkSetKualifikasi = useCallback((targetKualifikasi: 'BB' | 'MB' | 'BSH' | 'SB') => {
    setScores(prev => (prev ?? [])?.map(s => {
      const isCurrentDefault = Object.values(P5_DEFAULT_CATATAN).includes(s.catatan_proses);
      const shouldUpdateNote = !s.catatan_proses || isCurrentDefault;
      return {
        ...s,
        kualifikasi: targetKualifikasi,
        catatan_proses: shouldUpdateNote ? (P5_DEFAULT_CATATAN[targetKualifikasi] || s.catatan_proses) : s.catatan_proses
      };
    }));
    toast.success(`Seluruh siswa disetel ke kualifikasi ${targetKualifikasi}`);
  }, []);

  const handleSaveScores = useCallback(() => {
    const parsed = bulkScoresSchema.safeParse({
      projek_id: selectedProjek,
      dimensi: selectedDimensi,
      sub_elemen: selectedSubElemen
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Harap lengkapi kriteria dimensi & sub-elemen');
      return;
    }
    saveP5BulkMutation.mutate({
      projek_id: selectedProjek,
      dimensi: selectedDimensi,
      sub_elemen: selectedSubElemen,
      scores: (scores ?? [])?.map(s => ({
        siswa_id: s.siswa_id,
        kualifikasi: s.kualifikasi,
        catatan_proses: s.catatan_proses
      }))
    });
  }, [selectedProjek, selectedDimensi, selectedSubElemen, scores, saveP5BulkMutation]);

  const handlePrintStudentP5 = useCallback((siswaId: string) => {
    if (!academicCtx.selectedTahunPelajaran || !academicCtx.selectedSemester) {
      toast.error('Konteks tahun pelajaran dan semester belum dipilih');
      return;
    }
    const printUrl = raporApi.getPdfP5Url(siswaId, academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester);
    window.open(printUrl, '_blank');
  }, [academicCtx.selectedTahunPelajaran, academicCtx.selectedSemester]);

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor' },
    { label: 'Projek Penguatan Pelajar Pancasila (P5)' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'projek', label: 'Master Tema Projek P5' },
    { id: 'penilaian', label: 'Penilaian Kualitatif Siswa' }
  ], []);

  const tableColumns: Column[] = useMemo(() => [
    {
      key: 'nama_siswa',
      label: 'Identitas Siswa',
      sortable: true,
      render: (_: unknown, row: ScoreItem) => (
        <div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{row.nama_siswa}</span>
          <span className="text-[10px] text-slate-400 font-mono">NIS. {row.nis}</span>
        </div>
      )
    },
    {
      key: 'kualifikasi',
      label: 'Kualifikasi Capaian',
      sortable: true,
      render: (_: unknown, row: ScoreItem) => (
        <div className="w-52">
          <SearchableSelect
            id={`kualifikasi-select-${row.siswa_id}`}
            aria-label={`Kualifikasi capaian ${row.nama_siswa}`}
            value={row.kualifikasi}
            onValueChange={(val) => handleScoreChange(row.siswa_id, 'kualifikasi', val)}
            options={P5_KUALIFIKASI_OPTIONS}
            placeholder="Pilih Capaian"
          />
        </div>
      )
    },
    {
      key: 'catatan_proses',
      label: 'Deskripsi Capaian / Catatan Karakter',
      render: (_: unknown, row: ScoreItem) => (
        <Input
          id={`catatan-proses-input-${row.siswa_id}`}
          aria-label={`Catatan proses ${row.nama_siswa}`}
          placeholder="Tulis deskripsi capaian..."
          value={row.catatan_proses}
          onChange={(e) => handleScoreChange(row.siswa_id, 'catatan_proses', e.target.value)}
          className="rounded-xl text-xs w-full"
        />
      )
    },
    {
      key: 'aksi',
      label: 'Cetak',
      align: 'center',
      render: (_: unknown, row: ScoreItem) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handlePrintStudentP5(row.siswa_id)}
          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1.5"
          title="Pratinjau & Cetak Buku Rapor P5 Siswa"
        >
          <Printer size={13} />
          <span>Cetak</span>
        </Button>
      )
    }
  ], [handleScoreChange, handlePrintStudentP5]);

  const isMobile = useIsMobile();

  const renderMobileScoreCard = useCallback((row: ScoreItem) => (
    <div
      key={row.siswa_id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
            {row.nama_siswa}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 font-mono">
            NIS: {row.nis || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {row.kualifikasi && (
            <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              {row.kualifikasi}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePrintStudentP5(row.siswa_id)}
            className="p-1.5 h-auto text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
            title="Cetak Rapor P5"
          >
            <Printer size={13} />
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <div className="space-y-1">
          <label htmlFor={`mobile-kualifikasi-${row.siswa_id}`} className="text-[10px] font-bold text-slate-400 uppercase">
            Kualifikasi Capaian
          </label>
          <SearchableSelect
            id={`mobile-kualifikasi-${row.siswa_id}`}
            aria-label={`Kualifikasi capaian ${row.nama_siswa}`}
            value={row.kualifikasi}
            onValueChange={(val) => handleScoreChange(row.siswa_id, 'kualifikasi', val)}
            options={P5_KUALIFIKASI_OPTIONS}
            placeholder="Pilih Capaian"
            triggerClassName="h-9 text-xs rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`mobile-catatan-${row.siswa_id}`} className="text-[10px] font-bold text-slate-400 uppercase">
            Deskripsi Capaian
          </label>
          <Input
            id={`mobile-catatan-${row.siswa_id}`}
            aria-label={`Catatan proses ${row.nama_siswa}`}
            placeholder="Tulis deskripsi capaian..."
            value={row.catatan_proses}
            onChange={(e) => handleScoreChange(row.siswa_id, 'catatan_proses', e.target.value)}
            className="rounded-xl text-xs w-full h-9"
          />
        </div>
      </div>
    </div>
  ), [handleScoreChange, handlePrintStudentP5]);

  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (scores ?? []).slice(start, start + itemsPerPage);
  }, [scores, currentPage, itemsPerPage]);

  const projekOptions = useMemo(() => [
    { value: '', label: '-- Pilih Projek P5 --' },
    ...((projekList?.data ?? [])?.map((p: { id: string; judul: string }) => ({ value: p.id, label: p.judul })) || [])
  ], [projekList]);

  const subElemenOptions = useMemo(() => {
    if (!selectedDimensi) return [{ value: '', label: '-- Pilih Dimensi Terlebih Dahulu --' }];
    return P5_SUB_ELEMEN_MAP[selectedDimensi] || [{ value: '', label: '-- Pilih Sub-Elemen --' }];
  }, [selectedDimensi]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Projek Penguatan Profil Pelajar Pancasila (P5)"
        description="Manajemen tema projek dan penilaian kualitatif karakter peserta didik Kurikulum Merdeka."
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
          title: 'Panduan Rapor Projek P5 (Kurikulum Merdeka)',
          description: 'Kelola tema projek dan berikan penilaian kualitatif dimensi Profil Pelajar Pancasila pada setiap peserta didik.',
          items: [
            { text: 'Pilih Tahun Pelajaran dan Semester aktif pada toolbar konteks akademik di bagian atas.' },
            { text: 'Daftarkan tema projek P5 (tersedia 8 tema resmi Kemendikbud, termasuk tema wajib SMK: Kebekerjaan).' },
            { text: 'Pilih projek, kelas, dimensi, dan sub-elemen pada tab Penilaian Projek Siswa.' },
            { text: 'Gunakan tombol Set Semua BSH untuk mempercepat pengisian awal, lalu sesuaikan capaian MB atau SB.' },
            { text: 'Klik tombol Cetak untuk pratinjau Buku Rapor P5 resmi dalam format PDF.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-10 w-full min-w-0 max-w-full">
            {/* Navigation TabSwitcher */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
            />

            {/* Tab 1: Projek Master */}
            {activeTab === 'projek' && (
              <div className="space-y-6 w-full min-w-0 max-w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Daftar Projek P5 Sekolah</h3>
                    <p className="text-[11px] text-slate-400">Tema dan judul projek P5 pada semester yang sedang dipilih.</p>
                  </div>
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
                </div>

                {isLoadingProjek ? (
                  <div className="text-center py-20 text-slate-400 text-xs italic">Memuat master projek...</div>
                ) : !projekList?.data || projekList.data.length === 0 ? (
                  <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                    <FileText size={48} className="text-slate-300" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Projek P5</h4>
                    <p className="text-xs text-slate-400 max-w-sm">Belum ada tema projek P5 yang didaftarkan pada periode akademik ini.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0 max-w-full">
                    {(projekList.data ?? [])?.map((item: { id: string; judul: string; deskripsi?: string }) => {
                      const meta = parseProjekMetadata(item.deskripsi);
                      return (
                        <Card key={item.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group bg-white dark:bg-slate-900 w-full min-w-0 max-w-full">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border-none font-bold text-[10px]">
                                  {meta.tema}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-bold border-slate-200 dark:border-slate-800 text-slate-500">
                                  {meta.fase}
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                onClick={() => handleDeleteProjek(item.id)}
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                                {item.judul}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                                {meta.cleanDesc || 'Tidak ada deskripsi.'}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Penilaian Projek */}
            {activeTab === 'penilaian' && (
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {/* Filter Penilaian */}
                <Card className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full min-w-0 max-w-full">
                  <div className="space-y-1">
                    <label htmlFor="p5-filter-projek" className="text-[10px] font-bold text-slate-500 uppercase">1. Projek P5</label>
                    <SearchableSelect
                      id="p5-filter-projek"
                      aria-label="Pilih Projek P5"
                      value={selectedProjek}
                      onValueChange={setSelectedProjek}
                      options={projekOptions}
                      placeholder="Pilih Projek"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="p5-filter-kelas" className="text-[10px] font-bold text-slate-500 uppercase">2. Kelas Siswa</label>
                    <SearchableSelect
                      id="p5-filter-kelas"
                      aria-label="Pilih Kelas Siswa"
                      value={selectedKelas}
                      onValueChange={setSelectedKelas}
                      options={kelasOptions}
                      isLoading={isLoadingKelas}
                      placeholder="Pilih Kelas"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="p5-filter-dimensi" className="text-[10px] font-bold text-slate-500 uppercase">3. Dimensi Pancasila</label>
                    <SearchableSelect
                      id="p5-filter-dimensi"
                      aria-label="Pilih Dimensi Pancasila"
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
                    <label htmlFor="p5-filter-subelemen" className="text-[10px] font-bold text-slate-500 uppercase">4. Sub-Elemen Karakter</label>
                    <SearchableSelect
                      id="p5-filter-subelemen"
                      aria-label="Pilih Sub-Elemen Karakter"
                      value={selectedSubElemen}
                      onValueChange={setSelectedSubElemen}
                      options={subElemenOptions}
                      placeholder="Pilih Sub-Elemen"
                    />
                  </div>
                </Card>

                {/* Scores Table / Mobile Cards */}
                {selectedProjek && selectedKelas && selectedDimensi && selectedSubElemen && (
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
                    {/* Bulk Actions Bar */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Sparkles size={13} className="text-amber-500" />
                          Set Cepat Sekelas:
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkSetKualifikasi('BSH')}
                          className="text-[11px] font-bold h-7 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50"
                        >
                          Semua BSH
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkSetKualifikasi('SB')}
                          className="text-[11px] font-bold h-7 rounded-lg border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50"
                        >
                          Semua SB
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkSetKualifikasi('MB')}
                          className="text-[11px] font-bold h-7 rounded-lg border-amber-200 dark:border-amber-900 text-amber-600 hover:bg-amber-50"
                        >
                          Semua MB
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="toolbarPrimary"
                        size="toolbar"
                        onClick={handleSaveScores}
                        disabled={saveP5BulkMutation.isPending}
                        className="font-bold rounded-xl shadow-md w-full sm:w-auto"
                      >
                        {saveP5BulkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                        Simpan Nilai P5
                      </Button>
                    </div>

                    {isMobile ? (
                      <div className="p-4 space-y-4">
                        <MobileAcademicList
                          title="Daftar Siswa & Penilaian P5"
                          data={paginatedScores}
                          loading={isLoadingStudents}
                          totalItems={scores.length}
                          emptyMessage="Kelas kosong atau tidak ditemukan data siswa."
                          pagination={{
                            currentPage,
                            totalPages: Math.max(1, Math.ceil(scores.length / itemsPerPage)),
                            totalItems: scores.length,
                            itemsPerPage,
                            onPageChange: setCurrentPage,
                            onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); }
                          }}
                          renderCard={renderMobileScoreCard}
                        />
                      </div>
                    ) : (
                      <Table
                        columns={tableColumns}
                        data={paginatedScores}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={(col, dir) => { setSortBy(col); setSortOrder(dir); }}
                        emptyMessage="Kelas kosong atau tidak ditemukan data siswa."
                        toolbarLeft={
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Matriks Penilaian Karakter P5 ({scores.length} Siswa)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Dimensi: {selectedDimensi} • Sub: {selectedSubElemen}
                            </span>
                          </div>
                        }
                        pagination={{
                          currentPage,
                          totalPages: Math.max(1, Math.ceil(scores.length / itemsPerPage)),
                          totalItems: scores.length,
                          itemsPerPage,
                          onPageChange: setCurrentPage,
                          onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); }
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Create Projek P5 */}
            {isCreateModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 space-y-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Tambah Projek P5 Baru</h3>
                    <p className="text-xs text-slate-400">Daftarkan projek pembelajaran bertema Pancasila Kurikulum Merdeka.</p>
                  </div>

                  <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label htmlFor="modal-projek-judul" className="font-bold text-slate-700 dark:text-slate-300">Judul Projek *</label>
                      <Input
                        id="modal-projek-judul"
                        aria-label="Judul projek baru"
                        placeholder="Contoh: Berwirausaha Dari Hasil Kebun Ibu"
                        value={newProjek.judul}
                        onChange={(e) => setNewProjek(prev => ({ ...prev, judul: e.target.value }))}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="modal-projek-tema" className="font-bold text-slate-700 dark:text-slate-300">Tema Projek *</label>
                        <SearchableSelect
                          id="modal-projek-tema"
                          aria-label="Pilih Tema Projek"
                          value={newProjek.tema}
                          onValueChange={(val) => setNewProjek(prev => ({ ...prev, tema: val }))}
                          options={P5_TEMA_OPTIONS}
                          placeholder="Pilih Tema"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="modal-projek-fase" className="font-bold text-slate-700 dark:text-slate-300">Fase Capaian *</label>
                        <SearchableSelect
                          id="modal-projek-fase"
                          aria-label="Pilih Fase Capaian"
                          value={newProjek.fase}
                          onValueChange={(val) => setNewProjek(prev => ({ ...prev, fase: val }))}
                          options={P5_FASE_OPTIONS}
                          placeholder="Pilih Fase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-projek-desc" className="font-bold text-slate-700 dark:text-slate-300">Deskripsi / Capaian Impian Projek</label>
                      <textarea
                        id="modal-projek-desc"
                        aria-label="Deskripsi projek baru"
                        placeholder="Contoh: Mengembangkan Impian Peserta Didik SMK melalui wirausaha..."
                        rows={3}
                        value={newProjek.deskripsi}
                        onChange={(e) => setNewProjek(prev => ({ ...prev, deskripsi: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setIsCreateModalOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit" variant="toolbarPrimary" size="toolbar" disabled={createProjekMutation.isPending}>
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
