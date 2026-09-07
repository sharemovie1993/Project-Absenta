import React from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, FileText } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/billingUtils';

interface CheckoutSuccessStepProps {
  invoiceDetails?: any;
}

export const CheckoutSuccessStep: React.FC<CheckoutSuccessStepProps> = React.memo(({ invoiceDetails }) => {
  const navigate = useNavigate();
  const inv = invoiceDetails?.data || invoiceDetails;

  return (
    <motion.div
      key="activate-step"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-lg mx-auto text-center py-8"
    >
      <Card className="p-8 md:p-10 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mb-5 ring-8 ring-emerald-50 dark:ring-emerald-950/10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <Check size={32} strokeWidth={3.5} />
          </motion.div>
        </div>

        <Badge variant="success" className="text-[10px] font-black uppercase px-3 py-1 mb-3">
          PEMBAYARAN LUNAS
        </Badge>

        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
          {inv?.notes || inv?.plan_title || 'Layanan Absenta Aktif'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
          Transaksi <span className="font-bold text-slate-700 dark:text-slate-300">#{inv?.invoice_number || '-'}</span> telah lunas. Hak akses fitur dan modul telah aktif di sistem sekolah Anda.
        </p>

        {inv?.total_amount && (
          <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Total Pembayaran</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(inv.total_amount, inv.currency || 'IDR')}</span>
            </div>
            {inv?.payment_method && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Metode Pembayaran</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{String(inv.payment_method).replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            type="button"
            onClick={() => navigate('/service-center?tab=services')}
            className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
          >
            <ShieldCheck size={16} />
            <span>Lihat Layanan Aktif</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/service-center?tab=invoices')}
            className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-slate-200"
          >
            <FileText size={16} />
            <span>Riwayat Tagihan</span>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});
