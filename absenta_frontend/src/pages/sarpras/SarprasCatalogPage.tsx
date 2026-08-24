import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Edit2, Trash2, Tag, BookOpen, AlertCircle, Info, Image, 
  Package, ShieldCheck, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, Input, Badge, Card, SectionCard } from '../../components/ui';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { sarprasApi } from '../../api/sarpras.api';
import useConfirm from '@/hooks/useConfirm';

// Lazy Loaded Modal (Pilar 13)
const SarprasCatalogFormModal = lazy(() => import('./components/SarprasCatalogFormModal'));

// Zod Schema Validation Guard (Pilar 25)
const catalogFormSchema = z.object({
  nama: z.string().min(2, 'Nama barang minimal 2 karakter'),
  category_name: z.string().min(1, 'Kategori barang wajib dipilih'),
  brand: z.string().optional(),
  deskripsi: z.string().optional(),
  image_url: z.string().optional(),
  is_loanable: z.boolean().default(true)
});

interface CatalogItem {
  id: string;
  nama: string;
  brand: string | null;
  category_name: string;
  is_loanable: boolean;
  deskripsi: string | null;
  image_url: string | null;
}

const CATEGORY_OPTIONS = [
  'Jurusan: TKJ - Perangkat Jaringan & Server',
  'Jurusan: TKJ - Alat Kerja & Praktik',
  'Umum: Mebel & Furniture',
  'Umum: Olahraga & Seni',
  'Umum: Fasilitas & Kebersihan'
];

export const SarprasCatalogPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Modal states
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item?: CatalogItem;
  }>({
    isOpen: false,
    mode: 'create'
  });

  // Form states
  const [formData, setFormData] = useState({
    nama: '',
    brand: '',
    category_name: CATEGORY_OPTIONS[0],
    custom_category: '',
    is_loanable: true,
    deskripsi: '',
    image_url: ''
  });

  const [useCustomCategory, setUseCustomCategory] = useState(false);

  // Fetch Catalog
  const { data: catalogRes, isLoading } = useQuery({
    queryKey: ['sarpras-catalog-all', search],
    queryFn: () => sarprasApi.getCatalog({ search })
  });

  const catalogItems: CatalogItem[] = useMemo(() => {
    return catalogRes?.data || [];
  }, [catalogRes]);

  // Filter items locally by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') return catalogItems;
    return (catalogItems ?? []).filter(item => item.category_name === selectedCategory);
  }, [catalogItems, selectedCategory]);

  const catalogTabOptions = useMemo(() => [
    { id: 'ALL', label: 'Semua Kategori' },
    ...(CATEGORY_OPTIONS ?? [])?.map(cat => ({
      id: cat,
      label: cat.split(' - ')[1] || cat,
    }))
  ], []);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: sarprasApi.createCatalogItem,
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Item katalog berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
      setFormModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan item';
      toast.error(msg);
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => 
      sarprasApi.updateCatalogItem(id, data),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Item katalog berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
      setFormModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui item';
      toast.error(msg);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sarprasApi.deleteCatalogItem(id),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Item katalog berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus item';
      toast.error(msg);
    }
  });

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setFormData({
      nama: '',
      brand: '',
      category_name: CATEGORY_OPTIONS[0],
      custom_category: '',
      is_loanable: true,
      deskripsi: '',
      image_url: ''
    });
    setUseCustomCategory(false);
    setFormModal({ isOpen: true, mode: 'create' });
  }, []);

  const handleOpenEdit = useCallback((item: CatalogItem) => {
    const isStandard = CATEGORY_OPTIONS.includes(item.category_name);
    setFormData({
      nama: item.nama,
      brand: item.brand || '',
      category_name: isStandard ? item.category_name : 'CUSTOM',
      custom_category: isStandard ? '' : item.category_name,
      is_loanable: item.is_loanable,
      deskripsi: item.deskripsi || '',
      image_url: item.image_url || ''
    });
    setUseCustomCategory(!isStandard);
    setFormModal({ isOpen: true, mode: 'edit', item });
  }, []);

  const handleDeleteItem = useCallback(async (item: CatalogItem) => {
    const ok = await confirm({
      title: 'Hapus Item Katalog',
      description: `Apakah Anda yakin ingin menghapus "${item.nama}"? Data barang yang sudah pernah didaftarkan tidak akan terhapus.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(item.id);
    }
  }, [confirm, deleteMutation]);

  const handleSubmitForm = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = useCustomCategory ? formData.custom_category : formData.category_name;
    const payload = {
      nama: formData.nama,
      brand: formData.brand || undefined,
      category_name: finalCategory,
      is_loanable: formData.is_loanable,
      deskripsi: formData.deskripsi || undefined,
      image_url: formData.image_url || undefined
    };

    const parsed = catalogFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data form katalog belum valid');
      return;
    }

    if (formModal.mode === 'create') {
      createMutation.mutate(payload);
    } else if (formModal.item) {
      updateMutation.mutate({ id: formModal.item.id, data: payload });
    }
  }, [formData, useCustomCategory, formModal, createMutation, updateMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Sarpras', path: '/sarpras/dashboard' },
    { label: 'Katalog Standar Sarpras' }
  ], []);

  const categorySelectOptions = useMemo(() => [
    ...(CATEGORY_OPTIONS ?? [])?.map(c => ({ value: c, label: c })),
    { value: 'CUSTOM', label: '+ Kategori Kustom Baru...' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Katalog Sarpras"
      description="Manajemen katalog master sarana & prasarana terstandarisasi untuk rekomendasi aset dan inventarisasi sekolah."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Katalog Standar Sarana & Prasarana"
          description="Pusat master data katalog aset terstandarisasi untuk mempercepat pendataan dan pengelompokan barang inventaris."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="sarpras_catalog_page"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Plus className="w-4 h-4" />
                Tambah Item Baru
              </Button>
            </div>
          }
          instruction={{
            title: "Panduan Katalog Sarpras",
            description: "Modul ini digunakan untuk mendaftarkan dan memelihara template nama barang, merek, dan spesifikasi standar.",
            items: [
              { text: "Pilih tab kategori untuk menyaring daftar rekomendasi aset sarpras." },
              { text: "Klik [Tambah Item Baru] untuk membuat template barang siap pakai." },
              { text: "Item katalog mempermudah penambahan aset ruangan tanpa mengetik ulang deskripsi." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6 w-full min-w-0 max-w-full">
              {/* Search Bar & TabSwitcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full min-w-0 max-w-full">
                <div className="relative flex-1 max-w-md w-full min-w-0">
                  <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                  <Input
                    id="sarpras-catalog-search-input"
                    aria-label="Cari nama barang atau merek"
                    placeholder="Cari nama barang atau merek..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 rounded-xl text-xs w-full"
                  />
                </div>
              </div>

              {/* Category TabSwitcher */}
              <TabSwitcher
                activeTab={selectedCategory}
                onChange={setSelectedCategory}
                tabs={catalogTabOptions}
              />

              {/* Grid Catalog Items */}
              {isLoading ? (
                <div className="text-center py-20 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memuat katalog sarpras...
                </div>
              ) : filteredItems.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3 rounded-2xl w-full min-w-0 max-w-full">
                  <Package size={48} className="text-slate-300 dark:text-slate-700" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Item Katalog</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {search ? 'Tidak ditemukan item yang cocok dengan kata kunci pencarian.' : 'Belum ada item terdaftar pada kategori ini.'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full min-w-0 max-w-full">
                  {(filteredItems ?? [])?.map((item) => (
                    <Card key={item.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 flex flex-col justify-between group w-full min-w-0 max-w-full">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40">
                            {item.category_name.split(' - ')[1] || item.category_name}
                          </Badge>
                          <Badge variant={item.is_loanable ? 'success' : 'secondary'} className="text-[9px] font-bold">
                            {item.is_loanable ? 'Dapat Dipinjam' : 'Tidak Dipinjamkan'}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.nama}
                          </h4>
                          {item.brand && (
                            <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                              Brand: {item.brand}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.deskripsi || 'Tidak ada deskripsi spesifikasi tambahan.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <Button
                          type="button"
                          variant="toolbarOutline"
                          size="toolbar"
                          onClick={() => handleOpenEdit(item)}
                          className="text-xs font-bold rounded-xl"
                        >
                          <Edit2 size={12} className="mr-1" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="toolbarDanger"
                          size="toolbar"
                          onClick={() => handleDeleteItem(item)}
                          className="text-xs font-bold rounded-xl"
                        >
                          <Trash2 size={12} className="mr-1" /> Hapus
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Lazy Loaded Modal */}
          {formModal.isOpen && (
            <Suspense fallback={null}>
              <SarprasCatalogFormModal
                isOpen={formModal.isOpen}
                onClose={() => setFormModal(prev => ({ ...prev, isOpen: false }))}
                mode={formModal.mode}
                formData={formData}
                setFormData={setFormData}
                useCustomCategory={useCustomCategory}
                setUseCustomCategory={setUseCustomCategory}
                categorySelectOptions={categorySelectOptions}
                onSubmit={handleSubmitForm}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </Suspense>
          )}
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default SarprasCatalogPage;
