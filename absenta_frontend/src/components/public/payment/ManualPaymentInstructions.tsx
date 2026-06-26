import React from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualPaymentInstructionsProps {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export const ManualPaymentInstructions: React.FC<ManualPaymentInstructionsProps> = ({
  bankName,
  accountNumber,
  accountHolder
}) => {

  
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-blue-100 dark:border-blue-800 space-y-4"
    >
      <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
        <BadgeCheck className="w-4 h-4" /> Instruksi Transfer Manual
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-400 font-bold">Bank</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">{bankName}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-400 font-bold">No. Rekening</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">{accountNumber}</span>
            <button 
              type="button"
              onClick={() => {
                if (accountNumber) {
                  navigator.clipboard.writeText(accountNumber);
                  toast.success("Nomor rekening disalin");
                }
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-blue-600"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-400 font-bold">Atas Nama</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">{accountHolder}</span>
        </div>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
          * Pastikan nominal transfer sesuai sampai digit terakhir. Setelah transfer, silakan unggah bukti bayar di bawah ini.
        </p>
      </div>
    </motion.div>
  );
};
