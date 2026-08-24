import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { COOP_QUERY_KEYS, invalidateAllProductCaches } from '../../../lib/coopQueryKeys';
import { Button } from '../ui/Button';
import { Table, MobileDataList } from '../../ui';
import type { Column } from '../../ui/Table';
import { SearchableSelect } from '../../ui/SearchableSelect';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { Plus, Edit, Trash, Search, Package, Upload, Filter, SlidersHorizontal } from 'lucide-react';
import { importDataFromExcel } from '../../../utils/import.utils';
import { downloadFileFromBlob } from '../../../utils/file-download.utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { cn } from '@/lib/utils';

import { ProductFormModal } from '../../../pages/cooperative/components/ProductFormModal';
const OpnameFormModal = lazy(() => import('../../../pages/cooperative/components/OpnameFormModal'));
const ExcelImportModal = lazy(() => import('../../academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
  imageUrl?: string | null;
  productType?: string | null;
  showInTransaction?: boolean;
  useStock?: boolean;
  barcode?: string | null;
  unit?: string | null;
  description?: string | null;
}

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

interface ProductCatalogTabProps {
  products: Product[];
  categories: ProductCategory[];
  loading?: boolean;
}

export const ProductCatalogTab = React.memo<ProductCatalogTabProps>(({
  products,
  categories,
  loading = false,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canCreate = user?.capabilities?.includes('cooperative.store.products.create') || false;
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;
  const canDelete = user?.capabilities?.includes('cooperative.store.products.delete') || false;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Product CRUD Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Stock Opname (Adjust Stock) Modal
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);

  // Confirm delete product state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);

  // Derived category options for filter dropdown
  const categoryOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'Semua Kategori' },
      ...(categories || []).map(cat => ({
        value: cat.name,
        label: cat.name
      }))
    ];
  }, [categories]);

  // Helper 2-letter initials
  const getInitials = (name: string) => {
    if (!name) return 'PR';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Sorting products helper
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    if (sortKey) {
      sorted.sort((a, b) => {
        let aValue = (a as any)[sortKey];
        let bValue = (b as any)[sortKey];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [products, sortKey, sortDirection]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [sortedProducts, searchQuery, categoryFilter]);

  // Paginated data for the Table component
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, currentPage, limit]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / limit) || 1;
  }, [filteredProducts.length, limit]);

  const handleOpenProductModal = useCallback((product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setIsProductModalOpen(true);
  }, []);

  const saveProductMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingProduct) {
        const res = await api.put(`/cooperative/toko/${editingProduct.id}`, formData);
        return res.data;
      } else {
        const res = await api.post('/cooperative/toko', formData);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
      setIsProductModalOpen(false);
      setEditingProduct(null);
      invalidateAllProductCaches(queryClient);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
    }
  });

  const saveProductLoading = saveProductMutation.isPending;

  const handleSaveProduct = useCallback((formData: any) => {
    saveProductMutation.mutate(formData);
  }, [saveProductMutation]);

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/toko/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Produk berhasil dihapus');
      setDeleteConfirmOpen(false);
      setProductIdToDelete(null);
      invalidateAllProductCaches(queryClient);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menghapus produk');
    }
  });

  const deleteProductLoading = deleteProductMutation.isPending;

  const handleProductDeleteClick = useCallback((id: string) => {
    setProductIdToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (productIdToDelete) {
      deleteProductMutation.mutate(productIdToDelete);
    }
  }, [productIdToDelete, deleteProductMutation]);

  const handleOpenOpnameModal = useCallback((product: Product) => {
    setOpnameProduct(product);
    setIsOpnameModalOpen(true);
  }, []);

  const adjustStockMutation = useMutation({
    mutationFn: async (payload: { productId: string; newStock: number; reason: string }) => {
      const res = await api.post(`/cooperative/toko/${payload.productId}/adjust-stock`, {
        actualStock: payload.newStock,
        notes: payload.reason,
        type: 'OPNAME'
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stok berhasil disesuaikan');
      setIsOpnameModalOpen(false);
      setOpnameProduct(null);
      invalidateAllProductCaches(queryClient);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyesuaikan stok');
    }
  });

  const adjustStockLoading = adjustStockMutation.isPending;

  const handleAdjustStock = useCallback((newStock: number, reason: string) => {
    if (!opnameProduct) return;
    adjustStockMutation.mutate({
      productId: opnameProduct.id,
      newStock,
      reason
    });
  }, [opnameProduct, adjustStockMutation]);

  const handleImportExcel = async (file: File) => {
    try {
      const res = await importDataFromExcel(file, '/cooperative/toko/products/import', 'file');
      if (res.data?.success) {
        toast.success(res.data.message || 'Import data produk berhasil!');
        setImportOpen(false);
        invalidateAllProductCaches(queryClient);
      } else {
        toast.error(res.data?.message || 'Gagal import data');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan saat import data');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/cooperative/toko/products/template', { responseType: 'blob' });
      downloadFileFromBlob(res.data, 'Template_Import_Produk_Koperasi.xlsx');
    } catch (err) {
      toast.error('Gagal mendownload template import');
    }
  };

  // Table columns definition (Desktop)
  const catalogColumns = useMemo<Column[]>(() => [
    {
      key: 'name',
      label: 'Produk',
      sortable: true,
      render: (_val: unknown, p: Product) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-900">
            {getInitials(p.name)}
          </div>
          <div>
            <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{p.name}</p>
            <p className="text-xs text-gray-400 font-mono">{p.code}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Kategori',
      sortable: true,
      render: (_val: unknown, p: Product) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {p.category || 'Umum'}
        </span>
      )
    },
    {
      key: 'costPrice',
      label: 'Harga Beli (Modal)',
      sortable: true,
      render: (_val: unknown, p: Product) => `Rp ${Number(p.costPrice || 0).toLocaleString('id-ID')}`
    },
    {
      key: 'price',
      label: 'Harga Jual',
      sortable: true,
      render: (_val: unknown, p: Product) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          Rp ${Number(p.price || 0).toLocaleString('id-ID')}
        </span>
      )
    },
    {
      key: 'stock',
      label: 'Stok',
      sortable: true,
      render: (_val: unknown, p: Product) => {
        const isLow = p.stock <= 5;
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-bold",
            isLow ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          )}>
            {p.stock} pcs
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_val: unknown, p: Product) => (
        <div className="flex items-center space-x-2">
          {canUpdate && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleOpenOpnameModal(p)}>
                Opname
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleOpenProductModal(p)} icon={<Edit size={14} />}>
                Edit
              </Button>
            </>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" onClick={() => handleProductDeleteClick(p.id)} icon={<Trash size={14} />}>
              Hapus
            </Button>
          )}
        </div>
      )
    }
  ], [canUpdate, canDelete, handleOpenOpnameModal, handleOpenProductModal, handleProductDeleteClick]);

  // Clean Mobile Card (Persona Kasir Pintar)
  const renderProductMobileCard = useCallback((product: Product) => {
    const isLowStock = product.stock <= 5;
    return (
      <div 
        key={product.id}
        onClick={() => canUpdate && handleOpenProductModal(product)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
      >
        {/* Top: Avatar, Name, Stock */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-900">
            {getInitials(product.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {product.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-mono">
              <span>{product.code}</span>
              {product.category && (
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                  {product.category}
                </span>
              )}
            </div>
          </div>

          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
            isLowStock 
              ? "bg-rose-50 text-rose-600 border border-rose-200" 
              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          )}>
            {product.stock} pcs
          </span>
        </div>

        {/* Bottom: Price & Quick Action */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Harga Jual</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              Rp {Number(product.price || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">
              Modal: Rp {Number(product.costPrice || 0).toLocaleString('id-ID')}
            </span>
            {canUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenProductModal(product);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90"
                title="Edit Produk"
              >
                <Edit size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [canUpdate, handleOpenProductModal]);

  // Clean 1-line Mobile Search & Filter Toolbar
  const mobileToolbar = useMemo(() => (
    <div className="flex items-center gap-2 w-full pt-1">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          id="mobile-catalog-search"
          type="text"
          placeholder="Cari nama atau kode barang..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      <div className="w-36 shrink-0">
        <select
          id="mobile-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full h-11 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
        >
          {categoryOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  ), [searchQuery, categoryFilter, categoryOptions]);

  const emptyStateContent = useMemo(() => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-100 shadow-2xs">
        <Package size={24} />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
        Belum Ada Produk
      </h3>
      <p className="text-xs text-slate-400 max-w-xs mb-3">
        Koperasi belum memiliki produk terdaftar.
      </p>
      {canCreate && (
        <Button size="sm" onClick={() => handleOpenProductModal()} icon={<Plus size={14} />}>
          Tambah Produk
        </Button>
      )}
    </div>
  ), [canCreate, handleOpenProductModal]);

  return (
    <div className="space-y-4 pb-28 lg:pb-6">
      {isMobile ? (
        <>
          <MobileDataList
            data={paginatedProducts}
            loading={loading}
            totalItems={filteredProducts.length}
            onRefresh={() => invalidateAllProductCaches(queryClient)}
            renderCard={renderProductMobileCard}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: setCurrentPage
            }}
            toolbar={mobileToolbar}
            emptyMessage={emptyStateContent}
          />

          {/* Floating Action Button (+ Tambah Produk) */}
          {canCreate && (
            <div className="fixed bottom-[calc(135px+env(safe-area-inset-bottom))] right-4 z-40">
              <button
                type="button"
                onClick={() => handleOpenProductModal()}
                className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={18} className="stroke-[3]" />
                <span>Tambah Produk</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Desktop Search & Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari produk berdasarkan nama atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="w-48 shrink-0">
                <SearchableSelect
                  id="desktop-category-filter"
                  options={categoryOptions}
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  placeholder="Semua Kategori"
                  clearable
                />
              </div>
            </div>

            {canCreate && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" onClick={() => setImportOpen(true)} icon={<Upload size={15} />}>
                  Import Excel
                </Button>
                <Button onClick={() => handleOpenProductModal()} icon={<Plus size={15} />}>
                  Tambah Produk Baru
                </Button>
              </div>
            )}
          </div>

          <Table 
            columns={catalogColumns}
            data={paginatedProducts} 
            loading={loading}
            emptyMessage={emptyStateContent}
            sortBy={sortKey}
            sortDirection={sortDirection}
            onSort={(key) => {
              if (sortKey === key) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortKey(key);
                setSortDirection('asc');
              }
            }}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
              totalItems: filteredProducts.length,
              itemsPerPage: limit,
              onItemsPerPageChange: setLimit
            }}
          />
        </>
      )}

      {/* Modals */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          categories={categories}
          onSubmit={handleSaveProduct}
          loading={saveProductLoading}
          onDelete={editingProduct && canDelete ? () => handleProductDeleteClick(editingProduct.id) : undefined}
        />
      )}

      {isOpnameModalOpen && opnameProduct && (
        <Suspense fallback={null}>
          <OpnameFormModal
            isOpen={isOpnameModalOpen}
            onClose={() => {
              setIsOpnameModalOpen(false);
              setOpnameProduct(null);
            }}
            product={opnameProduct}
            onSubmit={handleAdjustStock}
            loading={adjustStockLoading}
          />
        </Suspense>
      )}

      {importOpen && (
        <Suspense fallback={null}>
          <ExcelImportModal
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            title="Import Katalog Produk Koperasi"
            onImport={handleImportExcel}
            onDownloadTemplate={handleDownloadTemplate}
          />
        </Suspense>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Produk"
        message="Apakah Anda yakin ingin menghapus produk ini dari katalog? Tindakan ini tidak dapat dibatalkan."
        type="danger"
        confirmText="Hapus"
        cancelText="Batal"
        loading={deleteProductLoading}
      />
    </div>
  );
});

ProductCatalogTab.displayName = 'ProductCatalogTab';

export default ProductCatalogTab;
