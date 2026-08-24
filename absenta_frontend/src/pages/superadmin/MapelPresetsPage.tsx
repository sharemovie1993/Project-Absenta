import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  GraduationCap,
  Filter,
  LayoutGrid,
  List,
  Layers,
  Loader2
} from 'lucide-react';
import {
  getGlobalPresets,
  createGlobalPreset,
  updateGlobalPreset,
  deleteGlobalPreset,
  type GlobalMapelPreset
} from '../../api/academic/mapel.api';
import { Button, Input, Badge, SectionCard, SearchableSelect, Card } from '../../components/ui';
import toast from 'react-hot-toast';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import useConfirm from '../../hooks/useConfirm';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Lazy load modal (Pilar 13)
const MapelPresetModal = lazy(() => import('./components/MapelPresetModal'));

// Zod Schema Validation Guard (Pilar 25)
const mapelPresetSchema = z.object({
  jenjang: z.string().min(1, 'Jenjang wajib dipilih'),
  category: z.string().min(2, 'Kelompok kategori wajib diisi'),
  nama_mapel: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter'),
  kode_mapel: z.string().min(1, 'Kode mapel wajib diisi'),
});

const JENJANG_OPTIONS = ['SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK'];

const getCategoryBadge = (category: string) => {
  const c = category.toUpperCase();
  let cls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  
  if (c.includes('UMUM')) {
    cls = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  } else if (c.includes('KEJURUAN') || c.includes('PRODUCTIVE') || c.includes('RPL') || c.includes('TKJ') || c.includes('AKL')) {
    cls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (c.includes('MULOK') || c.includes('LOKAL')) {
    cls = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  } else if (c.includes('PILIHAN') || c.includes('PEMINATAN')) {
    cls = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${cls}`}>
      {category}
    </span>
  );
};

const getJenjangBadge = (jenjang: string) => {
  const j = jenjang.toUpperCase();
  let cls = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  if (j === 'SMK' || j === 'MAK') {
    cls = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else if (j === 'SMA' || j === 'MA') {
    cls = 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800';
  } else if (j === 'SMP' || j === 'MTS') {
    cls = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${cls}`}>
      {jenjang}
    </span>
  );
};

const EMPTY_FORM = { jenjang: '', category: '', nama_mapel: '', kode_mapel: '' };

export const MapelPresetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<GlobalMapelPreset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // React Query Fetch Presets (Pilar 31)
  const { data: presets = [], isLoading: loading, refetch } = useQuery<GlobalMapelPreset[]>({
    queryKey: ['superadmin-mapel-presets'],
    queryFn: async () => {
      const res = await getGlobalPresets();
      return (res.data || []) as GlobalMapelPreset[];
    }
  });

  const handleOpenCreate = useCallback(() => {
    setEditingPreset(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((preset: GlobalMapelPreset) => {
    setEditingPreset(preset);
    setForm({ jenjang: preset.jenjang, category: preset.category, nama_mapel: preset.nama_mapel, kode_mapel: preset.kode_mapel });
    setModalOpen(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const parsed = mapelPresetSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Data form belum valid');
      }
      if (editingPreset) {
        return updateGlobalPreset(editingPreset.id, payload);
      }
      return createGlobalPreset(payload);
    },
    onSuccess: () => {
      toast.success(editingPreset ? 'Preset berhasil diperbarui.' : 'Preset berhasil ditambahkan.');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-mapel-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan preset';
      toast.error(msg);
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteGlobalPreset(id),
    onSuccess: () => {
      toast.success('Preset berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-mapel-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus preset';
      toast.error(msg);
    }
  });

  const handleSave = useCallback(async () => {
    saveMutation.mutate(form);
  }, [form, saveMutation]);

  const handleDelete = useCallback(async (preset: GlobalMapelPreset) => {
    const ok = await confirm({
      title: 'Hapus Preset Mapel',
      description: `Hapus preset "${preset.nama_mapel}" (${preset.jenjang})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (ok) {
      removeMutation.mutate(preset.id);
    }
  }, [confirm, removeMutation]);

  const categories = useMemo(() => {
    return [...new Set((presets ?? [])?.map(p => p.category))].filter(Boolean);
  }, [presets]);

  const filteredPresets = useMemo(() => {
    return (presets ?? []).filter(p => {
      const matchSearch =
        p.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchJenjang = !filterJenjang || p.jenjang === filterJenjang;
      const matchCat = !filterCategory || p.category === filterCategory;
      return matchSearch && matchJenjang && matchCat;
    });
  }, [presets, searchTerm, filterJenjang, filterCategory]);

  const grouped = useMemo(() => {
    const res: Record<string, Record<string, GlobalMapelPreset[]>> = {};
    (filteredPresets ?? []).forEach(p => {
      if (!res[p.jenjang]) res[p.jenjang] = {};
      if (!res[p.jenjang][p.category]) res[p.jenjang][p.category] = [];
      res[p.jenjang][p.category].push(p);
    });
    return res;
  }, [filteredPresets]);

  const totalJenjang = useMemo(() => {
    return [...new Set((presets ?? [])?.map(p => p.jenjang))].length;
  }, [presets]);

  const headerStats = useMemo(() => [
    {
      title: "Total Preset Mapel",
      value: presets.length,
      icon: <BookOpen size={16} className="text-white" />,
      gradient: "from-indigo-600 to-indigo-800",
      subtitle: "Nomenklatur mapel terdaftar"
    },
    {
      title: "Kategori Kelompok",
      value: categories.length,
      icon: <Layers size={16} className="text-white" />,
      gradient: "from-emerald-600 to-emerald-800",
      subtitle: "Grup mapel kurikulum"
    },
    {
      title: "Jenjang Didukung",
      value: totalJenjang,
      icon: <GraduationCap size={16} className="text-white" />,
      gradient: "from-purple-600 to-purple-800",
      subtitle: "Tingkat pendidikan resmi"
    }
  ], [presets, categories, totalJenjang]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Preset Mata Pelajaran Global' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Master Preset Mata Pelajaran',
    description: 'Kelola basis data nomenklatur baku mata pelajaran lintas jenjang pendidikan di platform Absenta.',
    items: [
      { text: 'Preset ini disinkronisasikan otomatis ke fitur pembuatan mapel baru di setiap tenant sekolah.' },
      { text: 'Setiap mata pelajaran terikat pada jenjang dan kelompok kurikulum (Umum, Kejuruan, Mulok, Pilihan).' },
      { text: 'Gunakan mode tampilan tabel atau kartu untuk meninjau distribusi mapel.' }
    ]
  }), []);

  const jenjangSelectOptions = useMemo(() => [
    { value: '', label: 'Semua Jenjang' },
    ...(JENJANG_OPTIONS ?? [])?.map(j => ({ value: j, label: j }))
  ], []);

  const modalJenjangOptions = useMemo(() => [
    ...(JENJANG_OPTIONS ?? [])?.map(j => ({ value: j, label: j }))
  ], []);

  const categorySelectOptions = useMemo(() => [
    { value: '', label: 'Semua Kategori' },
    ...(categories ?? [])?.map(c => ({ value: c, label: c }))
  ], [categories]);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="mapel_presets_page"
        title="Preset Master Mata Pelajaran"
        description="Kelola standar nomenklatur mata pelajaran nasional untuk seluruh tenant sekolah di platform."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Toolbar Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="relative flex-1 max-w-md w-full min-w-0">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="search-mapel-preset"
                  aria-label="Cari nama, kode, atau kelompok mapel"
                  placeholder="Cari nama, kode, atau kelompok..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="w-36">
                  <SearchableSelect
                    id="filter-jenjang-mapel"
                    aria-label="Filter Jenjang"
                    value={filterJenjang}
                    onValueChange={setFilterJenjang}
                    options={jenjangSelectOptions}
                    placeholder="Semua Jenjang"
                  />
                </div>

                <div className="w-40">
                  <SearchableSelect
                    id="filter-category-mapel"
                    aria-label="Filter Kategori"
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                    options={categorySelectOptions}
                    placeholder="Semua Kategori"
                  />
                </div>

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

                {/* View Mode Toggle */}
                <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title="Tampilan Grid"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'table' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <List size={15} />
                  </button>
                </div>

                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={handleOpenCreate}
                  className="rounded-xl font-bold"
                >
                  <Plus size={14} className="mr-1.5" />
                  Tambah Preset
                </Button>
              </div>
            </div>

            {/* Content List */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat preset mata pelajaran...
              </div>
            ) : filteredPresets.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <BookOpen size={40} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Preset Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchTerm ? 'Tidak ada hasil yang cocok dengan kriteria pencarian.' : 'Belum ada preset mata pelajaran global terdaftar.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {Object.entries(grouped)?.map(([jenjang, categoriesGroup]) => (
                  <div key={jenjang} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden w-full min-w-0 max-w-full">
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <GraduationCap size={16} className="text-slate-600 dark:text-slate-300" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Jenjang {jenjang}</span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {Object.values(categoriesGroup).flat().length} mapel
                      </Badge>
                    </div>

                    {viewMode === 'table' ? (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              <th className="px-5 py-3.5 w-28">Jenjang</th>
                              <th className="px-3 py-3.5 w-32">Kode</th>
                              <th className="px-3 py-3.5">Nama Mata Pelajaran</th>
                              <th className="px-3 py-3.5 w-44">Kelompok / Kategori</th>
                              <th className="px-5 py-3.5 w-24 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.values(categoriesGroup)
                              .flat()
                              .sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel))
                              ?.map(preset => (
                                <tr key={preset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-all group">
                                  <td className="px-5 py-3.5">
                                    {getJenjangBadge(preset.jenjang)}
                                  </td>
                                  <td className="px-3 py-3.5">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold text-[9px] border border-slate-200 dark:border-slate-700">
                                      {preset.kode_mapel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                    {preset.nama_mapel}
                                  </td>
                                  <td className="px-3 py-3.5">
                                    {getCategoryBadge(preset.category)}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(preset)}
                                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(preset)}
                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-5 space-y-6">
                        {Object.entries(categoriesGroup)?.map(([cat, items]) => (
                          <div key={cat} className="pt-4 first:pt-0">
                            <div className="flex items-center gap-2 mb-3">
                              {getCategoryBadge(cat)}
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                ({items.length} mapel)
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(items ?? [])?.map(preset => (
                                <div
                                  key={preset.id}
                                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group"
                                >
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{preset.nama_mapel}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                      <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">{preset.kode_mapel}</span>
                                      <span>•</span>
                                      {getJenjangBadge(preset.jenjang)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(preset)}
                                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(preset)}
                                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                      title="Hapus"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Lazy Loaded Modal */}
        {modalOpen && (
          <Suspense fallback={null}>
            <MapelPresetModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              isEditing={Boolean(editingPreset)}
              form={form}
              setForm={setForm}
              jenjangOptions={modalJenjangOptions}
              onSave={handleSave}
              isPending={saveMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default MapelPresetsPage;
