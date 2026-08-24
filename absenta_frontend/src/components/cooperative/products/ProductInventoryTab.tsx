import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Table } from '../../ui';
import type { Column } from '../../ui/Table';
import { Modal } from '../ui/Modal';
import { 
  ArrowLeft, 
  Filter, 
  ArrowUpDown, 
  Search, 
  Barcode, 
  Package, 
  CheckCircle2,
  ChevronRight,
  History,
  MoreVertical,
  HelpCircle,
  Boxes
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { OpnameFormModal } from '../../../pages/cooperative/components/OpnameFormModal';
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
  minStock?: number;
  category: string;
  imageUrl?: string | null;
  unit?: string | null;
  rackLocation?: string | null;
  useStock?: boolean;
}

interface ProductInventoryTabProps {
  categories: ProductCategory[];
  products: Product[];
  fetchProducts: () => Promise<void>;
  loading?: boolean;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

export const ProductInventoryTab = React.memo<ProductInventoryTabProps>(({
  categories,
  products = [],
  fetchProducts,
  loading = false
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  // Search, Filter, and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'cost_desc'>('name_asc');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // 1:1 Kasir Pintar Navigation States
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);
  const [selectedProductForStockDetail, setSelectedProductForStockDetail] = useState<Product | null>(null);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [selectedProductForLog, setSelectedProductForLog] = useState<Product | null>(null);

  // Desktop Table pagination & sort states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [desktopSortKey, setDesktopSortKey] = useState('name');
  const [desktopSortDir, setDesktopSortDir] = useState<'asc' | 'desc'>('asc');

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newStockVal, reason }: { productId: string; newStockVal: number; reason: string }) => {
      const res = await api.post(`/cooperative/toko/${productId}/adjust-stock`, {
        newStock: newStockVal,
        reason
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Stok produk berhasil disesuaikan');
      setSelectedProductForAdjust(null);
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products'] });
      fetchProducts();
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.error(err.response?.data?.message || 'Gagal menyesuaikan stok');
    }
  });

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = prod.name.toLowerCase().includes(q) || prod.code.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'ALL' || (prod.category || '').toLowerCase() === selectedCategory.toLowerCase();
      
      let matchStatus = true;
      if (stockStatusFilter === 'OUT_OF_STOCK') {
        matchStatus = prod.stock <= 0;
      } else if (stockStatusFilter === 'LOW_STOCK') {
        matchStatus = prod.stock > 0 && prod.stock <= (prod.minStock || 5);
      } else if (stockStatusFilter === 'IN_STOCK') {
        matchStatus = prod.stock > 0;
      }

      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, stockStatusFilter]);

  // Sorted products for Mobile
  const sortedMobileProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'stock_asc') return a.stock - b.stock;
      if (sortOption === 'stock_desc') return b.stock - a.stock;
      if (sortOption === 'cost_desc') return Number(b.costPrice || 0) - Number(a.costPrice || 0);
      return 0;
    });
  }, [filteredProducts, sortOption]);

  const handleCycleSort = useCallback(() => {
    setSortOption(prev => {
      if (prev === 'name_asc') return 'name_desc';
      if (prev === 'name_desc') return 'stock_asc';
      if (prev === 'stock_asc') return 'stock_desc';
      return 'name_asc';
    });
    toast(`Urutan: ${
      sortOption === 'name_asc' ? 'Nama (Z ke A)' :
      sortOption === 'name_desc' ? 'Stok Terendah' :
      sortOption === 'stock_asc' ? 'Stok Tertinggi' : 'Nama (A ke Z)'
    }`, { id: 'sort-toast', duration: 1500 });
  }, [sortOption]);

  // Helper 2-letter Initials
  const getInitials = (name: string) => {
    if (!name) return 'PR';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2);
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Desktop columns
  const inventoryColumns: Column[] = useMemo(() => [
    { key: 'code', label: 'Kode / Barcode', sortable: true, className: 'font-mono font-bold' },
    { key: 'name', label: 'Nama Produk', sortable: true, className: 'font-semibold' },
    { key: 'category', label: 'Kategori', sortable: true },
    { 
      key: 'costPrice', 
      label: 'Hrg Beli Terakhir (Modal)', 
      sortable: true,
      render: (_val: unknown, row: Product) => `Rp ${Number(row.costPrice || 0).toLocaleString('id-ID')}`
    },
    { 
      key: 'price', 
      label: 'Harga Jual', 
      sortable: true,
      render: (_val: unknown, row: Product) => `Rp ${Number(row.price || 0).toLocaleString('id-ID')}`
    },
    { 
      key: 'stock', 
      label: 'Sisa Stok Fisik', 
      sortable: true,
      render: (_val: unknown, row: Product) => {
        const isLow = row.stock <= (row.minStock || 5);
        return (
          <span className={cn(
            "font-black px-2.5 py-0.5 rounded-full text-xs",
            row.stock <= 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" :
            isLow ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
          )}>
            {row.stock} {row.unit || 'pcs'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_val: unknown, row: Product) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedProductForAdjust(row)}
            className="text-xs font-bold"
          >
            Sesuaikan Stok
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedProductForLog(row)}
            className="text-xs font-bold"
          >
            Log Barang
          </Button>
        </div>
      )
    }
  ], []);

  const paginatedDesktopProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, currentPage, limit]);

  const totalPages = Math.ceil(filteredProducts.length / limit) || 1;

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────────────────
          MOBILE VIEW (1:1 Kasir Pintar Persona: Manajemen stok)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden -mx-4 -mt-2 space-y-3 pb-24 bg-white dark:bg-slate-950 min-h-[85vh]">
        
        {/* 1. App Bar Mobile */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-emerald-600 dark:text-emerald-400 active:scale-95 cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-bold text-base text-emerald-700 dark:text-emerald-400">
            Manajemen stok
          </h2>
        </div>

        {/* 2. Filter, Sort, and Search Bar */}
        <div className="px-4 flex items-center gap-2 pt-1">
          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              "p-2.5 rounded-xl border text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 active:scale-95 transition-transform shrink-0",
              selectedCategory !== 'ALL' || stockStatusFilter !== 'ALL'
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20" 
                : "border-slate-200 dark:border-slate-800"
            )}
            title="Filter Kategori / Status Stok"
          >
            <Filter size={18} />
          </button>

          {/* Sort Button */}
          <button
            type="button"
            onClick={handleCycleSort}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 active:scale-95 transition-transform shrink-0"
            title="Urutkan Produk"
          >
            <ArrowUpDown size={18} />
          </button>

          {/* Search Pill Input with Barcode Scanner Icon */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari nama atau kode barang"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => toast('Scanner Barcode siap digunakan')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              title="Scan Barcode"
            >
              <Barcode size={18} />
            </button>
          </div>
        </div>

        {/* 3. Products Stock Management List (1:1 Kasir Pintar) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
          {sortedMobileProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <Package size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
              Tidak ada barang ditemukan.
            </div>
          ) : (
            sortedMobileProducts.map(prod => {
              const sellPrice = Number(prod.price || 0);
              const costPrice = Number(prod.costPrice || 0);
              const initials = getInitials(prod.name);

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductForAction(prod)}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer active:bg-slate-100 dark:active:bg-slate-900 transition-colors flex items-start gap-3.5 select-none"
                >
                  {/* Product Thumbnail / 2-Letter Initials */}
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden font-bold text-slate-400 dark:text-slate-500 text-sm">
                    {prod.imageUrl ? (
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {/* Middle Column: Name, Code, Cost Price */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {prod.code}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Hrg Beli Terakhir Rp {costPrice.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Right Column: Selling Price & Current Stock */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Rp {sellPrice.toLocaleString('id-ID')}
                    </p>
                    <p className={cn(
                      "text-[11px] font-bold mt-1",
                      prod.stock <= (prod.minStock || 0) ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      Stok: {prod.stock} {prod.unit || 'pcs'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DESKTOP VIEW (Inventory Table)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-4">
        <Table
          columns={inventoryColumns}
          data={paginatedDesktopProducts}
          loading={loading}
          emptyMessage="Tidak ada data stok barang ditemukan."
          sortBy={desktopSortKey}
          sortOrder={desktopSortDir}
          onSort={(key, order) => {
            setDesktopSortKey(key);
            setDesktopSortDir(order);
          }}
          pagination={{
            currentPage,
            totalPages,
            totalItems: filteredProducts.length,
            itemsPerPage: limit,
            onPageChange: setCurrentPage,
            onLimitChange: setLimit
          }}
          rowKey="id"
          toolbarLeft={(
            <div className="flex items-center gap-3 w-full max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau kode barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          1:1 KASIR PINTAR "AKSI" MODAL POPUP (Mobile Persona)
          ─────────────────────────────────────────────────────────────────────── */}
      {selectedProductForAction && (
        <div className="fixed inset-0 z-[99999] bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            {/* Title */}
            <h3 className="text-center font-black text-sm tracking-wider uppercase text-slate-900 dark:text-slate-100">
              AKSI
            </h3>

            {/* Product Summary Row */}
            <div className="flex items-center gap-3 py-1">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden font-bold text-slate-400 dark:text-slate-500 text-sm">
                {selectedProductForAction.imageUrl ? (
                  <img 
                    src={selectedProductForAction.imageUrl} 
                    alt={selectedProductForAction.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span>{getInitials(selectedProductForAction.name)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {selectedProductForAction.name}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {selectedProductForAction.code}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Rp {Number(selectedProductForAction.price || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {selectedProductForAction.useStock === false ? 'Unlimited' : `${selectedProductForAction.stock} ${selectedProductForAction.unit || 'pcs'}`}
                </p>
              </div>
            </div>

            {/* Action Buttons: Edit / Lihat Stok & Log Barang */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  const prod = selectedProductForAction;
                  setSelectedProductForAction(null);
                  setSelectedProductForStockDetail(prod);
                }}
                className="w-full h-12 px-4 rounded-full border border-emerald-500/70 hover:border-emerald-600 dark:border-emerald-500/50 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 active:scale-98 transition-all hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 cursor-pointer"
              >
                <span>Edit / Lihat Stok</span>
                <ChevronRight size={16} className="text-slate-700 dark:text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const prod = selectedProductForAction;
                  setSelectedProductForAction(null);
                  setSelectedProductForLog(prod);
                }}
                className="w-full h-12 px-4 rounded-full border border-emerald-500/70 hover:border-emerald-600 dark:border-emerald-500/50 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 active:scale-98 transition-all hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 cursor-pointer"
              >
                <span>Log Barang</span>
                <ChevronRight size={16} className="text-slate-700 dark:text-slate-300" />
              </button>
            </div>

            {/* Confirmation / Dismiss Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedProductForAction(null)}
                className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center cursor-pointer active:scale-98 transition-transform"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          1:1 KASIR PINTAR "DETAIL SISA STOK" FULL VIEW (Mobile Persona)
          ─────────────────────────────────────────────────────────────────────── */}
      {selectedProductForStockDetail && (
        <div className="fixed inset-0 z-[99999] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col animate-in slide-in-from-right-5 duration-200">
          
          {/* 1. App Bar Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 shrink-0 pt-[calc(0.875rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProductForStockDetail(null)}
                className="p-1 -ml-1 text-emerald-600 dark:text-emerald-400 active:scale-95 cursor-pointer"
                aria-label="Kembali"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 className="font-bold text-base text-emerald-700 dark:text-emerald-400">
                Detail sisa stok
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedProductForAdjust(selectedProductForStockDetail)}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 active:scale-90 transition-transform cursor-pointer"
              title="Opsi Lanjutan"
            >
              <MoreVertical size={20} />
            </button>
          </div>

          {/* 2. Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Product Name & Code */}
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {selectedProductForStockDetail.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedProductForStockDetail.code}
              </p>
            </div>

            {/* Box 1: Harga Beli Terakhir Card (Outlined with Emerald Border) */}
            <div className="p-4 rounded-2xl border border-emerald-500/80 dark:border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Harga Beli Terakhir
                </span>
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
                  <span>Rp {Number(selectedProductForStockDetail.costPrice || 0).toLocaleString('id-ID')}</span>
                  <HelpCircle size={16} className="text-emerald-600 dark:text-emerald-400 opacity-80" />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                *Harga ini diambil dari pembelian terakhir
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Buka form input barang masuk untuk item ini');
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  Beli Barang
                </button>
              </div>
            </div>

            {/* Box 2: Sisa Modal Card (Big Central Soft Card) */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-center space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sisa modal
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Rp {(Number(selectedProductForStockDetail.costPrice || 0) * Number(selectedProductForStockDetail.stock || 0)).toLocaleString('id-ID')}
              </p>
            </div>

            {/* Bottom Two-Column Stats: Sisa stok & Harga Dasar */}
            <div className="flex items-center justify-between pt-2 px-1">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Sisa stok
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedProductForStockDetail.useStock === false ? 'Unlimited' : `${selectedProductForStockDetail.stock} ${selectedProductForStockDetail.unit || 'pcs'}`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Harga Dasar
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Rp {Number(selectedProductForStockDetail.costPrice || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Action to adjust stock */}
            <div className="pt-6">
              <button
                type="button"
                onClick={() => setSelectedProductForAdjust(selectedProductForStockDetail)}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center cursor-pointer active:scale-98 transition-transform"
              >
                Sesuaikan Stok Barang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Filter Kategori & Status Stok (Mobile)
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Manajemen Stok"
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Status Ketersediaan Stok
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ALL', label: 'Semua Stok' },
                { id: 'IN_STOCK', label: 'Tersedia' },
                { id: 'LOW_STOCK', label: 'Stok Menipis' },
                { id: 'OUT_OF_STOCK', label: 'Stok Habis' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStockStatusFilter(st.id as any)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all text-left",
                    stockStatusFilter === st.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Kategori Barang
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between",
                  selectedCategory === 'ALL' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <span>Semua Kategori</span>
                {selectedCategory === 'ALL' && <CheckCircle2 size={16} />}
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between",
                    selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{cat.name}</span>
                  {selectedCategory.toLowerCase() === cat.name.toLowerCase() && <CheckCircle2 size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Sesuaikan Stok Produk
          ─────────────────────────────────────────────────────────────────────── */}
      {selectedProductForAdjust && (
        <OpnameFormModal
          isOpen={Boolean(selectedProductForAdjust)}
          onClose={() => setSelectedProductForAdjust(null)}
          product={selectedProductForAdjust}
          onSubmit={async (newStockVal, reason) => {
            if (!selectedProductForAdjust) return;
            adjustStockMutation.mutate({
              productId: selectedProductForAdjust.id,
              newStockVal,
              reason
            });
          }}
          isLoading={adjustStockMutation.isPending}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Log Barang (Riwayat Mutasi & Transaksi Produk)
          ─────────────────────────────────────────────────────────────────────── */}
      {selectedProductForLog && (
        <Modal
          isOpen={Boolean(selectedProductForLog)}
          onClose={() => setSelectedProductForLog(null)}
          title={`Log Barang: ${selectedProductForLog.name}`}
        >
          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p className="text-slate-500 dark:text-slate-400">Kode: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedProductForLog.code}</span></p>
              <p className="text-slate-500 dark:text-slate-400">Stok Saat Ini: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedProductForLog.stock} {selectedProductForLog.unit || 'pcs'}</span></p>
              <p className="text-slate-500 dark:text-slate-400">Harga Modal: <span className="font-bold text-slate-800 dark:text-slate-200">Rp {Number(selectedProductForLog.costPrice || 0).toLocaleString('id-ID')}</span></p>
            </div>

            <div className="text-center py-8 text-slate-400 text-xs space-y-1">
              <History size={32} className="mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-600 dark:text-slate-300">Riwayat Mutasi Barang</p>
              <p className="text-[11px] text-slate-400">Seluruh mutasi tercatat otomatis melalui transaksi kasir dan faktur barang masuk.</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedProductForLog(null)}
                className="w-full font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

ProductInventoryTab.displayName = 'ProductInventoryTab';

export default ProductInventoryTab;
