import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Table } from '../../ui';
import type { Column } from '../../ui/Table';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { Edit, Trash, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
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
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
}

export const ProductCategoriesTab = React.memo<ProductCategoriesTabProps>(({
  categories,
  fetchCategories,
  fetchProducts
}) => {
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
      toast.success(editingCategory ? 'Kategori berhasil diperbarui' : 'Kategori baru berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-categories'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchCategories();
      fetchProducts();
      setIsCategoryModalOpen(false);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.error(err.response?.data?.message || 'Gagal menyimpan kategori');
    }
  });

  const categorySubmitLoading = saveCategoryMutation.isPending;

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      toast.error('Nama kategori wajib diisi.');
      return;
    }

    await saveCategoryMutation.mutateAsync({
      name: categoryFormName,
      description: categoryFormDesc
    });
  };

  const handleCategoryDeleteClick = useCallback((id: string) => {
    setCategoryIdToDelete(id);
    setCategoryDeleteConfirmOpen(true);
  }, []);

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/toko/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Kategori berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-categories'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchCategories();
      fetchProducts();
      setCategoryDeleteConfirmOpen(false);
      setCategoryIdToDelete(null);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori');
      setCategoryIdToDelete(null);
    }
  });

  const categoryDeleteLoading = deleteCategoryMutation.isPending;

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryIdToDelete) return;
    await deleteCategoryMutation.mutateAsync(categoryIdToDelete);
  };

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(order);
  }, []);

  // Filtered categories list
  const filteredCategories = useMemo(() => {
    const sorted = [...(categories || [])];
    if (sortKey) {
      sorted.sort((a, b) => {
        const valA = String(a[sortKey as keyof ProductCategory] ?? '').toLowerCase();
        const valB = String(b[sortKey as keyof ProductCategory] ?? '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return sorted.filter(c => 
      c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery, sortKey, sortDirection]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (categoryCurrentPage - 1) * categoryLimit;
    return filteredCategories.slice(startIndex, startIndex + categoryLimit);
  }, [filteredCategories, categoryCurrentPage, categoryLimit]);

  const categoryTotalPages = useMemo(() => {
    return Math.ceil(filteredCategories.length / categoryLimit) || 1;
  }, [filteredCategories.length, categoryLimit]);

  // Categories Columns
  const categoryColumns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { key: 'name', label: 'Nama Kategori', className: 'font-semibold text-gray-800', sortable: true },
      { key: 'code', label: 'Kode Kategori', className: 'font-mono text-xs text-gray-500', sortable: true },
      { key: 'description', label: 'Deskripsi', render: (val: unknown) => String(val || '-') }
    ];

    if (canUpdate) {
      cols.push({ 
        key: 'actions', 
        label: 'Aksi', 
        render: (_value: unknown, row: ProductCategory) => (
          <div className="flex space-x-2">
            <Button size="sm" variant="secondary" onClick={() => handleOpenCategoryModal(row)} icon={<Edit size={14} />} aria-label="Edit Kategori" />
            <Button size="sm" variant="danger" onClick={() => handleCategoryDeleteClick(row.id)} icon={<Trash size={14} />} aria-label="Hapus Kategori" />
          </div>
        )
      });
    }

    return cols;
  }, [canUpdate, handleOpenCategoryModal, handleCategoryDeleteClick]);

  // Toolbar Slots for Categories Table component
  const categoryToolbarLeft = useMemo(() => (
    <div className="flex-1 relative w-full md:max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        id="category-search"
        type="text"
        placeholder="Cari kategori berdasarkan nama / deskripsi..."
        value={categorySearchQuery}
        onChange={(e) => setCategorySearchQuery(e.target.value)}
        className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        aria-label="Cari kategori"
      />
    </div>
  ), [categorySearchQuery]);

  return (
    <div className="space-y-4">
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
        onSort={handleSort}
        pagination={{
          currentPage: categoryCurrentPage,
          totalPages: categoryTotalPages,
          totalItems: filteredCategories.length,
          itemsPerPage: categoryLimit,
          onPageChange: setCategoryCurrentPage,
          onLimitChange: setCategoryLimit
        }}
        rowKey="id"
        toolbarLeft={categoryToolbarLeft}
      />

      {/* Modal CRUD: Add/Edit Category */}
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
            placeholder="E.g. Alat Olahraga"
            aria-label="Nama Kategori"
          />

          <div>
            <label htmlFor="cat-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Kategori
            </label>
            <textarea
              id="cat-desc"
              rows={3}
              placeholder="Keterangan opsional kelompok barang..."
              value={categoryFormDesc}
              onChange={(e) => setCategoryFormDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-white"
              aria-label="Deskripsi Kategori"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog for Category Delete */}
      <ConfirmDialog
        isOpen={categoryDeleteConfirmOpen}
        title="Konfirmasi Hapus Kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini? Kategori yang masih digunakan oleh produk terdaftar tidak dapat dihapus demi menjaga konsistensi filter data katalog."
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
