import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Table, MobileDataList } from '../../ui';
import type { Column } from '../../ui/Table';
import { SearchableSelect } from '../../ui/SearchableSelect';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { Plus, Edit, Trash, Search, Package, Upload } from 'lucide-react';
import { importDataFromExcel } from '../../../utils/import.utils';
import { downloadFileFromBlob } from '../../../utils/file-download.utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useIsMobile } from '../../../hooks/useIsMobile';

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
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  loading?: boolean;
}

export const ProductCatalogTab = React.memo<ProductCatalogTabProps>(({
  products,
  categories,
  fetchProducts,
  fetchCategories,
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
      toast.dismiss();
      toast.success(editingProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan', { duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchProducts();
      fetchCategories();
      setIsProductModalOpen(false);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error('Product save error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan produk';
      toast.dismiss();
      toast.error(msg, { duration: 3500 });
    }
  });

  const productSubmitLoading = saveProductMutation.isPending;

  const handleProductSubmit = useCallback(async (formData: {
    code: string;
    name: string;
    price: string;
    costPrice: string;
    stock: string;
    category: string;
  }) => {
    saveProductMutation.mutate(formData);
  }, [saveProductMutation]);

  const handleProductDeleteClick = useCallback((id: string) => {
    setProductIdToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/toko/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Produk berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchProducts();
      setDeleteConfirmOpen(false);
      setProductIdToDelete(null);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menghapus produk.';
      toast.error(msg, { duration: 5000 });
      setProductIdToDelete(null);
    }
  });

  const deleteLoading = deleteProductMutation.isPending;

  const handleProductDeleteConfirm = useCallback(async () => {
    if (!productIdToDelete) return;
    deleteProductMutation.mutate(productIdToDelete);
  }, [productIdToDelete, deleteProductMutation]);

  const handleOpenOpnameModal = useCallback((product: Product) => {
    setOpnameProduct(product);
    setIsOpnameModalOpen(true);
  }, []);

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newStockVal, reason }: { productId: string; newStockVal: number; reason: string }) => {
      const res = await api.post(`/cooperative/toko/${productId}/adjust-stock`, {
        newStock: newStockVal,
        reason: reason.trim() || undefined
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stok berhasil disesuaikan');
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      fetchProducts();
      setIsOpnameModalOpen(false);
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyesuaikan stok');
    }
  });

  const opnameSubmitLoading = adjustStockMutation.isPending;

  const handleOpnameSubmit = useCallback(async (newStockVal: number, reason: string) => {
    if (!opnameProduct) return;
    if (isNaN(newStockVal) || newStockVal < 0) {
      toast.error('Stok harus bernilai positif');
      return;
    }

    adjustStockMutation.mutate({
      productId: opnameProduct.id,
      newStockVal,
      reason
    });
  }, [opnameProduct, adjustStockMutation]);

  const handleImportProducts = useCallback(async (file: File, onProgress: (p: number) => void) => {
    return importDataFromExcel('/cooperative/toko/import', file, onProgress);
  }, []);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast.loading('Menyiapkan template...', { id: 'product-template-download' });
      const response = await api.get('/cooperative/toko/import/template', { responseType: 'blob' });
      downloadFileFromBlob(response.data, 'template_impor_produk_koperasi.xlsx');
      toast.success('Template berhasil diunduh.', { id: 'product-template-download' });
    } catch (e) {
      toast.error('Gagal mengunduh template.', { id: 'product-template-download' });
    }
  }, []);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(order);
  }, []);

  // Table Columns config
  const catalogColumns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { key: 'code', label: 'Kode', sortable: true },
      { 
        key: 'name', 
        label: 'Nama Produk', 
        className: 'font-medium', 
        sortable: true,
        render: (_value: unknown, row: Product) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden select-none">
              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                row.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
          </div>
        )
      },
      { key: 'category', label: 'Kategori', sortable: true },
      { 
        key: 'costPrice', 
        label: 'Harga Modal', 
        sortable: true,
        render: (_value: unknown, row: Product) => `Rp ${Number(row.costPrice || 0).toLocaleString('id-ID')}`
      },
      { 
        key: 'price', 
        label: 'Harga Jual', 
        sortable: true,
        render: (_value: unknown, row: Product) => `Rp ${Number(row.price || 0).toLocaleString('id-ID')}`
      },
      { 
        key: 'stock', 
        label: 'Stok', 
        sortable: true,
        render: (_value: unknown, row: Product) => (
          <span className={`font-bold ${row.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
            {row.stock} pcs
          </span>
        )
      }
    ];

    if (canUpdate || canDelete) {
      cols.push({ 
        key: 'actions', 
        label: 'Aksi', 
        render: (_value: unknown, row: Product) => (
          <div className="flex space-x-2">
            {canUpdate && (
              <>
                <Button size="sm" variant="secondary" onClick={() => handleOpenProductModal(row)} icon={<Edit size={14} />} aria-label="Edit Produk" />
                <Button size="sm" variant="outline" onClick={() => handleOpenOpnameModal(row)} icon={<Package size={14} />} aria-label="Opname Stok">
                  Opname
                </Button>
              </>
            )}
            {canDelete && (
              <Button size="sm" variant="danger" onClick={() => handleProductDeleteClick(row.id)} icon={<Trash size={14} />} aria-label="Hapus Produk" />
            )}
          </div>
        )
      });
    }

    return cols;
  }, [canUpdate, canDelete, handleOpenProductModal, handleOpenOpnameModal, handleProductDeleteClick]);

  const toolbarLeft = useMemo(() => (
    <div className="flex-1 relative suggestions-input w-full min-w-0 max-w-full md:max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        id="catalog-search"
        type="text"
        placeholder="Cari produk berdasarkan nama / kode..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        aria-label="Cari produk berdasarkan nama atau kode"
      />
    </div>
  ), [searchQuery]);

  const toolbarRight = useMemo(() => (
    <div className="w-full min-w-0 md:w-64">
      <SearchableSelect
        id="category-filter"
        options={categoryOptions}
        value={categoryFilter}
        onValueChange={setCategoryFilter}
        placeholder="Semua Kategori"
        clearable
      />
    </div>
  ), [categoryOptions, categoryFilter]);

  const renderProductMobileCard = useCallback((product: Product) => {
    const isLowStock = product.stock <= 5;
    return (
      <div 
        key={product.id}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 transition-all"
      >
        {/* Header: Code, Category & Name */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold">
                {product.code}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold">
                {product.category || 'Umum'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {product.name}
            </h4>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
            isLowStock 
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
          }`}>
            {product.stock} pcs
          </span>
        </div>

        {/* Prices & Action Bar */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Modal</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Rp {Number(product.costPrice || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Harga Jual</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                Rp {Number(product.price || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {(canUpdate || canDelete) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {canUpdate && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleOpenOpnameModal(product)} 
                    className="h-8 px-2.5 text-xs font-bold"
                  >
                    Opname
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handleOpenProductModal(product)} 
                    icon={<Edit size={13} />} 
                    className="h-8 w-8 p-0" 
                    aria-label="Edit Produk" 
                  />
                </>
              )}
              {canDelete && (
                <Button 
                  size="sm" 
                  variant="danger" 
                  onClick={() => handleProductDeleteClick(product.id)} 
                  icon={<Trash size={13} />} 
                  className="h-8 w-8 p-0" 
                  aria-label="Hapus Produk" 
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [canUpdate, canDelete, handleOpenOpnameModal, handleOpenProductModal, handleProductDeleteClick]);

  const mobileToolbar = useMemo(() => (
    <div className="flex flex-col gap-2.5 w-full">
      {canCreate && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => handleOpenProductModal()} icon={<Plus size={14} />} className="w-full justify-center">
            Tambah Produk
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} icon={<Upload size={14} />} className="w-full justify-center">
            Import Excel
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="mobile-catalog-search"
            type="text"
            placeholder="Cari produk berdasarkan nama / kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            aria-label="Cari produk"
          />
        </div>
        <div className="w-full">
          <SearchableSelect
            id="mobile-category-filter"
            options={categoryOptions}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="Semua Kategori"
            clearable
          />
        </div>
      </div>
    </div>
  ), [canCreate, handleOpenProductModal, searchQuery, categoryOptions, categoryFilter]);

  const emptyStateContent = useMemo(() => (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/50 shadow-xs">
        <Package size={28} />
      </div>
      <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mb-1">
        Belum Ada Produk di Katalog
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        Koperasi Anda belum memiliki produk terdaftar. Silakan tambahkan produk baru secara manual atau impor melalui file Excel.
      </p>
      {canCreate && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" onClick={() => handleOpenProductModal()} icon={<Plus size={14} />}>
            Tambah Produk Pertama
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} icon={<Upload size={14} />}>
            Import Excel
          </Button>
        </div>
      )}
    </div>
  ), [canCreate, handleOpenProductModal]);

  return (
    <div className="space-y-4">
      {isMobile ? (
        <MobileDataList
          title="Katalog Produk"
          data={paginatedProducts}
          loading={loading}
          totalItems={filteredProducts.length}
          onRefresh={fetchProducts}
          renderCard={renderProductMobileCard}
          pagination={{
            currentPage: currentPage,
            totalPages: totalPages,
            onPageChange: setCurrentPage
          }}
          toolbar={mobileToolbar}
          emptyMessage={emptyStateContent}
        />
      ) : (
        <>
          {canCreate && (
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 mb-3">
              <Button variant="outline" onClick={() => setImportOpen(true)} icon={<Upload size={16} />} className="w-full sm:w-auto">
                Import Excel
              </Button>
              <Button onClick={() => handleOpenProductModal()} icon={<Plus size={16} />} className="w-full sm:w-auto">
                Tambah Produk Baru
              </Button>
            </div>
          )}

          <Table 
            columns={catalogColumns}
            data={paginatedProducts} 
            loading={loading}
            emptyMessage={emptyStateContent}
            sortBy={sortKey}
            sortOrder={sortDirection}
            onSort={handleSort}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              totalItems: filteredProducts.length,
              itemsPerPage: limit,
              onPageChange: setCurrentPage,
              onLimitChange: setLimit
            }}
            rowKey="id"
            toolbarLeft={toolbarLeft}
            toolbarRight={toolbarRight}
          />
        </>
      )}

      <Suspense fallback={<div className="text-center py-4 text-sm text-gray-500">Memuat formulir modal...</div>}>
        {importOpen && (
          <ExcelImportModal
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            title="Import Produk Koperasi"
            onImport={handleImportProducts}
            onDownloadTemplate={handleTemplateDownload}
            onSuccess={() => {
              fetchProducts();
              fetchCategories();
            }}
            sampleDataHint="Pastikan format file sesuai dengan template. Kategori baru yang belum terdaftar akan otomatis ditambahkan ke database."
          />
        )}
        
        {isProductModalOpen && (
          <ProductFormModal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            editingProduct={editingProduct}
            onSubmit={handleProductSubmit}
            isLoading={productSubmitLoading}
            existingCategories={(categories || []).map(c => c.name)}
          />
        )}
        
        {isOpnameModalOpen && (
          <OpnameFormModal
            isOpen={isOpnameModalOpen}
            onClose={() => setIsOpnameModalOpen(false)}
            product={opnameProduct}
            onSubmit={handleOpnameSubmit}
            isLoading={opnameSubmitLoading}
          />
        )}
      </Suspense>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Konfirmasi Hapus Produk"
        description="Apakah Anda yakin ingin menghapus produk ini? Produk yang sudah memiliki transaksi penjualan historis atau pencatatan jurnal tidak dapat dihapus demi integritas akuntansi."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        onConfirm={handleProductDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setProductIdToDelete(null);
        }}
        style="danger"
        loading={deleteLoading}
      />
    </div>
  );
});

ProductCatalogTab.displayName = 'ProductCatalogTab';

export default ProductCatalogTab;
