import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Layers, 
  Loader2, 
  Search, 
  Check, 
  FilePlus, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { raporApi, type P5FasilitatorItem } from '@/api/rapor.api';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  P5_TEMA_OPTIONS,
  P5_FASE_OPTIONS,
  P5_AVAILABLE_DIMENSI,
  P5_THEME_RECOMMENDED_DIMENSI,
  formatProjekDeskripsi,
  parseProjekMetadata,
} from '@/pages/rapor/components/p5/p5Constants';

interface P5FacilitatorSettingsTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  canManage: boolean;
}

export const P5FacilitatorSettingsTab: React.FC<P5FacilitatorSettingsTabProps> = ({
  tahunPelajaranId: initialTahunPelajaranId,
  semesterId: initialSemesterId,
  canManage,
}) => {
  const queryClient = useQueryClient();

  // 1. Academic Year Master Options
  const { options: tpOptions, activeYear } = useTahunPelajaranOptions();

  // Filter toolbar state
  const [selectedTapelFilter, setSelectedTapelFilter] = useState<string>('ALL');
  const [selectedProjekFilter, setSelectedProjekFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Form State for Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<{
    tahun_pelajaran_id: string;
    judul: string;
    tema: string;
    fase: string;
    deskripsi: string;
    dimensiList: string[];
  }>({
    tahun_pelajaran_id: '',
    judul: '',
    tema: 'Kewirausahaan',
    fase: 'Fase F',
    deskripsi: '',
    dimensiList: ['Mandiri', 'Gotong Royong', 'Kreatif'],
  });

  // Facilitator Modal State
  const [isFasilitatorModalOpen, setIsFasilitatorModalOpen] = useState(false);
  const [targetProjekId, setTargetProjekId] = useState<string>('');
  const [editingFasilitatorId, setEditingFasilitatorId] = useState<string | null>(null);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // 2. Fetch Projects: If 'ALL', fetch all projects for tenant; else fetch for selected year
  const { data: projekListRes, isLoading: isLoadingProjek } = useQuery({
    queryKey: ['p5-projek-list-settings', selectedTapelFilter],
    queryFn: () =>
      raporApi.getP5Projek({
        tahun_pelajaran_id: selectedTapelFilter === 'ALL' ? undefined : selectedTapelFilter,
      }),
  });

  const rawProjekList = useMemo(() => {
    return (projekListRes?.data || []) as Array<{
      id: string;
      judul: string;
      deskripsi?: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      TahunPelajaran?: {
        id: string;
        nama?: string;
        is_active?: boolean;
      };
      Fasilitator?: P5FasilitatorItem[];
    }>;
  }, [projekListRes]);

  // Keep project filter valid if list changes
  React.useEffect(() => {
    if (selectedProjekFilter !== 'ALL') {
      const exists = rawProjekList.some((p) => p.id === selectedProjekFilter);
      if (!exists) setSelectedProjekFilter('ALL');
    }
  }, [rawProjekList, selectedProjekFilter]);

  // Active Project if single project filtered
  const activeProjek = useMemo(() => {
    if (selectedProjekFilter === 'ALL') return null;
    return rawProjekList.find((p) => p.id === selectedProjekFilter) || null;
  }, [rawProjekList, selectedProjekFilter]);

  // 3. Aggregate Table Rows with Year Slot Information
  const allRows = useMemo(() => {
    const list: Array<{
      item: P5FasilitatorItem;
      projek: (typeof rawProjekList)[0];
      meta: ReturnType<typeof parseProjekMetadata>;
      tapelNama: string;
      isTapelActive: boolean;
    }> = [];

    rawProjekList.forEach((p) => {
      const meta = parseProjekMetadata(p.deskripsi);
      const matchedTp = tpOptions.find((tp) => tp.value === p.tahun_pelajaran_id);
      const tapelNama = p.TahunPelajaran?.nama || matchedTp?.label || 'Tahun Pelajaran';
      const isTapelActive =
        p.TahunPelajaran?.is_active ??
        (p.tahun_pelajaran_id === activeYear?.id || matchedTp?.label?.includes('Aktif'));

      (p.Fasilitator || []).forEach((f) => {
        list.push({
          item: f,
          projek: p,
          meta,
          tapelNama,
          isTapelActive: !!isTapelActive,
        });
      });
    });

    // Sort: Active academic year first, then descending by tapel name
    return list.sort((a, b) => {
      if (a.isTapelActive && !b.isTapelActive) return -1;
      if (!a.isTapelActive && b.isTapelActive) return 1;
      return b.tapelNama.localeCompare(a.tapelNama);
    });
  }, [rawProjekList, tpOptions, activeYear]);

  // Filtered Rows for display
  const displayedRows = useMemo(() => {
    let rows = allRows;

    if (selectedProjekFilter !== 'ALL') {
      rows = rows.filter((r) => r.projek.id === selectedProjekFilter);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      rows = rows.filter((r) => {
        const guruName = r.item.Guru?.nama_guru?.toLowerCase() || '';
        const nip = r.item.Guru?.nip?.toLowerCase() || '';
        const projTitle = r.projek.judul?.toLowerCase() || '';
        const tema = r.meta.tema?.toLowerCase() || '';
        const tapel = r.tapelNama.toLowerCase();
        const classes = (r.item.Kelas || [])
          .map((k) => k.Kelas?.nama_kelas?.toLowerCase() || '')
          .join(' ');
        return (
          guruName.includes(q) ||
          nip.includes(q) ||
          projTitle.includes(q) ||
          tema.includes(q) ||
          tapel.includes(q) ||
          classes.includes(q)
        );
      });
    }

    return rows;
  }, [allRows, selectedProjekFilter, searchFilter]);

  // 4. Guru & Kelas Master Options
  const { options: guruOptions, isLoading: isLoadingGurus } = useGuruOptions({
    jenisPtk: 'PENDIDIK',
    onlyActive: true,
  });

  const { rawList: kelasRawList, isLoading: isLoadingClasses } = useKelasOptions({
    onlyActive: true,
  });

  const filteredKelasList = useMemo(() => {
    if (!classSearchQuery.trim()) return kelasRawList;
    const q = classSearchQuery.toLowerCase();
    return kelasRawList.filter((k: any) =>
      (k.nama_kelas || k.nama || '').toLowerCase().includes(q)
    );
  }, [kelasRawList, classSearchQuery]);

  // Active semester helper for project creation
  const { activeSemester } = useSemesterOptions({
    tahunPelajaranId: projectForm.tahun_pelajaran_id || activeYear?.id,
  });

  // 5. Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => raporApi.createP5Projek(data),
    onSuccess: (res: any) => {
      toast.success('Tema projek P5 berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setIsProjectModalOpen(false);
      resetProjectForm();
      if (res?.data?.id) {
        setSelectedProjekFilter(res.data.id);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat tema projek P5');
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => raporApi.updateP5Projek(id, data),
    onSuccess: () => {
      toast.success('Tema projek P5 berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setIsProjectModalOpen(false);
      resetProjectForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui tema projek P5');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => raporApi.deleteP5Projek(id),
    onSuccess: () => {
      toast.success('Tema projek P5 berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setSelectedProjekFilter('ALL');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus tema projek P5');
    },
  });

  const upsertFasilitatorMutation = useMutation({
    mutationFn: ({
      projekId,
      payload,
    }: {
      projekId: string;
      payload: { guru_id: string; kelas_ids: string[] };
    }) => raporApi.upsertP5Fasilitator(projekId, payload),
    onSuccess: () => {
      toast.success('Tim fasilitator berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      setIsFasilitatorModalOpen(false);
      resetFasilitatorModalForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan fasilitator');
    },
  });

  const deleteFasilitatorMutation = useMutation({
    mutationFn: ({ projekId, guruId }: { projekId: string; guruId: string }) =>
      raporApi.deleteP5Fasilitator(projekId, guruId),
    onSuccess: () => {
      toast.success('Guru berhasil dihapus dari tim fasilitator');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus fasilitator');
    },
  });

  // ── Project Form Handlers ──
  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectForm({
      tahun_pelajaran_id:
        selectedTapelFilter !== 'ALL' ? selectedTapelFilter : activeYear?.id || '',
      judul: '',
      tema: 'Kewirausahaan',
      fase: 'Fase F',
      deskripsi: '',
      dimensiList: ['Mandiri', 'Gotong Royong', 'Kreatif'],
    });
  };

  const handleOpenCreateProject = () => {
    resetProjectForm();
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (projek: any) => {
    const meta = parseProjekMetadata(projek.deskripsi);
    setEditingProjectId(projek.id);
    setProjectForm({
      tahun_pelajaran_id: projek.tahun_pelajaran_id,
      judul: projek.judul,
      tema: meta.tema || 'Kewirausahaan',
      fase: meta.fase || 'Fase F',
      deskripsi: meta.cleanDesc || '',
      dimensiList:
        meta.dimensiList && meta.dimensiList.length > 0
          ? meta.dimensiList
          : ['Mandiri', 'Gotong Royong', 'Kreatif'],
    });
    setIsProjectModalOpen(true);
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.tahun_pelajaran_id) {
      toast.error('Pilih tahun pelajaran terlebih dahulu');
      return;
    }
    if (!projectForm.judul.trim()) {
      toast.error('Judul projek wajib diisi');
      return;
    }
    if (projectForm.dimensiList.length === 0) {
      toast.error('Pilih minimal satu dimensi sasaran projek P5');
      return;
    }
    const fullDesc = formatProjekDeskripsi(
      projectForm.tema,
      projectForm.fase,
      projectForm.deskripsi,
      projectForm.dimensiList
    );
    const payload = {
      judul: projectForm.judul.trim(),
      deskripsi: fullDesc,
      tahun_pelajaran_id: projectForm.tahun_pelajaran_id,
      semester_id: activeSemester?.id || initialSemesterId || '',
    };

    if (editingProjectId) {
      updateProjectMutation.mutate({ id: editingProjectId, data: payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  // ── Facilitator Form Handlers ──
  const resetFasilitatorModalForm = () => {
    setEditingFasilitatorId(null);
    setSelectedGuruId('');
    setSelectedKelasIds([]);
    setClassSearchQuery('');
  };

  const handleOpenAddFasilitator = () => {
    resetFasilitatorModalForm();
    const defaultProjId =
      selectedProjekFilter !== 'ALL' ? selectedProjekFilter : rawProjekList[0]?.id || '';
    setTargetProjekId(defaultProjId);
    setIsFasilitatorModalOpen(true);
  };

  const handleOpenEditFasilitator = (item: P5FasilitatorItem, projek: any) => {
    setEditingFasilitatorId(item.id);
    setTargetProjekId(projek.id);
    setSelectedGuruId(item.guru_id);
    const existingClassIds = item.Kelas?.map((k) => k.kelas_id) || [];
    setSelectedKelasIds(existingClassIds);
    setIsFasilitatorModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAllFilteredClasses = () => {
    const allFilteredIds = filteredKelasList.map((k: any) => k.id);
    setSelectedKelasIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleClearSelectedClasses = () => {
    setSelectedKelasIds([]);
  };

  const handleSubmitFasilitator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjekId) {
      toast.error('Pilih tema projek target terlebih dahulu');
      return;
    }
    if (!selectedGuruId) {
      toast.error('Pilih guru fasilitator terlebih dahulu');
      return;
    }
    upsertFasilitatorMutation.mutate({
      projekId: targetProjekId,
      payload: {
        guru_id: selectedGuruId,
        kelas_ids: selectedKelasIds,
      },
    });
  };

  return (
    <div className="space-y-3.5">
      {/* ── Toolbar: Filter Tapel, Filter Tema, Quick Search, dan Aksi ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* 1. Filter Tahun Pelajaran (Slot Selector via Dropdown) */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedTapelFilter}
              onChange={(e) => {
                setSelectedTapelFilter(e.target.value);
                setSelectedProjekFilter('ALL');
              }}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Tahun Pelajaran</option>
              {tpOptions.map((tp) => (
                <option key={tp.value} value={tp.value}>
                  {tp.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Tema Projek */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedProjekFilter}
              onChange={(e) => setSelectedProjekFilter(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
            >
              <option value="ALL">Semua Tema Projek ({rawProjekList.length})</option>
              {rawProjekList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.judul}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions for Selected Project */}
          {selectedProjekFilter !== 'ALL' && activeProjek && canManage && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEditProject(activeProjek)}
                className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-indigo-600"
                title="Edit Tema Projek"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit Tema
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      `Hapus tema projek "${activeProjek.judul}" beserta seluruh data fasilitatornya?`
                    )
                  ) {
                    deleteProjectMutation.mutate(activeProjek.id);
                  }
                }}
                className="h-7 px-2 text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Hapus Tema Projek"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Hapus
              </Button>
            </div>
          )}

          {/* 3. Quick Search */}
          <div className="relative min-w-[190px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari guru / rombel / tapel..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Action Buttons: Buat Tema & Tambah Fasilitator */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={handleOpenCreateProject}
              className="rounded-xl font-bold text-xs"
            >
              <FilePlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Tema Projek Baru
            </Button>

            {rawProjekList.length > 0 && (
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenAddFasilitator}
                className="rounded-xl font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Fasilitator
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Table Rekap Anggota Fasilitator dengan Kolom Tahun Pelajaran ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3 min-w-[130px]">Tahun Pelajaran</th>
                <th className="py-2.5 px-3 min-w-[180px]">Guru Fasilitator</th>
                <th className="py-2.5 px-3 min-w-[180px]">Tema &amp; Judul Projek</th>
                <th className="py-2.5 px-3 min-w-[200px]">Rombel / Kelas Dampingan</th>
                <th className="py-2.5 px-3 text-center w-24">Total Kelas</th>
                {canManage && <th className="py-2.5 px-3 text-center w-20">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoadingProjek ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-indigo-500" />
                    Memuat data tim fasilitator...
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                    <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      {rawProjekList.length === 0
                        ? 'Belum ada tema projek P5 yang dibuat'
                        : searchFilter.trim()
                        ? 'Tidak ada fasilitator yang sesuai pencarian'
                        : 'Belum ada guru fasilitator yang ditugaskan'}
                    </div>
                    <div className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                      {rawProjekList.length === 0
                        ? 'Klik "Tema Projek Baru" untuk menetapkan tema projek Merdeka terlebih dahulu.'
                        : 'Gunakan tombol "+ Tambah Fasilitator" untuk menugaskan guru dan rombel dampingan.'}
                    </div>
                    {canManage && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        {rawProjekList.length === 0 ? (
                          <Button
                            type="button"
                            variant="toolbarPrimary"
                            size="toolbar"
                            onClick={handleOpenCreateProject}
                            className="rounded-xl font-bold text-xs"
                          >
                            <FilePlus className="w-3.5 h-3.5 mr-1" />
                            Buat Tema Projek
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="toolbarPrimary"
                            size="toolbar"
                            onClick={handleOpenAddFasilitator}
                            className="rounded-xl font-bold text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Tambah Fasilitator
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => {
                  const coveredClasses = row.item.Kelas?.map((k) => k.Kelas) || [];

                  return (
                    <tr
                      key={row.item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Number */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* 2. Tahun Pelajaran Slot (Sesuai Kolom Slot Titimangsa) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {row.isTapelActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'font-bold text-[11px]',
                              row.isTapelActive
                                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                                : 'text-slate-800 dark:text-slate-200'
                            )}
                          >
                            {row.tapelNama}
                          </span>
                        </div>
                        <div className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium whitespace-nowrap">
                          {row.isTapelActive ? 'Tahun Ajaran Aktif' : 'Arsip Akademik'}
                        </div>
                      </td>

                      {/* 3. Guru Fasilitator */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-[11px] shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                            {row.item.Guru?.nama_guru?.charAt(0) || 'G'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {row.item.Guru?.nama_guru || 'Nama Guru'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              NIP: {row.item.Guru?.nip || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Tema & Judul Projek */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <span className="inline-block px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                            {row.meta.tema || 'P5'}
                          </span>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                            {row.projek.judul}
                          </div>
                        </div>
                      </td>

                      {/* 5. Rombel / Kelas Dampingan */}
                      <td className="py-2.5 px-3">
                        {coveredClasses.length === 0 ? (
                          <span className="text-[11px] text-amber-500 italic">
                            Belum ada rombel
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto no-scrollbar">
                            {coveredClasses.map((cls) => (
                              <span
                                key={cls?.id || Math.random()}
                                className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                              >
                                {cls?.nama_kelas}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 6. Total Kelas */}
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                        >
                          {coveredClasses.length} Rombel
                        </Badge>
                      </td>

                      {/* 7. Aksi */}
                      {canManage && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditFasilitator(row.item, row.projek)}
                              className="p-1 h-7 text-slate-500 hover:text-indigo-600 rounded-lg"
                              title="Edit Rombel Binaan"
                            >
                              <Edit3 size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Hapus ${row.item.Guru?.nama_guru} dari tim projek "${row.projek.judul}"?`
                                  )
                                ) {
                                  deleteFasilitatorMutation.mutate({
                                    projekId: row.projek.id,
                                    guruId: row.item.guru_id,
                                  });
                                }
                              }}
                              className="p-1 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                              title="Hapus Fasilitator"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Create / Edit Tema Projek P5 ── */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProjectId ? 'Edit Tema Projek P5' : 'Buat Tema Projek P5 Baru'}
      >
        <form onSubmit={handleSubmitProject} className="space-y-3.5 text-xs">
          {/* Slot Tahun Pelajaran */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Tahun Pelajaran (Slot Akademik) *
            </label>
            <SearchableSelect
              id="p5-proj-tapel"
              value={projectForm.tahun_pelajaran_id}
              onValueChange={(val) =>
                setProjectForm((prev) => ({ ...prev, tahun_pelajaran_id: val }))
              }
              options={tpOptions}
              placeholder="Pilih Tahun Pelajaran"
              disabled={!!editingProjectId}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="p5-proj-title" className="font-bold text-slate-700 dark:text-slate-300">
              Judul Tema Projek *
            </label>
            <Input
              id="p5-proj-title"
              placeholder="Contoh: Kewirausahaan Berbasis Produk Olahan Pangan"
              value={projectForm.judul}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, judul: e.target.value }))}
              className="rounded-xl font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="p5-proj-theme" className="font-bold text-slate-700 dark:text-slate-300">
                Tema Projek Merdeka *
              </label>
              <SearchableSelect
                id="p5-proj-theme"
                value={projectForm.tema}
                onValueChange={(val) => {
                  const recommended =
                    P5_THEME_RECOMMENDED_DIMENSI[val] || ['Mandiri', 'Gotong Royong', 'Kreatif'];
                  setProjectForm((prev) => ({
                    ...prev,
                    tema: val,
                    dimensiList: recommended,
                  }));
                }}
                options={P5_TEMA_OPTIONS}
                placeholder="Pilih Tema"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="p5-proj-fase" className="font-bold text-slate-700 dark:text-slate-300">
                Fase Capaian *
              </label>
              <SearchableSelect
                id="p5-proj-fase"
                value={projectForm.fase}
                onValueChange={(val) => setProjectForm((prev) => ({ ...prev, fase: val }))}
                options={P5_FASE_OPTIONS}
                placeholder="Pilih Fase"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="p5-proj-desc" className="font-bold text-slate-700 dark:text-slate-300">
              Deskripsi Projek
            </label>
            <textarea
              id="p5-proj-desc"
              rows={2}
              value={projectForm.deskripsi}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, deskripsi: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium p-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
              placeholder="Tuliskan tujuan dan keluaran hasil projek..."
            />
          </div>

          {/* Dimensi Profil Pelajar Pancasila Checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                Target Dimensi Pancasila ({projectForm.dimensiList.length} Dipilih)
              </label>
              <button
                type="button"
                onClick={() => {
                  const rec =
                    P5_THEME_RECOMMENDED_DIMENSI[projectForm.tema] || [
                      'Mandiri',
                      'Gotong Royong',
                      'Kreatif',
                    ];
                  setProjectForm((prev) => ({ ...prev, dimensiList: rec }));
                  toast.success('Rekomendasi tema diterapkan');
                }}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Reset Rekomendasi
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {P5_AVAILABLE_DIMENSI.map((dim) => {
                const isSelected = projectForm.dimensiList.includes(dim.id);
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => {
                      setProjectForm((prev) => {
                        const exists = prev.dimensiList.includes(dim.id);
                        const next = exists
                          ? prev.dimensiList.filter((d) => d !== dim.id)
                          : [...prev.dimensiList, dim.id];
                        return { ...prev, dimensiList: next };
                      });
                    }}
                    className={cn(
                      'p-2 rounded-xl border text-left flex items-start gap-2 transition-all',
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                      )}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs block leading-tight">{dim.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProjectModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="toolbarPrimary"
              size="sm"
              disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
              className="rounded-xl font-bold"
            >
              {createProjectMutation.isPending || updateProjectMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              {editingProjectId ? 'Perbarui Projek' : 'Simpan Tema Projek'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Add / Edit Fasilitator ── */}
      <Modal
        isOpen={isFasilitatorModalOpen}
        onClose={() => setIsFasilitatorModalOpen(false)}
        title={editingFasilitatorId ? 'Edit Rombel Fasilitator P5' : 'Tugaskan Guru Fasilitator P5'}
      >
        <form onSubmit={handleSubmitFasilitator} className="space-y-3.5 text-xs">
          {/* Target Project Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Tema Projek Sasaran *
            </label>
            <select
              value={targetProjekId}
              onChange={(e) => setTargetProjekId(e.target.value)}
              disabled={!!editingFasilitatorId}
              className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              {rawProjekList.map((p) => {
                const matchedTp = tpOptions.find((tp) => tp.value === p.tahun_pelajaran_id);
                const tpName = p.TahunPelajaran?.nama || matchedTp?.label || '';
                return (
                  <option key={p.id} value={p.id}>
                    {tpName ? `[${tpName}] ` : ''}
                    {p.judul}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Teacher Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Pilih Guru Pendidik *
            </label>
            <SearchableSelect
              id="modal-select-guru"
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruOptions}
              placeholder="-- Pilih Guru Fasilitator --"
              isLoading={isLoadingGurus}
              disabled={!!editingFasilitatorId}
            />
          </div>

          {/* Class Checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Pilih Kelas Dampingan ({selectedKelasIds.length} Dipilih)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredClasses}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearSelectedClasses}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* Search Input for Classes */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kelas (misal: X PPLG 1)..."
                value={classSearchQuery}
                onChange={(e) => setClassSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Checklist Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-950/30">
              {isLoadingClasses ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">Memuat kelas...</div>
              ) : filteredKelasList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Tidak ada kelas yang cocok.
                </div>
              ) : (
                filteredKelasList.map((cls: any) => {
                  const isChecked = selectedKelasIds.includes(cls.id);
                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleToggleClass(cls.id)}
                      className={cn(
                        'flex items-center justify-between p-1.5 px-2.5 rounded-lg text-xs cursor-pointer select-none transition-all',
                        isChecked
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded flex items-center justify-center border transition-all',
                            isChecked
                              ? 'bg-white text-indigo-600 border-white'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent'
                          )}
                        >
                          {isChecked && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span>{cls.nama_kelas || cls.nama}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px]',
                          isChecked ? 'text-indigo-100' : 'text-slate-400'
                        )}
                      >
                        Tingkat {cls.tingkat || 10}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFasilitatorModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="toolbarPrimary"
              size="sm"
              disabled={upsertFasilitatorMutation.isPending}
              className="rounded-xl font-bold"
            >
              {upsertFasilitatorMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Simpan Penugasan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
