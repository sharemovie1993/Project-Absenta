import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  BookOpen,
  Filter,
  GraduationCap,
  Layers,
  Loader2
} from 'lucide-react';
import { kurikulumApi } from '../../api/kurikulum.api';
import { Button, Input, Badge, SectionCard, SearchableSelect, Card } from '../../components/ui';
import toast from 'react-hot-toast';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import useConfirm from '../../hooks/useConfirm';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { JENJANG_TINGKAT_MAP } from './constants/kurikulumConstants';

// Lazy load modal (Pilar 13)
const TopikPresetModal = lazy(() => import('./components/TopikPresetModal'));

// Zod Schema Validation Guard (Pilar 25)
const topikPresetFormSchema = z.object({
  jenjang: z.string().min(1, 'Jenjang wajib dipilih'),
  nama_mapel: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter'),
  kode_mapel: z.string().optional(),
  fase: z.string(),
  tingkat: z.number(),
  judul_topik: z.string().min(2, 'Judul topik minimal 2 karakter'),
  deskripsi: z.string().optional(),
  kategori: z.string(),
});

interface GlobalTopikPresetItem {
  id: string;
  jenjang: string;
  nama_mapel: string;
  kode_mapel?: string;
  fase?: string;
  tingkat?: number;
  judul_topik: string;
  deskripsi?: string;
  kategori: string;
}

const JENJANG_OPTIONS = ['SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK', 'ALL'];

const EMPTY_FORM = {
  jenjang: 'SMK',
  nama_mapel: '',
  kode_mapel: '',
  fase: 'E',
  tingkat: 10,
  judul_topik: '',
  deskripsi: '',
  kategori: 'UMUM',
};

export const TopikPresetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const topikPresetsQuery = useQuery<GlobalTopikPresetItem[]>({
    queryKey: ['superadmin-topik-presets', filterJenjang],
    queryFn: async () => {
      const res = await kurikulumApi.getTopikPresets({
        jenjang: filterJenjang || undefined,
      });
      return (res.data || []) as GlobalTopikPresetItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const presets = topikPresetsQuery.data || [];
  const loading = topikPresetsQuery.isLoading;

  const fetchPresets = useCallback(async () => {
    await topikPresetsQuery.refetch();
  }, [topikPresetsQuery]);

  const handleOpenCreate = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: GlobalTopikPresetItem) => {
    setEditingId(item.id);
    setFormData({
      jenjang: item.jenjang || 'SMK',
      nama_mapel: item.nama_mapel || '',
      kode_mapel: item.kode_mapel || '',
      fase: item.fase || 'E',
      tingkat: item.tingkat || 10,
      judul_topik: item.judul_topik || '',
      deskripsi: item.deskripsi || '',
      kategori: item.kategori || 'UMUM',
    });
    setIsModalOpen(true);
  }, []);

  const saveTopikPresetMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      const parsed = topikPresetFormSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Data form belum valid');
      }
      const payload = { ...data, tingkat: Number(data.tingkat) };
      return editingId
        ? kurikulumApi.updateTopikPreset(editingId, payload)
        : kurikulumApi.createTopikPreset(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Preset topik berhasil diperbarui' : 'Preset topik baru berhasil ditambahkan');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-topik-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan preset topik';
      toast.error(msg);
    }
  });

  const removeTopikPresetMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteTopikPreset(id),
    onSuccess: () => {
      toast.success('Preset topik berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['superadmin-topik-presets'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus preset topik';
      toast.error(msg);
    }
  });

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    saveTopikPresetMutation.mutate(formData);
  }, [formData, saveTopikPresetMutation]);

  const handleDelete = useCallback(async (id: string, judul: string) => {
    const isOk = await confirm({
      title: 'Hapus Preset Topik AI',
      description: `Hapus topik "${judul}" dari daftar master saran AI?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isOk) {
      removeTopikPresetMutation.mutate(id);
    }
  }, [confirm, removeTopikPresetMutation]);

  const filteredPresets = useMemo(() => {
    return (presets ?? []).filter(p => {
      const matchSearch =
        p.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.judul_topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.kode_mapel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.kategori || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchJenjang = !filterJenjang || p.jenjang === filterJenjang;
      return matchSearch && matchJenjang;
    });
  }, [presets, searchTerm, filterJenjang]);

  const groupedByMapel = useMemo(() => {
    const groups: Record<string, GlobalTopikPresetItem[]> = {};
    (filteredPresets ?? []).forEach(p => {
      const key = `${p.jenjang} - ${p.nama_mapel}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredPresets]);

  const totalMapelUnik = useMemo(() => {
    return new Set((presets ?? []).map(p => `${p.jenjang}-${p.nama_mapel}`)).size;
  }, [presets]);

  const totalKejuruan = useMemo(() => {
    return (presets ?? []).filter(p => p.kategori === 'KEJURUAN').length;
  }, [presets]);

  const headerStats = useMemo(() => [
    {
      title: 'Total Preset Topik',
      value: presets.length,
      icon: <Sparkles size={16} className="text-white" />,
      gradient: 'from-violet-600 to-indigo-800',
      subtitle: 'Saran prompt AI studio'
    },
    {
      title: 'Mata Pelajaran Tercover',
      value: totalMapelUnik,
      icon: <BookOpen size={16} className="text-white" />,
      gradient: 'from-blue-600 to-cyan-800',
      subtitle: 'Mapel lintas jenjang'
    },
    {
      title: 'Topik Kejuruan (SMK)',
      value: totalKejuruan,
      icon: <Layers size={16} className="text-white" />,
      gradient: 'from-emerald-600 to-teal-800',
      subtitle: 'Konsentrasi keahlian'
    },
  ], [presets, totalMapelUnik, totalKejuruan]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Preset Topik Pembelajaran AI' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Master Preset Topik AI',
    description: 'Kelola basis data inspirasi topik dan materi ajar untuk Modul Ajar Studio dan asisten kurikulum AI.',
    items: [
      { text: 'Topik yang terdaftar akan muncul sebagai saran rekomendasi instan ketika guru memilih mata pelajaran di Studio.' },
      { text: 'Setiap topik terikat pada jenjang, fase, dan tingkat kelas Kurikulum Merdeka.' },
      { text: 'Gunakan filter jenjang untuk meninjau ketersediaan topik di setiap tingkat sekolah.' }
    ]
  }), []);

  const jenjangSelectOptions = useMemo(() => [
    { value: '', label: 'Semua Jenjang' },
    ...(JENJANG_OPTIONS ?? [])?.map(j => ({ value: j, label: j }))
  ], []);

  const modalJenjangOptions = useMemo(() => [
    ...(JENJANG_OPTIONS ?? [])?.map(j => ({ value: j, label: j }))
  ], []);

  const kategoriOptions = useMemo(() => [
    { value: 'UMUM', label: 'UMUM (KBM Reguler)' },
    { value: 'KEJURUAN', label: 'KEJURUAN (SMK/MAK)' },
    { value: 'P5', label: 'PROJEK P5' },
  ], []);

  const tingkatOptions = useMemo(() => {
    const options = JENJANG_TINGKAT_MAP[formData.jenjang] || JENJANG_TINGKAT_MAP['SMK'];
    return (options ?? [])?.map(opt => ({ value: String(opt.tingkat), label: opt.label }));
  }, [formData.jenjang]);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="topik_presets_page"
        title="Preset Saran Topik Pembelajaran AI"
        description="Kelola bank materi dan prompt topik otomatis untuk generator Modul Ajar AI Studio di seluruh tenant."
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
                  id="search-topik-preset"
                  aria-label="Cari nama mapel atau judul topik"
                  placeholder="Cari nama mapel atau judul topik..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="w-40">
                  <SearchableSelect
                    id="filter-jenjang-topik"
                    aria-label="Filter Jenjang Sekolah"
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
                  onClick={fetchPresets}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </Button>

                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={handleOpenCreate}
                  className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus size={14} className="mr-1.5" />
                  Tambah Topik AI
                </Button>
              </div>
            </div>

            {/* List Topik Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-violet-600" /> Memuat daftar topik AI...
              </div>
            ) : filteredPresets.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <Sparkles size={40} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Topik Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchTerm ? 'Tidak ada hasil yang sesuai dengan kriteria filter.' : 'Belum ada preset saran topik pembelajaran terdaftar.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {Object.entries(groupedByMapel)?.map(([groupKey, items]) => {
                  const firstItem = items[0];
                  return (
                    <div
                      key={groupKey}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden w-full min-w-0 max-w-full"
                    >
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                {firstItem.nama_mapel}
                              </h3>
                              <Badge className="bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-none font-bold text-[9px]">
                                Jenjang {firstItem.jenjang}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {items.length} saran topik terdaftar
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(items ?? [])?.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group"
                          >
                            <div className="min-w-0 flex-1 pr-4 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {item.judul_topik}
                                </h4>
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] border-none font-mono">
                                  Fase {item.fase || 'E'} • Kelas {item.tingkat || 10}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-bold">
                                  {item.kategori}
                                </Badge>
                              </div>
                              {item.deskripsi && (
                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                  {item.deskripsi}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(item)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 rounded-lg"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id, item.judul_topik)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Lazy Loaded Modal */}
        {isModalOpen && (
          <Suspense fallback={null}>
            <TopikPresetModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              isEditing={Boolean(editingId)}
              formData={formData}
              setFormData={setFormData}
              jenjangOptions={modalJenjangOptions}
              kategoriOptions={kategoriOptions}
              tingkatOptions={tingkatOptions}
              onSave={handleSave}
              isPending={saveTopikPresetMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default TopikPresetsPage;
