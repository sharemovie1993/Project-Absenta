import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Clock, Check, ArrowRight, ShieldCheck, Box, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, Badge, Loader } from '../ui';
import { formatCurrency, getServiceIcon, getServiceThumbnail, isCompleteBundlePlan } from '@/lib/billingUtils';
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
  imageUrl?: string;
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

// Deteksi Perangkat / Hardware / Physical Service
const HARDWARE_MODULE_IDS = ['SERVER_HARDWARE', 'NETWORK_HARDWARE', 'ABSENSI_HARDWARE', 'PHYSICAL_SERVICE'];

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
    if (limit <= 1200) return 'Medium';
    if (limit <= 2500) return 'Large';
    return 'Enterprise';
  }
  return 'Standard';
};

export const TIER_CAPACITY_INFO: Record<string, { maxUsers: number; capacityLabel: string; suitableFor: string }> = {
  MICRO: { maxUsers: 200, capacityLabel: 's.d 200 Siswa', suitableFor: 'SD / SMP Kecil' },
  SMALL: { maxUsers: 500, capacityLabel: 's.d 500 Siswa', suitableFor: 'SMP / SMA Sedang' },
  MEDIUM: { maxUsers: 1000, capacityLabel: 's.d 1.000 Siswa', suitableFor: 'SMA / SMK Standar' },
  LARGE: { maxUsers: 1500, capacityLabel: 's.d 1.500 Siswa', suitableFor: 'SMKN / SMAN Besar' },
  ENTERPRISE: { maxUsers: 2500, capacityLabel: 's.d 2.500 Siswa', suitableFor: 'SMKN / Kampus Terbesar' },
  ULTRA: { maxUsers: 5000, capacityLabel: 's.d 5.000 Siswa', suitableFor: 'Yayasan / Multi-Kampus' },
};


const resolvePlanHelper = (activeOrder: OrderPayload | null, size: string, period: 'MONTH' | 'YEAR' | 'ONETIME', isHardware: boolean): any | null => {
  if (!activeOrder?.group?.variants) return null;
  const variants: any[] = activeOrder.group.variants;

  // Coba match sempurna: size + period
  const exactMatch = variants.find(v => {
    const vSize = extractSizeLabel(v);
    const vPeriod = v.billing_period === 'YEARLY' ? 'YEAR' : (v.billing_period === 'MONTHLY' ? 'MONTH' : v.billing_period);
    return vSize.toLowerCase() === size.toLowerCase() && (vPeriod === period || (isHardware && v.price_onetime > 0));
  });
  if (exactMatch) return exactMatch;

  // Fallback: jika period tidak ada, cocokkan size saja
  const sizeMatch = variants.find(v => extractSizeLabel(v).toLowerCase() === size.toLowerCase());
  if (sizeMatch) return sizeMatch;

  return variants[0] || null;
};

export const OrderReviewSidebar: React.FC<OrderReviewSidebarProps> = ({
  showOrderPanel,
  activeOrder,
  checkoutProcessing,
  setShowOrderPanel,
  setActiveOrder,
  handleCheckout,
  activeAcademicTier = 'Micro'
}) => {
  const [imgError, setImgError] = useState(false);

  // Deteksi Perangkat / Hardware / Physical Service
  const isHardware = Boolean(
    activeOrder?.group?.isHardware === true ||
    HARDWARE_MODULE_IDS.includes(activeOrder?.group?.module_id || '') || 
    HARDWARE_MODULE_IDS.includes(activeOrder?.service_code || '') || 
    activeOrder?.service_code === 'HARDWARE' || 
    activeOrder?.service_code === 'PHYSICAL_GOODS' || 
    (activeOrder?.id && (activeOrder.id.startsWith('HW_') || activeOrder.id.startsWith('SVC_')))
  );

  // Kumpulkan unique size_label dari semua varian
  const groupedVariants = useMemo(() => {
    if (!activeOrder?.group?.variants) return [];
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
  }, [activeOrder?.group]);

  // List fitur yang didapat dari selectedPlan / activeOrder
  const featuresList = useMemo(() => {
    if (!activeOrder) return [];
    const selectedPlan = resolvePlanHelper(activeOrder, activeOrder.size || '', activeOrder.period, isHardware);
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
  }, [activeOrder, isHardware]);

  const isCompleteBundle = useMemo(() => {
    return isCompleteBundlePlan(activeOrder) || isCompleteBundlePlan(activeOrder?.group);
  }, [activeOrder]);

  // Pilih ukuran / varian baru → harga berubah seketika
  const selectSize = (sizeLabel: string) => {
    if (!activeOrder) return;
    const plan = resolvePlanHelper(activeOrder, sizeLabel, activeOrder.period, isHardware);
    if (!plan) return;
    const pOnetime = plan.price_onetime || Number(String(plan.price || 0).replace(/[^0-9]/g, '')) || 0;
    const pMonthly = Number(plan.price_monthly || 0);
    const pYearly = Number(plan.price_yearly || 0);

    setActiveOrder(prev => prev ? {
      ...prev,
      id: plan.id,
      name: plan.name || prev.name,
      size: plan.size_label || sizeLabel,
      features_json: plan.features_json || prev.features_json,
      price_monthly: pMonthly,
      price_yearly: pYearly,
      price_onetime: pOnetime > 0 ? pOnetime : prev.price_onetime
    } : null);
  };

  // Ganti periode → harga berubah seketika
  const updatePeriod = (period: 'MONTH' | 'YEAR') => {
    if (!activeOrder || isHardware) return;
    const plan = resolvePlanHelper(activeOrder, activeOrder.size || '', period, isHardware);
    if (!plan) return;
    const pMonthly = Number(plan.price_monthly || 0);
    const pYearly = Number(plan.price_yearly || 0);

    setActiveOrder(prev => prev ? {
      ...prev,
      period,
      id: plan.id,
      price_monthly: pMonthly > 0 ? pMonthly : prev.price_monthly,
      price_yearly: pYearly > 0 ? pYearly : prev.price_yearly
    } : null);
  };

  if (!activeOrder) return null;

  // Resolusi gambar produk
  const resolvedImageUrl = activeOrder.imageUrl || activeOrder.group?.imageUrl || getServiceThumbnail(activeOrder.service_code, activeOrder.moduleName, activeOrder.group?.mode);

  // Harga yang ditampilkan berdasarkan jenis produk dan periode yang dipilih secara dinamis
  const displayPrice = isHardware
    ? (activeOrder.price_onetime || activeOrder.price_monthly || activeOrder.price_yearly || 0)
    : (activeOrder.period === 'YEAR'
        ? (activeOrder.price_yearly > 0 ? activeOrder.price_yearly : Math.round((activeOrder.price_monthly || 0) * 12 * 0.8))
        : (activeOrder.price_monthly || 0)
      );

  // Nominal penghematan tahunan jika aktif
  const yearlySavings = !isHardware && activeOrder.period === 'YEAR' && activeOrder.price_monthly > 0
    ? ((activeOrder.price_monthly * 12) - displayPrice)
    : 0;

  // Kalkulasi biaya unit per siswa untuk Sekolah Negeri
  const currentTierKey = (activeOrder?.size || 'ENTERPRISE').toUpperCase();
  const currentTierInfo = TIER_CAPACITY_INFO[currentTierKey] || TIER_CAPACITY_INFO['ENTERPRISE'];
  const effectiveMonthlyPrice = activeOrder?.period === 'YEAR'
    ? Math.round(displayPrice / 12)
    : displayPrice;
  const perStudentPerMonth = currentTierInfo?.maxUsers > 0
    ? Math.round(effectiveMonthlyPrice / currentTierInfo.maxUsers)
    : 0;

  return (
    <AnimatePresence>
      {showOrderPanel && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOrderPanel(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120]"
          />

          {/* Shopee-Style Responsive Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative bg-white dark:bg-slate-950 shadow-2xl z-[121] border-0 sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-3xl h-[92vh] sm:h-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* ── 1. TOP HEADER (PRODUCT THUMBNAIL & BIG DYNAMIC PRICE) ── */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4 sm:gap-5 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 relative">
              {/* Product Thumbnail */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                {resolvedImageUrl && !imgError ? (
                  <img
                    src={resolvedImageUrl}
                    alt={activeOrder.name}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-indigo-600 dark:text-indigo-400">
                    {React.createElement(getServiceIcon(activeOrder.service_code, activeOrder.moduleIcon), { size: 36 })}
                  </div>
                )}
              </div>

              {/* Title & Dynamic Price Info */}
              <div className="flex-1 min-w-0 pr-8 space-y-1">
                <div className="text-[10px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">
                  {activeOrder.moduleName || 'Modul Absenta'}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight capitalize truncate">
                  {activeOrder.group?.baseName || activeOrder.name?.replace(/-/g, ' ')}
                </h3>

                {/* 🌟 BIG DYNAMIC PRICE 🌟 */}
                <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                  <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight animate-in fade-in zoom-in-95 duration-150">
                    {formatCurrency(displayPrice)}
                  </div>
                  <span className="text-xs font-bold text-slate-500 font-sans">
                    {isHardware ? '/unit' : activeOrder.period === 'YEAR' ? '/tahun' : '/bulan'}
                  </span>

                  {/* Savings Badge */}
                  {yearlySavings > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                      Hemat 20%
                    </span>
                  )}
                </div>

                {/* Unit Cost & School Capacity Breakdown */}
                {!isHardware && currentTierInfo && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Setara <strong>{formatCurrency(perStudentPerMonth)} / siswa / bulan</strong></span>
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      • Kapasitas {currentTierInfo.capacityLabel} ({currentTierInfo.suitableFor})
                    </span>
                  </div>
                )}

                {/* Selected summary */}
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span>Pilihan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isHardware ? activeOrder.name : `Edisi ${activeOrder.size || 'Standard'} (${currentTierInfo?.capacityLabel || ''}) · ${activeOrder.period === 'YEAR' ? 'Tagihan Tahunan' : 'Tagihan Bulanan'}`}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowOrderPanel(false)}
                className="absolute top-4 right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                aria-label="Tutup"
              >
                <X size={16} className="sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* ── 2. MODAL BODY: LEVEL 1 & LEVEL 2 BUTTONS ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar pb-32 md:pb-6">

              {/* 🌟 PAKET LENGKAP INCLUDED BONUSES 🌟 */}
              {isCompleteBundle && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-purple-50/70 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10.5px] font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                        Keuntungan Bawaan Paket Lengkap
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      Gratis Termasuk
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[11px]">1x Dedicated Easy Tunnel (SSL HTTPS)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[11px]">WhatsApp Notification Gateway</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[11px]">Akses Semua Modul Aplikasi</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[11px]">Klaim Domain Pasca-Bayar di Menu Tunnel</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEVEL 1: TOMBOL PILIHAN EDISI (MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE) ── */}
              {groupedVariants.length > 0 && !isHardware && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Pilih Edisi Kapasitas Siswa
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      Kapasitas total siswa aktif
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {groupedVariants.map(([sizeLabel]) => {
                      const isSelected = (activeOrder.size || '').toLowerCase() === sizeLabel.toLowerCase();
                      const academicTierLower = String(activeAcademicTier || 'Micro').toLowerCase();
                      const academicIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === academicTierLower);
                      const sizeIdx = SIZE_ORDER.findIndex(s => s.toLowerCase() === sizeLabel.toLowerCase());
                      const isLocked = activeOrder.service_code !== 'KOPERASI' && academicIdx !== -1 && sizeIdx !== -1 && sizeIdx < academicIdx;
                      const tierMeta = TIER_CAPACITY_INFO[sizeLabel.toUpperCase()] || { capacityLabel: 'Kapasitas Siswa', suitableFor: '' };

                      return (
                        <button
                          key={sizeLabel}
                          id={`edition-select-${sizeLabel}`}
                          data-testid={`edition-select-${sizeLabel}`}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (!isLocked) selectSize(sizeLabel);
                          }}
                          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl transition-all duration-150 border-2 flex flex-col items-start gap-0.5 text-left ${
                            isLocked
                              ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-500/20'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full justify-between">
                            <span className="text-xs sm:text-sm font-black tracking-wider">{sizeLabel}</span>
                            {isSelected && <CheckCircle2 size={14} className="text-white shrink-0" />}
                            {isLocked && <span className="text-xs">🔒</span>}
                          </div>
                          <div className={`text-[10px] font-medium leading-none ${
                            isSelected ? 'text-indigo-100 font-semibold' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {tierMeta.capacityLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HARDWARE EDITIONS BUTTONS */}
              {isHardware && (
                <div className="space-y-3">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Pilih Tipe Paket / Spesifikasi
                  </div>
                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {(() => {
                      const variants = activeOrder.group?.variants || [];
                      return variants.map((v: any) => {
                        const isSelected = activeOrder.id === v.id || activeOrder.name === v.name;
                        const isEnt = (v.name || '').includes('Enterprise') || (v.id || '').includes('_ENT');
                        const price = v.price_onetime || v.price_monthly || 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setActiveOrder(prev => prev ? ({
                                ...prev,
                                id: v.id,
                                name: v.name,
                                price_onetime: price
                              }) : null);
                            }}
                            className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black tracking-wider transition-all duration-150 border-2 flex items-center justify-center gap-2 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-500/20'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                            }`}
                          >
                            <span>{v.name}</span>
                            {isSelected && <CheckCircle2 size={16} className="text-white shrink-0" />}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* ── LEVEL 2: TOMBOL PILIHAN SIKLUS TAGIHAN (BULANAN VS TAHUNAN) ── */}
              {!isHardware && (
                <div className="space-y-3 pt-1">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Pilih Siklus Tagihan</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold normal-case">
                      💡 Hemat 20% dengan paket tahunan
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 sm:gap-3">
                    {/* BULANAN */}
                    <button
                      type="button"
                      onClick={() => updatePeriod('MONTH')}
                      className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-left border-2 transition-all duration-150 flex flex-col items-start gap-0.5 ${
                        activeOrder.period === 'MONTH'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
                        <span>📅 Tagihan Bulanan</span>
                        {activeOrder.period === 'MONTH' && <CheckCircle2 size={14} className="text-white shrink-0" />}
                      </div>
                      <div className={`text-[10px] ${activeOrder.period === 'MONTH' ? 'text-indigo-100' : 'text-slate-400'}`}>
                        Fleksibel per bulan
                      </div>
                    </button>

                    {/* TAHUNAN */}
                    <button
                      type="button"
                      onClick={() => updatePeriod('YEAR')}
                      className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-left border-2 transition-all duration-150 flex flex-col items-start gap-0.5 relative ${
                        activeOrder.period === 'YEAR'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
                        <span>🌟 Paket Tahunan</span>
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-full uppercase tracking-wider shadow-xs">
                          Hemat 20%
                        </span>
                        {activeOrder.period === 'YEAR' && <CheckCircle2 size={14} className="text-white shrink-0" />}
                      </div>
                      <div className={`text-[10px] font-semibold ${activeOrder.period === 'YEAR' ? 'text-amber-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        🏛️ Rekomendasi SPJ Dana BOS
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ── BUKTI DANA BOS & SIPLAH COMPLIANCE ── */}
              {!isHardware && (
                <div className="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xs">
                    BOS
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 flex-wrap">
                      <span>Resmi & Kompatibel Anggaran BOS (ARKAS)</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase">
                        Mitra SIPLaH
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                      Tersedia transaksi resmi via <strong>SIPLaH Kemendikbud</strong> dengan faktur pajak PPN 11%, kode rekening ARKAS valid, dan berkas SPJ siap audit BPK/Inspektorat Daerah.
                    </p>
                  </div>
                </div>
              )}

              {/* ── DETAIL FITUR YANG TERMASUK ── */}
              <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} />
                  <span>Fitur & Modul yang Termasuk</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {!isHardware && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                        <Check size={12} className="text-emerald-500 shrink-0 font-bold" />
                        <span>Termasuk Modul Core TU & Kurikulum</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                        <Check size={12} className="text-emerald-500 shrink-0 font-bold" />
                        <span>Termasuk Disiplin & Kesiswaan</span>
                      </div>
                    </>
                  )}
                  {featuresList.slice(0, 6).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                      <Check size={12} className="text-indigo-500 shrink-0 font-bold" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── 3. SHOPEE BOTTOM ACTION BAR ── */}
            <div className="border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-lg">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Pembayaran
                </div>
                <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">
                  {formatCurrency(displayPrice)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                  PPN 11% sudah termasuk
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Button Masukkan Keranjang */}
                <Button
                  type="button"
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
                    toast.success('Produk berhasil dimasukkan ke Keranjang!');
                  }}
                  className="h-11 sm:h-12 px-3.5 sm:px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all shrink-0"
                >
                  <ShoppingCart size={16} />
                  <span className="hidden sm:inline">+ Keranjang</span>
                </Button>

                {/* Button Beli / Langganan Sekarang */}
                <Button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutProcessing}
                  className="h-11 sm:h-12 px-5 sm:px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
                >
                  {checkoutProcessing ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <span>Langganan Sekarang</span>
                      <ArrowRight size={16} />
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