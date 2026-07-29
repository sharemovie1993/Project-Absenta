import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Clock, Check, ArrowRight, ShieldCheck, Box, Sparkles } from 'lucide-react';
import { Button, Badge, Loader } from '../ui';
import { formatCurrency, getServiceIcon } from '@/lib/billingUtils';
import { useCartStore } from '../../store/useCartStore';
import toast from 'react-hot-toast';

export interface OrderPayload {
  id: string;
  service_code?: string;
  moduleIcon?: string;
  moduleName?: string;
  name?: string;
  size?: string;
  period: 'MONTH' | 'YEAR' | 'ONETIME';
  features_json?: string[];
  price_monthly: number;
  price_yearly: number;
  price_onetime?: number;
  group?: any;
}

interface OrderReviewSidebarProps {
  showOrderPanel: boolean;
  activeOrder: OrderPayload | null;
  checkoutProcessing: boolean;
  setShowOrderPanel: (show: boolean) => void;
  setActiveOrder: React.Dispatch<React.SetStateAction<OrderPayload | null>>;
  handleCheckout: () => Promise<void>;
  activeAcademicTier?: string;
}

export const OrderReviewSidebar: React.FC<OrderReviewSidebarProps> = ({
  showOrderPanel,
  activeOrder,
  checkoutProcessing,
  setShowOrderPanel,
  setActiveOrder,
  handleCheckout,
  activeAcademicTier = 'Micro',
}) => {
  if (!activeOrder) return null;

  // Deteksi Perangkat / Hardware / Physical Service
  const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];
  const isHardware = Boolean(
    HARDWARE_MODULE_IDS.includes(activeOrder.group?.module_id || '') ||
    HARDWARE_MODULE_IDS.includes(activeOrder.service_code || '') ||
    activeOrder.service_code === 'HARDWARE' || 
    activeOrder.service_code === 'PHYSICAL_GOODS' ||
    activeOrder.period === 'ONETIME' ||
    (activeOrder.id && (
      activeOrder.id.startsWith('HW_') || 
      activeOrder.id.startsWith('SVC_') || 
      activeOrder.id.includes('SERVER') || 
      activeOrder.id.includes('DELL')
    ))
  );

  // Urutan ukuran Shopee-style: kecil ke besar
  const SIZE_ORDER = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise', 'Pro', 'Ultra', 'Lite', 'Basic', 'Standard'];

  const extractSizeLabel = (v: any): string => {
    if (v?.size_label) return v.size_label;
    const name = String(v?.name || v?.title || '');
    const id = String(v?.id || '');

    if (/\b(Micro)\b/i.test(name) || /MICRO/i.test(id)) return 'Micro';
    if (/\b(Small)\b/i.test(name) || /SMALL/i.test(id)) return 'Small';
    if (/\b(Medium)\b/i.test(name) || /MEDIUM/i.test(id)) return 'Medium';
    if (/\b(Large)\b/i.test(name) || /LARGE/i.test(id)) return 'Large';
    if (/\b(Enterprise)\b/i.test(name) || /ENTERPRISE/i.test(id)) return 'Enterprise';
    if (/\b(Ultra|Campus)\b/i.test(name) || /ULTRA/i.test(id)) return 'Ultra';

    const limit = v?.device_limit || v?.max_user || 0;
    if (limit > 0) {
      if (limit <= 300) return 'Micro';
      if (limit <= 600) return 'Small';
      if (limit <= 1200) return 'Large';
      if (limit <= 2500) return 'Enterprise';
      return 'Ultra';
    }

    return 'Standard';
  };

  // Kumpulkan unique size_label dari semua varian (MONTH+YEAR digabung jadi 1 baris per ukuran)
  const groupedVariants = useMemo(() => {
    if (!activeOrder.group?.variants) return [];
    const map = new Map<string, any[]>();
    activeOrder.group.variants.forEach((v: any) => {
      const key = extractSizeLabel(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    // Urutkan dari kecil ke besar
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = SIZE_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
      const bi = SIZE_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [activeOrder.group]);

  /**
   * Kunci utama: resolve plan_id berdasarkan size_label + billing_period
   * Karena 1 Plan = 1 periode (Skenario A), kombinasi ini menghasilkan plan_id yang berbeda
   */
  const resolvePlan = (size: string, period: 'MONTH' | 'YEAR' | 'ONETIME'): any | null => {
    if (!activeOrder.group?.variants) return null;
    const variants: any[] = activeOrder.group.variants;

    // Coba match sempurna: size + period
    const exactMatch = variants.find(
      (v) => (v.size_label === size || extractSizeLabel(v) === size) && (v.billing_period === period || (isHardware && v.price_onetime > 0))
    );
    if (exactMatch) return exactMatch;

    // Fallback: jika billing_period tidak ada di data, ambil yang cocok size saja
    return variants.find((v) => v.size_label === size || extractSizeLabel(v) === size) || variants[0] || null;
  };

  // Pilih ukuran baru → resolve plan_id dari size × period aktif
  const selectSize = (sizeLabel: string) => {
    const plan = resolvePlan(sizeLabel, activeOrder.period);
    if (!plan) return;
    const pOnetime = plan.price_onetime || Number(String(plan.price || 0).replace(/[^0-9]/g, '')) || 0;
    setActiveOrder(prev => prev ? {
      ...prev,
      id: plan.id,
      name: plan.name || prev.name,
      size: plan.size_label || sizeLabel,
      features_json: plan.features_json || [],
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
      price_onetime: pOnetime > 0 ? pOnetime : prev.price_onetime,
    } : null);
  };

  // Ganti periode → resolve plan_id dari size aktif × period baru
  const updatePeriod = (period: 'MONTH' | 'YEAR') => {
    if (isHardware) return; // Siklus tagihan tidak berlaku untuk hardware
    const plan = resolvePlan(activeOrder.size || '', period);
    if (!plan) return;
    setActiveOrder(prev => prev ? {
      ...prev,
      period,
      id: plan.id,
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
    } : null);
  };

  // Harga yang ditampilkan berdasarkan jenis produk dan periode yang dipilih
  const displayPrice = isHardware
    ? (activeOrder.price_onetime || activeOrder.price_monthly || activeOrder.price_yearly || 0)
    : (activeOrder.period === 'YEAR'
        ? (activeOrder.price_yearly || activeOrder.price_monthly * 12)
        : activeOrder.price_monthly);

  // List fitur yang didapat dari selectedPlan / activeOrder
  const featuresList = useMemo(() => {
    const selectedPlan = resolvePlan(activeOrder.size || '', activeOrder.period);
    const raw = selectedPlan?.features_json || activeOrder.features_json;
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        return [raw];
      }
    }
    return [];
  }, [activeOrder.size, activeOrder.period, activeOrder.features_json, resolvePlan]);

  return (
    <AnimatePresence>
      {showOrderPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOrderPanel(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100]"
          />

          {/* Centered Responsive Modal Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-950 shadow-2xl z-[101] border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl w-full max-w-4xl h-full sm:h-auto max-h-[100vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* ── HEADER ── */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-md shadow-blue-600/20 shrink-0">
                  <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
                    Review &amp; Konfigurasi Pesanan
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 capitalize truncate">
                    {activeOrder.name?.replace(/-/g, ' ') || 'Pilih paket Anda'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderPanel(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 ml-2"
                aria-label="Tutup"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* ── BODY (2 Columns Responsive Grid Layout) ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 no-scrollbar pb-24 md:pb-6">

              {/* LEFT COLUMN (7 cols): Configuration & Features */}
              <div className="md:col-span-7 space-y-5 sm:space-y-6">

                {/* 1. KARTU PRODUK & KAPASITAS */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {(() => {
                    const selectedPlan = resolvePlan(activeOrder.size || '', activeOrder.period);
                    const capacity = selectedPlan?.max_user || selectedPlan?.device_limit || selectedPlan?.deviceLimit;
                    return (
                      <div className="flex items-start gap-3.5 sm:gap-4">
                        {/* Icon / Product Image */}
                        {selectedPlan?.image_url || activeOrder.group?.variants?.find((v: any) => v.image_url)?.image_url ? (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <img
                              src={selectedPlan?.image_url || activeOrder.group?.variants?.find((v: any) => v.image_url)?.image_url}
                              alt={activeOrder.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
                            {React.createElement(getServiceIcon(activeOrder.service_code, activeOrder.moduleIcon), { size: 24 })}
                          </div>
                        )}
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] mb-0.5 sm:mb-1">
                            {activeOrder.moduleName}
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight capitalize truncate mb-1.5 sm:mb-2">
                            {activeOrder.name?.replace(/-/g, ' ')}
                          </h4>
                          {/* Edisi badge + kapasitas inline */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-[10px] sm:text-xs font-black text-white bg-blue-600 px-2 sm:px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-sm">
                              {isHardware ? 'Unit Hardware' : `Edisi ${activeOrder.size}`}
                            </span>
                            {!isHardware && (
                              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-200/60 dark:bg-slate-800 px-2 sm:px-2.5 py-0.5 rounded-lg">
                                📦 {capacity ? `${capacity.toLocaleString('id-ID')} Pengguna` : 'Unlimited'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. PILIH EDISI (Hanya untuk SaaS jika ada varian edisi) */}
                {groupedVariants.length > 1 && !isHardware && (
                  <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                      1 · Pilih Edisi Kapasitas Siswa
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-2.5">
                      {(() => {
                        const academicTierLower = String(activeAcademicTier || 'Micro').toLowerCase();
                        const academicIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === academicTierLower);

                        return groupedVariants.map(([sizeLabel]) => {
                          const isSelected = activeOrder.size === sizeLabel;
                          const sizeIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === sizeLabel.toLowerCase());
                          const isLocked = activeOrder.service_code !== 'KOPERASI' && academicIdx !== -1 && sizeIdx !== -1 && sizeIdx < academicIdx;

                          return (
                            <button
                              key={sizeLabel}
                              id={`edition-select-${sizeLabel}`}
                              data-testid={`edition-select-${sizeLabel}`}
                              onClick={() => {
                                if (!isLocked) selectSize(sizeLabel);
                              }}
                              disabled={isLocked}
                              className={`h-11 sm:h-auto px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border-2 flex items-center justify-center gap-1 ${
                                isLocked
                                  ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-50'
                                  : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25 scale-[1.02] sm:scale-105'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                              }`}
                            >
                              <span>{sizeLabel}</span>
                              {isLocked && <span>🔒</span>}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {activeAcademicTier && activeAcademicTier.toLowerCase() !== 'micro' && activeOrder.service_code !== 'KOPERASI' && (
                      <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium italic mt-2.5 sm:mt-3 block">
                        * Edisi minimal yang dapat dibeli adalah <span className="font-bold">{activeAcademicTier}</span> sesuai kapasitas sekolah Anda.
                      </p>
                    )}
                  </div>
                )}

                {/* 3. SIKLUS TAGIHAN */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    2 · Siklus Tagihan
                  </div>
                  {isHardware ? (
                    <div className="p-3 sm:p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider truncate">
                        <Box size={16} className="text-blue-600 shrink-0" />
                        <span>Pembelian Perangkat (Sekali Bayar)</span>
                      </div>
                      <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                        Unit Hardware
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 sm:p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      <button
                        onClick={() => updatePeriod('MONTH')}
                        className={`h-11 sm:h-auto py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          activeOrder.period === 'MONTH'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Bulanan
                      </button>
                      <button
                        onClick={() => updatePeriod('YEAR')}
                        className={`h-11 sm:h-auto py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
                          activeOrder.period === 'YEAR'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Tahunan
                        <span className="absolute -top-2 -right-1 bg-amber-500 text-white text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-sm">
                          HEMAT 20%
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. FITUR LAYANAN & MODUL TERMASUK */}
                <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
                  {/* Modul Core Bawaan (Gratis) */}
                  {!isHardware && (
                    <div>
                      <div className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Sparkles size={15} className="text-emerald-500 shrink-0" />
                        <span>Sudah Termasuk Modul Core (Gratis)</span>
                      </div>
                      <ul className="space-y-2.5 sm:space-y-3">
                        <li className="flex items-start gap-2.5 sm:gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check size={11} strokeWidth={3} />
                          </div>
                          <div className="flex-1">
                            <span className="font-black text-slate-900 dark:text-white">Modul Academic / TU: </span>
                            <span className="text-slate-500 dark:text-slate-400">Master Data SDM Guru/Siswa (Wizard NIS Massal), Jabatan Organisasi, Transisi Kenaikan/Kelulusan, &amp; Designer Kartu Pelajar QR</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5 sm:gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check size={11} strokeWidth={3} />
                          </div>
                          <div className="flex-1">
                            <span className="font-black text-slate-900 dark:text-white">Modul Kurikulum: </span>
                            <span className="text-slate-500 dark:text-slate-400">Penjadwalan KBM (Timetable Solver &amp; Shift Jam), Struktur JP Kurikulum Merdeka, Repositori Perangkat Ajar, RPE, &amp; Supervisi Akademik Guru</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5 sm:gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check size={11} strokeWidth={3} />
                          </div>
                          <div className="flex-1">
                            <span className="font-black text-slate-900 dark:text-white">Modul Kesiswaan: </span>
                            <span className="text-slate-500 dark:text-slate-400">Kedisiplinan &amp; Poin Pelanggaran (Auto-Seeding 18+ Jenis), Poin Prestasi/Reward, Buku Piket &amp; Izin Digital, serta Jadwal Eskul/Agenda Non-KBM</span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Fitur Spesifik Modul / Spesifikasi Hardware */}
                  {featuresList.length > 0 && (
                    <div className={!isHardware ? "pt-3.5 sm:pt-4 border-t border-slate-200/80 dark:border-slate-800" : ""}>
                      <div className="text-[10px] sm:text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Box size={15} className="text-blue-500 shrink-0" />
                        <span>{isHardware ? 'Spesifikasi & Deskripsi Perangkat' : `Fitur Khusus ${activeOrder.name?.replace(/-/g, ' ') || 'Modul'}`}</span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {featuresList.map((feat: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium leading-normal bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                            <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN (5 cols): Ringkasan Harga & Tombol Aksi */}
              <div className="md:col-span-5 flex flex-col justify-between">
                <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm md:sticky md:top-0">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-3">
                    Ringkasan Tagihan
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Subtotal ({isHardware ? 'Perangkat / Unit' : (activeOrder.period === 'YEAR' ? 'Tahunan' : 'Bulanan')})
                      </span>
                      <span className="text-slate-900 dark:text-white font-black">
                        {formatCurrency(displayPrice)}
                      </span>
                    </div>

                    {!isHardware && activeOrder.period === 'YEAR' && activeOrder.price_monthly > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Setara per bulan</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(displayPrice / 12))}/bln</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Pajak (PPN 11%)</span>
                      <span className="text-emerald-600 font-black">Termasuk</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Estimasi Biaya Layanan</span>
                      <span className="font-bold">± Rp 4.500 (Terhubung Gateway)</span>
                    </div>

                    {!isHardware && activeOrder.period === 'YEAR' && (
                      <div className="flex justify-between items-center text-xs p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 font-bold">
                        <span>💰 Hemat ~20% vs Bulanan</span>
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest">Aktif</span>
                      </div>
                    )}

                    <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Bayar</span>
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(displayPrice)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {isHardware ? 'Harga unit perangkat (Sekali bayar)' : (activeOrder.period === 'YEAR' ? 'Dibayar di muka (12 bln)' : 'Tagihan berulang bulanan')}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Desktop */}
                  <div className="hidden md:flex flex-col gap-3 pt-2">
                    <Button
                      className="w-full h-13 sm:h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-center justify-center gap-2"
                      onClick={handleCheckout}
                      disabled={checkoutProcessing}
                    >
                      {checkoutProcessing ? (
                        <Loader size="sm" className="mr-2" />
                      ) : (
                        <>
                          Beli Langsung Sekarang
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      className="w-full h-11 sm:h-12 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        useCartStore.getState().addItem({
                          plan_id: activeOrder.id,
                          name: isHardware
                            ? `${activeOrder.moduleName || 'Hardware'} - ${activeOrder.name || 'Unit'}`
                            : `${activeOrder.moduleName || 'Modul'} - Edisi ${activeOrder.size || 'Standard'} (${activeOrder.period === 'YEAR' ? 'Tahunan' : 'Bulanan'})`,
                          price: displayPrice,
                          type: isHardware ? 'HARDWARE_PERIPHERAL' : 'SOFTWARE_SUBSCRIPTION',
                          billingPeriod: activeOrder.period,
                          moduleName: activeOrder.moduleName
                        });
                        toast.success('Produk berhasil ditambahkan ke keranjang belanja!');
                      }}
                    >
                      <ShoppingCart size={16} />
                      + Tambah ke Keranjang Belanja
                    </Button>
                  </div>

                  <div className="hidden md:flex items-center justify-center gap-1.5 pt-1 opacity-50">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Secure Payment Gateway</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── MOBILE STICKY BOTTOM ACTION BAR (Tampil Khusus di Layar Ponsel / <768px) ── */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 px-4 z-[105] shadow-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Bayar</div>
                <div className="text-base font-black text-blue-600 dark:text-blue-400 leading-none">
                  {formatCurrency(displayPrice)}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0"
                  onClick={() => {
                    useCartStore.getState().addItem({
                      plan_id: activeOrder.id,
                      name: isHardware
                        ? `${activeOrder.moduleName || 'Hardware'} - ${activeOrder.name || 'Unit'}`
                        : `${activeOrder.moduleName || 'Modul'} - Edisi ${activeOrder.size || 'Standard'} (${activeOrder.period === 'YEAR' ? 'Tahunan' : 'Bulanan'})`,
                      price: displayPrice,
                      type: isHardware ? 'HARDWARE_PERIPHERAL' : 'SOFTWARE_SUBSCRIPTION',
                      billingPeriod: activeOrder.period,
                      moduleName: activeOrder.moduleName
                    });
                    toast.success('Produk ditambahkan ke keranjang!');
                  }}
                  aria-label="Tambah ke Keranjang"
                >
                  <ShoppingCart size={18} />
                </Button>

                <Button
                  className="h-11 px-5 rounded-xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 shrink-0"
                  onClick={handleCheckout}
                  disabled={checkoutProcessing}
                >
                  {checkoutProcessing ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <span>Beli Langsung</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </Button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
