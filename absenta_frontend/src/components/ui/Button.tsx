import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-slate-400 dark:focus:ring-blue-500',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:focus:ring-slate-500',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
        white: 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200',
        auth: 'bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all',
        toolbarPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:-translate-y-[1px]',
        toolbarOutline: 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
        toolbarDanger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all hover:-translate-y-[1px]',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-[8px] py-[3px] text-sm',
        md: 'px-[10px] py-[3px] text-sm',
        lg: 'px-[12px] py-[4px] text-base',
        auth: 'w-full h-14 rounded-xl text-base gap-3',
        icon: 'h-[30px] w-[30px]',
        toolbar: 'h-8 text-[11px] font-bold px-3',
        toolbarIcon: 'h-8 w-8 p-0 flex items-center justify-center',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function Button({ 
  variant, 
  size, 
  children, 
  className,
  isLoading,
  disabled,
  ...props 
}: ButtonProps) {
  const effectiveDisabled = isLoading || disabled;

  return (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={effectiveDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </>
      ) : children}
    </button>
  );
}

export default Button;
