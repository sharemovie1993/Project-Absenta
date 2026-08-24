import React from 'react';
import { Check } from 'lucide-react';

export type Step = 'detail' | 'payment' | 'activate';

interface CheckoutWizardHeaderProps {
  step: Step;
}

export const CheckoutWizardHeader: React.FC<CheckoutWizardHeaderProps> = React.memo(({ step }) => {
  return (
    <div className="max-w-xl mx-auto mb-10">
      <div className="relative flex items-center justify-between">
        {/* Progress connecting lines */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-0 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-0 rounded-full transition-all duration-500 ease-out" 
          style={{ width: step === 'detail' ? '0%' : step === 'payment' ? '50%' : '100%' }}
        />

        {/* Step 1 */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
            step === 'detail'
              ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
              : 'bg-blue-600 text-white border-blue-600'
          }`}>
            {step !== 'detail' ? <Check size={14} strokeWidth={3} /> : '1'}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>Detail Paket</span>
        </div>

        {/* Step 2 */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
            step === 'payment'
              ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
              : step === 'activate'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
          }`}>
            {step === 'activate' ? <Check size={14} strokeWidth={3} /> : '2'}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'payment' ? 'text-blue-600' : 'text-slate-400'}`}>Pembayaran</span>
        </div>

        {/* Step 3 */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
            step === 'activate'
              ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
              : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
          }`}>
            3
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'activate' ? 'text-blue-600' : 'text-slate-400'}`}>Selesai</span>
        </div>
      </div>
    </div>
  );
});
