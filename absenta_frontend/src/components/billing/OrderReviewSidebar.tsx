import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Clock, Check, ArrowRight, ShieldCheck } from 'lucide-react';
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

  return (
    <AnimatePresence>
      {showOrderPanel && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOrderPanel(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white dark:bg-slate-950 shadow-2xl z-[101] border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Review Pesanan</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail Modul Pilihan</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOrderPanel(false)}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Item Card */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="relative z-10 flex gap-5">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                    {React.createElement(getServiceIcon(activeOrder.service_code, activeOrder.moduleIcon), { size: 32 })}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{activeOrder.moduleName}</div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 capitalize">{activeOrder.name?.replace(/-/g, ' ')}</h4>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase py-0.5 px-3">Edisi {activeOrder.size}</Badge>
                  </div>
                </div>
                {/* Decorative background icon */}
                <div className="absolute -bottom-4 -right-4 opacity-[0.03] transform rotate-12 scale-150 group-hover:scale-[1.7] transition-transform duration-700">
                  {React.createElement(getServiceIcon(activeOrder.service_code, activeOrder.moduleIcon), { size: 120 })}
                </div>
              </div>

              {/* Billing Cycle Selection */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Clock size={14} /> Pilih Siklus Tagihan
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-inner">
                  <button 
                    onClick={() => setActiveOrder(prev => prev ? { ...prev, period: 'MONTH' } : null)}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeOrder.period === 'MONTH' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Bulanan
                  </button>
                  <button 
                    onClick={() => setActiveOrder(prev => prev ? { ...prev, period: 'YEAR' } : null)}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${activeOrder.period === 'YEAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Tahunan
                    <span className="absolute -top-2 -right-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-950 animate-bounce">HEBAT</span>
                  </button>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Cakupan Layanan</h4>
                <div className="space-y-3 px-1">
                  {activeOrder.features_json?.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-4 h-4 bg-green-500/10 rounded-full flex items-center justify-center">
                        <Check size={10} className="text-green-600" />
                      </div>
                      <span className="text-[12.8px] font-medium text-slate-600 dark:text-slate-300 leading-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer (Payment Summary) */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold">Subtotal ({activeOrder.period === 'YEAR' ? 'Tahunan' : 'Bulanan'})</span>
                  <span className="text-slate-900 dark:text-white font-black">{formatCurrency(activeOrder.period === 'YEAR' ? activeOrder.price_yearly : activeOrder.price_monthly)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold">Pajak (PPN 11%)</span>
                  <span className="text-emerald-500 font-black">Termasuk</span>
                </div>
                {activeOrder.period === 'YEAR' && (
                  <div className="flex justify-between items-center text-xs p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 font-bold">
                    <span>Hemat 2 Bulan!</span>
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">Active</span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Bayar</span>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">
                    {formatCurrency(activeOrder.period === 'YEAR' ? activeOrder.price_yearly : activeOrder.price_monthly)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full h-14 rounded-xl bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98] group flex items-center justify-center gap-3"
                  onClick={handleCheckout}
                  disabled={checkoutProcessing}
                >
                  {checkoutProcessing ? (
                    <Loader size="sm" className="mr-2" />
                  ) : (
                    <>
                      Konfirmasi & Bayar
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-2 opacity-40">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Secure Payment Gateway</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
