import React from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Calendar,
  Zap,
  CreditCard,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/api/plans.api';
import { formatDate } from '@/utils/layoutUtils';
import type { Plan } from '@/types/plans';

interface PaymentChannel {
  code: string;
  name: string;
  icon_url?: string;
  maximum_amount?: number | string;
}

interface CheckoutDetailStepProps {
  plan: Plan;
  price: number;
  features: string[];
  paymentChannels: PaymentChannel[];
  selectedChannel: string;
  setSelectedChannel: (val: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (val: boolean) => void;
  expiryDate: string;
  gatewayFee: number;
  cycle: 'MONTH' | 'YEAR';
  totalPrice: number;
  error: string | null;
  processing: boolean;
  hasPendingUpgrade: unknown;
  handleProceedToPayment: () => void;
  onCancel: () => void;
  setError: (val: string | null) => void;
}

export const CheckoutDetailStep: React.FC<CheckoutDetailStepProps> = React.memo(({
  plan,
  price,
  features,
  paymentChannels,
  selectedChannel,
  setSelectedChannel,
  isDropdownOpen,
  setIsDropdownOpen,
  expiryDate,
  gatewayFee,
  cycle,
  totalPrice,
  error,
  processing,
  hasPendingUpgrade,
  handleProceedToPayment,
  onCancel,
  setError,
}) => {
  return (
    <motion.div
      key="detail-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      {/* Left Column: Plan Card & Payment Methods */}
      <div className="lg:col-span-7 space-y-6 !overflow-visible">
        <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl !overflow-visible relative" noPadding={true}>
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="p-8 space-y-8">
            {/* DETAIL LAYANAN */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
                <div>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md">
                    Layanan Modul
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-3 capitalize">
                    {plan.name?.replace(/-/g, ' ')}
                  </h2>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 text-center sm:min-w-[140px] flex-shrink-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Harga Siklus</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(price)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={12} className="text-amber-500" /> Fitur Utama Layanan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(features ?? []).length > 0 ? (
                    (features ?? [])?.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                          <Check size={10} strokeWidth={4} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 tracking-tight">{feature}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-4 text-slate-400 italic text-xs uppercase font-bold tracking-widest">Memuat fitur...</div>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800/50" />

            {/* SELECT PAYMENT METHOD */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Pilih Metode Pembayaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Silakan pilih saluran pembayaran yang Anda inginkan.
                  </p>
                </div>
              </div>

              <div className="relative">
                {(paymentChannels ?? []).length > 0 ? (
                  <>
                    {/* Dropdown Trigger */}
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full h-14 pl-12 pr-10 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-between cursor-pointer select-none transition-all focus:border-blue-600"
                    >
                      {(() => {
                        const activeCh = (paymentChannels ?? []).find((ch) => ch.code === selectedChannel);
                        if (activeCh) {
                          return (
                            <div className="flex items-center gap-3">
                              {activeCh.icon_url && (
                                <img 
                                  src={activeCh.icon_url} 
                                  alt={activeCh.name} 
                                  className="h-6 w-auto object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-200" 
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{activeCh.name}</span>
                                {activeCh.code !== 'Manual' && (
                                  <span className="text-[8px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Otomatis Aktif
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return <span className="text-slate-400">Pilih Metode Pembayaran</span>;
                      })()}
                      <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {/* Prefix icon */}
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                      <CreditCard size={18} />
                    </div>

                    {/* Dropdown Options List */}
                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                          {(paymentChannels ?? [])?.map((channel) => {
                            const isSelected = selectedChannel === channel.code;
                            return (
                              <div
                                key={channel.code}
                                onClick={() => {
                                  setSelectedChannel(channel.code);
                                  setIsDropdownOpen(false);
                                  setError(null);
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {channel.icon_url && (
                                    <img 
                                      src={channel.icon_url} 
                                      alt={channel.name} 
                                      className="h-6 w-auto object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-100" 
                                    />
                                  )}
                                  <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-2">
                                      <div className="font-bold text-sm leading-none">{channel.name}</div>
                                      {channel.code !== 'Manual' && (
                                        <span className="text-[8px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                          Otomatis Aktif
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && <Check size={14} strokeWidth={3} className="text-blue-600" />}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-4 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Memuat saluran pembayaran...
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Order Summary Card */}
      <div className="lg:col-span-5 sticky top-24">
        <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Ringkasan Pesanan
          </h3>
          
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Siklus Tagihan</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {cycle === 'YEAR' ? 'Pembayaran Tahunan' : 'Pembayaran Bulanan'}
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                cycle === 'YEAR'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {plan.size_label || 'Standard'}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Estimasi Masa Aktif</div>
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  s.d {formatDate(expiryDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subtotal</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(price)}</span>
            </div>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Layanan</span>
              <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md">Gratis</span>
            </div>

            {gatewayFee > 0 && (
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Transaksi</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(gatewayFee)}
                </span>
              </div>
            )}
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 leading-none pb-1">Total Tagihan</span>
                <span className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight text-right italic">
                *Aktivasi otomatis & instan
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-red-800 dark:text-red-400">Gagal Memproses Transaksi</div>
                  <p className="text-[11px] text-red-600 dark:text-red-500 font-bold leading-relaxed mt-0.5">{error}</p>
                </div>
              </div>
            )}
            
            <Button 
              variant="primary"
              size="lg"
              onClick={handleProceedToPayment}
              disabled={processing || !!hasPendingUpgrade}
              className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold py-3.5 shadow-lg"
            >
              <span>{processing ? 'Menyiapkan...' : 'Lanjut Bayar'}</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
            
            <button 
              type="button"
              className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              onClick={onCancel}
            >
              Batal Transaksi
            </button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
});
