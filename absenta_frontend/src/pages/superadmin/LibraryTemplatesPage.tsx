import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  BookOpen,
  Sparkles,
  FileText,
  Layers,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  Filter,
  Loader2
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, Button, Badge, SearchableSelect } from '../../components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';

// Lazy load modal (Pilar 13)
const LibraryTemplateModal = lazy(() => import('./components/LibraryTemplateModal'));

// Zod Schema Validation Guard (Pilar 25)
const templateFormSchema = z.object({
  jenjang: z.string().min(1, 'Jenjang wajib dipilih'),
  nama_mapel: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter'),
  judul: z.string().min(3, 'Judul template minimal 3 karakter'),
  jenis: z.string().min(1, 'Jenis dokumen wajib dipilih'),
  tingkat: z.number(),
  fase: z.string(),
  topik: z.string().min(2, 'Topik wajib diisi'),
});

interface LibraryTemplate {
  id: string;
  jenjang: string;
  nama_mapel: string;
  kode_mapel?: string;
  tingkat?: number;
  fase?: string;
  jenis: string;
  judul: string;
  topik?: string;
  file_url: string;
  downloads_count: number;
  created_at: string;
}

const JENIS_OPTIONS = [
  { label: 'Semua Jenis', value: '' },
  { label: 'Modul Ajar', value: 'MODUL_AJAR' },
  { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
  { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
  { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
  { label: 'Program Semester (PROMES)', value: 'PROMES' },
  { label: 'KKTP', value: 'KKTP' },
];

const JENJANG_OPTIONS = [
  { label: 'Semua Jenjang', value: '' },
  { label: 'PAUD / TK', value: 'PAUD' },
  { label: 'SD / MI', value: 'SD' },
  { label: 'SMP / MTs', value: 'SMP' },
  { label: 'SMA / MA', value: 'SMA' },
  { label: 'SMK / MAK', value: 'SMK' },
  { label: 'SLB', value: 'SLB' },
  { label: 'Umum / All', value: 'ALL' },
];

import { JENJANG_TINGKAT_MAP } from './constants/kurikulumConstants';
export { JENJANG_TINGKAT_MAP };

export const LibraryTemplatesPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryTemplate | null>(null);
  const [formState, setFormState] = useState({
    jenjang: 'SMK',
    nama_mapel: '',
    kode_mapel: '',
    tingkat: 10,
    fase: 'E',
    jenis: 'MODUL_AJAR',
    judul: '',
    topik: '',
  });

  // Query Templates
  const { data: templates = [], isLoading, refetch } = useQuery<LibraryTemplate[]>({
    queryKey: ['admin-library-templates', selectedJenjang, selectedJenis, searchQuery],
    queryFn: async () => {
      const res = await kurikulumApi.getLibraryTemplates({
        jenjang: selectedJenjang || undefined,
        jenis: selectedJenis || undefined,
        search: searchQuery || undefined
      });
      return (res.data || []) as LibraryTemplate[];
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: kurikulumApi.createLibraryTemplate,
    onSuccess: () => {
      toast.success('Template berhasil ditambahkan ke Perpusnas!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan template';
      toast.error(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LibraryTemplate> }) =>
      kurikulumApi.updateLibraryTemplate(id, data),
    onSuccess: () => {
      toast.success('Template berhasil diperbarui!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui template';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: kurikulumApi.deleteLibraryTemplate,
    onSuccess: () => {
      toast.success('Template berhasil dihapus dari perpusnas');
      queryClient.invalidateQueries({ queryKey: ['admin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus template';
      toast.error(msg);
    }
  });

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormState({
      jenjang: 'SMK',
      nama_mapel: '',
      kode_mapel: '',
      tingkat: 10,
      fase: 'E',
      jenis: 'MODUL_AJAR',
      judul: '',
      topik: '',
    });
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: LibraryTemplate) => {
    setEditingItem(item);
    setFormState({
      jenjang: item.jenjang || 'SMK',
      nama_mapel: item.nama_mapel || '',
      kode_mapel: item.kode_mapel || '',
      tingkat: item.tingkat || 10,
      fase: item.fase || 'E',
      jenis: item.jenis || 'MODUL_AJAR',
      judul: item.judul || '',
      topik: item.topik || '',
    });
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (item: LibraryTemplate) => {
    const ok = await confirm({
      title: 'Hapus Template Master',
      description: `Apakah Anda yakin ingin menghapus template "${item.judul}" dari repositori nasional?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(item.id);
    }
  }, [confirm, deleteMutation]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = templateFormSchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data form belum valid');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formState });
    } else {
      createMutation.mutate(formState);
    }
  }, [formState, editingItem, createMutation, updateMutation]);

  // Analytics Stats
  const totalDownloads = useMemo(() => {
    return (templates ?? []).reduce((acc, curr) => acc + (curr.downloads_count || 0), 0);
  }, [templates]);

  const totalModul = useMemo(() => {
    return (templates ?? []).filter(t => t.jenis === 'MODUL_AJAR').length;
  }, [templates]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Kurikulum' },
    { label: 'Perpustakaan Template Modul Nasional' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Perpustakaan Template Nasional',
    description: 'Pusat repositori master RPP, Modul Ajar, ATP, PROTA, dan PROMES Kurikulum Merdeka untuk guru di seluruh Indonesia.',
    items: [
      { text: 'Template yang ditambahkan di halaman ini akan otomatis muncul di modul perangkat ajar setiap guru.' },
      { text: 'Guru dapat mengunduh atau menyalin template secara instan untuk disesuaikan dengan kondisi sekolah.' },
      { text: 'Pastikan jenjang, fase, dan tingkat kelas terisi dengan akurat sesuai standar Permendikbudristek.' }
    ]
  }), []);

  const modalJenjangOptions = useMemo(() => [
    { value: 'PAUD', label: 'PAUD / TK' },
    { value: 'SD', label: 'SD / MI' },
    { value: 'SMP', label: 'SMP / MTs' },
    { value: 'SMA', label: 'SMA / MA' },
    { value: 'SMK', label: 'SMK / MAK' },
    { value: 'SLB', label: 'SLB' },
    { value: 'ALL', label: 'Umum / All' },
  ], []);

  const modalJenisOptions = useMemo(() => [
    { value: 'MODUL_AJAR', label: 'Modul Ajar' },
    { value: 'ATP', label: 'ATP (Alur Tujuan Pembelajaran)' },
    { value: 'MODUL_PROJEK', label: 'Modul Projek (P5)' },
    { value: 'PROTA', label: 'Program Tahunan (PROTA)' },
    { value: 'PROMES', label: 'Program Semester (PROMES)' },
    { value: 'KKTP', label: 'KKTP' },
  ], []);

  const tingkatOptions = useMemo(() => {
    const list = JENJANG_TINGKAT_MAP[formState.jenjang] || JENJANG_TINGKAT_MAP['SMK'];
    return (list ?? [])?.map(opt => ({ value: String(opt.tingkat), label: opt.label }));
  }, [formState.jenjang]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Repositori Template Perangkat Ajar Nasional"
        description="Kelola master bank modul ajar, ATP, PROTA, PROMES, dan perangkat kurikulum resmi siap unduh."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="library_templates_page"
        instruction={instruction}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 pb-12 w-full min-w-0 max-w-full">
            {/* Top Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full min-w-0 max-w-full">
              <AnalyticsCard
                title="Total Template Tersedia"
                value={templates.length}
                icon={<BookOpen className="w-5 h-5 text-white" />}
                gradient="from-violet-600 to-indigo-700 text-white"
                subtitle="Master dokumen di perpusnas"
              />
              <AnalyticsCard
                title="Total Modul Ajar"
                value={totalModul}
                icon={<FileText className="w-5 h-5 text-white" />}
                gradient="from-blue-600 to-cyan-700 text-white"
                subtitle="Perangkat berbasis aktivitas"
              />
              <AnalyticsCard
                title="Total Unduhan Guru"
                value={totalDownloads}
                icon={<Download className="w-5 h-5 text-white" />}
                gradient="from-emerald-600 to-teal-700 text-white"
                subtitle="Dimanfaatkan oleh guru sekolah"
              />
            </div>

            {/* Filter and Action Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full min-w-0 max-w-full">
              <div className="flex-1 relative max-w-md w-full min-w-0">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="search-library-template"
                  aria-label="Cari mata pelajaran, topik, atau judul template"
                  placeholder="Cari mata pelajaran, topik, atau judul..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <div className="w-40">
                  <SearchableSelect
                    id="filter-jenjang-library"
                    aria-label="Filter Jenjang Sekolah"
                    value={selectedJenjang}
                    onValueChange={setSelectedJenjang}
                    options={JENJANG_OPTIONS}
                    placeholder="Semua Jenjang"
                  />
                </div>

                <div className="w-44">
                  <SearchableSelect
                    id="filter-jenis-library"
                    aria-label="Filter Jenis Perangkat"
                    value={selectedJenis}
                    onValueChange={setSelectedJenis}
                    options={JENIS_OPTIONS}
                    placeholder="Semua Jenis"
                  />
                </div>

                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="rounded-xl"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                </Button>

                <Button
                  type="button"
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={handleOpenCreate}
                  className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus size={14} className="mr-1.5" />
                  Tambah Template
                </Button>
              </div>
            </div>

            {/* List Templates Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-violet-600" /> Memuat katalog perpusnas...
              </div>
            ) : templates.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                <Library size={48} className="text-slate-300 dark:text-slate-700" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Template Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchQuery ? 'Tidak ada hasil yang sesuai dengan kriteria filter.' : 'Belum ada master template perangkat ajar terdaftar.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full min-w-0 max-w-full">
                {(templates ?? [])?.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 flex flex-col justify-between group w-full min-w-0 max-w-full"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-none font-bold text-[10px]">
                          {item.jenis.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Jenjang {item.jenjang} • Fase {item.fase || 'E'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors line-clamp-2">
                          {item.judul}
                        </h4>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-1">
                          Mapel: {item.nama_mapel}
                        </span>
                      </div>

                      {item.topik && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          Topik: {item.topik}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Download size={13} className="text-emerald-500" />
                        <span>{item.downloads_count || 0} Unduhan</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600 rounded-lg"
                        >
                          <Edit size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Lazy Loaded Modal */}
        {isModalOpen && (
          <Suspense fallback={null}>
            <LibraryTemplateModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              isEditing={Boolean(editingItem)}
              formState={formState}
              setFormState={setFormState}
              jenjangOptions={modalJenjangOptions}
              jenisOptions={modalJenisOptions}
              tingkatOptions={tingkatOptions}
              onSubmit={handleSubmit}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default LibraryTemplatesPage;
