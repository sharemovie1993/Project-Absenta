import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Clock, Check, ArrowRight, ShieldCheck, Box } from 'lucide-react';
import { Button, Badge, Loader } from '../ui';
import { formatCurrency, getServiceIcon } from '@/lib/billingUtils';

export interface OrderPayload {
  id: string;
  service_code?: string;
  moduleIcon?: string;
  moduleName?: string;
  name?: string;
  size?: string;
  period: 'MONTH' | 'YEAR';
  features_json?: string[];
  price_monthly: number;
  price_yearly: number;
  group?: any;
}

interface OrderReviewSidebarProps {
  showOrderPanel: boolean;
  activeOrder: OrderPayload | null;
  checkoutProcessing: boolean;
  setShowOrderPanel: (show: boolean) => void;
  setActiveOrder: React.Dispatch<React.SetStateAction<OrderPayload | null>>;
  handleCheckout: () => Promise<void>;
}

export const OrderReviewSidebar: React.FC<OrderReviewSidebarProps> = ({
  showOrderPanel,
  activeOrder,
  checkoutProcessing,
  setShowOrderPanel,
  setActiveOrder,
  handleCheckout,
}) => {
  if (!activeOrder) return null;

  // Urutan ukuran Shopee-style: kecil ke besar
  const SIZE_ORDER = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise', 'Pro', 'Ultra', 'Lite', 'Basic', 'Standard'];

  // Kumpulkan unique size_label dari semua varian (MONTH+YEAR digabung jadi 1 baris per ukuran)
  const groupedVariants = useMemo(() => {
    if (!activeOrder.group?.variants) return [];
    const map = new Map<string, any[]>();
    activeOrder.group.variants.forEach((v: any) => {
      const key = v.size_label || 'Standard';
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
  const resolvePlan = (size: string, period: 'MONTH' | 'YEAR'): any | null => {
    if (!activeOrder.group?.variants) return null;
    const variants: any[] = activeOrder.group.variants;

    // Coba match sempurna: size + period
    const exactMatch = variants.find(
      (v) => v.size_label === size && v.billing_period === period
    );
    if (exactMatch) return exactMatch;

    // Fallback: jika billing_period tidak ada di data, ambil yang cocok size saja
    return variants.find((v) => v.size_label === size) || null;
  };

  // Pilih ukuran baru → resolve plan_id dari size × period aktif
  const selectSize = (sizeLabel: string) => {
    const plan = resolvePlan(sizeLabel, activeOrder.period);
    if (!plan) return;
    setActiveOrder(prev => prev ? {
      ...prev,
      id: plan.id,
      size: plan.size_label || sizeLabel,
      features_json: plan.features_json || [],
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
    } : null);
  };

  // Ganti periode → resolve plan_id dari size aktif × period baru
  const updatePeriod = (period: 'MONTH' | 'YEAR') => {
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

  // Harga yang ditampilkan berdasarkan periode yang dipilih
  const displayPrice = activeOrder.period === 'YEAR'
    ? (activeOrder.price_yearly || activeOrder.price_monthly * 12)
    : activeOrder.price_monthly;

  return (
    <AnimatePresence>
      {showOrderPanel && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOrderPanel(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white dark:bg-slate-950 shadow-2xl z-[101] border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* ── HEADER ── */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    Review Pesanan
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">
                    {activeOrder.name?.replace(/-/g, ' ') || 'Pilih paket Anda'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderPanel(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── BODY (scrollable) ── */}
            <div className="flex-1 overflow-y-auto no-scrollbar">

              {/* ── KARTU PRODUK (merged: icon + nama + edisi + kapasitas) ── */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                {(() => {
                  const selectedPlan = resolvePlan(activeOrder.size || '', activeOrder.period);
                  const capacity = selectedPlan?.max_user;
                  return (
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
                        {React.createElement(getServiceIcon(activeOrder.service_code, activeOrder.moduleIcon), { size: 24 })}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.15em] mb-0.5">
                          {activeOrder.moduleName}
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight capitalize truncate mb-2">
                          {activeOrder.name?.replace(/-/g, ' ')}
                        </h4>
                        {/* Edisi badge + kapasitas inline */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {activeOrder.size}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            📦 {capacity ? `${capacity.toLocaleString('id-ID')} Pengguna` : 'Unlimited'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── PILIH EDISI ── */}
              {groupedVariants.length > 0 && (
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    1 · Pilih Edisi
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupedVariants.map(([sizeLabel]) => {
                      const isSelected = activeOrder.size === sizeLabel;
                      return (
                        <button
                          key={sizeLabel}
                          onClick={() => selectSize(sizeLabel)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-2 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 scale-105'
                              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {sizeLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SIKLUS TAGIHAN ── */}
              <div className="p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  2 · Siklus Tagihan
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <button
                    onClick={() => updatePeriod('MONTH')}
                    className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                      activeOrder.period === 'MONTH'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    onClick={() => updatePeriod('YEAR')}
                    className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative ${
                      activeOrder.period === 'YEAR'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Tahunan
                    <span className="absolute -top-2 -right-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-950">
                      HEMAT
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── FOOTER (ringkasan harga + tombol) ── */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">
                    Subtotal ({activeOrder.period === 'YEAR' ? 'Tahunan' : 'Bulanan'})
                  </span>
                  <span className="text-slate-900 dark:text-white font-black">
                    {formatCurrency(displayPrice)}
                  </span>
                </div>
                {activeOrder.period === 'YEAR' && activeOrder.price_monthly > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Setara per bulan</span>
                    <span className="font-bold">{formatCurrency(Math.round(displayPrice / 12))}/bln</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Pajak (PPN 11%)</span>
                  <span className="text-emerald-500 font-black">Termasuk</span>
                </div>
                {activeOrder.period === 'YEAR' && (
                  <div className="flex justify-between items-center text-xs p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 font-bold">
                    <span>💰 Hemat ~20% vs Bulanan</span>
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">Aktif</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Bayar</div>
                    {activeOrder.period === 'YEAR' && (
                      <div className="text-[9px] text-slate-400 mt-0.5">Dibayar di muka (12 bln)</div>
                    )}
                  </div>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">
                    {formatCurrency(displayPrice)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-13 rounded-xl bg-blue-600 text-white font-black text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all hover:scale-[1.01] active:scale-[0.99] group flex items-center justify-center gap-2"
                onClick={handleCheckout}
                disabled={checkoutProcessing}
              >
                {checkoutProcessing ? (
                  <Loader size="sm" className="mr-2" />
                ) : (
                  <>
                    Konfirmasi &amp; Bayar
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 mt-3 opacity-40">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Secure Payment Gateway</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
