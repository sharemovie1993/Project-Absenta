import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { 
  ArrowLeft, 
  Filter, 
  ArrowUpDown, 
  Search, 
  Barcode, 
  Plus, 
  Package, 
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import OpnameDetail from '../../../pages/cooperative/components/OpnameDetail';
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
}

interface OpnameSession {
  id: string;
  opnameNumber: string;
  date: string;
  status: string;
  notes: string | null;
  items?: { id: string }[];
}

interface ProductOpnameTabProps {
  categories: ProductCategory[];
  products?: Product[];
  fetchProducts: () => Promise<void>;
  activeTab: 'catalog' | 'stock-in' | 'history' | 'categories' | 'opname';
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

export const ProductOpnameTab = React.memo<ProductOpnameTabProps>(({
  categories,
  products = [],
  fetchProducts,
  activeTab
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  // Mobile state filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'cost_desc'>('name_asc');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  // Desktop Opname Session state
  const [activeOpnameSessionId, setActiveOpnameSessionId] = useState<string | null>(null);
  const [isCreateOpnameModalOpen, setIsCreateOpnameModalOpen] = useState(false);
  const [newOpnameNotes, setNewOpnameNotes] = useState('');
  const [newOpnameCategoryFilter, setNewOpnameCategoryFilter] = useState('ALL');

  const opnameQuery = useQuery({
    queryKey: ['koperasi-opname-history'],
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/opname');
      return (Array.isArray(response.data) ? response.data : []) as OpnameSession[];
    },
    enabled: activeTab === 'opname',
    staleTime: 5 * 60 * 1000,
  });

  const opnameSessions = opnameQuery.data || [];
  const opnameLoading = opnameQuery.isLoading;
  const fetchOpnameSessions = async () => {
    await opnameQuery.refetch();
  };

  const createOpnameMutation = useMutation({
    mutationFn: async (payload: { notes: string; categoryFilter: string }) => {
      const response = await api.post('/cooperative/toko/opname', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Sesi Stock Opname berhasil dibuat');
      setNewOpnameNotes('');
      setNewOpnameCategoryFilter('ALL');
      setIsCreateOpnameModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['koperasi-opname-history'] });
      if (data?.id) {
        setActiveOpnameSessionId(data.id);
      }
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal membuat sesi stock opname');
    }
  });

  const createOpnameLoading = createOpnameMutation.isPending;

  const handleCreateOpnameSession = (e: React.FormEvent) => {
    e.preventDefault();
    createOpnameMutation.mutate({
      notes: newOpnameNotes.trim(),
      categoryFilter: newOpnameCategoryFilter
    });
  };

  // Adjust stock directly for a product
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

  // Filtered and Sorted products for Mobile Manajemen Stok
  const filteredProducts = useMemo(() => {
    let list = (products || []).filter(prod => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = prod.name.toLowerCase().includes(q) || prod.code.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'ALL' || (prod.category || '').toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });

    return list.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'stock_asc') return a.stock - b.stock;
      if (sortOption === 'stock_desc') return b.stock - a.stock;
      if (sortOption === 'cost_desc') return Number(b.costPrice || 0) - Number(a.costPrice || 0);
      return 0;
    });
  }, [products, searchQuery, selectedCategory, sortOption]);

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

  // Helper initials
  const getInitials = (name: string) => {
    if (!name) return 'PR';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2);
    return (words[0][0] + words[1][0]).toUpperCase();
  };

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
              selectedCategory !== 'ALL' ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-800"
            )}
            title="Filter Kategori"
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

          {/* Search Pill Input with Barcode Icon */}
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
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <Package size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
              Tidak ada produk ditemukan.
            </div>
          ) : (
            filteredProducts.map(prod => {
              const sellPrice = Number(prod.price || 0);
              const costPrice = Number(prod.costPrice || 0);
              const initials = getInitials(prod.name);

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductForAdjust(prod)}
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
          DESKTOP VIEW (Stock Opname Audit Sessions Table)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-4">
        {activeOpnameSessionId ? (
          <OpnameDetail
            sessionId={activeOpnameSessionId}
            onBack={() => {
              setActiveOpnameSessionId(null);
              fetchOpnameSessions();
            }}
            onFinalizeSuccess={() => {
              setActiveOpnameSessionId(null);
              fetchOpnameSessions();
              fetchProducts();
            }}
          />
        ) : (
          <div className="space-y-4">
            {canUpdate && (
              <div className="flex justify-end space-x-3 mb-2">
                <Button onClick={() => setIsCreateOpnameModalOpen(true)} icon={<Plus size={18} />}>
                  Buat Sesi Opname Baru
                </Button>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">Sesi Stock Opname</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Daftar sesi pemeriksaan dan pencocokan fisik stok barang koperasi.</p>
              </div>

              {opnameLoading ? (
                <div className="text-center py-12 text-gray-500">Memuat riwayat sesi opname...</div>
              ) : opnameSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Belum ada sesi stock opname yang dibuat. Klik tombol di atas untuk memulai.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nomor Sesi</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Catatan</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Item</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                      {(opnameSessions || []).map((sess) => (
                        <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-slate-100">
                            {sess.opnameNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                            {new Date(sess.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              sess.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40' :
                              sess.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/40' :
                              'bg-slate-50 text-slate-400 border border-slate-200'
                            }`}>
                              {sess.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 max-w-xs truncate">
                            {sess.notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center text-gray-700 dark:text-slate-300">
                            {sess.items?.length || 0} barang
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {sess.status === 'DRAFT' ? (
                              <Button 
                                size="sm" 
                                onClick={() => setActiveOpnameSessionId(sess.id)}
                              >
                                Lanjutkan Audit
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setActiveOpnameSessionId(sess.id)}
                              >
                                Lihat Laporan
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Filter Kategori Mobile
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Kategori Barang"
      >
        <div className="space-y-2 py-2">
          <button
            type="button"
            onClick={() => { setSelectedCategory('ALL'); setIsFilterModalOpen(false); }}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
              selectedCategory === 'ALL' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            )}
          >
            <span>Semua Kategori</span>
            {selectedCategory === 'ALL' && <CheckCircle2 size={16} />}
          </button>

          {(categories || []).map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setSelectedCategory(cat.name); setIsFilterModalOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
                selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <span>{cat.name}</span>
              {selectedCategory.toLowerCase() === cat.name.toLowerCase() && <CheckCircle2 size={16} />}
            </button>
          ))}
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
          MODAL: Buat Sesi Opname Baru (Desktop)
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpnameModalOpen}
        onClose={() => setIsCreateOpnameModalOpen(false)}
        title="Mulai Sesi Stock Opname Baru"
      >
        <form onSubmit={handleCreateOpnameSession} className="space-y-4">
          <p className="text-xs text-slate-500">
            Membuat sesi baru akan merekam stok seluruh produk koperasi saat ini sebagai draft pembanding. Anda dapat menyesuaikannya setelah menghitung stok fisik di lapangan.
          </p>
          
          <div>
            <label htmlFor="opname-cat-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Cakupan Kategori Barang
            </label>
            <SearchableSelect
              id="opname-cat-filter"
              options={[
                { value: 'ALL', label: 'Semua Kategori (Rekomendasi)' },
                ...(categories || []).map(c => ({ value: c.name, label: c.name }))
              ]}
              value={newOpnameCategoryFilter}
              onValueChange={setNewOpnameCategoryFilter}
              placeholder="Pilih cakupan kategori..."
            />
          </div>

          <Input
            id="opname-notes"
            label="Catatan / Keterangan Sesi"
            value={newOpnameNotes}
            onChange={(e) => setNewOpnameNotes(e.target.value)}
            placeholder="Misal: Opname Bulanan Juni, Audit Gudang..."
            aria-label="Catatan Sesi"
          />

          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsCreateOpnameModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              isLoading={createOpnameLoading}
            >
              Mulai Sesi Audit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

ProductOpnameTab.displayName = 'ProductOpnameTab';

export default ProductOpnameTab;
