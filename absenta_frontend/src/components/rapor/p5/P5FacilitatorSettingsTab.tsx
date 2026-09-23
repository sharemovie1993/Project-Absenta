import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Layers, 
  Loader2, 
  ShieldAlert,
  Search,
  Check,
  FilePlus,
  Settings2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { raporApi, type P5FasilitatorItem } from '../../../api/rapor.api';
import { useGuruOptions } from '../../../hooks/useGuruOptions';
import { useKelasOptions } from '../../../hooks/useKelasOptions';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { cn } from '../../../lib/utils';
import {
  P5_TEMA_OPTIONS,
  P5_FASE_OPTIONS,
  P5_AVAILABLE_DIMENSI,
  P5_THEME_RECOMMENDED_DIMENSI,
  formatProjekDeskripsi,
  parseProjekMetadata,
} from '../../../pages/rapor/components/p5/p5Constants';

interface P5FacilitatorSettingsTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  canManage: boolean;
}

export const P5FacilitatorSettingsTab: React.FC<P5FacilitatorSettingsTabProps> = ({
  tahunPelajaranId,
  semesterId,
  canManage,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjekId, setSelectedProjekId] = useState<string>('');

  // ── Project Modal State (Create / Edit Tema Projek) ──
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<{
    judul: string;
    tema: string;
    fase: string;
    deskripsi: string;
    dimensiList: string[];
  }>({
    judul: '',
    tema: 'Kewirausahaan',
    fase: 'Fase F',
    deskripsi: '',
    dimensiList: ['Mandiri', 'Gotong Royong', 'Kreatif'],
  });

  // ── Facilitator Modal State ──
  const [isFasilitatorModalOpen, setIsFasilitatorModalOpen] = useState(false);
  const [editingFasilitatorId, setEditingFasilitatorId] = useState<string | null>(null);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // 1. Fetch Projek P5 for active academic period
  const { data: projekListRes, isLoading: isLoadingProjek } = useQuery({
    queryKey: ['p5-projek-list-settings', tahunPelajaranId, semesterId],
    queryFn: () => raporApi.getP5Projek({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId,
    }),
    enabled: !!tahunPelajaranId,
  });

  const projekList = useMemo(() => {
    return (projekListRes?.data || []) as Array<{
      id: string;
      judul: string;
      deskripsi?: string;
      Fasilitator?: P5FasilitatorItem[];
    }>;
  }, [projekListRes]);

  // Auto-sync project selection when academic period or project list changes
  React.useEffect(() => {
    if (projekList.length > 0) {
      const exists = projekList.some((p) => p.id === selectedProjekId);
      if (!exists) {
        setSelectedProjekId(projekList[0].id);
      }
    } else {
      setSelectedProjekId('');
    }
  }, [projekList, selectedProjekId]);

  const activeProjek = useMemo(() => {
    return projekList.find((p) => p.id === selectedProjekId) || null;
  }, [projekList, selectedProjekId]);

  const activeProjekMeta = useMemo(() => {
    return parseProjekMetadata(activeProjek?.deskripsi);
  }, [activeProjek]);

  // 2. Fetch Fasilitator for selected project
  const { data: fasilitatorRes, isLoading: isLoadingFasilitator } = useQuery({
    queryKey: ['p5-fasilitator-list', selectedProjekId],
    queryFn: () => raporApi.getP5Fasilitator(selectedProjekId),
    enabled: !!selectedProjekId,
  });

  const fasilitatorList = useMemo(() => {
    return (fasilitatorRes?.data || []) as P5FasilitatorItem[];
  }, [fasilitatorRes]);

  // 3. Guru & Kelas Master Options
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

  // 4. Project Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => raporApi.createP5Projek(data),
    onSuccess: (res: any) => {
      toast.success('Tema projek P5 berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-all'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setIsProjectModalOpen(false);
      resetProjectForm();
      if (res?.data?.id) {
        setSelectedProjekId(res.data.id);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat projek P5');
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => raporApi.updateP5Projek(id, data),
    onSuccess: () => {
      toast.success('Tema projek P5 berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-all'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setIsProjectModalOpen(false);
      resetProjectForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui projek P5');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => raporApi.deleteP5Projek(id),
    onSuccess: () => {
      toast.success('Tema projek P5 berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-all'] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      setSelectedProjekId('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus projek P5');
    },
  });

  // 5. Facilitator Mutations
  const upsertFasilitatorMutation = useMutation({
    mutationFn: (payload: { guru_id: string; kelas_ids: string[] }) =>
      raporApi.upsertP5Fasilitator(selectedProjekId, payload),
    onSuccess: () => {
      toast.success('Tim fasilitator projek berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['p5-fasilitator-list', selectedProjekId] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects-hero'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects'] });
      setIsFasilitatorModalOpen(false);
      resetFasilitatorModalForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan fasilitator projek');
    },
  });

  const deleteFasilitatorMutation = useMutation({
    mutationFn: (guruId: string) =>
      raporApi.removeP5Fasilitator(selectedProjekId, guruId),
    onSuccess: () => {
      toast.success('Guru berhasil dihapus dari tim fasilitator');
      queryClient.invalidateQueries({ queryKey: ['p5-fasilitator-list', selectedProjekId] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects-hero'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus fasilitator');
    },
  });

  // Project Form Handlers
  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectForm({
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
      judul: projek.judul,
      tema: meta.tema || 'Kewirausahaan',
      fase: meta.fase || 'Fase F',
      deskripsi: meta.cleanDesc || '',
      dimensiList: meta.dimensiList && meta.dimensiList.length > 0 ? meta.dimensiList : ['Mandiri', 'Gotong Royong', 'Kreatif'],
    });
    setIsProjectModalOpen(true);
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
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
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId,
    };

    if (editingProjectId) {
      updateProjectMutation.mutate({ id: editingProjectId, data: payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  // Facilitator Form Handlers
  const resetFasilitatorModalForm = () => {
    setEditingFasilitatorId(null);
    setSelectedGuruId('');
    setSelectedKelasIds([]);
    setClassSearchQuery('');
  };

  const handleOpenAddFasilitator = () => {
    resetFasilitatorModalForm();
    setIsFasilitatorModalOpen(true);
  };

  const handleOpenEditFasilitator = (item: P5FasilitatorItem) => {
    setEditingFasilitatorId(item.id);
    setSelectedGuruId(item.guru_id);
    const existingClassIds = item.Kelas?.map((k) => k.kelas_id) || [];
    setSelectedKelasIds(existingClassIds);
    setIsFasilitatorModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
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
    if (!selectedGuruId) {
      toast.error('Pilih guru fasilitator terlebih dahulu');
      return;
    }
    upsertFasilitatorMutation.mutate({
      guru_id: selectedGuruId,
      kelas_ids: selectedKelasIds,
    });
  };

  const projectSelectOptions = useMemo(() => {
    return projekList.map((p) => ({
      value: p.id,
      label: p.judul,
    }));
  }, [projekList]);

  return (
    <div className="space-y-6">
      {/* ── Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Tema Projek & Tim Fasilitator P5
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pusat perencanaan tema projek Kurikulum Merdeka serta pemetaan guru pendamping dan rombel kelas binaannya dalam satu pintu.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={handleOpenCreateProject}
              className="rounded-xl font-bold shrink-0 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
            >
              <FilePlus className="w-4 h-4 mr-1.5" />
              Buat Tema Projek
            </Button>

            {activeProjek && (
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenAddFasilitator}
                className="rounded-xl font-bold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Tambah Fasilitator
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Empty State: Belum Ada Projek Sama Sekali di Semester Ini ── */}
      {!isLoadingProjek && projekList.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-3xl space-y-4">
          <BookOpen className="w-14 h-14 text-indigo-400 dark:text-indigo-600 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
              Belum Ada Tema Projek P5 di Semester Ini
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Silakan buat tema projek terlebih dahulu untuk memulai penetapan tema (Kewirausahaan, Kebekerjaan, dll) sebelum memetakan guru fasilitator.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleOpenCreateProject}
              className="font-bold rounded-xl shadow-md mx-auto"
            >
              <FilePlus className="w-4 h-4 mr-1.5" />
              Buat Tema Projek P5 Sekarang
            </Button>
          )}
        </Card>
      ) : (
        /* ── Project Selector & Meta Card ── */
        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pilih Tema Projek P5 Aktif
                </label>
                <span className="text-[10px] font-bold text-indigo-600">
                  {projekList.length} Projek Terdaftar
                </span>
              </div>
              <SearchableSelect
                id="select-p5-project"
                value={selectedProjekId}
                onValueChange={setSelectedProjekId}
                options={projectSelectOptions}
                placeholder="-- Pilih Projek P5 --"
                isLoading={isLoadingProjek}
              />
            </div>

            {activeProjek && (
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-indigo-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-lg border-none">
                        {activeProjekMeta.tema}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {activeProjekMeta.fase}
                      </Badge>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditProject(activeProjek)}
                          className="p-1 h-7 text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 rounded-lg"
                        >
                          <Edit3 size={12} /> Edit Tema
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Hapus tema projek "${activeProjek.judul}" beserta seluruh data fasilitatornya?`)) {
                              deleteProjectMutation.mutate(activeProjek.id);
                            }
                          }}
                          className="p-1 h-7 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Hapus
                        </Button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {activeProjek.judul}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {activeProjekMeta.cleanDesc || 'Tidak ada catatan deskripsi projek.'}
                  </p>

                  {activeProjekMeta.dimensiList && activeProjekMeta.dimensiList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Dimensi Fokus:
                      </span>
                      {activeProjekMeta.dimensiList.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800"
                        >
                          🎯 {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Facilitator Section (for selected project) ── */}
      {selectedProjekId && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Tim Guru Fasilitator Pada Projek Ini ({fasilitatorList.length} Guru)
            </h3>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddFasilitator}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Tambah Guru Fasilitator
              </button>
            )}
          </div>

          {isLoadingFasilitator ? (
            <div className="py-16 text-center text-xs text-slate-400 italic">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Memuat tim fasilitator projek...
            </div>
          ) : fasilitatorList.length === 0 ? (
            <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-3">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Fasilitator Terdaftar</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Belum ada guru yang ditugaskan untuk tema projek ini. Silakan klik tombol <span className="font-bold text-indigo-600">Tambah Fasilitator</span> untuk memetakan guru beserta kelas binaannya.
                </p>
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddFasilitator}
                  className="rounded-xl font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tugaskan Guru Sekarang
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fasilitatorList.map((item) => {
                const coveredClasses = item.Kelas?.map((k) => k.Kelas) || [];

                return (
                  <Card
                    key={item.id}
                    className="p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs space-y-3 relative flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100 dark:border-indigo-900">
                            {item.Guru?.nama_guru?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">
                              {item.Guru?.nama_guru || 'Nama Guru'}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              NIP: {item.Guru?.nip || '-'}
                            </span>
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditFasilitator(item)}
                              className="p-1.5 h-auto text-slate-500 hover:text-indigo-600 rounded-lg"
                              title="Edit Kelas Binaan"
                            >
                              <Edit3 size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Hapus ${item.Guru?.nama_guru} dari tim fasilitator projek ini?`)) {
                                  deleteFasilitatorMutation.mutate(item.guru_id);
                                }
                              }}
                              className="p-1.5 h-auto text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                              title="Hapus Fasilitator"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Covered Classes Chips */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Kelas yang Dikover ({coveredClasses.length} Rombel):
                        </span>
                        {coveredClasses.length === 0 ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                            Belum ada kelas yang dipetakan
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                            {coveredClasses.map((cls) => (
                              <span
                                key={cls.id}
                                className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
                              >
                                {cls.nama_kelas}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 mt-2">
                      <span>Status: Terdaftar Resmi</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={10} /> Aktif
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Create / Edit Tema Projek P5 ── */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProjectId ? 'Edit Tema Projek P5' : 'Buat Tema Projek P5 Baru'}
      >
        <form onSubmit={handleSubmitProject} className="space-y-4 text-xs">
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
                  const recommended = P5_THEME_RECOMMENDED_DIMENSI[val] || ['Mandiri', 'Gotong Royong', 'Kreatif'];
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
              placeholder="Tuliskan tujuan umum dan keluaran hasil projek..."
            />
          </div>

          {/* ── Target Dimensi Profil Pelajar Pancasila Checklist ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                  Target Dimensi Profil Pancasila * ({projectForm.dimensiList.length} Dipilih)
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Sparkles size={11} /> Otomatis rekomendasi Kemendikbudristek untuk "{projectForm.tema}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const rec = P5_THEME_RECOMMENDED_DIMENSI[projectForm.tema] || ['Mandiri', 'Gotong Royong', 'Kreatif'];
                  setProjectForm((prev) => ({ ...prev, dimensiList: rec }));
                  toast.success(`Rekomendasi dimensi tema "${projectForm.tema}" telah diterapkan`);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Reset Rekomendasi Tema
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs block">{dim.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{dim.desc}</span>
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
              {(createProjectMutation.isPending || updateProjectMutation.isPending) ? (
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
        title={editingFasilitatorId ? 'Edit Kelas Fasilitator P5' : 'Tugaskan Guru Fasilitator P5'}
      >
        <form onSubmit={handleSubmitFasilitator} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Guru Pendidik *
            </label>
            <SearchableSelect
              id="modal-select-guru"
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruOptions}
              placeholder="-- Pilih Guru --"
              isLoading={isLoadingGurus}
              disabled={!!editingFasilitatorId}
            />
            {editingFasilitatorId && (
              <span className="text-[10px] text-slate-400">
                Nama guru tidak dapat diubah saat mode edit rombel.
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Kelas yang Dikover ({selectedKelasIds.length} Terpilih)
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kelas (misal: X TKJ 1)..."
                value={classSearchQuery}
                onChange={(e) => setClassSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Checklist Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 max-h-52 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-950/30">
              {isLoadingClasses ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">Memuat kelas...</div>
              ) : filteredKelasList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">Tidak ada kelas yang cocok.</div>
              ) : (
                filteredKelasList.map((cls: any) => {
                  const isChecked = selectedKelasIds.includes(cls.id);
                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleToggleClass(cls.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer select-none transition-all",
                        isChecked
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-md flex items-center justify-center border transition-all",
                            isChecked
                              ? "bg-white text-indigo-600 border-white"
                              : "border-slate-300 dark:border-slate-600 bg-transparent"
                          )}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span>{cls.nama_kelas || cls.nama}</span>
                      </div>
                      <span className={cn("text-[10px]", isChecked ? "text-indigo-100" : "text-slate-400")}>
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
              {upsertFasilitatorMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Simpan Penugasan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
