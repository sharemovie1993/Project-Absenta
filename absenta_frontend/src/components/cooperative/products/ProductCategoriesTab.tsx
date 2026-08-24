import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Table } from '../../ui';
import type { Column } from '../../ui/Table';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { 
  ArrowLeft, 
  Trash2, 
  Search, 
  Plus, 
  ArrowUpDown, 
  FileEdit, 
  Edit 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

interface ProductCategoriesTabProps {
  categories: ProductCategory[];
  products?: Product[];
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
}

export const ProductCategoriesTab = React.memo<ProductCategoriesTabProps>(({
  categories,
  products = [],
  fetchCategories,
  fetchProducts
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryLimit, setCategoryLimit] = useState(10);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Category CRUD Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormDesc, setCategoryFormDesc] = useState('');

  // Confirm delete category state
  const [categoryDeleteConfirmOpen, setCategoryDeleteConfirmOpen] = useState(false);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<string | null>(null);

  // Compute stock & modal per category
  const categoryStatsMap = useMemo(() => {
    const map = new Map<string, { totalStock: number; totalCost: number; productCount: number }>();
    
    (products || []).forEach(prod => {
      const catKey = (prod.category || '').trim().toLowerCase();
      const existing = map.get(catKey) || { totalStock: 0, totalCost: 0, productCount: 0 };
      const stock = Number(prod.stock || 0);
      const cost = Number(prod.costPrice || 0);

      map.set(catKey, {
        totalStock: existing.totalStock + stock,
        totalCost: existing.totalCost + (stock * cost),
        productCount: existing.productCount + 1,
      });
    });

    return map;
  }, [products]);

  const handleOpenCategoryModal = useCallback((cat?: ProductCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryFormName(cat.name);
      setCategoryFormDesc(cat.description || '');
    } else {
      setEditingCategory(null);
      setCategoryFormName('');
      setCategoryFormDesc('');
    }
    setIsCategoryModalOpen(true);
  }, []);

  const saveCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      if (editingCategory) {
        const res = await api.put(`/cooperative/toko/categories/${editingCategory.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/cooperative/toko/categories', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success(editingCategory ? 'Kategori berhasil diperbarui' : 'Kategori baru berhasil ditambahkan', { duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-categories'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchCategories();
      fetchProducts();
      setIsCategoryModalOpen(false);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.dismiss();
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan kategori', { duration: 3500 });
    }
  });

  const categorySubmitLoading = saveCategoryMutation.isPending;

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      toast.error('Nama kategori wajib diisi.');
      return;
    }

    saveCategoryMutation.mutate({
      name: categoryFormName.trim(),
      description: categoryFormDesc.trim()
    });
  };

  const handleCategoryDeleteClick = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCategoryIdToDelete(id);
    setCategoryDeleteConfirmOpen(true);
  }, []);

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/toko/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('Kategori berhasil dihapus', { duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-categories'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchCategories();
      fetchProducts();
      setCategoryDeleteConfirmOpen(false);
      setCategoryIdToDelete(null);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.dismiss();
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal menghapus kategori', { duration: 3500 });
    }
  });

  const categoryDeleteLoading = deleteCategoryMutation.isPending;

  const handleCategoryDeleteConfirm = async () => {
    if (categoryIdToDelete) {
      deleteCategoryMutation.mutate(categoryIdToDelete);
    }
  };

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return (categories || []).filter((cat) => {
      const q = categorySearchQuery.toLowerCase();
      const matchName = cat.name.toLowerCase().includes(q);
      const matchDesc = (cat.description || '').toLowerCase().includes(q);
      return matchName || matchDesc;
    });
  }, [categories, categorySearchQuery]);

  // Sort Categories
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      if (sortKey === 'name') {
        const valA = a.name.toLowerCase();
        const valB = b.name.toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [filteredCategories, sortKey, sortDirection]);

  // Paginated Categories (For Desktop Table)
  const paginatedCategories = useMemo(() => {
    const start = (categoryCurrentPage - 1) * categoryLimit;
    return sortedCategories.slice(start, start + categoryLimit);
  }, [sortedCategories, categoryCurrentPage, categoryLimit]);

  const categoryTotalPages = Math.ceil(sortedCategories.length / categoryLimit) || 1;

  const handleSortToggle = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Desktop Table Columns
  const categoryColumns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { key: 'name', label: 'Nama Kategori', className: 'font-semibold', sortable: true },
      { key: 'code', label: 'Kode', sortable: true },
      { 
        key: 'description', 
        label: 'Deskripsi', 
        render: (_value: unknown, row: ProductCategory) => row.description || '-' 
      },
      {
        key: 'stats',
        label: 'Jumlah Produk / Stok',
        render: (_value: unknown, row: ProductCategory) => {
          const stats = categoryStatsMap.get(row.name.trim().toLowerCase()) || { totalStock: 0, totalCost: 0, productCount: 0 };
          return (
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.productCount} Produk</span>
              <span className="text-slate-400 dark:text-slate-500 mx-1.5">•</span>
              <span className="text-slate-500 dark:text-slate-400">Stok: {stats.totalStock} pcs</span>
            </div>
          );
        }
      }
    ];

    if (canUpdate) {
      cols.push({
        key: 'actions',
        label: 'Aksi',
        render: (_value: unknown, row: ProductCategory) => (
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleOpenCategoryModal(row)} 
              icon={<Edit size={14} />} 
              aria-label="Edit Kategori" 
            />
            <Button 
              size="sm" 
              variant="danger" 
              onClick={(e) => handleCategoryDeleteClick(row.id, e)} 
              icon={<Trash2 size={14} />} 
              aria-label="Hapus Kategori" 
            />
          </div>
        )
      });
    }

    return cols;
  }, [canUpdate, handleOpenCategoryModal, handleCategoryDeleteClick, categoryStatsMap]);

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────────────────
          MOBILE VIEW (1:1 Kasir Pintar Persona: Kategori Barang)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden -mx-4 -mt-2 space-y-3 pb-24 bg-white dark:bg-slate-950 min-h-[85vh]">
        
        {/* 1. App Bar Mobile */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-slate-700 dark:text-slate-300 active:scale-95 cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Kategori Barang
          </h2>
        </div>

        {/* 2. Sort Button & Search Bar */}
        <div className="px-4 flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSortToggle}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 active:scale-95 transition-transform shrink-0"
            title={`Urutkan: ${sortDirection === 'asc' ? 'A ke Z' : 'Z ke A'}`}
          >
            <ArrowUpDown size={18} />
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari Kategori"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 3. Information Notice Banner (1:1 Kasir Pintar) */}
        <div className="px-4">
          <div 
            onClick={() => handleOpenCategoryModal()}
            className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3 cursor-pointer active:scale-98 transition-transform"
          >
            <div className="p-1.5 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5">
              <FileEdit size={16} />
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="font-bold text-slate-900 dark:text-slate-100">Edit</strong> kategori hanya dapat dilakukan di backoffice. Klik <span className="font-bold text-emerald-600 dark:text-emerald-400 underline">di sini</span> untuk atur kategori.
            </p>
          </div>
        </div>

        {/* 4. Category Items List (Flat Minimalist 1:1 Kasir Pintar) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada kategori ditemukan.
            </div>
          ) : (
            sortedCategories.map(cat => {
              const stats = categoryStatsMap.get(cat.name.trim().toLowerCase()) || { totalStock: 0, totalCost: 0, productCount: 0 };

              return (
                <div
                  key={cat.id}
                  onClick={() => handleOpenCategoryModal(cat)}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer active:bg-slate-100 dark:active:bg-slate-900 transition-colors select-none"
                >
                  {/* Top Line: Category Name & Red Trash Delete Icon */}
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {cat.name}
                    </h3>

                    {canUpdate && (
                      <button
                        type="button"
                        onClick={(e) => handleCategoryDeleteClick(cat.id, e)}
                        className="p-1 text-rose-500 hover:text-rose-700 active:scale-90 transition-transform cursor-pointer shrink-0 -mr-1"
                        title="Hapus Kategori"
                        aria-label="Hapus Kategori"
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>

                  {/* Bottom Line: sisa : 0 (Left) and Modal : Rp 0 (Right) */}
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>
                      sisa : {stats.totalStock}
                    </span>
                    <span>
                      Modal : Rp {stats.totalCost.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Sticky Bottom Action Button (TAMBAH KATEGORI - Elevated Above Bottom Nav) */}
        {canUpdate && (
          <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] inset-x-4 z-40 animate-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => handleOpenCategoryModal()}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs tracking-wider uppercase shadow-xl flex items-center justify-center cursor-pointer active:scale-98 transition-transform"
            >
              Tambah Kategori
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DESKTOP VIEW (Rich Table Format)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-4">
        {canUpdate && (
          <div className="flex justify-end space-x-3 mb-2">
            <Button onClick={() => handleOpenCategoryModal()} icon={<Plus size={18} />}>
              Tambah Kategori Baru
            </Button>
          </div>
        )}

        <Table 
          columns={categoryColumns}
          data={paginatedCategories} 
          loading={categories.length === 0 && paginatedCategories.length === 0}
          emptyMessage="Tidak ditemukan data kategori."
          sortBy={sortKey}
          sortOrder={sortDirection}
          onSort={(key, order) => {
            setSortKey(key);
            setSortDirection(order);
          }}
          pagination={{
            currentPage: categoryCurrentPage,
            totalPages: categoryTotalPages,
            totalItems: filteredCategories.length,
            itemsPerPage: categoryLimit,
            onPageChange: setCategoryCurrentPage,
            onLimitChange: setCategoryLimit
          }}
          rowKey="id"
          toolbarLeft={(
            <div className="flex-1 relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="category-search-desktop"
                type="text"
                placeholder="Cari kategori berdasarkan nama / deskripsi..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                aria-label="Cari kategori"
              />
            </div>
          )}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL CRUD: Add/Edit Category (Theme Aware)
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <Input
            id="cat-name"
            label="Nama Kategori"
            value={categoryFormName}
            onChange={(e) => setCategoryFormName(e.target.value)}
            required
            placeholder="E.g. Komputer, Makanan, ATK"
            aria-label="Nama Kategori"
          />

          <div>
            <label htmlFor="cat-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Kategori (Opsional)
            </label>
            <textarea
              id="cat-desc"
              rows={3}
              placeholder="Keterangan kelompok barang..."
              value={categoryFormDesc}
              onChange={(e) => setCategoryFormDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
              aria-label="Deskripsi Kategori"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              isLoading={categorySubmitLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          CONFIRM DELETE CATEGORY DIALOG
          ─────────────────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={categoryDeleteConfirmOpen}
        title="Konfirmasi Hapus Kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini? Kategori yang masih digunakan oleh produk terdaftar tidak dapat dihapus demi menjaga konsistensi katalog."
        confirmText="Hapus Kategori"
        cancelText="Batal"
        onConfirm={handleCategoryDeleteConfirm}
        onCancel={() => {
          setCategoryDeleteConfirmOpen(false);
          setCategoryIdToDelete(null);
        }}
        style="danger"
        loading={categoryDeleteLoading}
      />
    </div>
  );
});

ProductCategoriesTab.displayName = 'ProductCategoriesTab';

export default ProductCategoriesTab;
