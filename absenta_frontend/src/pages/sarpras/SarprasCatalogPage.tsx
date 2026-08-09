import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Lucide from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { Switch } from '../../components/ui/Switch';
import { Loader } from '../../components/ui/Loader';
import { Badge } from '../../components/ui/Badge';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { sarprasApi } from '../../api/sarpras.api';

const { Search, Plus, Edit2, Trash2, Tag, BookOpen, AlertCircle, Info, Image } = Lucide;

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

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item?: CatalogItem;
  }>({
    isOpen: false
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
  const { data: catalogRes, isLoading, refetch } = useQuery({
    queryKey: ['sarpras-catalog-all', search],
    queryFn: () => sarprasApi.getCatalog({ search })
  });

  const catalogItems: CatalogItem[] = useMemo(() => {
    return catalogRes?.data || [];
  }, [catalogRes]);

  // Filter items locally by category if filter is active
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') return catalogItems;
    return catalogItems.filter(item => item.category_name === selectedCategory);
  }, [catalogItems, selectedCategory]);

  const catalogTabOptions = useMemo(() => [
    { id: 'ALL', label: 'Semua Kategori', colorClass: 'text-blue-600 dark:text-blue-400' },
    ...CATEGORY_OPTIONS.map(cat => ({
      id: cat,
      label: cat.split(' - ')[1] || cat,
      colorClass: 'text-blue-600 dark:text-blue-400'
    }))
  ], []);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: sarprasApi.createCatalogItem,
    onSuccess: (res: any) => {
      toast.success(res.message || 'Item katalog berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
      setFormModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan item');
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sarprasApi.updateCatalogItem(id, data),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Item katalog berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
      setFormModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui item');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sarprasApi.deleteCatalogItem(id),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Item katalog berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['sarpras-catalog-all'] });
      setDeleteModal({ isOpen: false });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus item');
    }
  });

  // Handlers
  const handleOpenCreate = () => {
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
  };

  const handleOpenEdit = (item: CatalogItem) => {
    const isCustom = !CATEGORY_OPTIONS.includes(item.category_name);
    setFormData({
      nama: item.nama,
      brand: item.brand || '',
      category_name: isCustom ? CATEGORY_OPTIONS[0] : item.category_name,
      custom_category: isCustom ? item.category_name : '',
      is_loanable: item.is_loanable,
      deskripsi: item.deskripsi || '',
      image_url: item.image_url || ''
    });
    setUseCustomCategory(isCustom);
    setFormModal({ isOpen: true, mode: 'edit', item });
  };

  const handleOpenDelete = (item: CatalogItem) => {
    setDeleteModal({ isOpen: true, item });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      toast.error('Nama item wajib diisi');
      return;
    }

    const finalCategory = useCustomCategory 
      ? formData.custom_category.trim() 
      : formData.category_name;

    if (!finalCategory) {
      toast.error('Kategori kelompok wajib diisi/dipilih');
      return;
    }

    // Auto-generate colored placehold.co URL if image_url is empty
    let finalImageUrl = formData.image_url.trim();
    if (!finalImageUrl) {
      let bgColor = '3b82f6';
      if (finalCategory.includes('Jaringan')) bgColor = '3b82f6';
      else if (finalCategory.includes('Alat Kerja')) bgColor = '10b981';
      else if (finalCategory.includes('Mebel')) bgColor = '6366f1';
      else if (finalCategory.includes('Olahraga')) bgColor = 'f59e0b';
      else if (finalCategory.includes('Fasilitas')) bgColor = 'ef4444';

      const cleanText = formData.nama.trim()
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim();
      const textParam = encodeURIComponent(cleanText);
      finalImageUrl = `https://placehold.co/150x150/${bgColor}/ffffff?text=${textParam}`;
    }

    const payload = {
      nama: formData.nama.trim(),
      brand: formData.brand.trim() || null,
      category_name: finalCategory,
      is_loanable: formData.is_loanable,
      deskripsi: formData.deskripsi.trim() || null,
      image_url: finalImageUrl
    };

    if (formModal.mode === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: formModal.item!.id, data: payload });
    }
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sarpras', path: '/sarpras/dashboard' },
    { label: 'Katalog Aset Global', path: '/sarpras/catalog' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pengelolaan Katalog Global',
    description: 'Menu ini digunakan oleh Superadmin dan Owner Sekolah untuk melakukan standardisasi jenis barang inventaris yang dapat didaftarkan di sekolah.',
    items: [
      { text: 'Tambah atau edit item katalog yang menjadi acuan pengisian formulir inventaris.' },
      { text: 'Setiap item katalog wajib dilengkapi dengan visual (gambar) sebagai penanda.' },
      { text: 'Perubahan pada katalog global ini akan langsung disinkronkan ke seluruh form pengisian aset.' }
    ]
  }), []);

  return (
    <AcademicPageLayout
      title="Master Katalog Aset Global"
      description="Kelola standar katalog aset sekolah secara terpusat."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="sarpras_catalog"
      toolbar={
        <Button onClick={handleOpenCreate} className="rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
          <Plus size={18} className="mr-2" /> Tambah Katalog
        </Button>
      }
    >
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Cari katalog..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[13px] font-bold"
            />
          </div>

          <TabSwitcher
            options={catalogTabOptions}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            className="w-full md:w-auto overflow-x-auto scrollbar-none"
          />
        </div>

        {/* Catalog Table */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader size="lg" />
            <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">Memuat katalog...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-16 flex flex-col items-center text-center max-w-lg mx-auto shadow-sm gap-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800">
              <BookOpen size={28} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Katalog Kosong</h4>
              <p className="text-xs text-slate-500 mt-1">Tidak ada item katalog yang sesuai dengan kriteria pencarian Anda.</p>
            </div>
            <Button onClick={handleOpenCreate} variant="outline" className="rounded-xl mt-2">
              Buat Item Pertama
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20">Visual</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Aset & Brand</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kategori Kelompok</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Peminjaman</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Deskripsi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.nama}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400 border border-slate-200">
                            <Image size={20} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.nama}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                          Brand: {item.brand || 'Kustom'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Tag size={12} className="text-blue-500" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {item.category_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.is_loanable ? (
                          <Badge variant="success">Bisa Dipinjam</Badge>
                        ) : (
                          <Badge variant="warning">Tidak Dipinjam</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 max-w-xs truncate" title={item.deskripsi || ''}>
                          {item.deskripsi || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:text-blue-600 hover:border-blue-300 transition-all"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:border-rose-300 transition-all"
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (Create / Edit) */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal(prev => ({ ...prev, isOpen: false }))}
        title={formModal.mode === 'create' ? 'Tambah Item Katalog Global' : 'Edit Item Katalog Global'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat_nama">Nama Item Katalog <span className="text-rose-500">*</span></Label>
            <Input
              id="cat_nama"
              required
              placeholder="Contoh: Router MikroTik RB951Ui-2HnD"
              value={formData.nama}
              onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
              className="text-sm font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat_brand">Brand / Merk</Label>
            <Input
              id="cat_brand"
              placeholder="Contoh: MikroTik"
              value={formData.brand}
              onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              className="text-sm font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Kategori Kelompok Aset <span className="text-rose-500">*</span></Label>
              <button
                type="button"
                onClick={() => setUseCustomCategory(prev => !prev)}
                className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline tracking-tight"
              >
                {useCustomCategory ? 'Pilih dari Default' : 'Ketik Manual'}
              </button>
            </div>

            {useCustomCategory ? (
              <Input
                required
                placeholder="Ketik nama kategori kustom..."
                value={formData.custom_category}
                onChange={e => setFormData(prev => ({ ...prev, custom_category: e.target.value }))}
                className="text-sm font-bold"
              />
            ) : (
              <select
                className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
                value={formData.category_name}
                onChange={e => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm">Bisa Dipinjam</Label>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Apakah barang dapat dipinjamkan ke Guru/Siswa</span>
            </div>
            <Switch
              checked={formData.is_loanable}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, is_loanable: checked }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat_image">URL Gambar Ilustrasi (Opsional)</Label>
            <Input
              id="cat_image"
              placeholder="Kosongkan untuk otomatis menggunakan placeholder warna standar"
              value={formData.image_url}
              onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              className="text-xs font-semibold"
            />
            <p className="text-[9px] text-slate-400 font-semibold leading-tight">
              Jika dikosongkan, sistem akan membuat gambar representatif dinamis sesuai kategori yang dipilih.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat_desk">Deskripsi Ringkas</Label>
            <Textarea
              id="cat_desk"
              placeholder="Tulis spesifikasi singkat atau fungsi barang..."
              value={formData.deskripsi}
              onChange={e => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
              rows={3}
              className="text-xs font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormModal(prev => ({ ...prev, isOpen: false }))}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {formModal.mode === 'create' ? 'Tambah Katalog' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        title="Hapus Item Katalog"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-red-700 dark:text-red-400">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs leading-normal">
              <span className="font-black uppercase tracking-wider block mb-1">Peringatan Keamanan</span>
              Menghapus item katalog ini akan menghilangkan opsi rekomendasi barang terkait dari form tambah aset baru di seluruh sekolah. Data barang yang sudah pernah didaftarkan tidak akan terhapus.
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Apakah Anda yakin ingin menghapus item katalog <strong className="text-red-600">"{deleteModal.item?.nama}"</strong>?
          </p>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false })}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={() => deleteMutation.mutate(deleteModal.item!.id)}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              isLoading={deleteMutation.isPending}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </AcademicPageLayout>
  );
});
