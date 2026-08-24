import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, SectionCard } from '../../../components/ui';
import { getSiswaList, mapPpdbStudents, importSiswaFromExcel, updateSiswa, deleteSiswa } from '../../../api/academic/siswa.api';
import { getJurusanForDropdown, getKelasForDropdown } from '../../../api/dropdown.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import type { Siswa } from '../../../types/academic';
import {
  Search,
  GraduationCap,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Download,
  GripVertical,
  CornerRightDown,
  ArrowDown,
  ListOrdered,
  Shuffle,
  Trash2,
  Users,
  Building2,
  CheckCircle,
  Clock
} from 'lucide-react';
import useConfirm from '../../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { generateStandardFilename } from '../../../utils/file-download.utils';
import { generateImportTemplate } from '../../../utils/export.utils';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

// Lazy Loaded Subcomponents (Pilar 13)
const ExcelImportModal = lazy(() => import('../../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const PpdbClassCard = lazy(() => import('./components/PpdbClassCard'));
const PpdbMappingModal = lazy(() => import('./components/PpdbMappingModal'));

interface ProfileResponse {
  success: boolean;
  data?: {
    jenjang?: string;
  };
  jenjang?: string;
}

interface DropdownOption {
  value: string;
  label: string;
  jurusan_id?: string | null;
  tingkat?: number | null;
  is_active?: boolean;
  siswa_count?: number;
  warna?: string | null;
  Jurusan?: {
    id: string;
    nama?: string;
  };
}

// Zod Schema Validation Guard (Pilar 25)
const mappingSchema = z.object({
  siswaIds: z.array(z.string().uuid('ID siswa tidak valid')).min(1, 'Pilih minimal satu siswa untuk dipetakan'),
  kelasId: z.string().uuid('Pilih kelas tujuan yang valid')
});

export const PpdbMappingPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [expandedKelasId, setExpandedKelasId] = useState<string | null>(null);
  const [kelasSiswaList, setKelasSiswaList] = useState<Siswa[]>([]);
  const [kelasSiswaLoading, setKelasSiswaLoading] = useState(false);

  // Filter & selections
  const [selectedJurusan, setSelectedJurusan] = useState<string>('all');
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([]);
  const [targetKelasId, setTargetKelasId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Fetch metadata via React Query (Pilar 31)
  const { data: metaData } = useQuery({
    queryKey: ['ppdb-mapping-metadata'],
    queryFn: async () => {
      const [sekolahRes, jurusanList, allKelas] = await Promise.all([
        sekolahApi.getProfile(),
        getJurusanForDropdown(),
        getKelasForDropdown()
      ]);
      const rawSekolah = (sekolahRes as ProfileResponse)?.data || sekolahRes;
      const jenjang = rawSekolah?.jenjang?.toUpperCase() || '';
      const isSmk = ['SMK', 'MAK'].includes(jenjang) || ((jurusanList as DropdownOption[])?.length > 0);
      const jurusans = (jurusanList || []) as DropdownOption[];
      const kelasOptions = ((allKelas || []) as DropdownOption[])?.map(k => ({
        value: k.value,
        label: k.label,
        jurusan_id: k.jurusan_id || k.Jurusan?.id || null,
        tingkat: k.tingkat || null,
        is_active: k.is_active !== false,
        siswa_count: k.siswa_count || 0
      }));

      return { isSmkMak: isSmk, jurusans, kelasOptions };
    },
    staleTime: 5 * 60 * 1000
  });

  const isSmkMak = metaData?.isSmkMak || false;
  const jurusans = useMemo(() => metaData?.jurusans || [], [metaData]);
  const kelasOptions = useMemo(() => metaData?.kelasOptions || [], [metaData]);

  // 2. Fetch CALON students via React Query (Pilar 31)
  const { data: calonList = [], isLoading: loading, refetch: refetchCalon } = useQuery<Siswa[]>({
    queryKey: ['ppdb-calon-students'],
    queryFn: async () => {
      const res = await getSiswaList(1, 1000, '', '', 'CALON');
      return (res.data || []) as Siswa[];
    }
  });

  // Filter students based on selected jurusan & search term
  const filteredSiswa = useMemo(() => {
    const list = (calonList ?? []).filter(s => {
      const matchSearch = !searchTerm || s.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) || Boolean(s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchJurusan = !isSmkMak || selectedJurusan === 'all' || (selectedJurusan === 'none' ? !s.jurusan_id : s.jurusan_id === selectedJurusan);
      return matchSearch && matchJurusan;
    });
    return [...list].sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
  }, [calonList, selectedJurusan, searchTerm, isSmkMak]);

  // Filter target classes: only tingkat 10, active, and matching jurusan
  const filteredKelasOptions = useMemo(() => {
    const res = (kelasOptions ?? []).filter(k => k.tingkat === 10 && k.is_active !== false);
    return (!isSmkMak || selectedJurusan === 'all') ? res : (selectedJurusan === 'none' ? res.filter(k => !k.jurusan_id) : res.filter(k => k.jurusan_id === selectedJurusan));
  }, [kelasOptions, selectedJurusan, isSmkMak]);

  const isJurusanSelected = useMemo(() => !isSmkMak || (selectedJurusan !== 'all'), [isSmkMak, selectedJurusan]);

  // Dropdown options formatted dynamically with counts
  const jurusanOptions = useMemo(() => [
    { label: `Semua Jurusan (${calonList?.length || 0})`, value: 'all', warna: null },
    ...((jurusans ?? [])?.map(j => ({
      label: `${j.label} (${(calonList ?? [])?.filter(s => s.jurusan_id === j.value)?.length || 0})`,
      value: j.value,
      warna: j.warna || null
    })) || []),
    { label: `Tanpa Jurusan (Belum diisi) (${(calonList ?? [])?.filter(s => !s.jurusan_id)?.length || 0})`, value: 'none', warna: null }
  ], [jurusans, calonList]);

  // Mutation for Mapping Students (Pilar 32 Cache Invalidation)
  const mapStudentsMutation = useMutation({
    mutationFn: async (payload: { siswaIds: string[]; kelasId: string }) => {
      const parsed = mappingSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Data pemetaan tidak valid');
      }
      return mapPpdbStudents(payload.siswaIds, payload.kelasId);
    },
    onSuccess: (res, variables) => {
      toast.success(res.message || `Berhasil memetakan ${variables.siswaIds.length} siswa ke kelas`);
      setSelectedSiswa([]);
      setTargetKelasId('');
      setMappingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ppdb-calon-students'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-mapping-metadata'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memetakan siswa';
      toast.error(msg);
    }
  });

  // Revert Student Mutation
  const revertMutation = useMutation({
    mutationFn: async (siswaId: string) => {
      return updateSiswa(siswaId, { status: 'CALON', kelas_id: null });
    },
    onSuccess: () => {
      toast.success('Siswa berhasil dikembalikan ke status Calon');
      queryClient.invalidateQueries({ queryKey: ['ppdb-calon-students'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-mapping-metadata'] });
      if (expandedKelasId) {
        loadKelasSiswa(expandedKelasId);
      }
    },
    onError: () => {
      toast.error('Gagal mengembalikan siswa');
    }
  });

  const loadKelasSiswa = useCallback(async (kelasId: string) => {
    setKelasSiswaLoading(true);
    try {
      const res = await getSiswaList(1, 100, '', kelasId, 'AKTIF');
      setKelasSiswaList(res.data || []);
    } catch {
      toast.error('Gagal memuat siswa kelas');
    } finally {
      setKelasSiswaLoading(false);
    }
  }, []);

  const handleToggleExpand = useCallback((kelasId: string) => {
    if (expandedKelasId === kelasId) {
      setExpandedKelasId(null);
      setKelasSiswaList([]);
    } else {
      setExpandedKelasId(kelasId);
      loadKelasSiswa(kelasId);
    }
  }, [expandedKelasId, loadKelasSiswa]);

  const handleRevertStudent = useCallback(async (siswaId: string, namaSiswa: string) => {
    const isOk = await confirm({
      title: 'Kembalikan Siswa ke Antrean PPDB?',
      description: `Apakah Anda yakin ingin membatalkan pemetaan untuk ${namaSiswa}? Siswa akan dikembalikan ke status CALON.`,
      confirmText: 'Kembalikan',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (isOk) {
      revertMutation.mutate(siswaId);
    }
  }, [confirm, revertMutation]);

  const handleRevertAllStudents = useCallback(async (kelasId: string) => {
    const isOk = await confirm({
      title: 'Kembalikan Semua Siswa di Kelas Ini?',
      description: 'Semua siswa yang sudah terpetakan di kelas ini akan dikembalikan ke status CALON.',
      confirmText: 'Kembalikan Semua',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isOk) {
      const siswaIds = (kelasSiswaList ?? [])?.map(s => s.id);
      await Promise.all(siswaIds?.map(id => updateSiswa(id, { status: 'CALON', kelas_id: null })));
      toast.success('Semua siswa berhasil dikembalikan ke status Calon');
      queryClient.invalidateQueries({ queryKey: ['ppdb-calon-students'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-mapping-metadata'] });
      setKelasSiswaList([]);
    }
  }, [confirm, kelasSiswaList, queryClient]);

  // Drag and Drop
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    const targets = selectedSiswa.includes(id) ? selectedSiswa : [id];
    if (!selectedSiswa.includes(id)) setSelectedSiswa([id]);
    e.dataTransfer.setData('text/plain', JSON.stringify(targets));
    setDraggingIds(targets);
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedSiswa]);

  const handleDragEnd = useCallback(() => {
    setDraggingIds([]);
    setActiveDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropTarget !== targetId) {
      setActiveDropTarget(targetId);
    }
  }, [activeDropTarget]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropTarget(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetKelasIdValue: string) => {
    e.preventDefault();
    setActiveDropTarget(null);
    setDraggingIds([]);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      const siswaIds: string[] = JSON.parse(rawData);
      if (!siswaIds || siswaIds.length === 0) return;

      const targetKelas = (kelasOptions ?? []).find(k => k.value === targetKelasIdValue);
      const isOk = await confirm({
        title: 'Konfirmasi Pemetaan Cepat',
        description: `Petakan ${siswaIds.length} siswa ke kelas ${targetKelas?.label || 'tujuan'}?`,
        confirmText: 'Ya, Petakan',
        cancelText: 'Batal',
        style: 'primary',
      });

      if (isOk) {
        mapStudentsMutation.mutate({ siswaIds, kelasId: targetKelasIdValue });
      }
    } catch {
      toast.error('Gagal memproses drag & drop siswa');
    }
  }, [confirm, kelasOptions, mapStudentsMutation]);

  const handleSelectAll = useCallback(() => {
    if (selectedSiswa.length === filteredSiswa.length) {
      setSelectedSiswa([]);
    } else {
      setSelectedSiswa(filteredSiswa?.map(s => s.id));
    }
  }, [selectedSiswa.length, filteredSiswa]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedSiswa(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }, []);

  const handleMapStudents = useCallback(() => {
    if (selectedSiswa.length === 0 || !targetKelasId) return;
    mapStudentsMutation.mutate({ siswaIds: selectedSiswa, kelasId: targetKelasId });
  }, [selectedSiswa, targetKelasId, mapStudentsMutation]);

  const handleDownloadFormat = useCallback(() => {
    try {
      setIsExporting(true);
      generateImportTemplate('CALON_SISWA');
      toast.success('Template impor siswa berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh template');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImportSiswa = useCallback(async (file: File) => {
    const res = await importSiswaFromExcel(file);
    queryClient.invalidateQueries({ queryKey: ['ppdb-calon-students'] });
    return res;
  }, [queryClient]);

  const isDragging = draggingIds.length > 0;

  const headerStats = useMemo(() => [
    {
      title: "Total Calon Siswa",
      value: calonList.length,
      icon: <Users size={16} className="text-white" />,
      gradient: "from-blue-600 to-indigo-800",
      subtitle: "Menunggu penempatan"
    },
    {
      title: "Target Kelas 10",
      value: filteredKelasOptions.length,
      icon: <Building2 size={16} className="text-white" />,
      gradient: "from-emerald-600 to-teal-800",
      subtitle: "Rombel tingkat awal"
    },
    {
      title: "Terpilih",
      value: selectedSiswa.length,
      icon: <CheckCircle size={16} className="text-white" />,
      gradient: "from-purple-600 to-pink-800",
      subtitle: "Siap dipetakan"
    }
  ], [calonList.length, filteredKelasOptions.length, selectedSiswa.length]);

  const breadcrumbs = useMemo(() => [
    { label: 'Data Akademik' },
    { label: 'Pemetaan PPDB Siswa Baru' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pemetaan Siswa PPDB',
    description: 'Petakan siswa baru yang berstatus Calon Siswa ke dalam rombongan belajar (kelas) Tingkat 10.',
    items: [
      { text: 'Gunakan fitur drag-and-drop untuk memindahkan siswa langsung ke kotak kelas tujuan.' },
      { text: 'Pilih beberapa siswa sekaligus lalu klik "Petakan Siswa Terpilih" untuk pemetaan massal.' },
      { text: 'Siswa yang telah dipetakan akan otomatis berganti status menjadi Siswa Aktif.' }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        hardeningModuleKey="academic_ppdb_mapping"
        title="Pemetaan Siswa PPDB ke Kelas"
        description="Distribusikan calon peserta didik baru ke dalam rombongan belajar kelas tingkat 10 secara terstruktur."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0 max-w-full">
            {/* Sisi Kiri: Daftar Calon Siswa (7 Kolom) */}
            <div className="lg:col-span-7 space-y-4 min-w-0">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / NISN calon siswa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Cari nama atau NISN calon siswa"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => refetchCalon()}
                      disabled={loading}
                      className="rounded-xl"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={handleDownloadFormat}
                      disabled={isExporting}
                      className="rounded-xl"
                    >
                      <Download size={12} className="mr-1" /> Template
                    </Button>
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => setImportOpen(true)}
                      className="rounded-xl font-bold"
                    >
                      <FileSpreadsheet size={12} className="mr-1" /> Import
                    </Button>
                  </div>
                </div>

                {isSmkMak && (
                  <div className="w-full">
                    <SearchableSelect
                      id="filter-jurusan-ppdb"
                      aria-label="Filter Konsentrasi Keahlian"
                      value={selectedJurusan}
                      onValueChange={setSelectedJurusan}
                      options={jurusanOptions}
                      placeholder="Pilih Jurusan"
                    />
                  </div>
                )}
              </div>

              {/* Tabel Calon Siswa */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua calon siswa"
                      checked={selectedSiswa.length > 0 && selectedSiswa.length === filteredSiswa.length}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {selectedSiswa.length > 0 ? `${selectedSiswa.length} dipilih` : 'Pilih Semua'}
                    </span>
                  </div>

                  {selectedSiswa.length > 0 && (
                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={() => setMappingModalOpen(true)}
                      className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <UserCheck size={12} className="mr-1" /> Petakan Terpilih ({selectedSiswa.length})
                    </Button>
                  )}
                </div>

                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-slate-400">Memuat calon siswa...</div>
                  ) : filteredSiswa.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">Tidak ada calon siswa ditemukan.</div>
                  ) : (
                    (filteredSiswa ?? [])?.map(siswa => (
                      <div
                        key={siswa.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, siswa.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-grab active:cursor-grabbing transition ${
                          selectedSiswa.includes(siswa.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            aria-label={`Pilih siswa ${siswa.nama_siswa}`}
                            checked={selectedSiswa.includes(siswa.id)}
                            onChange={() => handleToggleSelect(siswa.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <GripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{siswa.nama_siswa}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{siswa.nisn || siswa.nis || 'NISN Belum Terdaftar'}</p>
                          </div>
                        </div>

                        {siswa.Jurusan?.nama && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {siswa.Jurusan.nama}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Target Rombel / Kelas 10 (5 Kolom) */}
            <div className="lg:col-span-5 space-y-4 min-w-0">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Target Rombel Kelas 10 ({filteredKelasOptions.length})
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Seret calon siswa dari sisi kiri dan lepaskan ke kartu kelas di bawah untuk memetakan.
                </p>
              </div>

              <div className="space-y-3">
                {filteredKelasOptions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    Tidak ada kelas tingkat 10 yang sesuai kriteria.
                  </div>
                ) : (
                  (filteredKelasOptions ?? [])?.map(k => (
                    <Suspense key={k.value} fallback={<div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />}>
                      <PpdbClassCard
                        kelas={k}
                        isDragging={isDragging}
                        activeDropTarget={activeDropTarget}
                        expandedKelasId={expandedKelasId}
                        setExpandedKelasId={setExpandedKelasId}
                        kelasSiswaLoading={kelasSiswaLoading}
                        kelasSiswaList={kelasSiswaList}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onQuickMap={(kelasId) => {
                          if (selectedSiswa.length > 0) {
                            mapStudentsMutation.mutate({ siswaIds: selectedSiswa, kelasId });
                          }
                        }}
                        onToggleExpand={handleToggleExpand}
                        onRevertStudent={handleRevertStudent}
                        onRevertAllStudents={handleRevertAllStudents}
                        hasSelectedSiswa={selectedSiswa.length > 0}
                      />
                    </Suspense>
                  ))
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Lazy Loaded Modals */}
        {mappingModalOpen && (
          <Suspense fallback={null}>
            <PpdbMappingModal
              isOpen={mappingModalOpen}
              onClose={() => setMappingModalOpen(false)}
              selectedSiswa={selectedSiswa}
              calonList={calonList}
              targetKelasId={targetKelasId}
              setTargetKelasId={setTargetKelasId}
              filteredKelasOptions={filteredKelasOptions?.map(k => ({ label: k.label, value: k.value }))}
              submitLoading={mapStudentsMutation.isPending}
              onMapStudents={handleMapStudents}
            />
          </Suspense>
        )}

        {importOpen && (
          <Suspense fallback={null}>
            <ExcelImportModal
              isOpen={importOpen}
              onClose={() => setImportOpen(false)}
              title="Import Calon Siswa PPDB"
              onImport={handleImportSiswa}
              onDownloadTemplate={handleDownloadFormat}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['ppdb-calon-students'] });
                setImportOpen(false);
              }}
              sampleDataHint="Pastikan format kolom status adalah 'CALON' atau kosong."
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default PpdbMappingPage;
