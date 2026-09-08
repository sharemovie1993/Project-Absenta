import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid, 
  Package, 
  Search, 
  ArrowRight, 
  Sparkles,
  ShoppingBag,
  Clock,
  Briefcase,
  MessageCircle,
  Server,
  Calculator,
  CheckCircle2,
  FilterX
} from 'lucide-react';

import { Button } from '../ui';
import { getPublicPlans } from '../../api/plans.api';
import { getPublicModules } from '../../api/module.api';
import { 
  formatCurrency, 
  getServiceIcon 
} from '../../lib/billingUtils';
import { useCartStore } from '../../store/useCartStore';
import { CartDrawer } from './CartDrawer';
import { RABCalculatorModal } from './RABCalculatorModal';
import { ShopeeProductDetail } from './ShopeeProductDetail';
import { OrderReviewSidebar, OrderPayload } from './OrderReviewSidebar';
import { orderSubscriptionPlan } from '../../api/subscription.api';
import toast from 'react-hot-toast';

interface UnifiedCatalogProps {
  mode?: 'public' | 'private';
  ownedFeatures?: string[];
  ownedServices?: any[];
  onSelectPlan?: (plan: any) => void;
  activeAcademicTier?: string;
}

const CATEGORY_TABS = [
  { id: 'ALL', label: 'Semua Produk', icon: LayoutGrid },
  { id: 'PAKET_LENGKAP', label: 'Paket Komplit', icon: Sparkles, badge: 'Terpopuler' },
  { id: 'ABSENSI', label: 'Presensi Digital', icon: Clock },
  { id: 'KOPERASI', label: 'Koperasi & POS', icon: ShoppingBag },
  { id: 'HUBIN', label: 'Hubin & PKL', icon: Briefcase },
  { id: 'SARPRAS', label: 'Sarpras & Aset', icon: Package },
  { id: 'WHATSAPP', label: 'WhatsApp Gateway', icon: MessageCircle },
  { id: 'HARDWARE', label: 'Server & Hardware', icon: Server },
];

const SIZE_ORDER = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise', 'Pro', 'Ultra', 'Lite', 'Basic', 'Standard'];

const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];

export const UnifiedCatalog: React.FC<UnifiedCatalogProps> = ({ 
  mode = 'private', 
  ownedServices = [],
  onSelectPlan,
  activeAcademicTier = 'Micro'
}) => {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRABModalOpen, setIsRABModalOpen] = useState(false);

  // Direct SaaS Order State
  const [activeOrder, setActiveOrder] = useState<OrderPayload | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const addItemToCart = useCartStore((state) => state.addItem);

  const handleConfirmSaaSOrder = async () => {
    if (!activeOrder) return;
    setCheckoutProcessing(true);
    const toastId = toast.loading('Membuat invoice langganan SaaS...');
    try {
      const res: any = await orderSubscriptionPlan({
        plan_id: activeOrder.id,
        billing_period: activeOrder.period === 'YEAR' ? 'YEAR' : (activeOrder.period === 'ONETIME' ? 'ONETIME' : 'MONTH')
      });
      const isSuccess = Boolean(res?.success || res?.data?.success || res?.data?.checkout_url || res?.data?.checkout);
      if (isSuccess) {
        toast.success('Pesanan SaaS berhasil dibuat!', { id: toastId });
        setShowOrderPanel(false);
        const invData = res.data || res;
        const checkoutUrl = invData?.checkout_url || invData?.qr_url || invData?.pay_url || invData?.checkout?.public_url;
        const invId = invData?.invoice_id || invData?.token || invData?.invoice_token || invData?.checkout?.public_token;
        if (checkoutUrl && (checkoutUrl.startsWith('http://') || checkoutUrl.startsWith('https://'))) {
          window.location.href = checkoutUrl;
        } else if (invId) {
          navigate(`/billing/checkout?invoice_id=${invId}`);
        } else {
          navigate('/service-center?tab=invoices');
        }
      } else {
        toast.error(res?.message || res?.data?.message || 'Gagal memproses pesanan.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem pesanan.', { id: toastId });
    } finally {
      setCheckoutProcessing(false);
    }
  };

  const handleDirectPlanSelect = async (payload: any) => {
    if (onSelectPlan) {
      onSelectPlan(payload);
      return;
    }

    const isHardware = HARDWARE_MODULE_IDS.includes(payload.module_id || payload.group?.service_code || payload.service_code);
    if (isHardware) {
      addItemToCart({
        plan_id: payload.id,
        name: payload.name || payload.group?.baseName || 'Hardware Absenta',
        price: payload.price_onetime || payload.price_monthly || 0,
        type: 'HARDWARE_PERIPHERAL',
        billingPeriod: payload.period || 'ONETIME',
        moduleName: payload.moduleName || 'Hardware'
      });
      setCartOpen(true);
      toast.success('Hardware berhasil dimasukkan ke Keranjang Belanja!');
    } else {
      // Direct navigate to Absenta's Checkout Wizard Page
      const cycle = payload.period === 'YEAR' ? 'YEAR' : 'MONTH';
      navigate(`/billing/checkout?plan_id=${encodeURIComponent(payload.id)}&cycle=${cycle}`);
    }
  };

  // 1. Plans Query
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await getPublicPlans();
      const plans: any[] = Array.isArray((res.data as any)?.plans)
        ? (res.data as any).plans
        : Array.isArray(res.data) ? res.data : [];

      const hasHardware = plans.some((p: any) => HARDWARE_MODULE_IDS.includes(p.module_id));

      if (!hasHardware) {
        try {
          const hwRes = await fetch('https://api.absenta.id/api/license/packages?product_id=cakola');
          const hwData = await hwRes.json();
          if (hwData?.success && Array.isArray(hwData.data)) {
            const hwPlans = hwData.data
              .filter((h: any) => HARDWARE_MODULE_IDS.includes(h.module_id))
              .map((h: any) => ({
                id: h.id,
                name: h.name || h.title,
                module_id: h.module_id,
                service_code: h.service_code || h.module_id,
                price_monthly: h.price_monthly || 0,
                price_yearly: h.price_yearly || 0,
                price_onetime: h.price_onetime || Number(String(h.price || 0).replace(/[^0-9]/g, '')) || 0,
                weight_grams: h.weight_grams || 0,
                size_label: 'Unit',
                billing_period: h.billing_period || 'ONETIME',
                max_user: h.device_limit || 0,
                features_json: typeof h.features_json === 'string'
                  ? JSON.parse(h.features_json)
                  : (h.features_json || []),
                module: {
                  id: h.module_id,
                  name: h.module_id === 'SERVER_HARDWARE' ? 'Server Node'
                      : h.module_id === 'NETWORK_HARDWARE' ? 'Network Wi-Fi 6'
                      : h.module_id === 'PHYSICAL_SERVICE' ? 'Kartu & Cetak'
                      : 'Biometrik & RFID',
                  icon: h.module_id === 'SERVER_HARDWARE' ? 'Server'
                      : h.module_id === 'NETWORK_HARDWARE' ? 'Wifi'
                      : h.module_id === 'PHYSICAL_SERVICE' ? 'CreditCard'
                      : 'Fingerprint',
                }
              }));
            return [...plans, ...hwPlans];
          }
        } catch (err) {
          console.warn('[UnifiedCatalog] Hardware fallback fetch gagal:', err);
        }
      }

      return plans;
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Modules Query
  const modulesQuery = useQuery({
    queryKey: ['public-modules'],
    queryFn: async () => {
      const res = await getPublicModules();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const catalogPlans = plansQuery.data || [];

  const extractSizeLabel = (plan: any): string => {
    if (plan?.size_label) return plan.size_label;
    const name = String(plan?.name || plan?.title || '');
    const id = String(plan?.id || '');

    if (/\b(Micro)\b/i.test(name) || /MICRO/i.test(id)) return 'Micro';
    if (/\b(Small)\b/i.test(name) || /SMALL/i.test(id)) return 'Small';
    if (/\b(Medium)\b/i.test(name) || /MEDIUM/i.test(id)) return 'Medium';
    if (/\b(Large)\b/i.test(name) || /LARGE/i.test(id)) return 'Large';
    if (/\b(Enterprise)\b/i.test(name) || /ENTERPRISE/i.test(id)) return 'Enterprise';
    if (/\b(Ultra|Campus)\b/i.test(name) || /ULTRA/i.test(id)) return 'Ultra';

    const limit = plan?.device_limit || plan?.max_user || 0;
    if (limit > 0) {
      if (limit <= 300) return 'Micro';
      if (limit <= 600) return 'Small';
      if (limit <= 1200) return 'Medium';
      if (limit <= 2500) return 'Large';
      return 'Enterprise';
    }

    return 'Standard';
  };

  // Grouping products into unique solutions
  const allGroupedProducts = useMemo(() => {
    if (!catalogPlans || !Array.isArray(catalogPlans)) return [];

    // Filter out Academic Core / CORE plans entirely from the catalog
    const nonCorePlans = catalogPlans.filter((p: any) => {
      const code = String(p.code || p.service_code || '').toUpperCase();
      const name = String(p.name || '').toUpperCase();
      return !code.includes('CORE') && !name.includes('CORE_PLATFORM') && !name.includes('ACADEMIC CORE');
    });

    const products: Record<string, any> = {};

    nonCorePlans.forEach((p: any) => {
      const isHardware = HARDWARE_MODULE_IDS.includes(p.module_id) ||
        p.service_code === 'HARDWARE' || p.service_code === 'PHYSICAL_GOODS' ||
        p.type === 'HARDWARE_PERIPHERAL' || p.type === 'PHYSICAL_SERVICE' ||
        p.id.includes('SERVER') || p.id.includes('DELL') || p.id.includes('HW_') || p.id.startsWith('SVC_');

      let cleanBaseName = isHardware
        ? p.name
        : p.name
            .replace(/\((.*?)\)/g, '')
            .replace(/\b(Micro|Small|Medium|Large|Enterprise|Pro|Basic|Ultra|Lite)\b/gi, '')
            .replace(/\b(Bulanan|Tahunan|Monthly|Yearly|Daily|Mingguan)\b/gi, '')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

      const moduleName = p.module?.name || 'Layanan';
      const planMode = p.absensi_mode || (p.name.includes('Multi') ? 'MULTI_SESI' : 'SIMPLE');

      let groupKey = p.module_id ? `${p.module_id}-${planMode}` : `${cleanBaseName}-${planMode}`;
      let categoryKey = 'SAAS';
      let imageUrl = '/assets/modules/absensi-simple.png';
      let cleanDescription = 'Solusi presensi digital sekolah terintegrasi.';
      let highlightBadge = 'Sesuai Juknis BOS';
      
      if (isHardware) {
        categoryKey = 'HARDWARE';
        const idUp = (p.id || '').toUpperCase();
        const nameUp = (p.name || '').toUpperCase();
        
        if (idUp.includes('DELL') || nameUp.includes('DELL')) {
          groupKey = 'HW_GROUP_DELL_SERVER';
          cleanBaseName = 'Server Dell PowerEdge Build-Up';
          imageUrl = '/assets/modules/server.png';
          cleanDescription = 'Server fisik performa tinggi Dell PowerEdge untuk engine lokal offline/hybrid sekolah.';
          highlightBadge = 'Garansi Resmi 3 Tahun';
        } else if (idUp.includes('NODE') || nameUp.includes('MINI PC') || nameUp.includes('WORKSTATION')) {
          groupKey = 'HW_GROUP_MINI_PC';
          cleanBaseName = 'Absenta Mini PC & Workstation Server';
          imageUrl = '/assets/modules/server.png';
          cleanDescription = 'Unit Mini PC hemat daya untuk mesin antrean, kiosk presensi, dan mini server kelas.';
          highlightBadge = 'Hemat Daya 25 Watt';
        } else if (idUp.includes('AP_') || idUp.includes('SWITCH') || nameUp.includes('WI-FI') || nameUp.includes('SWITCH')) {
          groupKey = 'HW_GROUP_NETWORK';
          cleanBaseName = 'Perangkat Jaringan Network & Wi-Fi 6';
          imageUrl = '/assets/modules/absensi.png';
          cleanDescription = 'Access Point Enterprise Wi-Fi 6 berkecepatan gigabit & Switch PoE Managed stabil.';
          highlightBadge = 'Gigabit PoE Managed';
        } else if (idUp.includes('FP_') || idUp.includes('RFID') || nameUp.includes('HIKVISION') || nameUp.includes('ZKTECO') || nameUp.includes('FINGERPRINT') || nameUp.includes('SOLUTION') || nameUp.includes('FACE')) {
          groupKey = 'HW_GROUP_TERMINAL';
          cleanBaseName = 'Terminal Presensi Absensi (Fingerprint & Wajah)';
          imageUrl = '/assets/modules/absensi-simple.png';
          cleanDescription = 'Mesin absensi sidik jari & deteksi wajah berkecepatan tinggi dengan integrasi API langsung.';
          highlightBadge = 'Multi-Biometrik & RFID';
        } else if (idUp.includes('SVC_') || idUp.includes('PVC') || nameUp.includes('KARTU') || nameUp.includes('MIFARE')) {
          groupKey = 'HW_GROUP_PVC_CARDS';
          cleanBaseName = 'Kartu Pelajar PVC RFID Mifare 13.56MHz';
          imageUrl = '/assets/modules/absensi.png';
          cleanDescription = 'Cetak kartu pelajar smartcard PVC custom design full color dengan chip RFID Mifare asli.';
          highlightBadge = 'Custom Full Color';
        } else {
          groupKey = `HW_${p.module_id || p.id}`;
          imageUrl = '/assets/modules/server.png';
          cleanDescription = 'Perangkat keras pendukung ekosistem Absenta.';
          highlightBadge = 'Hardware Resmi';
        }
      } else {
        const pNameUp = (p.name || '').toUpperCase();
        const pIdUp = (p.id || '').toUpperCase();
        if (pNameUp.includes('PAKET LENGKAP') || pIdUp.includes('PAKET_LENGKAP')) {
          groupKey = 'SAAS_GROUP_PAKET_LENGKAP';
          categoryKey = 'PAKET_LENGKAP';
          cleanBaseName = 'Paket Lengkap All-in-One Platform Absenta';
          imageUrl = '/assets/modules/absensi.png';
          cleanDescription = 'Bundling komplit seluruh modul: Presensi Multi-Sesi, POS Koperasi, Hubin PKL, Sarpras, & WA Gateway.';
          highlightBadge = 'Semua Modul Termasuk';
        } else if (pNameUp.includes('WHATSAPP') || pIdUp.includes('WHATSAPP')) {
          groupKey = 'SAAS_GROUP_WHATSAPP';
          categoryKey = 'WHATSAPP';
          cleanBaseName = 'WhatsApp Service & Broadcast Pengingat';
          imageUrl = '/assets/modules/whatsapp.png';
          cleanDescription = 'Engine notifikasi WhatsApp real-time untuk info presensi kehadiran, tagihan SPP, & pengumuman sekolah.';
          highlightBadge = 'Broadcast Real-Time';
        } else if (pNameUp.includes('HUBUNGAN INDUSTRI') || pIdUp.includes('HUBIN')) {
          groupKey = 'SAAS_GROUP_HUBIN';
          categoryKey = 'HUBIN';
          cleanBaseName = 'Modul Hubungan Industri (Jurnal PKL & Tracer)';
          imageUrl = '/assets/modules/hubin.png';
          cleanDescription = 'Digitalisasi kemitraan industri, bursa kerja khusus (BKK), jurnal harian magang, & Tracer Study alumni.';
          highlightBadge = 'Kurikulum Merdeka SMK';
        } else if (pNameUp.includes('KOPERASI') || pIdUp.includes('KOPERASI')) {
          groupKey = 'SAAS_GROUP_KOPERASI';
          categoryKey = 'KOPERASI';
          cleanBaseName = 'Modul Koperasi Sekolah & POS Kantin';
          imageUrl = '/assets/modules/koperasi.png';
          cleanDescription = 'Sistem kasir POS minimarket & kantin sekolah, e-money kartu siswa, simpan pinjam, & SHU.';
          highlightBadge = 'Cashless Smartcard';
        } else if (pNameUp.includes('INVENTORY') || pNameUp.includes('SARPRAS') || pIdUp.includes('SARPRAS')) {
          groupKey = 'SAAS_GROUP_SARPRAS';
          categoryKey = 'SARPRAS';
          cleanBaseName = 'Modul Manajemen Sarana & Prasarana';
          imageUrl = '/assets/modules/inventory.png';
          cleanDescription = 'Pendataan aset inventaris sekolah, barcode QR barang, jadwal pemeliharaan, & peminjaman alat.';
          highlightBadge = 'Barcode & Aset Sekolah';
        } else if (pNameUp.includes('MULTI') || planMode === 'MULTI_SESI') {
          groupKey = 'SAAS_GROUP_ABSENSI_MULTI';
          categoryKey = 'ABSENSI';
          cleanBaseName = 'Presensi Digital Multi-Sesi (Shift & Magang)';
          imageUrl = '/assets/modules/absensi-multi-sesi.png';
          cleanDescription = 'Presensi fleksibel untuk sekolah multi-shift, monitoring siswa magang DUDI, dan lembur GTK.';
          highlightBadge = 'Multi-Shift & DUDI';
        } else {
          groupKey = 'SAAS_GROUP_ABSENSI_SIMPLE';
          categoryKey = 'ABSENSI';
          cleanBaseName = 'Presensi Digital Standar (Siswa & GTK)';
          imageUrl = '/assets/modules/absensi-simple.png';
          cleanDescription = 'Presensi digital terintegrasi RFID, QR Code, Geofencing GPS, dan WhatsApp notifikasi otomatis.';
          highlightBadge = 'RFID & Geofencing GPS';
        }
      }

      if (!products[groupKey]) {
        products[groupKey] = {
          id: groupKey,
          categoryKey: categoryKey,
          baseName: cleanBaseName || p.name,
          module: isHardware ? cleanBaseName : moduleName,
          module_id: p.module_id,
          icon: isHardware ? (groupKey.includes('DELL') || groupKey.includes('MINI') ? 'Server' : groupKey.includes('NETWORK') ? 'Wifi' : groupKey.includes('PVC') ? 'CreditCard' : 'Scan') : (p.module?.icon || (groupKey.includes('WHATSAPP') ? 'MessageCircle' : groupKey.includes('HUBIN') ? 'Briefcase' : 'Package')),
          service_code: p.service_code,
          mode: planMode,
          isHardware: isHardware,
          imageUrl: imageUrl,
          description: cleanDescription,
          highlightBadge: highlightBadge,
          variants: [],
          uniqueSizes: new Set<string>(),
        };
      }

      const size = extractSizeLabel(p);
      products[groupKey].uniqueSizes.add(size);
      products[groupKey].variants.push(p);
    });

    return Object.values(products).map(p => ({
      ...p,
      sizes: Array.from(p.uniqueSizes as Set<string>).sort((a: string, b: string) => {
        const ai = SIZE_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
        const bi = SIZE_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }),
    }));
  }, [catalogPlans]);

  // Filtered by Category Tab & Search Query
  const displayedProducts = useMemo(() => {
    return allGroupedProducts.filter((p) => {
      // Category Filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'HARDWARE' && !p.isHardware) return false;
        if (selectedCategory !== 'HARDWARE' && p.categoryKey !== selectedCategory) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.baseName.toLowerCase().includes(query);
        const descMatch = p.description.toLowerCase().includes(query);
        const modMatch = (p.module || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !modMatch) return false;
      }

      return true;
    });
  }, [allGroupedProducts, selectedCategory, searchQuery]);

  if (selectedGroup) {
    return (
      <div className="w-full min-w-0">
        <ShopeeProductDetail
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          onCheckout={handleDirectPlanSelect}
          activeAcademicTier={activeAcademicTier}
          ownedServices={ownedServices}
          checkoutProcessing={checkoutProcessing}
        />
        {mode === 'private' && (
          <>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="fixed bottom-6 right-6 z-40 p-3.5 sm:p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/50 flex items-center gap-3 border border-indigo-400/40 hover:scale-105 active:scale-95 transition-all hidden md:flex"
              aria-label="Buka Keranjang Belanja"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartItems.reduce((sum, item) => sum + item.qty, 0) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-indigo-600 animate-in zoom-in">
                    {cartItems.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </div>
              <span className="text-xs font-black uppercase tracking-wider">
                Keranjang
              </span>
            </button>
            <CartDrawer />
            <OrderReviewSidebar
              showOrderPanel={showOrderPanel}
              activeOrder={activeOrder}
              checkoutProcessing={checkoutProcessing}
              setShowOrderPanel={setShowOrderPanel}
              setActiveOrder={setActiveOrder}
              handleCheckout={handleConfirmSaaSOrder}
              activeAcademicTier={activeAcademicTier}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. COMPACT 1-ROW FILTER & ACTION TOOLBAR (NO GREETING BANNER) ── */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar flex-1 min-w-0">
            {CATEGORY_TABS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-[1.01]'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                  <span>{cat.label}</span>
                  {cat.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      isSelected ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & RAB Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari solusi / modul..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setIsRABModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 shrink-0 h-8"
            >
              <Calculator size={13} />
              <span>Simulasi RAB BOS</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. PRODUCT GRID SECTION ── */}
      <div>
        <AnimatePresence mode="wait">
          {plansQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 sm:p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse h-60 sm:h-[340px]" />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-inner">
                <FilterX size={22} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tidak Ada Produk yang Cocok
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mt-0.5">
                  Tidak ditemukan produk untuk pencarian <strong>"{searchQuery || selectedCategory}"</strong>.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                className="text-xs font-bold rounded-lg h-8 px-3"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
              {displayedProducts.map((group) => {
                const matchingService = mode === 'private' ? ownedServices.find((s: any) => {
                  const sModuleId = String(s.Plan?.module_id || s.plan_snapshot?.module_id || '').trim().toUpperCase();
                  const sMode = String(s.Plan?.absensi_mode || s.plan_snapshot?.absensi_mode || 'SIMPLE').trim().toUpperCase();
                  const gModuleId = String(group.module_id || '').trim().toUpperCase();
                  const gMode = String(group.mode || 'SIMPLE').trim().toUpperCase();
                  return sModuleId === gModuleId && (gModuleId !== 'ABSENSI' || sMode === gMode);
                }) : null;

                const isActive = !!matchingService;

                return (
                  <ProductCatalogCard
                    key={group.id}
                    group={group}
                    mode={mode}
                    isActive={isActive}
                    onSelectGroup={(g) => setSelectedGroup(g)}
                  />
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. FLOATING CART & DRAWER MODALS ── */}
      {mode === 'private' && (
        <>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 p-3 sm:p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 flex items-center gap-2.5 border border-indigo-400/40 hover:scale-105 active:scale-95 transition-all"
            aria-label="Buka Keranjang Belanja"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartItems.reduce((sum, item) => sum + item.qty, 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-indigo-600 animate-in zoom-in">
                  {cartItems.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-xs font-bold hidden sm:inline">
              Keranjang
            </span>
          </button>
          <CartDrawer />
          <OrderReviewSidebar
            showOrderPanel={showOrderPanel}
            activeOrder={activeOrder}
            checkoutProcessing={checkoutProcessing}
            setShowOrderPanel={setShowOrderPanel}
            setActiveOrder={setActiveOrder}
            handleCheckout={handleConfirmSaaSOrder}
            activeAcademicTier={activeAcademicTier}
          />
          <RABCalculatorModal
            isOpen={isRABModalOpen}
            onClose={() => setIsRABModalOpen(false)}
            availablePlans={plansQuery.data || []}
            onApplyOrder={(items) => {
              items.forEach(item => {
                addItemToCart({
                  plan_id: item.plan.id,
                  name: item.plan.name,
                  price: item.plan.price_onetime || item.plan.price_monthly || 0,
                  type: item.plan.type || 'SOFTWARE_SUBSCRIPTION',
                  billingPeriod: item.plan.billing_period || 'ONETIME',
                  moduleName: item.plan.module?.name || 'Modul'
                });
              });
              setCartOpen(true);
              toast.success('Hasil rancangan RAB berhasil dimasukkan ke Keranjang Belanja!');
            }}
          />
        </>
      )}
    </div>
  );
};

// ── SHOPEE-STYLE 2-COLUMN COMPACT PRODUCT CATALOG CARD ──
interface ProductCatalogCardProps {
  group: any;
  mode?: 'public' | 'private';
  isActive?: boolean;
  onSelectGroup?: (group: any) => void;
  onSelectPlan?: (plan: any) => void;
}

const ProductCatalogCard: React.FC<ProductCatalogCardProps> = ({
  group,
  isActive,
  onSelectGroup,
  onSelectPlan
}) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const isHardware = Boolean(group.isHardware);

  // Lowest starting price in the group
  const lowestPrice = useMemo(() => {
    const prices = group.variants.map((v: any) =>
      (v.price_onetime && v.price_onetime > 0) ? v.price_onetime : (v.price_monthly || v.price_yearly || 0)
    ).filter((p: number) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [group.variants]);

  const IconComp = getServiceIcon(group.service_code, group.icon);

  const handleCardClick = () => {
    if (onSelectGroup) {
      onSelectGroup(group);
    } else if (onSelectPlan) {
      onSelectPlan(group);
    } else {
      navigate(`/services/${group.id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={handleCardClick}
      className="cursor-pointer bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:border-indigo-500/40 transition-all flex flex-col justify-between overflow-hidden group"
    >
      {/* ── 1. PRODUCT IMAGE COVER BANNER ── */}
      <div className="relative h-28 sm:h-36 md:h-44 w-full bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 dark:from-slate-800/70 dark:via-slate-900 dark:to-indigo-950/30 p-2 sm:p-4 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800/80">
        {group.imageUrl && !imgError ? (
          <img
            src={group.imageUrl}
            alt={group.baseName}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain filter drop-shadow-xs group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
            <IconComp size={28} className="sm:w-9 sm:h-9" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex items-center gap-1 z-10">
          <span className="px-1.5 py-0.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-slate-900/85 dark:bg-slate-950/90 backdrop-blur-md text-white border border-white/10 shadow-2xs">
            {isHardware ? 'Hardware' : 'Cloud SaaS'}
          </span>
        </div>

        <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10">
          {isActive ? (
            <span className="bg-emerald-600 text-white font-bold text-[8px] sm:text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md sm:rounded-lg shadow-2xs flex items-center gap-0.5">
              <CheckCircle2 size={9} />
              <span>Aktif</span>
            </span>
          ) : !isHardware ? (
            <span className="bg-amber-500 text-white font-bold text-[8px] sm:text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md sm:rounded-lg shadow-2xs">
              Diskon
            </span>
          ) : null}
        </div>
      </div>

      {/* ── 2. PRODUCT INFO & DETAILS ── */}
      <div className="p-2.5 sm:p-4 md:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <div className="text-[8px] sm:text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">
              {group.module}
            </div>
            <div className="flex items-center text-amber-500 text-[9px] sm:text-[10.5px] font-bold gap-0.5 shrink-0">
              <span>★ 5.0</span>
            </div>
          </div>

          <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-0">
            {group.baseName}
          </h3>

          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed line-clamp-2">
            {group.description}
          </p>

          {/* Highlight Badge */}
          {group.highlightBadge && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[8.5px] sm:text-[10px] font-semibold border border-indigo-100 dark:border-indigo-900/40 line-clamp-1">
                <span className="truncate">✨ {group.highlightBadge}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── 3. PRICE & ACTION BUTTON ── */}
        <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 sm:space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
            <div>
              <div className="text-[8px] sm:text-[9.5px] font-medium uppercase text-slate-400 tracking-wider">
                Mulai dari
              </div>
              <div className="text-xs sm:text-lg md:text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                {formatCurrency(lowestPrice)}
                <span className="text-[9px] sm:text-[10.5px] font-normal text-slate-400 ml-0.5 font-sans">
                  {isHardware ? '/unit' : '/bln'}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCardClick}
            className="w-full h-8 sm:h-9 md:h-9.5 rounded-lg sm:rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] sm:text-xs shadow-xs flex items-center justify-center gap-1 transition-all"
          >
            <span>Pilih Varian</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
