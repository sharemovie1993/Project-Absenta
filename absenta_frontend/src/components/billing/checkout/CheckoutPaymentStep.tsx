import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Copy 
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/api/plans.api';
import { toast } from 'react-hot-toast';

interface CheckoutPaymentStepProps {
  invoiceDetails: any;
  error: string | null;
  countdown: { dd: number; hh: number; mm: number; ss: number };
  expiredLocal: boolean;
  processing: boolean;
  paymentChannels: any[];
  loadInvoiceDetails: (token: string) => void;
  invoiceToken: string;
  setStep: (step: 'detail' | 'payment' | 'activate') => void;
  setError: (val: string | null) => void;
  handleCheckPaymentStatus: () => void;
}

export const CheckoutPaymentStep: React.FC<CheckoutPaymentStepProps> = React.memo(({
  invoiceDetails,
  error,
  countdown,
  expiredLocal,
  processing,
  paymentChannels,
  loadInvoiceDetails,
  invoiceToken,
  setStep,
  setError,
  handleCheckPaymentStatus,
}) => {
  if (!invoiceDetails) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-none">
        {error ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Gagal Memuat Rincian Pembayaran</h3>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">{error}</p>
            <div className="flex justify-center gap-3 mt-2">
              <Button onClick={() => loadInvoiceDetails(invoiceToken)}>Coba Lagi</Button>
              <Button variant="outline" onClick={() => {
                setStep('detail');
                setError(null);
              }}>Kembali</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Menyiapkan rincian pembayaran Anda...</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <motion.div
      key="payment-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto w-full"
    >
      <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />

        {/* Top Status */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
              Selesaikan Pembayaran
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              Invoice: <span className="font-mono text-slate-600 dark:text-slate-300">{invoiceDetails?.data?.invoice_number}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            <Clock size={12} className="animate-pulse" />
            <span>
              {expiredLocal 
                ? 'Kedaluwarsa' 
                : `${countdown.hh.toString().padStart(2, '0')}:${countdown.mm.toString().padStart(2, '0')}:${countdown.ss.toString().padStart(2, '0')}`
              }
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Amount Card */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Jumlah Transfer Pas
            </span>
            <strong className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
              {formatCurrency(invoiceDetails.data.total_amount)}
            </strong>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium italic">
              Harus persis sama hingga digit terakhir
            </span>
          </div>

          {/* QRIS Code Image */}
          {invoiceDetails.data.active_transaction?.qr_url && (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20 dark:bg-slate-900/30">
              <div className="bg-white p-4 rounded-2xl shadow-xl inline-block">
                <img
                  src={invoiceDetails.data.active_transaction.qr_url}
                  alt="QRIS Code"
                  className="w-48 h-48 block object-contain"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-4 text-center max-w-sm leading-relaxed">
                Pindai kode QRIS di atas menggunakan aplikasi e-wallet Anda (GoPay, OVO, Dana, LinkAja, ShopeePay, BCA Mobile, dll.)
              </span>
            </div>
          )}

          {/* Virtual Account / Pay Code */}
          {invoiceDetails.data.active_transaction?.pay_code && !invoiceDetails.data.active_transaction?.qr_url && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Nomor Virtual Account / Kode Bayar
              </span>
              <div className="flex items-center justify-center gap-3">
                <strong className="text-2xl font-mono font-black text-slate-800 dark:text-white tracking-widest">
                  {invoiceDetails.data.active_transaction.pay_code}
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(invoiceDetails.data.active_transaction.pay_code);
                    toast.success('Kode bayar disalin!');
                  }}
                  className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              <span className="text-[10px] text-slate-400 block mt-2 font-medium">
                Gunakan kode VA di atas untuk melakukan transfer melalui ATM/M-Banking.
              </span>
            </div>
          )}

          {/* Actions buttons */}
          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCheckPaymentStatus}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold py-3.5 shadow-lg"
            >
              <RefreshCw size={16} className={`${processing ? 'animate-spin' : ''}`} />
              <span>Verifikasi Pembayaran</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});
