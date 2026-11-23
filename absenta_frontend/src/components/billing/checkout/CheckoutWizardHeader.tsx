import React from 'react';
import { Check, CreditCard, Sparkles, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export type Step = 'detail' | 'payment' | 'activate';

interface CheckoutWizardHeaderProps {
  step: Step;
}

const STEPS_DATA = [
  {
    key: 'detail' as Step,
    stepNum: 1,
    titleDesktop: 'Detail Paket',
    titleMobile: 'Detail',
    desc: 'Konfirmasi layanan',
    icon: PackageCheck
  },
  {
    key: 'payment' as Step,
    stepNum: 2,
    titleDesktop: 'Pembayaran',
    titleMobile: 'Bayar',
    desc: 'Transfer tagihan',
    icon: CreditCard
  },
  {
    key: 'activate' as Step,
    stepNum: 3,
    titleDesktop: 'Aktivasi Selesai',
    titleMobile: 'Selesai',
    desc: 'Layanan aktif',
    icon: Sparkles
  }
];

export const CheckoutWizardHeader: React.FC<CheckoutWizardHeaderProps> = React.memo(({ step }) => {
  const getStepStatus = (itemStep: Step) => {
    if (step === 'activate') {
      return itemStep === 'activate' ? 'active' : 'completed';
    }
    if (step === 'payment') {
      if (itemStep === 'detail') return 'completed';
      if (itemStep === 'payment') return 'active';
      return 'pending';
    }
    // step === 'detail'
    return itemStep === 'detail' ? 'active' : 'pending';
  };

  const progressPercentage = step === 'detail' ? '0%' : step === 'payment' ? '50%' : '100%';

  return (
    <div className="max-w-2xl mx-auto mb-8 sm:mb-12 px-2">
      <div className="relative flex items-center justify-between">
        {/* Progress Background Line */}
        <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
        
        {/* Animated Active Progress Line */}
        <motion.div 
          className="absolute left-6 top-5 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full z-0 transition-all duration-500 ease-out" 
          style={{ width: `calc(${progressPercentage} - 12px)` }}
        />

        {STEPS_DATA.map((s) => {
          const status = getStepStatus(s.key);
          const isCompleted = status === 'completed';
          const isActive = status === 'active';

          return (
            <div key={s.key} className="relative z-10 flex flex-col items-center group">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm border-2 transition-all duration-300 shadow-sm ${
                  isCompleted
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                    : isActive
                    ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40 shadow-blue-500/25'
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800'
                }`}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3.5} className="animate-in zoom-in-50" />
                ) : (
                  <span>{s.stepNum}</span>
                )}
              </motion.div>

              <div className="text-center mt-2">
                <span className={`block text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : isCompleted 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  <span className="sm:hidden">{s.titleMobile}</span>
                  <span className="hidden sm:inline">{s.titleDesktop}</span>
                </span>
                <span className="hidden sm:block text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                  {s.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
