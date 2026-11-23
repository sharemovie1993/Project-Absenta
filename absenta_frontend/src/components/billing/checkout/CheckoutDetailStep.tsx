import React, { useMemo } from 'react';
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
import { resolveProfilePhotoUrl } from '@/lib/utils';
import type { Plan } from '@/types/plans';

interface PaymentChannel {
  code: string;
  name: string;
  group?: string;
  icon_url?: string;
  maximum_amount?: number | string;
  fee_flat?: number;
  fee_percent?: number;
  fee_customer?: {
    flat?: number;
    percent?: number;
  };
  fee_merchant?: {
    flat?: number;
    percent?: number;
  };
  total_fee?: {
    flat?: number;
    percent?: number | string;
  };
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
  expiryDate: string | Date;
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
  // Kelompokkan saluran pembayaran berdasarkan group (Virtual Account, E-Wallet, Retail, Manual)
  const groupedChannels = useMemo(() => {
    const groups: Record<string, PaymentChannel[]> = {};
    for (const ch of (paymentChannels || [])) {
      const grp = ch.group || (ch.code === 'Manual' ? 'Transfer Manual' : 'Metode Pembayaran');
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(ch);
    }
    return groups;
  }, [paymentChannels]);

  return (
    <motion.div
      key="detail-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start pb-24 lg:pb-0"
    >
      {/* Left Column: Plan Card & Payment Methods */}
      <div className="lg:col-span-7 space-y-6 !overflow-visible">
        <Card className="p-5 sm:p-8 border-none shadow-xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl !overflow-visible relative" noPadding={true}>
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="p-5 sm:p-8 space-y-7">
            {/* DETAIL LAYANAN */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
                <div>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-md">
                    Layanan Modul Terpilih
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2.5 capitalize">
                    {plan.name?.replace(/-/g, ' ')}
                  </h2>
                  <span className="inline-block mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Kapasitas: {plan.size_label || 'Standard'} • Siklus {cycle === 'YEAR' ? 'Tahunan' : 'Bulanan'}
                  </span>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-left sm:text-center sm:min-w-[150px] flex-shrink-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Harga Siklus</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {formatCurrency(price)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">/{cycle === 'YEAR' ? 'tahun' : 'bulan'}</div>
                </div>
              </div>

              {/* FITUR UTAMA */}
              <div className="space-y-3.5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" />
                  <span>Fitur Utama yang Termasuk</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(features ?? []).length > 0 ? (
                    (features ?? [])?.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 transition-all">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Check size={11} strokeWidth={3.5} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 tracking-tight leading-snug">{feature}</span>
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
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Pilih Metode Pembayaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tersedia Virtual Account otomatis, QRIS instan, dan minimarket.
                  </p>
                </div>
              </div>

              <div className="relative">
                {(paymentChannels ?? []).length > 0 ? (
                  <>
                    {/* Dropdown Trigger */}
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full min-h-[58px] pl-12 pr-10 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-between cursor-pointer select-none transition-all hover:border-blue-500 focus:border-blue-600"
                    >
                      {(() => {
                        const activeCh = (paymentChannels ?? []).find((ch) => ch.code === selectedChannel);
                        if (activeCh) {
                          const flat = Number(activeCh.fee_customer?.flat ?? activeCh.fee_flat ?? 0);
                          const percent = Number(activeCh.fee_customer?.percent ?? activeCh.fee_percent ?? 0);
                          const chFee = flat + Math.round(price * (percent / 100));

                          return (
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                              {activeCh.icon_url && (
                                <img 
                                  src={resolveProfilePhotoUrl(activeCh.icon_url)} 
                                  alt={activeCh.name} 
                                  className="h-6 w-auto max-w-[45px] object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 shrink-0" 
                                />
                              )}
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{activeCh.name}</span>
                                {activeCh.code !== 'Manual' && (
                                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    Otomatis Aktif
                                  </span>
                                )}
                                {chFee === 0 ? (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded shrink-0">
                                    Bebas Biaya
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                    +{formatCurrency(chFee)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return <span className="text-slate-400">Pilih Metode Pembayaran</span>;
                      })()}
                      <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {/* Prefix icon */}
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                      <CreditCard size={18} />
                    </div>

                    {/* Dropdown Options List Grouped */}
                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[340px] overflow-y-auto p-2 space-y-3">
                          {Object.entries(groupedChannels).map(([groupName, channels]) => (
                            <div key={groupName} className="space-y-1">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 pt-1 pb-0.5">
                                {groupName}
                              </div>
                              {channels.map((channel) => {
                                const isSelected = selectedChannel === channel.code;
                                const flat = Number(channel.fee_customer?.flat ?? channel.fee_flat ?? 0);
                                const percent = Number(channel.fee_customer?.percent ?? channel.fee_percent ?? 0);
                                const chFee = flat + Math.round(price * (percent / 100));

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
                                    <div className="flex items-center gap-3 min-w-0">
                                      {channel.icon_url && (
                                        <img 
                                          src={resolveProfilePhotoUrl(channel.icon_url)} 
                                          alt={channel.name} 
                                          className="h-6 w-auto max-w-[45px] object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shrink-0" 
                                        />
                                      )}
                                      <div className="flex flex-col text-left min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-200">{channel.name}</div>
                                          {channel.code !== 'Manual' && (
                                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                              Otomatis Aktif
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                          {chFee === 0 ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Bebas Biaya Admin</span>
                                          ) : (
                                            <span>Biaya Transaksi: +{formatCurrency(chFee)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && <Check size={16} strokeWidth={3} className="text-blue-600 shrink-0 ml-2" />}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
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

      {/* Right Column: Order Summary Card (Desktop sticky) */}
      <div className="lg:col-span-5 lg:sticky lg:top-24 w-full">
        <Card className="p-6 sm:p-8 border-none shadow-xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center justify-between">
            <span>Ringkasan Pesanan</span>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
              SaaS Order
            </span>
          </h3>
          
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Siklus Tagihan</div>
                <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {cycle === 'YEAR' ? 'Pembayaran Tahunan' : 'Pembayaran Bulanan'}
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                cycle === 'YEAR'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {plan.size_label || 'Standard'}
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Estimasi Masa Aktif</div>
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 tracking-tight truncate">
                  s.d {typeof expiryDate === 'string' && expiryDate.includes(' ') ? expiryDate : formatDate(expiryDate)} • {cycle === 'YEAR' ? '1 Tahun' : '1 Bulan'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 mb-7">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subtotal Layanan</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(price)}</span>
            </div>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Layanan Platform</span>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                Gratis
              </span>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Saluran Transaksi</span>
              {gatewayFee > 0 ? (
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(gatewayFee)}
                </span>
              ) : (
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                  Bebas Biaya
                </span>
              )}
            </div>
            
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 leading-none pb-1">Total Tagihan</span>
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none tracking-tight">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight text-right italic">
                *Aktivasi otomatis & webhook instan
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
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
              className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-black py-3.5 shadow-lg shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <span>{processing ? 'Menyiapkan...' : 'Lanjut ke Pembayaran'}</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
            
            <button 
              type="button"
              className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              onClick={onCancel}
            >
              Batal Transaksi
            </button>
          </div>
        </Card>
      </div>

      {/* Sticky Mobile Checkout Action Bar (Muncul hanya di Mobile < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tagihan
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none truncate">
              {formatCurrency(totalPrice)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
              {gatewayFee > 0 ? `+Biaya Transaksi: ${formatCurrency(gatewayFee)}` : 'Bebas Biaya Admin'}
            </span>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleProceedToPayment}
            disabled={processing || !!hasPendingUpgrade}
            className="flex-1 max-w-[200px] h-12 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <span>{processing ? 'Menyiapkan...' : 'Lanjut Bayar'}</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
