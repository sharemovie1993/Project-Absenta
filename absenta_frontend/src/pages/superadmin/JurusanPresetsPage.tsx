import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Activity,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  getGlobalPresets,
  createGlobalProgramPreset,
  updateGlobalProgramPreset,
  deleteGlobalProgramPreset,
  createGlobalJurusanPreset,
  updateGlobalJurusanPreset,
  deleteGlobalJurusanPreset,
  type GlobalProgramPreset,
  type GlobalJurusanPreset
} from '../../api/academic/jurusan-presets.api';
import { Button, Input, Badge, Card, SectionCard } from '../../components/ui';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import toast from 'react-hot-toast';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import useConfirm from '../../hooks/useConfirm';

// Lazy Loaded Modals (Pilar 13)
const JurusanPresetModals = lazy(() => import('./components/JurusanPresetModals'));

// Zod Schema Validation Guards (Pilar 25)
const programSchema = z.object({
  bidang_keahlian: z.string().min(2, 'Bidang keahlian wajib diisi'),
  nama: z.string().min(2, 'Nama program keahlian wajib diisi'),
  kode: z.string().min(1, 'Kode program wajib diisi'),
  singkatan: z.string().min(1, 'Singkatan program wajib diisi'),
});

const jurusanSchema = z.object({
  nama: z.string().min(2, 'Nama konsentrasi keahlian wajib diisi'),
  kode: z.string().min(1, 'Kode jurusan wajib diisi'),
  singkatan: z.string().min(1, 'Singkatan jurusan wajib diisi'),
});

const EMPTY_PROGRAM_FORM = { bidang_keahlian: '', nama: '', kode: '', singkatan: '' };
const EMPTY_JURUSAN_FORM = { program_preset_id: '', nama: '', kode: '', singkatan: '' };

export const JurusanPresetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<GlobalProgramPreset | null>(null);
  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM_FORM);

  const [jurusanModalOpen, setJurusanModalOpen] = useState(false);
  const [editingJurusan, setEditingJurusan] = useState<GlobalJurusanPreset | null>(null);
  const [jurusanForm, setJurusanForm] = useState(EMPTY_JURUSAN_FORM);

  // Accordion state
  const [expandedProgramIds, setExpandedProgramIds] = useState<string[]>([]);

  // Fetch Global Presets via React Query (Pilar 31)
  const { data: presetsRes, isLoading: loading, refetch } = useQuery({
    queryKey: ['superadmin-jurusan-presets'],
    queryFn: async () => {
      const res = await getGlobalPresets();
      return (res.data || []) as GlobalProgramPreset[];
    }
  });

  const presets = useMemo(() => presetsRes || [], [presetsRes]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedProgramIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  // --- PROGRAM ACTIONS ---
  const handleOpenCreateProgram = useCallback(() => {
    setEditingProgram(null);
    setProgramForm(EMPTY_PROGRAM_FORM);
    setProgramModalOpen(true);
  }, []);

  const handleOpenEditProgram = useCallback((prog: GlobalProgramPreset) => {
    setEditingProgram(prog);
    setProgramForm({
      bidang_keahlian: prog.bidang_keahlian,
      nama: prog.nama,
      kode: prog.kode,
      singkatan: prog.singkatan
    });
    setProgramModalOpen(true);
  }, []);

  const programMutation = useMutation({
    mutationFn: async () => {
      const parsed = programSchema.safeParse(programForm);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Semua field program wajib diisi');
      }
      if (editingProgram) {
        return updateGlobalProgramPreset(editingProgram.id, programForm);
      }
      return createGlobalProgramPreset(programForm);
    },
    onSuccess: () => {
      toast.success(editingProgram ? 'Program preset berhasil diperbarui.' : 'Program preset berhasil ditambahkan.');
      setProgramModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-jurusan-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan program preset';
      toast.error(msg);
    }
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id: string) => deleteGlobalProgramPreset(id),
    onSuccess: () => {
      toast.success('Program preset dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-jurusan-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus program preset';
      toast.error(msg);
    }
  });

  const handleDeleteProgram = useCallback(async (prog: GlobalProgramPreset) => {
    const ok = await confirm({
      title: 'Hapus Program Preset',
      description: `Hapus program preset "${prog.nama}"? Semua jurusan di bawahnya juga akan ikut terhapus.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteProgramMutation.mutate(prog.id);
    }
  }, [confirm, deleteProgramMutation]);

  // --- JURUSAN ACTIONS ---
  const handleOpenCreateJurusan = useCallback((programId: string) => {
    setEditingJurusan(null);
    setJurusanForm({
      program_preset_id: programId,
      nama: '',
      kode: '',
      singkatan: ''
    });
    setJurusanModalOpen(true);
  }, []);

  const handleOpenEditJurusan = useCallback((jur: GlobalJurusanPreset) => {
    setEditingJurusan(jur);
    setJurusanForm({
      program_preset_id: jur.program_preset_id,
      nama: jur.nama,
      kode: jur.kode,
      singkatan: jur.singkatan
    });
    setJurusanModalOpen(true);
  }, []);

  const jurusanMutation = useMutation({
    mutationFn: async () => {
      const parsed = jurusanSchema.safeParse(jurusanForm);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Semua field jurusan wajib diisi');
      }
      if (editingJurusan) {
        return updateGlobalJurusanPreset(editingJurusan.id, jurusanForm);
      }
      return createGlobalJurusanPreset(jurusanForm);
    },
    onSuccess: () => {
      toast.success(editingJurusan ? 'Konsentrasi keahlian berhasil diperbarui.' : 'Konsentrasi keahlian berhasil ditambahkan.');
      setJurusanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-jurusan-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan konsentrasi keahlian';
      toast.error(msg);
    }
  });

  const deleteJurusanMutation = useMutation({
    mutationFn: (id: string) => deleteGlobalJurusanPreset(id),
    onSuccess: () => {
      toast.success('Konsentrasi keahlian dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-jurusan-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus konsentrasi keahlian';
      toast.error(msg);
    }
  });

  const handleDeleteJurusan = useCallback(async (jur: GlobalJurusanPreset) => {
    const ok = await confirm({
      title: 'Hapus Konsentrasi Keahlian',
      description: `Hapus konsentrasi keahlian "${jur.nama}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteJurusanMutation.mutate(jur.id);
    }
  }, [confirm, deleteJurusanMutation]);

  // Statistics calculation
  const totalPrograms = presets.length;
  const totalJurusan = useMemo(() => {
    return (presets ?? []).reduce((acc, p) => acc + (p.jurusan_presets?.length || 0), 0);
  }, [presets]);

  const uniqueBidang = useMemo(() => {
    return [...new Set((presets ?? []).map(p => p.bidang_keahlian))].length;
  }, [presets]);

  const filteredPresets = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return presets;

    return (presets ?? []).map(p => {
      const matchProgram =
        p.nama.toLowerCase().includes(term) ||
        p.kode.toLowerCase().includes(term) ||
        p.bidang_keahlian.toLowerCase().includes(term);

      const matchingJurusan = (p.jurusan_presets ?? []).filter(j =>
        j.nama.toLowerCase().includes(term) ||
        j.kode.toLowerCase().includes(term) ||
        j.singkatan.toLowerCase().includes(term)
      );

      if (matchProgram) return p;
      if (matchingJurusan.length > 0) {
        return { ...p, jurusan_presets: matchingJurusan };
      }
      return null;
    }).filter(Boolean) as GlobalProgramPreset[];
  }, [presets, searchTerm]);

  const headerStats = useMemo(() => [
    {
      title: "Bidang Keahlian",
      value: uniqueBidang,
      icon: <Briefcase size={16} className="text-white" />,
      gradient: "from-blue-600 to-indigo-800",
      subtitle: "Kategori kejuruan nasional"
    },
    {
      title: "Program Keahlian",
      value: totalPrograms,
      icon: <Layers size={16} className="text-white" />,
      gradient: "from-indigo-600 to-purple-800",
      subtitle: "Template program terdaftar"
    },
    {
      title: "Konsentrasi Keahlian",
      value: totalJurusan,
      icon: <Bookmark size={16} className="text-white" />,
      gradient: "from-purple-600 to-pink-800",
      subtitle: "Total jurusan standar SMK"
    }
  ], [uniqueBidang, totalPrograms, totalJurusan]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Preset Program & Jurusan SMK' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Master Preset Jurusan SMK',
    description: 'Kelola basis data nomenklatur resmi Spektrum Kurikulum Merdeka (Bidang, Program, dan Konsentrasi Keahlian SMK).',
    items: [
      { text: 'Preset ini disinkronisasikan otomatis ke seluruh sekolah kejuruan (SMK/MAK).' },
      { text: 'Setiap Program Keahlian menaungi satu atau beberapa Konsentrasi Keahlian (Jurusan).' },
      { text: 'Perubahan kode atau nama di master preset akan menjadi rekomendasi saat sekolah menambah jurusan baru.' }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="jurusan_presets_page"
        title="Preset Master Jurusan SMK"
        description="Kelola standar nasional Spektrum Kurikulum Kejuruan (SMK) untuk seluruh tenant sekolah di platform."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Toolbar search & add */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="relative flex-1 max-w-md w-full min-w-0">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="search-jurusan-preset"
                  aria-label="Cari bidang, program, atau konsentrasi keahlian"
                  placeholder="Cari bidang, program, atau konsentrasi..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </Button>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={handleOpenCreateProgram}
                  className="rounded-xl font-bold"
                >
                  <Plus size={14} className="mr-1.5" />
                  Tambah Program Keahlian
                </Button>
              </div>
            </div>

            {/* List Programs & Jurusan */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat daftar preset jurusan...
              </div>
            ) : filteredPresets.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <Briefcase size={48} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Preset Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchTerm ? 'Tidak ada hasil yang sesuai dengan kata kunci.' : 'Belum ada preset program & jurusan terdaftar.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4 w-full min-w-0 max-w-full">
                {(filteredPresets ?? [])?.map(prog => {
                  const isExpanded = expandedProgramIds.includes(prog.id);
                  const jurusanList = prog.jurusan_presets || [];

                  return (
                    <Card
                      key={prog.id}
                      className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all w-full min-w-0 max-w-full"
                    >
                      {/* Program Header */}
                      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800/60">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(prog.id)}
                            className="mt-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors shrink-0"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40">
                                {prog.bidang_keahlian}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                                {prog.kode}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {prog.nama}
                            </h3>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {jurusanList.length} Konsentrasi Keahlian Terdaftar
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <Button
                            type="button"
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => handleOpenCreateJurusan(prog.id)}
                            className="text-xs font-bold rounded-xl text-indigo-600 dark:text-indigo-400"
                          >
                            <Plus size={12} className="mr-1" /> Tambah Konsentrasi
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProgram(prog)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProgram(prog)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>

                      {/* Jurusan List (Expanded) */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-2 border-t border-slate-100 dark:border-slate-800/40">
                          {jurusanList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 text-center">
                              Belum ada konsentrasi keahlian di bawah program ini.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                              {(jurusanList ?? [])?.map(jur => (
                                <div
                                  key={jur.id}
                                  className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-colors"
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {jur.kode}
                                      </span>
                                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                        ({jur.singkatan})
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {jur.nama}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditJurusan(jur)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
                                    >
                                      <Edit2 size={12} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteJurusan(jur)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Lazy Loaded Modals */}
        {(programModalOpen || jurusanModalOpen) && (
          <Suspense fallback={null}>
            <JurusanPresetModals
              programModalOpen={programModalOpen}
              setProgramModalOpen={setProgramModalOpen}
              editingProgram={Boolean(editingProgram)}
              programForm={programForm}
              setProgramForm={setProgramForm}
              onSaveProgram={() => programMutation.mutate()}
              savingProgram={programMutation.isPending}

              jurusanModalOpen={jurusanModalOpen}
              setJurusanModalOpen={setJurusanModalOpen}
              editingJurusan={Boolean(editingJurusan)}
              jurusanForm={jurusanForm}
              setJurusanForm={setJurusanForm}
              onSaveJurusan={() => jurusanMutation.mutate()}
              savingJurusan={jurusanMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default JurusanPresetsPage;
