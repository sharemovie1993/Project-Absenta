import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inputVariants = cva(
  'w-full bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all duration-200 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600',
  {
    variants: {
      size: {
        sm: 'h-8 text-xs px-2 rounded-lg',
        md: 'h-10 text-sm px-3 rounded-xl border',
        lg: 'h-12 text-base px-4 rounded-xl border',
        auth: 'h-14 text-base px-5 rounded-xl border-2 font-medium',
      },
      error: {
        true: 'border-red-500 focus:border-red-500 focus:ring-red-100',
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
        <label htmlFor={props.id} className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors" aria-hidden="true">
            {React.cloneElement(leftIcon as React.ReactElement, { className: 'w-5 h-5' } as any)}
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
            {React.cloneElement(rightIcon as React.ReactElement, { className: 'w-5 h-5' } as any)}
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
