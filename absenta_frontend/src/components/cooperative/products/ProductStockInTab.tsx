import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { 
  ArrowLeft, 
  Filter, 
  ArrowUpDown, 
  Search, 
  Barcode, 
  Scan, 
  Plus, 
  FilePlus, 
  MoreVertical, 
  Trash2, 
  Check, 
  Package, 
  X,
  CreditCard,
  Building2,
  Receipt,
  Truck,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductFormModal } from '../../../pages/cooperative/components/ProductFormModal';
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
  useStock?: boolean;
}

interface TempStockInItem {
  product: Product;
  quantity: number;
  costPrice: number;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

interface CoopSupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
}

interface ProductStockInTabProps {
  products: Product[];
  categories?: ProductCategory[];
  fetchProducts: () => Promise<void>;
  setActiveTab: (tab: 'catalog' | 'inventory' | 'stock-in' | 'history' | 'categories' | 'opname') => void;
  initialSelectedProduct?: Product | null;
  onClearInitialProduct?: () => void;
}

export const ProductStockInTab = React.memo<ProductStockInTabProps>(({
  products = [],
  categories = [],
  fetchProducts,
  setActiveTab,
  initialSelectedProduct,
  onClearInitialProduct
}) => {
  const queryClient = useQueryClient();

  // Mobile navigation step: 'SELECT' | 'SUMMARY' (Rincian Pembelian)
  const [mobileStep, setMobileStep] = useState<'SELECT' | 'SUMMARY'>('SELECT');

  // Stock-In states
  const [stockInSupplier, setStockInSupplier] = useState('');
  const [stockInSupplierId, setStockInSupplierId] = useState<string>('');
  const [stockInInvoiceNumber, setStockInInvoiceNumber] = useState('');
  const [stockInNotes, setStockInNotes] = useState('');
  const [stockInPaymentMethod, setStockInPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
  const [selectedStockInItems, setSelectedStockInItems] = useState<TempStockInItem[]>([]);
  const [stockInShippingFee, setStockInShippingFee] = useState<number>(0);

  // Fetch supplier list for checkout dropdown
  const { data: supplierList = [] } = useQuery<CoopSupplier[]>({
    queryKey: ['coop-suppliers'],
    queryFn: async () => {
      const res = await api.get('/cooperative/suppliers');
      return res.data;
    }
  });

  // Search, Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<'name_asc' | 'name_desc' | 'cost_asc' | 'cost_desc'>('name_asc');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Modals & Navigation
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TempStockInItem | null>(null);

  // Auto-select initial purchase product (e.g. from Detail Sisa Stok 'Beli Barang' button)
  useEffect(() => {
    if (initialSelectedProduct) {
      setSelectedStockInItems(prev => {
        const exists = prev.find(item => item.product.id === initialSelectedProduct.id);
        if (exists) return prev;
        return [
          ...prev,
          {
            product: initialSelectedProduct,
            quantity: 1,
            costPrice: Number(initialSelectedProduct.costPrice || 0)
          }
        ];
      });
      toast.success(`${initialSelectedProduct.name} ditambahkan ke pembelian`, { icon: '🛒' });
      onClearInitialProduct?.();
    }
  }, [initialSelectedProduct, onClearInitialProduct]);

  // Drafts LocalStorage
  const handleSaveDraft = useCallback(() => {
    if (selectedStockInItems.length === 0) {
      toast.error('Pilih minimal satu barang untuk disimpan sebagai draft');
      return;
    }
    const draftPayload = {
      items: selectedStockInItems,
      supplier: stockInSupplier,
      invoiceNumber: stockInInvoiceNumber,
      notes: stockInNotes,
      paymentMethod: stockInPaymentMethod,
      shippingFee: stockInShippingFee,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('absenta_coop_purchase_draft', JSON.stringify(draftPayload));
    toast.success('Draft pembelian berhasil disimpan', { icon: '📋' });
  }, [selectedStockInItems, stockInSupplier, stockInInvoiceNumber, stockInNotes, stockInPaymentMethod, stockInShippingFee]);

  const handleLoadDraft = useCallback(() => {
    const savedDraft = localStorage.getItem('absenta_coop_purchase_draft');
    if (!savedDraft) {
      toast.error('Tidak ada draft pembelian tersimpan');
      return;
    }
    try {
      const parsed = JSON.parse(savedDraft);
      setSelectedStockInItems(parsed.items || []);
      setStockInSupplier(parsed.supplier || '');
      setStockInInvoiceNumber(parsed.invoiceNumber || '');
      setStockInNotes(parsed.notes || '');
      setStockInPaymentMethod(parsed.paymentMethod || 'CASH');
      setStockInShippingFee(parsed.shippingFee || 0);
      setIsDraftsModalOpen(false);
      toast.success('Draft pembelian berhasil dimuat');
    } catch (e) {
      console.error(e);
      toast.error('Gagal membaca draft pembelian');
    }
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = prod.name.toLowerCase().includes(q) || prod.code.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'ALL' || (prod.category || '').toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'cost_asc') return Number(a.costPrice || 0) - Number(b.costPrice || 0);
      if (sortOption === 'cost_desc') return Number(b.costPrice || 0) - Number(a.costPrice || 0);
      return 0;
    });
  }, [filteredProducts, sortOption]);

  const handleCycleSort = useCallback(() => {
    setSortOption(prev => {
      if (prev === 'name_asc') return 'name_desc';
      if (prev === 'name_desc') return 'cost_asc';
      if (prev === 'cost_asc') return 'cost_desc';
      return 'name_asc';
    });
    toast(`Urutan: ${
      sortOption === 'name_asc' ? 'Nama (Z ke A)' :
      sortOption === 'name_desc' ? 'Harga Beli Terendah' :
      sortOption === 'cost_asc' ? 'Harga Beli Tertinggi' : 'Nama (A ke Z)'
    }`, { id: 'sort-toast', duration: 1500 });
  }, [sortOption]);

  // Cart operations
  const handleToggleProductInCart = useCallback((product: Product) => {
    setSelectedStockInItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          costPrice: Number(product.costPrice || 0)
        }
      ];
    });
  }, []);

  const handleUpdateItemQty = useCallback((productId: string, delta: number) => {
    setSelectedStockInItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as TempStockInItem[];
    });
  }, []);

  const handleSetItemQty = useCallback((productId: string, val: number) => {
    setSelectedStockInItems(prev => {
      if (val <= 0) {
        return prev.filter(item => item.product.id !== productId);
      }
      return prev.map(item => 
        item.product.id === productId ? { ...item, quantity: val } : item
      );
    });
  }, []);

  const handleSetItemCostPrice = useCallback((productId: string, val: number) => {
    setSelectedStockInItems(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, costPrice: val } : item
      )
    );
  }, []);

  const handleRemoveItem = useCallback((productId: string) => {
    setSelectedStockInItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const totalQuantity = useMemo(() => {
    return selectedStockInItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedStockInItems]);

  const totalCost = useMemo(() => {
    return selectedStockInItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [selectedStockInItems]);

  const grandTotal = useMemo(() => {
    return totalCost + (stockInShippingFee || 0);
  }, [totalCost, stockInShippingFee]);

  // Helper 2-letter Initials
  const getInitials = (name: string) => {
    if (!name) return 'PR';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2);
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Submit Stock In
  const submitStockInMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/cooperative/toko/stock-in', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Penerimaan barang masuk berhasil disimpan');
      setStockInSupplier('');
      setStockInSupplierId('');
      setStockInInvoiceNumber('');
      setStockInNotes('');
      setStockInPaymentMethod('CASH');
      setSelectedStockInItems([]);
      setStockInShippingFee(0);
      setIsCheckoutModalOpen(false);
      setMobileStep('SELECT');
      localStorage.removeItem('absenta_coop_purchase_draft');

      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-products'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-stock-in-history'] });
      fetchProducts();
      setActiveTab('history');
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      toast.error(err.response?.data?.message || 'Gagal menyimpan barang masuk');
    }
  });

  const handleFinalizePurchase = useCallback(() => {
    if (selectedStockInItems.length === 0) {
      toast.error('Pilih minimal satu barang untuk dibeli');
      return;
    }
    submitStockInMutation.mutate({
      supplier: stockInSupplierId
        ? (supplierList.find(s => s.id === stockInSupplierId)?.name || stockInSupplier.trim() || 'Supplier Umum')
        : (stockInSupplier.trim() || 'Supplier Umum'),
      supplierId: stockInSupplierId || undefined,
      invoiceNumber: stockInInvoiceNumber.trim() || undefined,
      notes: stockInNotes.trim() || undefined,
      paymentMethod: stockInPaymentMethod,
      shippingFee: stockInShippingFee,
      items: selectedStockInItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        costPrice: item.costPrice
      }))
    });
  }, [selectedStockInItems, stockInSupplier, stockInSupplierId, stockInInvoiceNumber, stockInNotes, stockInPaymentMethod, stockInShippingFee, submitStockInMutation, supplierList]);

  // Create Product on the Fly
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/cooperative/toko', {
        ...data,
        price: parseFloat(data.price),
        costPrice: data.costPrice ? parseFloat(data.costPrice) : 0,
        stock: data.stock ? parseInt(data.stock, 10) : 0,
        minStock: data.minStock ? parseInt(data.minStock, 10) : 0,
        weight: data.weight ? parseFloat(data.weight) : 0,
        discount: data.discount ? parseFloat(data.discount) : 0,
      });
      return res.data;
    },
    onSuccess: (newProd) => {
      toast.success('Produk baru berhasil dibuat');
      setIsCreateProductModalOpen(false);
      fetchProducts();
      if (newProd) {
        handleToggleProductInCart(newProd);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat produk');
    }
  });

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────────────────
          MOBILE VIEW (1:1 Kasir Pintar Persona: Pembelian & Rincian Pembelian)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden -mx-4 -mt-2 space-y-3 pb-48 bg-white dark:bg-slate-950 min-h-[90vh]">
        
        {/* =====================================================================
            MOBILE STEP 1: SELECT PRODUCTS
            ===================================================================== */}
        {mobileStep === 'SELECT' && (
          <>
            {/* 1. Header App Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="p-1 -ml-1 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={22} />
                </button>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Pembelian
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Draft Pill Button */}
                <button
                  type="button"
                  onClick={() => setIsDraftsModalOpen(true)}
                  className="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-transform cursor-pointer"
                >
                  <span>Draft</span>
                  <FilePlus size={14} />
                </button>

                {/* Overflow Options Menu */}
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="p-1 text-emerald-600 dark:text-emerald-400 active:scale-90 transition-transform cursor-pointer"
                  title="Riwayat Pembelian"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* 2. Search, Filter, Sort, & Barcode Scanners */}
            <div className="px-4 flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={cn(
                  "p-2.5 rounded-xl border text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 active:scale-95 transition-transform shrink-0",
                  selectedCategory !== 'ALL' ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
                )}
                title="Filter Kategori"
              >
                <Filter size={18} />
              </button>

              <button
                type="button"
                onClick={handleCycleSort}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 active:scale-95 transition-transform shrink-0"
                title="Urutkan"
              >
                <ArrowUpDown size={18} />
              </button>

              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  placeholder="Cari nama atau kode barang"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-9 pr-16 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <button
                    type="button"
                    onClick={() => toast('Scanner Barcode siap')}
                    className="p-1 hover:text-emerald-700 active:scale-90"
                    title="Scan Barcode"
                  >
                    <Barcode size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Kamera Scanner siap')}
                    className="p-1 hover:text-emerald-700 active:scale-90"
                    title="Scan Kamera"
                  >
                    <Scan size={17} />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Horizontal Category Filter Chips */}
            <div className="px-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer",
                  selectedCategory === 'ALL'
                    ? "border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                Semua item
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer",
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
                      ? "border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* 4. Products Selection List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
              {/* Top Option: Buat barang baru */}
              <div
                onClick={() => setIsCreateProductModalOpen(true)}
                className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer active:bg-slate-100 dark:active:bg-slate-900 transition-colors flex items-center gap-3.5 select-none"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                  <Plus size={22} />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Buat barang baru
                </span>
              </div>

              {sortedProducts.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  <Package size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                  Tidak ada produk ditemukan.
                </div>
              ) : (
                sortedProducts.map(prod => {
                  const costPrice = Number(prod.costPrice || 0);
                  const sellPrice = Number(prod.price || 0);
                  const initials = getInitials(prod.name);
                  const inCart = selectedStockInItems.find(item => item.product.id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleProductInCart(prod)}
                      className={cn(
                        "px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer active:bg-slate-100 dark:active:bg-slate-900 transition-colors flex items-center justify-between gap-3 select-none",
                        inCart ? "bg-emerald-50/30 dark:bg-emerald-950/20" : ""
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
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

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {prod.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Rp {costPrice.toLocaleString('id-ID')} <span className="text-slate-300 dark:text-slate-700">|</span> Rp {sellPrice.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {inCart && (
                        <div className="shrink-0 flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                          <span>{inCart.quantity} {prod.unit || 'pcs'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 5. Bottom Sticky Floating Cart Action Bar */}
            <div className="fixed bottom-[calc(135px+env(safe-area-inset-bottom))] inset-x-4 z-[9999] pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
              <div 
                onClick={() => {
                  if (selectedStockInItems.length === 0) {
                    toast.error('Pilih minimal 1 barang untuk melanjutkan pembelian');
                    return;
                  }
                  setMobileStep('SUMMARY');
                }}
                className="w-full h-13 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-between shadow-2xl cursor-pointer active:scale-98 transition-all border border-emerald-400/30 ring-4 ring-black/5 dark:ring-white/5"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-black">
                    {totalQuantity}
                  </span>
                  <span>Barang</span>
                </div>

                <span className="font-black text-sm tracking-wider uppercase">
                  LANJUT
                </span>
              </div>
            </div>
          </>
        )}

        {/* =====================================================================
            MOBILE STEP 2: RINCIAN PEMBELIAN (1:1 Kasir Pintar Persona)
            ===================================================================== */}
        {mobileStep === 'SUMMARY' && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
            {/* 1. App Bar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileStep('SELECT')}
                  className="p-1 -ml-1 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={22} />
                </button>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Pembelian
                </h2>
              </div>

              <div className="font-bold text-base text-slate-900 dark:text-slate-100">
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
            </div>

            {/* 2. Subheader Info Strip */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Ubah harga jual bisa dilakukan setelah pembelian selesai
            </div>

            {/* 3. Action Chips: [ ↑= Nama ] & [ + Biaya ] */}
            <div className="px-4 flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCycleSort}
                className="px-3.5 py-1.5 rounded-full border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowUpDown size={14} />
                <span>Nama</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddFeeModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <Plus size={14} />
                <span>Biaya {stockInShippingFee > 0 && `(Rp ${stockInShippingFee.toLocaleString('id-ID')})`}</span>
              </button>
            </div>

            {/* 4. Purchased Items List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 px-4 pt-1">
              {selectedStockInItems.map((item, idx) => {
                const initials = getInitials(item.product.name);
                const subtotal = item.quantity * item.costPrice;

                return (
                  <div
                    key={item.product.id}
                    onClick={() => setEditingItem(item)}
                    className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 active:bg-slate-100 dark:active:bg-slate-900 transition-colors select-none"
                  >
                    {/* Item Number */}
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">
                      {idx + 1}
                    </span>

                    {/* Circular Avatar Initials */}
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-400 dark:text-slate-500 text-xs uppercase">
                      {initials}
                    </div>

                    {/* Item Details & Cost Calculation */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.quantity} x Rp {item.costPrice.toLocaleString('id-ID')} = Rp {subtotal.toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Quantity Rounded Box Badge */}
                    <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                      {item.quantity}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. Bottom Action Bar: [ BAYAR ] & [ 📋+ SIMPAN ] */}
            <div className="fixed bottom-[calc(135px+env(safe-area-inset-bottom))] inset-x-4 z-[9999] pointer-events-auto flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(true)}
                className="flex-1 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider shadow-2xl flex items-center justify-center cursor-pointer active:scale-98 transition-transform border border-emerald-400/30 ring-4 ring-black/5 dark:ring-white/5"
              >
                BAYAR
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="h-13 px-6 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform cursor-pointer"
              >
                <FilePlus size={16} />
                <span>SIMPAN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DESKTOP VIEW (Classic Split Layout)
          ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Pilih Barang Pembelian (Kulakan)
            </h3>
            <Button
              size="sm"
              onClick={() => setIsCreateProductModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold"
            >
              <Plus size={14} /> Buat Barang Baru
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari nama atau barcode barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 border rounded-lg text-xs bg-white dark:bg-slate-900"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y border rounded-xl">
            {sortedProducts.map(prod => {
              const inCart = selectedStockInItems.find(item => item.product.id === prod.id);
              return (
                <div 
                  key={prod.id} 
                  onClick={() => handleToggleProductInCart(prod)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">{prod.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{prod.code} • Modal: Rp {Number(prod.costPrice || 0).toLocaleString('id-ID')}</p>
                  </div>
                  {inCart ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-xs">
                      {inCart.quantity} dipilih
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" className="text-xs font-bold">
                      + Tambah
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Desktop Cart Summary */}
        <Card className="p-6 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              Rincian Pembelian ({totalQuantity} Barang)
            </h3>
            <button 
              type="button" 
              onClick={handleSaveDraft}
              className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
            >
              Simpan Draft
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {selectedStockInItems.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Keranjang pembelian kosong</p>
            ) : (
              selectedStockInItems.map(item => (
                <div key={item.product.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold">{item.product.name}</span>
                    <button onClick={() => handleRemoveItem(item.product.id)} className="text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Jumlah Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleSetItemQty(item.product.id, parseInt(e.target.value, 10) || 1)}
                        className="w-full p-1 border rounded text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Harga Beli Satuan</label>
                      <input
                        type="number"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => handleSetItemCostPrice(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-full p-1 border rounded text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 pt-2 border-t text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold">Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-emerald-600">
              <span>Total Pembelian:</span>
              <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <Button
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={selectedStockInItems.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            Lanjutkan Pembelian
          </Button>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Edit Item Qty / Cost Price (Rincian Pembelian Mobile)
          ─────────────────────────────────────────────────────────────────────── */}
      {editingItem && (
        <Modal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title={`Edit: ${editingItem.product.name}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Kuantitas ({editingItem.product.unit || 'pcs'})
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateItemQty(editingItem.product.id, -1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-base"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={editingItem.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    handleSetItemQty(editingItem.product.id, val);
                    setEditingItem({ ...editingItem, quantity: val });
                  }}
                  className="flex-1 h-10 px-3 text-center border rounded-xl font-black text-sm bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateItemQty(editingItem.product.id, 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-base"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Modal Beli Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={editingItem.costPrice}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleSetItemCostPrice(editingItem.product.id, val);
                  setEditingItem({ ...editingItem, costPrice: val });
                }}
                className="w-full h-10 px-3 border rounded-xl font-bold bg-white dark:bg-slate-900"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  handleRemoveItem(editingItem.product.id);
                  setEditingItem(null);
                }}
                className="flex-1 font-bold"
              >
                Hapus Item
              </Button>
              <Button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Selesai
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Tambah Biaya Tambahan / Ongkir
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddFeeModalOpen}
        onClose={() => setIsAddFeeModalOpen(false)}
        title="Biaya Tambahan / Ongkir"
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Ongkos Kirim / Biaya Tambahan (Rp)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={stockInShippingFee || ''}
              onChange={(e) => setStockInShippingFee(parseFloat(e.target.value) || 0)}
              className="w-full h-11 px-3 border rounded-xl font-black text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsAddFeeModalOpen(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Simpan Biaya
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Checkout & Konfirmasi Pembelian (Mobile & Desktop)
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Konfirmasi Pembelian & Masuk Stok"
      >
        <div className="space-y-4 py-1 text-xs">
          
          {/* Supplier Selection: Dropdown dari DB + fallback manual */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Supplier *
            </label>
            <select
              value={stockInSupplierId}
              onChange={(e) => {
                setStockInSupplierId(e.target.value);
                if (e.target.value) setStockInSupplier(''); // clear manual input if DB supplier chosen
              }}
              className="w-full h-10 px-3 border rounded-xl bg-white dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">-- Pilih dari daftar atau ketik manual --</option>
              {supplierList.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}{sup.phone ? ` · ${sup.phone}` : ''}</option>
              ))}
            </select>
            {/* Manual fallback jika belum ada di daftar */}
            {!stockInSupplierId && (
              <input
                type="text"
                placeholder="Atau ketik nama supplier baru..."
                value={stockInSupplier}
                onChange={(e) => setStockInSupplier(e.target.value)}
                className="w-full h-10 px-3 mt-2 border rounded-xl bg-white dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Faktur / Nota
              </label>
              <input
                type="text"
                placeholder="Contoh: INV/2026/001"
                value={stockInInvoiceNumber}
                onChange={(e) => setStockInInvoiceNumber(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl bg-white dark:bg-slate-900 font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={stockInPaymentMethod}
                onChange={(e) => setStockInPaymentMethod(e.target.value as any)}
                className="w-full h-10 px-3 border rounded-xl bg-white dark:bg-slate-900 font-bold outline-none"
              >
                <option value="CASH">Tunai (Cash)</option>
                <option value="CREDIT">Tempo / Kredit</option>
              </select>
            </div>
          </div>

          {/* Grand Total Breakdown */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/30 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">Total Pembayaran:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              Rp {grandTotal.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="flex-1 font-bold"
            >
              Kembali
            </Button>
            <Button
              type="button"
              onClick={handleFinalizePurchase}
              disabled={submitStockInMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {submitStockInMutation.isPending ? 'Menyimpan...' : 'Selesaikan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Drafts Manager
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        title="Draft Pembelian"
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Simpan atau muat daftar pembelian yang sedang disusun agar tidak hilang saat berpindah halaman.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="p-4 rounded-2xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <FilePlus size={24} />
              <span>Simpan Draft Saat Ini</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDraft}
              className="p-4 rounded-2xl border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 size={24} />
              <span>Muat Draft Tersimpan</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Filter Kategori
          ─────────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Kategori Pembelian"
      >
        <div className="space-y-2 py-1 max-h-64 overflow-y-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => { setSelectedCategory('ALL'); setIsFilterModalOpen(false); }}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between",
              selectedCategory === 'ALL' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600" : "hover:bg-slate-50"
            )}
          >
            <span>Semua Kategori</span>
            {selectedCategory === 'ALL' && <CheckCircle2 size={16} />}
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setSelectedCategory(cat.name); setIsFilterModalOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between",
                selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600" : "hover:bg-slate-50"
              )}
            >
              <span>{cat.name}</span>
              {selectedCategory.toLowerCase() === cat.name.toLowerCase() && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: Buat Barang Baru On The Fly
          ─────────────────────────────────────────────────────────────────────── */}
      {isCreateProductModalOpen && (
        <ProductFormModal
          isOpen={isCreateProductModalOpen}
          onClose={() => setIsCreateProductModalOpen(false)}
          editingProduct={null}
          categories={categories}
          onSubmit={async (data) => {
            createProductMutation.mutate(data);
          }}
          isLoading={createProductMutation.isPending}
        />
      )}
    </div>
  );
});

ProductStockInTab.displayName = 'ProductStockInTab';

export default ProductStockInTab;
