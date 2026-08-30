import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inputVariants = cva(
  'w-full bg-slate-50 dark:bg-slate-950/70 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20',
  {
    variants: {
      size: {
        sm: 'h-8 text-xs px-2.5 rounded-lg font-medium',
        md: 'h-10 text-xs sm:text-[13px] px-3.5 rounded-xl font-semibold',
        lg: 'h-12 text-sm px-4 rounded-xl font-semibold',
        auth: 'h-14 text-base px-5 rounded-xl border-2 font-medium',
      },
      error: {
        true: 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950/30',
        false: '',
      }
    },
    defaultVariants: {
      size: 'md',
      error: false,
    },
  }
);

interface InputProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  errorText, 
  className, 
  size,
  error,
  leftIcon,
  rightIcon,
  ...props 
}, ref) => {
  const hasError = !!errorText || error === true;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id} className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 ml-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors" aria-hidden="true">
            {React.isValidElement(leftIcon) && typeof leftIcon.type !== 'string' ? (
              React.cloneElement(leftIcon as React.ReactElement, { className: 'w-5 h-5' } as any)
            ) : (
              leftIcon
            )}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            inputVariants({ size, error: hasError }),
            leftIcon && 'pl-12',
            rightIcon && 'pr-12',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400" aria-hidden="true">
            {React.isValidElement(rightIcon) && typeof rightIcon.type !== 'string' ? (
              React.cloneElement(rightIcon as React.ReactElement, { className: 'w-5 h-5' } as any)
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>
      {errorText && (
        <p className="mt-1.5 text-xs font-bold text-red-600 ml-1">{errorText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
