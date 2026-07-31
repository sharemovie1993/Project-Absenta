import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

export interface MethodOption {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ size?: number; className?: string }> | React.ReactNode;
  actionLabel?: string;
  colorScheme?: 'blue' | 'violet' | 'indigo' | 'emerald' | 'amber' | 'cyan' | 'slate';
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface MethodPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: MethodOption[];
  showCancelButton?: boolean;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-500',
    actionText: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-500 dark:hover:border-violet-500',
    actionText: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
    hoverBorder: 'hover:border-indigo-500 dark:hover:border-indigo-500',
    actionText: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-500',
    actionText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-500',
    actionText: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
    hoverBorder: 'hover:border-cyan-500 dark:hover:border-cyan-500',
    actionText: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300'
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
    actionText: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
  }
};

export const MethodPickerModal: React.FC<MethodPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  showCancelButton = true,
  cancelLabel = 'Batal',
  size = 'lg'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      <div className="p-4 space-y-4">
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium -mt-2 mb-2">
            {subtitle}
          </p>
        )}

        <div className={`grid grid-cols-1 ${options.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
          {options.map((option) => {
            const scheme = colorMap[option.colorScheme || 'blue'];
            const IconComponent = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    option.onClick();
                  }
                }}
                className={`group relative flex flex-col items-center text-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${scheme.hoverBorder} hover:shadow-md rounded-2xl transition-all duration-200 ${
                  option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {option.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${scheme.badge}`}>
                    {option.badge}
                  </span>
                )}

                {IconComponent && (
                  <div className={`p-3 rounded-2xl group-hover:scale-105 transition-transform duration-200 mb-3 ${scheme.bg}`}>
                    {React.isValidElement(IconComponent) ? (
                      IconComponent
                    ) : (
                      // @ts-expect-error Render dynamic component type
                      <IconComponent size={28} />
                    )}
                  </div>
                )}

                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {option.title}
                </h3>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed max-w-[240px]">
                  {option.description}
                </p>

                <span className={`text-[11px] font-bold ${scheme.actionText} flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-200 mt-auto`}>
                  {option.actionLabel || 'Mulai Mengisi'} <ChevronRight size={14} />
                </span>
              </button>
            );
          })}
        </div>

        {showCancelButton && (
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl px-5 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {cancelLabel}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MethodPickerModal;
