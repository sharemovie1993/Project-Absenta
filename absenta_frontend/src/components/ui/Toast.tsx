import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Toast as ToastType } from '@/hooks/useToast';

interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
  className?: string;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    color: 'emerald',
    label: 'Berhasil',
    bg: 'bg-emerald-50/90 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-900 dark:text-emerald-300',
    iconBg: 'bg-emerald-500 text-white shadow-emerald-500/20',
  },
  error: {
    icon: AlertCircle,
    color: 'rose',
    label: 'Galat Sistem',
    bg: 'bg-rose-50/90 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    text: 'text-rose-900 dark:text-rose-300',
    iconBg: 'bg-rose-500 text-white shadow-rose-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'amber',
    label: 'Peringatan',
    bg: 'bg-amber-50/90 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-900 dark:text-amber-300',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/20',
  },
  info: {
    icon: Info,
    color: 'blue',
    label: 'Informasi',
    bg: 'bg-blue-50/90 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    text: 'text-blue-900 dark:text-blue-300',
    iconBg: 'bg-blue-500 text-white shadow-blue-500/20',
  },
  notice: {
    icon: BellRing,
    color: 'indigo',
    label: 'Pemberitahuan',
    bg: 'bg-indigo-50/90 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    text: 'text-indigo-900 dark:text-indigo-300',
    iconBg: 'bg-indigo-500 text-white shadow-indigo-500/20',
  },
};

export function ToastContainer({ toasts, onRemove, className }: ToastProps) {
  return (
    <div className={cn('fixed top-6 right-6 z-[999999] flex flex-col gap-3 max-w-sm w-full pointer-events-none', className)}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.85, x: 20, transition: { duration: 0.2 } }}
              className={cn(
                'relative flex items-center gap-4 p-4 pr-12 rounded-2xl border shadow-2xl backdrop-blur-md pointer-events-auto',
                'transition-all duration-300 group overflow-hidden',
                config.bg,
                config.border
              )}
            >
              {/* Glass Reflection Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 to-transparent pointer-events-none opacity-50" />
              
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative z-10',
                config.iconBg
              )}>
                <Icon size={20} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    {config.label}
                  </p>
                  {toast.badgeLabel && (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[9px] font-black uppercase tracking-tighter opacity-60">
                      {toast.badgeLabel}
                    </span>
                  )}
                </div>
                <h4 className={cn('text-[13px] font-bold leading-tight tracking-tight', config.text)}>
                  {toast.message}
                </h4>
              </div>
              
              <button
                onClick={() => onRemove(toast.id)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/10 dark:hover:bg-white/10 z-20"
                aria-label="Tutup"
              >
                <X size={14} className={config.text} />
              </button>

              {/* Progress Bar Loader */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/5 dark:bg-white/5 overflow-hidden">
                <motion.div 
                   initial={{ width: '0%' }}
                   animate={{ width: '100%' }}
                   transition={{ duration: (toast.duration || 3000) / 1000, ease: 'linear' }}
                   className={cn('h-full opacity-40', config.iconBg.split(' ')[0])}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Individual Toast component for custom usage
export function Toast({ 
  message, 
  type = 'info', 
  onClose,
  className 
}: { 
  message: string; 
  type?: ToastType['type']; 
  onClose?: () => void;
  className?: string;
}) {
  const config = toastConfig[type];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'relative flex items-center gap-4 p-4 pr-12 rounded-2xl border shadow-2xl backdrop-blur-md',
      'transition-all duration-300 group overflow-hidden',
      config.bg,
      config.border,
      className
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative z-10',
        config.iconBg
      )}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">
          {config.label}
        </p>
        <h4 className={cn('text-[13px] font-bold leading-tight tracking-tight', config.text)}>
          {message}
        </h4>
      </div>
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/10 dark:hover:bg-white/10 z-20"
          aria-label="Tutup"
        >
          <X size={14} className={config.text} />
        </button>
      )}
    </div>
  );
}

export default ToastContainer;
