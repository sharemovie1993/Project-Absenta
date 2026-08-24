import React from 'react';
import { motion } from 'framer-motion';
import { Check, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui';

export const CheckoutSuccessStep: React.FC = React.memo(() => {
  return (
    <motion.div
      key="activate-step"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-md mx-auto text-center py-12"
    >
      <Card className="p-10 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 text-green-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50 dark:ring-green-950/10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <Check size={40} strokeWidth={4} />
          </motion.div>
        </div>

        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
          Aktivasi Sukses!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
          Terima kasih atas pembayaran Anda. Modul subscription Anda telah aktif sepenuhnya secara real-time.
        </p>

        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Mengarahkan kembali...</span>
        </div>
      </Card>
    </motion.div>
  );
});
