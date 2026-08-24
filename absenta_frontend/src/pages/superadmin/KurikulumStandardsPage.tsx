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
  Clock,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';
import { kurikulumApi, type GlobalKurikulumStandard } from '../../api/kurikulum.api';
import { Button, Input, Badge, SectionCard, SearchableSelect, Card } from '../../components/ui';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Lazy load modal (Pilar 13)
const KurikulumStandardModal = lazy(() => import('./components/KurikulumStandardModal'));

// Zod Schema Validation Guard (Pilar 25)
const kurikulumStandardSchema = z.object({
  jenjang: z.string().min(1, 'Jenjang wajib dipilih'),
  category: z.string().default('UMUM'),
  nama_mapel: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter'),
  kode_mapel: z.string().min(1, 'Kode mata pelajaran wajib diisi'),
  tingkat: z.number().min(1).max(13),
  jp_per_minggu: z.number().min(1).max(50),
});

const JENJANG_OPTIONS = ['SD', 'SMP', 'SMA', 'SMK'];
const CATEGORY_OPTIONS = ['UMUM', 'KEJURUAN', 'MULOK', 'PILIHAN'];

const getCategoryBadge = (category?: string) => {
  if (!category) return null;
  const classes: Record<string, string> = {
    'UMUM': 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border-blue-100 dark:border-blue-900/40',
    'KEJURUAN': 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300 border-violet-100 dark:border-violet-900/40',
    'MULOK': 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100 dark:border-amber-900/40',
    'PILIHAN': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40',
  };
  const cls = classes[category.toUpperCase()] || 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase ${cls}`}>
      {category}
    </span>
  );
};

const EMPTY_FORM = { jenjang: '', category: 'UMUM', nama_mapel: '', kode_mapel: '', tingkat: 10, jp_per_minggu: 2 };

export const KurikulumStandardsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<GlobalKurikulumStandard | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const standardsQuery = useQuery({
    queryKey: ['superadmin-kurikulum-standards'],
    queryFn: async () => {
      const res = await kurikulumApi.getStandardReferences();
      return (res.data || []) as GlobalKurikulumStandard[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const standards = standardsQuery.data || [];
  const loading = standardsQuery.isLoading;

  const fetchStandards = useCallback(async () => {
    await standardsQuery.refetch();
  }, [standardsQuery]);

  const handleOpenCreate = useCallback(() => {
    setEditingStandard(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((standard: GlobalKurikulumStandard) => {
    setEditingStandard(standard);
    setForm({
      jenjang: standard.jenjang,
      category: standard.category || 'UMUM',
      nama_mapel: standard.nama_mapel,
      kode_mapel: standard.kode_mapel,
      tingkat: standard.tingkat,
      jp_per_minggu: standard.jp_per_minggu,
    });
    setModalOpen(true);
  }, []);

  const saveStandardMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const parsed = kurikulumStandardSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Form belum valid');
      }
      if (editingStandard) {
        return kurikulumApi.updateStandardReference(editingStandard.id, data);
      }
      return kurikulumApi.createStandardReference(data);
    },
    onSuccess: () => {
      toast.success(editingStandard ? 'Acuan standar berhasil diperbarui.' : 'Acuan standar baru berhasil ditambahkan.');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-kurikulum-standards'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan acuan standar';
      toast.error(msg);
    }
  });

  const removeStandardMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteStandardReference(id),
    onSuccess: () => {
      toast.success('Acuan standar berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-kurikulum-standards'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus acuan standar';
      toast.error(msg);
    }
  });

  const handleSave = useCallback(async () => {
    saveStandardMutation.mutate(form);
  }, [form, saveStandardMutation]);

  const handleDelete = useCallback(async (standard: GlobalKurikulumStandard) => {
    const ok = await confirm({
      title: 'Hapus Acuan Standar',
      description: `Hapus acuan standar "${standard.nama_mapel}" (Tingkat ${standard.tingkat} - ${standard.jenjang})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    await removeStandardMutation.mutateAsync(standard.id);
  }, [confirm, removeStandardMutation]);

  const filtered = useMemo(() => {
    return (standards ?? []).filter(s => {
      const matchSearch = s.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.kode_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchJenjang = !filterJenjang || s.jenjang === filterJenjang;
      return matchSearch && matchJenjang;
    });
  }, [standards, searchTerm, filterJenjang]);

  const grouped: Record<string, Record<number, GlobalKurikulumStandard[]>> = useMemo(() => {
    const res: Record<string, Record<number, GlobalKurikulumStandard[]>> = {};
    (filtered ?? []).forEach(s => {
      if (!res[s.jenjang]) res[s.jenjang] = {};
      if (!res[s.jenjang][s.tingkat]) res[s.jenjang][s.tingkat] = [];
      res[s.jenjang][s.tingkat].push(s);
    });
    return res;
  }, [filtered]);

  const totalJenjang = useMemo(() => {
    return [...new Set((standards ?? []).map(s => s.jenjang))].length;
  }, [standards]);

  const totalTingkat = useMemo(() => {
    return [...new Set((standards ?? []).map(s => s.tingkat))].length;
  }, [standards]);

  const headerStats = useMemo(() => [
    {
      title: 'Total Acuan JP',
      value: standards.length,
      icon: <BookOpen size={16} className="text-white" />,
      gradient: 'from-indigo-600 to-indigo-800',
      subtitle: 'Standar beban kurikulum'
    },
    {
      title: 'Jenjang Tercover',
      value: totalJenjang,
      icon: <GraduationCap size={16} className="text-white" />,
      gradient: 'from-purple-600 to-purple-800',
      subtitle: 'Tingkat pendidikan resmi'
    },
    {
      title: 'Tingkat Kelas',
      value: totalTingkat,
      icon: <Filter size={16} className="text-white" />,
      gradient: 'from-emerald-600 to-emerald-800',
      subtitle: 'Kelas 1 hingga 13'
    },
  ], [standards, totalJenjang, totalTingkat]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Standar Beban JP Kurikulum' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Standar Beban JP Kurikulum',
    description: 'Kelola beban Jam Pelajaran (JP) resmi Permendikbudristek Nomor 12 Tahun 2024 sebagai acuan sinkronisasi kurikulum sekolah.',
    items: [
      { text: 'Daftar ini digunakan validator kurikulum saat mendeteksi kekurangan atau kelebihan beban JP mingguan.' },
      { text: 'Setiap acuan mapel memuat jenjang, kelompok mata pelajaran, dan alokasi JP per minggu.' },
      { text: 'Gunakan filter jenjang untuk meninjau struktur beban secara terperinci.' }
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
    ...(CATEGORY_OPTIONS ?? [])?.map(c => ({ value: c, label: c }))
  ], []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="kurikulum_standards_page"
        title="Katalog Standar Beban JP Kurikulum"
        description="Kelola beban Jam Pelajaran (JP) resmi Permendikbudristek Nomor 12 Tahun 2024 untuk validator struktur kurikulum."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="relative flex-1 max-w-md w-full min-w-0">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="search-kurikulum-standard"
                  aria-label="Cari mapel acuan standar"
                  placeholder="Cari mapel acuan..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="w-40">
                  <SearchableSelect
                    id="filter-jenjang-select"
                    aria-label="Filter jenjang sekolah"
                    value={filterJenjang}
                    onValueChange={setFilterJenjang}
                    options={jenjangSelectOptions}
                    placeholder="Semua Jenjang"
                  />
                </div>

                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={fetchStandards}
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
                  Tambah Acuan JP
                </Button>
              </div>
            </div>

            {/* Content List */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat acuan standar kurikulum...
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <Clock size={40} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Acuan Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchTerm ? 'Tidak ada hasil yang cocok dengan kata kunci pencarian.' : 'Belum ada acuan standar beban kurikulum terdaftar.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {Object.entries(grouped)?.map(([jenjang, tingkatGroup]) => (
                  <div key={jenjang} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden w-full min-w-0 max-w-full">
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <GraduationCap size={16} className="text-slate-600 dark:text-slate-300" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Jenjang {jenjang}</span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {Object.values(tingkatGroup).flat().length} acuan
                      </Badge>
                    </div>

                    {viewMode === 'table' ? (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              <th className="px-5 py-3.5 w-24">Kelas</th>
                              <th className="px-3 py-3.5 w-28">Kode</th>
                              <th className="px-3 py-3.5">Nama Mata Pelajaran</th>
                              <th className="px-3 py-3.5 w-40">Kelompok</th>
                              <th className="px-3 py-3.5 w-36 text-indigo-600 dark:text-indigo-400">Alokasi JP</th>
                              <th className="px-5 py-3.5 w-24 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.values(tingkatGroup)
                              .flat()
                              .sort((a, b) => {
                                if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
                                return a.nama_mapel.localeCompare(b.nama_mapel);
                              })
                              ?.map(standard => (
                                <tr key={standard.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-all group">
                                  <td className="px-5 py-3.5">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                      Kelas {standard.tingkat}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold text-[9px] border border-slate-200 dark:border-slate-700">
                                      {standard.kode_mapel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                    {standard.nama_mapel}
                                  </td>
                                  <td className="px-3 py-3.5">
                                    {getCategoryBadge(standard.category)}
                                  </td>
                                  <td className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                                    {standard.jp_per_minggu} JP <span className="text-[10px] text-slate-400 font-normal">/ Minggu</span>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(standard)}
                                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(standard)}
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
                        {Object.entries(tingkatGroup)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          ?.map(([tingkat, items]) => (
                            <div key={tingkat} className="pt-4 first:pt-0">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                                  Kelas {tingkat}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  ({items.length} mapel standar)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(items ?? [])?.map(standard => (
                                  <div
                                    key={standard.id}
                                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group"
                                  >
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{standard.nama_mapel}</p>
                                        {getCategoryBadge(standard.category)}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                        <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">{standard.kode_mapel}</span>
                                        <span>•</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{standard.jp_per_minggu} JP/Minggu</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(standard)}
                                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(standard)}
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
            <KurikulumStandardModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              isEditing={Boolean(editingStandard)}
              form={form}
              setForm={setForm}
              jenjangOptions={modalJenjangOptions}
              categoryOptions={categorySelectOptions}
              onSave={handleSave}
              isPending={saveStandardMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default KurikulumStandardsPage;
