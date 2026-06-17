import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { fetchCoopSettings, type CoopSettingsData, printCoopReceipt } from '../../../utils/cooperative/coopDocUtils';
import type { Subscription } from '../../../types/subscription';

export interface CoopMember {
  id: string;
  memberNo: string;
  name: string;
  type: 'STUDENT' | 'TEACHER' | 'siswa' | 'guru';
  sukarelaBalance: number;
  Siswa?: {
    nama_siswa: string;
  };
  Guru?: {
    nama_guru: string;
  };
  User?: {
    full_name: string;
  };
}

export interface Voucher {
  id: string;
  code: string;
  discount: string;
  validUntil: string | null;
}

export interface SaleItem {
  id?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    code: string;
  };
  quantity: number;
  price: string | number;
}

export interface SaleRecord {
  id: string;
  date: string;
  paymentMethod: 'CASH' | 'SAVING';
  discount: number;
  total: number;
  voucherCode?: string;
  cashReceived?: string | number;
  change?: number;
  memberId?: string | null;
  member?: CoopMember | null;
  items?: SaleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  stock: number;
  category?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface HeldCart {
  id: string;
  cart: CartItem[];
  selectedMember: CoopMember | null;
  appliedVoucher: Voucher | null;
  voucherCode: string;
  holdTime: string;
}

export interface NonMemberCandidate {
  id: string;
  name: string;
  type: 'siswa' | 'guru';
  identityNo?: string;
  nis?: string | null;
  nip?: string | null;
  className?: string;
}

export const usePOSState = () => {
  const { user, subscription, can } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);

  // States Koperasi Integrasi
  const [selectedMember, setSelectedMember] = useState<CoopMember | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<CoopMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'SAVING'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [pin, setPin] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastSaleRecord, setLastSaleRecord] = useState<SaleRecord | null>(null);
  const [coopSettings, setCoopSettings] = useState<CoopSettingsData | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // States for shopping history (catalog view)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [memberInfo, setMemberInfo] = useState<CoopMember | null>(null);

  // Voucher integration states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  // States for shopping history and held carts
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);

  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [nonMembers, setNonMembers] = useState<NonMemberCandidate[]>([]);
  const [nonMemberSearch, setNonMemberSearch] = useState('');
  const [loadingNonMembers, setLoadingNonMembers] = useState(false);
  const [selectedNonMember, setSelectedNonMember] = useState<NonMemberCandidate | null>(null);
  const [nextMemberNumber, setNextMemberNumber] = useState('');
  const [registerPin, setRegisterPin] = useState('123456');
  const [registering, setRegistering] = useState(false);
  const [selectedMemberPoints, setSelectedMemberPoints] = useState<number | null>(null);

  // Table Sorting and Pagination States
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [historySearch, setHistorySearch] = useState<string>('');

  const sub = subscription as (Subscription & {
    features?: string[];
    Plan?: { features_json?: string[] };
    plan?: { features_json?: string[] };
  }) | null;
  const features = sub?.features || 
                   sub?.Plan?.features_json || 
                   sub?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  const queryParams = new URLSearchParams(window.location.search);
  const isForceCatalog = queryParams.get('mode') === 'catalog';
  const hasCashierAccess = !isForceCatalog && can('cooperative.store.orders.manage');
  const canViewAllTx = can('cooperative.store.transactions.view');

  const pageTitle = hasCashierAccess 
    ? "Kasir Digital (POS)" 
    : (canViewAllTx ? "Audit Log Transaksi Toko" : "Katalog Belanja");
  const pageDesc = hasCashierAccess 
    ? "Transaksi penjualan koperasi" 
    : (canViewAllTx ? "Daftar dan audit seluruh riwayat transaksi penjualan retail" : "Daftar produk dan harga barang koperasi");

  const fetchProducts = useCallback(async () => {
    if (isLocked || subscription === undefined) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/cooperative/toko');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  }, [isLocked, subscription]);

  const fetchCategories = useCallback(async () => {
    if (isLocked || subscription === undefined) {
      setCategories([]);
      return;
    }
    try {
      const res = await api.get('/cooperative/toko/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [isLocked, subscription]);

  const loadCoopSettings = useCallback(async () => {
    if (isLocked || subscription === undefined) return;
    try {
      const data = await fetchCoopSettings();
      setCoopSettings(data);
    } catch (error) {
      console.error(error);
    }
  }, [isLocked, subscription]);

  const fetchSalesHistory = useCallback(async () => {
    try {
      setSalesLoading(true);
      const res = await api.get('/cooperative/toko/history');
      setSalesHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const fetchMemberInfo = useCallback(async () => {
    try {
      const res = await api.get('/cooperative/members/me');
      if (res.data?.success) {
        setMemberInfo(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch member info:', err);
    }
  }, []);

  useEffect(() => {
    if (subscription === undefined) return;
    fetchProducts();
    fetchCategories();
    loadCoopSettings();
    if (!hasCashierAccess) {
      fetchSalesHistory();
      fetchMemberInfo();
    }
  }, [subscription, fetchProducts, fetchCategories, loadCoopSettings, hasCashierAccess, fetchSalesHistory, fetchMemberInfo]);

  const addToCart = useCallback((product: Product) => {
      if (isLocked) return;
      if (product.stock <= 0) return toast.error('Stok habis');
      
      setCart(prevCart => {
        const existing = prevCart.find(c => c.id === product.id);
        if (existing) {
            if (existing.qty >= product.stock) {
              toast.error('Stok tidak cukup');
              return prevCart;
            }
            return prevCart.map(c => c.id === product.id ? {...c, qty: c.qty + 1} : c);
        } else {
            return [...prevCart, {...product, qty: 1}];
        }
      });
  }, [isLocked]);

  // Debounced Member Search
  useEffect(() => {
    if (memberSearch.trim().length < 2) {
      setMembers([]);
      setShowMemberDropdown(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoadingMembers(true);
        const res = await api.get(`/cooperative/toko/members?search=${memberSearch}`);
        setMembers(res.data);
        setShowMemberDropdown(true);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMembers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [memberSearch]);

  // Barcode Scanner Keypress Interceptor (Mendukung Scan Barang & Kartu Anggota)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Scanner inputs are extremely fast (interval < 50ms)
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const scannedCode = buffer.trim();
          // 1. Cari kecocokan produk
          const matchedProduct = products.find(p => p.code.toLowerCase() === scannedCode.toLowerCase());
          if (matchedProduct) {
            addToCart(matchedProduct);
            toast.success(`Scanned Barang: ${matchedProduct.name}`);
            e.preventDefault();
          } else {
            // 2. Jika tidak ada produk yang cocok, coba cari anggota berdasarkan nomor anggota
            try {
              const res = await api.get(`/cooperative/toko/members?search=${scannedCode}`);
              if (Array.isArray(res.data) && res.data.length > 0) {
                const matchedMember = res.data.find(
                  (m: CoopMember) => m.memberNo.toLowerCase() === scannedCode.toLowerCase()
                );
                if (matchedMember) {
                  setSelectedMember(matchedMember);
                  toast.success(`Scanned Anggota: ${matchedMember.name}`);
                  e.preventDefault();
                }
              }
            } catch (err) {
              console.error('Scanner member lookup failed:', err);
            }
          }
          buffer = '';
        }
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, addToCart, setSelectedMember]);

  const removeFromCart = useCallback((id: string) => {
      setCart(prevCart => prevCart.filter(c => c.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
      setCart(prevCart => prevCart.map(c => {
          if (c.id === id) {
              const newQty = c.qty + delta;
              if (newQty < 1) return c;
              if (newQty > c.stock) {
                  toast.error('Stok maksimal');
                  return c;
              }
              return {...c, qty: newQty};
          }
          return c;
      }));
  }, []);

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0), [cart]);

  const discountedTotal = useMemo(() => {
    if (!appliedVoucher) return totalAmount;
    return Math.max(0, totalAmount - Number(appliedVoucher.discount));
  }, [totalAmount, appliedVoucher]);

  const handleApplyVoucher = useCallback(async () => {
    if (!voucherCode.trim() || isLocked) return;
    setCheckingVoucher(true);
    try {
      const memberParam = selectedMember ? `&memberId=${selectedMember.id}` : '';
      const res = await api.get(`/cooperative/vouchers/check?code=${voucherCode.trim()}${memberParam}`);
      if (res.data && res.data.success) {
        setAppliedVoucher(res.data.voucher);
        toast.success(`Voucher diterapkan: Diskon Rp ${Number(res.data.voucher.discount).toLocaleString('id-ID')}`);
      }
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Kode voucher tidak valid');
      setAppliedVoucher(null);
    } finally {
      setCheckingVoucher(false);
    }
  }, [isLocked, voucherCode, selectedMember]);

  const handleRemoveVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.success('Voucher dibatalkan');
  }, []);

  const handleHoldCart = useCallback(() => {
    if (cart.length === 0) return;
    const newHeldCart: HeldCart = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      cart,
      selectedMember,
      appliedVoucher,
      voucherCode,
      holdTime: new Date().toISOString(),
    };
    setHeldCarts(prev => [newHeldCart, ...prev]);
    setCart([]);
    setSelectedMember(null);
    setAppliedVoucher(null);
    setVoucherCode('');
    setMemberSearch('');
    toast.success('Transaksi berhasil ditahan!');
  }, [cart, selectedMember, appliedVoucher, voucherCode]);

  const handleOpenQuickRegister = useCallback(() => {
    setRegisterType('STUDENT');
    setSelectedNonMember(null);
    setNonMembers([]);
    setNonMemberSearch('');
    setNextMemberNumber('');
    setRegisterPin('123456');
    setShowQuickRegisterModal(true);
  }, []);

  const fetchNextMemberNumber = useCallback(async () => {
    try {
      const res = await api.get('/cooperative/members/next-number');
      if (res.data && res.data.nextMemberNo) {
        setNextMemberNumber(res.data.nextMemberNo);
      }
    } catch (err) {
      console.error('Failed to fetch next member number:', err);
    }
  }, []);

  const handleRegisterSubmit = useCallback(async () => {
    if (!selectedNonMember || !nextMemberNumber || registerPin.length !== 6) return;
    setRegistering(true);
    try {
        const payload: {
            memberNo: string;
            type: 'STUDENT' | 'TEACHER';
            pin: string;
            siswaId?: string;
            guruId?: string;
        } = {
            memberNo: nextMemberNumber,
            type: registerType,
            pin: registerPin
        };
        if (registerType === 'STUDENT') {
            payload.siswaId = selectedNonMember.id;
        } else {
            payload.guruId = selectedNonMember.id;
        }

        const res = await api.post('/cooperative/members', payload);
        toast.success(`Anggota ${selectedNonMember.name} berhasil didaftarkan!`);
        
        try {
            const searchRes = await api.get(`/cooperative/toko/members?search=${nextMemberNumber}`);
            if (searchRes.data && searchRes.data.length > 0) {
                setSelectedMember(searchRes.data[0]);
            } else {
                setSelectedMember({
                    id: res.data.id,
                    memberNo: nextMemberNumber,
                    name: selectedNonMember.name,
                    type: registerType,
                    sukarelaBalance: 0
                });
            }
        } catch (searchErr) {
            console.error('Failed to auto-select new member:', searchErr);
            setSelectedMember({
                id: res.data.id,
                memberNo: nextMemberNumber,
                name: selectedNonMember.name,
                type: registerType,
                sukarelaBalance: 0
            });
        }
        
        setShowQuickRegisterModal(false);
    } catch (err: unknown) {
        console.error(err);
        const axiosError = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
        const errMsg = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message || 'Pendaftaran Gagal';
        toast.error(errMsg);
    } finally {
        setRegistering(false);
    }
  }, [selectedNonMember, nextMemberNumber, registerType, registerPin]);

  const handleCheckout = useCallback(() => {
      if (isLocked || cart.length === 0) return;
      setCashReceived('');
      setPin('');
      setVoucherCode('');
      setAppliedVoucher(null);
      setPaymentMethod('CASH');
      setCheckoutSuccess(false);
      setLastSaleRecord(null);
      setShowPaymentModal(true);
  }, [isLocked, cart]);

  const submitCheckout = useCallback(async () => {
    if (isLocked || cart.length === 0) return;
    
    setProcessing(true);
    try {
        const items = cart.map(c => ({
            productId: c.id,
            quantity: c.qty
        }));

        const res = await api.post('/cooperative/toko/checkout', {
            items,
            memberId: selectedMember?.id || null,
            paymentMethod,
            cashAmount: paymentMethod === 'CASH' ? Number(cashReceived) : null,
            changeAmount: paymentMethod === 'CASH' ? (Number(cashReceived) - discountedTotal) : null,
            pin: paymentMethod === 'SAVING' ? pin : null,
            voucherCode: appliedVoucher ? appliedVoucher.code : null
        });

        toast.success('Transaksi Berhasil!');
        setLastSaleRecord(res.data);
        setCheckoutSuccess(true);
        setCart([]);
        setPin('');
        setVoucherCode('');
        setAppliedVoucher(null);
        fetchProducts(); // Refresh stock
    } catch (error: unknown) {
        console.error(error);
        const axiosError = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
        const errMsg = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message || 'Transaksi Gagal';
        toast.error(errMsg);
    } finally {
        setProcessing(false);
    }
  }, [isLocked, cart, selectedMember, paymentMethod, cashReceived, pin, discountedTotal, appliedVoucher, fetchProducts]);

  const printReceipt = useCallback((sale: SaleRecord) => {
    if (!sale || !coopSettings) return;

    const saleMember = sale.member;
    const rawName = saleMember
      ? (saleMember.Siswa?.nama_siswa || saleMember.Guru?.nama_guru || saleMember.User?.full_name || 'Anggota')
      : (selectedMember?.name || memberInfo?.User?.full_name || (hasCashierAccess ? 'Umum' : user?.full_name) || 'Umum');

    const rawMemberNo = saleMember?.memberNo || selectedMember?.memberNo || memberInfo?.memberNo || '';
    const cashierName = hasCashierAccess ? (user?.full_name || 'Staff') : 'Mandiri';

    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, cashierName);
  }, [selectedMember, memberInfo, user, coopSettings, hasCashierAccess]);

  // Keyboard Listener (Hotkeys)
  useEffect(() => {
    if (!hasCashierAccess) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('searchProduct');
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        const memberInput = document.getElementById('searchMember');
        if (memberInput) {
          memberInput.focus();
          (memberInput as HTMLInputElement).select();
        }
      } else if (e.key === 'F9') {
        if (cart.length > 0 && !showPaymentModal) {
          e.preventDefault();
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        if (showPaymentModal && !processing) {
          e.preventDefault();
          setShowPaymentModal(false);
          setCheckoutSuccess(false);
          setLastSaleRecord(null);
          if (checkoutSuccess) {
            setSelectedMember(null);
            setMemberSearch('');
          }
        } else if (showQuickRegisterModal) {
          e.preventDefault();
          setShowQuickRegisterModal(false);
        } else if (showHeldCartsModal) {
          e.preventDefault();
          setShowHeldCartsModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [hasCashierAccess, cart, showPaymentModal, showQuickRegisterModal, showHeldCartsModal, processing, checkoutSuccess, handleCheckout]);

  // Debounced Non-Member Search
  useEffect(() => {
    if (nonMemberSearch.trim().length < 2) {
      setNonMembers([]);
      return;
    }
    if (selectedNonMember && nonMemberSearch === selectedNonMember.name) {
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoadingNonMembers(true);
        const res = await api.get('/cooperative/members/non-members', {
          params: {
            type: registerType,
            search: nonMemberSearch
          }
        });
        if (Array.isArray(res.data)) {
          setNonMembers(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch non-members:', err);
      } finally {
        setLoadingNonMembers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [nonMemberSearch, registerType, selectedNonMember]);

  // Selected Member Points Retrieval
  useEffect(() => {
    if (!selectedMember) {
      setSelectedMemberPoints(null);
      return;
    }
    const fetchPoints = async () => {
      try {
        const res = await api.get(`/cooperative/members/${selectedMember.id}`);
        if (res.data) {
          setSelectedMemberPoints(res.data.points || 0);
        }
      } catch (err) {
        console.error('Failed to fetch selected member points:', err);
      }
    };
    fetchPoints();
  }, [selectedMember]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.code.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || 
                              (p.category !== undefined && p.category.toLowerCase() === selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Client-side sorting & filtering for Sales History
  const processedSalesHistory = useMemo(() => {
    let result = [...salesHistory];
    
    if (historySearch) {
      const query = historySearch.toLowerCase();
      result = result.filter(sale => 
        sale.id.toLowerCase().includes(query) ||
        (sale.voucherCode && sale.voucherCode.toLowerCase().includes(query)) ||
        sale.paymentMethod.toLowerCase().includes(query)
      );
    }
    
    if (sortKey) {
      result.sort((a, b) => {
        let valA: string | number | boolean = '';
        let valB: string | number | boolean = '';
        
        if (sortKey === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else if (sortKey === 'total') {
          valA = Number(a.total);
          valB = Number(b.total);
        } else if (sortKey === 'discount') {
          valA = Number(a.discount);
          valB = Number(b.discount);
        } else {
          valA = (a[sortKey as keyof SaleRecord] ?? '') as string | number | boolean;
          valB = (b[sortKey as keyof SaleRecord] ?? '') as string | number | boolean;
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [salesHistory, sortKey, sortDirection, historySearch]);

  const paginatedSalesHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return processedSalesHistory.slice(startIndex, startIndex + limit);
  }, [processedSalesHistory, currentPage, limit]);

  const totalPages = Math.ceil(processedSalesHistory.length / limit) || 1;

  return {
    user,
    subscription,
    products,
    loading,
    cart,
    setCart,
    search,
    setSearch,
    processing,
    selectedMember,
    setSelectedMember,
    memberSearch,
    setMemberSearch,
    members,
    loadingMembers,
    showMemberDropdown,
    setShowMemberDropdown,
    showPaymentModal,
    setShowPaymentModal,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    pin,
    setPin,
    checkoutSuccess,
    setCheckoutSuccess,
    lastSaleRecord,
    setLastSaleRecord,
    coopSettings,
    categories,
    selectedCategory,
    setSelectedCategory,
    salesHistory,
    salesLoading,
    selectedSale,
    setSelectedSale,
    showReceiptModal,
    setShowReceiptModal,
    memberInfo,
    voucherCode,
    setVoucherCode,
    appliedVoucher,
    setAppliedVoucher,
    checkingVoucher,
    heldCarts,
    setHeldCarts,
    showHeldCartsModal,
    setShowHeldCartsModal,
    showQuickRegisterModal,
    setShowQuickRegisterModal,
    registerType,
    setRegisterType,
    nonMembers,
    setNonMembers,
    nonMemberSearch,
    setNonMemberSearch,
    loadingNonMembers,
    selectedNonMember,
    setSelectedNonMember,
    nextMemberNumber,
    registerPin,
    setRegisterPin,
    registering,
    selectedMemberPoints,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    limit,
    setLimit,
    historySearch,
    setHistorySearch,
    isLocked,
    hasCashierAccess,
    pageTitle,
    pageDesc,
    addToCart,
    removeFromCart,
    updateQty,
    totalAmount,
    discountedTotal,
    handleApplyVoucher,
    handleRemoveVoucher,
    handleHoldCart,
    handleOpenQuickRegister,
    fetchNextMemberNumber,
    handleRegisterSubmit,
    handleCheckout,
    submitCheckout,
    printReceipt,
    filteredProducts,
    paginatedSalesHistory,
    totalPages,
    processedSalesHistory
  };
};
